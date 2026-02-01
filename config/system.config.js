const path = require('path');

// Centralized system configuration
module.exports = {
    // Service ports configuration
    ports: {
        frontend: parseInt(process.env.FRONTEND_PORT) || 3001,
        backend: parseInt(process.env.BACKEND_PORT) || 8000,
        mcp_server: parseInt(process.env.MCP_SERVER_PORT) || 3002,
        websocket_mcp: parseInt(process.env.WEBSOCKET_MCP_PORT) || 8080,
        lsp_dap: parseInt(process.env.LSP_DAP_PORT) || 3004,
        database: parseInt(process.env.DATABASE_PORT) || 3306
    },
    
    // File system paths
    paths: {
        root: path.join(__dirname, '../'),
        docs: path.join(__dirname, '../docs'),
        mcp_client: path.join(__dirname, '../docs/mcp_client.html'),
        admin_panel: path.join(__dirname, '../'),
        mcp_server: path.join(__dirname, '../packages/zombiecoder-mcp-server'),
        websocket_mcp_server: path.join(__dirname, '../packages/mcp-server/websocket-mcp-server.js'),
        database: path.join(__dirname, '../server/database'),
        logs: path.join(__dirname, '../logs')
    },
    
    // Browser URLs to open
    browser: {
        urls: [
            `http://localhost:${process.env.FRONTEND_PORT || 3001}`,           // Admin Panel
            `http://localhost:${process.env.WEBSOCKET_MCP_PORT || 8080}/client`,    // MCP Client
            `http://localhost:${process.env.MCP_SERVER_PORT || 3002}/admin`,     // MCP Admin
            `http://localhost:${process.env.LSP_DAP_PORT || 3004}`            // LSP-DAP server
        ]
    },
    
    // Service configurations
    services: {
        frontend: {
            name: 'Frontend Admin Panel',
            path: path.join(__dirname, '../'),
            command: 'npm',
            args: ['run', 'dev'],
            port: parseInt(process.env.FRONTEND_PORT) || 3001,
            env: {
                PORT: process.env.FRONTEND_PORT || '3001',
                NODE_ENV: 'development'
            },
            readyIndicators: ['Local:', 'Ready', 'compiled successfully']
        },
        backend: {
            name: 'Backend API Server',
            path: path.join(__dirname, '../server'),
            command: 'npm',
            args: ['run', 'dev'],
            port: parseInt(process.env.BACKEND_PORT) || 8000,
            env: {
                PORT: process.env.BACKEND_PORT || '8000',
                NODE_ENV: 'development'
            },
            readyIndicators: ['listening', 'running', 'server started']
        },
        mcp_server: {
            name: 'MCP Server',
            path: path.join(__dirname, '../packages/zombiecoder-mcp-server'),
            command: 'npm',
            args: ['run', 'dev'],
            port: parseInt(process.env.MCP_SERVER_PORT) || 3002,
            env: {
                NODE_ENV: 'development',
                ADMIN_PORT: process.env.MCP_SERVER_PORT || '3002'
            },
            readyIndicators: ['ready', 'listening', 'MCP server started']
        },
        websocket_mcp: {
            name: 'WebSocket MCP Server',
            path: path.join(__dirname, '../packages/mcp-server'),
            command: 'node',
            args: ['websocket-mcp-server.js'],
            port: parseInt(process.env.WEBSOCKET_MCP_PORT) || 8080,
            env: {
                NODE_ENV: 'development'
            },
            readyIndicators: ['WebSocket server listening', 'ready', 'started']
        },
        lsp_dap: {
            name: 'LSP-DAP Server',
            path: path.join(__dirname, '../packages/lsp-dap'),
            command: 'node',
            args: ['--inspect=0.0.0.0:3004', 'src/index.js', '--stdio'],
            port: parseInt(process.env.LSP_DAP_PORT) || 3004,
            env: {
                NODE_ENV: 'development'
            },
            readyIndicators: ['LSP-DAP server listening', 'ready', 'initialized', 'connection', 'listening for connections']
        }
    },
    
    // Health check endpoints
    healthChecks: {
        frontend: `http://localhost:${process.env.FRONTEND_PORT || 3001}/api/health`,
        backend: `http://localhost:${process.env.BACKEND_PORT || 8000}/health`,
        mcp_server: `http://localhost:${process.env.MCP_SERVER_PORT || 3002}/api/health`,
        lsp_dap: `http://localhost:${process.env.LSP_DAP_PORT || 3004}/health`
    },
    
    // Protected processes that should not be terminated
    protectedProcesses: {
        editors: ['code', 'cursor', 'zed', 'sublime', 'atom', 'vscode', 'webstorm', 'intellij', 'phpstorm'],
        browsers: ['chrome', 'firefox', 'safari', 'edge'],
        development: ['npm', 'yarn', 'pnpm', 'node']
    },
    
    // Session and persistence settings
    persistence: {
        sessionExpiryDays: 5,
        autoSaveInterval: 30000, // 30 seconds
        maxMessageHistory: 100,
        localStoragePrefix: 'mcp_'
    },
    
    // Development mode settings
    development: {
        editorProtection: true,
        verboseLogging: true,
        autoRestart: false
    }
};