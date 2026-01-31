const WebSocket = require('ws');
const http = require('http');
const url = require('url');

// Create HTTP server
const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket MCP Server Running - Local Only');
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

console.log('WebSocket MCP Server starting...');
console.log('Security: Local-only mode activated');
console.log('Status: All systems operational for local use only');

// Connected clients counter
let clientCount = 0;

wss.on('connection', (ws, req) => {
  clientCount++;
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`New client connected: ${clientId} (Total: ${clientCount})`);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    id: clientId,
    timestamp: new Date().toISOString(),
    data: {
      message: 'Welcome to ZombieCoder WebSocket MCP Server',
      status: 'connected',
      security: 'local-only-mode'
    }
  }));

  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message);
      
      console.log(`Received message from ${clientId}:`, parsedMessage.type);
      
      // Handle different message types
      switch (parsedMessage.type) {
        case 'request':
          handleRequest(ws, parsedMessage, clientId);
          break;
        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            id: parsedMessage.id,
            timestamp: new Date().toISOString()
          }));
          break;
        default:
          ws.send(JSON.stringify({
            type: 'error',
            id: parsedMessage.id || 'unknown',
            timestamp: new Date().toISOString(),
            data: { error: 'Unknown message type' }
          }));
      }
    } catch (error) {
      console.error('Error parsing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        id: 'parse-error',
        timestamp: new Date().toISOString(),
        data: { error: 'Invalid JSON message' }
      }));
    }
  });

  ws.on('close', () => {
    clientCount--;
    console.log(`Client disconnected: ${clientId} (Remaining: ${clientCount})`);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function handleRequest(ws, message, clientId) {
  const requestId = message.data?.id || message.id || `req-${Date.now()}`;
  const startTime = Date.now();
  
  console.log(`Processing request ${requestId} from ${clientId}`);
  
  // Simulate processing with progress updates
  const totalSteps = 5;
  let step = 0;
  
  const sendProgress = () => {
    step++;
    const progress = step / totalSteps;
    
    ws.send(JSON.stringify({
      type: 'progress',
      id: requestId,
      request_id: message.id,
      timestamp: new Date().toISOString(),
      data: {
        progress: progress,
        step: step,
        total_steps: totalSteps,
        message: `Processing step ${step} of ${totalSteps}`
      }
    }));
    
    if (step < totalSteps) {
      setTimeout(sendProgress, 200);
    } else {
      // Send final response
      const responseTime = Date.now() - startTime;
      
      ws.send(JSON.stringify({
        type: 'response',
        id: `resp-${Date.now()}`,
        request_id: requestId,
        timestamp: new Date().toISOString(),
        data: {
          action: 'apply_diff',
          confidence: 0.92,
          used_tools: ['file'],
          response_time_ms: responseTime,
          output: {
            content: generateSampleOutput(message),
            success: true
          },
          next_hint: 'Consider running tests'
        }
      }));
    }
  };
  
  // Start progress simulation
  setTimeout(sendProgress, 100);
}

function generateSampleOutput(request) {
  const content = request.data?.content || 'sample request';
  
  // Generate sample response based on request type
  if (content.toLowerCase().includes('code') || content.toLowerCase().includes('fix')) {
    return `// Sample code response for: ${content}
function sampleFunction() {
  console.log('Hello from ZombieCoder!');
  return 'processed';
}`;
  } else if (content.toLowerCase().includes('bug') || content.toLowerCase().includes('error')) {
    return `// Bug fix suggestion for: ${content}\n// Check for null values and add proper error handling`;
  } else {
    return `Processed request: ${content}\nTimestamp: ${new Date().toISOString()}\nFrom: ${request.data?.editor || 'unknown editor'}`;
  }
}

// Start server on localhost only
const PORT = 8080;
server.listen(PORT, 'localhost', () => {
  console.log(`WebSocket MCP Server listening on ws://localhost:${PORT}`);
  console.log('Ready to accept local WebSocket connections only');
  console.log('Security: All connections restricted to localhost');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, closing server...');
  wss.close(() => {
    console.log('WebSocket server closed.');
  });
  server.close(() => {
    console.log('HTTP server closed.');
  });
});

// Log server status periodically
setInterval(() => {
  console.log(`Server status - Clients: ${clientCount}, Time: ${new Date().toLocaleTimeString()}`);
}, 30000);

console.log('WebSocket MCP Server initialized successfully!');
console.log('Features active:');
console.log('- Real-time bidirectional communication');
console.log('- Local-only security model');
console.log('- Progress tracking with streaming');
console.log('- Request/response correlation');
console.log('- Error handling and recovery');
console.log('- Connection management');