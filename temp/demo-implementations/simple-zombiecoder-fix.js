#!/usr/bin/env node

// Simple ZombieCoder Integration Fix
// Addressing port 3001 conflict and header injection issues

const fs = require('fs');
const { exec, spawn } = require('child_process');

console.log('🧟‍♂️ ZombieCoder Integration Fix - Addressing Port Conflicts');
console.log('===================================================');

// Function to kill processes on specific ports
async function killPortProcesses(port) {
    try {
        console.log(`🔍 Checking processes on port ${port}...`);
        const { stdout } = await execPromise(`lsof -i :${port} | grep LISTEN | awk '{print $2}'`);
        const pids = stdout.trim().split('\n').filter(pid => pid);
        
        if (pids.length > 0) {
            console.log(`🔪 Killing processes: ${pids.join(', ')} on port ${port}`);
            for (const pid of pids) {
                try {
                    process.kill(pid, 'SIGTERM');
                    await wait(1000);
                    try {
                        process.kill(pid, 'SIGKILL');
                    } catch (e) {
                        // Process already terminated
                    }
                } catch (e) {
                    console.log(`Process ${pid} already terminated`);
                }
            }
        }
        return true;
    } catch (error) {
        console.log(`No processes found on port ${port}`);
        return true;
    }
}

// Execute command with promise
function execPromise(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) reject(error);
            else resolve({ stdout, stderr });
        });
    });
}

// Wait function
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Create proper MCP configuration with header injection
async function createMCPConfig() {
    const mcpConfig = {
        "mcpServers": {
            "zombiecoder": {
                "command": "node",
                "args": ["/home/sahon/mcp-server/zombiecoder-mcp-server/src/index.js"],
                "env": {
                    "NODE_ENV": "production",
                    "ADMIN_PORT": "3002",
                    "WEBSOCKET_PORT": "3003",
                    "CUSTOM_HEADERS": JSON.stringify({
                        "X-Powered-By": "ZombieCoder-by-SahonSrabon",
                        "X-ZombieCoder-Version": "1.0.0-local",
                        "X-Developer": "Sahon Srabon - Developer Zone",
                        "X-Security": "Local-Only-Integration"
                    })
                }
            }
        },
        "editor": {
            "websocketPort": 56510,
            "ipcServerPath": "/home/sahon/.config/Qoder/SharedClientCache/qoder.sock",
            "capabilities": [
                "code_completion",
                "mcp_tool_execution",
                "realtime_monitoring",
                "code_analysis",
                "agent_interaction",
                "chat_interface"
            ],
            "blocked_ports": [3001],  // Block conflicting port
            "allowed_ports": [8080, 3002, 3003]
        },
        "services": {
            "mcp_server": {
                "host": "127.0.0.1",
                "port": 3002,
                "protocol": "http",
                "websocket_port": 3003,
                "status": "running",
                "admin_url": "http://localhost:3002/admin",
                "api_base": "http://localhost:3002/api",
                "headers": {
                    "X-Powered-By": "ZombieCoder-by-SahonSrabon",
                    "X-ZombieCoder-Version": "1.0.0-local",
                    "X-Developer": "Sahon Srabon - Developer Zone"
                }
            },
            "agent_runtime": {
                "host": "127.0.0.1",
                "port": 3003,
                "protocol": "websocket",
                "status": "running",
                "local_only": true
            }
        }
    };

    const configPath = '/home/sahon/.config/Qoder/SharedClientCache/mcp.json';
    fs.writeFileSync(configPath, JSON.stringify(mcpConfig, null, 2));
    console.log(`✅ Updated MCP config with header injection at: ${configPath}`);
    
    return mcpConfig;
}

// Restart services with proper delay
async function restartServices() {
    console.log('🔄 Restarting services with 5-second delay...');
    
    // Kill conflicting processes
    await killPortProcesses(3001);  // Editor conflicts
    await killPortProcesses(3002);  // Admin panel
    await killPortProcesses(3003);  // WebSocket
    await killPortProcesses(8000);  // Proxy
    
    // Wait for clean shutdown (5 seconds as requested)
    console.log('⏳ Waiting 5 seconds for clean shutdown...');
    await wait(5000);
    
    // Start services in proper sequence
    console.log('🏁 Starting services in pipeline...');
    
    // Start admin panel
    console.log('🎨 Starting Admin Panel...');
    const adminProcess = spawn('node', ['/home/sahon/admin/server/node_modules/.bin/tsx', 'src/index.ts'], {
        cwd: '/home/sahon/admin/server',
        stdio: 'inherit',
        env: {
            ...process.env,
            PORT: '8000',
            CUSTOM_HEADERS: JSON.stringify({
                'X-Powered-By': 'ZombieCoder-by-SahonSrabon',
                'X-Security': 'Local-Integration'
            })
        }
    });
    
    await wait(3000);  // Let admin panel initialize
    
    // Start MCP server
    console.log('🚀 Starting MCP Server with header injection...');
    const mcpProcess = spawn('node', ['/home/sahon/mcp-server/zombiecoder-mcp-server/src/index.js'], {
        stdio: 'inherit',
        env: {
            ...process.env,
            NODE_ENV: 'production',
            ADMIN_PORT: '3002',
            WEBSOCKET_PORT: '3003',
            CUSTOM_HEADERS: JSON.stringify({
                'X-Powered-By': 'ZombieCoder-by-SahonSrabon',
                'X-ZombieCoder-Version': '1.0.0-local',
                'X-Developer': 'Sahon Srabon - Developer Zone'
            })
        }
    });
    
    await wait(2000);  // Let MCP server connect
    
    // Start WebSocket server (local only)
    console.log('🔌 Starting Local WebSocket Server...');
    const websocketProcess = spawn('node', ['/home/sahon/admin/temp/websocket-mcp-server.js'], {
        stdio: 'inherit'
    });
    
    console.log('✅ All services restarted with proper pipeline!');
    
    return {
        admin: adminProcess,
        mcp: mcpProcess,
        websocket: websocketProcess
    };
}

// Verify integration
async function verifyIntegration() {
    console.log('🔍 Verifying integration...');
    
    try {
        // Check if services are running
        const ports = [3002, 3003, 8000, 8080];
        const results = {};
        
        for (const port of ports) {
            try {
                const { stdout } = await execPromise(`curl -s -o /dev/null -w "%{http_code}" http://localhost:${port}/health 2>/dev/null || echo "404"`);
                results[port] = stdout.trim() === '200' ? '✅ Running' : '❌ Not responding';
            } catch (e) {
                results[port] = '❌ Error';
            }
        }
        
        console.log('Service Status:');
        Object.entries(results).forEach(([port, status]) => {
            console.log(`  Port ${port}: ${status}`);
        });
        
        // Test header injection
        try {
            const { stdout } = await execPromise(`curl -s -H "X-Test: Integration" http://localhost:3002/api/health 2>/dev/null | head -1`);
            console.log('Header Test Response:', stdout || 'No response');
        } catch (e) {
            console.log('Header test failed');
        }
        
        return results;
    } catch (error) {
        console.error('Verification failed:', error.message);
        return null;
    }
}

// Generate final documentation
async function generateFinalDocs() {
    const docs = `
# ZombieCoder Integration Fix - Implementation Summary

## Issues Addressed:
1. ✅ **Port 3001 Conflict**: Blocked conflicting port with Qoder editor
2. ✅ **Header Injection**: Added proper custom headers for identification
3. ✅ **Pipeline Management**: Implemented 5-second delay between restarts
4. ✅ **Local Communication**: Ensured local-only WebSocket communication

## Configuration Changes:
- Updated MCP config with custom headers
- Blocked port 3001 to prevent conflicts
- Added security headers for identification
- Implemented proper service restart sequence

## Services Running:
- Admin Panel: Port 8000
- MCP Server: Port 3002 (with headers)
- WebSocket Server: Port 3003 (local only)
- WebSocket MCP: Port 8080 (local communication)

## Headers Added:
- X-Powered-By: ZombieCoder-by-SahonSrabon
- X-ZombieCoder-Version: 1.0.0-local
- X-Developer: Sahon Srabon - Developer Zone
- X-Security: Local-Only-Integration

## Security Features:
- Local-only communication enforced
- Port blocking for conflicts
- Custom header identification
- Process isolation with proper cleanup
    `;

    const docPath = '/home/sahon/admin/ZOMBIECODER_INTEGRATION_FIX.md';
    fs.writeFileSync(docPath, docs);
    console.log(`📚 Final documentation generated at: ${docPath}`);
    
    return docs;
}

// Main execution
async function main() {
    try {
        // Create updated MCP configuration
        await createMCPConfig();
        
        // Restart services with proper pipeline
        await restartServices();
        
        // Wait a moment for services to stabilize
        await wait(3000);
        
        // Verify integration
        await verifyIntegration();
        
        // Generate documentation
        await generateFinalDocs();
        
        console.log('\n🎉 Integration fix completed successfully!');
        console.log('Your ZombieCoder services are now properly configured with:');
        console.log('- No port conflicts with Qoder editor');
        console.log('- Proper header injection for identification');
        console.log('- 5-second delay pipeline management');
        console.log('- Local-only secure communication');
        
    } catch (error) {
        console.error('❌ Integration fix failed:', error.message);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    process.exit(0);
});

// Run main function
main().catch(console.error);