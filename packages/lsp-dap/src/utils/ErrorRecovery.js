/**
 * Z-Evo Error Recovery System
 * Implements automatic retry and session recovery mechanisms
 */

class ErrorRecovery {
    constructor(options = {}) {
        this.retryAttempts = options.retryAttempts || 3;
        this.retryDelay = options.retryDelay || 1000; // 1 second
        this.maxRetryDelay = options.maxRetryDelay || 30000; // 30 seconds
        this.backoffMultiplier = options.backoffMultiplier || 2;
        this.sessionHistory = new Map();
        this.errorLog = [];
        this.maxErrorLogSize = options.maxErrorLogSize || 100;
    }

    /**
     * Executes a function with automatic retry mechanism
     * @param {Function} fn - Function to execute
     * @param {number} maxRetries - Maximum number of retries
     * @param {number} delay - Initial delay between retries
     */
    async executeWithRetry(fn, maxRetries = this.retryAttempts, delay = this.retryDelay) {
        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const result = await fn();
                if (attempt > 0) {
                    console.log(`[RECOVERY] Successful after ${attempt} attempts`);
                }
                return result;
            } catch (error) {
                lastError = error;
                
                if (attempt === maxRetries) {
                    console.error(`[RECOVERY] Failed after ${maxRetries} attempts:`, error.message);
                    this.logError(error, 'EXECUTION_FAILED');
                    throw error;
                }
                
                console.warn(`[RECOVERY] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
                await this.delay(delay);
                
                // Exponential backoff
                delay = Math.min(delay * this.backoffMultiplier, this.maxRetryDelay);
            }
        }
        
        throw lastError;
    }

    /**
     * Delays execution for specified time
     * @param {number} ms - Milliseconds to delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Recovers a session after failure
     * @param {string} sessionId - Session ID to recover
     * @param {Object} context - Context information for recovery
     */
    async recoverSession(sessionId, context = {}) {
        try {
            console.log(`[RECOVERY] Attempting to recover session: ${sessionId}`);
            
            // Get session history
            const sessionData = this.sessionHistory.get(sessionId);
            if (!sessionData) {
                throw new Error(`Session ${sessionId} not found in history`);
            }

            // Attempt recovery with retry mechanism
            const recoveryResult = await this.executeWithRetry(async () => {
                // Simulate session recovery process
                const recoveredSession = {
                    ...sessionData,
                    id: sessionId,
                    status: 'active',
                    recovered: true,
                    recoveryTime: new Date().toISOString(),
                    recoveryContext: context
                };

                // Update session history
                this.sessionHistory.set(sessionId, recoveredSession);
                
                return recoveredSession;
            });

            console.log(`[RECOVERY] Session recovered successfully: ${sessionId}`);
            return { success: true, session: recoveryResult };
        } catch (error) {
            console.error(`[RECOVERY] Session recovery failed for ${sessionId}:`, error.message);
            this.logError(error, 'SESSION_RECOVERY_FAILED');
            return { success: false, error: error.message };
        }
    }

    /**
     * Initiates a new session with error recovery
     * @param {string} sessionId - Session ID
     * @param {Object} config - Session configuration
     */
    async initiateSession(sessionId, config = {}) {
        try {
            console.log(`[RECOVERY] Initiating session: ${sessionId}`);
            
            const session = {
                id: sessionId,
                config: config,
                status: 'active',
                createdAt: new Date().toISOString(),
                lastActive: new Date().toISOString(),
                retryCount: 0
            };

            this.sessionHistory.set(sessionId, session);
            
            console.log(`[RECOVERY] Session initiated: ${sessionId}`);
            return { success: true, session };
        } catch (error) {
            console.error(`[RECOVERY] Session initiation failed for ${sessionId}:`, error.message);
            this.logError(error, 'SESSION_INIT_FAILED');
            return { success: false, error: error.message };
        }
    }

    /**
     * Terminates a session gracefully
     * @param {string} sessionId - Session ID to terminate
     */
    async terminateSession(sessionId) {
        try {
            const session = this.sessionHistory.get(sessionId);
            if (!session) {
                throw new Error(`Session ${sessionId} not found`);
            }

            const terminatedSession = {
                ...session,
                status: 'terminated',
                terminatedAt: new Date().toISOString()
            };

            this.sessionHistory.set(sessionId, terminatedSession);
            
            console.log(`[RECOVERY] Session terminated: ${sessionId}`);
            return { success: true, session: terminatedSession };
        } catch (error) {
            console.error(`[RECOVERY] Session termination failed for ${sessionId}:`, error.message);
            this.logError(error, 'SESSION_TERMINATION_FAILED');
            return { success: false, error: error.message };
        }
    }

    /**
     * Checks session health
     * @param {string} sessionId - Session ID to check
     */
    async checkSessionHealth(sessionId) {
        try {
            const session = this.sessionHistory.get(sessionId);
            if (!session) {
                return { healthy: false, error: 'Session not found' };
            }

            const now = new Date().getTime();
            const lastActive = new Date(session.lastActive).getTime();
            const maxInactiveTime = 300000; // 5 minutes

            const healthy = session.status === 'active' && (now - lastActive) < maxInactiveTime;
            
            if (!healthy) {
                console.warn(`[RECOVERY] Unhealthy session: ${sessionId}`);
            }

            return {
                healthy,
                session,
                inactiveTime: now - lastActive
            };
        } catch (error) {
            console.error(`[RECOVERY] Health check failed for ${sessionId}:`, error.message);
            return { healthy: false, error: error.message };
        }
    }

    /**
     * Performs health check on all sessions
     */
    async checkAllSessionsHealth() {
        const results = {};
        for (const [sessionId] of this.sessionHistory.entries()) {
            results[sessionId] = await this.checkSessionHealth(sessionId);
        }
        return results;
    }

    /**
     * Logs an error
     * @param {Error} error - Error to log
     * @param {string} type - Type of error
     */
    logError(error, type) {
        const errorEntry = {
            type,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            id: this.generateId()
        };

        this.errorLog.unshift(errorEntry);

        // Keep error log size manageable
        if (this.errorLog.length > this.maxErrorLogSize) {
            this.errorLog = this.errorLog.slice(0, this.maxErrorLogSize);
        }

        console.error(`[ERROR_LOG] ${type}: ${error.message}`);
    }

    /**
     * Gets recent errors
     * @param {number} count - Number of errors to return
     */
    getRecentErrors(count = 10) {
        return this.errorLog.slice(0, count);
    }

    /**
     * Clears error log
     */
    clearErrorLog() {
        this.errorLog = [];
        console.log('[RECOVERY] Error log cleared');
    }

    /**
     * Gets session history
     */
    getSessionHistory() {
        return Array.from(this.sessionHistory.values());
    }

    /**
     * Gets session by ID
     * @param {string} sessionId - Session ID
     */
    getSession(sessionId) {
        return this.sessionHistory.get(sessionId);
    }

    /**
     * Gets recovery statistics
     */
    getStats() {
        return {
            totalSessions: this.sessionHistory.size,
            totalErrors: this.errorLog.length,
            retryAttempts: this.retryAttempts,
            retryDelay: this.retryDelay,
            maxRetryDelay: this.maxRetryDelay,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Generates a unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    /**
     * Resets recovery system
     */
    reset() {
        this.sessionHistory.clear();
        this.errorLog = [];
        this.stats = {
            totalSessions: 0,
            totalErrors: 0
        };
        
        console.log('[RECOVERY] System reset');
    }

    /**
     * Performs cleanup of inactive sessions
     * @param {number} maxInactiveTime - Maximum inactive time in milliseconds
     */
    cleanupInactiveSessions(maxInactiveTime = 300000) { // 5 minutes default
        const now = new Date().getTime();
        let cleaned = 0;

        for (const [sessionId, session] of this.sessionHistory.entries()) {
            const lastActive = new Date(session.lastActive).getTime();
            if ((now - lastActive) > maxInactiveTime && session.status === 'active') {
                const inactiveSession = {
                    ...session,
                    status: 'inactive',
                    inactiveSince: new Date().toISOString()
                };
                
                this.sessionHistory.set(sessionId, inactiveSession);
                cleaned++;
            }
        }

        console.log(`[RECOVERY] Cleaned up ${cleaned} inactive sessions`);
        return cleaned;
    }
}

module.exports = { ErrorRecovery };
