const DatabaseManager = require('../database/DatabaseManager');
const Logger = require('./Logger');
const ZombieCoderMCP = require('./ZombieCoderMCP');
const AdminAPI = require('./AdminAPI');
const EditorWebSocketServer = require('./WebSocketServer');
const EditorConnectionManager = require('./EditorConnectionManager');
const AgentRuntimeMonitor = require('./AgentRuntimeMonitor');
const PerformanceMonitor = require('./PerformanceMonitor');

class ZombieCoderServer {
    constructor() {
        this.db = null;
        this.logger = null;
        this.mcpServer = null;
        this.adminAPI = null;
        this.webSocketServer = null;
        this.editorConnectionManager = null;
        this.agentRuntimeMonitor = null;
        this.performanceMonitor = null;
        this.isShuttingDown = false;
    }

    async initialize() {
        try {
            console.log('🚀 Initializing ZombieCoder MCP Server...');
            
            // Initialize database
            this.db = new DatabaseManager('./database/zombiecoder.db');
            await this.db.initialize();
            console.log('✅ Database initialized');
            
            // Initialize logger
            this.logger = new Logger(this.db);
            await this.logger.info('Server initialization started');
            console.log('✅ Logger initialized');
            
            // Initialize MCP server
            this.mcpServer = new ZombieCoderMCP(this.logger, this.db);
            console.log('✅ MCP Server initialized');
            
            // Initialize Admin API
            this.adminAPI = new AdminAPI(this.db, this.logger);
            // Pass MCP server reference for connection status
            this.adminAPI.mcpServer = this.mcpServer;
            await this.adminAPI.start();
            console.log('✅ Admin API initialized');
            
            // Initialize Editor Connection Manager
            this.editorConnectionManager = new EditorConnectionManager(this.db, this.logger);
            await this.editorConnectionManager.initialize();
            console.log('✅ Editor Connection Manager initialized');
            
            // Initialize Agent Runtime Monitor
            this.agentRuntimeMonitor = new AgentRuntimeMonitor(this.db, this.logger);
            await this.agentRuntimeMonitor.initialize();
            console.log('✅ Agent Runtime Monitor initialized');
            
            // Initialize Performance Monitor
            this.performanceMonitor = new PerformanceMonitor(this.db, this.logger);
            await this.performanceMonitor.initialize();
            console.log('✅ Performance Monitor initialized');
            
            // Initialize WebSocket Server
            this.webSocketServer = new EditorWebSocketServer(this.db, this.logger);
            // Pass connection manager reference
            this.webSocketServer.editorConnectionManager = this.editorConnectionManager;
            await this.webSocketServer.start();
            console.log('✅ WebSocket Server initialized');
            
            await this.logger.info('All components initialized successfully');
            console.log('🎉 ZombieCoder MCP Server ready!');
            
        } catch (error) {
            console.error('❌ Failed to initialize server:', error);
            await this.shutdown();
            process.exit(1);
        }
    }

    async start() {
        try {
            await this.initialize();
            
            // Set up signal handlers for graceful shutdown
            process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));
            process.on('SIGINT', () => this.handleShutdown('SIGINT'));
            process.on('uncaughtException', (error) => this.handleUncaughtException(error));
            process.on('unhandledRejection', (reason, promise) => this.handleUnhandledRejection(reason, promise));
            
            // Start MCP server
            await this.mcpServer.run();
            
            await this.logger.info('ZombieCoder MCP Server is now running');
            
        } catch (error) {
            console.error('❌ Failed to start server:', error);
            await this.logger.error('Server startup failed', { error: error.message });
            await this.shutdown();
            process.exit(1);
        }
    }

    async handleShutdown(signal) {
        if (this.isShuttingDown) return;
        
        this.isShuttingDown = true;
        console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
        
        try {
            // Log shutdown initiation (before closing database)
            if (this.logger) {
                await this.logger.info(`Received ${signal}, initiating shutdown`);
            }
            
            // Stop Performance Monitor
            if (this.performanceMonitor) {
                this.performanceMonitor.stop();
                console.log('✅ Performance Monitor stopped');
            }
            
            // Stop Agent Runtime Monitor
            if (this.agentRuntimeMonitor) {
                this.agentRuntimeMonitor.stop();
                console.log('✅ Agent Runtime Monitor stopped');
            }
            
            // Stop Editor Connection Manager
            if (this.editorConnectionManager) {
                // No explicit stop method needed
                console.log('✅ Editor Connection Manager stopped');
            }
            
            // Stop WebSocket server
            if (this.webSocketServer) {
                await this.webSocketServer.stop();
                console.log('✅ WebSocket Server stopped');
            }
            
            // Stop admin API
            if (this.adminAPI) {
                await this.adminAPI.stop();
                console.log('✅ Admin API stopped');
            }
            
            // Close database connection
            if (this.db) {
                await this.db.close();
                console.log('✅ Database connection closed');
            }
            
            console.log('👋 Server shutdown complete');
            process.exit(0);
            
        } catch (error) {
            console.error('❌ Error during shutdown:', error);
            process.exit(1);
        }
    }

    async handleUncaughtException(error) {
        console.error('💥 Uncaught Exception:', error);
        if (this.logger) {
            await this.logger.error('Uncaught exception', { 
                error: error.message, 
                stack: error.stack 
            });
        }
        await this.shutdown();
        process.exit(1);
    }

    async handleUnhandledRejection(reason, promise) {
        console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
        if (this.logger) {
            await this.logger.error('Unhandled rejection', { 
                reason: reason?.message || reason,
                stack: reason?.stack
            });
        }
    }

    async shutdown() {
        if (this.isShuttingDown) return;
        
        this.isShuttingDown = true;
        console.log('🛑 Initiating emergency shutdown...');
        
        try {
            // Stop Performance Monitor
            if (this.performanceMonitor) {
                this.performanceMonitor.stop();
            }
            
            // Stop Agent Runtime Monitor
            if (this.agentRuntimeMonitor) {
                this.agentRuntimeMonitor.stop();
            }
            
            // Stop Editor Connection Manager
            if (this.editorConnectionManager) {
                // No explicit stop method needed
            }
            
            // Stop WebSocket server first
            if (this.webSocketServer) {
                await this.webSocketServer.stop();
            }
            
            // Stop admin API first
            if (this.adminAPI) {
                await this.adminAPI.stop();
            }
            
            // Close database connection
            if (this.db) {
                await this.db.close();
            }
            
            // Log shutdown (without database)
            console.log('Emergency shutdown completed');
            
        } catch (error) {
            console.error('❌ Error during emergency shutdown:', error);
        }
    }
}

// Handle standalone execution
if (require.main === module) {
    const server = new ZombieCoderServer();
    server.start().catch(error => {
        console.error('❌ Fatal error starting server:', error);
        process.exit(1);
    });
}

module.exports = ZombieCoderServer;