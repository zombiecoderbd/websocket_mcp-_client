// Agent Session Management Service
// Handles session persistence with database and localStorage fallback

class AgentSessionManager {
  constructor(config = {}) {
    this.config = {
      enableLocalStorage: config.enableLocalStorage !== false,
      sessionExpiryMinutes: config.sessionExpiryMinutes || 60,
      databaseAvailable: config.databaseAvailable !== false,
      localStoragePrefix: config.localStoragePrefix || 'agent_session_'
    };
    
    this.dbConnection = null;
    this.activeSessions = new Map();
  }

  /**
   * Initialize the session manager with database connection
   */
  async initialize(dbConnection) {
    this.dbConnection = dbConnection;
    
    // Load existing sessions from localStorage
    this.loadFromLocalStorage();
    
    console.log('✅ Agent Session Manager initialized');
  }

  /**
   * Create a new agent session
   */
  async createSession(agentId, sessionData = {}) {
    const sessionId = this.generateSessionId();
    
    const session = {
      sessionId,
      agentId,
      sessionData,
      metadata: {
        ...sessionData.metadata,
        createdAt: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
        platform: typeof navigator !== 'undefined' ? navigator.platform : 'server'
      },
      startTime: new Date().toISOString(),
      isActive: true,
      lastActivity: new Date().toISOString()
    };

    // Store in memory
    this.activeSessions.set(sessionId, session);

    // Store in database if available
    if (this.dbConnection) {
      try {
        await this.dbConnection.executeQuery(
          `INSERT INTO agent_sessions (agent_id, session_id, session_data, metadata, start_time, is_active, last_activity) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            agentId,
            sessionId,
            JSON.stringify(session.sessionData),
            JSON.stringify(session.metadata),
            session.startTime,
            session.isActive,
            session.lastActivity
          ]
        );
        console.log(`✅ Session ${sessionId} created in database for agent ${agentId}`);
      } catch (error) {
        console.error(`❌ Failed to create session in database: ${error.message}`);
        // Continue with localStorage only
      }
    }

    // Store in localStorage as fallback
    if (this.config.enableLocalStorage) {
      this.saveToLocalStorage(sessionId, session);
    }

    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId) {
    // Check memory first
    if (this.activeSessions.has(sessionId)) {
      return this.activeSessions.get(sessionId);
    }

    // Check localStorage
    if (this.config.enableLocalStorage) {
      const localStorageSession = this.loadFromLocalStorage(sessionId);
      if (localStorageSession) {
        this.activeSessions.set(sessionId, localStorageSession);
        return localStorageSession;
      }
    }

    // Check database
    if (this.dbConnection) {
      try {
        const results = await this.dbConnection.executeQuery(
          'SELECT * FROM agent_sessions WHERE session_id = ? AND is_active = TRUE',
          [sessionId]
        );

        if (results && results.length > 0) {
          const dbSession = results[0];
          const session = {
            sessionId: dbSession.session_id,
            agentId: dbSession.agent_id,
            sessionData: dbSession.session_data ? JSON.parse(dbSession.session_data) : {},
            metadata: dbSession.metadata ? JSON.parse(dbSession.metadata) : {},
            startTime: dbSession.start_time,
            isActive: dbSession.is_active === 1,
            lastActivity: dbSession.last_activity
          };

          this.activeSessions.set(sessionId, session);
          return session;
        }
      } catch (error) {
        console.error(`❌ Failed to fetch session from database: ${error.message}`);
      }
    }

    return null;
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId) {
    const currentTime = new Date().toISOString();
    
    // Update in memory
    if (this.activeSessions.has(sessionId)) {
      const session = this.activeSessions.get(sessionId);
      session.lastActivity = currentTime;
      session.isActive = true;
    }

    // Update in database
    if (this.dbConnection) {
      try {
        await this.dbConnection.executeQuery(
          'UPDATE agent_sessions SET last_activity = ?, is_active = TRUE WHERE session_id = ?',
          [currentTime, sessionId]
        );
      } catch (error) {
        console.error(`❌ Failed to update session activity in database: ${error.message}`);
      }
    }

    // Update in localStorage
    if (this.config.enableLocalStorage) {
      this.updateLocalStorageActivity(sessionId, currentTime);
    }
  }

  /**
   * End session
   */
  async endSession(sessionId) {
    const endTime = new Date().toISOString();
    
    // Update in memory
    if (this.activeSessions.has(sessionId)) {
      const session = this.activeSessions.get(sessionId);
      session.isActive = false;
      session.endTime = endTime;
    }

    // Update in database
    if (this.dbConnection) {
      try {
        await this.dbConnection.executeQuery(
          'UPDATE agent_sessions SET is_active = FALSE, end_time = ? WHERE session_id = ?',
          [endTime, sessionId]
        );
        console.log(`✅ Session ${sessionId} ended in database`);
      } catch (error) {
        console.error(`❌ Failed to end session in database: ${error.message}`);
      }
    }

    // Remove from localStorage
    if (this.config.enableLocalStorage) {
      this.removeFromLocalStorage(sessionId);
    }

    // Remove from memory
    this.activeSessions.delete(sessionId);
  }

  /**
   * Get all active sessions for an agent
   */
  async getAgentSessions(agentId) {
    const sessions = [];

    // Check database
    if (this.dbConnection) {
      try {
        const results = await this.dbConnection.executeQuery(
          `SELECT * FROM agent_sessions 
           WHERE agent_id = ? AND is_active = TRUE 
           ORDER BY last_activity DESC`,
          [agentId]
        );

        results.forEach(row => {
          sessions.push({
            sessionId: row.session_id,
            agentId: row.agent_id,
            sessionData: row.session_data ? JSON.parse(row.session_data) : {},
            metadata: row.metadata ? JSON.parse(row.metadata) : {},
            startTime: row.start_time,
            isActive: row.is_active === 1,
            lastActivity: row.last_activity
          });
        });
      } catch (error) {
        console.error(`❌ Failed to fetch agent sessions from database: ${error.message}`);
      }
    }

    // Check localStorage for additional sessions
    if (this.config.enableLocalStorage) {
      const localStorageSessions = this.getAllLocalStorageSessions(agentId);
      localStorageSessions.forEach(session => {
        // Only add if not already in the list
        if (!sessions.some(s => s.sessionId === session.sessionId)) {
          sessions.push(session);
        }
      });
    }

    return sessions;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions() {
    const expiryTime = new Date(Date.now() - (this.config.sessionExpiryMinutes * 60 * 1000));
    
    // Clean database sessions
    if (this.dbConnection) {
      try {
        await this.dbConnection.executeQuery(
          `UPDATE agent_sessions 
           SET is_active = FALSE, end_time = ? 
           WHERE last_activity < ? AND is_active = TRUE`,
          [new Date().toISOString(), expiryTime.toISOString()]
        );
        console.log('✅ Expired database sessions cleaned up');
      } catch (error) {
        console.error(`❌ Failed to clean up expired database sessions: ${error.message}`);
      }
    }

    // Clean localStorage sessions
    if (this.config.enableLocalStorage) {
      this.cleanupLocalStorageSessions(expiryTime);
    }
  }

  // Private helper methods for localStorage

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  saveToLocalStorage(sessionId, session) {
    if (typeof localStorage !== 'undefined') {
      try {
        const key = `${this.config.localStoragePrefix}${sessionId}`;
        localStorage.setItem(key, JSON.stringify(session));
      } catch (error) {
        console.error(`❌ Failed to save session to localStorage: ${error.message}`);
      }
    }
  }

  loadFromLocalStorage(sessionId = null) {
    if (typeof localStorage !== 'undefined') {
      try {
        if (sessionId) {
          const key = `${this.config.localStoragePrefix}${sessionId}`;
          const sessionData = localStorage.getItem(key);
          return sessionData ? JSON.parse(sessionData) : null;
        } else {
          // Load all sessions
          const sessions = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.config.localStoragePrefix)) {
              try {
                const sessionData = JSON.parse(localStorage.getItem(key));
                sessions.push(sessionData);
              } catch (error) {
                console.error(`❌ Failed to parse localStorage session: ${error.message}`);
              }
            }
          }
          return sessions;
        }
      } catch (error) {
        console.error(`❌ Failed to load from localStorage: ${error.message}`);
        return sessionId ? null : [];
      }
    }
    return sessionId ? null : [];
  }

  updateLocalStorageActivity(sessionId, timestamp) {
    if (typeof localStorage !== 'undefined') {
      try {
        const key = `${this.config.localStoragePrefix}${sessionId}`;
        const sessionData = localStorage.getItem(key);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          session.lastActivity = timestamp;
          session.isActive = true;
          localStorage.setItem(key, JSON.stringify(session));
        }
      } catch (error) {
        console.error(`❌ Failed to update localStorage session: ${error.message}`);
      }
    }
  }

  removeFromLocalStorage(sessionId) {
    if (typeof localStorage !== 'undefined') {
      try {
        const key = `${this.config.localStoragePrefix}${sessionId}`;
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`❌ Failed to remove from localStorage: ${error.message}`);
      }
    }
  }

  getAllLocalStorageSessions(agentId = null) {
    if (typeof localStorage !== 'undefined') {
      try {
        const sessions = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.config.localStoragePrefix)) {
            try {
              const sessionData = JSON.parse(localStorage.getItem(key));
              if (!agentId || sessionData.agentId === agentId) {
                sessions.push(sessionData);
              }
            } catch (error) {
              console.error(`❌ Failed to parse localStorage session: ${error.message}`);
            }
          }
        }
        return sessions;
      } catch (error) {
        console.error(`❌ Failed to get localStorage sessions: ${error.message}`);
        return [];
      }
    }
    return [];
  }

  cleanupLocalStorageSessions(expiryTime) {
    if (typeof localStorage !== 'undefined') {
      try {
        const expiredKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.config.localStoragePrefix)) {
            try {
              const sessionData = JSON.parse(localStorage.getItem(key));
              const lastActivity = new Date(sessionData.lastActivity);
              if (lastActivity < expiryTime) {
                expiredKeys.push(key);
              }
            } catch (error) {
              // If we can't parse it, remove it
              expiredKeys.push(key);
            }
          }
        }
        
        expiredKeys.forEach(key => {
          localStorage.removeItem(key);
        });
        
        console.log(`✅ Cleaned up ${expiredKeys.length} expired localStorage sessions`);
      } catch (error) {
        console.error(`❌ Failed to clean up localStorage sessions: ${error.message}`);
      }
    }
  }
}

module.exports = { AgentSessionManager };