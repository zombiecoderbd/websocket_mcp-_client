// Continuous Monitoring System
// Real-time monitoring of all system components with health checks and alerts

const DatabaseIntegrationSystem = require('./DatabaseIntegrationSystem');
const fs = require('fs').promises;
const path = require('path');

class ContinuousMonitoringSystem {
    constructor() {
        this.databaseIntegration = new DatabaseIntegrationSystem();
        this.monitoringInterval = 30000; // 30 seconds
        this.healthCheckInterval = 60000; // 1 minute
        this.alertThresholds = {
            sessionFailureRate: 0.1, // 10%
            pingFailureRate: 0.2,    // 20%
            errorRate: 0.05,         // 5%
            responseTime: 5000       // 5 seconds
        };
        
        this.monitoringData = {
            sessionMetrics: [],
            pingMetrics: [],
            errorMetrics: [],
            performanceMetrics: [],
            alerts: []
        };
        
        this.isMonitoring = false;
        this.monitoringTimer = null;
        this.healthCheckTimer = null;
        
        this.initializeMonitoring();
    }

    async initializeMonitoring() {
        try {
            // Create monitoring logs directory
            const logDir = path.join(__dirname, '../../logs/monitoring');
            await fs.mkdir(logDir, { recursive: true });
            
            console.log('✅ Continuous monitoring system initialized');
        } catch (error) {
            console.error('❌ Failed to initialize monitoring system:', error);
        }
    }

    // Start continuous monitoring
    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        
        // Start main monitoring cycle
        this.monitoringTimer = setInterval(() => {
            this.performMonitoringCycle();
        }, this.monitoringInterval);
        
        // Start health checks
        this.healthCheckTimer = setInterval(() => {
            this.performHealthChecks();
        }, this.healthCheckInterval);
        
        // Perform initial monitoring
        setTimeout(() => this.performMonitoringCycle(), 1000);
        setTimeout(() => this.performHealthChecks(), 2000);
        
        console.log('✅ Continuous monitoring started');
    }

    // Stop monitoring
    stopMonitoring() {
        this.isMonitoring = false;
        
        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
            this.monitoringTimer = null;
        }
        
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
        
        console.log('⏹️ Continuous monitoring stopped');
    }

    // Perform monitoring cycle
    async performMonitoringCycle() {
        try {
            const cycleStart = Date.now();
            
            // Collect metrics from all systems
            const [sessionMetrics, pingMetrics, errorMetrics, performanceMetrics] = await Promise.all([
                this.collectSessionMetrics(),
                this.collectPingMetrics(),
                this.collectErrorMetrics(),
                this.collectPerformanceMetrics()
            ]);
            
            const cycleDuration = Date.now() - cycleStart;
            
            // Store metrics
            this.storeMetrics({
                sessionMetrics,
                pingMetrics,
                errorMetrics,
                performanceMetrics,
                cycleDuration,
                timestamp: new Date().toISOString()
            });
            
            // Check for alerts
            this.checkAlerts({
                sessionMetrics,
                pingMetrics,
                errorMetrics,
                performanceMetrics
            });
            
            // Log monitoring cycle
            await this.logMonitoringCycle({
                sessionMetrics,
                pingMetrics,
                errorMetrics,
                cycleDuration
            });
            
        } catch (error) {
            console.error('❌ Monitoring cycle failed:', error);
            this.recordAlert('monitoring_failure', {
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Collect session metrics
    async collectSessionMetrics() {
        try {
            const stats = await this.databaseIntegration.sessionSystem.getSessionStatistics();
            
            return {
                totalActiveSessions: stats.total_active_sessions || 0,
                sessionsByClient: stats.sessions_by_client || [],
                expiringSoon: stats.sessions_expiring_soon || 0,
                expiredPending: stats.expired_sessions_pending || 0,
                collectionTime: Date.now()
            };
        } catch (error) {
            return {
                totalActiveSessions: 0,
                sessionsByClient: [],
                expiringSoon: 0,
                expiredPending: 0,
                error: error.message,
                collectionTime: Date.now()
            };
        }
    }

    // Collect ping metrics
    async collectPingMetrics() {
        try {
            const stats = this.databaseIntegration.pingSystem.getStatistics();
            const connections = this.databaseIntegration.pingSystem.getAllConnectionsStatus();
            
            return {
                totalConnections: stats.total_connections || 0,
                healthyConnections: stats.healthy_connections || 0,
                failedConnections: stats.failed_connections || 0,
                connectionDetails: connections,
                pingInterval: stats.ping_interval,
                collectionTime: Date.now()
            };
        } catch (error) {
            return {
                totalConnections: 0,
                healthyConnections: 0,
                failedConnections: 0,
                connectionDetails: [],
                error: error.message,
                collectionTime: Date.now()
            };
        }
    }

    // Collect error metrics
    async collectErrorMetrics() {
        try {
            const stats = this.databaseIntegration.errorHandler.getErrorStatistics();
            
            return {
                totalErrors: stats.totalErrors || 0,
                errorsByCategory: stats.errorsByCategory || {},
                errorsBySeverity: stats.errorsBySeverity || {},
                systemHealth: stats.systemHealth || 'unknown',
                collectionTime: Date.now()
            };
        } catch (error) {
            return {
                totalErrors: 0,
                errorsByCategory: {},
                errorsBySeverity: {},
                systemHealth: 'unknown',
                error: error.message,
                collectionTime: Date.now()
            };
        }
    }

    // Collect performance metrics
    async collectPerformanceMetrics() {
        try {
            // System performance metrics
            const startTime = process.hrtime();
            
            // Test database response time
            const dbStart = process.hrtime();
            await this.databaseIntegration.pool.execute('SELECT 1');
            const dbResponseTime = this.convertHrtimeToMs(process.hrtime(dbStart));
            
            // Test session system response time
            const sessionStart = process.hrtime();
            await this.databaseIntegration.sessionSystem.getSessionStatistics();
            const sessionResponseTime = this.convertHrtimeToMs(process.hrtime(sessionStart));
            
            // Memory usage
            const memoryUsage = process.memoryUsage();
            
            // CPU usage estimation
            const cpuUsage = process.cpuUsage();
            
            return {
                databaseResponseTime: dbResponseTime,
                sessionResponseTime: sessionResponseTime,
                memoryUsage: {
                    rss: memoryUsage.rss,
                    heapTotal: memoryUsage.heapTotal,
                    heapUsed: memoryUsage.heapUsed,
                    external: memoryUsage.external
                },
                cpuUsage: {
                    user: cpuUsage.user,
                    system: cpuUsage.system
                },
                uptime: process.uptime(),
                collectionTime: Date.now()
            };
        } catch (error) {
            return {
                databaseResponseTime: -1,
                sessionResponseTime: -1,
                error: error.message,
                collectionTime: Date.now()
            };
        }
    }

    // Convert hrtime to milliseconds
    convertHrtimeToMs(hrtime) {
        return (hrtime[0] * 1000) + (hrtime[1] / 1000000);
    }

    // Store metrics for analysis
    storeMetrics(metrics) {
        // Keep last 1000 data points
        const maxDataPoints = 1000;
        
        Object.keys(this.monitoringData).forEach(key => {
            if (key !== 'alerts' && metrics[key]) {
                this.monitoringData[key].push(metrics[key]);
                if (this.monitoringData[key].length > maxDataPoints) {
                    this.monitoringData[key].shift();
                }
            }
        });
    }

    // Check for alerts based on thresholds
    checkAlerts(currentMetrics) {
        const timestamp = new Date().toISOString();
        
        // Check session failure rate
        if (currentMetrics.sessionMetrics.expiredPending > 10) {
            this.recordAlert('high_expired_sessions', {
                count: currentMetrics.sessionMetrics.expiredPending,
                threshold: 10,
                timestamp
            });
        }
        
        // Check ping failure rate
        const pingMetrics = currentMetrics.pingMetrics;
        if (pingMetrics.totalConnections > 0) {
            const failureRate = pingMetrics.failedConnections / pingMetrics.totalConnections;
            if (failureRate > this.alertThresholds.pingFailureRate) {
                this.recordAlert('high_ping_failure_rate', {
                    failureRate: failureRate.toFixed(3),
                    threshold: this.alertThresholds.pingFailureRate,
                    timestamp
                });
            }
        }
        
        // Check error rate
        const errorMetrics = currentMetrics.errorMetrics;
        if (errorMetrics.totalErrors > 50) {
            this.recordAlert('high_error_count', {
                count: errorMetrics.totalErrors,
                threshold: 50,
                timestamp
            });
        }
        
        // Check performance
        const perfMetrics = currentMetrics.performanceMetrics;
        if (perfMetrics.databaseResponseTime > this.alertThresholds.responseTime) {
            this.recordAlert('slow_database_response', {
                responseTime: perfMetrics.databaseResponseTime,
                threshold: this.alertThresholds.responseTime,
                timestamp
            });
        }
    }

    // Record alert
    recordAlert(type, data) {
        const alert = {
            id: `ALERT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            data,
            severity: this.determineAlertSeverity(type, data),
            timestamp: data.timestamp || new Date().toISOString()
        };
        
        this.monitoringData.alerts.push(alert);
        
        // Keep last 100 alerts
        if (this.monitoringData.alerts.length > 100) {
            this.monitoringData.alerts.shift();
        }
        
        // Log alert
        console.warn(`⚠️ ALERT [${alert.severity.toUpperCase()}]: ${type}`, data);
        
        // Trigger alert handlers
        this.handleAlert(alert);
    }

    // Determine alert severity
    determineAlertSeverity(type, data) {
        if (type.includes('failure') || type.includes('critical')) {
            return 'critical';
        }
        if (type.includes('high') || type.includes('slow')) {
            return 'high';
        }
        if (type.includes('warning') || type.includes('medium')) {
            return 'medium';
        }
        return 'low';
    }

    // Handle alerts (extendable for notifications)
    handleAlert(alert) {
        // This can be extended to send notifications via email, Slack, etc.
        switch (alert.severity) {
            case 'critical':
                // Immediate action required
                this.triggerCriticalAlert(alert);
                break;
            case 'high':
                // Attention needed soon
                this.triggerHighAlert(alert);
                break;
            case 'medium':
                // Monitor and investigate
                this.triggerMediumAlert(alert);
                break;
        }
    }

    // Trigger critical alert actions
    triggerCriticalAlert(alert) {
        console.error(`🚨 CRITICAL ALERT: ${alert.type}`, alert.data);
        // Could trigger immediate notifications, system restart, etc.
    }

    // Trigger high alert actions
    triggerHighAlert(alert) {
        console.warn(`⚠️ HIGH ALERT: ${alert.type}`, alert.data);
        // Could trigger notifications to administrators
    }

    // Trigger medium alert actions
    triggerMediumAlert(alert) {
        console.info(`ℹ️ MEDIUM ALERT: ${alert.type}`, alert.data);
        // Could log for later review
    }

    // Perform system health checks
    async performHealthChecks() {
        try {
            const healthReport = await this.databaseIntegration.getIntegrationStatistics();
            
            if (healthReport) {
                const overallHealth = healthReport.overall_health;
                
                // Log health status
                if (overallHealth.overall_health < 50) {
                    this.recordAlert('system_health_degraded', {
                        health_score: overallHealth.overall_health,
                        details: overallHealth,
                        timestamp: new Date().toISOString()
                    });
                }
                
                await this.logHealthCheck(overallHealth);
            }
            
        } catch (error) {
            this.recordAlert('health_check_failure', {
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Log monitoring cycle to file
    async logMonitoringCycle(metrics) {
        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                cycle_metrics: {
                    session_count: metrics.sessionMetrics.totalActiveSessions,
                    healthy_connections: metrics.pingMetrics.healthyConnections,
                    total_errors: metrics.errorMetrics.totalErrors,
                    cycle_duration: metrics.cycleDuration
                }
            };
            
            const logPath = path.join(__dirname, '../../logs/monitoring/cycles.log');
            await fs.appendFile(logPath, JSON.stringify(logEntry) + '\n');
            
        } catch (error) {
            console.error('❌ Failed to log monitoring cycle:', error);
        }
    }

    // Log health check to file
    async logHealthCheck(healthData) {
        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                health_data: healthData
            };
            
            const logPath = path.join(__dirname, '../../logs/monitoring/health.log');
            await fs.appendFile(logPath, JSON.stringify(logEntry) + '\n');
            
        } catch (error) {
            console.error('❌ Failed to log health check:', error);
        }
    }

    // Get current monitoring data
    getMonitoringData() {
        return {
            ...this.monitoringData,
            isMonitoring: this.isMonitoring,
            lastUpdate: new Date().toISOString()
        };
    }

    // Get system health report
    async getHealthReport() {
        try {
            const stats = await this.databaseIntegration.getIntegrationStatistics();
            
            return {
                system_status: this.isMonitoring ? 'monitoring' : 'stopped',
                integration_statistics: stats,
                recent_alerts: this.monitoringData.alerts.slice(-10),
                monitoring_data_points: {
                    session_metrics: this.monitoringData.sessionMetrics.length,
                    ping_metrics: this.monitoringData.pingMetrics.length,
                    error_metrics: this.monitoringData.errorMetrics.length
                }
            };
        } catch (error) {
            return {
                system_status: 'error',
                error: error.message
            };
        }
    }

    // Get performance trends
    getPerformanceTrends() {
        const trends = {};
        
        // Calculate averages for recent data points
        const recentPoints = 50; // Last 50 data points
        
        ['sessionMetrics', 'pingMetrics', 'errorMetrics', 'performanceMetrics'].forEach(metricType => {
            const dataPoints = this.monitoringData[metricType].slice(-recentPoints);
            if (dataPoints.length > 0) {
                trends[metricType] = this.calculateTrend(dataPoints);
            }
        });
        
        return trends;
    }

    // Calculate trend from data points
    calculateTrend(dataPoints) {
        if (dataPoints.length < 2) return { trend: 'insufficient_data' };
        
        const first = dataPoints[0];
        const last = dataPoints[dataPoints.length - 1];
        
        // Simple trend calculation (more sophisticated analysis could be added)
        return {
            first_value: first,
            last_value: last,
            data_points: dataPoints.length
        };
    }

    // Cleanup old monitoring data
    cleanupMonitoringData() {
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        const now = Date.now();
        
        Object.keys(this.monitoringData).forEach(key => {
            if (key !== 'alerts') {
                this.monitoringData[key] = this.monitoringData[key].filter(
                    data => (now - data.collectionTime) < maxAge
                );
            }
        });
        
        console.log('🧹 Monitoring data cleanup completed');
    }

    // Close monitoring system
    async close() {
        this.stopMonitoring();
        await this.databaseIntegration.close();
        console.log('✅ Continuous monitoring system closed');
    }
}

module.exports = ContinuousMonitoringSystem;