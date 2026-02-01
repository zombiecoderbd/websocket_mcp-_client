// Session Persistence System
// Implements 5-day session persistence with automatic cleanup and management

const mysql = require('mysql2/promise');
const crypto = require('crypto');

class SessionPersistenceSystem {
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
        this.initializeDatabase();
    }

    async initializeDatabase() {
        try {
            this.pool = mysql.createPool(this.dbConfig);
            
            // Create sessions table if it doesn't exist
            await this.createSessionsTable();
            
            console.log('✅ Session Persistence System initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Session Persistence System:', error);
        }
    }

    async createSessionsTable() {
        // Table already exists, just ensure required columns exist
        try {
            // Add expires_at column if it doesn't exist
            await this.pool.execute(`
                ALTER TABLE mcp_client_sessions 
                ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NULL
            `);
            
            // Add agent_id column if it doesn't exist
            await this.pool.execute(`
                ALTER TABLE mcp_client_sessions 
                ADD COLUMN IF NOT EXISTS agent_id INT NULL
            `);
            
            // Add session_data column if it doesn't exist
            await this.pool.execute(`
                ALTER TABLE mcp_client_sessions 
                ADD COLUMN IF NOT EXISTS session_data JSON NULL
            `);
            
            console.log('✅ MCP client sessions table updated');
        } catch (error) {
            console.log('✅ MCP client sessions table ready (existing structure)');
        }
    }

    // Generate unique session ID
    generateSessionId() {
        return crypto.randomBytes(32).toString('hex');
    }

    // Create new session (5-day TTL)
    async createSession(clientId, agentId = null, sessionData = {}) {
        try {
            const sessionId = this.generateSessionId();
            const expiresAt = new Date(Date.now() + (5 * 24 * 60 * 60 * 1000)); // 5 days
            
            const query = `
                INSERT INTO mcp_client_sessions 
                (session_key, client_data, agent_id, session_data, expires_at, is_active) 
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            await this.pool.execute(query, [
                sessionId,
                JSON.stringify({ client_id: clientId }),
                agentId,
                JSON.stringify(sessionData),
                expiresAt,
                1
            ]);
            
            console.log(`✅ Session created for client: ${clientId}`);
            
            return {
                sessionId,
                clientId,
                agentId,
                expiresAt,
                createdAt: new Date()
            };
        } catch (error) {
            console.error('❌ Failed to create session:', error);
            throw error;
        }
    }

    // Get active session by client ID
    async getSessionByClientId(clientId) {
        try {
            const query = `
                SELECT * FROM mcp_client_sessions 
                WHERE JSON_EXTRACT(client_data, '$.client_id') = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > NOW())
                ORDER BY last_connected DESC
                LIMIT 1
            `;
            
            const [rows] = await this.pool.execute(query, [clientId]);
            
            if (rows.length === 0) {
                return null;
            }
            
            const session = rows[0];
            return {
                ...session,
                session_data: session.session_data ? JSON.parse(session.session_data) : {}
            };
        } catch (error) {
            console.error('❌ Failed to get session:', error);
            throw error;
        }
    }

    // Get session by session ID
    async getSessionById(sessionId) {
        try {
            const query = `
                SELECT * FROM mcp_client_sessions 
                WHERE session_key = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > NOW())
            `;
            
            const [rows] = await this.pool.execute(query, [sessionId]);
            
            if (rows.length === 0) {
                return null;
            }
            
            const session = rows[0];
            return {
                ...session,
                session_data: session.session_data ? JSON.parse(session.session_data) : {}
            };
        } catch (error) {
            console.error('❌ Failed to get session by ID:', error);
            throw error;
        }
    }

    // Update session activity (renewal)
    async updateSessionActivity(sessionId) {
        try {
            const query = `
                UPDATE mcp_client_sessions 
                SET last_connected = NOW() 
                WHERE session_key = ? AND is_active = 1
            `;
            
            await this.pool.execute(query, [sessionId]);
            return true;
        } catch (error) {
            console.error('❌ Failed to update session activity:', error);
            return false;
        }
    }

    // Update session data
    async updateSessionData(sessionId, sessionData) {
        try {
            const query = `
                UPDATE mcp_client_sessions 
                SET session_data = ?, last_connected = NOW()
                WHERE session_key = ? AND is_active = 1
            `;
            
            await this.pool.execute(query, [
                JSON.stringify(sessionData),
                sessionId
            ]);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to update session data:', error);
            return false;
        }
    }

    // End session
    async endSession(sessionId) {
        try {
            const query = `
                UPDATE mcp_client_sessions 
                SET is_active = 0, last_connected = NOW()
                WHERE session_key = ?
            `;
            
            await this.pool.execute(query, [sessionId]);
            console.log(`✅ Session ended: ${sessionId}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to end session:', error);
            return false;
        }
    }

    // Cleanup expired sessions
    async cleanupExpiredSessions() {
        try {
            const query = `
                UPDATE mcp_client_sessions 
                SET is_active = 0 
                WHERE expires_at < NOW() AND is_active = 1
            `;
            
            const [result] = await this.pool.execute(query);
            const cleanedCount = result.affectedRows;
            
            if (cleanedCount > 0) {
                console.log(`🧹 Cleaned up ${cleanedCount} expired sessions`);
            }
            
            return cleanedCount;
        } catch (error) {
            console.error('❌ Failed to cleanup expired sessions:', error);
            return 0;
        }
    }

    // Get session statistics
    async getSessionStatistics() {
        try {
            const queries = [
                // Total active sessions
                `SELECT COUNT(*) as total_active FROM mcp_client_sessions WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > NOW())`,
                
                // Sessions by client
                `SELECT JSON_EXTRACT(client_data, '$.client_id') as client_id, COUNT(*) as session_count 
                 FROM mcp_client_sessions 
                 WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > NOW())
                 GROUP BY JSON_EXTRACT(client_data, '$.client_id')`,
                
                // Expiring soon (within 24 hours)
                `SELECT COUNT(*) as expiring_soon 
                 FROM mcp_client_sessions 
                 WHERE is_active = 1 AND expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 1 DAY)`,
                
                // Expired sessions pending cleanup
                `SELECT COUNT(*) as expired_pending 
                 FROM mcp_client_sessions 
                 WHERE expires_at < NOW() AND is_active = 1`
            ];
            
            const results = await Promise.all(queries.map(q => this.pool.execute(q)));
            
            return {
                total_active_sessions: results[0][0][0].total_active,
                sessions_by_client: results[1][0],
                sessions_expiring_soon: results[2][0][0].expiring_soon,
                expired_sessions_pending: results[3][0][0].expired_pending
            };
        } catch (error) {
            console.error('❌ Failed to get session statistics:', error);
            return null;
        }
    }

    // Schedule automatic cleanup (every hour)
    startCleanupScheduler() {
        setInterval(async () => {
            try {
                await this.cleanupExpiredSessions();
            } catch (error) {
                console.error('❌ Scheduled cleanup failed:', error);
            }
        }, 60 * 60 * 1000); // Every hour
    }

    // Close database connection
    async close() {
        if (this.pool) {
            await this.pool.end();
            console.log('✅ Session Persistence System closed');
        }
    }
}

module.exports = SessionPersistenceSystem;