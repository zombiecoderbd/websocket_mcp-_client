const winston = require('winston');
const path = require('path');

class Logger {
    constructor(databaseManager) {
        this.db = databaseManager;
        
        // Create logs directory
        const logsDir = path.join(__dirname, '../logs');
        if (!require('fs').existsSync(logsDir)) {
            require('fs').mkdirSync(logsDir, { recursive: true });
        }

        // Configure winston logger
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            defaultMeta: { service: 'zombiecoder-mcp-server' },
            transports: [
                // Write all logs to console
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                }),
                // Write all logs to file
                new winston.transports.File({
                    filename: path.join(logsDir, 'combined.log'),
                    maxsize: 5242880, // 5MB
                    maxFiles: 5
                }),
                // Write error logs to separate file
                new winston.transports.File({
                    filename: path.join(logsDir, 'error.log'),
                    level: 'error',
                    maxsize: 5242880, // 5MB
                    maxFiles: 5
                })
            ]
        });

        // Handle uncaught exceptions
        this.logger.exceptions.handle(
            new winston.transports.File({
                filename: path.join(logsDir, 'exceptions.log')
            })
        );

        // Handle unhandled rejections
        this.logger.rejections.handle(
            new winston.transports.File({
                filename: path.join(logsDir, 'rejections.log')
            })
        );
    }

    async log(level, message, meta = {}, component = 'system') {
        // Log to winston
        this.logger.log(level, message, meta);
        
        // Log to database if enabled
        try {
            const loggingEnabled = await this.db.getAdminSetting('logging_enabled');
            if (loggingEnabled === 'true') {
                await this.db.logMessage(level, message, { ...meta, component }, component);
            }
        } catch (error) {
            // Don't let database errors stop logging
            this.logger.error('Failed to log to database:', error);
        }
    }

    // Convenience methods
    async info(message, meta = {}, component = 'system') {
        return await this.log('info', message, meta, component);
    }

    async error(message, meta = {}, component = 'system') {
        return await this.log('error', message, meta, component);
    }

    async warn(message, meta = {}, component = 'system') {
        return await this.log('warn', message, meta, component);
    }

    async debug(message, meta = {}, component = 'system') {
        return await this.log('debug', message, meta, component);
    }

    async verbose(message, meta = {}, component = 'system') {
        return await this.log('verbose', message, meta, component);
    }

    // Specialized logging methods
    async logMcpOperation(operationType, toolName, inputParams, outputResult, success, errorMessage = null, executionTime = null) {
        try {
            await this.db.logOperation(operationType, toolName, inputParams, outputResult, success, errorMessage, executionTime);
            
            const message = success ? 
                `MCP Operation Successful: ${operationType} - ${toolName}` :
                `MCP Operation Failed: ${operationType} - ${toolName}`;
                
            const meta = {
                operationType,
                toolName,
                success,
                executionTime,
                ...(errorMessage && { errorMessage })
            };
            
            return await this.log(success ? 'info' : 'error', message, meta, 'mcp-server');
        } catch (error) {
            this.logger.error('Failed to log MCP operation:', error);
        }
    }

    async logRequest(method, endpoint, requestData, responseData, status, processingTime, ipAddress, userAgent) {
        try {
            await this.db.logRequest(method, endpoint, requestData, responseData, status, processingTime, ipAddress, userAgent);
            
            const message = `HTTP Request: ${method} ${endpoint} - ${status}`;
            const meta = {
                method,
                endpoint,
                status,
                processingTime,
                ipAddress,
                userAgent
            };
            
            return await this.log(status === 'success' ? 'info' : 'warn', message, meta, 'http-server');
        } catch (error) {
            this.logger.error('Failed to log request:', error);
        }
    }

    async logConnection(connectionType, status, details, ipAddress, userAgent) {
        try {
            await this.db.logConnection(connectionType, status, details, ipAddress, userAgent);
            
            const message = `Connection ${status}: ${connectionType}`;
            const meta = {
                connectionType,
                status,
                details,
                ipAddress,
                userAgent
            };
            
            return await this.log(status === 'connected' ? 'info' : 'warn', message, meta, 'connection-manager');
        } catch (error) {
            this.logger.error('Failed to log connection:', error);
        }
    }

    // Get recent logs from database
    async getRecentLogs(limit = 100) {
        try {
            return await this.db.getRecentLogs(limit);
        } catch (error) {
            this.logger.error('Failed to retrieve logs:', error);
            return [];
        }
    }

    // Clean up old logs
    async cleanupOldLogs(days = 30) {
        try {
            const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
            const result = await this.db.runQuery(
                'DELETE FROM logs WHERE timestamp < ?', 
                [cutoffDate.toISOString()]
            );
            
            this.logger.info(`Cleaned up ${result.changes} old log entries`);
            return result.changes;
        } catch (error) {
            this.logger.error('Failed to clean up old logs:', error);
            return 0;
        }
    }
}

module.exports = Logger;