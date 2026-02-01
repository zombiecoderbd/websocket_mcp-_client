#!/usr/bin/env node

// Comprehensive Test Script for Editor Socket Implementation
// Tests all the features implemented according to the documentation

const http = require('http');
const WebSocket = require('ws');

console.log('🧪 ZombieCoder MCP Editor Socket Implementation Test Suite');
console.log('=====================================================\n');

let testResults = {
    passed: 0,
    failed: 0,
    total: 0
};

function logTestResult(testName, passed, details = '') {
    testResults.total++;
    if (passed) {
        testResults.passed++;
        console.log(`✅ ${testName} - PASSED ${details}`);
    } else {
        testResults.failed++;
        console.log(`❌ ${testName} - FAILED ${details}`);
    }
}

function makeHttpRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, data: data }));
        });
        
        req.on('error', reject);
        
        if (postData) {
            req.write(postData);
        }
        
        req.end();
    });
}

async function testApiEndpoints() {
    console.log('📡 Testing API Endpoints...\n');
    
    try {
        // Test 1: Health Check
        const healthResponse = await makeHttpRequest({
            hostname: 'localhost',
            port: 3002,
            path: '/api/health',
            method: 'GET'
        });
        
        const healthData = JSON.parse(healthResponse.data);
        logTestResult('Health API Endpoint', 
            healthResponse.statusCode === 200 && healthData.status === 'ok');
        
        // Test 2: Agents List
        const agentsResponse = await makeHttpRequest({
            hostname: 'localhost',
            port: 3002,
            path: '/api/agents',
            method: 'GET'
        });
        
        const agentsData = JSON.parse(agentsResponse.data);
        logTestResult('Agents List API', 
            agentsResponse.statusCode === 200 && Array.isArray(agentsData));
        
        // Test 3: Agent Tools
        if (agentsData.length > 0) {
            const agentId = agentsData[0].id;
            const toolsResponse = await makeHttpRequest({
                hostname: 'localhost',
                port: 3002,
                path: `/api/agents/${agentId}/tools`,
                method: 'GET'
            });
            
            const toolsData = JSON.parse(toolsResponse.data);
            logTestResult('Agent Tools API', 
                toolsResponse.statusCode === 200 && Array.isArray(toolsData));
        }
        
        // Test 4: Agent Chat
        if (agentsData.length > 0) {
            const agentId = agentsData[0].id;
            const chatResponse = await makeHttpRequest({
                hostname: 'localhost',
                port: 3002,
                path: `/api/agents/${agentId}/chat`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            }, JSON.stringify({
                message: 'Test message for chat functionality'
            }));
            
            const chatData = JSON.parse(chatResponse.data);
            logTestResult('Agent Chat API', 
                chatResponse.statusCode === 200 && chatData.response);
        }
        
        // Test 5: Tool Execution
        if (agentsData.length > 0) {
            const agentId = agentsData[0].id;
            const toolResponse = await makeHttpRequest({
                hostname: 'localhost',
                port: 3002,
                path: `/api/agents/${agentId}/execute-tool`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            }, JSON.stringify({
                toolName: 'analyze-code',
                parameters: {
                    code: 'console.log("test");',
                    language: 'javascript'
                }
            }));
            
            const toolData = JSON.parse(toolResponse.data);
            logTestResult('Tool Execution API', 
                toolResponse.statusCode === 200 && toolData.success);
        }
        
        // Test 6: Runtime Activity
        const activityResponse = await makeHttpRequest({
            hostname: 'localhost',
            port: 3002,
            path: '/api/agents/runtime/activity',
            method: 'GET'
        });
        
        logTestResult('Runtime Activity API', 
            activityResponse.statusCode === 200);
        
        // Test 7: Performance Metrics
        const perfResponse = await makeHttpRequest({
            hostname: 'localhost',
            port: 3002,
            path: '/api/agents/performance',
            method: 'GET'
        });
        
        logTestResult('Performance Metrics API', 
            perfResponse.statusCode === 200);
            
    } catch (error) {
        console.log(`❌ API Tests Failed: ${error.message}`);
        testResults.failed += 7;
        testResults.total += 7;
    }
}

async function testWebSocketConnection() {
    console.log('\n🔌 Testing WebSocket Connection...\n');
    
    try {
        // Test WebSocket connection
        const ws = new WebSocket('ws://localhost:3003');
        
        await new Promise((resolve, reject) => {
            ws.on('open', () => {
                logTestResult('WebSocket Connection', true);
                resolve();
            });
            
            ws.on('error', (error) => {
                logTestResult('WebSocket Connection', false, error.message);
                reject(error);
            });
            
            setTimeout(() => {
                reject(new Error('WebSocket connection timeout'));
            }, 5000);
        });
        
        // Test message sending
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'get_activity_feed'
            }));
            
            await new Promise((resolve) => {
                ws.on('message', (data) => {
                    const message = JSON.parse(data);
                    logTestResult('WebSocket Message Receipt', 
                        message.type === 'activity_feed' || message.type === 'welcome');
                    resolve();
                });
                
                setTimeout(resolve, 3000);
            });
        }
        
        ws.close();
        
    } catch (error) {
        console.log(`❌ WebSocket Tests Failed: ${error.message}`);
        testResults.failed += 2;
        testResults.total += 2;
    }
}

async function testDatabaseSchema() {
    console.log('\n🗄️  Testing Database Schema...\n');
    
    const { spawn } = require('child_process');
    
    try {
        // Check if required tables exist
        const requiredTables = [
            'agent_runtime_activity',
            'agent_conversation_history', 
            'agent_tool_executions',
            'agent_performance_metrics',
            'editor_sessions',
            'editor_agent_interactions',
            'performance_metrics'
        ];
        
        const sqliteProcess = spawn('sqlite3', ['database/zombiecoder.db', '.tables']);
        
        let output = '';
        sqliteProcess.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        await new Promise((resolve) => {
            sqliteProcess.on('close', resolve);
        });
        
        const tables = output.split(/\s+/).filter(t => t.length > 0);
        const missingTables = requiredTables.filter(table => !tables.includes(table));
        
        logTestResult('Database Schema Completion', 
            missingTables.length === 0,
            missingTables.length > 0 ? `Missing tables: ${missingTables.join(', ')}` : '');
            
    } catch (error) {
        console.log(`❌ Database Schema Test Failed: ${error.message}`);
        testResults.failed++;
        testResults.total++;
    }
}

async function testFrontendFiles() {
    console.log('\n🌐 Testing Frontend Files...\n');
    
    const fs = require('fs');
    const path = require('path');
    
    const requiredFiles = [
        'admin/agents-realtime.html',
        'admin/agent-testing-realtime.html'
    ];
    
    for (const file of requiredFiles) {
        const filePath = path.join('/home/sahon/mcp-server', file);
        const exists = fs.existsSync(filePath);
        logTestResult(`Frontend File: ${file}`, exists);
    }
}

async function runAllTests() {
    console.log('Starting comprehensive test suite...\n');
    
    await testApiEndpoints();
    await testWebSocketConnection();
    await testDatabaseSchema();
    await testFrontendFiles();
    
    // Final Results
    console.log('\n📋 Test Results Summary');
    console.log('=====================');
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);
    
    if (testResults.failed === 0) {
        console.log('\n🎉 All tests passed! Implementation is working correctly.');
        process.exit(0);
    } else {
        console.log('\n⚠️  Some tests failed. Please check the implementation.');
        process.exit(1);
    }
}

// Run the tests
runAllTests().catch(error => {
    console.error('Test suite failed with error:', error);
    process.exit(1);
});