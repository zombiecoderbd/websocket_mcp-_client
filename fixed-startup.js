#!/usr/bin/env node

// 🛠️ FIXED SYSTEM STARTUP SCRIPT
// This script properly handles port conflicts and service initialization

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// System configuration
const CONFIG = {
    ports: {
        frontend: 3500,
        backend: 8000,
        mcp_server: 3002,
        websocket_mcp: 8080,
        database: 3306
    },
    
    services: {
        backend: {
            name: 'Backend API Server',
            path: '/home/sahon/admin/server',
            command: 'npm',
            args: ['run', 'dev'],
            port: 8000,
            env: { PORT: '8000', NODE_ENV: 'development' },
            readyIndicators: ['listening', 'running', 'server started', 'database connected']
        },
        frontend: {
            name: 'Frontend Admin Panel',
            path: '/home/sahon/admin',
            command: 'npm',
            args: ['run', 'dev'],
            port: 3500,
            env: { PORT: '3500', NODE_ENV: 'development' },
            readyIndicators: ['Local:', 'Ready', 'compiled successfully']
        },
        mcp_server: {
            name: 'MCP Server',
            path: '/home/sahon/admin/packages/zombiecoder-mcp-server',
            command: 'npm',
            args: ['run', 'dev'],
            port: 3002,
            env: { NODE_ENV: 'development', ADMIN_PORT: '3002' },
            readyIndicators: ['ready', 'listening', 'MCP server started']
        },
        websocket_mcp: {
            name: 'WebSocket MCP Server',
            path: '/home/sahon/admin/packages/mcp-server',
            command: 'node',
            args: ['websocket-mcp-server.js'],
            port: 8080,
            env: { 
                NODE_ENV: 'development',
                DB_HOST: process.env.DB_HOST || 'localhost',
                DB_USER: process.env.DB_USER || 'u-root',
                DB_PASSWORD: process.env.DB_PASSWORD || 'p-105585',
                DB_NAME: process.env.DB_NAME || 'uas_admin'
            },
            readyIndicators: ['WebSocket server listening', 'ready', 'started', 'Database connected successfully']
        }
    }
};

// Utility functions
const utils = {
    log: (message, type = 'info') => {
        const timestamp = new Date().toISOString();
        const colors = {
            info: '\x1b[36m',
            success: '\x1b[32m',
            warning: '\x1b[33m',
            error: '\x1b[31m',
            reset: '\x1b[0m'
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
    cleanAllPorts: async () => {
        utils.log('Cleaning all required ports...', 'info');
        
        // Kill all existing Node.js processes first to prevent conflicts
        try {
            const { stdout } = await utils.execPromise('ps aux | grep -E "(node|next|npm)" | grep -v grep | awk \'{print $2}\'');
            const pids = stdout.trim().split('\n').filter(pid => pid && !isNaN(pid));
            
            for (const pid of pids) {
                try {
                    process.kill(pid, 'SIGTERM');
                    await utils.wait(500);
                    utils.log(`Terminated process ${pid}`, 'info');
                } catch (e) {
                    // Process already terminated
                }
            }
        } catch (error) {
            utils.log('No existing Node processes to terminate', 'info');
        }
        
        // Wait for processes to fully terminate
        await utils.wait(3000);
        
        // Clean specific ports
        for (const [name, port] of Object.entries(CONFIG.ports)) {
            utils.log(`Cleaning port ${port} (${name})...`, 'info');
            await utils.killPortProcesses(port);
        }
        
        utils.log('All ports cleaned successfully!', 'success');
        await utils.wait(2000);
    },
    
    startService: async (serviceName, serviceConfig) => {
        utils.log(`Starting ${serviceConfig.name}...`, 'info');
        
        // Check if port is already in use
        const portInUse = await utils.isPortInUse(serviceConfig.port);
        if (portInUse) {
            utils.log(`Port ${serviceConfig.port} is already in use. Cleaning...`, 'warning');
            await utils.killPortProcesses(serviceConfig.port);
            await utils.wait(1000);
        }
        
        const env = {
            ...process.env,
            ...serviceConfig.env,
            CUSTOM_HEADERS: JSON.stringify({
                'X-Powered-By': 'Fixed-UAS-System',
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
                utils.log(`${serviceConfig.name} is ready on port ${serviceConfig.port}!`, 'success');
            }
            
            // Only log non-ready messages to avoid spam
            if (!isReady && output.trim()) {
                console.log(`[${serviceName}] ${output.trim()}`);
            }
        });
        
        serviceProcess.stderr.on('data', (data) => {
            const errorOutput = data.toString();
            // Filter out common warnings
            if (!errorOutput.includes('MaxListenersExceededWarning') && 
                !errorOutput.includes('ExperimentalWarning')) {
                console.error(`[${serviceName} Error] ${errorOutput}`);
            }
        });
        
        return serviceProcess;
    },
    
    verifyServices: async () => {
        utils.log('Verifying service status...', 'info');
        let allReady = true;
        
        for (const [serviceName, serviceConfig] of Object.entries(CONFIG.services)) {
            try {
                const portInUse = await utils.isPortInUse(serviceConfig.port);
                
                if (!portInUse) {
                    utils.log(`${serviceName}: Port ${serviceConfig.port} not listening`, 'error');
                    allReady = false;
                    continue;
                }
                
                utils.log(`${serviceName}: Running on port ${serviceConfig.port}`, 'success');
            } catch (error) {
                utils.log(`${serviceName}: Not responding`, 'error');
                allReady = false;
            }
        }
        
        return allReady;
    },
    
    displayStatus: () => {
        console.log('\n' + '='.repeat(70));
        utils.log('FIXED UAS SYSTEM STATUS', 'success');
        console.log('='.repeat(70));
        console.log(`Frontend Admin Panel:  http://localhost:${CONFIG.ports.frontend}`);
        console.log(`Backend API Server:    http://localhost:${CONFIG.ports.backend}`);
        console.log(`MCP Server:            http://localhost:${CONFIG.ports.mcp_server}/admin`);
        console.log(`WebSocket MCP Server:  http://localhost:${CONFIG.ports.websocket_mcp}`);
        console.log(`WebSocket Client:      http://localhost:${CONFIG.ports.websocket_mcp}/client`);
        console.log('='.repeat(70));
        console.log('\n💡 To stop all services, press Ctrl+C');
        console.log('📁 Documentation: /home/sahon/admin/docs/MASTER_DOCUMENTATION_INDEX.md');
    },
    
    setupShutdownHandler: (processes) => {
        const shutdown = async () => {
            utils.log('Shutting down system...', 'warning');
            
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
    utils.log('🔧 FIXING AND STARTING UAS SYSTEM', 'success');
    console.log('='.repeat(50));
    
    try {
        // Step 1: Clean all ports thoroughly
        await system.cleanAllPorts();
        
        // Step 2: Start services in proper sequence
        utils.log('Starting services in sequence...', 'info');
        const runningProcesses = {};
        
        // Start backend first (critical for database initialization)
        utils.log('Starting backend (this may take a moment for database setup)...', 'info');
        runningProcesses.backend = await system.startService('backend', CONFIG.services.backend);
        await utils.wait(8000); // Wait longer for database initialization
        
        // Start frontend
        runningProcesses.frontend = await system.startService('frontend', CONFIG.services.frontend);
        await utils.wait(5000);
        
        // Start MCP server
        runningProcesses.mcp_server = await system.startService('mcp_server', CONFIG.services.mcp_server);
        await utils.wait(3000);
        
        // Start WebSocket MCP server
        runningProcesses.websocket_mcp = await system.startService('websocket_mcp', CONFIG.services.websocket_mcp);
        
        // Step 3: Wait for services to stabilize
        utils.log('Waiting for services to stabilize...', 'info');
        await utils.wait(3000);
        
        // Step 4: Verify services
        const servicesReady = await system.verifyServices();
        
        // Step 5: Display final status
        system.displayStatus();
        
        if (servicesReady) {
            utils.log('✅ ALL SERVICES STARTED SUCCESSFULLY!', 'success');
            utils.log('Your fixed UAS System is now operational.', 'success');
        } else {
            utils.log('⚠️  Some services may need additional time to start.', 'warning');
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
    utils.log(`Unhandled Rejection: ${reason}`, 'error');
    process.exit(1);
});

// Start the system
start().catch(console.error);