const WebSocket = require('ws');

// Connect to the WebSocket MCP server
const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  console.log('✅ Connected to ZombieCoder WebSocket MCP Server');
  
  // Send a test request
  const testRequest = {
    type: 'request',
    id: `test-${Date.now()}`,
    timestamp: new Date().toISOString(),
    data: {
      agent_id: 'local-code-agent',
      persona: 'bangla-dev',
      editor: 'vscode',
      tools: ['file', 'terminal', 'memory-read'],
      conversation_id: 'local-convo-test',
      memory_refs: [],
      trace_id: 'local-trace-test',
      content: 'Write a simple JavaScript function to calculate factorial'
    }
  };
  
  console.log('📤 Sending test request:', JSON.stringify(testRequest, null, 2));
  ws.send(JSON.stringify(testRequest));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📥 Received message:', JSON.stringify(message, null, 2));
  
  // Handle different message types
  switch (message.type) {
    case 'welcome':
      console.log('🎯 Server welcome received - connection established');
      break;
    case 'progress':
      console.log(`🔄 Progress: ${(message.data.progress * 100).toFixed(1)}% - ${message.data.message}`);
      break;
    case 'response':
      console.log('✅ Final response received!');
      console.log('📊 Response details:');
      console.log(`   Action: ${message.data.action}`);
      console.log(`   Confidence: ${message.data.confidence}`);
      console.log(`   Tools used: ${message.data.used_tools.join(', ')}`);
      console.log(`   Response time: ${message.data.response_time_ms}ms`);
      console.log(`   Success: ${message.data.output.success}`);
      console.log(`   Content preview: ${message.data.output.content.substring(0, 100)}...`);
      break;
    case 'pong':
      console.log('🏓 Ping/pong test successful');
      break;
    case 'error':
      console.log(`❌ Error received: ${message.data.error}`);
      break;
  }
});

ws.on('close', () => {
  console.log('🔒 Connection closed');
});

ws.on('error', (error) => {
  console.error('💥 WebSocket error:', error);
});

// Keep the client alive for testing
setTimeout(() => {
  console.log('⏰ Test timeout reached, keeping connection alive...');
}, 30000);