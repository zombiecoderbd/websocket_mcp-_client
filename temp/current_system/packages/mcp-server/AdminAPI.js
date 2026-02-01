const express = require('express');
const cors = require('cors');
const path = require('path');
const WebSocket = require('ws');

class AdminAPI {
    constructor(databaseManager, logger) {
        this.db = databaseManager;
        this.logger = logger;
        this.app = express();
        this.server = null;
        this.wss = null;
        this.port = process.env.ADMIN_PORT || 3002;
        
        // CPU monitoring variables
        this.lastCpuUsage = process.cpuUsage();
        this.lastTime = process.hrtime();
        this.currentCpuPercent = 0;
        
        this.setupMiddleware();
        this.setupRoutes();
        this.startCpuMonitoring();
    }

    setupMiddleware() {
        // Enable CORS for admin panel
        this.app.use(cors());
        
        // Parse JSON bodies
        this.app.use(express.json());
        
        // Parse URL-encoded bodies
        this.app.use(express.urlencoded({ extended: true }));
        
        // Serve static files from admin directory
        this.app.use('/admin', express.static(path.join(__dirname, '../../admin')));
        
        // Serve admin index page
        this.app.get('/admin', (req, res) => {
        // Serve static files from public directory
        this.app.use("/public", express.static(path.join(__dirname, "../../admin/public")));

        // Authentication endpoints
        this.app.post("/api/auth/login", async (req, res) => {
            try {
                const { username, password } = req.body;
                // Simple authentication for testing
                if (username === "admin" && password === "password") {
                    res.json({
                        success: true,
                        token: "test-token-123",
                        user: { id: 1, username: "admin", role: "administrator" }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        error: "Invalid credentials"
                    });
                }
            } catch (error) {
                await this.logger.error("Login failed", { error: error.message });
                res.status(500).json({ error: "Authentication failed" });
            }
        });

        this.app.get("/api/auth/status", async (req, res) => {
            try {
                // Simple auth status check
                res.json({
                    authenticated: true,
                    user: { id: 1, username: "admin", role: "administrator" }
                });
            } catch (error) {
                res.status(500).json({ error: "Failed to check auth status" });
            }
        });

            res.sendFile(path.join(__dirname, '../../admin/index.html'));
        });
        
        // Logging middleware
        this.app.use((req, res, next) => {
            const startTime = Date.now();
            res.on('finish', async () => {
                const duration = Date.now() - startTime;
                await this.logger.logRequest(
                    req.method,
                    req.path,
                    JSON.stringify(req.body),
                    JSON.stringify({ statusCode: res.statusCode }),
                    res.statusCode >= 400 ? 'error' : 'success',
                    duration,
                    req.ip,
                    req.get('User-Agent')
                );
            });
            next();
        });
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/api/health', (req, res) => {
        // Serve static files from public directory
        this.app.use("/public", express.static(path.join(__dirname, "../../admin/public")));

        // Authentication endpoints
        this.app.post("/api/auth/login", async (req, res) => {
            try {
                const { username, password } = req.body;
                // Simple authentication for testing
                if (username === "admin" && password === "password") {
                    res.json({
                        success: true,
                        token: "test-token-123",
                        user: { id: 1, username: "admin", role: "administrator" }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        error: "Invalid credentials"
                    });
                }
            } catch (error) {
                await this.logger.error("Login failed", { error: error.message });
                res.status(500).json({ error: "Authentication failed" });
            }
        });

        this.app.get("/api/auth/status", async (req, res) => {
            try {
                // Simple auth status check
                res.json({
                    authenticated: true,
                    user: { id: 1, username: "admin", role: "administrator" }
                });
            } catch (error) {
                res.status(500).json({ error: "Failed to check auth status" });
            }
        });

            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                service: 'zombiecoder-admin-api'
            });
        });

        // Dashboard data endpoints
        this.app.get('/api/dashboard/stats', async (req, res) => {
        // Serve static files from public directory
        this.app.use("/public", express.static(path.join(__dirname, "../../admin/public")));

        // Authentication endpoints
        this.app.post("/api/auth/login", async (req, res) => {
            try {
                const { username, password } = req.body;
                // Simple authentication for testing
                if (username === "admin" && password === "password") {
                    res.json({
                        success: true,
                        token: "test-token-123",
                        user: { id: 1, username: "admin", role: "administrator" }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        error: "Invalid credentials"
                    });
                }
            } catch (error) {
                await this.logger.error("Login failed", { error: error.message });
                res.status(500).json({ error: "Authentication failed" });
            }
        });

        this.app.get("/api/auth/status", async (req, res) => {
            try {
                // Simple auth status check
                res.json({
                    authenticated: true,
                    user: { id: 1, username: "admin", role: "administrator" }
                });
            } catch (error) {
                res.status(500).json({ error: "Failed to check auth status" });
            }
        });

            try {
                const requestStats = await this.db.getRequestStats();
                const connectionStats = await this.db.getConnectionStats();
                const operationStats = await this.getOperationStats();
                const logStats = await this.getLogStats();
                
                res.json({
                    requestStats,
                    connectionStats,
                    operationStats,
                    logStats,
                    serverInfo: {
                        uptime: process.uptime(),
                        memoryUsage: process.memoryUsage(),
                        cpuUsage: this.currentCpuPercent,
                        pid: process.pid
                    }
                });
            } catch (error) {
                await this.logger.error('Failed to get dashboard stats', { error: error.message });
                res.status(500).json({ error: 'Failed to retrieve statistics' });
            }
        });

        // Logs endpoints
        this.app.get('/api/logs', async (req, res) => {
        // Serve static files from public directory
        this.app.use("/public", express.static(path.join(__dirname, "../../admin/public")));

        // Authentication endpoints
        this.app.post("/api/auth/login", async (req, res) => {
            try {
                const { username, password } = req.body;
                // Simple authentication for testing
                if (username === "admin" && password === "password") {
                    res.json({
                        success: true,
                        token: "test-token-123",
                        user: { id: 1, username: "admin", role: "administrator" }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        error: "Invalid credentials"
                    });
                }
            } catch (error) {
                await this.logger.error("Login failed", { error: error.message });
                res.status(500).json({ error: "Authentication failed" });
            }
        });

        this.app.get("/api/auth/status", async (req, res) => {
            try {
                // Simple auth status check
                res.json({
                    authenticated: true,
                    user: { id: 1, username: "admin", role: "administrator" }
                });
            } catch (error) {
                res.status(500).json({ error: "Failed to check auth status" });
            }
        });

            try {
                const limit = parseInt(req.query.limit) || 100;
                const level = req.query.level;
                const component = req.query.component;
                
                let query = 'SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?';
                let params = [limit];
                
                if (level) {
                    query = 'SELECT * FROM logs WHERE level = ? ORDER BY timestamp DESC LIMIT ?';
                    params = [level, limit];
                }
                
                if (component) {
                    query = 'SELECT * FROM logs WHERE component = ? ORDER BY timestamp DESC LIMIT ?';
                    params = [component, limit];
                }
                
                if (level && component) {
                    query = 'SELECT * FROM logs WHERE level = ? AND component = ? ORDER BY timestamp DESC LIMIT ?';
                    params = [level, component, limit];
                }
                
                const logs = await this.db.all(query, params);
                res.json(logs);
            } catch (error) {
                await this.logger.error('Failed to get logs', { error: error.message });
                res.status(500).json({ error: 'Failed to retrieve logs' });
            }
        });

        // MCP Operations endpoints
        this.app.get('/api/operations', async (req, res) => {
        // Serve static files from public directory
        this.app.use("/public", express.static(path.join(__dirname, "../../admin/public")));

        // Authentication endpoints
        this.app.post("/api/auth/login", async (req, res) => {
            try {
                const { username, password } = req.body;
                // Simple authentication for testing
                if (username === "admin" && password === "password") {
                    res.json({
                        success: true,
                        token: "test-token-123",
                        user: { id: 1, username: "admin", role: "administrator" }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        error: "Invalid credentials"
                    });
                }
            } catch (error) {
                await this.logger.error("Login failed", { error: error.message });
                res.status(500).json({ error: "Authentication failed" });
            }
        });

        this.app.get("/api/auth/status", async (req, res) => {
            try {
                // Simple auth status check
                res.json({
                    authenticated: true,
                    user: { id: 1, username: "admin", role: "administrator" }
                });
            } catch (error) {
                res.status(500).json({ error: "Failed to check auth status" });
            }
        });

            try {
                const limit = parseInt(req.query.limit) || 50;
                const operations = await this.db.getRecentOperations(limit);
                res.json(operations);
            } catch (error) {
                await this.logger.error('Failed to get operations', { error: error.message });
                res.status(500).json({ error: 'Failed to retrieve operations' });
            }
        });

        // Requests endpoints
        this.app.get('/api/requests', async (req, res) => {
        // Serve static files from public directory
        this.app.use("/public", express.static(path.join(__dirname, "../../admin/public")));

        // Authentication endpoints
        this.app.post("/api/auth/login", async (req, res) => {
            try {
                const { username, password } = req.body;
                // Simple authentication for testing
                if (username === "admin" && password === "password") {
                    res.json({
                        success: true,
                        token: "test-token-123",
                        user: { id: 1, username: "admin", role: "administrator" }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        error: "Invalid credentials"
                    });
                }
            } catch (error) {
                await this.logger.error("Login failed", { error: error.message });
                res.status(500).json({ error: "Authentication failed" });
            }
        });

        this.app.get("/api/auth/status", async (req, res) => {
            try {
                // Simple auth status check
                res.json({
                    authenticated: true,
                    user: { id: 1, username: "admin", role: "administrator" }
                });
            } catch (error) {
                res.status(500).json({ error: "Failed to check auth status" });
            }
        });

            try {
                const limit = parseInt(req.query.limit) || 100;
                const requests = await this.db.all(
                    'SELECT * FROM requests ORDER BY timestamp DESC LIMIT ?', 
                    [limit]
                );
                res.json(requests);
            } catch (error) {
                await this.logger.error('Failed to get requests', { error: error.message });
                res.status(500).json({ error: 'Failed to retrieve requests' });
            }
        });

        // Connections endpoints
        this.app.get('/api/connections', async (req, res) => {
        // Serve static files from public directory
        this.app.use("/public", express.static(path.join(__dirname, "../../admin/public")));

        // Authentication endpoints
        this.app.post("/api/auth/login", async (req, res) => {
            try {
                const { username, password } = req.body;
                // Simple authentication for testing
                if (username === "admin" && password === "password") {
                    res.json({
                        success: true,
                        token: "test-token-123",
                        user: { id: 1, username: "admin", role: "administrator" }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        error: "Invalid credentials"
                    });
                }
            } catch (error) {
                await this.logger.error("Login failed", { error: error.message });
                res.status(500).json({ error: "Authentication failed" });
            }
        });

        this.app.get("/api/auth/status", async (req, res) => {
            try {
                // Simple auth status check
                res.json({
                    authenticated: true,
                    user: { id: 1, username: "admin", role: "administrator" }
                });
            } catch (error) {
                res.status(500).json({ error: "Failed to check auth status" });
            }
        });

            try {
                const limit = parseInt(req.query.limit) || 100;
                const connections = await this.db.all(
                    'SELECT * FROM connections ORDER BY timestamp DESC LIMIT ?', 
                    [limit]
                );
                res.json(connections);
            } catch (error) {
                await this.logger.error('Failed to get connections', { error: error.message });
                res.status(500).json({ error: 'Failed to retrieve connections' });
            }
        });
        
        // Real-time connection status endpoint
        this.app.get('/api/connections/status', async (req, res) => {
        // Serve static files from public directory
        this.app.use("/public", express.static(path.join(__dirname, "../../admin/public")));

        // Authentication endpoints
        this.app.post("/api/auth/login", async (req, res) => {
            try {
                const { username, password } = req.body;
                // Simple authentication for testing
                if (username === "admin" && password === "password") {
                    res.json({
                        success: true,
                        token: "test-token-123",
                        user: { id: 1, username: "admin", role: "administrator" }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        error: "Invalid credentials"
                    });
                }
            } catch (error) {
                await this.logger.error("Login failed", { error: error.message });
                res.status(500).json({ error: "Authentication failed" });
            }
        });

        this.app.get("/api/auth/status", async (req, res) => {
            try {
                // Simple auth status check
                res.json({
                    authenticated: true,
                    user: { id: 1, username: "admin", role: "administrator" }
                });
            } catch (error) {
                res.status(500).json({ error: "Failed to check auth status" });
            }
        });

            try {
                // Get connection status from MCP server
                const connectionStatus = this.mcpServer ? this.mcpServer.getConnectionStatus() : {
                    totalConnections: 0,
                    activeConnections: 0,
                    inactiveConnections: 0,
                    connections: []
                };
                
                res.json({
                    realtime: connectionStatus,
                    stored: await this.db.all('SELECT * FROM connections ORDER BY timestamp DESC LIMIT 50')
                });
            } catch (error) {
                await this.logger.error('Failed to get connection status', { error: error.message });
                res.status(500).json({ error: 'Failed to retrieve connection status' });
            }
        });

        // Admin settings endpoints
        this.app.get('/api/settings', async (req, res) => {
        // Serve static files from public directory
        this.app.use("/public", express.static(path.join(__dirname, "../../admin/public")));

        // Authentication endpoints
        this.app.post("/api/auth/login", async (req, res) => {
            try {
                const { username, password } = req.body;
                // Simple authentication for testing
                if (username === "admin" && password === "password") {
                    res.json({
                        success: true,
                        token: "test-token-123",
                        user: { id: 1, username: "admin", role: "administrator" }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        error: "Invalid credentials"
                    });
                }
            } catch (error) {
                await this.logger.error("Login failed", { error: error.message });
                res.status(500).json({ error: "Authentication failed" });
            }
        });

        this.app.get("/api/auth/status", async (req, res) => {
            try {
                // Simple auth status check
                res.json({
                    authenticated: true,
                    user: { id: 1, username: "admin", role: "administrator" }
                });
            } catch (error) {
                res.status(500).json({ error: "Failed to check auth status" });
            }
        });

            try {
                const settings = await this.db.all('SELECT * FROM admin_settings');
                const settingsObj = {};
                settings.forEach(setting => {
                    settingsObj[setting.setting_key] = setting.setting_value;
                });
                res.json(settingsObj);
            } catch (error) {
                await this.logger.error('Failed to get settings', { error: error.message });
                res.status(500).json({ error: 'Failed to retrieve settings' });
            }
        });

        this.app.post('/api/settings', async (req, res) => {
            try {
                const { key, value, description } = req.body;
                
                if (!key || value === undefined) {
                    return res.status(400).json({ error: 'Key and value are required' });
                }
                
                await this.db.setAdminSetting(key, value, description);
                await this.logger.info('Admin setting updated', { key, value }, 'admin-api');
                
                res.json({ success: true, message: 'Setting updated successfully' });
            } catch (error) {
                await this.logger.error('Failed to update setting', { error: error.message });
                res.status(500).json({ error: 'Failed to update setting' });
            }
        });

        // Cleanup endpoints
        this.app.post('/api/cleanup/logs', async (req, res) => {
            try {
                const days = parseInt(req.body.days) || 30;
                const deletedCount = await this.logger.cleanupOldLogs(days);
                res.json({ 
                    success: true, 
                    message: `Cleaned up ${deletedCount} old log entries`,
                    deletedCount 
                });
            } catch (error) {
                await this.logger.error('Failed to cleanup logs', { error: error.message });
                res.status(500).json({ error: 'Failed to cleanup logs' });
            }
        });

        // Execute agent
        this.app.post('/api/agents/:id/execute', async (req, res) => {
            try {
                const agentId = req.params.id;
                const { input, model, temperature } = req.body;
                
                if (!input) {
                    return res.status(400).json({ error: 'Input is required' });
                }
                
                // Get agent details
                const agent = await this.db.get('SELECT * FROM agents WHERE id = ?', [agentId]);
                if (!agent) {
                    return res.status(404).json({ error: 'Agent not found' });
                }
                
                // Parse agent config
                const config = JSON.parse(agent.config || '{}');
                
                // Update config with request parameters
                const updatedConfig = {
                    ...config,
                    model: model || config.model || 'qwen2.5:1.5b',
                    temperature: temperature !== undefined ? temperature : config.temperature || 0.7
                };
                
                // Create execution record
                const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                await this.db.runQuery(
                    'INSERT INTO agent_executions (agent_id, execution_id, status, input_params, start_time) VALUES (?, ?, ?, ?, ?)',
                    [agentId, executionId, 'running', JSON.stringify({ input, model: updatedConfig.model, temperature: updatedConfig.temperature }), new Date().toISOString()]
                );
                
                // Simulate agent execution (in real implementation, this would call the actual agent)
                const startTime = Date.now();
                
                // For Bengali Coding Assistant, provide contextual responses
                let result;
                if (agent.name === 'Bengali Coding Assistant') {
                    result = await this.simulateBengaliCodingAssistant(input, updatedConfig);
                } else {
                    result = await this.simulateGenericAgent(input, updatedConfig);
                }
                
                const executionTime = Date.now() - startTime;
                
                // Update execution record
                await this.db.runQuery(
                    'UPDATE agent_executions SET status = ?, output_result = ?, end_time = ?, execution_time = ?, success = ? WHERE execution_id = ?',
                    ['completed', JSON.stringify(result), new Date().toISOString(), executionTime, 1, executionId]
                );
                
                // Record performance metrics
                await this.db.runQuery(
                    'INSERT INTO agent_performance_metrics (agent_id, metric_name, metric_value, context, timestamp) VALUES (?, ?, ?, ?, ?)',
                    [agentId, 'avg_response_time', executionTime, 'admin_panel', new Date().toISOString()]
                );
                
                await this.db.runQuery(
                    'INSERT INTO agent_performance_metrics (agent_id, metric_name, metric_value, context, timestamp) VALUES (?, ?, ?, ?, ?)',
                    [agentId, 'success_rate', 100, 'admin_panel', new Date().toISOString()]
                );
                
                res.json({
                    executionId,
                    result: result.response,
                    executionTime,
                    status: 'completed'
                });
                
            } catch (error) {
                console.error('Agent execution error:', error);
                await this.logger.error('Failed to execute agent', { error: error.message });
                res.status(500).json({ error: 'Failed to execute agent: ' + error.message });
            }
        });

        // Get performance metrics - MOVE THIS BEFORE PARAMETERIZED ROUTES
        this.app.get('/api/agents/performance', async (req, res) => {
        // Serve static files from public directory
        this.app.use("/public", express.static(path.join(__dirname, "../../admin/public")));

        // Authentication endpoints
        this.app.post("/api/auth/login", async (req, res) => {
            try {
                const { username, password } = req.body;
                // Simple authentication for testing
                if (username === "admin" && password === "password") {
                    res.json({
                        success: true,
                        token: "test-token-123",
                        user: { id: 1, username: "admin", role: "administrator" }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        error: "Invalid credentials"
                    });
                }
            } catch (error) {
                await this.logger.error("Login failed", { error: error.message });
                res.status(500).json({ error: "Authentication failed" });
            }
        });

        this.app.get("/api/auth/status", async (req, res) => {
            try {
                // Simple auth status check
                res.json({
                    authenticated: true,
                    user: { id: 1, username: "admin", role: "administrator" }
                });
            } catch (error) {
                res.status(500).json({ error: "Failed to check auth status" });
            }
        });

            try {
                const agentId = req.query.agentId;
                const hours = parseInt(req.query.hours) || 24;
                
                // Debug logging
                console.log('Performance API called with agentId:', agentId, 'hours:', hours);
                
                // Check if agents exist
                const allAgents = await this.db.all('SELECT id, name FROM agents');
                console.log('Available agents:', allAgents);
                
                let metrics;
                if (agentId) {
                    // Get specific agent metrics
                    console.log('Querying for specific agent:', agentId);
                    metrics = await this.db.all(
                        'SELECT * FROM agent_performance_metrics WHERE agent_id = ? AND timestamp > datetime(?, ?) ORDER BY timestamp DESC',
                        [agentId, 'now', `-${hours} hours`]
                    );
                    console.log('Specific agent metrics found:', metrics.length);
                } else {
                    // Get all agents metrics
                    console.log('Querying for all agents metrics');
                    try {
                        metrics = await this.db.all(
                            'SELECT apm.*, a.name as agent_name FROM agent_performance_metrics apm JOIN agents a ON apm.agent_id = a.id WHERE apm.timestamp > datetime(?, ?) ORDER BY apm.timestamp DESC',
                            ['now', `-${hours} hours`]
                        );
                        console.log('All agents metrics found:', metrics.length);
                    } catch (joinError) {
                        console.log('Join query failed, trying simple query:', joinError.message);
                        // Fallback to simple query without join
                        metrics = await this.db.all(
                            'SELECT * FROM agent_performance_metrics WHERE timestamp > datetime(?, ?) ORDER BY timestamp DESC',
                            ['now', `-${hours} hours`]
                        );
                        console.log('Simple query results:', metrics.length);
                    }
                }
                
                res.json(metrics);
            } catch (error) {
                console.error('Performance API Error:', error);
                await this.logger.error('Failed to get performance metrics', { error: error.message });
                res.status(500).json({ error: 'Failed to retrieve performance metrics: ' + error.message });
            }
        });

        // === AGENT MANAGEMENT ROUTES ===
        
        // Get all agents
        this.app.get('/api/agents', async (req, res) => {
        // Serve static files from public directory
        this.app.use("/public", express.static(path.join(__dirname, "../../admin/public")));

        // Authentication endpoints
        this.app.post("/api/auth/login", async (req, res) => {
            try {
                const { username, password } = req.body;
                // Simple authentication for testing
                if (username === "admin" && password === "password") {
                    res.json({
                        success: true,
                        token: "test-token-123",
                        user: { id: 1, username: "admin", role: "administrator" }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        error: "Invalid credentials"
                    });
                }
            } catch (error) {
                await this.logger.error("Login failed", { error: error.message });
                res.status(500).json({ error: "Authentication failed" });
            }
        });

        this.app.get("/api/auth/status", async (req, res) => {
            try {
                // Simple auth status check
                res.json({
                    authenticated: true,
                    user: { id: 1, username: "admin", role: "administrator" }
                });
            } catch (error) {
                res.status(500).json({ error: "Failed to check auth status" });
            }
        });

            try {
                const agents = await this.db.all('SELECT * FROM agents ORDER BY created_at DESC');
                res.json(agents);
            } catch (error) {
                await this.logger.error('Failed to get agents', { error: error.message });
                res.status(500).json({ error: 'Failed to retrieve agents' });
            }
        });

        // Get specific agent
        this.app.get('/api/agents/:id', async (req, res) => {
        // Serve static files from public directory
        this.app.use("/public", express.static(path.join(__dirname, "../../admin/public")));

        // Authentication endpoints
        this.app.post("/api/auth/login", async (req, res) => {
            try {
                const { username, password } = req.body;
                // Simple authentication for testing
                if (username === "admin" && password === "password") {
                    res.json({
                        success: true,
                        token: "test-token-123",
                        user: { id: 1, username: "admin", role: "administrator" }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        error: "Invalid credentials"
                    });
                }
            } catch (error) {
                await this.logger.error("Login failed", { error: error.message });
                res.status(500).json({ error: "Authentication failed" });
            }
        });

        this.app.get("/api/auth/status", async (req, res) => {
            try {
                // Simple auth status check
                res.json({
                    authenticated: true,
                    user: { id: 1, username: "admin", role: "administrator" }
                });
            } catch (error) {
                res.status(500).json({ error: "Failed to check auth status" });
            }
        });

            try {
                const agent = await this.db.get('SELECT * FROM agents WHERE id = ?', [req.params.id]);
                if (!agent) {
                    return res.status(404).json({ error: 'Agent not found' });
                }
                res.json(agent);
            } catch (error) {
                await this.logger.error('Failed to get agent', { error: error.message, agentId: req.params.id });
                res.status(500).json({ error: 'Failed to retrieve agent' });
            }
        });

        // Agent creation endpoint
        this.app.post('/api/agents', async (req, res) => {
            try {
                const { name, type, description, config } = req.body;
                
                if (!name || !type) {
                    return res.status(400).json({ error: 'Name and type are required' });
                }
                
                // Register new agent in database
                const result = await this.db.runQuery(
                    'INSERT INTO agents (name, type, description, config, created_at, updated_at, is_active) VALUES (?, ?, ?, ?, datetime("now"), datetime("now"), 1)',
                    [name, type, description || '', JSON.stringify(config || {})]
                );
                
                const newAgentId = result.lastID;
                
                await this.logger.info('New agent created', { 
                    agentId: newAgentId, 
                    name, 
                    type 
                }, 'agent-management');
                
                res.status(201).json({
                    success: true,
                    message: 'Agent registered successfully',
                    agentId: newAgentId
                });
                
            } catch (error) {
                await this.logger.error('Failed to create agent', { error: error.message });
                res.status(500).json({ error: 'Failed to create agent: ' + error.message });
            }
        });

        this.app.put('/api/agents/:id', async (req, res) => {
            try {
                const { name, type, description, config } = req.body;
                
                if (!name || !type) {
                    return res.status(400).json({ error: 'Name and type are required' });
                }
                
                await this.db.updateAgent(req.params.id, name, type, description || '', config || {});
                await this.logger.info('Agent updated', { id: req.params.id, name, type }, 'admin-api');
                
                res.json({ success: true, message: 'Agent updated successfully' });
            } catch (error) {
                await this.logger.error('Failed to update agent', { error: error.message });
                res.status(500).json({ error: 'Failed to update agent' });
            }
        });

        this.app.delete('/api/agents/:id', async (req, res) => {
            try {
                await this.db.deleteAgent(req.params.id);
                await this.logger.info('Agent deleted', { id: req.params.id }, 'admin-api');
                
                res.json({ success: true, message: 'Agent deleted successfully' });
            } catch (error) {
                await this.logger.error('Failed to delete agent', { error: error.message });
                res.status(500).json({ error: 'Failed to delete agent' });
            }
        });

        // Agent execution monitoring endpoints
        this.app.get('/api/agents/:id/executions', async (req, res) => {
        // Serve static files from public directory
        this.app.use("/public", express.static(path.join(__dirname, "../../admin/public")));

        // Authentication endpoints
        this.app.post("/api/auth/login", async (req, res) => {
            try {
                const { username, password } = req.body;
                // Simple authentication for testing
                if (username === "admin" && password === "password") {
                    res.json({
                        success: true,
                        token: "test-token-123",
                        user: { id: 1, username: "admin", role: "administrator" }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        error: "Invalid credentials"
                    });
                }
            } catch (error) {
                await this.logger.error("Login failed", { error: error.message });
                res.status(500).json({ error: "Authentication failed" });
            }
        });

        this.app.get("/api/auth/status", async (req, res) => {
            try {
                // Simple auth status check
                res.json({
                    authenticated: true,
                    user: { id: 1, username: "admin", role: "administrator" }
                });
            } catch (error) {
                res.status(500).json({ error: "Failed to check auth status" });
            }
        });

            try {
                const executions = await this.db.getAgentExecutions(req.params.id, parseInt(req.query.limit) || 50);
                res.json(executions);
            } catch (error) {
                await this.logger.error('Failed to get agent executions', { error: error.message });
                res.status(500).json({ error: 'Failed to retrieve agent executions' });
            }
        });

        this.app.get('/api/agents/executions/recent', async (req, res) => {
        // Serve static files from public directory
        this.app.use("/public", express.static(path.join(__dirname, "../../admin/public")));

        // Authentication endpoints
        this.app.post("/api/auth/login", async (req, res) => {
            try {
                const { username, password } = req.body;
                // Simple authentication for testing
                if (username === "admin" && password === "password") {
                    res.json({
                        success: true,
                        token: "test-token-123",
                        user: { id: 1, username: "admin", role: "administrator" }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        error: "Invalid credentials"
                    });
                }
            } catch (error) {
                await this.logger.error("Login failed", { error: error.message });
                res.status(500).json({ error: "Authentication failed" });
            }
        });

        this.app.get("/api/auth/status", async (req, res) => {
            try {
                // Simple auth status check
                res.json({
                    authenticated: true,
                    user: { id: 1, username: "admin", role: "administrator" }
                });
            } catch (error) {
                res.status(500).json({ error: "Failed to check auth status" });
            }
        });

            try {
                const executions = await this.db.getRecentAgentExecutions(parseInt(req.query.limit) || 50);
                res.json(executions);
            } catch (error) {
                await this.logger.error('Failed to get recent agent executions', { error: error.message });
                res.status(500).json({ error: 'Failed to retrieve recent agent executions' });
            }
        });

        // Agent monitoring metrics endpoints
        this.app.get('/api/agents/:id/metrics', async (req, res) => {
        // Serve static files from public directory
        this.app.use("/public", express.static(path.join(__dirname, "../../admin/public")));

        // Authentication endpoints
        this.app.post("/api/auth/login", async (req, res) => {
            try {
                const { username, password } = req.body;
                // Simple authentication for testing
                if (username === "admin" && password === "password") {
                    res.json({
                        success: true,
                        token: "test-token-123",
                        user: { id: 1, username: "admin", role: "administrator" }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        error: "Invalid credentials"
                    });
                }
            } catch (error) {
                await this.logger.error("Login failed", { error: error.message });
                res.status(500).json({ error: "Authentication failed" });
            }
        });

        this.app.get("/api/auth/status", async (req, res) => {
            try {
                // Simple auth status check
                res.json({
                    authenticated: true,
                    user: { id: 1, username: "admin", role: "administrator" }
                });
            } catch (error) {
                res.status(500).json({ error: "Failed to check auth status" });
            }
        });

            try {
                const metricName = req.query.metric;
                const hours = parseInt(req.query.hours) || 24;
                const metrics = await this.db.getAgentMetrics(req.params.id, metricName, hours);
                
                res.json(metrics);
            } catch (error) {
                await this.logger.error('Failed to get agent metrics', { error: error.message });
                res.status(500).json({ error: 'Failed to retrieve agent metrics' });
            }
        });

        // === NEW AGENT TESTING ENDPOINTS ===
        
        // Get agent embedding/memory data
        this.app.get('/api/agents/:id/embedding', async (req, res) => {
        // Serve static files from public directory
        this.app.use("/public", express.static(path.join(__dirname, "../../admin/public")));

        // Authentication endpoints
        this.app.post("/api/auth/login", async (req, res) => {
            try {
                const { username, password } = req.body;
                // Simple authentication for testing
                if (username === "admin" && password === "password") {
                    res.json({
                        success: true,
                        token: "test-token-123",
                        user: { id: 1, username: "admin", role: "administrator" }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        error: "Invalid credentials"
                    });
                }
            } catch (error) {
                await this.logger.error("Login failed", { error: error.message });
                res.status(500).json({ error: "Authentication failed" });
            }
        });

        this.app.get("/api/auth/status", async (req, res) => {
            try {
                // Simple auth status check
                res.json({
                    authenticated: true,
                    user: { id: 1, username: "admin", role: "administrator" }
                });
            } catch (error) {
                res.status(500).json({ error: "Failed to check auth status" });
            }
        });

            try {
                const agentId = req.params.id;
                
                // Get agent conversation history and memory data
                const conversations = await this.db.all(
                    'SELECT * FROM agent_executions WHERE agent_id = ? ORDER BY start_time DESC LIMIT 50',
                    [agentId]
                );
                
                // Get embedding statistics
                const embeddingStats = await this.db.get(
                    'SELECT COUNT(*) as total_embeddings, AVG(execution_time) as avg_processing_time FROM agent_executions WHERE agent_id = ?',
                    [agentId]
                );
                
                res.json({
                    agentId,
                    conversations: conversations.map(conv => ({
                        id: conv.execution_id,
                        input: JSON.parse(conv.input_params || '{}').input || '',
                        output: conv.output_result ? JSON.parse(conv.output_result).response || '' : '',
                        timestamp: conv.start_time,
                        duration: conv.execution_time,
                        success: conv.success
                    })),
                    embeddingStats: {
                        totalConversations: embeddingStats.total_embeddings,
                        averageProcessingTime: Math.round(embeddingStats.avg_processing_time) || 0
                    }
                });
                
            } catch (error) {
                await this.logger.error('Failed to get agent embedding data', { error: error.message, agentId: req.params.id });
                res.status(500).json({ error: 'Failed to retrieve embedding data' });
            }
        });

        // Vector database statistics
        this.app.get('/api/embedding/stats', async (req, res) => {
        // Serve static files from public directory
        this.app.use("/public", express.static(path.join(__dirname, "../../admin/public")));

        // Authentication endpoints
        this.app.post("/api/auth/login", async (req, res) => {
            try {
                const { username, password } = req.body;
                // Simple authentication for testing
                if (username === "admin" && password === "password") {
                    res.json({
                        success: true,
                        token: "test-token-123",
                        user: { id: 1, username: "admin", role: "administrator" }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        error: "Invalid credentials"
                    });
                }
            } catch (error) {
                await this.logger.error("Login failed", { error: error.message });
                res.status(500).json({ error: "Authentication failed" });
            }
        });

        this.app.get("/api/auth/status", async (req, res) => {
            try {
                // Simple auth status check
                res.json({
                    authenticated: true,
                    user: { id: 1, username: "admin", role: "administrator" }
                });
            } catch (error) {
                res.status(500).json({ error: "Failed to check auth status" });
            }
        });

            try {
                // Get overall embedding statistics
                const totalConversations = await this.db.get('SELECT COUNT(*) as count FROM agent_executions');
                const successfulExecutions = await this.db.get('SELECT COUNT(*) as count FROM agent_executions WHERE success = 1');
                const avgResponseTime = await this.db.get('SELECT AVG(execution_time) as avg_time FROM agent_executions WHERE execution_time IS NOT NULL');
                
                // Get agent-specific embedding data
                const agentEmbeddings = await this.db.all(`
                    SELECT a.name, COUNT(ae.id) as conversation_count, AVG(ae.execution_time) as avg_time
                    FROM agents a
                    LEFT JOIN agent_executions ae ON a.id = ae.agent_id
                    GROUP BY a.id, a.name
                `);
                
                res.json({
                    totalConversations: totalConversations.count,
                    successfulExecutions: successfulExecutions.count,
                    successRate: totalConversations.count > 0 ? 
                        (successfulExecutions.count / totalConversations.count * 100).toFixed(2) : 0,
                    averageResponseTime: Math.round(avgResponseTime.avg_time) || 0,
                    agentEmbeddingStats: agentEmbeddings.map(agent => ({
                        name: agent.name,
                        conversationCount: agent.conversation_count || 0,
                        averageResponseTime: Math.round(agent.avg_time) || 0
                    }))
                });
                
            } catch (error) {
                await this.logger.error('Failed to get embedding stats', { error: error.message });
                res.status(500).json({ error: 'Failed to retrieve embedding statistics' });
            }
        });

        // Clear agent conversation memory
        this.app.post('/api/agents/:id/clear-memory', async (req, res) => {
            try {
                const agentId = req.params.id;
                
                // Clear agent execution history
                await this.db.runQuery(
                    'DELETE FROM agent_executions WHERE agent_id = ?',
                    [agentId]
                );
                
                // Reset agent metrics
                await this.db.runQuery(
                    'DELETE FROM agent_performance_metrics WHERE agent_id = ?',
                    [agentId]
                );
                
                await this.logger.info('Agent memory cleared', { agentId }, 'agent-management');
                
                res.json({
                    success: true,
                    message: 'Agent memory cleared successfully',
                    agentId
                });
                
            } catch (error) {
                await this.logger.error('Failed to clear agent memory', { error: error.message, agentId: req.params.id });
                res.status(500).json({ error: 'Failed to clear agent memory' });
            }
        });

        // Real-time agent runtime status
        this.app.get('/api/agents/runtime-status', async (req, res) => {
        // Serve static files from public directory
        this.app.use("/public", express.static(path.join(__dirname, "../../admin/public")));

        // Authentication endpoints
        this.app.post("/api/auth/login", async (req, res) => {
            try {
                const { username, password } = req.body;
                // Simple authentication for testing
                if (username === "admin" && password === "password") {
                    res.json({
                        success: true,
                        token: "test-token-123",
                        user: { id: 1, username: "admin", role: "administrator" }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        error: "Invalid credentials"
                    });
                }
            } catch (error) {
                await this.logger.error("Login failed", { error: error.message });
                res.status(500).json({ error: "Authentication failed" });
            }
        });

        this.app.get("/api/auth/status", async (req, res) => {
            try {
                // Simple auth status check
                res.json({
                    authenticated: true,
                    user: { id: 1, username: "admin", role: "administrator" }
                });
            } catch (error) {
                res.status(500).json({ error: "Failed to check auth status" });
            }
        });

            try {
                // Get currently active agents
                const activeAgents = await this.db.all('SELECT * FROM agents WHERE is_active = 1');
                
                // Get recent executions for status
                const recentExecutions = await this.db.all(`
                    SELECT agent_id, status, start_time, end_time, execution_time
                    FROM agent_executions 
                    WHERE start_time > datetime('now', '-1 hour')
                    ORDER BY start_time DESC
                    LIMIT 20
                `);
                
                // Get performance metrics
                const performanceMetrics = await this.db.all(`
                    SELECT agent_id, AVG(metric_value) as avg_metric, COUNT(*) as sample_count
                    FROM agent_performance_metrics 
                    WHERE timestamp > datetime('now', '-1 hour')
                    AND metric_name = 'avg_response_time'
                    GROUP BY agent_id
                `);
                
                res.json({
                    activeAgents: activeAgents.length,
                    agentList: activeAgents.map(agent => ({
                        id: agent.id,
                        name: agent.name,
                        type: agent.type,
                        isActive: agent.is_active,
                        lastUpdated: agent.updated_at
                    })),
                    recentActivity: recentExecutions.length,
                    performanceMetrics: performanceMetrics.map(metric => ({
                        agentId: metric.agent_id,
                        averageResponseTime: Math.round(metric.avg_metric),
                        sampleCount: metric.sample_count
                    })),
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                await this.logger.error('Failed to get runtime status', { error: error.message });
                res.status(500).json({ error: 'Failed to retrieve runtime status' });
            }
        });

        // Runtime activity monitoring
        this.app.get('/api/agents/runtime/activity', async (req, res) => {
        // Serve static files from public directory
        this.app.use("/public", express.static(path.join(__dirname, "../../admin/public")));

        // Authentication endpoints
        this.app.post("/api/auth/login", async (req, res) => {
            try {
                const { username, password } = req.body;
                // Simple authentication for testing
                if (username === "admin" && password === "password") {
                    res.json({
                        success: true,
                        token: "test-token-123",
                        user: { id: 1, username: "admin", role: "administrator" }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        error: "Invalid credentials"
                    });
                }
            } catch (error) {
                await this.logger.error("Login failed", { error: error.message });
                res.status(500).json({ error: "Authentication failed" });
            }
        });

        this.app.get("/api/auth/status", async (req, res) => {
            try {
                // Simple auth status check
                res.json({
                    authenticated: true,
                    user: { id: 1, username: "admin", role: "administrator" }
                });
            } catch (error) {
                res.status(500).json({ error: "Failed to check auth status" });
            }
        });

            try {
                // Get recent agent activities
                const recentActivities = await this.db.all(`
                    SELECT ae.*, a.name as agent_name, a.type as agent_type
                    FROM agent_executions ae
                    JOIN agents a ON ae.agent_id = a.id
                    WHERE ae.start_time > datetime('now', '-1 hour')
                    ORDER BY ae.start_time DESC
                    LIMIT 20
                `);
                
                // Get active agents count
                const activeAgents = await this.db.get('SELECT COUNT(*) as count FROM agents WHERE is_active = 1');
                
                res.json({
                    active_count: activeAgents.count,
                    recent_activities: recentActivities.map(activity => ({
                        agent_id: activity.agent_id,
                        agent_name: activity.agent_name,
                        agent_type: activity.agent_type,
                        action: 'execution',
                        status: activity.status,
                        model: JSON.parse(activity.input_params || '{}').model || 'default',
                        duration: activity.execution_time,
                        timestamp: activity.start_time
                    }))
                });
                
            } catch (error) {
                await this.logger.error('Failed to get runtime activity', { error: error.message });
                res.status(500).json({ error: 'Failed to retrieve runtime activity' });
            }
        });

        // Search through agent memories
        this.app.get('/api/embedding/search', async (req, res) => {
        // Serve static files from public directory
        this.app.use("/public", express.static(path.join(__dirname, "../../admin/public")));

        // Authentication endpoints
        this.app.post("/api/auth/login", async (req, res) => {
            try {
                const { username, password } = req.body;
                // Simple authentication for testing
                if (username === "admin" && password === "password") {
                    res.json({
                        success: true,
                        token: "test-token-123",
                        user: { id: 1, username: "admin", role: "administrator" }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        error: "Invalid credentials"
                    });
                }
            } catch (error) {
                await this.logger.error("Login failed", { error: error.message });
                res.status(500).json({ error: "Authentication failed" });
            }
        });

        this.app.get("/api/auth/status", async (req, res) => {
            try {
                // Simple auth status check
                res.json({
                    authenticated: true,
                    user: { id: 1, username: "admin", role: "administrator" }
                });
            } catch (error) {
                res.status(500).json({ error: "Failed to check auth status" });
            }
        });

            try {
                const { query, agentId, limit = 10 } = req.query;
                
                if (!query) {
                    return res.status(400).json({ error: 'Search query is required' });
                }
                
                let searchQuery;
                let queryParams;
                
                if (agentId) {
                    searchQuery = `
                        SELECT ae.*, a.name as agent_name
                        FROM agent_executions ae
                        JOIN agents a ON ae.agent_id = a.id
                        WHERE ae.agent_id = ? 
                        AND (ae.input_params LIKE ? OR ae.output_result LIKE ?)
                        ORDER BY ae.start_time DESC
                        LIMIT ?
                    `;
                    queryParams = [agentId, `%${query}%`, `%${query}%`, parseInt(limit)];
                } else {
                    searchQuery = `
                        SELECT ae.*, a.name as agent_name
                        FROM agent_executions ae
                        JOIN agents a ON ae.agent_id = a.id
                        WHERE ae.input_params LIKE ? OR ae.output_result LIKE ?
                        ORDER BY ae.start_time DESC
                        LIMIT ?
                    `;
                    queryParams = [`%${query}%`, `%${query}%`, parseInt(limit)];
                }
                
                const results = await this.db.all(searchQuery, queryParams);
                
                res.json({
                    query,
                    agentId: agentId || 'all',
                    results: results.map(result => ({
                        id: result.execution_id,
                        agentName: result.agent_name,
                        agentId: result.agent_id,
                        input: JSON.parse(result.input_params || '{}').input || '',
                        output: result.output_result ? JSON.parse(result.output_result).response || '' : '',
                        timestamp: result.start_time,
                        success: result.success,
                        duration: result.execution_time
                    })),
                    totalResults: results.length
                });
                
            } catch (error) {
                await this.logger.error('Failed to search embeddings', { error: error.message });
                res.status(500).json({ error: 'Failed to search through memories' });
            }
        });

        // Get agent tools
        this.app.get('/api/agents/:id/tools', async (req, res) => {
        // Serve static files from public directory
        this.app.use("/public", express.static(path.join(__dirname, "../../admin/public")));

        // Authentication endpoints
        this.app.post("/api/auth/login", async (req, res) => {
            try {
                const { username, password } = req.body;
                // Simple authentication for testing
                if (username === "admin" && password === "password") {
                    res.json({
                        success: true,
                        token: "test-token-123",
                        user: { id: 1, username: "admin", role: "administrator" }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        error: "Invalid credentials"
                    });
                }
            } catch (error) {
                await this.logger.error("Login failed", { error: error.message });
                res.status(500).json({ error: "Authentication failed" });
            }
        });

        this.app.get("/api/auth/status", async (req, res) => {
            try {
                // Simple auth status check
                res.json({
                    authenticated: true,
                    user: { id: 1, username: "admin", role: "administrator" }
                });
            } catch (error) {
                res.status(500).json({ error: "Failed to check auth status" });
            }
        });

            try {
                const agent = await this.db.getAgent(req.params.id);
                if (!agent) {
                    return res.status(404).json({ error: 'Agent not found' });
                }
                
                // Return mock tools for now - would integrate with actual agent tools
                const tools = [
                    {
                        name: 'analyze-code',
                        description: 'Analyze code for potential issues and improvements',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                code: { type: 'string', description: 'Code to analyze' },
                                language: { type: 'string', description: 'Programming language' }
                            },
                            required: ['code']
                        }
                    },
                    {
                        name: 'generate-documentation',
                        description: 'Generate documentation for code',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                code: { type: 'string', description: 'Code to document' },
                                format: { type: 'string', enum: ['plaintext', 'html'], description: 'Output format' }
                            },
                            required: ['code']
                        }
                    }
                ];
                
                res.json(tools);
            } catch (error) {
                await this.logger.error('Failed to get agent tools', { error: error.message });
                res.status(500).json({ error: 'Failed to retrieve agent tools' });
            }
        });

        // Test agent conversation
        this.app.post('/api/agents/:id/chat', async (req, res) => {
            try {
                const { message, model, temperature, conversationId } = req.body;
                
                if (!message) {
                    return res.status(400).json({ error: 'Message is required' });
                }
                
                const agent = await this.db.getAgent(req.params.id);
                if (!agent) {
                    return res.status(404).json({ error: 'Agent not found' });
                }
                
                // Simulate agent response
                const startTime = Date.now();
                await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
                
                const response = {
                    response: `I am processing your request with Ollama: "${message}"`,
                    model: model || 'GPT-4',
                    temperature: temperature || 0.7,
                    tokensUsed: Math.floor(message.length / 4) + 20,
                    executionTime: Date.now() - startTime,
                    conversationId: conversationId || `conv_${Date.now()}`
                };
                
                // Record in runtime monitor if available
                if (this.mcpServer && this.mcpServer.agentRuntimeMonitor) {
                    await this.mcpServer.agentRuntimeMonitor.recordAgentActivity(
                        agent.id, 
                        'conversation', 
                        {
                            message: message,
                            messageType: 'user',
                            conversationId: response.conversationId,
                            model: response.model,
                            tokensUsed: response.tokensUsed,
                            executionTime: response.executionTime,
                            success: true
                        }
                    );
                }
                
                res.json(response);
            } catch (error) {
                await this.logger.error('Failed to test agent conversation', { error: error.message });
                res.status(500).json({ error: 'Failed to test agent conversation' });
            }
        });

        // Test individual tool
        this.app.post('/api/agents/:id/execute-tool', async (req, res) => {
            try {
                const { toolName, parameters } = req.body;
                
                if (!toolName) {
                    return res.status(400).json({ error: 'Tool name is required' });
                }
                
                const agent = await this.db.getAgent(req.params.id);
                if (!agent) {
                    return res.status(404).json({ error: 'Agent not found' });
                }
                
                // Simulate tool execution
                const startTime = Date.now();
                await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
                
                const result = {
                    toolName: toolName,
                    parameters: parameters,
                    result: {
                        output: `Executed ${toolName} with parameters: ${JSON.stringify(parameters)}`
                    },
                    success: true,
                    executionTime: Date.now() - startTime,
                    timestamp: new Date().toISOString()
                };
                
                // Record in runtime monitor
                if (this.mcpServer && this.mcpServer.agentRuntimeMonitor) {
                    await this.mcpServer.agentRuntimeMonitor.recordAgentActivity(
                        agent.id,
                        'tool_execution',
                        {
                            toolName: toolName,
                            parameters: parameters,
                            result: result.result,
                            executionTime: result.executionTime,
                            success: true
                        }
                    );
                }
                
                res.json(result);
            } catch (error) {
                await this.logger.error('Failed to execute agent tool', { error: error.message });
                res.status(500).json({ error: 'Failed to execute agent tool' });
            }
        });

        // Test all tools (bulk)
        this.app.post('/api/agents/:id/test-tools', async (req, res) => {
            try {
                const agent = await this.db.getAgent(req.params.id);
                if (!agent) {
                    return res.status(404).json({ error: 'Agent not found' });
                }
                
                // Get tools
                const tools = [
                    { name: 'analyze-code', parameters: { code: 'console.log("hello");', language: 'javascript' } },
                    { name: 'generate-documentation', parameters: { code: 'function add(a,b) { return a+b; }', format: 'html' } }
                ];
                
                const results = [];
                const startTime = Date.now();
                
                // Execute all tools
                for (const tool of tools) {
                    try {
                        await new Promise(resolve => setTimeout(resolve, 200));
                        
                        const result = {
                            toolName: tool.name,
                            parameters: tool.parameters,
                            result: {
                                output: `Bulk test: Executed ${tool.name}`
                            },
                            success: true,
                            executionTime: 200 + Math.random() * 100
                        };
                        
                        results.push(result);
                    } catch (error) {
                        results.push({
                            toolName: tool.name,
                            parameters: tool.parameters,
                            result: null,
                            success: false,
                            error: error.message,
                            executionTime: 0
                        });
                    }
                }
                
                const response = {
                    totalTests: tools.length,
                    successfulTests: results.filter(r => r.success).length,
                    failedTests: results.filter(r => !r.success).length,
                    results: results,
                    totalTime: Date.now() - startTime,
                    timestamp: new Date().toISOString()
                };
                
                res.json(response);
            } catch (error) {
                await this.logger.error('Failed to test agent tools', { error: error.message });
                res.status(500).json({ error: 'Failed to test agent tools' });
            }
        });

        // Clear agent memory/conversation
        this.app.post('/api/agents/:id/clear-memory', async (req, res) => {
            try {
                const agent = await this.db.getAgent(req.params.id);
                if (!agent) {
                    return res.status(404).json({ error: 'Agent not found' });
                }
                
                // Clear conversation history in database
                await this.db.run(
                    'DELETE FROM agent_conversation_history WHERE agent_id = ?',
                    [agent.id]
                );
                
                await this.logger.info('Agent memory cleared', { agentId: agent.id }, 'admin-api');
                
                res.json({
                    success: true,
                    message: 'Agent memory cleared successfully',
                    agentId: agent.id
                });
            } catch (error) {
                await this.logger.error('Failed to clear agent memory', { error: error.message });
                res.status(500).json({ error: 'Failed to clear agent memory' });
            }
        });

        // Get conversation history
        this.app.get('/api/agents/:id/conversation/:conversationId', async (req, res) => {
        // Serve static files from public directory
        this.app.use("/public", express.static(path.join(__dirname, "../../admin/public")));

        // Authentication endpoints
        this.app.post("/api/auth/login", async (req, res) => {
            try {
                const { username, password } = req.body;
                // Simple authentication for testing
                if (username === "admin" && password === "password") {
                    res.json({
                        success: true,
                        token: "test-token-123",
                        user: { id: 1, username: "admin", role: "administrator" }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        error: "Invalid credentials"
                    });
                }
            } catch (error) {
                await this.logger.error("Login failed", { error: error.message });
                res.status(500).json({ error: "Authentication failed" });
            }
        });

        this.app.get("/api/auth/status", async (req, res) => {
            try {
                // Simple auth status check
                res.json({
                    authenticated: true,
                    user: { id: 1, username: "admin", role: "administrator" }
                });
            } catch (error) {
                res.status(500).json({ error: "Failed to check auth status" });
            }
        });

            try {
                const agent = await this.db.getAgent(req.params.id);
                if (!agent) {
                    return res.status(404).json({ error: 'Agent not found' });
                }
                
                // Get conversation history
                const history = await this.db.all(
                    'SELECT * FROM agent_conversation_history WHERE agent_id = ? AND conversation_id = ? ORDER BY timestamp ASC',
                    [agent.id, req.params.conversationId]
                );
                
                res.json(history);
            } catch (error) {
                await this.logger.error('Failed to get conversation history', { error: error.message });
                res.status(500).json({ error: 'Failed to retrieve conversation history' });
            }
        });

        // Get real-time runtime activity
        this.app.get('/api/agents/runtime/activity', async (req, res) => {
        // Serve static files from public directory
        this.app.use("/public", express.static(path.join(__dirname, "../../admin/public")));

        // Authentication endpoints
        this.app.post("/api/auth/login", async (req, res) => {
            try {
                const { username, password } = req.body;
                // Simple authentication for testing
                if (username === "admin" && password === "password") {
                    res.json({
                        success: true,
                        token: "test-token-123",
                        user: { id: 1, username: "admin", role: "administrator" }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        error: "Invalid credentials"
                    });
                }
            } catch (error) {
                await this.logger.error("Login failed", { error: error.message });
                res.status(500).json({ error: "Authentication failed" });
            }
        });

        this.app.get("/api/auth/status", async (req, res) => {
            try {
                // Simple auth status check
                res.json({
                    authenticated: true,
                    user: { id: 1, username: "admin", role: "administrator" }
                });
            } catch (error) {
                res.status(500).json({ error: "Failed to check auth status" });
            }
        });

            try {
                // Get from runtime monitor if available
                let activity = [];
                if (this.mcpServer && this.mcpServer.agentRuntimeMonitor) {
                    const limit = parseInt(req.query.limit) || 50;
                    activity = await this.mcpServer.agentRuntimeMonitor.getRecentActivity(limit);
                } else {
                    // Fallback to database
                    activity = await this.db.all(
                        'SELECT ara.*, a.name as agent_name FROM agent_runtime_activity ara JOIN agents a ON ara.agent_id = a.id ORDER BY ara.timestamp DESC LIMIT 50'
                    );
                }
                
                res.json(activity);
            } catch (error) {
                await this.logger.error('Failed to get runtime activity', { error: error.message });
                res.status(500).json({ error: 'Failed to retrieve runtime activity' });
            }
        });

        // === END NEW ENDPOINTS ===

    }

    async getOperationStats() {
        try {
            const totalOps = await this.db.get('SELECT COUNT(*) as count FROM mcp_operations');
            const successfulOps = await this.db.get('SELECT COUNT(*) as count FROM mcp_operations WHERE success = 1');
            const failedOps = await this.db.get('SELECT COUNT(*) as count FROM mcp_operations WHERE success = 0');
            const avgExecutionTime = await this.db.get('SELECT AVG(execution_time) as avg_time FROM mcp_operations WHERE execution_time IS NOT NULL');
            
            return {
                total: totalOps.count,
                successful: successfulOps.count,
                failed: failedOps.count,
                successRate: totalOps.count > 0 ? (successfulOps.count / totalOps.count * 100).toFixed(2) : 0,
                averageExecutionTime: avgExecutionTime.avg_time || 0
            };
        } catch (error) {
            await this.logger.error('Failed to get operation stats', { error: error.message });
            return { total: 0, successful: 0, failed: 0, successRate: 0, averageExecutionTime: 0 };
        }
    }

    async getLogStats() {
        try {
            const totalLogs = await this.db.get('SELECT COUNT(*) as count FROM logs');
            const errorLogs = await this.db.get('SELECT COUNT(*) as count FROM logs WHERE level = "error"');
            const warningLogs = await this.db.get('SELECT COUNT(*) as count FROM logs WHERE level = "warn"');
            
            return {
                total: totalLogs.count,
                errors: errorLogs.count,
                warnings: warningLogs.count,
                errorRate: totalLogs.count > 0 ? (errorLogs.count / totalLogs.count * 100).toFixed(2) : 0
            };
        } catch (error) {
            await this.logger.error('Failed to get log stats', { error: error.message });
            return { total: 0, errors: 0, warnings: 0, errorRate: 0 };
        }
    }

    async start() {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this.port, () => {
                console.log(`📊 Admin API server listening on port ${this.port}`);
                
                // Setup WebSocket server
                this.wss = new WebSocket.Server({ server: this.server });
                
                this.wss.on('connection', (ws) => {
                    console.log('🔌 WebSocket client connected');
                    
                    // Send initial status
                    this.sendAgentStatus(ws);
                    
                    // Handle messages from client
                    ws.on('message', async (message) => {
                        try {
                            const data = JSON.parse(message);
                            console.log('Received WebSocket message:', data);
                            
                            // Handle different message types
                            switch(data.type) {
                                case 'get_status':
                                    await this.sendAgentStatus(ws);
                                    break;
                                case 'refresh_agents':
                                    await this.sendAgentList(ws);
                                    break;
                            }
                        } catch (error) {
                            console.error('Error processing WebSocket message:', error);
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: 'Invalid message format'
                            }));
                        }
                    });
                    
                    ws.on('close', () => {
                        console.log('🔌 WebSocket client disconnected');
                    });
                });
                
                resolve();
            });
            
            this.server.on('error', (error) => {
                console.error('❌ Admin API server failed to start:', error);
                reject(error);
            });
        });
    }

    async sendAgentStatus(ws) {
        try {
            const agents = await this.db.all('SELECT * FROM agents');
            const activeAgents = agents.filter(agent => agent.is_active).length;
            const executions = await this.db.all('SELECT COUNT(*) as count FROM agent_executions');
            
            ws.send(JSON.stringify({
                type: 'agent_status',
                payload: {
                    total_agents: agents.length,
                    active_agents: activeAgents,
                    executions: executions[0].count
                }
            }));
        } catch (error) {
            console.error('Error sending agent status:', error);
        }
    }
    
    async sendAgentList(ws) {
        try {
            const agents = await this.db.all('SELECT * FROM agents');
            ws.send(JSON.stringify({
                type: 'agent_list',
                payload: agents
            }));
        } catch (error) {
            console.error('Error sending agent list:', error);
        }
    }
    
    async stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('🛑 Admin API server stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
    
    // Simulate Bengali Coding Assistant responses
    async simulateBengaliCodingAssistant(input, config) {
        // Simple response simulation based on input
        const responses = {
            'hello': 'ভাইয়া, আমি আপনার বাংলা কোডিং এসিস্ট্যান্ট! কিভাবে সাহায্য করতে পারি?',
            'code': 'আসুন কোড লিখি! আপনি কোন ভাষায় কোড লিখতে চান?',
            'bug': 'বাগ খুঁজে পেয়েছি! এটি সমাধান করার জন্য আমরা এইভাবে করতে পারি...',
            'help': 'আমি আপনাকে ক্লিন কোড লেখার জন্য সাহায্য করব। কোন বিষয়ে প্রশ্ন আছে?'
        };
        
        // Simple keyword matching
        let response = 'দুঃখিত, আমি এই প্রশ্নের উত্তর দিতে পারছি না। আরেকটু বিস্তারিত বলুন।';
        
        const inputLower = input.toLowerCase();
        for (const [key, value] of Object.entries(responses)) {
            if (inputLower.includes(key)) {
                response = value;
                break;
            }
        }
        
        // Add encouraging message
        if (config.temperature > 0.5) {
            response += ' \n\nভাইয়া, এই বিষয়ে আরও শেখার আছে! চলেন একসাথে কোড করি।';
        }
        
        return {
            response: response,
            tokens_used: Math.floor(input.length / 4),
            model_used: config.model
        };
    }
    
    // Simulate generic agent responses
    async simulateGenericAgent(input, config) {
        return {
            response: `Processed your request: ${input.substring(0, 100)}...`,
            tokens_used: Math.floor(input.length / 4),
            model_used: config.model
        };
    }
    
    // CPU monitoring method
    startCpuMonitoring() {
        setInterval(() => {
            try {
                const currentUsage = process.cpuUsage();
                const currentTime = process.hrtime();
                
                // Calculate time difference in microseconds
                const timeDiff = (currentTime[0] - this.lastTime[0]) * 1000000 + 
                               (currentTime[1] - this.lastTime[1]) / 1000;
                
                // Calculate CPU usage difference
                const userDiff = currentUsage.user - this.lastCpuUsage.user;
                const systemDiff = currentUsage.system - this.lastCpuUsage.system;
                const totalCpuDiff = userDiff + systemDiff;
                
                // Calculate CPU percentage (0-100)
                if (timeDiff > 0) {
                    this.currentCpuPercent = Math.min(100, Math.max(0, (totalCpuDiff / timeDiff) * 100));
                }
                
                // Update last values
                this.lastCpuUsage = currentUsage;
                this.lastTime = currentTime;
                
            } catch (error) {
                console.error('Error in CPU monitoring:', error);
                this.currentCpuPercent = 0;
            }
        }, 2000); // Update every 2 seconds
    }
}

module.exports = AdminAPI;