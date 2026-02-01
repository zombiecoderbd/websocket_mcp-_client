const os = require('os');

class PerformanceMonitor {
    constructor(databaseManager, logger) {
        this.db = databaseManager;
        this.logger = logger;
        this.metrics = {
            cpu: { usage: 0, cores: os.cpus().length },
            memory: { heapUsed: 0, heapTotal: 0, rss: 0 },
            eventLoop: { latency: 0 },
            network: { bytesIn: 0, bytesOut: 0 },
            database: { queryCount: 0, avgQueryTime: 0 }
        };
        
        this.collectorInterval = null;
        this.historyBuffer = [];
        this.maxHistorySize = 1000;
        this.lastCpuUsage = process.cpuUsage();
        this.lastEventLoopTime = Date.now();
    }
    
    async initialize() {
        try {
            // Get collection interval from settings
            const intervalSetting = await this.db.getAdminSetting('performance_metrics_interval');
            const interval = intervalSetting ? parseInt(intervalSetting) : 5000;
            
            this.startCollection(interval);
            
            this.logger.info('Performance Monitor initialized', {
                collectionInterval: interval,
                cpuCores: this.metrics.cpu.cores
            }, 'performance');
            
        } catch (error) {
            this.logger.error('Failed to initialize Performance Monitor', { 
                error: error.message 
            }, 'performance');
            throw error;
        }
    }
    
    startCollection(interval = 5000) {
        if (this.collectorInterval) {
            clearInterval(this.collectorInterval);
        }
        
        this.collectorInterval = setInterval(async () => {
            try {
                await this.collectMetrics();
                await this.storeMetrics();
                await this.cleanupHistory();
            } catch (error) {
                this.logger.error('Error in performance collection cycle', { 
                    error: error.message 
                }, 'performance');
            }
        }, interval);
    }
    
    async collectMetrics() {
        // CPU Usage
        const currentCpuUsage = process.cpuUsage();
        const cpuDiff = {
            user: currentCpuUsage.user - this.lastCpuUsage.user,
            system: currentCpuUsage.system - this.lastCpuUsage.system
        };
        
        const totalCpuTime = cpuDiff.user + cpuDiff.system;
        const cpuPercent = (totalCpuTime / (5000 * 1000)) * 100; // 5000ms interval
        
        this.metrics.cpu.usage = Math.min(100, Math.max(0, cpuPercent));
        this.lastCpuUsage = currentCpuUsage;
        
        // Memory Usage
        const memUsage = process.memoryUsage();
        this.metrics.memory = {
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            rss: memUsage.rss,
            external: memUsage.external,
            arrayBuffers: memUsage.arrayBuffers
        };
        
        // Event Loop Latency
        const now = Date.now();
        const latency = now - this.lastEventLoopTime - 5000; // Expected 5000ms
        this.metrics.eventLoop.latency = Math.max(0, latency);
        this.lastEventLoopTime = now;
        
        // System Metrics
        const loadAvg = os.loadavg();
        const uptime = os.uptime();
        const freemem = os.freemem();
        const totalmem = os.totalmem();
        
        // Add to metrics object
        this.metrics.system = {
            loadAvg: loadAvg,
            uptime: uptime,
            freeMemory: freemem,
            totalMemory: totalmem,
            memoryUsagePercent: ((totalmem - freemem) / totalmem) * 100
        };
        
        return this.metrics;
    }
    
    async storeMetrics() {
        const timestamp = new Date().toISOString();
        
        try {
            // Store CPU metrics
            await this.db.runQuery(`
                INSERT INTO performance_metrics 
                (metric_name, metric_value, timestamp, component, context)
                VALUES (?, ?, ?, ?, ?)
            `, ['cpu_usage', this.metrics.cpu.usage, timestamp, 'system', 'process']);
            
            // Store memory metrics
            await this.db.runQuery(`
                INSERT INTO performance_metrics 
                (metric_name, metric_value, timestamp, component, context)
                VALUES (?, ?, ?, ?, ?)
            `, ['memory_heap_used', this.metrics.memory.heapUsed, timestamp, 'system', 'process']);
            
            await this.db.runQuery(`
                INSERT INTO performance_metrics 
                (metric_name, metric_value, timestamp, component, context)
                VALUES (?, ?, ?, ?, ?)
            `, ['memory_rss', this.metrics.memory.rss, timestamp, 'system', 'process']);
            
            // Store event loop latency
            await this.db.runQuery(`
                INSERT INTO performance_metrics 
                (metric_name, metric_value, timestamp, component, context)
                VALUES (?, ?, ?, ?, ?)
            `, ['event_loop_latency', this.metrics.eventLoop.latency, timestamp, 'system', 'process']);
            
            // Store system metrics
            if (this.metrics.system) {
                await this.db.runQuery(`
                    INSERT INTO performance_metrics 
                    (metric_name, metric_value, timestamp, component, context)
                    VALUES (?, ?, ?, ?, ?)
                `, ['system_load_1min', this.metrics.system.loadAvg[0], timestamp, 'system', 'os']);
                
                await this.db.runQuery(`
                    INSERT INTO performance_metrics 
                    (metric_name, metric_value, timestamp, component, context)
                    VALUES (?, ?, ?, ?, ?)
                `, ['system_memory_usage', this.metrics.system.memoryUsagePercent, timestamp, 'system', 'os']);
            }
            
            // Add to history buffer
            this.historyBuffer.push({
                timestamp: timestamp,
                metrics: { ...this.metrics }
            });
            
            // Keep buffer size manageable
            if (this.historyBuffer.length > this.maxHistorySize) {
                this.historyBuffer = this.historyBuffer.slice(-this.maxHistorySize);
            }
            
        } catch (error) {
            this.logger.error('Failed to store performance metrics', { 
                error: error.message 
            }, 'performance');
        }
    }
    
    async getMetrics(hours = 1) {
        try {
            const metrics = await this.db.all(`
                SELECT metric_name, metric_value, timestamp, component, context
                FROM performance_metrics
                WHERE timestamp > datetime('now', '-${hours} hours')
                ORDER BY timestamp DESC
                LIMIT 1000
            `);
            
            return metrics;
        } catch (error) {
            this.logger.error('Failed to get performance metrics', { 
                error: error.message 
            }, 'performance');
            return [];
        }
    }
    
    async getRecentMetrics(limit = 50) {
        // Return from buffer first (most recent)
        const fromBuffer = this.historyBuffer.slice(-limit).reverse();
        
        // If we need more, get from database
        if (fromBuffer.length < limit) {
            try {
                const fromDb = await this.db.all(`
                    SELECT * FROM performance_metrics
                    ORDER BY timestamp DESC
                    LIMIT ?
                `, [limit - fromBuffer.length]);
                
                return [...fromDb, ...fromBuffer];
            } catch (error) {
                this.logger.error('Failed to get metrics from database', { 
                    error: error.message 
                }, 'performance');
                return fromBuffer;
            }
        }
        
        return fromBuffer;
    }
    
    async getSystemInfo() {
        return {
            platform: os.platform(),
            architecture: os.arch(),
            cpuCount: os.cpus().length,
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            loadAverage: os.loadavg(),
            uptime: os.uptime(),
            process: {
                pid: process.pid,
                uptime: process.uptime(),
                version: process.version
            }
        };
    }
    
    async getHealthStatus() {
        const systemInfo = await this.getSystemInfo();
        const currentMetrics = await this.collectMetrics();
        
        const healthStatus = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            system: {
                cpuUsage: currentMetrics.cpu.usage,
                memoryUsage: (currentMetrics.memory.heapUsed / currentMetrics.memory.heapTotal) * 100,
                loadAverage: systemInfo.loadAverage[0],
                uptime: systemInfo.uptime
            },
            process: {
                uptime: process.uptime(),
                memoryUsage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
                eventLoopLatency: currentMetrics.eventLoop.latency
            },
            warnings: []
        };
        
        // Check for warnings
        if (currentMetrics.cpu.usage > 80) {
            healthStatus.warnings.push('High CPU usage detected');
            healthStatus.status = 'warning';
        }
        
        if ((currentMetrics.memory.heapUsed / currentMetrics.memory.heapTotal) > 0.8) {
            healthStatus.warnings.push('High memory usage detected');
            if (healthStatus.status === 'healthy') {
                healthStatus.status = 'warning';
            }
        }
        
        if (currentMetrics.eventLoop.latency > 100) {
            healthStatus.warnings.push('High event loop latency detected');
            healthStatus.status = 'warning';
        }
        
        if (systemInfo.loadAverage[0] > systemInfo.cpuCount) {
            healthStatus.warnings.push('High system load detected');
            healthStatus.status = 'warning';
        }
        
        return healthStatus;
    }
    
    async cleanupHistory() {
        // Clean up old database entries (older than 24 hours)
        try {
            await this.db.runQuery(`
                DELETE FROM performance_metrics 
                WHERE timestamp < datetime('now', '-1 day')
            `);
        } catch (error) {
            this.logger.error('Failed to cleanup old performance metrics', { 
                error: error.message 
            }, 'performance');
        }
        
        // Clean up history buffer (older than 1 hour)
        const oneHourAgo = Date.now() - 3600000;
        this.historyBuffer = this.historyBuffer.filter(
            entry => new Date(entry.timestamp).getTime() > oneHourAgo
        );
    }
    
    getMetricsSnapshot() {
        return {
            ...this.metrics,
            timestamp: new Date().toISOString()
        };
    }
    
    stop() {
        if (this.collectorInterval) {
            clearInterval(this.collectorInterval);
            this.collectorInterval = null;
        }
    }
}

module.exports = PerformanceMonitor;