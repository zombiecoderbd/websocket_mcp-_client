#!/usr/bin/env node

// 🚀 UNIFIED SYSTEM STARTUP SCRIPT
// This script starts the complete UAS Admin System with enhanced features
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
// System configuration
const CONFIG = {
    // Service ports
    ports: {
        frontend: 3001,      // Next.js admin panel
        backend: 8000,       // Express API server
        mcp_server: 3002,    // MCP server
        websocket: 3003,     // WebSocket server
        websocket_mcp: 8080, // WebSocket MCP server
        database: 3306       // MySQL database
    },
    
    // Service configurations
    services: {
        frontend: {
            name: 'Frontend Admin Panel',
            path: '/home/sahon/admin',
            command: 'npm',
            args: ['run', 'dev'],
            port: 3001,
            env: {
                PORT: '3001',
                NODE_ENV: 'development'
            },
            readyIndicators: ['Local:', 'Ready', 'compiled successfully']
        },
        backend: {
            name: 'Backend API Server',
            path: '/home/sahon/admin/server',
            command: 'npm',
            args: ['run', 'dev'],
            port: 8000,
            env: {
                PORT: '8000',
                NODE_ENV: 'development'
            },
            readyIndicators: ['listening', 'running', 'server started']
        },
        mcp_server: {
            name: 'MCP Server',
            path: '/home/sahon/admin/packages/mcp-server',
            command: 'npm',
            args: ['run', 'dev'],
            port: 3002,
            env: {
                NODE_ENV: 'development',
                ADMIN_PORT: '3002'
            },
            readyIndicators: ['ready', 'listening', 'MCP server started']
        },
        websocket_mcp: {
            name: 'WebSocket MCP Server',
            path: '/home/sahon/admin/packages/mcp-server',
            command: 'node',
            args: ['websocket-mcp-server.js'],
            port: 8080,
            env: {
                NODE_ENV: 'development'
            },
            readyIndicators: ['WebSocket server listening', 'ready', 'started']
        }
    },
    
    // Health check endpoints
    healthChecks: {
        frontend: `http://localhost:3001/api/health`,
        backend: `http://localhost:8000/health`,
        mcp_server: `http://localhost:3002/api/health`
    },
    
    // Browser URLs to open
    browserUrls: [
        `http://localhost:3001`,           // Admin Panel
        `http://localhost:8080/client`,    // WebSocket Client
        `http://localhost:3002/admin`      // MCP Admin
    ]
};

// Utility functions
const utils = {
    log: (message, type = 'info') => {
        const timestamp = new Date().toISOString();
        const colors = {
            info: '\x1b[36m',    // Cyan
            success: '\x1b[32m', // Green
            warning: '\x1b[33m', // Yellow
            error: '\x1b[31m',   // Red
            reset: '\x1b[0m'     // Reset
        };
        
        console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
    },
    
    execPromise: (command) => {
        return new Promise((resolve, reject) => {
            exec(command, { shell: true }, (error, stdout, stderr) => {
                if (error) {
                    reject({ error, stdout, stderr });
                } else {
                    resolve({ stdout, stderr });
                }
            });
        });
    },
    
    wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
    
    isPortInUse: async (port) => {
        try {
            const command = os.platform() === 'win32' 
                ? `netstat -an | findstr :${port}`
                : `lsof -i :${port} | grep LISTEN`;
            
            const result = await utils.execPromise(command);
            return result.stdout.trim().length > 0;
        } catch (error) {
            return false;
        }
    },
    
    killPortProcesses: async (port) => {
        utils.log(`Checking processes on port ${port}...`, 'info');
        const isWindows = os.platform() === 'win32';
        
        try {
            if (isWindows) {
                const { stdout } = await utils.execPromise(`netstat -ano | findstr :${port}`);
                const lines = stdout.trim().split('\n').filter(line => line.includes('LISTENING'));
                
                for (const line of lines) {
                    const parts = line.trim().split(/\s+/);
                    const pid = parts[parts.length - 1];
                    if (pid && !isNaN(pid)) {
                        try {
                            await utils.execPromise(`taskkill /PID ${pid} /F`);
                            utils.log(`Killed process ${pid} on port ${port}`, 'success');
                        } catch (e) {
                            utils.log(`Process ${pid} already terminated`, 'warning');
                        }
                    }
                }
            } else {
                const { stdout } = await utils.execPromise(`lsof -i :${port} | grep LISTEN | awk '{print $2}'`);
                const pids = stdout.trim().split('\n').filter(pid => pid && !isNaN(pid));
                
                for (const pid of pids) {
                    try {
                        process.kill(pid, 'SIGTERM');
                        await utils.wait(1000);
                        try {
                            process.kill(pid, 'SIGKILL');
                        } catch (e) {
                            // Process already terminated
                        }
                        utils.log(`Killed process ${pid} on port ${port}`, 'success');
                    } catch (e) {
                        utils.log(`Process ${pid} already terminated`, 'warning');
                    }
                }
            }
        } catch (error) {
            utils.log(`No processes found on port ${port}`, 'info');
        }
    }
};

// System management functions
const system = {
    cleanPorts: async () => {
        utils.log('Cleaning all required ports...', 'info');
        
        // Kill all Node.js and Next.js processes first
        try {
            utils.log('Killing existing Node.js and Next.js processes...', 'info');
            await utils.execPromise('pkill -f "node.*dev" 2>/dev/null || true');
            await utils.execPromise('pkill -f "next dev" 2>/dev/null || true');
            await utils.execPromise('pkill -f "next-server" 2>/dev/null || true');
            await utils.execPromise('pkill -f "nodemon" 2>/dev/null || true');
            await utils.wait(2000);
        } catch (error) {
            utils.log('No existing Node processes to terminate', 'info');
        }
        
        // Clean specific ports
        for (const [name, port] of Object.entries(CONFIG.ports)) {
            utils.log(`Cleaning port ${port} (${name})...`, 'info');
            await utils.killPortProcesses(port);
        }
        
        // Additional cleanup for common development ports
        const extraPorts = [3001, 56510]; // Frontend and Qoder ports
        for (const port of extraPorts) {
            await utils.killPortProcesses(port);
        }
        
        // Wait for processes to fully terminate
        await utils.wait(3000);
        
        utils.log('Port cleaning completed!', 'success');
    },
    
    startService: async (serviceName, serviceConfig) => {
        utils.log(`Starting ${serviceConfig.name}...`, 'info');
        
        const env = {
            ...process.env,
            ...serviceConfig.env,
            CUSTOM_HEADERS: JSON.stringify({
                'X-Powered-By': 'UAS-Admin-System',
                'X-Security': 'Local-Integration'
            })
        };
        
        const serviceProcess = spawn(serviceConfig.command, serviceConfig.args, {
            cwd: serviceConfig.path,
            stdio: 'pipe',
            env: env
        });
        
        serviceProcess.stdout.on('data', (data) => {
            const output = data.toString();
            const isReady = serviceConfig.readyIndicators.some(indicator => 
                output.toLowerCase().includes(indicator.toLowerCase())
            );
            
            if (isReady) {
                utils.log(`${serviceConfig.name} is ready!`, 'success');
            }
            
            // Only log non-ready messages to avoid spam
            if (!isReady && output.trim()) {
                console.log(`[${serviceName}] ${output.trim()}`);
            }
        });
        
        serviceProcess.stderr.on('data', (data) => {
            console.error(`[${serviceName} Error] ${data}`);
        });
        
        return serviceProcess;
    },
    
    verifyServices: async () => {
        utils.log('Verifying service status...', 'info');
        let allReady = true;
        
        for (const [serviceName, url] of Object.entries(CONFIG.healthChecks)) {
            try {
                const port = CONFIG.ports[serviceName];
                const portInUse = await utils.isPortInUse(port);
                
                if (!portInUse) {
                    utils.log(`${serviceName}: Port ${port} not listening`, 'error');
                    allReady = false;
                    continue;
                }
                
                const { stdout } = await utils.execPromise(`curl -s -m 5 ${url} 2>/dev/null || echo "ERROR"`);
                if (stdout.trim() !== "ERROR" && stdout.includes('"status"')) {
                    utils.log(`${serviceName}: Running and responding`, 'success');
                } else {
                    utils.log(`${serviceName}: Port listening but not responding properly`, 'warning');
                }
            } catch (error) {
                utils.log(`${serviceName}: Not responding`, 'error');
                allReady = false;
            }
        }
        
        return allReady;
    },
    
    openBrowser: async () => {
        utils.log('Opening URLs in browser...', 'info');
        
        for (const url of CONFIG.browserUrls) {
            try {
                let command;
                if (os.platform() === 'win32') {
                    command = `start ${url}`;
                } else if (os.platform() === 'darwin') {
                    command = `open ${url}`;
                } else {
                    command = `xdg-open ${url}`;
                }
                
                await utils.execPromise(command);
                utils.log(`Opened: ${url}`, 'success');
                await utils.wait(1000);
            } catch (error) {
                utils.log(`Could not open ${url} automatically`, 'warning');
                utils.log(`Please manually visit: ${url}`, 'info');
            }
        }
    },
    
    displayStatus: () => {
        console.log('\n' + '='.repeat(70));
        utils.log('UNIFIED UAS ADMIN SYSTEM STATUS', 'success');
        console.log('='.repeat(70));
        console.log(`Frontend Admin Panel:  http://localhost:${CONFIG.ports.frontend}`);
        console.log(`Backend API Server:    http://localhost:${CONFIG.ports.backend}`);
        console.log(`MCP Server:            http://localhost:${CONFIG.ports.mcp_server}/admin`);
        console.log(`WebSocket MCP Server:  http://localhost:${CONFIG.ports.websocket_mcp}`);
        console.log(`WebSocket Client:      http://localhost:${CONFIG.ports.websocket_mcp}/client`);
        console.log('='.repeat(70));
        console.log('\n💡 To stop all services, press Ctrl+C');
        console.log('📁 Documentation:      /home/sahon/admin/docs/MASTER_DOCUMENTATION_INDEX.md');
    },
    
    setupShutdownHandler: (processes) => {
        const shutdown = async () => {
            utils.log('Shutting down UAS system...', 'warning');
            
            for (const [name, process] of Object.entries(processes)) {
                if (process && !process.killed) {
                    try {
                        utils.log(`Stopping ${name} process ${process.pid}...`, 'info');
                        process.kill('SIGTERM');
                        await utils.wait(1000);
                        process.kill('SIGKILL');
                    } catch (error) {
                        utils.log(`${name} process ${process.pid} already stopped`, 'warning');
                    }
                }
            }
            
            utils.log('All services stopped', 'success');
            process.exit(0);
        };
        
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }
};

// Main startup sequence
async function start() {
    utils.log('🚀 UNIFIED UAS ADMIN SYSTEM STARTUP', 'success');
    console.log('='.repeat(50));
    
    try {
        // Step 1: Clean all ports
        await system.cleanPorts();
        
        // Step 2: Start services in proper sequence
        utils.log('Starting services in sequence...', 'info');
        const runningProcesses = {};
        
        // Start backend first (foundation)
        runningProcesses.backend = await system.startService('backend', CONFIG.services.backend);
        await utils.wait(5000); // Wait longer for database initialization and dynamic config service
        
        // Start frontend
        runningProcesses.frontend = await system.startService('frontend', CONFIG.services.frontend);
        await utils.wait(3000);
        
        // Start MCP server
        runningProcesses.mcp_server = await system.startService('mcp_server', CONFIG.services.mcp_server);
        await utils.wait(2000);
        
        // Start WebSocket MCP server
        runningProcesses.websocket_mcp = await system.startService('websocket_mcp', CONFIG.services.websocket_mcp);
        
        // Step 3: Wait for services to stabilize
        utils.log('Waiting for services to stabilize...', 'info');
        await utils.wait(5000);
        
        // Step 4: Verify services
        const servicesReady = await system.verifyServices();
        
        // Step 5: Open in browser
        await system.openBrowser();
        
        // Step 6: Display final status
        system.displayStatus();
        
        if (servicesReady) {
            utils.log('ALL SERVICES STARTED SUCCESSFULLY!', 'success');
            utils.log('Your UAS Admin System is now fully operational.', 'success');
        } else {
            utils.log('Some services may need additional time to start.', 'warning');
            utils.log('Check the logs above for any errors.', 'info');
        }
        
        // Setup shutdown handler
        system.setupShutdownHandler(runningProcesses);
        
    } catch (error) {
        utils.log(`Startup failed: ${error.message}`, 'error');
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    utils.log(`Uncaught Exception: ${error}`, 'error');
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    utils.log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'error');
    process.exit(1);
});

// Start the system
start().catch(console.error);