// VS Code Extension for Direct Agent-Editor Integration
// This extension provides native integration with the Agent-Editor Bridge

const vscode = require('vscode');
const WebSocket = require('ws');

class DirectEditorIntegration {
    constructor() {
        this.websocket = null;
        this.isConnected = false;
        this.bridgeUrl = 'ws://localhost:8081';
        this.connectionId = null;
        this.eventSubscriptions = [];
        
        // Editor state tracking
        this.editorState = {
            activeFile: '',
            language: '',
            cursor: { line: 0, column: 0 },
            selections: [],
            workspace: vscode.workspace.rootPath || ''
        };
        
        // Performance tracking
        this.performance = {
            messageCount: 0,
            avgResponseTime: 0,
            lastMessageTime: 0
        };
    }
    
    async activate(context) {
        console.log('Direct Editor Integration activated');
        
        // Register commands
        const connectCommand = vscode.commands.registerCommand(
            'directEditor.connect', 
            () => this.connectToBridge()
        );
        
        const disconnectCommand = vscode.commands.registerCommand(
            'directEditor.disconnect', 
            () => this.disconnectFromBridge()
        );
        
        const statusCommand = vscode.commands.registerCommand(
            'directEditor.status', 
            () => this.showStatus()
        );
        
        const sendTestCommand = vscode.commands.registerCommand(
            'directEditor.sendTest', 
            () => this.sendTestMessage()
        );
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Add to context subscriptions
        context.subscriptions.push(
            connectCommand,
            disconnectCommand,
            statusCommand,
            sendTestCommand,
            ...this.eventSubscriptions,
            this
        );
        
        // Auto-connect if configured
        const config = vscode.workspace.getConfiguration('directEditor');
        if (config.get('autoConnect')) {
            setTimeout(() => this.connectToBridge(), 1000);
        }
    }
    
    setupEventListeners() {
        // Track active editor changes
        const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor(
            (editor) => {
                if (editor && editor.document) {
                    this.updateEditorState(editor);
                    this.sendEditorEvent('editor_focus', {
                        file: editor.document.fileName,
                        language: editor.document.languageId
                    });
                }
            }
        );
        
        // Track text document changes
        const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument(
            (event) => {
                if (event.document === vscode.window.activeTextEditor?.document) {
                    this.sendEditorEvent('document_change', {
                        changes: event.contentChanges.map(change => ({
                            range: change.range,
                            text: change.text
                        })),
                        file: event.document.fileName
                    });
                }
            }
        );
        
        // Track cursor movements
        const cursorChangeDisposable = vscode.window.onDidChangeTextEditorSelection(
            (event) => {
                if (event.textEditor === vscode.window.activeTextEditor) {
                    const position = event.selections[0].active;
                    this.editorState.cursor = {
                        line: position.line,
                        column: position.character
                    };
                    this.editorState.selections = event.selections.map(sel => ({
                        start: sel.start,
                        end: sel.end
                    }));
                    
                    this.sendEditorEvent('cursor_move', {
                        cursor: this.editorState.cursor,
                        selections: this.editorState.selections
                    });
                }
            }
        );
        
        // Track file saves
        const saveDisposable = vscode.workspace.onDidSaveTextDocument(
            (document) => {
                this.sendEditorEvent('file_save', {
                    file: document.fileName,
                    content: document.getText()
                });
            }
        );
        
        this.eventSubscriptions.push(
            editorChangeDisposable,
            documentChangeDisposable,
            cursorChangeDisposable,
            saveDisposable
        );
    }
    
    async connectToBridge() {
        try {
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                vscode.window.showInformationMessage('Already connected to bridge');
                return;
            }
            
            this.websocket = new WebSocket(this.bridgeUrl);
            
            this.websocket.on('open', () => {
                this.isConnected = true;
                this.registerWithBridge();
                vscode.window.showInformationMessage('✅ Connected to Agent-Editor Bridge');
            });
            
            this.websocket.on('message', (data) => {
                this.handleBridgeMessage(JSON.parse(data.toString()));
            });
            
            this.websocket.on('close', () => {
                this.isConnected = false;
                this.connectionId = null;
                vscode.window.showWarningMessage('❌ Disconnected from Agent-Editor Bridge');
            });
            
            this.websocket.on('error', (error) => {
                vscode.window.showErrorMessage(`Bridge connection error: ${error.message}`);
            });
            
        } catch (error) {
            vscode.window.showErrorMessage(`Connection failed: ${error.message}`);
        }
    }
    
    disconnectFromBridge() {
        if (this.websocket) {
            this.websocket.close();
            this.isConnected = false;
            this.connectionId = null;
            vscode.window.showInformationMessage('Disconnected from bridge');
        }
    }
    
    registerWithBridge() {
        const registrationMessage = {
            type: 'register',
            id: `vscode-${Date.now()}`,
            timestamp: new Date().toISOString(),
            data: {
                clientType: 'editor',
                metadata: {
                    name: 'VS Code Direct Integration',
                    version: vscode.version,
                    platform: process.platform,
                    workspace: this.editorState.workspace,
                    capabilities: [
                        'file_operations',
                        'cursor_tracking',
                        'realtime_sync',
                        'selection_monitoring'
                    ]
                }
            }
        };
        
        this.sendMessage(registrationMessage);
    }
    
    handleBridgeMessage(message) {
        console.log('Received from bridge:', message.type);
        
        switch (message.type) {
            case 'registration_confirmed':
                this.connectionId = message.data.connectionId;
                console.log('Registered with ID:', this.connectionId);
                break;
                
            case 'agent_response':
                this.handleAgentResponse(message);
                break;
                
            case 'heartbeat':
                this.sendHeartbeatAck(message.id);
                break;
                
            case 'error':
                vscode.window.showErrorMessage(`Bridge error: ${message.data.message}`);
                break;
                
            default:
                console.log('Unknown message type:', message.type);
        }
    }
    
    handleAgentResponse(message) {
        const { content, suggestions } = message.data;
        
        // Calculate response time
        const responseTime = Date.now() - this.performance.lastMessageTime;
        this.performance.avgResponseTime = 
            (this.performance.avgResponseTime + responseTime) / 2;
            
        // Show response in output panel
        const outputChannel = vscode.window.createOutputChannel('Agent Responses');
        outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] Agent Response:`);
        outputChannel.appendLine(content);
        if (suggestions && suggestions.length > 0) {
            outputChannel.appendLine('\nSuggestions:');
            suggestions.forEach(suggestion => 
                outputChannel.appendLine(`• ${suggestion}`)
            );
        }
        outputChannel.appendLine(`\nResponse time: ${responseTime}ms\n`);
        outputChannel.show(true);
        
        // Show notification
        vscode.window.showInformationMessage('Agent response received', 'View Details')
            .then(selection => {
                if (selection === 'View Details') {
                    outputChannel.show(true);
                }
            });
    }
    
    sendHeartbeatAck(heartbeatId) {
        const ack = {
            type: 'heartbeat_ack',
            id: heartbeatId,
            timestamp: new Date().toISOString()
        };
        this.sendMessage(ack);
    }
    
    sendEditorEvent(eventType, eventData) {
        if (!this.isConnected) return;
        
        const message = {
            type: 'editor_event',
            id: `event-${Date.now()}`,
            timestamp: new Date().toISOString(),
            data: {
                eventType: eventType,
                ...eventData
            },
            metadata: {
                editorContext: {
                    ...this.editorState,
                    connectionId: this.connectionId
                },
                performance: {
                    messageCount: ++this.performance.messageCount,
                    avgResponseTime: this.performance.avgResponseTime
                }
            }
        };
        
        this.performance.lastMessageTime = Date.now();
        this.sendMessage(message);
    }
    
    sendTestMessage() {
        if (!this.isConnected) {
            vscode.window.showErrorMessage('Not connected to bridge');
            return;
        }
        
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }
        
        const testMessage = {
            type: 'editor_event',
            id: `test-${Date.now()}`,
            timestamp: new Date().toISOString(),
            data: {
                eventType: 'manual_test',
                content: 'This is a manual test message from VS Code',
                file: editor.document.fileName,
                language: editor.document.languageId
            },
            metadata: {
                editorContext: {
                    ...this.editorState,
                    connectionId: this.connectionId
                }
            }
        };
        
        this.sendMessage(testMessage);
        vscode.window.showInformationMessage('Test message sent to bridge');
    }
    
    sendMessage(message) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            try {
                this.websocket.send(JSON.stringify(message));
            } catch (error) {
                console.error('Failed to send message:', error);
            }
        }
    }
    
    updateEditorState(editor) {
        this.editorState.activeFile = editor.document.fileName;
        this.editorState.language = editor.document.languageId;
        
        const position = editor.selection.active;
        this.editorState.cursor = {
            line: position.line,
            column: position.character
        };
        
        this.editorState.selections = editor.selections.map(sel => ({
            start: sel.start,
            end: sel.end
        }));
    }
    
    showStatus() {
        const status = this.isConnected ? 'Connected' : 'Disconnected';
        const details = this.isConnected ? 
            `ID: ${this.connectionId}\nMessages: ${this.performance.messageCount}` :
            'Not connected to bridge';
            
        vscode.window.showInformationMessage(
            `Editor Integration Status: ${status}`,
            details
        );
    }
    
    dispose() {
        this.disconnectFromBridge();
        this.eventSubscriptions.forEach(sub => sub.dispose());
    }
}

// Extension activation
function activate(context) {
    const integration = new DirectEditorIntegration();
    integration.activate(context);
    return integration;
}

function deactivate() {
    console.log('Direct Editor Integration deactivated');
}

module.exports = {
    activate,
    deactivate
};