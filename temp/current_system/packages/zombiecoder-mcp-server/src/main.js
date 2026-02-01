// Main ZombieCoder MCP Server
// Integrates all systems: identity, sessions, monitoring, and error handling

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');

// Import system components
const AgentFactory = require('./AgentFactory');
const IdentityAnchoringSystem = require('./IdentityAnchoringSystem');
const SessionPersistenceSystem = require('./SessionPersistenceSystem');
const ContinuousPingSystem = require('./ContinuousPingSystem');
const EnhancedErrorHandlingSystem = require('./EnhancedErrorHandlingSystem');
const DatabaseIntegrationSystem = require('./DatabaseIntegrationSystem');
const ContinuousMonitoringSystem = require('./ContinuousMonitoringSystem');

// Import API routes
const agentRoutes = require('./routes/agents');
const sessionRoutes = require('./routes/sessions');

class ZombieCoderMCPMainServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });
        
        // Initialize system components
        this.initializeSystems();
        
        // Setup middleware and routes
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        
        // Start monitoring
        this.startMonitoring();
        
        // Start cleanup scheduler
        this.startCleanupScheduler();
        
        console.log('🧟‍♂️ ZombieCoder MCP Server initializing...');
    }

    initializeSystems() {
        try {
            this.agentFactory = new AgentFactory();
            this.identityAnchoring = new IdentityAnchoringSystem();
            this.sessionSystem = new SessionPersistenceSystem();
            this.pingSystem = new ContinuousPingSystem();
            this.errorHandler = new EnhancedErrorHandlingSystem();
            this.databaseIntegration = new DatabaseIntegrationSystem();
            this.monitoringSystem = new ContinuousMonitoringSystem();
            
            console.log('✅ All system components initialized');
        } catch (error) {
            console.error('❌ Failed to initialize system components:', error);
            process.exit(1);
        }
    }

    setupMiddleware() {
        // CORS configuration
        this.app.use(cors({
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));
        
        // JSON body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        // Static files
        this.app.use('/docs', express.static(path.join(__dirname, '../../docs')));
        
        // Error handling middleware
        this.app.use((error, req, res, next) => {
            this.errorHandler.processError(error, {
                context: 'Express middleware',
                request: {
                    method: req.method,
                    url: req.url,
                    headers: req.headers
                }
            });
            
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                error_id: error.errorId || 'unknown'
            });
        });
        
        console.log('✅ Middleware configured');
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/api/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                system: 'ZombieCoder MCP Server',
                version: '1.0.0'
            });
        });
        
        // API routes
        this.app.use('/api/agents', agentRoutes);
        this.app.use('/api/sessions', sessionRoutes);
        
        // System monitoring endpoints
        this.app.get('/api/monitoring/status', async (req, res) => {
            try {
                const healthReport = await this.monitoringSystem.getHealthReport();
                res.json({
                    success: true,
                    data: healthReport
                });
            } catch (error) {
                await this.errorHandler.processError(error, {
                    category: 'system',
                    context: 'Monitoring status endpoint'
                });
                res.status(500).json({
                    success: false,
                    error: 'Failed to retrieve monitoring status'
                });
            }
        });
        
        // Integration statistics
        this.app.get('/api/system/stats', async (req, res) => {
            try {
                const stats = await this.databaseIntegration.getIntegrationStatistics();
                res.json({
                    success: true,
                    data: stats
                });
            } catch (error) {
                await this.errorHandler.processError(error, {
                    category: 'system',
                    context: 'System stats endpoint'
                });
                res.status(500).json({
                    success: false,
                    error: 'Failed to retrieve system statistics'
                });
            }
        });
        
        // Serve enhanced client
        this.app.get('/client', (req, res) => {
            res.sendFile('/home/sahon/admin/docs/enhanced_persistent_mcp_client.html');
        });
        
        console.log('✅ API routes configured');
    }

    setupWebSocket() {
        this.wss.on('connection', async (ws, req) => {
            try {
                console.log('🔌 New WebSocket connection established');
                
                // Extract client information
                const clientId = req.headers['client-id'] || `client_${Date.now()}`;
                const sessionId = req.headers['session-id'];
                
                // Handle connection without session ID (create new session)
                if (!sessionId) {
                    await this.handleNewConnection(ws, clientId);
                } else {
                    // Handle existing session
                    await this.handleExistingConnection(ws, clientId, sessionId);
                }
                
                // Handle messages
                ws.on('message', async (data) => {
                    try {
                        await this.handleWebSocketMessage(ws, data, clientId, sessionId);
                    } catch (error) {
                        await this.errorHandler.processError(error, {
                            category: 'network',
                            context: 'WebSocket message handling'
                        });
                        this.sendErrorMessage(ws, error);
                    }
                });
                
                // Handle connection close
                ws.on('close', async (code, reason) => {
                    console.log(`🔌 WebSocket connection closed: ${code} - ${reason}`);
                    await this.handleConnectionClose(clientId, sessionId);
                });
                
                // Handle connection errors
                ws.on('error', async (error) => {
                    console.error('WebSocket error:', error);
                    await this.errorHandler.processError(error, {
                        category: 'network',
                        context: 'WebSocket connection error'
                    });
                });
                
            } catch (error) {
                await this.errorHandler.processError(error, {
                    category: 'network',
                    context: 'WebSocket connection setup'
                });
                ws.close(1011, 'Internal server error');
            }
        });
        
        console.log('✅ WebSocket server configured');
    }

    async handleNewConnection(ws, clientId) {
        try {
            // Create integrated session
            const session = await this.databaseIntegration.createIntegratedSession(clientId, null, {
                connection_type: 'websocket',
                user_agent: 'WebSocket Client'
            });
            
            // Handle WebSocket connection
            await this.databaseIntegration.handleWebSocketConnection(ws, clientId, session.sessionId);
            
            // Send welcome message
            ws.send(JSON.stringify({
                type: 'welcome',
                message: `Welcome to ZombieCoder MCP Server! 🧟‍♂️`,
                session_id: session.sessionId,
                client_id: clientId,
                session_duration: '5 days',
                identity: this.identityAnchoring.getIdentityManifest()
            }));
            
            console.log(`✅ New session created for client: ${clientId}`);
            
        } catch (error) {
            await this.errorHandler.processError(error, {
                category: 'session',
                context: 'New connection handling'
            });
            ws.close(4000, 'Session creation failed');
        }
    }

    async handleExistingConnection(ws, clientId, sessionId) {
        try {
            // Validate existing session
            const session = await this.sessionSystem.getSessionById(sessionId);
            if (!session) {
                ws.close(4001, 'Invalid session');
                return;
            }
            
            // Handle WebSocket connection
            await this.databaseIntegration.handleWebSocketConnection(ws, clientId, sessionId);
            
            // Send session restore message
            ws.send(JSON.stringify({
                type: 'session_restored',
                message: 'Session restored successfully',
                session_id: sessionId,
                client_id: clientId,
                session_expires: session.expires_at
            }));
            
            console.log(`✅ Existing session restored: ${sessionId}`);
            
        } catch (error) {
            await this.errorHandler.processError(error, {
                category: 'session',
                context: 'Existing connection handling'
            });
            ws.close(1011, 'Session validation failed');
        }
    }

    async handleWebSocketMessage(ws, data, clientId, sessionId) {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'ping':
                    this.handlePingMessage(ws, message, sessionId);
                    break;
                    
                case 'message':
                    await this.handleClientMessage(ws, message, clientId, sessionId);
                    break;
                    
                case 'pong':
                    this.pingSystem.handlePong(sessionId, message);
                    break;
                    
                default:
                    this.sendErrorMessage(ws, new Error(`Unknown message type: ${message.type}`));
            }
            
        } catch (error) {
            await this.errorHandler.processError(error, {
                category: 'validation',
                context: 'WebSocket message parsing'
            });
            this.sendErrorMessage(ws, error);
        }
    }

    handlePingMessage(ws, message, sessionId) {
        // Echo pong back to client
        ws.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now(),
            ping_count: message.ping_count || 0,
            session_id: sessionId
        }));
        
        // Update session activity
        if (sessionId) {
            this.sessionSystem.updateSessionActivity(sessionId).catch(error => {
                console.error('Failed to update session activity:', error);
            });
        }
    }

    async handleClientMessage(ws, message, clientId, sessionId) {
        try {
            // Create agent using factory
            const agent = this.agentFactory.createAgent(
                message.agent_name || 'Dynamic Agent',
                message.agent_type || 'developer',
                {
                    description: message.description,
                    custom_traits: message.custom_traits
                }
            );
            
            // Anchor identity
            const identityAnchor = this.identityAnchoring.anchorAgentIdentity(agent);
            
            // Generate system prompt with identity anchoring
            const systemPrompt = this.identityAnchoring.generateAnchoredSystemPrompt(agent);
            
            // Send response
            ws.send(JSON.stringify({
                type: 'agent_response',
                agent_id: agent.id,
                agent_name: agent.name,
                system_prompt: systemPrompt,
                identity_anchor: identityAnchor,
                response: `ভাইয়া! I'm ${agent.name}, your ${agent.primary_language} speaking assistant. I'm ready to help you with ${agent.technical_depth} level technical tasks! 🧟‍♂️`
            }));
            
        } catch (error) {
            await this.errorHandler.processError(error, {
                category: 'agent',
                context: 'Client message handling'
            });
            this.sendErrorMessage(ws, error);
        }
    }

    async handleConnectionClose(clientId, sessionId) {
        try {
            if (sessionId) {
                // End integrated session
                await this.databaseIntegration.endIntegratedSession(sessionId);
                console.log(`✅ Session ended for client: ${clientId}`);
            }
        } catch (error) {
            await this.errorHandler.processError(error, {
                category: 'session',
                context: 'Connection close handling'
            });
        }
    }

    sendErrorMessage(ws, error) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'error',
                message: error.message,
                error_id: error.errorId || 'unknown',
                timestamp: new Date().toISOString()
            }));
        }
    }

    startMonitoring() {
        this.monitoringSystem.startMonitoring();
        console.log('✅ Continuous monitoring started');
    }

    startCleanupScheduler() {
        // Schedule cleanup every hour
        setInterval(async () => {
            try {
                await this.sessionSystem.cleanupExpiredSessions();
                this.monitoringSystem.cleanupMonitoringData();
            } catch (error) {
                console.error('Cleanup failed:', error);
            }
        }, 60 * 60 * 1000);
        
        console.log('✅ Cleanup scheduler started');
    }

    async start(port = 3001) {
        try {
            this.server.listen(port, () => {
                console.log(`🚀 ZombieCoder MCP Server running on port ${port}`);
                console.log(`📊 Monitoring: http://localhost:${port}/api/monitoring/status`);
                console.log(`🧟 Client: http://localhost:${port}/client`);
                console.log(`🩺 Health: http://localhost:${port}/api/health`);
            });
        } catch (error) {
            await this.errorHandler.processError(error, {
                category: 'system',
                context: 'Server startup'
            });
            process.exit(1);
        }
    }

    async shutdown() {
        try {
            console.log('🛑 Shutting down ZombieCoder MCP Server...');
            
            // Stop monitoring
            this.monitoringSystem.stopMonitoring();
            
            // Close WebSocket connections
            this.wss.close();
            
            // Close server
            this.server.close();
            
            // Close system components
            await this.databaseIntegration.close();
            await this.monitoringSystem.close();
            
            console.log('✅ Server shutdown complete');
            process.exit(0);
        } catch (error) {
            console.error('❌ Error during shutdown:', error);
            process.exit(1);
        }
    }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    if (global.server) {
        global.server.shutdown();
    }
});

process.on('SIGINT', () => {
    if (global.server) {
        global.server.shutdown();
    }
});

// Start server if run directly
if (require.main === module) {
    const server = new ZombieCoderMCPMainServer();
    global.server = server;
    server.start().catch(error => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });
}

module.exports = ZombieCoderMCPMainServer;