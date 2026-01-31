#!/usr/bin/env node

/**
 * Test Script for Agent-Editor Bridge
 * Verifies WebSocket communication and message handling
 */

const WebSocket = require('ws');

class BridgeTester {
    constructor(bridgeUrl = 'ws://localhost:8081') {
        this.bridgeUrl = bridgeUrl;
        this.connection = null;
        this.testResults = [];
    }
    
    async runAllTests() {
        console.log('🧪 Agent-Editor Bridge Test Suite');
        console.log('==================================\n');
        
        const tests = [
            { name: 'Connection Test', fn: () => this.testConnection() },
            { name: 'Registration Test', fn: () => this.testRegistration() },
            { name: 'Message Exchange Test', fn: () => this.testMessageExchange() },
            { name: 'Heartbeat Test', fn: () => this.testHeartbeat() },
            { name: 'Error Handling Test', fn: () => this.testErrorHandling() },
            { name: 'Batch Processing Test', fn: () => this.testBatchProcessing() }
        ];
        
        let passed = 0;
        let failed = 0;
        
        for (const test of tests) {
            try {
                console.log(`📍 Running: ${test.name}`);
                await test.fn();
                console.log(`✅ PASSED: ${test.name}\n`);
                passed++;
                this.testResults.push({ name: test.name, status: 'PASSED' });
            } catch (error) {
                console.log(`❌ FAILED: ${test.name}`);
                console.log(`   Error: ${error.message}\n`);
                failed++;
                this.testResults.push({ name: test.name, status: 'FAILED', error: error.message });
            }
        }
        
        this.printSummary(passed, failed);
        return failed === 0;
    }
    
    async testConnection() {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(this.bridgeUrl);
            let timeout;
            
            ws.on('open', () => {
                clearTimeout(timeout);
                this.connection = ws;
                console.log('   🔗 Connection established successfully');
                resolve();
            });
            
            ws.on('error', (error) => {
                clearTimeout(timeout);
                reject(new Error(`Connection failed: ${error.message}`));
            });
            
            ws.on('message', (data) => {
                const message = JSON.parse(data.toString());
                if (message.type === 'welcome') {
                    console.log('   📨 Welcome message received');
                }
            });
            
            timeout = setTimeout(() => {
                reject(new Error('Connection timeout after 5 seconds'));
            }, 5000);
        });
    }
    
    async testRegistration() {
        return new Promise((resolve, reject) => {
            if (!this.connection) {
                reject(new Error('No active connection'));
                return;
            }
            
            const registrationMessage = {
                type: 'register',
                id: `reg-${Date.now()}`,
                timestamp: new Date().toISOString(),
                data: {
                    clientType: 'editor',
                    metadata: {
                        name: 'Test Editor',
                        version: '1.0.0',
                        capabilities: ['file_ops', 'cursor_tracking']
                    }
                }
            };
            
            let timeout;
            
            this.connection.on('message', (data) => {
                const message = JSON.parse(data.toString());
                if (message.type === 'registration_confirmed') {
                    clearTimeout(timeout);
                    console.log('   ✅ Registration confirmed');
                    console.log(`   🆔 Assigned ID: ${message.data.connectionId}`);
                    console.log(`   🎯 Role: ${message.data.assignedRole}`);
                    resolve();
                }
            });
            
            this.connection.send(JSON.stringify(registrationMessage));
            
            timeout = setTimeout(() => {
                reject(new Error('Registration confirmation timeout'));
            }, 3000);
        });
    }
    
    async testMessageExchange() {
        return new Promise((resolve, reject) => {
            if (!this.connection) {
                reject(new Error('No active connection'));
                return;
            }
            
            const testMessage = {
                type: 'editor_event',
                id: `msg-${Date.now()}`,
                timestamp: new Date().toISOString(),
                data: {
                    eventType: 'file_change',
                    filePath: '/test/file.js',
                    content: 'console.log("Hello World");'
                },
                metadata: {
                    editorContext: {
                        cursor: { line: 1, column: 0 },
                        language: 'javascript'
                    }
                }
            };
            
            let timeout;
            let messageSent = false;
            
            this.connection.on('message', (data) => {
                const message = JSON.parse(data.toString());
                
                if (message.type === 'editor_event' && !messageSent) {
                    // This is our echo back - bridge is working
                    clearTimeout(timeout);
                    console.log('   🔄 Message echoed back successfully');
                    console.log(`   📄 File: ${message.data.filePath}`);
                    console.log(`   📏 Content length: ${message.data.content.length}`);
                    resolve();
                }
            });
            
            this.connection.send(JSON.stringify(testMessage));
            messageSent = true;
            
            timeout = setTimeout(() => {
                reject(new Error('Message exchange timeout'));
            }, 3000);
        });
    }
    
    async testHeartbeat() {
        return new Promise((resolve, reject) => {
            if (!this.connection) {
                reject(new Error('No active connection'));
                return;
            }
            
            let heartbeatReceived = false;
            let timeout;
            
            this.connection.on('message', (data) => {
                const message = JSON.parse(data.toString());
                if (message.type === 'heartbeat') {
                    // Send heartbeat ack
                    const ack = {
                        type: 'heartbeat_ack',
                        id: message.id,
                        timestamp: new Date().toISOString()
                    };
                    this.connection.send(JSON.stringify(ack));
                    heartbeatReceived = true;
                } else if (message.type === 'heartbeat_ack' && heartbeatReceived) {
                    clearTimeout(timeout);
                    console.log('   💓 Heartbeat cycle completed');
                    resolve();
                }
            });
            
            // Trigger heartbeat
            const heartbeat = {
                type: 'heartbeat',
                id: `hb-${Date.now()}`,
                timestamp: new Date().toISOString()
            };
            this.connection.send(JSON.stringify(heartbeat));
            
            timeout = setTimeout(() => {
                reject(new Error('Heartbeat test timeout'));
            }, 3000);
        });
    }
    
    async testErrorHandling() {
        return new Promise((resolve, reject) => {
            if (!this.connection) {
                reject(new Error('No active connection'));
                return;
            }
            
            const invalidMessage = {
                // Missing required fields
                type: 'invalid_message'
                // No id, no timestamp
            };
            
            let timeout;
            
            this.connection.on('message', (data) => {
                const message = JSON.parse(data.toString());
                if (message.type === 'error') {
                    clearTimeout(timeout);
                    console.log('   ⚠️ Error handling working');
                    console.log(`   📛 Error code: ${message.data.code}`);
                    console.log(`   💬 Error message: ${message.data.message}`);
                    resolve();
                }
            });
            
            this.connection.send(JSON.stringify(invalidMessage));
            
            timeout = setTimeout(() => {
                reject(new Error('Error handling test timeout'));
            }, 3000);
        });
    }
    
    async testBatchProcessing() {
        return new Promise((resolve, reject) => {
            if (!this.connection) {
                reject(new Error('No active connection'));
                return;
            }
            
            const batchMessages = [
                { id: '1', type: 'file_read', data: { path: '/file1.js' } },
                { id: '2', type: 'file_write', data: { path: '/file2.js', content: 'test' } },
                { id: '3', type: 'cursor_move', data: { line: 10, column: 5 } }
            ];
            
            const batchRequest = {
                type: 'batch_request',
                id: `batch-${Date.now()}`,
                timestamp: new Date().toISOString(),
                data: {
                    messages: batchMessages
                }
            };
            
            let timeout;
            
            this.connection.on('message', (data) => {
                const message = JSON.parse(data.toString());
                if (message.type === 'batch_response') {
                    clearTimeout(timeout);
                    console.log('   📦 Batch processing successful');
                    console.log(`   📊 Processed: ${message.data.processedCount}/${batchMessages.length}`);
                    console.log(`   📋 Responses: ${message.data.responses.length}`);
                    resolve();
                }
            });
            
            this.connection.send(JSON.stringify(batchRequest));
            
            timeout = setTimeout(() => {
                reject(new Error('Batch processing test timeout'));
            }, 3000);
        });
    }
    
    printSummary(passed, failed) {
        console.log('📊 Test Results Summary');
        console.log('======================');
        console.log(`Total Tests: ${passed + failed}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);
        
        if (this.testResults.length > 0) {
            console.log('Detailed Results:');
            this.testResults.forEach(result => {
                const status = result.status === 'PASSED' ? '✅' : '❌';
                console.log(`  ${status} ${result.name}`);
                if (result.error) {
                    console.log(`     Error: ${result.error}`);
                }
            });
        }
        
        if (failed === 0) {
            console.log('\n🎉 All tests passed! Bridge is functioning correctly.');
        } else {
            console.log('\n💥 Some tests failed. Bridge needs attention.');
        }
    }
    
    cleanup() {
        if (this.connection) {
            this.connection.close();
        }
    }
}

// Run tests
async function main() {
    const tester = new BridgeTester();
    
    try {
        const success = await tester.runAllTests();
        tester.cleanup();
        
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('Test execution failed:', error);
        tester.cleanup();
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { BridgeTester };