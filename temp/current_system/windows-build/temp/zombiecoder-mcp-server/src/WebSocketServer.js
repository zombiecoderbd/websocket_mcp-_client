const WebSocket = require('ws');
const http = require('http');

class EditorWebSocketServer {
    constructor(databaseManager, logger) {
        this.db = databaseManager;
        this.logger = logger;
        this.wss = null;
        this.httpServer = null;
        this.port = process.env.WEBSOCKET_PORT || 3003;
        this.clients = new Map(); // Track connected clients
        this.editorSessions = new Map(); // Track editor sessions
        this.agentActivityFeed = []; // Buffer for activity feed
        this.maxActivityBufferSize = 1000;
        
        // Performance monitoring
        this.performanceMetrics = {
            totalConnections: 0,
            activeConnections: 0,
            messagesPerSecond: 0,
            lastMessageTime: null
        };
        
        this.messageCounter = 0;
        this.lastCounterReset = Date.now();
    }
    
    async start() {
        try {
            // Check if WebSocket is enabled
            const enabled = await this.db.getAdminSetting('editor_socket_enabled');
            if (enabled !== 'true') {
                this.logger.info('WebSocket server is disabled in settings', {}, 'websocket');
                return;
            }
            
            // Create HTTP server for WebSocket
            this.httpServer = http.createServer((req, res) => {
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('WebSocket server for ZombieCoder MCP');
            });
            
            // Create WebSocket server
            this.wss = new WebSocket.Server({ 
                server: this.httpServer,
                perMessageDeflate: false // Disable compression for better performance
            });
            
            // Setup event handlers
            this.setupEventHandlers();
            
            // Start the server
            this.httpServer.listen(this.port, () => {
                console.log(`🔌 WebSocket server listening on port ${this.port}`);
                this.logger.info(`WebSocket server started on port ${this.port}`, {}, 'websocket');
            });
            
            // Start performance monitoring
            this.startPerformanceMonitoring();
            
            // Start activity feed cleanup
            this.startActivityFeedCleanup();
            
        } catch (error) {
            this.logger.error('Failed to start WebSocket server', { error: error.message }, 'websocket');
            throw error;
        }
    }
    
    setupEventHandlers() {
        this.wss.on('connection', (ws, req) => {
            const clientId = this.generateClientId();
            const clientInfo = {
                id: clientId,
                ws: ws,
                connectedAt: new Date(),
                lastActivity: new Date(),
                ip: req.socket.remoteAddress,
                userAgent: req.headers['user-agent'] || 'Unknown',
                sessionType: 'unknown', // editor, admin, or agent
                sessionId: null
            };
            
            this.clients.set(clientId, clientInfo);
            this.performanceMetrics.totalConnections++;
            this.performanceMetrics.activeConnections++;
            
            this.logger.info('New WebSocket client connected', { 
                clientId, 
                ip: clientInfo.ip,
                userAgent: clientInfo.userAgent 
            }, 'websocket');
            
            // Send welcome message
            this.sendToClient(clientId, {
                type: 'welcome',
                clientId: clientId,
                timestamp: new Date().toISOString(),
                serverInfo: {
                    name: 'ZombieCoder MCP WebSocket Server',
                    version: '1.0.0'
                }
            });
            
            // Handle incoming messages
            ws.on('message', async (message) => {
                try {
                    this.messageCounter++;
                    clientInfo.lastActivity = new Date();
                    
                    const data = JSON.parse(message);
                    await this.handleMessage(clientId, data);
                    
                } catch (error) {
                    this.logger.error('Error processing WebSocket message', { 
                        error: error.message,
                        clientId 
                    }, 'websocket');
                    
                    this.sendToClient(clientId, {
                        type: 'error',
                        message: 'Invalid message format',
                        timestamp: new Date().toISOString()
                    });
                }
            });
            
            // Handle client disconnect
            ws.on('close', () => {
                this.handleClientDisconnect(clientId);
            });
            
            // Handle errors
            ws.on('error', (error) => {
                this.logger.error('WebSocket client error', { 
                    error: error.message, 
                    clientId 
                }, 'websocket');
                this.handleClientDisconnect(clientId);
            });
        });
        
        this.wss.on('error', (error) => {
            this.logger.error('WebSocket server error', { error: error.message }, 'websocket');
        });
    }
    
    async handleMessage(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        switch (data.type) {
            case 'register_editor':
                await this.handleEditorRegistration(clientId, data);
                break;
                
            case 'editor_activity':
                await this.handleEditorActivity(clientId, data);
                break;
                
            case 'agent_runtime_request':
                await this.handleAgentRuntimeRequest(clientId, data);
                break;
                
            case 'agent_testing_request':
                await this.handleAgentTestingRequest(clientId, data);
                break;
                
            case 'get_activity_feed':
                await this.sendActivityFeed(clientId);
                break;
                
            case 'get_performance_metrics':
                await this.sendPerformanceMetrics(clientId);
                break;
                
            case 'ping':
                this.sendToClient(clientId, {
                    type: 'pong',
                    timestamp: new Date().toISOString()
                });
                break;
                
            default:
                this.sendToClient(clientId, {
                    type: 'error',
                    message: `Unknown message type: ${data.type}`,
                    timestamp: new Date().toISOString()
                });
        }
    }
    
    async handleEditorRegistration(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        const { editorName, userId, projectPath, capabilities } = data;
        
        // Create session
        const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const session = {
            sessionId: sessionId,
            editorName: editorName || 'Unknown Editor',
            userId: userId || 'anonymous',
            projectPath: projectPath || 'unknown',
            capabilities: capabilities || [],
            connectedAt: new Date(),
            lastActivity: new Date(),
            clientId: clientId
        };
        
        this.editorSessions.set(sessionId, session);
        client.sessionType = 'editor';
        client.sessionId = sessionId;
        
        // Store in database
        try {
            await this.db.run(`
                INSERT INTO editor_sessions 
                (session_id, editor_name, user_id, project_path, capabilities, connected_at, last_activity)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                sessionId, 
                session.editorName, 
                session.userId, 
                session.projectPath, 
                JSON.stringify(session.capabilities),
                session.connectedAt.toISOString(),
                session.lastActivity.toISOString()
            ]);
        } catch (error) {
            this.logger.error('Failed to store editor session', { error: error.message }, 'websocket');
        }
        
        // Send confirmation
        this.sendToClient(clientId, {
            type: 'editor_registered',
            sessionId: sessionId,
            timestamp: new Date().toISOString()
        });
        
        this.logger.info('Editor registered', { 
            sessionId, 
            editorName: session.editorName,
            userId: session.userId 
        }, 'websocket');
        
        // Broadcast to admin clients
        this.broadcastToAdmins({
            type: 'editor_connected',
            sessionId: sessionId,
            editorName: session.editorName,
            userId: session.userId,
            timestamp: new Date().toISOString()
        });
    }
    
    async handleEditorActivity(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client || !client.sessionId) return;
        
        const session = this.editorSessions.get(client.sessionId);
        if (!session) return;
        
        // Update last activity
        session.lastActivity = new Date();
        client.lastActivity = new Date();
        
        // Store interaction in database
        if (data.interactionType && data.agentId) {
            try {
                await this.db.run(`
                    INSERT INTO editor_agent_interactions 
                    (session_id, agent_id, interaction_type, request_data, response_data, success, error_message, execution_time, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    client.sessionId,
                    data.agentId,
                    data.interactionType,
                    JSON.stringify(data.requestData || {}),
                    JSON.stringify(data.responseData || {}),
                    data.success ? 1 : 0,
                    data.errorMessage || null,
                    data.executionTime || 0,
                    new Date().toISOString()
                ]);
            } catch (error) {
                this.logger.error('Failed to store editor interaction', { error: error.message }, 'websocket');
            }
        }
        
        // Add to activity feed
        const activity = {
            id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sessionId: client.sessionId,
            editorName: session.editorName,
            userId: session.userId,
            interactionType: data.interactionType,
            agentId: data.agentId,
            timestamp: new Date().toISOString(),
            success: data.success
        };
        
        this.addToActivityFeed(activity);
        
        // Broadcast to admin clients
        this.broadcastToAdmins({
            type: 'editor_activity',
            activity: activity
        });
    }
    
    async handleAgentRuntimeRequest(clientId, data) {
        // This would integrate with the agent runtime monitoring system
        // For now, send mock data
        const mockData = {
            type: 'agent_runtime_data',
            agents: [
                {
                    id: 1,
                    name: 'Bengali Coding Assistant',
                    model: 'GPT-4',
                    status: 'active',
                    requestCount: Math.floor(Math.random() * 100),
                    lastActivity: new Date().toISOString(),
                    executionTime: Math.random() * 2000
                }
            ],
            timestamp: new Date().toISOString()
        };
        
        this.sendToClient(clientId, mockData);
    }
    
    async handleAgentTestingRequest(clientId, data) {
        // This would integrate with the agent testing system
        // For now, send mock response
        const mockResponse = {
            type: 'agent_test_response',
            testId: data.testId,
            result: {
                success: true,
                response: 'This is a mock test response',
                executionTime: 150,
                tokensUsed: 45
            },
            timestamp: new Date().toISOString()
        };
        
        this.sendToClient(clientId, mockResponse);
    }
    
    handleClientDisconnect(clientId) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        this.logger.info('WebSocket client disconnected', { 
            clientId, 
            sessionType: client.sessionType,
            sessionId: client.sessionId 
        }, 'websocket');
        
        // Update session status if it's an editor
        if (client.sessionId && client.sessionType === 'editor') {
            const session = this.editorSessions.get(client.sessionId);
            if (session) {
                session.status = 'disconnected';
                session.disconnectedAt = new Date();
                
                // Update database
                this.db.run(`
                    UPDATE editor_sessions 
                    SET status = 'disconnected', disconnected_at = ?, last_activity = ?
                    WHERE session_id = ?
                `, [
                    session.disconnectedAt.toISOString(),
                    session.lastActivity.toISOString(),
                    client.sessionId
                ]).catch(error => {
                    this.logger.error('Failed to update session status', { error: error.message }, 'websocket');
                });
                
                // Broadcast to admins
                this.broadcastToAdmins({
                    type: 'editor_disconnected',
                    sessionId: client.sessionId,
                    editorName: session.editorName,
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        // Clean up
        this.clients.delete(clientId);
        this.performanceMetrics.activeConnections--;
        
        if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.close();
        }
    }
    
    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client || client.ws.readyState !== WebSocket.OPEN) {
            return false;
        }
        
        try {
            client.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            this.logger.error('Failed to send message to client', { 
                error: error.message, 
                clientId 
            }, 'websocket');
            return false;
        }
    }
    
    broadcastToAdmins(message) {
        for (const [clientId, client] of this.clients.entries()) {
            if (client.sessionType === 'admin' && client.ws.readyState === WebSocket.OPEN) {
                this.sendToClient(clientId, message);
            }
        }
    }
    
    addToActivityFeed(activity) {
        this.agentActivityFeed.push(activity);
        
        // Keep buffer size manageable
        if (this.agentActivityFeed.length > this.maxActivityBufferSize) {
            this.agentActivityFeed = this.agentActivityFeed.slice(-this.maxActivityBufferSize);
        }
    }
    
    async sendActivityFeed(clientId) {
        this.sendToClient(clientId, {
            type: 'activity_feed',
            activities: this.agentActivityFeed.slice(-50), // Send last 50 activities
            timestamp: new Date().toISOString()
        });
    }
    
    async sendPerformanceMetrics(clientId) {
        // Calculate messages per second
        const now = Date.now();
        const timeElapsed = (now - this.lastCounterReset) / 1000;
        const mps = timeElapsed > 0 ? this.messageCounter / timeElapsed : 0;
        
        this.sendToClient(clientId, {
            type: 'performance_metrics',
            metrics: {
                ...this.performanceMetrics,
                messagesPerSecond: Math.round(mps * 100) / 100,
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                clients: this.clients.size,
                editorSessions: this.editorSessions.size
            },
            timestamp: new Date().toISOString()
        });
    }
    
    startPerformanceMonitoring() {
        setInterval(() => {
            // Reset message counter every 10 seconds for MPS calculation
            this.messageCounter = 0;
            this.lastCounterReset = Date.now();
            
            // Clean up inactive clients
            const now = new Date();
            for (const [clientId, client] of this.clients.entries()) {
                const inactiveTime = now - client.lastActivity;
                if (inactiveTime > 300000) { // 5 minutes
                    this.logger.info('Disconnecting inactive client', { clientId }, 'websocket');
                    this.handleClientDisconnect(clientId);
                }
            }
            
        }, 10000);
    }
    
    startActivityFeedCleanup() {
        setInterval(() => {
            // Clean up old activity feed entries (older than 1 hour)
            const oneHourAgo = Date.now() - 3600000;
            this.agentActivityFeed = this.agentActivityFeed.filter(
                activity => new Date(activity.timestamp).getTime() > oneHourAgo
            );
        }, 300000); // Every 5 minutes
    }
    
    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    async stop() {
        if (this.wss) {
            this.wss.close(() => {
                this.logger.info('WebSocket server stopped', {}, 'websocket');
            });
        }
        
        if (this.httpServer) {
            this.httpServer.close();
        }
        
        // Close all client connections
        for (const [clientId, client] of this.clients.entries()) {
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.close();
            }
        }
        
        this.clients.clear();
        this.editorSessions.clear();
    }
    
    // Get current status
    getStatus() {
        return {
            port: this.port,
            clients: this.clients.size,
            editorSessions: this.editorSessions.size,
            activeConnections: this.performanceMetrics.activeConnections,
            totalConnections: this.performanceMetrics.totalConnections,
            uptime: process.uptime()
        };
    }
}

module.exports = EditorWebSocketServer;