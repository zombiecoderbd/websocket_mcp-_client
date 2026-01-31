import axios, { AxiosInstance } from 'axios';
import { Logger } from '../utils/logger';
import { executeQuery } from '../database/connection';

const logger = new Logger();

export interface GoogleProviderConfig {
    apiKey: string;
    projectId: string;
    region: string;
    quotaLimits: {
        rpm: number;  // requests per minute
        tpm: number;  // tokens per minute
    };
}

export interface ModelInfo {
    name: string;
    displayName: string;
    version: string;
    type: 'text' | 'vision' | 'embedding' | 'audio' | 'multimodal';
    description: string;
    parameters?: string;
    isAvailable: boolean;
    providerModelId?: number;
}

export interface ModelResponse {
    content: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    model: string;
    finishReason: string;
}

export interface PerformanceMetrics {
    responseTime: number;
    tokensPerSecond: number;
    successRate: number;
    lastTested: Date;
    averageLatency: number;
}

export class GoogleCloudProvider {
    private config: GoogleProviderConfig | null = null;
    private httpClient: AxiosInstance;
    private baseUrl: string;
    private providerId: number | null = null;

    constructor() {
        this.baseUrl = 'https://aiplatform.googleapis.com';
        this.httpClient = axios.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            }
        });

        // Add response interceptor for logging
        this.httpClient.interceptors.response.use(
            response => response,
            error => {
                logger.error('Google Cloud API error:', error.response?.data || error.message);
                return Promise.reject(error);
            }
        );
    }

    async initialize(config: GoogleProviderConfig): Promise<void> {
        try {
            this.config = config;
            
            // Get provider ID from database
            const providerResult = await executeQuery(
                'SELECT id FROM ai_providers WHERE name = ? AND type = ?',
                ['Google Cloud AI', 'google']
            );
            
            if (providerResult && providerResult.length > 0) {
                this.providerId = providerResult[0].id;
                
                // Update provider configuration
                await this.updateProviderConfiguration(config);
                logger.info('Google Cloud provider initialized successfully');
            } else {
                throw new Error('Google Cloud provider not found in database');
            }
        } catch (error) {
            logger.error('Failed to initialize Google Cloud provider:', error);
            throw error;
        }
    }

    private async updateProviderConfiguration(config: GoogleProviderConfig): Promise<void> {
        if (!this.providerId) return;

        // Update configuration values
        const configUpdates = [
            { key: 'api_key', value: config.apiKey },
            { key: 'project_id', value: config.projectId },
            { key: 'region', value: config.region },
            { key: 'quota_requests_per_minute', value: config.quotaLimits.rpm.toString() },
            { key: 'quota_tokens_per_minute', value: config.quotaLimits.tpm.toString() }
        ];

        for (const update of configUpdates) {
            await executeQuery(
                `INSERT INTO provider_configurations (provider_id, config_key, config_value, config_type) 
                 VALUES (?, ?, ?, 'string') 
                 ON DUPLICATE KEY UPDATE config_value = ?`,
                [this.providerId, update.key, update.value, update.value]
            );
        }
    }

    async listAvailableModels(): Promise<ModelInfo[]> {
        try {
            if (!this.config) {
                throw new Error('Provider not initialized');
            }

            // First check database for cached models
            const cachedModels = await this.getCachedModels();
            if (cachedModels.length > 0) {
                logger.info(`Found ${cachedModels.length} cached Google models`);
                return cachedModels;
            }

            // If no cached models, fetch from API (simplified for demo)
            const models: ModelInfo[] = [
                {
                    name: 'gemini-pro',
                    displayName: 'Gemini Pro',
                    version: '1.0',
                    type: 'text',
                    description: 'Google\'s advanced language model for text generation',
                    parameters: 'Unknown',
                    isAvailable: true
                },
                {
                    name: 'gemini-pro-vision',
                    displayName: 'Gemini Pro Vision',
                    version: '1.0',
                    type: 'vision',
                    description: 'Multimodal model for text and image understanding',
                    parameters: 'Unknown',
                    isAvailable: true
                },
                {
                    name: 'text-embedding-004',
                    displayName: 'Text Embedding',
                    version: '004',
                    type: 'embedding',
                    description: 'Text embedding model for semantic search',
                    parameters: 'Unknown',
                    isAvailable: true
                }
            ];

            // Cache models in database
            await this.cacheModels(models);
            
            return models;
        } catch (error) {
            logger.error('Failed to list Google models:', error);
            return [];
        }
    }

    private async getCachedModels(): Promise<ModelInfo[]> {
        if (!this.providerId) return [];

        try {
            const results = await executeQuery(
                `SELECT model_name, model_alias, model_type, is_available, metadata 
                 FROM provider_model_mappings 
                 WHERE provider_id = ? AND is_available = TRUE`,
                [this.providerId]
            );

            return results.map((row: any) => ({
                name: row.model_name,
                displayName: row.model_alias,
                version: row.metadata?.version || 'unknown',
                type: row.model_type,
                description: row.metadata?.description || '',
                parameters: row.metadata?.parameters || 'unknown',
                isAvailable: row.is_available,
                providerModelId: row.id
            }));
        } catch (error) {
            logger.error('Failed to get cached models:', error);
            return [];
        }
    }

    private async cacheModels(models: ModelInfo[]): Promise<void> {
        if (!this.providerId) return;

        try {
            for (const model of models) {
                await executeQuery(
                    `INSERT INTO provider_model_mappings 
                     (provider_id, model_name, model_alias, model_type, is_available, metadata) 
                     VALUES (?, ?, ?, ?, ?, ?) 
                     ON DUPLICATE KEY UPDATE 
                     model_alias = ?, model_type = ?, is_available = ?, metadata = ?, last_synced = CURRENT_TIMESTAMP`,
                    [
                        this.providerId,
                        model.name,
                        model.displayName,
                        model.type,
                        model.isAvailable,
                        JSON.stringify({
                            version: model.version,
                            description: model.description,
                            parameters: model.parameters
                        }),
                        model.displayName,
                        model.type,
                        model.isAvailable,
                        JSON.stringify({
                            version: model.version,
                            description: model.description,
                            parameters: model.parameters
                        })
                    ]
                );
            }
            logger.info(`Cached ${models.length} Google models in database`);
        } catch (error) {
            logger.error('Failed to cache models:', error);
        }
    }

    async testModelConnectivity(modelName: string): Promise<boolean> {
        try {
            if (!this.config) {
                throw new Error('Provider not initialized');
            }

            const startTime = Date.now();
            
            // Simple connectivity test - in real implementation, this would make an actual API call
            const testPrompt = "Test connection";
            const response = await this.sendMessage(modelName, testPrompt);
            
            const responseTime = Date.now() - startTime;
            
            // Record performance metrics
            await this.recordPerformanceMetric(
                modelName,
                'connectivity',
                responseTime,
                response.usage.totalTokens,
                true
            );

            return response.content.length > 0;
        } catch (error) {
            logger.error(`Failed to test connectivity for model ${modelName}:`, error);
            
            // Record failed test
            await this.recordPerformanceMetric(
                modelName,
                'connectivity',
                0,
                0,
                false,
                error instanceof Error ? error.message : 'Unknown error'
            );
            
            return false;
        }
    }

    async sendMessage(modelName: string, prompt: string): Promise<ModelResponse> {
        try {
            if (!this.config) {
                throw new Error('Provider not initialized');
            }

            const startTime = Date.now();
            
            // In a real implementation, this would make actual API calls to Google Cloud
            // For demo purposes, we'll simulate a response
            const simulatedResponse = this.simulateModelResponse(modelName, prompt);
            
            const responseTime = Date.now() - startTime;
            const tokensUsed = prompt.split(' ').length + simulatedResponse.content.split(' ').length;
            
            // Record performance metrics
            await this.recordPerformanceMetric(
                modelName,
                'response_time',
                responseTime,
                tokensUsed,
                true
            );

            return simulatedResponse;
        } catch (error) {
            logger.error(`Failed to send message to model ${modelName}:`, error);
            
            // Record failed attempt
            await this.recordPerformanceMetric(
                modelName,
                'response_time',
                0,
                0,
                false,
                error instanceof Error ? error.message : 'Unknown error'
            );
            
            throw error;
        }
    }

    private simulateModelResponse(modelName: string, prompt: string): ModelResponse {
        // Simulate different responses based on model type
        let content = '';
        
        if (modelName.includes('embedding')) {
            content = `This is a simulated embedding response for: "${prompt}". In a real implementation, this would return vector embeddings.`;
        } else if (modelName.includes('vision')) {
            content = `This is a simulated vision model response for: "${prompt}". In a real implementation, this would process both text and images.`;
        } else {
            content = `This is a simulated response from ${modelName} to your prompt: "${prompt}". In a real implementation, this would connect to Google Cloud AI Platform and return actual model responses.`;
        }

        return {
            content,
            usage: {
                promptTokens: prompt.split(' ').length,
                completionTokens: content.split(' ').length,
                totalTokens: prompt.split(' ').length + content.split(' ').length
            },
            model: modelName,
            finishReason: 'stop'
        };
    }

    private async recordPerformanceMetric(
        modelName: string,
        testType: string,
        responseTime: number,
        tokensUsed: number,
        success: boolean,
        errorMessage?: string
    ): Promise<void> {
        try {
            // Get provider model ID
            const modelResult = await executeQuery(
                'SELECT id FROM provider_model_mappings WHERE model_name = ? AND provider_id = ?',
                [modelName, this.providerId]
            );

            const providerModelId = modelResult && modelResult.length > 0 ? modelResult[0].id : null;

            // Calculate performance score (simplified)
            const performanceScore = success ? Math.max(0, 100 - (responseTime / 100)) : 0;

            await executeQuery(
                `INSERT INTO model_performance_metrics 
                 (provider_model_id, test_type, response_time_ms, tokens_used, success, error_message, performance_score, metadata) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    providerModelId,
                    testType,
                    responseTime,
                    tokensUsed,
                    success,
                    errorMessage || null,
                    performanceScore,
                    JSON.stringify({
                        modelName,
                        timestamp: new Date().toISOString()
                    })
                ]
            );
        } catch (error) {
            logger.error('Failed to record performance metric:', error);
        }
    }

    async getModelPerformance(modelName: string): Promise<PerformanceMetrics> {
        try {
            const results = await executeQuery(
                `SELECT 
                    AVG(response_time_ms) as avg_response_time,
                    AVG(performance_score) as avg_score,
                    COUNT(*) as total_tests,
                    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_tests
                 FROM model_performance_metrics mpm
                 JOIN provider_model_mappings pm ON mpm.provider_model_id = pm.id
                 WHERE pm.model_name = ? AND pm.provider_id = ?
                 AND mpm.tested_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
                [modelName, this.providerId]
            );

            if (results && results.length > 0) {
                const data = results[0];
                const successRate = data.total_tests > 0 ? (data.successful_tests / data.total_tests) * 100 : 0;
                
                return {
                    responseTime: data.avg_response_time || 0,
                    tokensPerSecond: data.avg_response_time > 0 ? Math.round(1000 / data.avg_response_time) : 0,
                    successRate,
                    lastTested: new Date(),
                    averageLatency: data.avg_response_time || 0
                };
            }

            return {
                responseTime: 0,
                tokensPerSecond: 0,
                successRate: 0,
                lastTested: new Date(),
                averageLatency: 0
            };
        } catch (error) {
            logger.error(`Failed to get performance metrics for ${modelName}:`, error);
            return {
                responseTime: 0,
                tokensPerSecond: 0,
                successRate: 0,
                lastTested: new Date(),
                averageLatency: 0
            };
        }
    }

    isInitialized(): boolean {
        return this.config !== null && this.providerId !== null;
    }
}