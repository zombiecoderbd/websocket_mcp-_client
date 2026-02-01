// Editor Integration and MCP Communication Layer
// Handles real-time communication between editor and agent system

const WebSocket = require('ws');

class MCPCommunicationLayer {
  constructor(config = {}) {
    this.config = {
      mcpServerUrl: config.mcpServerUrl || 'ws://localhost:8080',
      reconnectInterval: config.reconnectInterval || 5000,
      heartbeatInterval: config.heartbeatInterval || 30000,
      maxRetries: config.maxRetries || 10,
      enableEncryption: config.enableEncryption !== false,
      enableCompression: config.enableCompression !== false,
      logLevel: config.logLevel || 'info'
    };

    this.ws = null;
    this.isConnected = false;
    this.retryCount = 0;
    this.heartbeatTimer = null;
    this.messageQueue = [];
    this.pendingRequests = new Map();
    this.eventHandlers = new Map();

    // Initialize editor integrations
    this.editorIntegrations = new Map();
    this.activeSessions = new Map();
  }

  /**
   * Initialize the MCP communication layer
   */
  async initialize() {
    this.connect();
    this.setupEventHandlers();
    this.log('MCP Communication Layer initialized', 'info');
  }

  /**
   * Connect to MCP server
   */
  connect() {
    try {
      this.log(`Connecting to MCP server: ${this.config.mcpServerUrl}`, 'info');
      
      this.ws = new WebSocket(this.config.mcpServerUrl);
      
      this.ws.on('open', () => {
        this.handleConnectionOpen();
      });
      
      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });
      
      this.ws.on('close', (code, reason) => {
        this.handleConnectionClose(code, reason);
      });
      
      this.ws.on('error', (error) => {
        this.handleConnectionError(error);
      });
    } catch (error) {
      this.log(`Failed to connect to MCP server: ${error.message}`, 'error');
      this.scheduleReconnect();
    }
  }

  /**
   * Handle connection open
   */
  handleConnectionOpen() {
    this.isConnected = true;
    this.retryCount = 0;
    this.log('Connected to MCP server successfully', 'success');
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Process queued messages
    this.processMessageQueue();
    
    // Emit connection event
    this.emitEvent('connection-open', { timestamp: new Date().toISOString() });
  }

  /**
   * Handle incoming message
   */
  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      this.log(`Received message: ${message.type}`, 'debug');
      
      // Handle different message types
      switch (message.type) {
        case 'welcome':
          this.handleWelcomeMessage(message);
          break;
        case 'response':
          this.handleResponseMessage(message);
          break;
        case 'progress':
          this.handleProgressMessage(message);
          break;
        case 'pong':
          this.handlePongMessage(message);
          break;
        case 'notification':
          this.handleNotificationMessage(message);
          break;
        default:
          this.handleGenericMessage(message);
      }
      
      // Emit message event
      this.emitEvent('message', message);
    } catch (error) {
      this.log(`Error parsing message: ${error.message}`, 'error');
    }
  }

  /**
   * Handle welcome message
   */
  handleWelcomeMessage(message) {
    this.log('MCP server welcome received', 'info');
    this.emitEvent('welcome', message.data);
  }

  /**
   * Handle response message
   */
  handleResponseMessage(message) {
    const requestId = message.request_id || message.id;
    const resolver = this.pendingRequests.get(requestId);
    
    if (resolver) {
      resolver.resolve(message);
      this.pendingRequests.delete(requestId);
    } else {
      // Handle response without pending request
      this.emitEvent('response', message);
    }
  }

  /**
   * Handle progress message
   */
  handleProgressMessage(message) {
    this.emitEvent('progress', message);
  }

  /**
   * Handle pong message
   */
  handlePongMessage(message) {
    this.log('Heartbeat pong received', 'debug');
  }

  /**
   * Handle notification message
   */
  handleNotificationMessage(message) {
    this.emitEvent('notification', message);
  }

  /**
   * Handle generic message
   */
  handleGenericMessage(message) {
    this.log(`Unhandled message type: ${message.type}`, 'warn');
  }

  /**
   * Handle connection close
   */
  handleConnectionClose(code, reason) {
    this.isConnected = false;
    this.log(`MCP server connection closed: ${code} - ${reason}`, 'warn');
    
    // Clear heartbeat timer
    this.stopHeartbeat();
    
    // Emit disconnection event
    this.emitEvent('connection-close', { code, reason, timestamp: new Date().toISOString() });
    
    // Attempt to reconnect
    this.scheduleReconnect();
  }

  /**
   * Handle connection error
   */
  handleConnectionError(error) {
    this.log(`MCP server connection error: ${error.message}`, 'error');
    
    // Emit error event
    this.emitEvent('connection-error', { error: error.message, timestamp: new Date().toISOString() });
  }

  /**
   * Schedule reconnection
   */
  scheduleReconnect() {
    if (this.retryCount < this.config.maxRetries) {
      this.retryCount++;
      this.log(`Scheduling reconnection attempt ${this.retryCount}/${this.config.maxRetries}`, 'info');
      
      setTimeout(() => {
        this.connect();
      }, this.config.reconnectInterval);
    } else {
      this.log('Maximum reconnection attempts reached', 'error');
      this.emitEvent('max-retries-exceeded', { maxRetries: this.config.maxRetries });
    }
  }

  /**
   * Start heartbeat
   */
  startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    this.heartbeatTimer = setInterval(() => {
      this.sendPing();
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Send ping for heartbeat
   */
  sendPing() {
    if (this.isConnected) {
      this.sendMessage({
        type: 'ping',
        id: `ping-${Date.now()}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Send message to MCP server
   */
  sendMessage(message) {
    if (!this.isConnected) {
      // Queue message if not connected
      this.messageQueue.push(message);
      this.log('Message queued for sending when connected', 'debug');
      return Promise.reject(new Error('Not connected to MCP server'));
    }

    try {
      const messageStr = JSON.stringify(message);
      this.ws.send(messageStr);
      this.log(`Sent message: ${message.type}`, 'debug');
      return Promise.resolve();
    } catch (error) {
      this.log(`Error sending message: ${error.message}`, 'error');
      return Promise.reject(error);
    }
  }

  /**
   * Send request and wait for response
   */
  sendRequest(request, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const requestId = request.id || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      request.id = requestId;
      request.timestamp = new Date().toISOString();
      
      // Store resolver
      this.pendingRequests.set(requestId, { resolve, reject });
      
      // Send request
      this.sendMessage(request)
        .catch(error => {
          // Reject if send fails
          this.pendingRequests.delete(requestId);
          reject(error);
        });
      
      // Set timeout
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error(`Request ${requestId} timed out after ${timeout}ms`));
        }
      }, timeout);
    });
  }

  /**
   * Process queued messages
   */
  processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.sendMessage(message).catch(error => {
        this.log(`Failed to send queued message: ${error.message}`, 'error');
        // Put message back in queue if send fails
        this.messageQueue.unshift(message);
      });
    }
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    // Setup default event handlers
    this.on('connection-error', (data) => {
      this.log(`Connection error occurred: ${data.error}`, 'error');
    });

    this.on('max-retries-exceeded', (data) => {
      this.log(`Max retries exceeded: ${data.maxRetries}`, 'error');
    });

    this.on('progress', (message) => {
      this.log(`Progress: ${message.data.message} (${Math.round(message.data.progress * 100)}%)`, 'info');
    });
  }

  /**
   * Register event handler
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  /**
   * Remove event handler
   */
  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  emitEvent(event, data) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          this.log(`Error in event handler for ${event}: ${error.message}`, 'error');
        }
      });
    }
  }

  /**
   * Register editor integration
   */
  registerEditorIntegration(editorType, integration) {
    this.editorIntegrations.set(editorType, integration);
    this.log(`Registered editor integration: ${editorType}`, 'info');
    
    // Emit registration event
    this.emitEvent('editor-registration', { editorType, timestamp: new Date().toISOString() });
  }

  /**
   * Get editor integration
   */
  getEditorIntegration(editorType) {
    return this.editorIntegrations.get(editorType);
  }

  /**
   * Create editor session
   */
  createEditorSession(editorType, sessionData) {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const session = {
      sessionId,
      editorType,
      ...sessionData,
      createdAt: new Date().toISOString(),
      status: 'active',
      connection: this
    };
    
    this.activeSessions.set(sessionId, session);
    
    // Emit session creation event
    this.emitEvent('session-created', { sessionId, editorType, timestamp: new Date().toISOString() });
    
    return session;
  }

  /**
   * Get active session
   */
  getActiveSession(sessionId) {
    return this.activeSessions.get(sessionId);
  }

  /**
   * End editor session
   */
  endEditorSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'ended';
      session.endedAt = new Date().toISOString();
      
      // Emit session end event
      this.emitEvent('session-ended', { sessionId, timestamp: new Date().toISOString() });
      
      return session;
    }
    return null;
  }

  /**
   * Send editor command
   */
  async sendEditorCommand(sessionId, command, params) {
    const session = this.getActiveSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const request = {
      type: 'request',
      subtype: 'editor-command',
      session_id: sessionId,
      command,
      params,
      timestamp: new Date().toISOString()
    };

    return await this.sendRequest(request);
  }

  /**
   * Send agent command
   */
  async sendAgentCommand(sessionId, agentId, command, payload) {
    const session = this.getActiveSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const request = {
      type: 'request',
      subtype: 'agent-command',
      session_id: sessionId,
      agent_id: agentId,
      command,
      payload,
      timestamp: new Date().toISOString()
    };

    return await this.sendRequest(request);
  }

  /**
   * Send file operation
   */
  async sendFileOperation(sessionId, operation, filePath, content = null) {
    const session = this.getActiveSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const request = {
      type: 'request',
      subtype: 'file-operation',
      session_id: sessionId,
      operation,
      file_path: filePath,
      content,
      timestamp: new Date().toISOString()
    };

    return await this.sendRequest(request);
  }

  /**
   * Log message
   */
  log(message, level = 'info') {
    if (this.shouldLog(level)) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [MCP-${level.toUpperCase()}] ${message}`;
      
      switch (level) {
        case 'error':
          console.error(logMessage);
          break;
        case 'warn':
          console.warn(logMessage);
          break;
        case 'debug':
          if (this.config.logLevel === 'debug') {
            console.log(logMessage);
          }
          break;
        default:
          console.log(logMessage);
      }
    }
  }

  /**
   * Check if message should be logged based on level
   */
  shouldLog(level) {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex <= currentLevelIndex;
  }

  /**
   * Close connection
   */
  close() {
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.isConnected = false;
      this.log('MCP Communication Layer closed', 'info');
    }
  }
}

module.exports = { MCPCommunicationLayer };