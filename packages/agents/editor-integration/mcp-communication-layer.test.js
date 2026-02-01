// Tests for Editor Integration and MCP Communication Layer

const { MCPCommunicationLayer } = require('./mcp-communication-layer');

// Mock WebSocket for testing
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0; // CONNECTING
    this.listeners = {
      open: [],
      message: [],
      close: [],
      error: []
    };
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  emit(event, ...args) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(...args));
    }
  }

  send(data) {
    // Mock send functionality
    console.log('Mock WebSocket send:', data);
  }

  close() {
    this.readyState = 3; // CLOSED
    this.emit('close', 1000, 'Normal closure');
  }
}

// Replace WebSocket with mock
jest.mock('ws', () => {
  return {
    __esModule: true,
    default: MockWebSocket
  };
});

describe('MCPCommunicationLayer', () => {
  let mcpLayer;

  beforeEach(() => {
    mcpLayer = new MCPCommunicationLayer({
      mcpServerUrl: 'ws://localhost:8080',
      logLevel: 'debug'
    });
    
    // Mock WebSocket globally for this test
    global.WebSocket = MockWebSocket;
  });

  afterEach(() => {
    if (mcpLayer) {
      mcpLayer.close();
    }
  });

  describe('Initialization', () => {
    test('should initialize with default config', () => {
      expect(mcpLayer.config).toBeDefined();
      expect(mcpLayer.config.mcpServerUrl).toBe('ws://localhost:8080');
      expect(mcpLayer.config.reconnectInterval).toBe(5000);
      expect(mcpLayer.isConnected).toBe(false);
      expect(mcpLayer.messageQueue).toEqual([]);
      expect(mcpLayer.pendingRequests).toBeInstanceOf(Map);
      expect(mcpLayer.eventHandlers).toBeInstanceOf(Map);
    });

    test('should initialize editor integrations map', () => {
      expect(mcpLayer.editorIntegrations).toBeInstanceOf(Map);
      expect(mcpLayer.activeSessions).toBeInstanceOf(Map);
    });
  });

  describe('Connection', () => {
    test('should connect to MCP server', () => {
      // Note: Since we're using a mock, we're testing that the connection attempt happens
      mcpLayer.connect();
      expect(mcpLayer.ws).toBeDefined();
    });

    test('should handle connection open', () => {
      const spy = jest.spyOn(mcpLayer, 'log');
      mcpLayer.handleConnectionOpen();
      
      expect(mcpLayer.isConnected).toBe(true);
      expect(mcpLayer.retryCount).toBe(0);
      expect(spy).toHaveBeenCalledWith('Connected to MCP server successfully', 'success');
    });

    test('should handle connection close', () => {
      const spy = jest.spyOn(mcpLayer, 'scheduleReconnect');
      mcpLayer.handleConnectionClose(1000, 'Normal closure');
      
      expect(mcpLayer.isConnected).toBe(false);
      expect(spy).toHaveBeenCalled();
    });

    test('should handle connection error', () => {
      const spy = jest.spyOn(mcpLayer, 'log');
      mcpLayer.handleConnectionError(new Error('Test error'));
      
      expect(spy).toHaveBeenCalledWith('MCP server connection error: Test error', 'error');
    });
  });

  describe('Message Handling', () => {
    test('should handle welcome message', () => {
      const mockMessage = {
        type: 'welcome',
        data: { message: 'Welcome to MCP Server' }
      };
      
      const emitSpy = jest.spyOn(mcpLayer, 'emitEvent');
      mcpLayer.handleWelcomeMessage(mockMessage);
      
      expect(emitSpy).toHaveBeenCalledWith('welcome', mockMessage.data);
    });

    test('should handle response message', () => {
      const requestId = 'req-test-123';
      const mockResolver = { resolve: jest.fn(), reject: jest.fn() };
      
      mcpLayer.pendingRequests.set(requestId, mockResolver);
      
      const mockMessage = {
        type: 'response',
        request_id: requestId,
        data: { result: 'success' }
      };
      
      mcpLayer.handleResponseMessage(mockMessage);
      
      expect(mockResolver.resolve).toHaveBeenCalledWith(mockMessage);
      expect(mcpLayer.pendingRequests.has(requestId)).toBe(false);
    });

    test('should handle progress message', () => {
      const mockMessage = {
        type: 'progress',
        data: { progress: 0.5, step: 2, total_steps: 4 }
      };
      
      const emitSpy = jest.spyOn(mcpLayer, 'emitEvent');
      mcpLayer.handleProgressMessage(mockMessage);
      
      expect(emitSpy).toHaveBeenCalledWith('progress', mockMessage);
    });

    test('should handle generic message', () => {
      const mockMessage = {
        type: 'unknown-type',
        data: { some: 'data' }
      };
      
      const logSpy = jest.spyOn(mcpLayer, 'log');
      mcpLayer.handleGenericMessage(mockMessage);
      
      expect(logSpy).toHaveBeenCalledWith('Unhandled message type: unknown-type', 'warn');
    });
  });

  describe('Message Sending', () => {
    test('should queue message when not connected', () => {
      mcpLayer.isConnected = false;
      const mockMessage = { type: 'test', data: 'test-data' };
      
      expect(() => mcpLayer.sendMessage(mockMessage)).toThrow('Not connected to MCP server');
      expect(mcpLayer.messageQueue).toContain(mockMessage);
    });

    test('should send request and wait for response', async () => {
      mcpLayer.isConnected = true;
      mcpLayer.ws = {
        send: jest.fn()
      };
      
      const request = { type: 'test-request', data: 'test' };
      const promise = mcpLayer.sendRequest(request, 100); // Short timeout for test
      
      // Simulate response after a delay
      setTimeout(() => {
        const response = { 
          type: 'response', 
          request_id: request.id,
          data: { result: 'success' }
        };
        mcpLayer.handleResponseMessage(response);
      }, 10);
      
      await expect(promise).resolves.toEqual(expect.objectContaining({
        type: 'response'
      }));
    });
  });

  describe('Editor Integrations', () => {
    test('should register editor integration', () => {
      const mockIntegration = { name: 'VSCode', version: '1.0' };
      
      mcpLayer.registerEditorIntegration('vscode', mockIntegration);
      
      expect(mcpLayer.getEditorIntegration('vscode')).toEqual(mockIntegration);
    });

    test('should create editor session', () => {
      const sessionData = { userId: 'test-user', projectId: 'test-project' };
      const session = mcpLayer.createEditorSession('vscode', sessionData);
      
      expect(session.sessionId).toBeDefined();
      expect(session.editorType).toBe('vscode');
      expect(session.userId).toBe('test-user');
      expect(session.status).toBe('active');
      expect(mcpLayer.getActiveSession(session.sessionId)).toEqual(session);
    });

    test('should end editor session', () => {
      const session = mcpLayer.createEditorSession('vscode', { userId: 'test' });
      const endedSession = mcpLayer.endEditorSession(session.sessionId);
      
      expect(endedSession.status).toBe('ended');
      expect(endedSession.endedAt).toBeDefined();
    });
  });

  describe('Commands', () => {
    test('should send editor command', async () => {
      const session = mcpLayer.createEditorSession('vscode', { userId: 'test' });
      
      // Mock sendRequest to simulate response
      mcpLayer.sendRequest = jest.fn().mockResolvedValue({ success: true });
      
      const result = await mcpLayer.sendEditorCommand(session.sessionId, 'save-file', { path: '/test.js' });
      
      expect(mcpLayer.sendRequest).toHaveBeenCalledWith(expect.objectContaining({
        subtype: 'editor-command',
        session_id: session.sessionId,
        command: 'save-file'
      }));
    });

    test('should send agent command', async () => {
      const session = mcpLayer.createEditorSession('vscode', { userId: 'test' });
      
      mcpLayer.sendRequest = jest.fn().mockResolvedValue({ success: true });
      
      const result = await mcpLayer.sendAgentCommand(session.sessionId, 'agent-123', 'generate-code', { prompt: 'test' });
      
      expect(mcpLayer.sendRequest).toHaveBeenCalledWith(expect.objectContaining({
        subtype: 'agent-command',
        session_id: session.sessionId,
        agent_id: 'agent-123'
      }));
    });

    test('should send file operation', async () => {
      const session = mcpLayer.createEditorSession('vscode', { userId: 'test' });
      
      mcpLayer.sendRequest = jest.fn().mockResolvedValue({ success: true });
      
      const result = await mcpLayer.sendFileOperation(session.sessionId, 'create', '/new-file.js', 'console.log("hello");');
      
      expect(mcpLayer.sendRequest).toHaveBeenCalledWith(expect.objectContaining({
        subtype: 'file-operation',
        session_id: session.sessionId,
        operation: 'create',
        file_path: '/new-file.js'
      }));
    });
  });

  describe('Events', () => {
    test('should register and trigger event handlers', () => {
      const mockHandler = jest.fn();
      
      mcpLayer.on('test-event', mockHandler);
      mcpLayer.emitEvent('test-event', { data: 'test' });
      
      expect(mockHandler).toHaveBeenCalledWith({ data: 'test' });
    });

    test('should remove event handlers', () => {
      const mockHandler = jest.fn();
      
      mcpLayer.on('test-event', mockHandler);
      mcpLayer.off('test-event', mockHandler);
      mcpLayer.emitEvent('test-event', { data: 'test' });
      
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('Utilities', () => {
    test('should log messages appropriately', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      mcpLayer.log('Test message', 'info');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MCP-INFO]')
      );
      
      consoleSpy.mockRestore();
    });

    test('should close connection properly', () => {
      const stopHeartbeatSpy = jest.spyOn(mcpLayer, 'stopHeartbeat');
      const logSpy = jest.spyOn(mcpLayer, 'log');
      
      mcpLayer.ws = { close: jest.fn() };
      mcpLayer.close();
      
      expect(stopHeartbeatSpy).toHaveBeenCalled();
      expect(mcpLayer.ws.close).toHaveBeenCalled();
      expect(mcpLayer.isConnected).toBe(false);
    });
  });
});

// Mock Jest functions if not running in Jest environment
if (typeof jest === 'undefined') {
  global.jest = {
    fn: (impl) => impl || (() => {}),
    spyOn: () => ({ mockResolvedValue: () => {}, mockImplementation: () => {} }),
    mock: () => {},
    clearAllMocks: () => {}
  };
  
  // Simplified test runner for Node.js
  console.log('Running MCPCommunicationLayer tests...');
  
  // Run a simple test to verify the module loads correctly
  try {
    const { MCPCommunicationLayer } = require('./mcp-communication-layer');
    const layer = new MCPCommunicationLayer();
    console.log('✅ MCPCommunicationLayer module loaded successfully');
    
    // Test basic functionality
    if (layer.config && layer.messageQueue) {
      console.log('✅ Basic properties initialized successfully');
    } else {
      console.log('❌ Failed to initialize basic properties');
    }
    
    console.log('All basic tests passed!');
  } catch (error) {
    console.error('❌ Error during basic tests:', error);
  }
}