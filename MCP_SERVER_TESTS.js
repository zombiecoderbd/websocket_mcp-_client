const WebSocket = require('ws');

describe('MCP Server Tests', () => {
    let server;
    let ws;

    beforeAll(async () => {
        // Start the MCP server
        process.env.NODE_ENV = 'test';
        const { spawn } = require('child_process');
        
        server = spawn('node', ['packages/mcp-server/Server.js'], {
            cwd: process.cwd(),
            env: { ...process.env, PORT: '3002' }
        });

        // Wait for server to start
        await new Promise(resolve => setTimeout(resolve, 2000));
    });

    afterAll(() => {
        if (server) {
            server.kill();
        }
        if (ws) {
            ws.close();
        }
    });

    test('should connect to WebSocket server', (done) => {
        ws = new WebSocket('ws://localhost:3002');
        
        ws.on('open', () => {
            expect(ws.readyState).toBe(WebSocket.OPEN);
            done();
        });

        ws.on('error', (error) => {
            done(error);
        });
    });

    test('should handle ping/pong messages', (done) => {
        ws = new WebSocket('ws://localhost:3002');
        
        ws.on('open', () => {
            const pingMessage = {
                type: 'ping',
                id: 'test-1',
                timestamp: new Date().toISOString()
            };
            
            ws.send(JSON.stringify(pingMessage));
        });

        ws.on('message', (data) => {
            const response = JSON.parse(data.toString());
            expect(response.type).toBe('pong');
            expect(response.id).toBe('test-1');
            done();
        });

        ws.on('error', (error) => {
            done(error);
        });
    });

    test('should handle agent communication', (done) => {
        ws = new WebSocket('ws://localhost:3002');
        
        ws.on('open', () => {
            const agentMessage = {
                type: 'agent_request',
                agent_id: 'test-agent',
                message: 'Hello, test agent!',
                conversation_id: 'test-conversation'
            };
            
            ws.send(JSON.stringify(agentMessage));
        });

        ws.on('message', (data) => {
            const response = JSON.parse(data.toString());
            expect(response.type).toBe('agent_response');
            expect(response.agent_id).toBe('test-agent');
            done();
        });

        ws.on('error', (error) => {
            done(error);
        });
    });

    test('should handle multiple concurrent connections', async () => {
        const connections = [];
        const connectionCount = 5;

        // Create multiple connections
        for (let i = 0; i < connectionCount; i++) {
            const ws = new WebSocket('ws://localhost:3002');
            connections.push(new Promise((resolve, reject) => {
                ws.on('open', () => resolve(ws));
                ws.on('error', reject);
            }));
        }

        const webSockets = await Promise.all(connections);
        
        // Verify all connections are open
        webSockets.forEach(ws => {
            expect(ws.readyState).toBe(WebSocket.OPEN);
            ws.close();
        });
    });

    test('should handle malformed messages gracefully', (done) => {
        ws = new WebSocket('ws://localhost:3002');
        
        ws.on('open', () => {
            // Send malformed JSON
            ws.send('invalid json');
        });

        ws.on('message', (data) => {
            const response = JSON.parse(data.toString());
            expect(response.type).toBe('error');
            expect(response.message).toBeDefined();
            done();
        });

        ws.on('error', (error) => {
            done(error);
        });
    });

    test('should maintain connection health', async () => {
        ws = new WebSocket('ws://localhost:3002');
        
        // Wait for connection
        await new Promise((resolve) => {
            ws.on('open', resolve);
        });

        // Send multiple messages over time
        for (let i = 0; i < 10; i++) {
            const message = {
                type: 'health_check',
                id: `health-${i}`,
                timestamp: new Date().toISOString()
            };
            
            ws.send(JSON.stringify(message));
            
            // Wait between messages
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Connection should still be open
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
    });
});