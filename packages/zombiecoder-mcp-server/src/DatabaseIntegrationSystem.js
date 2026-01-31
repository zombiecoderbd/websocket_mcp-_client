// Database Integration System
// Integrates all systems with database for persistent session management

const mysql = require('mysql2/promise');
const SessionPersistenceSystem = require('./SessionPersistenceSystem');
const ContinuousPingSystem = require('./ContinuousPingSystem');
const EnhancedErrorHandlingSystem = require('./EnhancedErrorHandlingSystem');

class DatabaseIntegrationSystem {
    constructor() {
        this.dbConfig = {
            host: 'localhost',
            user: 'u-root',
            password: 'p-105585',
            database: 'uas_admin',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        };
        
        this.pool = null;
        this.sessionSystem = new SessionPersistenceSystem();
        this.pingSystem = new ContinuousPingSystem();
        this.errorHandler = new EnhancedErrorHandlingSystem();
        
        this.initializeDatabase();
        this.setupIntegration();
    }

    async initializeDatabase() {
        try {
            this.pool = mysql.createPool(this.dbConfig);
            console.log('✅ Database integration system initialized');
        } catch (error) {
            await this.errorHandler.processError(error, {
                category: 'database',
                context: 'Database integration initialization'
            });
        }
    }

    setupIntegration() {
        // Integrate ping system with session system
        this.pingSystem.httpCallback = async (pingData) => {
            await this.handlePingCallback(pingData);
        };
        
        console.log('✅ Database integration systems connected');
    }

    // Handle ping callback and update session
    async handlePingCallback(pingData) {
        try {
            if (pingData.session_id) {
                await this.sessionSystem.updateSessionActivity(pingData.session_id);
                
                // Log ping activity
                await this.logActivity('ping', pingData.session_id, {
                    ping_count: pingData.ping_count,
                    timestamp: pingData.timestamp
                });
            }
        } catch (error) {
            await this.errorHandler.processError(error, {
                category: 'session',
                context: 'Ping callback handling'
            });
        }
    }

    // Create integrated session with all systems
    async createIntegratedSession(clientId, agentId = null, sessionData = {}) {
        try {
            // Create session in database
            const session = await this.sessionSystem.createSession(clientId, agentId, {
                ...sessionData,
                created_via: 'integrated_system'
            });
            
            // Register with ping system
            this.pingSystem.registerConnection(
                session.sessionId,
                clientId,
                null, // No websocket yet
                async (pingData) => {
                    await this.handlePingCallback(pingData);
                }
            );
            
            // Log session creation
            await this.logActivity('session_created', session.sessionId, {
                client_id: clientId,
                agent_id: agentId
            });
            
            console.log(`✅ Integrated session created: ${session.sessionId}`);
            
            return session;
        } catch (error) {
            await this.errorHandler.processError(error, {
                category: 'session',
                context: 'Integrated session creation'
            });
            throw error;
        }
    }

    // Get session with full integration data
    async getIntegratedSession(clientId) {
        try {
            const session = await this.sessionSystem.getSessionByClientId(clientId);
            if (!session) return null;
            
            // Get ping system status
            const pingStatus = this.pingSystem.getConnectionStatus(session.id);
            
            // Get error statistics
            const errorStats = this.errorHandler.getErrorStatistics();
            
            return {
                session_data: session,
                ping_status: pingStatus,
                error_statistics: errorStats,
                integration_health: this.calculateIntegrationHealth(pingStatus, errorStats)
            };
        } catch (error) {
            await this.errorHandler.processError(error, {
                category: 'session',
                context: 'Integrated session retrieval'
            });
            return null;
        }
    }

    // Update session with integration data
    async updateIntegratedSession(sessionId, updateData) {
        try {
            // Update session data
            const updated = await this.sessionSystem.updateSessionData(sessionId, updateData);
            
            if (updated) {
                // Log the update
                await this.logActivity('session_updated', sessionId, updateData);
                
                // Update ping system if connection data changed
                if (updateData.websocket || updateData.connection_status) {
                    // Handle connection updates
                }
            }
            
            return updated;
        } catch (error) {
            await this.errorHandler.processError(error, {
                category: 'session',
                context: 'Integrated session update'
            });
            return false;
        }
    }

    // End session with full cleanup
    async endIntegratedSession(sessionId) {
        try {
            // Unregister from ping system
            this.pingSystem.unregisterConnection(sessionId);
            
            // End database session
            const ended = await this.sessionSystem.endSession(sessionId);
            
            if (ended) {
                // Log session end
                await this.logActivity('session_ended', sessionId, {
                    end_time: new Date().toISOString()
                });
                
                console.log(`✅ Integrated session ended: ${sessionId}`);
            }
            
            return ended;
        } catch (error) {
            await this.errorHandler.processError(error, {
                category: 'session',
                context: 'Integrated session termination'
            });
            return false;
        }
    }

    // Handle WebSocket connection with integration
    async handleWebSocketConnection(websocket, clientId, sessionId) {
        try {
            // Validate session exists
            const session = await this.sessionSystem.getSessionById(sessionId);
            if (!session) {
                websocket.close(4001, 'Invalid session');
                return false;
            }
            
            // Register with ping system
            this.pingSystem.registerConnection(sessionId, clientId, websocket);
            
            // Update session with connection info
            await this.sessionSystem.updateSessionData(sessionId, {
                connection_type: 'websocket',
                connection_status: 'connected',
                connected_at: new Date().toISOString()
            });
            
            // Log connection
            await this.logActivity('websocket_connected', sessionId, {
                client_id: clientId
            });
            
            console.log(`✅ WebSocket connection integrated for session: ${sessionId}`);
            
            return true;
        } catch (error) {
            await this.errorHandler.processError(error, {
                category: 'network',
                context: 'WebSocket connection integration'
            });
            
            if (websocket.readyState === WebSocket.OPEN) {
                websocket.close(1011, 'Internal server error');
            }
            
            return false;
        }
    }

    // Log system activities to database
    async logActivity(activityType, sessionId, data = {}) {
        try {
            const query = `
                INSERT INTO system_activities 
                (activity_type, session_id, activity_data, created_at)
                VALUES (?, ?, ?, NOW())
            `;
            
            await this.pool.execute(query, [
                activityType,
                sessionId,
                JSON.stringify(data)
            ]);
        } catch (error) {
            // Don't throw error for logging failures
            console.error('❌ Failed to log activity:', error);
        }
    }

    // Create system activities table
    async createActivitiesTable() {
        try {
            const createTableQuery = `
                CREATE TABLE IF NOT EXISTS system_activities (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    activity_type VARCHAR(50) NOT NULL,
                    session_id VARCHAR(64),
                    activity_data JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_activity_type (activity_type),
                    INDEX idx_session_id (session_id),
                    INDEX idx_created_at (created_at)
                )
            `;
            
            await this.pool.execute(createTableQuery);
            console.log('✅ System activities table ready');
        } catch (error) {
            await this.errorHandler.processError(error, {
                category: 'database',
                context: 'Activities table creation'
            });
        }
    }

    // Get system integration statistics
    async getIntegrationStatistics() {
        try {
            // Get session statistics
            const sessionStats = await this.sessionSystem.getSessionStatistics();
            
            // Get ping system statistics
            const pingStats = this.pingSystem.getStatistics();
            
            // Get error statistics
            const errorStats = this.errorHandler.getErrorStatistics();
            
            // Get recent activities
            const recentActivities = await this.getRecentActivities(50);
            
            return {
                session_system: sessionStats,
                ping_system: pingStats,
                error_system: errorStats,
                recent_activities: recentActivities,
                overall_health: this.calculateOverallHealth(sessionStats, pingStats, errorStats)
            };
        } catch (error) {
            await this.errorHandler.processError(error, {
                category: 'system',
                context: 'Integration statistics retrieval'
            });
            return null;
        }
    }

    // Get recent system activities
    async getRecentActivities(limit = 50) {
        try {
            const query = `
                SELECT * FROM system_activities 
                ORDER BY created_at DESC 
                LIMIT ?
            `;
            
            const [rows] = await this.pool.execute(query, [limit]);
            
            return rows.map(row => ({
                ...row,
                activity_data: JSON.parse(row.activity_data)
            }));
        } catch (error) {
            await this.errorHandler.processError(error, {
                category: 'database',
                context: 'Recent activities retrieval'
            });
            return [];
        }
    }

    // Calculate integration health score
    calculateIntegrationHealth(pingStatus, errorStats) {
        let healthScore = 100;
        
        // Deduct points for ping issues
        if (!pingStatus.isHealthy) healthScore -= 30;
        if (pingStatus.failedPings > 0) healthScore -= (pingStatus.failedPings * 5);
        
        // Deduct points for errors
        const totalErrors = errorStats.totalErrors || 0;
        if (totalErrors > 0) healthScore -= Math.min(totalErrors * 2, 40);
        
        // Ensure health score is between 0 and 100
        return Math.max(0, Math.min(100, healthScore));
    }

    // Calculate overall system health
    calculateOverallHealth(sessionStats, pingStats, errorStats) {
        const sessionHealth = sessionStats.total_active_sessions > 0 ? 100 : 0;
        const pingHealth = (pingStats.healthy_connections / Math.max(1, pingStats.total_connections)) * 100;
        const errorHealth = errorStats.systemHealth === 'healthy' ? 100 : 
                           errorStats.systemHealth === 'warning' ? 70 : 
                           errorStats.systemHealth === 'degraded' ? 40 : 0;
        
        return {
            session_health: Math.round(sessionHealth),
            connection_health: Math.round(pingHealth),
            error_health: Math.round(errorHealth),
            overall_health: Math.round((sessionHealth + pingHealth + errorHealth) / 3)
        };
    }

    // Perform system cleanup
    async performSystemCleanup() {
        try {
            // Cleanup expired sessions
            const expiredCount = await this.sessionSystem.cleanupExpiredSessions();
            
            // Cleanup old activities (older than 30 days)
            const cleanupQuery = `
                DELETE FROM system_activities 
                WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
            `;
            const [result] = await this.pool.execute(cleanupQuery);
            
            // Get system statistics after cleanup
            const stats = await this.getIntegrationStatistics();
            
            console.log(`🧹 System cleanup completed: ${expiredCount} expired sessions, ${result.affectedRows} old activities removed`);
            
            return {
                expired_sessions_removed: expiredCount,
                old_activities_removed: result.affectedRows,
                system_statistics: stats
            };
        } catch (error) {
            await this.errorHandler.processError(error, {
                category: 'system',
                context: 'System cleanup'
            });
            return null;
        }
    }

    // Close all connections
    async close() {
        try {
            if (this.pool) {
                await this.pool.end();
            }
            
            await this.sessionSystem.close();
            
            console.log('✅ Database integration system closed');
        } catch (error) {
            console.error('❌ Error closing database integration system:', error);
        }
    }
}

module.exports = DatabaseIntegrationSystem;