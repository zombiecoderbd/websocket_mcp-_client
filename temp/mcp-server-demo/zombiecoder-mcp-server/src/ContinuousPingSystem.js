// Continuous Ping Mechanism
// Implements 30-second ping/pong system with automatic session renewal

class ContinuousPingSystem {
    constructor() {
        this.activeConnections = new Map(); // sessionId -> connection info
        this.pingInterval = 30000; // 30 seconds
        this.timeoutThreshold = 60000; // 60 seconds timeout
        this.pingTimers = new Map();
        this.reconnectionAttempts = new Map();
        this.maxReconnectionAttempts = 5;
        this.reconnectionDelay = 5000; // 5 seconds
    }

    // Register a new connection for continuous pinging
    registerConnection(sessionId, clientId, websocket = null, httpCallback = null) {
        const connectionInfo = {
            sessionId,
            clientId,
            websocket,
            httpCallback,
            lastPing: Date.now(),
            lastPong: Date.now(),
            isActive: true,
            pingCount: 0,
            failedPings: 0
        };

        this.activeConnections.set(sessionId, connectionInfo);
        
        // Start ping timer
        this.startPingTimer(sessionId);
        
        console.log(`✅ Registered connection for session: ${sessionId}`);
        return connectionInfo;
    }

    // Start ping timer for a session
    startPingTimer(sessionId) {
        if (this.pingTimers.has(sessionId)) {
            clearInterval(this.pingTimers.get(sessionId));
        }

        const timer = setInterval(() => {
            this.sendPing(sessionId);
        }, this.pingInterval);

        this.pingTimers.set(sessionId, timer);
    }

    // Send ping to client
    async sendPing(sessionId) {
        const connection = this.activeConnections.get(sessionId);
        if (!connection || !connection.isActive) {
            this.cleanupConnection(sessionId);
            return;
        }

        try {
            connection.pingCount++;
            const pingData = {
                type: 'ping',
                timestamp: Date.now(),
                ping_count: connection.pingCount,
                session_id: sessionId
            };

            // Send via WebSocket if available
            if (connection.websocket && connection.websocket.readyState === 1) { // OPEN
                connection.websocket.send(JSON.stringify(pingData));
                console.log(`📡 Ping sent via WebSocket to session: ${sessionId}`);
            }
            // Send via HTTP callback if available
            else if (connection.httpCallback) {
                await connection.httpCallback(pingData);
                console.log(`📡 Ping sent via HTTP to session: ${sessionId}`);
            }
            // Fallback to REST API call
            else {
                await this.sendHttpPing(sessionId, pingData);
                console.log(`📡 Ping sent via REST API to session: ${sessionId}`);
            }

            connection.lastPing = Date.now();
            
            // Check for timeout
            this.checkConnectionTimeout(sessionId);

        } catch (error) {
            console.error(`❌ Failed to send ping to session ${sessionId}:`, error);
            connection.failedPings++;
            
            if (connection.failedPings >= 3) {
                this.handleConnectionFailure(sessionId);
            }
        }
    }

    // Handle pong response from client
    handlePong(sessionId, pongData = {}) {
        const connection = this.activeConnections.get(sessionId);
        if (!connection) return;

        connection.lastPong = Date.now();
        connection.failedPings = 0; // Reset failed ping counter
        
        console.log(`✅ Pong received from session: ${sessionId} (Ping #${connection.pingCount})`);
        
        // Trigger session renewal
        this.renewSession(sessionId, pongData);
    }

    // Renew session based on pong response
    async renewSession(sessionId, pongData = {}) {
        try {
            // Update session activity in database
            const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}/ping`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionData: {
                        last_pong: Date.now(),
                        ...pongData
                    }
                })
            });

            if (response.ok) {
                console.log(`🔄 Session renewed for: ${sessionId}`);
            } else {
                console.error(`❌ Failed to renew session: ${sessionId}`);
            }
        } catch (error) {
            console.error(`❌ Error renewing session ${sessionId}:`, error);
        }
    }

    // Send ping via HTTP REST API
    async sendHttpPing(sessionId, pingData) {
        try {
            const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}/ping`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionData: {
                        last_ping: Date.now(),
                        ping_payload: pingData
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            throw new Error(`Failed to send HTTP ping: ${error.message}`);
        }
    }

    // Check if connection has timed out
    checkConnectionTimeout(sessionId) {
        const connection = this.activeConnections.get(sessionId);
        if (!connection) return;

        const timeSinceLastPong = Date.now() - connection.lastPong;
        
        if (timeSinceLastPong > this.timeoutThreshold) {
            console.warn(`⚠️ Connection timeout for session: ${sessionId}`);
            this.handleConnectionFailure(sessionId);
        }
    }

    // Handle connection failure
    async handleConnectionFailure(sessionId) {
        const connection = this.activeConnections.get(sessionId);
        if (!connection) return;

        connection.failedPings++;
        
        // Attempt reconnection
        if (connection.failedPings <= this.maxReconnectionAttempts) {
            console.log(`🔄 Attempting reconnection for session: ${sessionId} (Attempt ${connection.failedPings})`);
            setTimeout(() => {
                this.attemptReconnection(sessionId);
            }, this.reconnectionDelay * connection.failedPings); // Exponential backoff
        } else {
            console.error(`❌ Maximum reconnection attempts reached for session: ${sessionId}`);
            this.cleanupConnection(sessionId);
        }
    }

    // Attempt to reconnect
    async attemptReconnection(sessionId) {
        const connection = this.activeConnections.get(sessionId);
        if (!connection) return;

        try {
            // Try to validate session is still active
            const response = await fetch(`http://localhost:3001/api/sessions/validate/${sessionId}`);
            
            if (response.ok) {
                const result = await response.json();
                if (result.data && result.data.is_valid) {
                    console.log(`✅ Session still valid, continuing ping for: ${sessionId}`);
                    connection.failedPings = 0; // Reset failure counter
                    return;
                }
            }
            
            // Session no longer valid
            console.log(`🔚 Session expired, cleaning up: ${sessionId}`);
            this.cleanupConnection(sessionId);
            
        } catch (error) {
            console.error(`❌ Reconnection attempt failed for ${sessionId}:`, error);
            this.handleConnectionFailure(sessionId);
        }
    }

    // Cleanup connection resources
    cleanupConnection(sessionId) {
        // Stop ping timer
        if (this.pingTimers.has(sessionId)) {
            clearInterval(this.pingTimers.get(sessionId));
            this.pingTimers.delete(sessionId);
        }

        // Remove from active connections
        this.activeConnections.delete(sessionId);
        
        // Remove reconnection attempts tracking
        this.reconnectionAttempts.delete(sessionId);

        console.log(`🧹 Cleaned up connection for session: ${sessionId}`);
    }

    // Unregister connection (graceful shutdown)
    unregisterConnection(sessionId) {
        const connection = this.activeConnections.get(sessionId);
        if (connection) {
            connection.isActive = false;
        }
        this.cleanupConnection(sessionId);
    }

    // Get connection status
    getConnectionStatus(sessionId) {
        const connection = this.activeConnections.get(sessionId);
        if (!connection) {
            return {
                exists: false,
                status: 'disconnected'
            };
        }

        const timeSinceLastPong = Date.now() - connection.lastPong;
        const isHealthy = timeSinceLastPong < this.timeoutThreshold;
        
        return {
            exists: true,
            status: isHealthy ? 'connected' : 'timeout',
            sessionId: connection.sessionId,
            clientId: connection.clientId,
            lastPing: new Date(connection.lastPing).toISOString(),
            lastPong: new Date(connection.lastPong).toISOString(),
            pingCount: connection.pingCount,
            failedPings: connection.failedPings,
            isHealthy: isHealthy,
            timeSinceLastPong: timeSinceLastPong
        };
    }

    // Get all active connections status
    getAllConnectionsStatus() {
        const statuses = [];
        for (const [sessionId, connection] of this.activeConnections) {
            statuses.push(this.getConnectionStatus(sessionId));
        }
        return statuses;
    }

    // Get system statistics
    getStatistics() {
        const totalConnections = this.activeConnections.size;
        const healthyConnections = Array.from(this.activeConnections.values())
            .filter(conn => (Date.now() - conn.lastPong) < this.timeoutThreshold).length;
        
        const failedConnections = totalConnections - healthyConnections;
        
        return {
            total_connections: totalConnections,
            healthy_connections: healthyConnections,
            failed_connections: failedConnections,
            ping_interval: this.pingInterval,
            timeout_threshold: this.timeoutThreshold,
            active_timers: this.pingTimers.size
        };
    }
}

module.exports = ContinuousPingSystem;