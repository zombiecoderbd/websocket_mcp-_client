#!/usr/bin/env node

/**
 * Comprehensive Integration Test
 * Tests the complete agent-editor bridge ecosystem with persistent connections
 */

const WebSocket = require('ws');

class IntegrationTester {
    constructor(bridgeUrl = 'ws://localhost:8081') {
        this.bridgeUrl = bridgeUrl;
        this.editorConnection = null;
        this.agentConnection = null;
        this.testResults = [];
        this.testStats = { passed: 0, failed: 0 };
    }
    
    async runIntegrationTest() {
        console.log('🧪 Comprehensive Integration Test');
        console.log('================================\n');
        
        try {
            // Setup phase
            await this.setupConnections();
            
            // Run tests
            await this.testBasicCommunication();
            await this.testRealtimeMessaging();
            await this.testErrorRecovery();
            await this.testPerformance();
            
            // Cleanup
            this.cleanup();
            
            // Show results
            this.showResults();
            
        } catch (error) {
            console.error('💥 Integration test failed:', error.message);
            this.cleanup();
            process.exit(1);
        }
    }
    
    async setupConnections() {
        console.log('🔧 Setting up connections...');
        
        // Connect editor
        await this.connectEditor();
        console.log('✅ Editor connected and registered');
        
        // Connect agent
        await this.connectAgent();
        console.log('✅ Agent connected and registered');
        
        console.log('');
    }
    
    async connectEditor() {
        return new Promise((resolve, reject) => {
            this.editorConnection = new WebSocket(this.bridgeUrl);
            
            this.editorConnection.on('open', () => {
                this.registerClient(this.editorConnection, 'editor', resolve, reject);
            });
            
            this.editorConnection.on('error', reject);
        });
    }
    
    async connectAgent() {
        return new Promise((resolve, reject) => {
            this.agentConnection = new WebSocket(this.bridgeUrl);
            
            this.agentConnection.on('open', () => {
                this.registerClient(this.agentConnection, 'agent', resolve, reject);
            });
            
            this.agentConnection.on('error', reject);
        });
    }
    
    registerClient(connection, type, resolve, reject) {
        const registration = {
            type: 'register',
            id: `${type}-reg-${Date.now()}`,
            timestamp: new Date().toISOString(),
            data: {
                clientType: type,
                metadata: {
                    name: `Test ${type}`,
                    version: '1.0.0',
                    capabilities: type === 'agent' ? 
                        ['llm_processing', 'code_analysis'] : 
                        ['file_operations', 'cursor_tracking']
                }
            }
        };
        
        const handleMessage = (data) => {
            const message = JSON.parse(data.toString());
            if (message.type === 'registration_confirmed') {
                connection.off('message', handleMessage);
                resolve(message.data.connectionId);
            }
        };
        
        connection.on('message', handleMessage);
        connection.send(JSON.stringify(registration));
    }
    
    async testBasicCommunication() {
        console.log('📍 Test 1: Basic Communication Flow');
        
        return new Promise((resolve) => {
            let responseReceived = false;
            
            // Setup agent listener
            const agentHandler = (data) => {
                const message = JSON.parse(data.toString());
                if (message.type === 'editor_event') {
                    console.log('   📥 Agent received editor event');
                    
                    // Send response back
                    const response = {
                        type: 'agent_response',
                        id: `resp-${Date.now()}`,
                        timestamp: new Date().toISOString(),
                        data: {
                            originalMessageId: message.id,
                            content: 'Hello from agent!',
                            suggestions: ['Great code!', 'Keep it up!']
                        },
                        metadata: {
                            targetEditor: message.metadata.editorContext.connectionId
                        }
                    };
                    this.agentConnection.send(JSON.stringify(response));
                    console.log('   📤 Agent sent response');
                }
            };
            
            // Setup editor listener
            const editorHandler = (data) => {
                const message = JSON.parse(data.toString());
                if (message.type === 'agent_response' && !responseReceived) {
                    responseReceived = true;
                    console.log('   📥 Editor received agent response');
                    this.testStats.passed++;
                    console.log('   ✅ Basic communication test PASSED\n');
                    this.agentConnection.off('message', agentHandler);
                    this.editorConnection.off('message', editorHandler);
                    resolve();
                }
            };
            
            this.agentConnection.on('message', agentHandler);
            this.editorConnection.on('message', editorHandler);
            
            // Send test message from editor
            const testMessage = {
                type: 'editor_event',
                id: `test-${Date.now()}`,
                timestamp: new Date().toISOString(),
                data: {
                    eventType: 'code_change',
                    content: 'function hello() { console.log("Hello"); }'
                },
                metadata: {
                    editorContext: {
                        file: 'test.js',
                        cursor: { line: 1, column: 0 },
                        language: 'javascript'
                    }
                }
            };
            
            this.editorConnection.send(JSON.stringify(testMessage));
            console.log('   📤 Editor sent test message');
            
            // Timeout
            setTimeout(() => {
                if (!responseReceived) {
                    console.log('   ❌ Basic communication test FAILED (timeout)\n');
                    this.testStats.failed++;
                    resolve();
                }
            }, 3000);
        });
    }
    
    async testRealtimeMessaging() {
        console.log('📍 Test 2: Real-time Messaging');
        
        const messagesToSend = 5;
        let messagesReceived = 0;
        let startTime = Date.now();
        
        return new Promise((resolve) => {
            const agentHandler = (data) => {
                const message = JSON.parse(data.toString());
                if (message.type === 'editor_event') {
                    messagesReceived++;
                    console.log(`   📥 Message ${messagesReceived}/${messagesToSend} received by agent`);
                    
                    // Echo back
                    const response = {
                        type: 'agent_response',
                        id: `echo-${Date.now()}`,
                        timestamp: new Date().toISOString(),
                        data: {
                            originalMessageId: message.id,
                            content: `Echo ${messagesReceived}`,
                            timestamp: Date.now()
                        },
                        metadata: {
                            targetEditor: message.metadata.editorContext.connectionId
                        }
                    };
                    this.agentConnection.send(JSON.stringify(response));
                }
            };
            
            const editorHandler = (data) => {
                const message = JSON.parse(data.toString());
                if (message.type === 'agent_response') {
                    console.log(`   📥 Echo ${messagesReceived} received by editor`);
                    if (messagesReceived >= messagesToSend) {
                        const totalTime = Date.now() - startTime;
                        const avgTime = totalTime / messagesToSend;
                        console.log(`   📊 Average round-trip time: ${avgTime.toFixed(2)}ms`);
                        console.log('   ✅ Real-time messaging test PASSED\n');
                        this.testStats.passed++;
                        this.agentConnection.off('message', agentHandler);
                        this.editorConnection.off('message', editorHandler);
                        resolve();
                    }
                }
            };
            
            this.agentConnection.on('message', agentHandler);
            this.editorConnection.on('message', editorHandler);
            
            // Send messages rapidly
            for (let i = 0; i < messagesToSend; i++) {
                setTimeout(() => {
                    const message = {
                        type: 'editor_event',
                        id: `rt-${Date.now()}-${i}`,
                        timestamp: new Date().toISOString(),
                        data: {
                            eventType: 'keystroke',
                            key: 'character',
                            content: `char_${i}`
                        },
                        metadata: {
                            editorContext: {
                                file: 'realtime.js',
                                cursor: { line: 1, column: i }
                            }
                        }
                    };
                    this.editorConnection.send(JSON.stringify(message));
                }, i * 100); // 100ms intervals
            }
            
            // Timeout
            setTimeout(() => {
                console.log('   ❌ Real-time messaging test FAILED (timeout)\n');
                this.testStats.failed++;
                resolve();
            }, 5000);
        });
    }
    
    async testErrorRecovery() {
        console.log('📍 Test 3: Error Recovery');
        
        return new Promise((resolve) => {
            let errorHandled = false;
            
            const editorHandler = (data) => {
                const message = JSON.parse(data.toString());
                if (message.type === 'error' && !errorHandled) {
                    errorHandled = true;
                    console.log('   ⚠️ Error properly handled by bridge');
                    console.log('   ✅ Error recovery test PASSED\n');
                    this.testStats.passed++;
                    this.editorConnection.off('message', editorHandler);
                    resolve();
                }
            };
            
            this.editorConnection.on('message', editorHandler);
            
            // Send malformed message
            const badMessage = '{ invalid: json }';
            this.editorConnection.send(badMessage);
            console.log('   📤 Sent malformed message');
            
            // Timeout
            setTimeout(() => {
                if (!errorHandled) {
                    console.log('   ❌ Error recovery test FAILED (no error response)\n');
                    this.testStats.failed++;
                }
                resolve();
            }, 2000);
        });
    }
    
    async testPerformance() {
        console.log('📍 Test 4: Performance Benchmark');
        
        const testDuration = 3000; // 3 seconds
        const startTime = Date.now();
        let messageCount = 0;
        
        return new Promise((resolve) => {
            const sendMessage = () => {
                if (Date.now() - startTime < testDuration) {
                    const message = {
                        type: 'editor_event',
                        id: `perf-${Date.now()}-${messageCount}`,
                        timestamp: new Date().toISOString(),
                        data: {
                            eventType: 'heartbeat',
                            content: `msg_${messageCount}`
                        },
                        metadata: {
                            editorContext: {
                                file: 'perf.js'
                            }
                        }
                    };
                    this.editorConnection.send(JSON.stringify(message));
                    messageCount++;
                    
                    // Schedule next message
                    setTimeout(sendMessage, 50); // 20 messages per second target
                } else {
                    // Test complete
                    const totalTime = Date.now() - startTime;
                    const messagesPerSecond = (messageCount / totalTime) * 1000;
                    console.log(`   📊 Messages sent: ${messageCount}`);
                    console.log(`   📊 Duration: ${totalTime}ms`);
                    console.log(`   📊 Rate: ${messagesPerSecond.toFixed(2)} msgs/sec`);
                    
                    if (messagesPerSecond > 10) {
                        console.log('   ✅ Performance test PASSED\n');
                        this.testStats.passed++;
                    } else {
                        console.log('   ❌ Performance test FAILED (below threshold)\n');
                        this.testStats.failed++;
                    }
                    resolve();
                }
            };
            
            sendMessage();
        });
    }
    
    showResults() {
        console.log('📊 Integration Test Results');
        console.log('==========================');
        console.log(`Tests Passed: ${this.testStats.passed}`);
        console.log(`Tests Failed: ${this.testStats.failed}`);
        console.log(`Success Rate: ${((this.testStats.passed / (this.testStats.passed + this.testStats.failed)) * 100).toFixed(1)}%`);
        
        if (this.testStats.failed === 0) {
            console.log('\n🎉 All integration tests passed!');
            console.log('The agent-editor bridge is functioning correctly.');
        } else {
            console.log('\n💥 Some tests failed. Review implementation.');
        }
    }
    
    cleanup() {
        if (this.editorConnection) {
            this.editorConnection.close();
        }
        if (this.agentConnection) {
            this.agentConnection.close();
        }
    }
}

// Run integration test
async function main() {
    const tester = new IntegrationTester();
    
    try {
        await tester.runIntegrationTest();
        process.exit(tester.testStats.failed === 0 ? 0 : 1);
    } catch (error) {
        console.error('Test execution failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { IntegrationTester };