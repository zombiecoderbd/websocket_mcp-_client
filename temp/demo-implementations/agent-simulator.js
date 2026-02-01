#!/usr/bin/env node

/**
 * Simple Agent Simulator for Bridge Testing
 * Registers as an agent and responds to editor messages
 */

const WebSocket = require('ws');

class AgentSimulator {
    constructor(bridgeUrl = 'ws://localhost:8081') {
        this.bridgeUrl = bridgeUrl;
        this.connection = null;
        this.agentId = null;
    }
    
    async connect() {
        return new Promise((resolve, reject) => {
            this.connection = new WebSocket(this.bridgeUrl);
            
            this.connection.on('open', () => {
                console.log('✅ Agent simulator connected to bridge');
                this.registerAsAgent();
                resolve();
            });
            
            this.connection.on('error', (error) => {
                reject(new Error(`Connection failed: ${error.message}`));
            });
            
            this.connection.on('message', (data) => {
                this.handleMessage(JSON.parse(data.toString()));
            });
            
            this.connection.on('close', () => {
                console.log('❌ Agent simulator disconnected');
            });
        });
    }
    
    registerAsAgent() {
        const registration = {
            type: 'register',
            id: `agent-reg-${Date.now()}`,
            timestamp: new Date().toISOString(),
            data: {
                clientType: 'agent',
                metadata: {
                    name: 'Test Agent Simulator',
                    version: '1.0.0',
                    capabilities: ['llm_processing', 'code_analysis', 'refactoring']
                }
            }
        };
        
        this.connection.send(JSON.stringify(registration));
        console.log('📤 Agent registration sent');
    }
    
    handleMessage(message) {
        console.log(`📥 Received: ${message.type}`);
        
        switch (message.type) {
            case 'registration_confirmed':
                this.agentId = message.data.connectionId;
                console.log(`✅ Registered as agent: ${this.agentId}`);
                break;
                
            case 'editor_event':
                this.handleEditorEvent(message);
                break;
                
            case 'heartbeat':
                this.sendHeartbeatAck(message.id);
                break;
                
            case 'welcome':
                console.log('👋 Welcome received from bridge');
                break;
                
            default:
                console.log(`❓ Unknown message type: ${message.type}`);
        }
    }
    
    handleEditorEvent(message) {
        console.log(`📄 Processing editor event: ${message.data?.eventType || 'unknown'}`);
        
        // Simulate processing delay
        setTimeout(() => {
            const response = {
                type: 'agent_response',
                id: `resp-${Date.now()}`,
                timestamp: new Date().toISOString(),
                data: {
                    originalMessageId: message.id,
                    response: 'Processed successfully',
                    suggestions: ['Code looks good!', 'Consider adding comments'],
                    processingTime: 45
                },
                metadata: {
                    targetEditor: message.metadata?.editorContext?.connectionId
                }
            };
            
            this.connection.send(JSON.stringify(response));
            console.log('📤 Agent response sent');
        }, 100);
    }
    
    sendHeartbeatAck(heartbeatId) {
        const ack = {
            type: 'heartbeat_ack',
            id: heartbeatId,
            timestamp: new Date().toISOString()
        };
        
        this.connection.send(JSON.stringify(ack));
        console.log('💓 Heartbeat acknowledged');
    }
    
    disconnect() {
        if (this.connection) {
            this.connection.close();
        }
    }
}

// Main execution
async function main() {
    const agent = new AgentSimulator();
    
    try {
        await agent.connect();
        console.log('🤖 Agent simulator running. Press Ctrl+C to stop.');
        
        // Keep running
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down agent simulator...');
            agent.disconnect();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('Agent simulator failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { AgentSimulator };