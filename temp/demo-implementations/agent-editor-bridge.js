#!/usr/bin/env node

/**
 * Agent-Editor Bridge - Direct Communication WebSocket Server
 * Implements high-performance, direct communication between AI agents and editors
 * 
 * Features:
 * - MCP-compliant messaging protocol
 * - Real-time bidirectional communication
 * - Connection management and heartbeats
 * - Message batching and optimization
 * - Error handling and recovery
 * - Performance monitoring
 */

const WebSocket = require('ws');
const http = require('http');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class AgentEditorBridge {
    constructor(config = {}) {
        this.config = {
            port: config.port || 8081,
            host: config.host || 'localhost',
            maxConnections: config.maxConnections || 100,
            heartbeatInterval: config.heartbeatInterval || 30000,
            messageTimeout: config.messageTimeout || 5000,
            batchSize: config.batchSize || 10,
            enableCompression: config.enableCompression || true,
            logLevel: config.logLevel || 'info'
        };
        
        // Server state
        this.server = null;
        this.wss = null;
        this.connections = new Map(); // Map of connection IDs to connection objects
        this.agents = new Map(); // Registered agents
        this.editors = new Map(); // Registered editors
        this.messageQueue = []; // Pending messages
        this.batchTimer = null;
        this.stats = {
            totalConnections: 0,
            activeConnections: 0,
            messagesProcessed: 0,
            errors: 0,
            startTime: Date.now()
        };
        
        // Performance monitoring
        this.performanceMetrics = {
            avgResponseTime: 0,
            messageThroughput: 0,
            connectionLatency: []
        };
    }
    
    /**
     * Generate unique identifier
     */
    generateId() {
        return crypto.randomUUID();
    }
    
    /**
     * Start the WebSocket server
     */
    async start() {
        try {
            // Create HTTP server
            const server = http.createServer((req, res) => {
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('Agent-Editor Bridge Server Running\n');
            });
            
            // Create WebSocket server
            this.wss = new WebSocket.Server({ 
                server,
                perMessageDeflate: this.config.enableCompression
            });
            
            // Setup event handlers
            this.setupEventHandlers();
            
            // Start server
            server.listen(this.config.port, this.config.host, () => {
                this.log('info', `Agent-Editor Bridge started on ${this.config.host}:${this.config.port}`);
                this.log('info', `Max connections: ${this.config.maxConnections}`);
                this.log('info', `Heartbeat interval: ${this.config.heartbeatInterval}ms`);
            });
            
            this.server = server;
            
            // Start periodic tasks
            this.startPeriodicTasks();
            
            return true;
            
        } catch (error) {
            this.log('error', `Failed to start server: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Setup WebSocket event handlers
     */
    setupEventHandlers() {
        this.wss.on('connection', (ws, req) => {
            this.handleNewConnection(ws, req);
        });
        
        this.wss.on('error', (error) => {
            this.log('error', `WebSocket server error: ${error.message}`);
            this.stats.errors++;
        });
        
        this.wss.on('listening', () => {
            this.log('info', 'WebSocket server listening for connections');
        });
    }
    
    /**
     * Handle new WebSocket connection
     */
    handleNewConnection(ws, req) {
        const connectionId = this.generateId();
        const clientIp = req.socket.remoteAddress;
        
        // Create connection object
        const connection = {
            id: connectionId,
            socket: ws,
            ip: clientIp,
            connectedAt: Date.now(),
            lastActivity: Date.now(),
            type: null, // 'agent' or 'editor'
            metadata: {},
            heartbeatTimer: null,
            messageBuffer: []
        };
        
        // Store connection
        this.connections.set(connectionId, connection);
        this.stats.totalConnections++;
        this.stats.activeConnections++;
        
        this.log('info', `New connection established: ${connectionId} from ${clientIp}`);
        
        // Setup socket event handlers
        ws.on('message', (data) => {
            this.handleMessage(connection, data);
        });
        
        ws.on('close', (code, reason) => {
            this.handleDisconnection(connection, code, reason);
        });
        
        ws.on('error', (error) => {
            this.log('error', `Connection error for ${connectionId}: ${error.message}`);
            this.stats.errors++;
        });
        
        // Send welcome message
        this.sendMessage(connection, {
            type: 'welcome',
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            data: {
                connectionId: connectionId,
                serverInfo: {
                    version: '1.0.0',
                    maxConnections: this.config.maxConnections,
                    supportedProtocols: ['mcp-v1', 'websocket-json']
                }
            }
        });
        
        // Start heartbeat
        this.startHeartbeat(connection);
    }
    
    /**
     * Handle incoming messages
     */
    handleMessage(connection, rawData) {
        try {
            const message = JSON.parse(rawData.toString());
            connection.lastActivity = Date.now();
            
            this.log('debug', `Received message from ${connection.id}: ${message.type}`);
            
            // Validate message format
            if (!this.validateMessage(message)) {
                this.sendError(connection, 'invalid_message_format', 'Message format validation failed');
                return;
            }
            
            // Route message based on type
            switch (message.type) {
                case 'register':
                    this.handleRegistration(connection, message);
                    break;
                case 'editor_event':
                    this.handleEditorEvent(connection, message);
                    break;
                case 'agent_response':
                    this.handleAgentResponse(connection, message);
                    break;
                case 'heartbeat':
                    this.handleHeartbeat(connection, message);
                    break;
                case 'batch_request':
                    this.handleBatchRequest(connection, message);
                    break;
                default:
                    this.handleGenericMessage(connection, message);
            }
            
            this.stats.messagesProcessed++;
            
        } catch (error) {
            this.log('error', `Message handling error: ${error.message}`);
            this.sendError(connection, 'message_processing_error', error.message);
            this.stats.errors++;
        }
    }
    
    /**
     * Validate message format
     */
    validateMessage(message) {
        // Required fields
        if (!message.type || !message.id || !message.timestamp) {
            return false;
        }
        
        // Valid timestamp
        const timestamp = new Date(message.timestamp);
        if (isNaN(timestamp.getTime())) {
            return false;
        }
        
        // Message age check (prevent replay attacks)
        if (Date.now() - timestamp.getTime() > 300000) { // 5 minutes
            return false;
        }
        
        return true;
    }
    
    /**
     * Handle client registration
     */
    handleRegistration(connection, message) {
        const { clientType, metadata } = message.data;
        
        if (!clientType || !['agent', 'editor'].includes(clientType)) {
            this.sendError(connection, 'invalid_client_type', 'Client type must be "agent" or "editor"');
            return;
        }
        
        connection.type = clientType;
        connection.metadata = metadata || {};
        
        // Store in appropriate registry
        if (clientType === 'agent') {
            this.agents.set(connection.id, connection);
            this.log('info', `Agent registered: ${connection.id}`);
        } else {
            this.editors.set(connection.id, connection);
            this.log('info', `Editor registered: ${connection.id}`);
        }
        
        // Send registration confirmation
        this.sendMessage(connection, {
            type: 'registration_confirmed',
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            data: {
                connectionId: connection.id,
                assignedRole: clientType,
                capabilities: this.getCapabilities(clientType)
            }
        });
    }
    
    /**
     * Handle editor events
     */
    handleEditorEvent(connection, message) {
        if (connection.type !== 'editor') {
            this.sendError(connection, 'unauthorized', 'Only editors can send editor events');
            return;
        }
        
        // Add editor context to message
        message.metadata = message.metadata || {};
        message.metadata.editorContext = {
            connectionId: connection.id,
            ...connection.metadata
        };
        
        // Route to appropriate agents
        this.routeToAgents(message);
    }
    
    /**
     * Handle agent responses
     */
    handleAgentResponse(connection, message) {
        if (connection.type !== 'agent') {
            this.sendError(connection, 'unauthorized', 'Only agents can send agent responses');
            return;
        }
        
        // Route response back to originating editor
        const targetEditorId = message.metadata?.targetEditor;
        if (targetEditorId) {
            const targetEditor = this.editors.get(targetEditorId);
            if (targetEditor) {
                this.sendMessage(targetEditor, message);
            } else {
                this.log('warn', `Target editor not found: ${targetEditorId}`);
            }
        } else {
            // Broadcast to all editors (fallback)
            this.broadcastToEditors(message);
        }
    }
    
    /**
     * Route messages to agents
     */
    routeToAgents(message) {
        const agents = Array.from(this.agents.values());
        
        if (agents.length === 0) {
            this.log('warn', 'No agents available to handle message');
            return;
        }
        
        // Simple round-robin routing for now
        const targetAgent = agents[this.stats.messagesProcessed % agents.length];
        this.sendMessage(targetAgent, message);
    }
    
    /**
     * Broadcast message to all editors
     */
    broadcastToEditors(message) {
        for (const editor of this.editors.values()) {
            this.sendMessage(editor, message);
        }
    }
    
    /**
     * Handle heartbeat messages
     */
    handleHeartbeat(connection, message) {
        this.sendMessage(connection, {
            type: 'heartbeat_ack',
            id: message.id,
            timestamp: new Date().toISOString(),
            data: {
                serverTime: Date.now()
            }
        });
    }
    
    /**
     * Handle batch requests
     */
    handleBatchRequest(connection, message) {
        const { messages } = message.data;
        
        if (!Array.isArray(messages)) {
            this.sendError(connection, 'invalid_batch_format', 'Batch requests must contain message array');
            return;
        }
        
        // Process batch with optimization
        const responses = [];
        for (const msg of messages) {
            try {
                // Process each message and collect responses
                const response = this.processBatchMessage(msg, connection);
                if (response) {
                    responses.push(response);
                }
            } catch (error) {
                this.log('error', `Batch message processing error: ${error.message}`);
            }
        }
        
        // Send batch response
        this.sendMessage(connection, {
            type: 'batch_response',
            id: message.id,
            timestamp: new Date().toISOString(),
            data: {
                responses: responses,
                processedCount: responses.length
            }
        });
    }
    
    /**
     * Process individual message in batch
     */
    processBatchMessage(message, connection) {
        // Simplified processing - in production, implement proper batching logic
        return {
            messageId: message.id,
            status: 'processed',
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Handle generic messages
     */
    handleGenericMessage(connection, message) {
        this.log('debug', `Handling generic message type: ${message.type}`);
        // Forward to appropriate handler based on connection type
        if (connection.type === 'editor') {
            this.routeToAgents(message);
        } else if (connection.type === 'agent') {
            this.broadcastToEditors(message);
        }
    }
    
    /**
     * Handle client disconnection
     */
    handleDisconnection(connection, code, reason) {
        this.log('info', `Connection closed: ${connection.id} (code: ${code})`);
        
        // Clean up connection
        this.connections.delete(connection.id);
        if (connection.type === 'agent') {
            this.agents.delete(connection.id);
        } else if (connection.type === 'editor') {
            this.editors.delete(connection.id);
        }
        
        this.stats.activeConnections--;
        
        // Clear timers
        if (connection.heartbeatTimer) {
            clearInterval(connection.heartbeatTimer);
        }
    }
    
    /**
     * Start heartbeat for connection
     */
    startHeartbeat(connection) {
        connection.heartbeatTimer = setInterval(() => {
            if (connection.socket.readyState === WebSocket.OPEN) {
                this.sendMessage(connection, {
                    type: 'heartbeat',
                    id: this.generateId(),
                    timestamp: new Date().toISOString()
                });
            }
        }, this.config.heartbeatInterval);
    }
    
    /**
     * Send message to connection
     */
    sendMessage(connection, message) {
        if (connection.socket.readyState === WebSocket.OPEN) {
            try {
                const messageString = JSON.stringify(message);
                connection.socket.send(messageString);
                this.log('debug', `Sent message to ${connection.id}: ${message.type}`);
            } catch (error) {
                this.log('error', `Failed to send message: ${error.message}`);
                this.stats.errors++;
            }
        }
    }
    
    /**
     * Send error message
     */
    sendError(connection, errorCode, errorMessage) {
        this.sendMessage(connection, {
            type: 'error',
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            data: {
                code: errorCode,
                message: errorMessage
            }
        });
    }
    
    /**
     * Get capabilities based on client type
     */
    getCapabilities(clientType) {
        const baseCapabilities = [
            'mcp_v1_protocol',
            'websocket_json',
            'heartbeat_support',
            'batch_processing'
        ];
        
        if (clientType === 'agent') {
            return [
                ...baseCapabilities,
                'llm_processing',
                'tool_execution',
                'context_management'
            ];
        } else {
            return [
                ...baseCapabilities,
                'file_operations',
                'cursor_tracking',
                'realtime_sync'
            ];
        }
    }
    
    /**
     * Start periodic maintenance tasks
     */
    startPeriodicTasks() {
        // Periodic cleanup of inactive connections
        setInterval(() => {
            this.cleanupInactiveConnections();
        }, 60000); // Every minute
        
        // Performance metrics collection
        setInterval(() => {
            this.collectPerformanceMetrics();
        }, 30000); // Every 30 seconds
    }
    
    /**
     * Cleanup inactive connections
     */
    cleanupInactiveConnections() {
        const now = Date.now();
        const timeout = 300000; // 5 minutes
        
        for (const [id, connection] of this.connections.entries()) {
            if (now - connection.lastActivity > timeout) {
                this.log('info', `Cleaning up inactive connection: ${id}`);
                connection.socket.close(1000, 'Inactive connection timeout');
            }
        }
    }
    
    /**
     * Collect performance metrics
     */
    collectPerformanceMetrics() {
        const uptime = Date.now() - this.stats.startTime;
        this.performanceMetrics.messageThroughput = 
            (this.stats.messagesProcessed / (uptime / 1000)).toFixed(2);
            
        this.log('info', `Performance: ${this.stats.activeConnections} active connections, ` +
                        `${this.stats.messagesProcessed} messages processed, ` +
                        `${this.performanceMetrics.messageThroughput} msgs/sec`);
    }
    
    /**
     * Logging utility
     */
    log(level, message) {
        if (this.shouldLog(level)) {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
        }
    }
    
    /**
     * Determine if message should be logged
     */
    shouldLog(level) {
        const levels = { error: 0, warn: 1, info: 2, debug: 3 };
        return levels[level] <= levels[this.config.logLevel];
    }
    
    /**
     * Get server statistics
     */
    getStats() {
        return {
            ...this.stats,
            activeConnections: this.stats.activeConnections,
            registeredAgents: this.agents.size,
            registeredEditors: this.editors.size,
            performance: this.performanceMetrics,
            uptime: Date.now() - this.stats.startTime
        };
    }
    
    /**
     * Graceful shutdown
     */
    async shutdown() {
        this.log('info', 'Shutting down Agent-Editor Bridge...');
        
        // Close all connections
        for (const connection of this.connections.values()) {
            connection.socket.close(1001, 'Server shutting down');
        }
        
        // Close server
        if (this.server) {
            this.server.close(() => {
                this.log('info', 'Server shutdown complete');
            });
        }
        
        this.log('info', 'Agent-Editor Bridge shutdown completed');
    }
}

// Main execution
async function main() {
    const bridge = new AgentEditorBridge({
        port: 8081,
        logLevel: 'info'
    });
    
    try {
        await bridge.start();
        
        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            await bridge.shutdown();
            process.exit(0);
        });
        
        process.on('SIGTERM', async () => {
            await bridge.shutdown();
            process.exit(0);
        });
        
        // Keep process alive
        setInterval(() => {
            // Periodic health check
            const stats = bridge.getStats();
            if (stats.activeConnections > 0) {
                bridge.log('debug', `Health check: ${stats.activeConnections} connections active`);
            }
        }, 60000);
        
    } catch (error) {
        console.error('Failed to start Agent-Editor Bridge:', error);
        process.exit(1);
    }
}

// Export for use as module
module.exports = { AgentEditorBridge };

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}