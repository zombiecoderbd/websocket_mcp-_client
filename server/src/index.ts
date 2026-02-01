import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';

// Load environment variables
dotenv.config();

// Import routes
import healthRoutes from './routes/health';
import statusRoutes from './routes/status';
import chatRoutes from './routes/chat';
import modelsRoutes from './routes/models';
import agentsRoutes from './routes/agents';
import memoryRoutes from './routes/memory';
import cliRoutes from './routes/cli';
import editorRoutes from './routes/editor';
import providersRoutes from './routes/providers';
import serversRoutes from './routes/servers';
import enhancedServersRoutes from './routes/servers-enhanced';
import testRoutes from './routes/test-route';
import simpleTestRoutes from './routes/simple-test';
import agentManagementRoutes from './routes/agent-management';

// Import services
import { OllamaService } from './services/ollama';
import { WebSocketService } from './services/websocket';

// Increase EventEmitter max listeners to prevent memory leak warnings
process.setMaxListeners(20);
import { Logger } from './utils/logger';
import { initializeDatabase } from './database/connection';

const app = express();
const server = createServer(app);
const port = process.env.PORT || 8000;

// Initialize services
const ollamaService = new OllamaService();
const logger = new Logger();

// WebSocket setup
const wss = new WebSocketServer({ server });
const wsService = new WebSocketService(wss);

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    console.log(`Request: ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/health', healthRoutes);
app.use('/status', statusRoutes);
app.use('/chat', chatRoutes);
app.use('/models', modelsRoutes);
app.use('/agents', agentsRoutes);
app.use('/memory', memoryRoutes);
app.use('/cli-agent', cliRoutes);
app.use('/editor', editorRoutes);
app.use('/providers', providersRoutes);
app.use('/servers', serversRoutes);
app.use('/test', testRoutes);
app.use('/simple-test', simpleTestRoutes);
app.use('/api/proxy/servers', enhancedServersRoutes);
app.use('/api/management', agentManagementRoutes);

// Debug logging
logger.info('Enhanced servers routes registered at /api/proxy/servers');
logger.info('Test routes registered at /test');

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'UAS TypeScript Server',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            status: '/status',
            chat: '/chat',
            models: '/models',
            agents: '/agents',
            memory: '/memory',
            cli: '/cli-agent',
            editor: '/editor',
            providers: '/providers',
            servers: '/servers',
            test: '/test/test',
            'api/proxy/servers': '/api/proxy/servers/providers'
        }
    });
});

// Simple test route
app.get('/test/simple', (req, res) => {
    res.json({
        success: true,
        message: 'Simple test route working',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`
    });
});

// Start server
server.listen(port, async () => {
    logger.info(`🚀 UAS TypeScript Server running on port ${port}`);
    logger.info(`📡 WebSocket server ready for real-time updates`);
    logger.info(`🔗 Ollama integration: ${ollamaService.isConnected ? 'Connected' : 'Disconnected'}`);
    
    // Initialize database
    try {
        await initializeDatabase({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'uas_admin',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        logger.info('✅ Database connected successfully');
    } catch (error) {
        logger.warn('⚠️ Database connection failed - running in offline mode', error);
    }

    // Test Ollama connection
    ollamaService.testConnection().then(connected => {
        if (connected) {
            logger.info('✅ Ollama service connected successfully');
        } else {
            logger.warn('⚠️ Ollama service not available - some features may not work');
        }
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

export { app, server, wsService, ollamaService };