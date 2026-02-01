#!/usr/bin/env node

/**
 * Agent Status Checker and System Validator
 * Comprehensive system health check for ZombieCoder MCP Server
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class SystemValidator {
    constructor() {
        this.baseUrl = 'http://localhost:8000';
        this.mcpUrl = 'http://localhost:3002';
        this.adminUrl = 'http://localhost:3001';
        this.websocketUrl = 'ws://localhost:8080';
        this.ollamaUrl = 'http://localhost:11434';
        
        this.results = {
            services: {},
            agents: {},
            models: {},
            connections: {},
            overallStatus: 'unknown'
        };
    }

    async runFullCheck() {
        console.log('🔍 Starting comprehensive system validation...\n');
        
        // Check all services
        await this.checkServices();
        
        // Check agents
        await this.checkAgents();
        
        // Check Ollama models and connection
        await this.checkOllama();
        
        // Check WebSocket connections
        await this.checkWebSocket();
        
        // Generate report
        this.generateReport();
        
        return this.results;
    }

    async checkServices() {
        console.log('📋 Checking core services...');
        
        const services = [
            { name: 'Backend API', url: `${this.baseUrl}/health`, key: 'backend' },
            { name: 'Frontend Admin', url: `${this.adminUrl}/api/health`, key: 'frontend' },
            { name: 'MCP Server', url: `${this.mcpUrl}/api/health`, key: 'mcp' }
        ];

        for (const service of services) {
            try {
                const response = await axios.get(service.url, { timeout: 5000 });
                this.results.services[service.key] = {
                    status: 'online',
                    responseTime: response.headers['x-response-time'] || 'unknown',
                    data: response.data
                };
                console.log(`✅ ${service.name}: Online`);
            } catch (error) {
                this.results.services[service.key] = {
                    status: 'offline',
                    error: error.message
                };
                console.log(`❌ ${service.name}: Offline - ${error.message}`);
            }
        }
    }

    async checkAgents() {
        console.log('\n🤖 Checking agent system...');
        
        try {
            const response = await axios.get(`${this.baseUrl}/agents`, { timeout: 5000 });
            
            if (response.data && response.data.agents) {
                this.results.agents = {
                    status: 'active',
                    count: response.data.agents.length,
                    agents: response.data.agents.map(agent => ({
                        id: agent.id,
                        name: agent.name,
                        type: agent.type,
                        status: agent.status,
                        requestCount: agent.requestCount,
                        activeSessions: agent.activeSessions
                    }))
                };
                
                console.log(`✅ Agent system: ${response.data.agents.length} agents active`);
                
                // Check individual agent statuses
                for (const agent of response.data.agents) {
                    console.log(`   - ${agent.name} (${agent.type}): ${agent.status}`);
                }
            } else {
                this.results.agents = { status: 'no_data', error: 'No agent data received' };
                console.log('⚠️  Agent system: No data received');
            }
        } catch (error) {
            this.results.agents = { status: 'error', error: error.message };
            console.log(`❌ Agent system: Error - ${error.message}`);
        }
    }

    async checkOllama() {
        console.log('\n🦙 Checking Ollama integration...');
        
        try {
            // Test basic connection
            const tagsResponse = await axios.get(`${this.ollamaUrl}/api/tags`, { timeout: 5000 });
            
            if (tagsResponse.data && tagsResponse.data.models) {
                const models = tagsResponse.data.models;
                this.results.models = {
                    status: 'connected',
                    modelCount: models.length,
                    models: models.map(model => ({
                        name: model.name,
                        size: model.size,
                        modified: model.modified_at,
                        details: model.details
                    }))
                };
                
                console.log(`✅ Ollama: Connected (${models.length} models available)`);
                
                // Test with default model
                try {
                    const testResponse = await axios.post(`${this.ollamaUrl}/api/generate`, {
                        model: 'qwen2.5:1.5b',
                        prompt: 'Hello, test message',
                        stream: false
                    }, { timeout: 10000 });
                    
                    if (testResponse.data && testResponse.data.response) {
                        console.log('✅ Ollama model test: Success');
                        this.results.models.testStatus = 'success';
                    }
                } catch (testError) {
                    console.log(`⚠️  Ollama model test: ${testError.message}`);
                    this.results.models.testStatus = 'failed';
                }
                
                // List available models
                models.forEach(model => {
                    console.log(`   - ${model.name} (${Math.round(model.size / 1024 / 1024)} MB)`);
                });
            }
        } catch (error) {
            this.results.models = { status: 'disconnected', error: error.message };
            console.log(`❌ Ollama: Disconnected - ${error.message}`);
        }
    }

    async checkWebSocket() {
        console.log('\n🔌 Checking WebSocket connections...');
        
        try {
            // Test WebSocket client page
            const clientResponse = await axios.get('http://localhost:8080/client', { timeout: 5000 });
            this.results.connections.websocket = {
                status: 'accessible',
                clientPage: 'available'
            };
            console.log('✅ WebSocket client page: Accessible');
        } catch (error) {
            this.results.connections.websocket = {
                status: 'inaccessible',
                error: error.message
            };
            console.log(`❌ WebSocket client page: ${error.message}`);
        }
    }

    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 SYSTEM VALIDATION REPORT');
        console.log('='.repeat(60));
        
        // Overall status
        const serviceStatus = Object.values(this.results.services).every(s => s.status === 'online');
        const agentStatus = this.results.agents.status === 'active';
        const modelStatus = this.results.models.status === 'connected';
        
        this.results.overallStatus = serviceStatus && agentStatus && modelStatus ? 'healthy' : 'degraded';
        
        console.log(`Overall System Status: ${this.results.overallStatus.toUpperCase()}`);
        console.log(`Services: ${serviceStatus ? '✅' : '❌'} All services running`);
        console.log(`Agents: ${agentStatus ? '✅' : '❌'} Agent system active`);
        console.log(`Models: ${modelStatus ? '✅' : '❌'} Ollama connected`);
        
        // Detailed breakdown
        console.log('\n🔧 Service Status:');
        Object.entries(this.results.services).forEach(([key, service]) => {
            const status = service.status === 'online' ? '✅' : '❌';
            console.log(`  ${key}: ${status} ${service.status}`);
        });
        
        console.log('\n🤖 Agent Status:');
        if (this.results.agents.status === 'active') {
            console.log(`  Active Agents: ${this.results.agents.count}`);
            this.results.agents.agents.forEach(agent => {
                const status = agent.status === 'active' ? '✅' : '⚠️';
                console.log(`  ${status} ${agent.name} (${agent.type}): ${agent.status}`);
            });
        } else {
            console.log(`  Status: ${this.results.agents.status}`);
        }
        
        console.log('\n🦙 Model Status:');
        if (this.results.models.status === 'connected') {
            console.log(`  Connected Models: ${this.results.models.modelCount}`);
            if (this.results.models.testStatus) {
                const testStatus = this.results.models.testStatus === 'success' ? '✅' : '❌';
                console.log(`  Model Test: ${testStatus} ${this.results.models.testStatus}`);
            }
        } else {
            console.log(`  Status: ${this.results.models.status}`);
        }
        
        console.log('\n' + '='.repeat(60));
        
        // Recommendations
        console.log('\n💡 Recommendations:');
        if (!serviceStatus) {
            console.log('  - Restart failed services using the startup script');
        }
        if (!agentStatus) {
            console.log('  - Check agent configuration and database connection');
        }
        if (!modelStatus) {
            console.log('  - Verify Ollama is running on port 11434');
            console.log('  - Check if required models are pulled (qwen2.5:1.5b)');
        }
        
        // Save report
        const reportPath = path.join(__dirname, '../temp/system-validation-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        console.log(`\n📝 Detailed report saved to: ${reportPath}`);
    }
}

// Run the validator
async function main() {
    const validator = new SystemValidator();
    await validator.runFullCheck();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = SystemValidator;