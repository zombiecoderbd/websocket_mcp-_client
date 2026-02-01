// Automatic Editor Connection Service
// Handles automatic detection and connection to various editors

class EditorConnectionService {
  constructor(config = {}) {
    this.config = {
      supportedEditors: config.supportedEditors || ['vscode', 'cursor', 'jetbrains', 'sublime', 'vim'],
      autoConnect: config.autoConnect !== false,
      connectionTimeout: config.connectionTimeout || 5000,
      retryAttempts: config.retryAttempts || 3,
      enableDiscovery: config.enableDiscovery !== false,
      localStorageKey: config.localStorageKey || 'editor_connections'
    };
    
    this.activeConnections = new Map();
    this.discoveredEditors = new Map();
    this.connectionCallbacks = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the editor connection service
   */
  async initialize() {
    if (this.isInitialized) return;
    
    // Load saved connections from localStorage
    this.loadSavedConnections();
    
    // Start editor discovery if enabled
    if (this.config.enableDiscovery) {
      await this.discoverEditors();
    }
    
    // Set up auto-connection if enabled
    if (this.config.autoConnect) {
      this.setupAutoConnection();
    }
    
    this.isInitialized = true;
    console.log('✅ Editor Connection Service initialized');
  }

  /**
   * Discover available editors on the system
   */
  async discoverEditors() {
    const discovered = [];
    
    // Check for VS Code/Cursor (common installations)
    const vscodePaths = [
      '/usr/bin/code',
      '/usr/local/bin/code',
      '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
      'C:\\Program Files\\Microsoft VS Code\\bin\\code.cmd'
    ];
    
    for (const path of vscodePaths) {
      if (await this.checkExecutableExists(path)) {
        discovered.push({
          id: 'vscode',
          name: 'Visual Studio Code',
          type: 'vscode',
          path: path,
          available: true,
          priority: 1
        });
        break;
      }
    }
    
    // Check for Cursor (if installed)
    const cursorPaths = [
      '/usr/bin/cursor',
      '/usr/local/bin/cursor',
      '/Applications/Cursor.app/Contents/Resources/app/bin/cursor'
    ];
    
    for (const path of cursorPaths) {
      if (await this.checkExecutableExists(path)) {
        discovered.push({
          id: 'cursor',
          name: 'Cursor',
          type: 'cursor',
          path: path,
          available: true,
          priority: 2
        });
        break;
      }
    }
    
    // Check for JetBrains IDEs
    const jetbrainsPaths = [
      '/usr/bin/idea',
      '/usr/local/bin/idea',
      '/Applications/IntelliJ IDEA.app/Contents/MacOS/idea'
    ];
    
    for (const path of jetbrainsPaths) {
      if (await this.checkExecutableExists(path)) {
        discovered.push({
          id: 'jetbrains',
          name: 'JetBrains IDE',
          type: 'jetbrains',
          path: path,
          available: true,
          priority: 3
        });
        break;
      }
    }
    
    // Store discovered editors
    discovered.forEach(editor => {
      this.discoveredEditors.set(editor.id, editor);
    });
    
    console.log(`✅ Discovered ${discovered.length} editors:`, discovered.map(e => e.name));
    return discovered;
  }

  /**
   * Check if an executable exists and is accessible
   */
  async checkExecutableExists(path) {
    try {
      // In browser environment, we can't check file system directly
      // This would be implemented differently in Node.js environment
      if (typeof window !== 'undefined') {
        // Browser check - look for editor extensions or APIs
        return this.checkBrowserEditorSupport(path);
      }
      
      // Node.js environment check
      const { access } = require('fs').promises;
      await access(path);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check for browser-based editor support
   */
  checkBrowserEditorSupport(path) {
    // Check for VS Code Web extension
    if (path.includes('code') && typeof acquireVsCodeApi !== 'undefined') {
      return true;
    }
    
    // Check for other web-based editors
    if (path.includes('cursor') && typeof cursor !== 'undefined') {
      return true;
    }
    
    return false;
  }

  /**
   * Connect to a specific editor
   */
  async connectToEditor(editorId, options = {}) {
    const editor = this.discoveredEditors.get(editorId);
    if (!editor) {
      throw new Error(`Editor ${editorId} not found`);
    }

    try {
      console.log(`🔌 Connecting to ${editor.name}...`);
      
      // Create connection based on editor type
      let connection;
      switch (editor.type) {
        case 'vscode':
          connection = await this.connectToVSCode(editor, options);
          break;
        case 'cursor':
          connection = await this.connectToCursor(editor, options);
          break;
        case 'jetbrains':
          connection = await this.connectToJetBrains(editor, options);
          break;
        default:
          connection = await this.connectToGenericEditor(editor, options);
      }
      
      if (connection) {
        this.activeConnections.set(editorId, connection);
        this.saveConnection(editorId, connection);
        
        // Execute connection callbacks
        const callbacks = this.connectionCallbacks.get(editorId) || [];
        callbacks.forEach(callback => callback(connection));
        
        console.log(`✅ Connected to ${editor.name}`);
        return connection;
      }
      
    } catch (error) {
      console.error(`❌ Failed to connect to ${editor.name}:`, error);
      throw error;
    }
  }

  /**
   * Connect to VS Code
   */
  async connectToVSCode(editor, options) {
    try {
      // Try VS Code Web API first
      if (typeof acquireVsCodeApi !== 'undefined') {
        const vscode = acquireVsCodeApi();
        return {
          id: editor.id,
          type: 'vscode-web',
          api: vscode,
          connected: true,
          capabilities: ['file_operations', 'terminal', 'debugging']
        };
      }
      
      // Try VS Code desktop connection
      const connection = await this.attemptVSCodeDesktopConnection(options);
      if (connection) {
        return {
          id: editor.id,
          type: 'vscode-desktop',
          connection: connection,
          connected: true,
          capabilities: ['file_operations', 'terminal', 'debugging', 'extensions']
        };
      }
      
      return null;
    } catch (error) {
      console.error('VS Code connection failed:', error);
      return null;
    }
  }

  /**
   * Connect to Cursor
   */
  async connectToCursor(editor, options) {
    try {
      // Try Cursor Web API
      if (typeof cursor !== 'undefined') {
        return {
          id: editor.id,
          type: 'cursor-web',
          api: cursor,
          connected: true,
          capabilities: ['ai_assistant', 'file_operations', 'terminal']
        };
      }
      
      // Try Cursor desktop connection
      const connection = await this.attemptCursorDesktopConnection(options);
      if (connection) {
        return {
          id: editor.id,
          type: 'cursor-desktop',
          connection: connection,
          connected: true,
          capabilities: ['ai_assistant', 'file_operations', 'terminal', 'chat']
        };
      }
      
      return null;
    } catch (error) {
      console.error('Cursor connection failed:', error);
      return null;
    }
  }

  /**
   * Connect to JetBrains IDEs
   */
  async connectToJetBrains(editor, options) {
    try {
      const connection = await this.attemptJetBrainsConnection(options);
      if (connection) {
        return {
          id: editor.id,
          type: 'jetbrains',
          connection: connection,
          connected: true,
          capabilities: ['file_operations', 'debugging', 'refactoring']
        };
      }
      return null;
    } catch (error) {
      console.error('JetBrains connection failed:', error);
      return null;
    }
  }

  /**
   * Connect to generic editor
   */
  async connectToGenericEditor(editor, options) {
    try {
      // Attempt generic connection protocol
      const connection = await this.attemptGenericConnection(editor, options);
      if (connection) {
        return {
          id: editor.id,
          type: 'generic',
          connection: connection,
          connected: true,
          capabilities: ['basic_file_operations']
        };
      }
      return null;
    } catch (error) {
      console.error('Generic editor connection failed:', error);
      return null;
    }
  }

  /**
   * Attempt VS Code desktop connection
   */
  async attemptVSCodeDesktopConnection(options) {
    // This would typically use VS Code's extension API or LSP
    // For now, return a mock connection for demonstration
    return {
      type: 'mock',
      editor: 'vscode',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Attempt Cursor desktop connection
   */
  async attemptCursorDesktopConnection(options) {
    // This would use Cursor's specific APIs
    return {
      type: 'mock',
      editor: 'cursor',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Attempt JetBrains connection
   */
  async attemptJetBrainsConnection(options) {
    // This would use JetBrains' plugin APIs
    return {
      type: 'mock',
      editor: 'jetbrains',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Attempt generic connection
   */
  async attemptGenericConnection(editor, options) {
    // Generic connection protocol
    return {
      type: 'mock',
      editor: editor.type,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Setup automatic connection
   */
  setupAutoConnection() {
    // Auto-connect to preferred editor
    const preferredEditor = this.getPreferredEditor();
    if (preferredEditor) {
      setTimeout(() => {
        this.connectToEditor(preferredEditor.id).catch(error => {
          console.warn('Auto-connection failed:', error);
        });
      }, 1000);
    }
    
    // Set up periodic connection checks
    setInterval(() => {
      this.checkConnections();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Get preferred editor based on system and user preferences
   */
  getPreferredEditor() {
    // Check localStorage for user preference
    const savedPreference = localStorage.getItem('preferred_editor');
    if (savedPreference) {
      const editor = this.discoveredEditors.get(savedPreference);
      if (editor) return editor;
    }
    
    // Find highest priority available editor
    let preferredEditor = null;
    let highestPriority = 0;
    
    for (const [id, editor] of this.discoveredEditors) {
      if (editor.available && editor.priority > highestPriority) {
        highestPriority = editor.priority;
        preferredEditor = editor;
      }
    }
    
    return preferredEditor;
  }

  /**
   * Check connection status for all active connections
   */
  async checkConnections() {
    for (const [editorId, connection] of this.activeConnections) {
      try {
        // Check if connection is still alive
        const isAlive = await this.isConnectionAlive(connection);
        if (!isAlive) {
          console.warn(`⚠️ Connection to ${editorId} lost, attempting reconnection...`);
          await this.reconnectEditor(editorId);
        }
      } catch (error) {
        console.error(`Error checking connection for ${editorId}:`, error);
      }
    }
  }

  /**
   * Check if a connection is still alive
   */
  async isConnectionAlive(connection) {
    // Implementation depends on connection type
    // For now, return true for mock connections
    return connection.type === 'mock' || connection.connected === true;
  }

  /**
   * Reconnect to an editor
   */
  async reconnectEditor(editorId) {
    try {
      const editor = this.discoveredEditors.get(editorId);
      if (!editor) return false;
      
      await this.connectToEditor(editorId);
      return true;
    } catch (error) {
      console.error(`Failed to reconnect to ${editorId}:`, error);
      return false;
    }
  }

  /**
   * Register connection callback
   */
  onConnection(editorId, callback) {
    if (!this.connectionCallbacks.has(editorId)) {
      this.connectionCallbacks.set(editorId, []);
    }
    this.connectionCallbacks.get(editorId).push(callback);
  }

  /**
   * Get active connection
   */
  getConnection(editorId) {
    return this.activeConnections.get(editorId);
  }

  /**
   * Get all active connections
   */
  getActiveConnections() {
    return Array.from(this.activeConnections.entries()).map(([id, connection]) => ({
      editorId: id,
      ...connection
    }));
  }

  /**
   * Save connection to localStorage
   */
  saveConnection(editorId, connection) {
    try {
      const connections = JSON.parse(localStorage.getItem(this.config.localStorageKey) || '{}');
      connections[editorId] = {
        ...connection,
        lastConnected: new Date().toISOString(),
        saved: true
      };
      localStorage.setItem(this.config.localStorageKey, JSON.stringify(connections));
    } catch (error) {
      console.error('Failed to save connection:', error);
    }
  }

  /**
   * Load saved connections from localStorage
   */
  loadSavedConnections() {
    try {
      const connections = JSON.parse(localStorage.getItem(this.config.localStorageKey) || '{}');
      Object.entries(connections).forEach(([editorId, connection]) => {
        if (connection.saved) {
          this.activeConnections.set(editorId, connection);
        }
      });
    } catch (error) {
      console.error('Failed to load saved connections:', error);
    }
  }

  /**
   * Clean up connections
   */
  cleanup() {
    for (const [editorId, connection] of this.activeConnections) {
      try {
        if (connection.api && typeof connection.api.dispose === 'function') {
          connection.api.dispose();
        }
      } catch (error) {
        console.error(`Error cleaning up connection for ${editorId}:`, error);
      }
    }
    
    this.activeConnections.clear();
    this.isInitialized = false;
  }
}

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EditorConnectionService };
}

// Export for browser environment
if (typeof window !== 'undefined') {
  window.EditorConnectionService = EditorConnectionService;
}