// VS Code Extension for Editor Agent Integration
// This extension bridges VS Code with the MCP Editor Agent

const vscode = require('vscode');
const WebSocket = require('ws');

class VSCodeEditorBridge {
    constructor() {
        this.websocket = null;
        this.isConnected = false;
        this.agentUrl = 'ws://localhost:8080';
        this.sessionId = this.generateUUID();
        
        // Track editor state
        this.editorState = {
            workspace: vscode.workspace.rootPath || '',
            activeFile: '',
            language: '',
            cursor: { line: 0, column: 0 },
            selections: []
        };
    }
    
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    async connect() {
        try {
            this.websocket = new WebSocket(this.agentUrl);
            
            this.websocket.on('open', () => {
                this.isConnected = true;
                vscode.window.showInformationMessage('✅ Connected to Editor Agent');
                this.sendStatusUpdate();
            });
            
            this.websocket.on('message', (data) => {
                this.handleAgentMessage(JSON.parse(data));
            });
            
            this.websocket.on('close', () => {
                this.isConnected = false;
                vscode.window.showWarningMessage('❌ Disconnected from Editor Agent');
            });
            
            this.websocket.on('error', (error) => {
                vscode.window.showErrorMessage(`WebSocket Error: ${error.message}`);
            });
            
        } catch (error) {
            vscode.window.showErrorMessage(`Connection failed: ${error.message}`);
        }
    }
    
    disconnect() {
        if (this.websocket) {
            this.websocket.close();
            this.isConnected = false;
        }
    }
    
    handleAgentMessage(message) {
        switch (message.type) {
            case 'editor_request':
                this.processEditorRequest(message);
                break;
            case 'file_operation':
                this.processFileOperation(message);
                break;
            case 'show_message':
                this.showMessage(message.data);
                break;
            case 'apply_diff':
                this.applyDiff(message.data);
                break;
            default:
                console.log('Received unknown message type:', message.type);
        }
    }
    
    async processEditorRequest(message) {
        const { action, path, content, cursor } = message.data;
        
        try {
            let result;
            
            switch (action) {
                case 'open_file':
                    result = await this.openFile(path);
                    break;
                case 'save_file':
                    result = await this.saveFile(path, content);
                    break;
                case 'insert_at_cursor':
                    result = await this.insertAtCursor(path, content, cursor);
                    break;
                case 'get_file_content':
                    result = await this.getFileContent(path);
                    break;
                default:
                    throw new Error(`Unknown action: ${action}`);
            }
            
            this.sendResponse(message.id, result);
            
        } catch (error) {
            this.sendErrorResponse(message.id, error.message);
        }
    }
    
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
                    throw new Error(`Unknown operation: ${operation}`);
            }
            
            this.sendResponse(message.id, result);
            
        } catch (error) {
            this.sendErrorResponse(message.id, error.message);
        }
    }
    
    // File Operations
    
    async openFile(filePath) {
        const uri = vscode.Uri.file(filePath);
        const document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document);
        
        this.updateActiveFile(document);
        return { success: true, path: filePath };
    }
    
    async saveFile(filePath, content) {
        const uri = vscode.Uri.file(filePath);
        const edit = new vscode.WorkspaceEdit();
        edit.replace(uri, new vscode.Range(0, 0, Number.MAX_SAFE_INTEGER, 0), content);
        
        await vscode.workspace.applyEdit(edit);
        
        const document = await vscode.workspace.openTextDocument(uri);
        if (document.isDirty) {
            await document.save();
        }
        
        return { success: true, path: filePath };
    }
    
    async insertAtCursor(filePath, content, cursor = null) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            throw new Error('No active editor');
        }
        
        const position = cursor ? 
            new vscode.Position(cursor.line, cursor.column) : 
            editor.selection.active;
            
        const edit = new vscode.WorkspaceEdit();
        edit.insert(editor.document.uri, position, content);
        
        await vscode.workspace.applyEdit(edit);
        return { success: true };
    }
    
    async getFileContent(filePath) {
        const uri = vscode.Uri.file(filePath);
        const document = await vscode.workspace.openTextDocument(uri);
        return {
            content: document.getText(),
            language: document.languageId
        };
    }
    
    async createFile(filePath, content = '') {
        const uri = vscode.Uri.file(filePath);
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
        return { success: true, path: filePath };
    }
    
    async deleteFile(filePath) {
        const uri = vscode.Uri.file(filePath);
        await vscode.workspace.fs.delete(uri);
        return { success: true, path: filePath };
    }
    
    async moveFile(sourcePath, destinationPath) {
        const sourceUri = vscode.Uri.file(sourcePath);
        const destUri = vscode.Uri.file(destinationPath);
        await vscode.workspace.fs.rename(sourceUri, destUri);
        return { success: true, source: sourcePath, destination: destinationPath };
    }
    
    async copyFile(sourcePath, destinationPath) {
        const sourceUri = vscode.Uri.file(sourcePath);
        const destUri = vscode.Uri.file(destinationPath);
        const content = await vscode.workspace.fs.readFile(sourceUri);
        await vscode.workspace.fs.writeFile(destUri, content);
        return { success: true, source: sourcePath, destination: destinationPath };
    }
    
    // Utility Methods
    
    updateActiveFile(document) {
        this.editorState.activeFile = document.fileName;
        this.editorState.language = document.languageId;
        
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const position = editor.selection.active;
            this.editorState.cursor = {
                line: position.line,
                column: position.character
            };
        }
        
        this.sendStatusUpdate();
    }
    
    showMessage(data) {
        const { type, message } = data;
        switch (type) {
            case 'info':
                vscode.window.showInformationMessage(message);
                break;
            case 'warning':
                vscode.window.showWarningMessage(message);
                break;
            case 'error':
                vscode.window.showErrorMessage(message);
                break;
        }
    }
    
    async applyDiff(data) {
        const { path, diff } = data;
        // Simplified diff application - in practice, use proper diff library
        const content = typeof diff === 'string' ? diff : diff.content;
        await this.saveFile(path, content);
    }
    
    sendStatusUpdate() {
        if (this.isConnected && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'editor_status',
                id: this.generateUUID(),
                timestamp: new Date().toISOString(),
                data: {
                    ...this.editorState,
                    connected: this.isConnected,
                    sessionId: this.sessionId
                }
            }));
        }
    }
    
    sendResponse(requestId, data) {
        if (this.isConnected && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'editor_response',
                id: requestId,
                timestamp: new Date().toISOString(),
                data: { success: true, ...data }
            }));
        }
    }
    
    sendErrorResponse(requestId, error) {
        if (this.isConnected && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'editor_response',
                id: requestId,
                timestamp: new Date().toISOString(),
                data: { success: false, error: error }
            }));
        }
    }
    
    dispose() {
        this.disconnect();
    }
}

// Extension activation
function activate(context) {
    console.log('	Editor Agent Extension activated');
    
    const bridge = new VSCodeEditorBridge();
    
    // Register commands
    const connectCommand = vscode.commands.registerCommand('editorAgent.connect', () => {
        bridge.connect();
    });
    
    const disconnectCommand = vscode.commands.registerCommand('editorAgent.disconnect', () => {
        bridge.disconnect();
        vscode.window.showInformationMessage('Disconnected from Editor Agent');
    });
    
    const statusCommand = vscode.commands.registerCommand('editorAgent.status', () => {
        const status = bridge.isConnected ? 'Connected' : 'Disconnected';
        vscode.window.showInformationMessage(`Editor Agent Status: ${status}`);
    });
    
    // Track editor changes
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && editor.document) {
            bridge.updateActiveFile(editor.document);
        }
    });
    
    vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document === vscode.window.activeTextEditor?.document) {
            bridge.updateActiveFile(event.document);
        }
    });
    
    // Add to subscriptions
    context.subscriptions.push(connectCommand, disconnectCommand, statusCommand, bridge);
    
    // Auto-connect if configured
    const config = vscode.workspace.getConfiguration('editorAgent');
    if (config.get('autoConnect')) {
        setTimeout(() => bridge.connect(), 1000);
    }
}

function deactivate() {
    console.log('	Editor Agent Extension deactivated');
}

module.exports = {
    activate,
    deactivate
};