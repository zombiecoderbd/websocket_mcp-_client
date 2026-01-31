import { Logger } from '../utils/logger';
import { executeQuery } from '../database/connection';

const logger = new Logger();

export interface PerformanceMetrics {
    responseTime: number;
    tokensPerSecond: number;
    successRate: number;
    lastTested: Date;
    averageLatency: number;
    totalTests: number;
    successfulTests: number;
}

export interface TestResult {
    testName: string;
    modelName: string;
    success: boolean;
    responseTime: number;
    tokensUsed: number;
    errorMessage?: string;
    timestamp: Date;
}

export interface PerformanceData {
    modelName: string;
    metrics: PerformanceMetrics;
    recentTests: TestResult[];
    trendData: {
        timestamp: Date;
        responseTime: number;
        successRate: number;
    }[];
}

export class PerformanceMonitor {
    async recordModelTest(modelName: string, result: TestResult): Promise<void> {
        try {
            // Get model ID from database
            const modelResult = await executeQuery(
                'SELECT id FROM ai_models WHERE model_name = ?',
                [modelName]
            );

            const modelId = modelResult && modelResult.length > 0 ? modelResult[0].id : null;

            // Calculate performance score
            const performanceScore = result.success ? 
                Math.max(0, 100 - (result.responseTime / 100)) : 0;

            await executeQuery(
                `INSERT INTO model_performance_metrics 
                 (model_id, test_type, response_time_ms, tokens_used, success, error_message, performance_score, metadata) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    modelId,
                    result.testName,
                    result.responseTime,
                    result.tokensUsed,
                    result.success,
                    result.errorMessage || null,
                    performanceScore,
                    JSON.stringify({
                        modelName: result.modelName,
                        timestamp: result.timestamp.toISOString()
                    })
                ]
            );

            logger.info(`Recorded performance test for ${modelName}: ${result.testName} - ${result.success ? 'PASS' : 'FAIL'}`);

        } catch (error) {
            logger.error(`Failed to record model test for ${modelName}:`, error);
        }
    }

    async getModelPerformance(modelName: string): Promise<PerformanceMetrics> {
        try {
            const results = await executeQuery(
                `SELECT 
                    AVG(response_time_ms) as avg_response_time,
                    AVG(performance_score) as avg_score,
                    COUNT(*) as total_tests,
                    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_tests,
                    AVG(tokens_used) as avg_tokens
                 FROM model_performance_metrics mpm
                 LEFT JOIN ai_models am ON mpm.model_id = am.id
                 WHERE (am.model_name = ? OR JSON_EXTRACT(mpm.metadata, '$.modelName') = ?)
                 AND mpm.tested_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
                [modelName, modelName]
            );

            if (results && results.length > 0) {
                const data = results[0];
                const successRate = data.total_tests > 0 ? (data.successful_tests / data.total_tests) * 100 : 0;
                const tokensPerSecond = data.avg_response_time > 0 ? 
                    Math.round((data.avg_tokens || 0) / (data.avg_response_time / 1000)) : 0;

                return {
                    responseTime: data.avg_response_time || 0,
                    tokensPerSecond,
                    successRate,
                    lastTested: new Date(),
                    averageLatency: data.avg_response_time || 0,
                    totalTests: data.total_tests || 0,
                    successfulTests: data.successful_tests || 0
                };
            }

            return this.getDefaultMetrics();

        } catch (error) {
            logger.error(`Failed to get performance metrics for ${modelName}:`, error);
            return this.getDefaultMetrics();
        }
    }

    async getPerformanceHistory(modelName: string, hours: number = 24): Promise<PerformanceData[]> {
        try {
            const results = await executeQuery(
                `SELECT 
                    DATE_FORMAT(tested_at, '%Y-%m-%d %H:00:00') as hour_bucket,
                    AVG(response_time_ms) as avg_response_time,
                    AVG(performance_score) as avg_score,
                    COUNT(*) as total_tests,
                    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_tests
                 FROM model_performance_metrics mpm
                 LEFT JOIN ai_models am ON mpm.model_id = am.id
                 WHERE (am.model_name = ? OR JSON_EXTRACT(mpm.metadata, '$.modelName') = ?)
                 AND mpm.tested_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
                 GROUP BY hour_bucket
                 ORDER BY hour_bucket ASC`,
                [modelName, modelName, hours]
            );

            const trendData = results.map((row: any) => ({
                timestamp: new Date(row.hour_bucket),
                responseTime: row.avg_response_time,
                successRate: row.total_tests > 0 ? (row.successful_tests / row.total_tests) * 100 : 0
            }));

            const metrics = await this.getModelPerformance(modelName);
            const recentTests = await this.getRecentTests(modelName, 10);

            return [{
                modelName,
                metrics,
                recentTests,
                trendData
            }];

        } catch (error) {
            logger.error(`Failed to get performance history for ${modelName}:`, error);
            return [{
                modelName,
                metrics: this.getDefaultMetrics(),
                recentTests: [],
                trendData: []
            }];
        }
    }

    async getRecentTests(modelName: string, limit: number = 10): Promise<TestResult[]> {
        try {
            const results = await executeQuery(
                `SELECT 
                    test_type,
                    success,
                    response_time_ms,
                    tokens_used,
                    error_message,
                    tested_at
                 FROM model_performance_metrics mpm
                 LEFT JOIN ai_models am ON mpm.model_id = am.id
                 WHERE (am.model_name = ? OR JSON_EXTRACT(mpm.metadata, '$.modelName') = ?)
                 ORDER BY tested_at DESC
                 LIMIT ?`,
                [modelName, modelName, limit]
            );

            return results.map((row: any) => ({
                testName: row.test_type,
                modelName,
                success: row.success === 1,
                responseTime: row.response_time_ms,
                tokensUsed: row.tokens_used,
                errorMessage: row.error_message,
                timestamp: new Date(row.tested_at)
            }));

        } catch (error) {
            logger.error(`Failed to get recent tests for ${modelName}:`, error);
            return [];
        }
    }

    async getTopPerformingModels(limit: number = 10): Promise<{modelName: string, metrics: PerformanceMetrics}[]> {
        try {
            const results = await executeQuery(
                `SELECT 
                    COALESCE(am.model_name, JSON_EXTRACT(mpm.metadata, '$.modelName')) as model_name,
                    AVG(response_time_ms) as avg_response_time,
                    AVG(performance_score) as avg_score,
                    COUNT(*) as total_tests,
                    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_tests
                 FROM model_performance_metrics mpm
                 LEFT JOIN ai_models am ON mpm.model_id = am.id
                 WHERE mpm.tested_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
                 GROUP BY model_name
                 HAVING total_tests >= 3
                 ORDER BY avg_score DESC
                 LIMIT ?`,
                [limit]
            );

            const models: {modelName: string, metrics: PerformanceMetrics}[] = [];

            for (const row of results) {
                const modelName = row.model_name?.toString() || 'Unknown';
                const successRate = (row.successful_tests / row.total_tests) * 100;
                
                models.push({
                    modelName,
                    metrics: {
                        responseTime: row.avg_response_time,
                        tokensPerSecond: row.avg_response_time > 0 ? Math.round(1000 / row.avg_response_time) : 0,
                        successRate,
                        lastTested: new Date(),
                        averageLatency: row.avg_response_time,
                        totalTests: row.total_tests,
                        successfulTests: row.successful_tests
                    }
                });
            }

            return models;

        } catch (error) {
            logger.error('Failed to get top performing models:', error);
            return [];
        }
    }

    async getPerformanceAlerts(thresholds: {
        maxResponseTime?: number;
        minSuccessRate?: number;
        minPerformanceScore?: number;
    } = {}): Promise<{modelName: string, issue: string, severity: 'high' | 'medium' | 'low'}[]> {
        try {
            const {
                maxResponseTime = 5000,
                minSuccessRate = 80,
                minPerformanceScore = 70
            } = thresholds;

            const results = await executeQuery(
                `SELECT 
                    COALESCE(am.model_name, JSON_EXTRACT(mpm.metadata, '$.modelName')) as model_name,
                    AVG(response_time_ms) as avg_response_time,
                    AVG(performance_score) as avg_score,
                    COUNT(*) as total_tests,
                    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_tests
                 FROM model_performance_metrics mpm
                 LEFT JOIN ai_models am ON mpm.model_id = am.id
                 WHERE mpm.tested_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
                 GROUP BY model_name
                 HAVING total_tests >= 2`
            );

            const alerts: {modelName: string, issue: string, severity: 'high' | 'medium' | 'low'}[] = [];

            for (const row of results) {
                const modelName = row.model_name?.toString() || 'Unknown';
                const successRate = (row.successful_tests / row.total_tests) * 100;

                // Check response time alert
                if (row.avg_response_time > maxResponseTime) {
                    alerts.push({
                        modelName,
                        issue: `High response time: ${Math.round(row.avg_response_time)}ms (threshold: ${maxResponseTime}ms)`,
                        severity: row.avg_response_time > maxResponseTime * 1.5 ? 'high' : 'medium'
                    });
                }

                // Check success rate alert
                if (successRate < minSuccessRate) {
                    alerts.push({
                        modelName,
                        issue: `Low success rate: ${successRate.toFixed(1)}% (threshold: ${minSuccessRate}%)`,
                        severity: successRate < minSuccessRate * 0.5 ? 'high' : 'medium'
                    });
                }

                // Check performance score alert
                if (row.avg_score < minPerformanceScore) {
                    alerts.push({
                        modelName,
                        issue: `Low performance score: ${row.avg_score.toFixed(1)} (threshold: ${minPerformanceScore})`,
                        severity: row.avg_score < minPerformanceScore * 0.5 ? 'high' : 'medium'
                    });
                }
            }

            return alerts;

        } catch (error) {
            logger.error('Failed to get performance alerts:', error);
            return [];
        }
    }

    async clearOldMetrics(days: number = 30): Promise<number> {
        try {
            const result = await executeQuery(
                'DELETE FROM model_performance_metrics WHERE tested_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
                [days]
            );
            
            logger.info(`Cleared ${result.affectedRows} old performance metrics`);
            return result.affectedRows || 0;

        } catch (error) {
            logger.error('Failed to clear old metrics:', error);
            return 0;
        }
    }

    private getDefaultMetrics(): PerformanceMetrics {
        return {
            responseTime: 0,
            tokensPerSecond: 0,
            successRate: 0,
            lastTested: new Date(),
            averageLatency: 0,
            totalTests: 0,
            successfulTests: 0
        };
    }
}