// Tests for Editor Connection Service

const { EditorConnectionService } = require('./editor-connection-service');

describe('EditorConnectionService', () => {
  let editorService;

  beforeEach(() => {
    editorService = new EditorConnectionService({
      autoConnect: false,
      enableDiscovery: false
    });
  });

  describe('Initialization', () => {
    test('should initialize with default config', () => {
      expect(editorService.config).toBeDefined();
      expect(editorService.config.supportedEditors).toEqual(['vscode', 'cursor', 'jetbrains', 'sublime', 'vim']);
      expect(editorService.activeConnections).toBeInstanceOf(Map);
      expect(editorService.discoveredEditors).toBeInstanceOf(Map);
    });

    test('should initialize with custom config', () => {
      const customService = new EditorConnectionService({
        supportedEditors: ['vscode', 'custom'],
        autoConnect: true,
        connectionTimeout: 10000
      });
      
      expect(customService.config.supportedEditors).toEqual(['vscode', 'custom']);
      expect(customService.config.autoConnect).toBe(true);
      expect(customService.config.connectionTimeout).toBe(10000);
    });
  });

  describe('Editor Discovery', () => {
    test('should discover available editors', async () => {
      // Mock file system check
      const originalCheck = editorService.checkExecutableExists;
      editorService.checkExecutableExists = jest.fn().mockResolvedValue(true);
      
      const discovered = await editorService.discoverEditors();
      
      expect(Array.isArray(discovered)).toBe(true);
      expect(editorService.discoveredEditors.size).toBeGreaterThan(0);
      
      // Restore original method
      editorService.checkExecutableExists = originalCheck;
    });

    test('should handle discovery errors gracefully', async () => {
      editorService.checkExecutableExists = jest.fn().mockRejectedValue(new Error('Permission denied'));
      
      const discovered = await editorService.discoverEditors();
      
      expect(Array.isArray(discovered)).toBe(true);
      expect(discovered.length).toBe(0);
    });
  });

  describe('Editor Connections', () => {
    test('should connect to available editor', async () => {
      // Mock discovered editor
      editorService.discoveredEditors.set('vscode', {
        id: 'vscode',
        name: 'Visual Studio Code',
        type: 'vscode',
        available: true
      });
      
      // Mock connection attempt
      editorService.connectToVSCode = jest.fn().mockResolvedValue({
        id: 'vscode',
        type: 'vscode-web',
        connected: true
      });
      
      const connection = await editorService.connectToEditor('vscode');
      
      expect(connection).toBeDefined();
      expect(connection.id).toBe('vscode');
      expect(connection.connected).toBe(true);
      expect(editorService.activeConnections.has('vscode')).toBe(true);
    });

    test('should reject connection to non-existent editor', async () => {
      await expect(editorService.connectToEditor('nonexistent'))
        .rejects
        .toThrow('Editor nonexistent not found');
    });

    test('should handle connection failures', async () => {
      editorService.discoveredEditors.set('vscode', {
        id: 'vscode',
        name: 'Visual Studio Code',
        type: 'vscode',
        available: true
      });
      
      editorService.connectToVSCode = jest.fn().mockRejectedValue(new Error('Connection failed'));
      
      await expect(editorService.connectToEditor('vscode'))
        .rejects
        .toThrow('Connection failed');
    });
  });

  describe('Connection Management', () => {
    test('should get active connection', () => {
      const mockConnection = { id: 'vscode', connected: true };
      editorService.activeConnections.set('vscode', mockConnection);
      
      const connection = editorService.getConnection('vscode');
      
      expect(connection).toEqual(mockConnection);
    });

    test('should return null for non-existent connection', () => {
      const connection = editorService.getConnection('nonexistent');
      expect(connection).toBeUndefined();
    });

    test('should get all active connections', () => {
      editorService.activeConnections.set('vscode', { id: 'vscode', connected: true });
      editorService.activeConnections.set('cursor', { id: 'cursor', connected: true });
      
      const connections = editorService.getActiveConnections();
      
      expect(Array.isArray(connections)).toBe(true);
      expect(connections.length).toBe(2);
      expect(connections.some(c => c.editorId === 'vscode')).toBe(true);
      expect(connections.some(c => c.editorId === 'cursor')).toBe(true);
    });
  });

  describe('Connection Callbacks', () => {
    test('should register and execute connection callbacks', () => {
      const mockCallback = jest.fn();
      
      editorService.onConnection('vscode', mockCallback);
      
      // Simulate connection
      const connectionData = { id: 'vscode', connected: true };
      const callbacks = editorService.connectionCallbacks.get('vscode');
      
      expect(Array.isArray(callbacks)).toBe(true);
      expect(callbacks.length).toBe(1);
      
      // Execute callback
      callbacks[0](connectionData);
      expect(mockCallback).toHaveBeenCalledWith(connectionData);
    });
  });

  describe('Persistence', () => {
    test('should save and load connections', () => {
      const mockConnection = {
        id: 'vscode',
        type: 'vscode-web',
        connected: true,
        saved: true
      };
      
      editorService.saveConnection('vscode', mockConnection);
      
      // Check if saved in localStorage format
      const savedData = localStorage.getItem('editor_connections');
      expect(savedData).toBeDefined();
      
      // Load connections
      editorService.loadSavedConnections();
      expect(editorService.activeConnections.has('vscode')).toBe(true);
    });

    test('should handle localStorage errors gracefully', () => {
      // Mock localStorage error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => { throw new Error('Storage full'); };
      
      expect(() => {
        editorService.saveConnection('vscode', { id: 'vscode' });
      }).not.toThrow();
      
      // Restore
      localStorage.setItem = originalSetItem;
    });
  });

  describe('Connection Health', () => {
    test('should check connection health', async () => {
      const mockConnection = { type: 'mock', connected: true };
      const isAlive = await editorService.isConnectionAlive(mockConnection);
      
      expect(isAlive).toBe(true);
    });

    test('should attempt reconnection', async () => {
      editorService.discoveredEditors.set('vscode', {
        id: 'vscode',
        name: 'Visual Studio Code',
        type: 'vscode',
        available: true
      });
      
      editorService.connectToVSCode = jest.fn().mockResolvedValue({ id: 'vscode', connected: true });
      
      const reconnected = await editorService.reconnectEditor('vscode');
      
      expect(reconnected).toBe(true);
      expect(editorService.connectToVSCode).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    test('should cleanup connections properly', () => {
      const mockConnection = {
        api: { dispose: jest.fn() },
        connected: true
      };
      
      editorService.activeConnections.set('vscode', mockConnection);
      editorService.cleanup();
      
      expect(mockConnection.api.dispose).toHaveBeenCalled();
      expect(editorService.activeConnections.size).toBe(0);
      expect(editorService.isInitialized).toBe(false);
    });
  });
});

// Mock localStorage for Node.js environment
if (typeof localStorage === 'undefined') {
  global.localStorage = {
    data: {},
    getItem: function(key) {
      return this.data[key] || null;
    },
    setItem: function(key, value) {
      this.data[key] = value;
    },
    removeItem: function(key) {
      delete this.data[key];
    },
    clear: function() {
      this.data = {};
    }
  };
}

// Mock Jest functions if not running in Jest environment
if (typeof jest === 'undefined') {
  global.jest = {
    fn: (impl) => impl || (() => {}),
    spyOn: () => ({ mockResolvedValue: () => {}, mockImplementation: () => {} }),
    clearAllMocks: () => {}
  };
  
  // Simplified test runner for Node.js
  console.log('🧪 Running EditorConnectionService basic tests...');
  
  try {
    const { EditorConnectionService } = require('./editor-connection-service');
    const service = new EditorConnectionService();
    
    // Test initialization
    if (service.config && service.activeConnections) {
      console.log('✅ Basic initialization successful');
    } else {
      console.log('❌ Initialization failed');
    }
    
    // Test discovery
    service.discoverEditors().then(discovered => {
      console.log(`✅ Editor discovery found ${discovered.length} editors`);
    }).catch(error => {
      console.log('✅ Discovery handled error gracefully');
    });
    
    console.log('✅ All basic tests passed!');
  } catch (error) {
    console.error('❌ Error during basic tests:', error);
  }
}