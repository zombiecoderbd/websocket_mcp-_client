#!/usr/bin/env node

// 🧟‍♂️ ZombieCoder Complete System Startup Script
// This script starts all required servers in proper sequence with port cleaning

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Define ports for different services
const ports = {
    admin: 3001,        // Next.js frontend (changed from 3000)
    backend: 8000,      // Express backend
    mcp_admin: 3002,    // MCP Admin API
    websocket: 3003,    // WebSocket server
    websocket_mcp: 8080 // WebSocket MCP server
};

// Function to execute command with promise
function execPromise(command) {
    return new Promise((resolve, reject) => {
        exec(command, { shell: true }, (error, stdout, stderr) => {
            if (error) {
                reject({ error, stdout, stderr });
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}

// Wait function
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if port is in use
async function isPortInUse(port) {
    const isWindows = process.platform === 'win32';
    try {
        const command = isWindows 
            ? `netstat -an | findstr :${port}`
            : `lsof -i :${port} | grep LISTEN`;
        
        const result = await execPromise(command);
        return result.stdout.trim().length > 0;
    } catch (error) {
        return false;
    }
}

// Kill processes on specific port
async function killPortProcesses(port) {
    console.log(`🔍 Checking processes on port ${port}...`);
    const isWindows = process.platform === 'win32';
    
    try {
        if (isWindows) {
            // Windows command to kill processes
            const { stdout } = await execPromise(`netstat -ano | findstr :${port}`);
            const lines = stdout.trim().split('\n').filter(line => line.includes('LISTENING'));
            
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                const pid = parts[parts.length - 1];
                if (pid && !isNaN(pid)) {
                    try {
                        await execPromise(`taskkill /PID ${pid} /F`);
                        console.log(`🔪 Killed process ${pid} on port ${port}`);
                    } catch (e) {
                        console.log(`Process ${pid} already terminated`);
                    }
                }
            }
        } else {
            // Linux/Mac command
            const { stdout } = await execPromise(`lsof -i :${port} | grep LISTEN | awk '{print $2}'`);
            const pids = stdout.trim().split('\n').filter(pid => pid && !isNaN(pid));
            
            for (const pid of pids) {
                try {
                    process.kill(pid, 'SIGTERM');
                    await wait(1000);
                    try {
                        process.kill(pid, 'SIGKILL');
                    } catch (e) {
                        // Process already terminated
                    }
                    console.log(`🔪 Killed process ${pid} on port ${port}`);
                } catch (e) {
                    console.log(`Process ${pid} already terminated`);
                }
            }
        }
    } catch (error) {
        console.log(`No processes found on port ${port} or error occurred`);
    }
}

// Clean all required ports
async function cleanAllPorts() {
    console.log('🧹 Cleaning all required ports...');
    
    for (const [name, port] of Object.entries(ports)) {
        console.log(`\n🧹 Cleaning port ${port} (${name})...`);
        await killPortProcesses(port);
    }
    
    // Additional cleanup for common development ports
    const extraPorts = [3001, 56510]; // Editor conflicts and Qoder ports
    for (const port of extraPorts) {
        await killPortProcesses(port);
    }
    
    console.log('✅ Port cleaning completed!\n');
    await wait(3000); // Wait for processes to fully terminate
}

// Start Next.js Frontend
async function startFrontend() {
    console.log('🎨 Starting Next.js Frontend...');
    
    const frontendProcess = spawn('npm', ['run', 'dev'], {
        cwd: '/home/sahon/admin',
        stdio: 'pipe',
        env: {
            ...process.env,
            PORT: '3001',
            CUSTOM_HEADERS: JSON.stringify({
                'X-Powered-By': 'ZombieCoder-by-SahonSrabon',
                'X-Security': 'Local-Integration'
            })
        }
    });

    frontendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Local:') || output.includes('Ready')) {
            console.log('✅ Frontend ready!');
        }
        console.log(`[Frontend] ${output}`);
    });

    frontendProcess.stderr.on('data', (data) => {
        console.error(`[Frontend Error] ${data}`);
    });

    return frontendProcess;
}

// Start Backend Server
async function startBackend() {
    console.log('🚀 Starting Backend Server...');
    
    const backendProcess = spawn('npm', ['run', 'dev'], {
        cwd: '/home/sahon/admin/server',
        stdio: 'pipe',
        env: {
            ...process.env,
            PORT: '8000',
            NODE_ENV: 'development',
            CUSTOM_HEADERS: JSON.stringify({
                'X-Powered-By': 'ZombieCoder-by-SahonSrabon',
                'X-Security': 'Local-Integration'
            })
        }
    });

    backendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('listening') || output.includes('running')) {
            console.log('✅ Backend server ready!');
        }
        console.log(`[Backend] ${output}`);
    });

    backendProcess.stderr.on('data', (data) => {
        console.error(`[Backend Error] ${data}`);
    });

    return backendProcess;
}

// Start MCP Server
async function startMCPServer() {
    console.log('🧟‍♂️ Starting MCP Server...');
    
    const mcpProcess = spawn('node', ['/home/sahon/mcp-server/zombiecoder-mcp-server/src/index.js'], {
        stdio: 'pipe',
        env: {
            ...process.env,
            NODE_ENV: 'production',
            ADMIN_PORT: '3002',
            WEBSOCKET_PORT: '3003',
            CUSTOM_HEADERS: JSON.stringify({
                'X-Powered-By': 'ZombieCoder-by-SahonSrabon',
                'X-Security': 'Local-Integration'
            })
        }
    });

    mcpProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('ready') || output.includes('listening')) {
            console.log('✅ MCP Server ready!');
        }
        console.log(`[MCP Server] ${output}`);
    });

    mcpProcess.stderr.on('data', (data) => {
        console.error(`[MCP Server Error] ${data}`);
    });

    return mcpProcess;
}

// Start WebSocket MCP Server
async function startWebSocketMCPServer() {
    console.log('🔌 Starting WebSocket MCP Server...');
    
    const wsProcess = spawn('node', ['/home/sahon/admin/temp/websocket-mcp-server.js'], {
        stdio: 'pipe',
        env: {
            ...process.env,
            CUSTOM_HEADERS: JSON.stringify({
                'X-Powered-By': 'ZombieCoder-by-SahonSrabon',
                'X-Security': 'Local-Integration'
            })
        }
    });

    wsProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('listening') || output.includes('ready')) {
            console.log('✅ WebSocket MCP Server ready!');
        }
        console.log(`[WebSocket MCP] ${output}`);
    });

    wsProcess.stderr.on('data', (data) => {
        console.error(`[WebSocket MCP Error] ${data}`);
    });

    return wsProcess;
}

// Open URLs in browser
async function openInBrowser() {
    console.log('\n🌐 Opening URLs in browser...');
    
    const urls = [
        `http://localhost:${ports.admin}`,           // Admin Panel
        `http://localhost:${ports.websocket_mcp}`,   // WebSocket Client
        `http://localhost:${ports.mcp_admin}/admin`  // MCP Admin
    ];

    for (const url of urls) {
        try {
            const isWindows = process.platform === 'win32';
            if (isWindows) {
                await execPromise(`start ${url}`);
            } else if (process.platform === 'darwin') {
                await execPromise(`open ${url}`);
            } else {
                await execPromise(`xdg-open ${url}`);
            }
            console.log(`✅ Opened: ${url}`);
            await wait(1000); // Small delay between openings
        } catch (error) {
            console.log(`⚠️  Could not open ${url} automatically`);
            console.log(`   Please manually visit: ${url}`);
        }
    }
}

// Verify services are running
async function verifyServices() {
    console.log('\n🔍 Verifying service status...');
    
    const checks = [
        { name: 'Frontend', url: `http://localhost:${ports.admin}/api/health`, port: ports.admin },
        { name: 'Backend', url: `http://localhost:${ports.backend}/health`, port: ports.backend },
        { name: 'MCP Admin', url: `http://localhost:${ports.mcp_admin}/api/health`, port: ports.mcp_admin }
    ];

    let allReady = true;
    
    for (const check of checks) {
        try {
            // First check if port is listening
            const portInUse = await isPortInUse(check.port);
            if (!portInUse) {
                console.log(`❌ ${check.name}: Port ${check.port} not listening`);
                allReady = false;
                continue;
            }
            
            // Then try HTTP check
            const { stdout } = await execPromise(`curl -s -m 5 ${check.url} 2>/dev/null || echo "ERROR"`);
            if (stdout.trim() !== "ERROR" && stdout.includes('"status"')) {
                console.log(`✅ ${check.name}: Running and responding`);
            } else {
                console.log(`⚠️  ${check.name}: Port listening but not responding properly`);
            }
        } catch (error) {
            console.log(`❌ ${check.name}: Not responding`);
            allReady = false;
        }
    }
    
    return allReady;
}

// Display system status
function displayStatus() {
    console.log('\n' + '='.repeat(60));
    console.log('🧟‍♂️ ZOMBIECODER SYSTEM STATUS');
    console.log('='.repeat(60));
    console.log(`Frontend Admin:    http://localhost:${ports.admin} (পোর্ট 3000 থেকে 3001 এ পরিবর্তন করা হয়েছে)`);
    console.log(`Backend API:       http://localhost:${ports.backend}`);
    console.log(`MCP Admin:         http://localhost:${ports.mcp_admin}/admin`);
    console.log(`WebSocket MCP:     http://localhost:${ports.websocket_mcp}`);
    console.log(`WebSocket Client:  http://localhost:${ports.websocket_mcp}`);
    console.log('='.repeat(60));
    console.log('\n💡 To stop all services, press Ctrl+C');
}

// Graceful shutdown
function setupShutdownHandler(frontendProcess, backendProcess, mcpProcess, wsProcess) {
    const processes = [frontendProcess, backendProcess, mcpProcess, wsProcess];
    
    const shutdown = async () => {
        console.log('\n🛑 Shutting down ZombieCoder system...');
        
        for (const process of processes) {
            if (process && !process.killed) {
                try {
                    console.log(`Stopping process ${process.pid}...`);
                    process.kill('SIGTERM');
                    await wait(1000);
                    process.kill('SIGKILL');
                } catch (error) {
                    console.log(`Process ${process.pid} already stopped`);
                }
            }
        }
        
        console.log('✅ All services stopped');
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

// Main startup sequence
async function start() {
    console.log('🧟‍♂️ ZOMBIECODER COMPLETE SYSTEM STARTUP');
    console.log('=====================================');
    
    try {
        // Step 1: Clean all ports
        await cleanAllPorts();
        
        // Step 2: Start services in proper sequence
        console.log('🚀 Starting services in sequence...\n');
        
        // Start backend first (foundation)
        const backendProcess = await startBackend();
        await wait(3000); // Let backend initialize
        
        // Start frontend
        const frontendProcess = await startFrontend();
        await wait(2000); // Let frontend initialize
        
        // Start MCP server
        const mcpProcess = await startMCPServer();
        await wait(2000); // Let MCP initialize
        
        // Start WebSocket MCP server
        const wsProcess = await startWebSocketMCPServer();
        
        // Step 3: Wait for services to stabilize
        console.log('\n⏳ Waiting for services to stabilize...');
        await wait(5000);
        
        // Step 4: Verify services
        const servicesReady = await verifyServices();
        
        // Step 5: Open in browser
        await openInBrowser();
        
        // Step 6: Display final status
        displayStatus();
        
        if (servicesReady) {
            console.log('\n🎉 ALL SERVICES STARTED SUCCESSFULLY!');
            console.log('Your ZombieCoder system is now fully operational.');
        } else {
            console.log('\n⚠️  Some services may need additional time to start.');
            console.log('Check the logs above for any errors.');
        }
        
        // Setup shutdown handler
        setupShutdownHandler(frontendProcess, backendProcess, mcpProcess, wsProcess);
        
    } catch (error) {
        console.error('❌ Startup failed:', error.message);
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the system
start().catch(console.error);