const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class DatabaseManager {
    constructor(dbPath = './database/zombiecoder.db') {
        this.dbPath = dbPath;
        this.db = null;
    }

    async initialize() {
        try {
            // Create database directory if it doesn't exist
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            // Initialize database
            this.db = new sqlite3.Database(this.dbPath);
            
            // Enable WAL mode for better concurrency
            await this.runQuery('PRAGMA journal_mode=WAL;');
            
            // Read and execute schema
            const schemaPath = path.join(__dirname, 'schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            
            // Split schema into individual statements and execute them
            const statements = schema.split(';').filter(stmt => stmt.trim());
            
            for (const statement of statements) {
                if (statement.trim()) {
                    try {
                        await this.runQuery(statement);
                    } catch (error) {
                        // Ignore errors for CREATE TABLE IF NOT EXISTS statements
                        if (!statement.trim().toUpperCase().startsWith('CREATE TABLE IF NOT EXISTS')) {
                            console.error('Schema execution error:', error.message);
                            throw error;
                        }
                    }
                }
            }

            console.log('✅ Database initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        }
    }

    runQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    // Helper methods for specific operations
    async logRequest(method, endpoint, requestData, responseData, status, processingTime, ipAddress, userAgent) {
        const sql = `
            INSERT INTO requests (method, endpoint, request_data, response_data, status, processing_time, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        return await this.runQuery(sql, [method, endpoint, requestData, responseData, status, processingTime, ipAddress, userAgent]);
    }

    async logConnection(connectionType, status, details, ipAddress, userAgent) {
        const sql = `
            INSERT INTO connections (connection_type, status, details, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?)
        `;
        return await this.runQuery(sql, [connectionType, status, details, ipAddress, userAgent]);
    }

    async logOperation(operationType, toolName, inputParams, outputResult, success, errorMessage, executionTime) {
        const sql = `
            INSERT INTO mcp_operations (operation_type, tool_name, input_params, output_result, success, error_message, execution_time)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        return await this.runQuery(sql, [operationType, toolName, inputParams, outputResult, success, errorMessage, executionTime]);
    }

    async logMessage(level, message, meta = null, component = 'system') {
        const sql = `
            INSERT INTO logs (level, message, meta, component)
            VALUES (?, ?, ?, ?)
        `;
        return await this.runQuery(sql, [level, message, meta ? JSON.stringify(meta) : null, component]);
    }

    async getAdminSetting(key) {
        const row = await this.get('SELECT setting_value FROM admin_settings WHERE setting_key = ?', [key]);
        return row ? row.setting_value : null;
    }

    async setAdminSetting(key, value, description = null) {
        const sql = `
            INSERT OR REPLACE INTO admin_settings (setting_key, setting_value, description, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `;
        return await this.runQuery(sql, [key, value, description]);
    }

    async getRecentLogs(limit = 100) {
        return await this.all('SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?', [limit]);
    }

    async getRecentOperations(limit = 50) {
        return await this.all('SELECT * FROM mcp_operations ORDER BY timestamp DESC LIMIT ?', [limit]);
    }

    async getRequestStats(hours = 24) {
        const sql = `
            SELECT 
                COUNT(*) as total_requests,
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_requests,
                AVG(processing_time) as avg_processing_time,
                MAX(timestamp) as last_request
            FROM requests 
            WHERE timestamp > datetime('now', '-${hours} hours')
        `;
        return await this.get(sql);
    }

    async getConnectionStats() {
        const sql = `
            SELECT 
                connection_type,
                COUNT(*) as total_connections,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_connections
            FROM connections 
            GROUP BY connection_type
        `;
        return await this.all(sql);
    }

    // Agent-related helper methods
    async registerAgent(name, type, description, config = {}) {
        const sql = `
            INSERT INTO agents (name, type, description, config)
            VALUES (?, ?, ?, ?)
        `;
        return await this.runQuery(sql, [name, type, description, JSON.stringify(config)]);
    }

    async updateAgent(id, name, type, description, config = {}) {
        const sql = `
            UPDATE agents 
            SET name = ?, type = ?, description = ?, config = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        return await this.runQuery(sql, [name, type, description, JSON.stringify(config), id]);
    }

    async getAgent(id) {
        return await this.get('SELECT * FROM agents WHERE id = ?', [id]);
    }

    async getAgents(filters = {}) {
        let sql = 'SELECT * FROM agents';
        const params = [];
        
        if (filters.type) {
            sql += ' WHERE type = ?';
            params.push(filters.type);
        }
        
        if (filters.isActive !== undefined) {
            if (params.length > 0) {
                sql += ' AND is_active = ?';
            } else {
                sql += ' WHERE is_active = ?';
            }
            params.push(filters.isActive ? 1 : 0);
        }
        
        sql += ' ORDER BY created_at DESC';
        return await this.all(sql, params);
    }

    async deleteAgent(id) {
        const sql = 'DELETE FROM agents WHERE id = ?';
        return await this.runQuery(sql, [id]);
    }

    async logAgentExecution(agentId, executionId, status, inputParams = {}, outputResult = null, errorMessage = null) {
        const startTime = new Date();
        const sql = `
            INSERT INTO agent_executions (agent_id, execution_id, status, input_params, output_result, error_message, start_time)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        return await this.runQuery(sql, [agentId, executionId, status, JSON.stringify(inputParams), JSON.stringify(outputResult), errorMessage, startTime.toISOString()]);
    }

    async updateAgentExecution(executionId, status, outputResult = null, errorMessage = null) {
        const endTime = new Date();
        const sql = `
            UPDATE agent_executions 
            SET status = ?, output_result = ?, error_message = ?, end_time = ?, execution_time = (julianday(end_time) - julianday(start_time)) * 86400 * 1000
            WHERE execution_id = ?
        `;
        return await this.runQuery(sql, [status, JSON.stringify(outputResult), errorMessage, endTime.toISOString(), executionId]);
    }

    async getAgentExecutions(agentId, limit = 50) {
        const sql = `
            SELECT * FROM agent_executions 
            WHERE agent_id = ? 
            ORDER BY start_time DESC 
            LIMIT ?
        `;
        return await this.all(sql, [agentId, limit]);
    }

    async getRecentAgentExecutions(limit = 50) {
        const sql = `
            SELECT ae.*, a.name as agent_name FROM agent_executions ae
            JOIN agents a ON ae.agent_id = a.id
            ORDER BY ae.start_time DESC 
            LIMIT ?
        `;
        return await this.all(sql, [limit]);
    }

    async recordAgentMetric(agentId, metricName, metricValue) {
        const sql = `
            INSERT INTO agent_monitoring (agent_id, metric_name, metric_value)
            VALUES (?, ?, ?)
        `;
        return await this.runQuery(sql, [agentId, metricName, metricValue]);
    }

    async getAgentMetrics(agentId, metricName = null, hours = 24) {
        let sql = `SELECT * FROM agent_monitoring WHERE agent_id = ? AND timestamp > datetime('now', '-${hours} hours')`;
        const params = [agentId];
        
        if (metricName) {
            sql += ' AND metric_name = ?';
            params.push(metricName);
        }
        
        sql += ' ORDER BY timestamp DESC';
        return await this.all(sql, params);
    }
    
    // New methods for connection status tracking
    async updateConnectionStatus(connectionId, connectionType, status, userAgent = null, ipAddress = null) {
        const sql = `
            INSERT OR REPLACE INTO connection_status 
            (connection_id, connection_type, status, last_heartbeat, user_agent, ip_address)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
        `;
        return await this.runQuery(sql, [connectionId, connectionType, status, userAgent, ipAddress]);
    }
    
    async getActiveConnections() {
        return await this.all(`
            SELECT * FROM connection_status 
            WHERE status = 'active' 
            AND last_heartbeat > datetime('now', '-30 seconds')
            ORDER BY last_heartbeat DESC
        `);
    }
    
    async getAllConnectionStatus() {
        return await this.all(`
            SELECT * FROM connection_status 
            ORDER BY last_heartbeat DESC
            LIMIT 100
        `);
    }
    
    async updateEditorConnection(editorName, connectionId, status, userId = null, projectPath = null, capabilities = null) {
        const sql = `
            INSERT OR REPLACE INTO editor_connections 
            (editor_name, connection_id, status, last_activity, user_id, project_path, capabilities)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
        `;
        return await this.runQuery(sql, [editorName, connectionId, status, userId, projectPath, capabilities ? JSON.stringify(capabilities) : null]);
    }
    
    async getEditorConnections() {
        return await this.all(`
            SELECT * FROM editor_connections 
            ORDER BY last_activity DESC
            LIMIT 50
        `);
    }
    
    async recordPerformanceMetric(metricName, metricValue, component = null, context = null) {
        const sql = `
            INSERT INTO performance_metrics 
            (metric_name, metric_value, component, context)
            VALUES (?, ?, ?, ?)
        `;
        return await this.runQuery(sql, [metricName, metricValue, component, context]);
    }
    
    async getPerformanceMetrics(metricName = null, hours = 1, limit = 100) {
        let sql = `SELECT * FROM performance_metrics WHERE timestamp > datetime('now', '-${hours} hours')`;
        const params = [];
        
        if (metricName) {
            sql += ' AND metric_name = ?';
            params.push(metricName);
        }
        
        sql += ' ORDER BY timestamp DESC LIMIT ?';
        params.push(limit);
        
        return await this.all(sql, params);
    }
}

module.exports = DatabaseManager;