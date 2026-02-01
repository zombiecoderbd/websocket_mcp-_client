class EditorConnectionManager {
    constructor(databaseManager, logger) {
        this.db = databaseManager;
        this.logger = logger;
        this.activeSessions = new Map(); // session_id -> session_data
        this.editorCapabilities = new Map(); // editor_name -> capabilities
        this.connectionLimits = {
            maxSessions: 100,
            maxSessionsPerEditor: 10,
            sessionTimeout: 300000 // 5 minutes
        };
    }
    
    async initialize() {
        try {
            // Load connection limits from settings
            const maxSessions = await this.db.getAdminSetting('max_editor_connections');
            if (maxSessions) {
                this.connectionLimits.maxSessions = parseInt(maxSessions);
            }
            
            // Load existing sessions from database
            await this.loadActiveSessions();
            
            this.logger.info('Editor Connection Manager initialized', {
                activeSessions: this.activeSessions.size,
                maxSessions: this.connectionLimits.maxSessions
            }, 'editor-connection');
            
        } catch (error) {
            this.logger.error('Failed to initialize Editor Connection Manager', { 
                error: error.message 
            }, 'editor-connection');
            throw error;
        }
    }
    
    async loadActiveSessions() {
        try {
            const sessions = await this.db.all(`
                SELECT * FROM editor_sessions 
                WHERE status = 'active' 
                AND (disconnected_at IS NULL OR disconnected_at > datetime('now', '-5 minutes'))
            `);
            
            for (const session of sessions) {
                this.activeSessions.set(session.session_id, {
                    ...session,
                    capabilities: JSON.parse(session.capabilities || '[]'),
                    connectedAt: new Date(session.connected_at),
                    lastActivity: new Date(session.last_activity),
                    disconnectedAt: session.disconnected_at ? new Date(session.disconnected_at) : null
                });
            }
            
            this.logger.info(`Loaded ${sessions.length} active editor sessions`, {}, 'editor-connection');
            
        } catch (error) {
            this.logger.error('Failed to load active sessions', { error: error.message }, 'editor-connection');
        }
    }
    
    async createSession(editorName, userId, projectPath, capabilities = [], clientId = null) {
        // Check connection limits
        if (this.activeSessions.size >= this.connectionLimits.maxSessions) {
            throw new Error('Maximum number of editor sessions reached');
        }
        
        // Check editor-specific limits
        const editorSessionCount = this.countSessionsForEditor(editorName);
        if (editorSessionCount >= this.connectionLimits.maxSessionsPerEditor) {
            throw new Error(`Maximum sessions for editor ${editorName} reached`);
        }
        
        // Generate unique session ID
        const sessionId = this.generateSessionId();
        
        const session = {
            sessionId: sessionId,
            editorName: editorName,
            userId: userId || 'anonymous',
            projectPath: projectPath || 'unknown',
            capabilities: Array.isArray(capabilities) ? capabilities : [],
            connectedAt: new Date(),
            lastActivity: new Date(),
            disconnectedAt: null,
            status: 'active',
            clientId: clientId
        };
        
        // Store in memory
        this.activeSessions.set(sessionId, session);
        
        // Store in database
        try {
            await this.db.run(`
                INSERT INTO editor_sessions 
                (session_id, editor_name, user_id, project_path, capabilities, connected_at, last_activity, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                sessionId,
                editorName,
                session.userId,
                projectPath,
                JSON.stringify(session.capabilities),
                session.connectedAt.toISOString(),
                session.lastActivity.toISOString(),
                session.status
            ]);
            
            this.logger.info('Editor session created', {
                sessionId,
                editorName,
                userId: session.userId,
                projectPath
            }, 'editor-connection');
            
        } catch (error) {
            this.logger.error('Failed to create editor session', { 
                error: error.message,
                sessionId 
            }, 'editor-connection');
            // Remove from memory if database insert failed
            this.activeSessions.delete(sessionId);
            throw error;
        }
        
        return session;
    }
    
    async updateSessionActivity(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) return false;
        
        session.lastActivity = new Date();
        
        try {
            await this.db.run(`
                UPDATE editor_sessions 
                SET last_activity = ? 
                WHERE session_id = ?
            `, [
                session.lastActivity.toISOString(),
                sessionId
            ]);
            
            return true;
        } catch (error) {
            this.logger.error('Failed to update session activity', { 
                error: error.message, 
                sessionId 
            }, 'editor-connection');
            return false;
        }
    }
    
    async disconnectSession(sessionId, reason = 'normal') {
        const session = this.activeSessions.get(sessionId);
        if (!session) return false;
        
        session.status = 'disconnected';
        session.disconnectedAt = new Date();
        
        try {
            await this.db.run(`
                UPDATE editor_sessions 
                SET status = 'disconnected', disconnected_at = ?, last_activity = ?
                WHERE session_id = ?
            `, [
                session.disconnectedAt.toISOString(),
                session.lastActivity.toISOString(),
                sessionId
            ]);
            
            // Remove from active sessions
            this.activeSessions.delete(sessionId);
            
            this.logger.info('Editor session disconnected', {
                sessionId,
                editorName: session.editorName,
                reason
            }, 'editor-connection');
            
            return true;
            
        } catch (error) {
            this.logger.error('Failed to disconnect session', { 
                error: error.message, 
                sessionId 
            }, 'editor-connection');
            return false;
        }
    }
    
    async getSession(sessionId) {
        return this.activeSessions.get(sessionId) || null;
    }
    
    async getSessionsByEditor(editorName) {
        const sessions = [];
        for (const [id, session] of this.activeSessions.entries()) {
            if (session.editorName === editorName) {
                sessions.push(session);
            }
        }
        return sessions;
    }
    
    async getActiveSessions() {
        const sessions = [];
        for (const [id, session] of this.activeSessions.entries()) {
            if (session.status === 'active') {
                sessions.push(session);
            }
        }
        return sessions;
    }
    
    async cleanupInactiveSessions() {
        const now = new Date();
        const inactiveSessions = [];
        
        for (const [sessionId, session] of this.activeSessions.entries()) {
            const inactiveTime = now - session.lastActivity;
            if (inactiveTime > this.connectionLimits.sessionTimeout) {
                inactiveSessions.push(sessionId);
            }
        }
        
        let cleanupCount = 0;
        for (const sessionId of inactiveSessions) {
            if (await this.disconnectSession(sessionId, 'timeout')) {
                cleanupCount++;
            }
        }
        
        if (cleanupCount > 0) {
            this.logger.info(`Cleaned up ${cleanupCount} inactive editor sessions`, {}, 'editor-connection');
        }
        
        return cleanupCount;
    }
    
    async getEditorCapabilities(editorName) {
        if (this.editorCapabilities.has(editorName)) {
            return this.editorCapabilities.get(editorName);
        }
        
        // Load from database
        try {
            const sessions = await this.db.all(`
                SELECT DISTINCT capabilities FROM editor_sessions 
                WHERE editor_name = ? AND capabilities IS NOT NULL
                ORDER BY connected_at DESC LIMIT 10
            `, [editorName]);
            
            const capabilities = new Set();
            for (const session of sessions) {
                const caps = JSON.parse(session.capabilities || '[]');
                caps.forEach(cap => capabilities.add(cap));
            }
            
            const uniqueCapabilities = Array.from(capabilities);
            this.editorCapabilities.set(editorName, uniqueCapabilities);
            
            return uniqueCapabilities;
            
        } catch (error) {
            this.logger.error('Failed to get editor capabilities', { 
                error: error.message, 
                editorName 
            }, 'editor-connection');
            return [];
        }
    }
    
    async addEditorCapabilities(editorName, newCapabilities) {
        const existing = await this.getEditorCapabilities(editorName);
        const updated = [...new Set([...existing, ...newCapabilities])];
        this.editorCapabilities.set(editorName, updated);
        return updated;
    }
    
    countSessionsForEditor(editorName) {
        let count = 0;
        for (const session of this.activeSessions.values()) {
            if (session.editorName === editorName && session.status === 'active') {
                count++;
            }
        }
        return count;
    }
    
    generateSessionId() {
        return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    getStatus() {
        const editorStats = {};
        let totalActive = 0;
        
        for (const session of this.activeSessions.values()) {
            if (session.status === 'active') {
                totalActive++;
                if (!editorStats[session.editorName]) {
                    editorStats[session.editorName] = 0;
                }
                editorStats[session.editorName]++;
            }
        }
        
        return {
            totalSessions: this.activeSessions.size,
            activeSessions: totalActive,
            editorDistribution: editorStats,
            connectionLimits: this.connectionLimits
        };
    }
    
    async getRecentActivity(limit = 50) {
        try {
            const interactions = await this.db.all(`
                SELECT eai.*, es.editor_name, es.user_id
                FROM editor_agent_interactions eai
                JOIN editor_sessions es ON eai.session_id = es.session_id
                ORDER BY eai.timestamp DESC
                LIMIT ?
            `, [limit]);
            
            return interactions.map(interaction => ({
                ...interaction,
                requestData: JSON.parse(interaction.request_data || '{}'),
                responseData: JSON.parse(interaction.response_data || '{}')
            }));
            
        } catch (error) {
            this.logger.error('Failed to get recent activity', { error: error.message }, 'editor-connection');
            return [];
        }
    }
}

module.exports = EditorConnectionManager;