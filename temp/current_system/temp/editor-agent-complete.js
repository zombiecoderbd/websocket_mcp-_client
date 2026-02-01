#!/usr/bin/env node

/**
 * Editor Agent - Complete Implementation
 * MCP-Compliant Editor Integration Agent for VS Code and other editors
 * 
 * Features:
 * - MCP Protocol Compliance
 * - VS Code API Integration
 * - File Operations (Open, Save, Insert)
 * - Real-time Context Management
 * - WebSocket Communication
 * - Editor State Synchronization
 */

const WebSocket = require('ws');
const fs = require('fs').promises;
const path = require('path');

class EditorAgent {
    constructor() {
        this.agentId = 'editor-agent-1';
        this.sessionId = this.generateUUID();
        this.persona = 'code-assistant';
        
        // MCP Headers for traceability
        this.mcpHeaders = {
            'x-mcp-session': this.sessionId,
            'x-agent-id': this.agentId,
            'x-persona': this.persona,
            'x-editor': 'vscode',
            'x-request-id': ''
        };
        
        // Editor state
        this.editorState = {
            connected: false,
            workspace: '',
            currentFile: '',
            cursorPosition: { line: 0, column: 0 },
            language: '',
            selections: []
        };
        
        // WebSocket connection
        this.websocket = null;
        this.vscodeApiUrl = process.env.VSCODE_API_URL || 'http://localhost:3001';
        
        // Capabilities
        this.capabilities = [
            'file_operations',
            'code_completion', 
            'debugging_support',
            'refactoring_tools',
            'context_awareness',
            'realtime_sync'
        ];
        
        // Active operations queue
        this.operationQueue = [];
        this.isProcessing = false;
    }
    
    /**
     * Generate UUID for session tracking
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    /**
     * Connect to WebSocket server
     */
    async connect(websocketUrl = 'ws://localhost:8080') {
        try {
            this.websocket = new WebSocket(websocketUrl);
            
            this.websocket.on('open', () => {
                this.editorState.connected = true;
                console.log('✅ Editor Agent Connected to MCP Server');
                this.sendMCPMessage('agent_ready', {
                    agent_id: this.agentId,
                    capabilities: this.capabilities,
                    status: 'ready'
                });
            });
            
            this.websocket.on('message', (data) => {
                this.handleWebSocketMessage(data);
            });
            
            this.websocket.on('close', () => {
                this.editorState.connected = false;
                console.log('❌ Editor Agent Disconnected from MCP Server');
            });
            
            this.websocket.on('error', (error) => {
                console.error('❌ WebSocket Error:', error);
            });
            
        } catch (error) {
            console.error('❌ Failed to connect to WebSocket:', error);
        }
    }
    
    /**
     * Handle incoming WebSocket messages
     */
    handleWebSocketMessage(data) {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'editor_request':
                    this.processEditorRequest(message);
                    break;
                case 'file_operation':
                    this.processFileOperation(message);
                    break;
                case 'context_update':
                    this.updateEditorContext(message.data);
                    break;
                case 'agent_command':
                    this.executeAgentCommand(message);
                    break;
                default:
                    console.log('📥 Received unknown message type:', message.type);
            }
        } catch (error) {
            console.error('❌ Error processing WebSocket message:', error);
        }
    }
    
    /**
     * Send MCP-compliant message
     */
    sendMCPMessage(type, data, requestId = null) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            console.error('❌ WebSocket not connected');
            return;
        }
        
        const messageId = requestId || this.generateUUID();
        this.mcpHeaders['x-request-id'] = messageId;
        
        const message = {
            type: type,
            id: messageId,
            timestamp: new Date().toISOString(),
            headers: this.mcpHeaders,
            data: data
        };
        
        this.websocket.send(JSON.stringify(message));
        console.log('📤 Sent MCP message:', type, messageId);
    }
    
    /**
     * Process editor requests from MCP
     */
    async processEditorRequest(message) {
        const { action, filePath, content, cursor, language } = message.data;
        
        try {
            let result;
            
            switch (action) {
                case 'open_file':
                    result = await this.openFile(filePath);
                    break;
                case 'save_file':
                    result = await this.saveFile(filePath, content);
                    break;
                case 'insert_at_cursor':
                    result = await this.insertAtCursor(filePath, content, cursor);
                    break;
                case 'get_file_content':
                    result = await this.getFileContent(filePath);
                    break;
                case 'apply_diff':
                    result = await this.applyDiff(filePath, content);
                    break;
                default:
                    throw new Error(`Unknown action: ${action}`);
            }
            
            this.sendMCPMessage('editor_response', {
                success: true,
                action: action,
                result: result,
                original_request_id: message.id
            }, message.id);
            
        } catch (error) {
            console.error('❌ Editor request failed:', error);
            this.sendMCPMessage('editor_response', {
                success: false,
                error: error.message,
                original_request_id: message.id
            }, message.id);
        }
    }
    
    /**
     * Process file operations
     */
    async processFileOperation(message) {
        const { operation, source, destination, content } = message.data;
        
        try {
            let result;
            
            switch (operation) {
                case 'create':
                    result = await this.createFile(source, content);
                    break;
                case 'delete':
                    result = await this.deleteFile(source);
                    break;
                case 'move':
                    result = await this.moveFile(source, destination);
                    break;
                case 'copy':
                    result = await this.copyFile(source, destination);
                    break;
                default:
                    throw new Error(`Unknown file operation: ${operation}`);
            }
            
            this.sendMCPMessage('file_operation_response', {
                success: true,
                operation: operation,
                result: result,
                original_request_id: message.id
            }, message.id);
            
        } catch (error) {
            console.error('❌ File operation failed:', error);
            this.sendMCPMessage('file_operation_response', {
                success: false,
                error: error.message,
                original_request_id: message.id
            }, message.id);
        }
    }
    
    /**
     * Update editor context
     */
    updateEditorContext(contextData) {
        Object.assign(this.editorState, contextData);
        console.log('🔄 Editor context updated:', this.editorState);
    }
    
    /**
     * Execute agent-specific commands
     */
    executeAgentCommand(message) {
        const { command, params } = message.data;
        
        switch (command) {
            case 'get_capabilities':
                this.sendMCPMessage('agent_info', {
                    agent_id: this.agentId,
                    capabilities: this.capabilities,
                    status: this.editorState.connected ? 'active' : 'disconnected'
                });
                break;
            case 'set_persona':
                this.persona = params.persona;
                this.mcpHeaders['x-persona'] = this.persona;
                console.log(`👤 Persona updated to: ${this.persona}`);
                break;
            case 'get_state':
                this.sendMCPMessage('agent_state', {
                    agent_id: this.agentId,
                    state: this.editorState,
                    queue_length: this.operationQueue.length
                });
                break;
            default:
                console.log(`❓ Unknown agent command: ${command}`);
        }
    }
    
    // ==========================================
    // FILE OPERATIONS
    // ==========================================
    
    /**
     * Open file in editor
     */
    async openFile(filePath) {
        try {
            // Security check
            const resolvedPath = path.resolve(filePath);
            const workspaceRoot = this.editorState.workspace || process.cwd();
            
            if (!resolvedPath.startsWith(workspaceRoot)) {
                throw new Error('Access denied: path outside workspace');
            }
            
            // Try to read file to verify existence
            await fs.access(resolvedPath);
            
            // Update current file context
            this.editorState.currentFile = resolvedPath;
            this.editorState.language = this.detectLanguage(resolvedPath);
            
            console.log(`📂 Opened file: ${resolvedPath}`);
            
            // Send to VS Code API if available
            if (this.vscodeApiUrl) {
                try {
                    await fetch(`${this.vscodeApiUrl}/editor/open`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path: resolvedPath })
                    });
                } catch (apiError) {
                    console.warn('⚠️ VS Code API unavailable:', apiError.message);
                }
            }
            
            return {
                path: resolvedPath,
                language: this.editorState.language,
                exists: true
            };
            
        } catch (error) {
            throw new Error(`Failed to open file ${filePath}: ${error.message}`);
        }
    }
    
    /**
     * Save content to file
     */
    async saveFile(filePath, content) {
        try {
            const resolvedPath = path.resolve(filePath);
            const workspaceRoot = this.editorState.workspace || process.cwd();
            
            if (!resolvedPath.startsWith(workspaceRoot)) {
                throw new Error('Access denied: path outside workspace');
            }
            
            // Ensure directory exists
            const dirPath = path.dirname(resolvedPath);
            await fs.mkdir(dirPath, { recursive: true });
            
            // Write file
            await fs.writeFile(resolvedPath, content, 'utf8');
            
            console.log(`💾 Saved file: ${resolvedPath}`);
            
            // Notify VS Code if available
            if (this.vscodeApiUrl) {
                try {
                    await fetch(`${this.vscodeApiUrl}/editor/save`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path: resolvedPath, content })
                    });
                } catch (apiError) {
                    console.warn('⚠️ VS Code API unavailable:', apiError.message);
                }
            }
            
            return {
                path: resolvedPath,
                saved: true,
                size: content.length
            };
            
        } catch (error) {
            throw new Error(`Failed to save file ${filePath}: ${error.message}`);
        }
    }
    
    /**
     * Insert content at cursor position
     */
    async insertAtCursor(filePath, content, cursor = null) {
        try {
            const resolvedPath = path.resolve(filePath);
            
            // Read existing content
            let existingContent = '';
            try {
                existingContent = await fs.readFile(resolvedPath, 'utf8');
            } catch (readError) {
                // File doesn't exist, create new
                return await this.saveFile(filePath, content);
            }
            
            // Apply insertion at cursor position
            const insertPosition = cursor || this.editorState.cursorPosition;
            const lines = existingContent.split('\n');
            
            if (insertPosition.line < lines.length) {
                const line = lines[insertPosition.line];
                lines[insertPosition.line] = line.substring(0, insertPosition.column) + 
                                           content + 
                                           line.substring(insertPosition.column);
            } else {
                lines.push(content);
            }
            
            const newContent = lines.join('\n');
            return await this.saveFile(filePath, newContent);
            
        } catch (error) {
            throw new Error(`Failed to insert content: ${error.message}`);
        }
    }
    
    /**
     * Get file content
     */
    async getFileContent(filePath) {
        try {
            const resolvedPath = path.resolve(filePath);
            const content = await fs.readFile(resolvedPath, 'utf8');
            
            return {
                path: resolvedPath,
                content: content,
                language: this.detectLanguage(resolvedPath),
                size: content.length
            };
            
        } catch (error) {
            throw new Error(`Failed to read file ${filePath}: ${error.message}`);
        }
    }
    
    /**
     * Apply diff/patch to file
     */
    async applyDiff(filePath, diffContent) {
        try {
            // This is a simplified implementation
            // In production, you'd use a proper diff/patch library
            const existingContent = await this.getFileContent(filePath);
            const newContent = this.applySimplePatch(existingContent.content, diffContent);
            
            return await this.saveFile(filePath, newContent);
            
        } catch (error) {
            throw new Error(`Failed to apply diff: ${error.message}`);
        }
    }
    
    /**
     * Create new file
     */
    async createFile(filePath, content = '') {
        return await this.saveFile(filePath, content);
    }
    
    /**
     * Delete file
     */
    async deleteFile(filePath) {
        try {
            const resolvedPath = path.resolve(filePath);
            await fs.unlink(resolvedPath);
            
            console.log(`🗑️ Deleted file: ${resolvedPath}`);
            
            return {
                path: resolvedPath,
                deleted: true
            };
            
        } catch (error) {
            throw new Error(`Failed to delete file ${filePath}: ${error.message}`);
        }
    }
    
    /**
     * Move/rename file
     */
    async moveFile(sourcePath, destinationPath) {
        try {
            const resolvedSource = path.resolve(sourcePath);
            const resolvedDest = path.resolve(destinationPath);
            
            await fs.rename(resolvedSource, resolvedDest);
            
            console.log(`➡️ Moved file: ${resolvedSource} → ${resolvedDest}`);
            
            return {
                source: resolvedSource,
                destination: resolvedDest,
                moved: true
            };
            
        } catch (error) {
            throw new Error(`Failed to move file: ${error.message}`);
        }
    }
    
    /**
     * Copy file
     */
    async copyFile(sourcePath, destinationPath) {
        try {
            const resolvedSource = path.resolve(sourcePath);
            const resolvedDest = path.resolve(destinationPath);
            
            await fs.copyFile(resolvedSource, resolvedDest);
            
            console.log(`📋 Copied file: ${resolvedSource} → ${resolvedDest}`);
            
            return {
                source: resolvedSource,
                destination: resolvedDest,
                copied: true
            };
            
        } catch (error) {
            throw new Error(`Failed to copy file: ${error.message}`);
        }
    }
    
    // ==========================================
    // UTILITY METHODS
    // ==========================================
    
    /**
     * Detect programming language from file extension
     */
    detectLanguage(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const languageMap = {
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.java': 'java',
            '.go': 'go',
            '.rs': 'rust',
            '.cpp': 'cpp',
            '.c': 'c',
            '.cs': 'csharp',
            '.php': 'php',
            '.rb': 'ruby',
            '.swift': 'swift',
            '.kt': 'kotlin',
            '.sql': 'sql',
            '.html': 'html',
            '.css': 'css',
            '.scss': 'scss',
            '.json': 'json',
            '.xml': 'xml',
            '.md': 'markdown',
            '.yml': 'yaml',
            '.yaml': 'yaml'
        };
        
        return languageMap[ext] || 'plaintext';
    }
    
    /**
     * Simple patch application (placeholder for real diff library)
     */
    applySimplePatch(original, patch) {
        // This is a very basic implementation
        // In practice, use a proper diff/patch library like 'diff'
        if (patch.startsWith('+ ')) {
            return original + '\n' + patch.substring(2);
        }
        return patch; // Assume patch replaces entire content
    }
    
    /**
     * Queue operation for processing
     */
    queueOperation(operation) {
        this.operationQueue.push(operation);
        if (!this.isProcessing) {
            this.processQueue();
        }
    }
    
    /**
     * Process operation queue
     */
    async processQueue() {
        if (this.operationQueue.length === 0) {
            this.isProcessing = false;
            return;
        }
        
        this.isProcessing = true;
        const operation = this.operationQueue.shift();
        
        try {
            await operation();
        } catch (error) {
            console.error('❌ Queue operation failed:', error);
        }
        
        // Process next operation
        setImmediate(() => this.processQueue());
    }
    
    /**
     * Get agent status
     */
    getStatus() {
        return {
            agent_id: this.agentId,
            connected: this.editorState.connected,
            workspace: this.editorState.workspace,
            current_file: this.editorState.currentFile,
            language: this.editorState.language,
            capabilities: this.capabilities,
            queue_length: this.operationQueue.length,
            session_id: this.sessionId
        };
    }
    
    /**
     * Graceful shutdown
     */
    async shutdown() {
        console.log('🛑 Shutting down Editor Agent...');
        
        if (this.websocket) {
            this.sendMCPMessage('agent_shutdown', {
                agent_id: this.agentId,
                reason: 'manual_shutdown'
            });
            
            this.websocket.close();
        }
        
        // Wait for queue to drain
        while (this.operationQueue.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('✅ Editor Agent shutdown complete');
    }
}

// ==========================================
// MAIN EXECUTION
// ==========================================

async function main() {
    const agent = new EditorAgent();
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--connect') || args.length === 0) {
        // Connect to WebSocket server
        const wsUrl = args[args.indexOf('--ws-url') + 1] || 'ws://localhost:8080';
        await agent.connect(wsUrl);
        
        // Set workspace if provided
        const workspaceIndex = args.indexOf('--workspace');
        if (workspaceIndex !== -1 && workspaceIndex + 1 < args.length) {
            agent.editorState.workspace = path.resolve(args[workspaceIndex + 1]);
            console.log(`📁 Workspace set to: ${agent.editorState.workspace}`);
        }
        
        console.log('\n🚀 Editor Agent Started');
        console.log('========================');
        console.log(`Agent ID: ${agent.agentId}`);
        console.log(`Session ID: ${agent.sessionId}`);
        console.log(`Capabilities: ${agent.capabilities.join(', ')}`);
        console.log('Waiting for MCP commands...\n');
        
        // Keep process alive
        process.on('SIGINT', async () => {
            await agent.shutdown();
            process.exit(0);
        });
        
    } else if (args.includes('--test')) {
        // Run self-test
        console.log('🧪 Running Editor Agent Self-Test...\n');
        
        try {
            // Test file operations
            const testFile = './temp/test-file.txt';
            const testContent = 'Hello, Editor Agent!';
            
            console.log('1. Testing file creation...');
            await agent.createFile(testFile, testContent);
            console.log('✅ File creation successful');
            
            console.log('2. Testing file read...');
            const content = await agent.getFileContent(testFile);
            console.log('✅ File read successful:', content.content);
            
            console.log('3. Testing file update...');
            await agent.saveFile(testFile, testContent + '\nUpdated content');
            console.log('✅ File update successful');
            
            console.log('4. Testing file deletion...');
            await agent.deleteFile(testFile);
            console.log('✅ File deletion successful');
            
            console.log('\n🎉 All tests passed!');
            
        } catch (error) {
            console.error('❌ Test failed:', error.message);
        }
        
    } else {
        // Show usage
        console.log('Editor Agent - MCP Compliant Editor Integration');
        console.log('==============================================\n');
        console.log('Usage:');
        console.log('  node editor-agent-complete.js --connect [--ws-url <url>] [--workspace <path>]');
        console.log('  node editor-agent-complete.js --test');
        console.log('');
        console.log('Options:');
        console.log('  --connect     Connect to MCP WebSocket server');
        console.log('  --ws-url      WebSocket server URL (default: ws://localhost:8080)');
        console.log('  --workspace   Workspace root directory');
        console.log('  --test        Run self-test suite');
        console.log('');
        console.log('Features:');
        console.log('  • MCP Protocol Compliance');
        console.log('  • VS Code API Integration');
        console.log('  • File Operations (CRUD)');
        console.log('  • Real-time Context Management');
        console.log('  • WebSocket Communication');
        console.log('');
        console.log('Capabilities:', agent.capabilities.join(', '));
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the agent
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { EditorAgent };