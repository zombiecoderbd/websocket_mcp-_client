import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { WebSocket } from 'ws';
import { Logger } from '../utils/logger';

const router = express.Router();
const logger = new Logger();

// Editor Agent Service
interface EditorAgentState {
  connected: boolean;
  workspace: string;
  currentFile: string;
  language: string;
  cursorPosition: { line: number; column: number };
  sessionId: string;
}

interface MCPHeaders {
  'x-mcp-session': string;
  'x-agent-id': string;
  'x-persona': string;
  'x-editor': string;
  'x-request-id': string;
}

interface MCPMessage {
  type: string;
  id: string;
  timestamp: string;
  headers: MCPHeaders;
  data: any;
}

let editorAgentState: EditorAgentState = {
  connected: false,
  workspace: process.cwd(),
  currentFile: '',
  language: '',
  cursorPosition: { line: 0, column: 0 },
  sessionId: generateUUID()
};

let websocketConnection: WebSocket | null = null;

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const languageMap: Record<string, string> = {
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

function sendMCPMessage(type: string, data: any, requestId?: string): void {
  if (!websocketConnection || websocketConnection.readyState !== WebSocket.OPEN) {
    logger.warn('WebSocket not connected for MCP message');
    return;
  }

  const messageId = requestId || generateUUID();
  const headers: MCPHeaders = {
    'x-mcp-session': editorAgentState.sessionId,
    'x-agent-id': 'editor-agent-1',
    'x-persona': 'code-assistant',
    'x-editor': 'vscode',
    'x-request-id': messageId
  };

  const message: MCPMessage = {
    type,
    id: messageId,
    timestamp: new Date().toISOString(),
    headers,
    data
  };

  websocketConnection.send(JSON.stringify(message));
  logger.info(`Sent MCP message: ${type} (${messageId})`);
}

// Send content to editor
router.post('/send', async (req, res) => {
    try {
        const { path: filePath, content, action } = req.body;

        if (!filePath || typeof filePath !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'File path is required'
            });
        }

        if (!action || !['open', 'save', 'insert'].includes(action)) {
            return res.status(400).json({
                success: false,
                error: 'Action must be one of: open, save, insert'
            });
        }

        // Security check - prevent path traversal
        const safePath = path.resolve(filePath);
        const workingDir = process.cwd();

        if (!safePath.startsWith(workingDir)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied - path outside working directory'
            });
        }

        let result;

        switch (action) {
            case 'open':
                try {
                    const fileContent = await fs.readFile(safePath, 'utf8');
                    result = {
                        message: 'File opened successfully',
                        content: fileContent,
                        path: filePath
                    };
                } catch (error) {
                    return res.status(404).json({
                        success: false,
                        error: 'File not found',
                        path: filePath
                    });
                }
                break;

            case 'save':
                if (!content) {
                    return res.status(400).json({
                        success: false,
                        error: 'Content is required for save action'
                    });
                }

                try {
                    await fs.writeFile(safePath, content, 'utf8');
                    result = {
                        message: 'File saved successfully',
                        path: filePath,
                        size: content.length
                    };
                } catch (error) {
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to save file',
                        message: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
                break;

            case 'insert':
                if (!content) {
                    return res.status(400).json({
                        success: false,
                        error: 'Content is required for insert action'
                    });
                }

                try {
                    const existingContent = await fs.readFile(safePath, 'utf8').catch(() => '');
                    const newContent = existingContent + content;
                    await fs.writeFile(safePath, newContent, 'utf8');
                    result = {
                        message: 'Content inserted successfully',
                        path: filePath,
                        insertedLength: content.length,
                        totalLength: newContent.length
                    };
                } catch (error) {
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to insert content',
                        message: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
                break;
        }

        logger.info('Editor action completed', {
            action,
            path: filePath,
            success: true
        });

        res.json({
            success: true,
            ...result,
            timestamp: new Date().toISOString()
        });
        return;
    } catch (error) {
        logger.error('Editor send error:', error);

        res.status(500).json({
            success: false,
            error: 'Failed to process editor request',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        return;
    }
});

// Get file information
router.get('/file-info', async (req, res) => {
    try {
        const { path: filePath } = req.query;

        if (!filePath || typeof filePath !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'File path is required'
            });
        }

        // Security check
        const safePath = path.resolve(filePath);
        const workingDir = process.cwd();

        if (!safePath.startsWith(workingDir)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied - path outside working directory'
            });
        }

        try {
            const stats = await fs.stat(safePath);

            const fileInfo = {
                path: filePath,
                name: path.basename(safePath),
                size: stats.size,
                isFile: stats.isFile(),
                isDirectory: stats.isDirectory(),
                createdAt: stats.birthtime.toISOString(),
                modifiedAt: stats.mtime.toISOString(),
                permissions: stats.mode.toString(8)
            };

            res.json({
                success: true,
                fileInfo,
                timestamp: new Date().toISOString()
            });
            return;
        } catch (error) {
            res.status(404).json({
                success: false,
                error: 'File not found',
                path: filePath
            });
            return;
        }
    } catch (error) {
        logger.error('Failed to get file info:', error);

        res.status(500).json({
            success: false,
            error: 'Failed to get file information',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        return;
    }
});

// List directory contents
router.get('/list-directory', async (req, res) => {
    try {
        const { path: dirPath } = req.query;
        const directory = (dirPath as string) || process.cwd();

        // Security check
        const safePath = path.resolve(directory);
        const workingDir = process.cwd();

        if (!safePath.startsWith(workingDir)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied - path outside working directory'
            });
        }

        try {
            const entries = await fs.readdir(safePath, { withFileTypes: true });

            const directoryContents = await Promise.all(
                entries.map(async (entry) => {
                    const fullPath = path.join(safePath, entry.name);
                    const stats = await fs.stat(fullPath).catch(() => null);

                    return {
                        name: entry.name,
                        type: entry.isDirectory() ? 'directory' : 'file',
                        size: stats?.size || 0,
                        modified: stats?.mtime.toISOString() || null
                    };
                })
            );

            res.json({
                success: true,
                path: directory,
                contents: directoryContents,
                total: directoryContents.length,
                timestamp: new Date().toISOString()
            });
            return;
        } catch (error) {
            res.status(404).json({
                success: false,
                error: 'Directory not found',
                path: directory
            });
            return;
        }
    } catch (error) {
        logger.error('Failed to list directory:', error);

        res.status(500).json({
            success: false,
            error: 'Failed to list directory contents',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        return;
    }
});

// Enhanced editor operations with MCP compliance
router.post('/operations', async (req, res) => {
  try {
    const { operation, source, destination, content, cursor } = req.body;
    
    if (!operation || typeof operation !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Operation type is required'
      });
    }
    
    // Security check
    const safeSource = source ? path.resolve(source) : '';
    const safeDestination = destination ? path.resolve(destination) : '';
    const workingDir = process.cwd();
    
    if ((safeSource && !safeSource.startsWith(workingDir)) || 
        (safeDestination && !safeDestination.startsWith(workingDir))) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - path outside working directory'
      });
    }
    
    let result;
    
    switch (operation) {
      case 'create':
        if (!source || !content) {
          return res.status(400).json({
            success: false,
            error: 'Source path and content are required for create operation'
          });
        }
        
        const dirPath = path.dirname(safeSource);
        await fs.mkdir(dirPath, { recursive: true });
        await fs.writeFile(safeSource, content, 'utf8');
        
        result = {
          message: 'File created successfully',
          path: source,
          size: content.length
        };
        
        // Notify MCP
        sendMCPMessage('file_created', { path: source, size: content.length });
        break;
        
      case 'delete':
        if (!source) {
          return res.status(400).json({
            success: false,
            error: 'Source path is required for delete operation'
          });
        }
        
        await fs.unlink(safeSource);
        
        result = {
          message: 'File deleted successfully',
          path: source
        };
        
        // Notify MCP
        sendMCPMessage('file_deleted', { path: source });
        break;
        
      case 'move':
        if (!source || !destination) {
          return res.status(400).json({
            success: false,
            error: 'Source and destination paths are required for move operation'
          });
        }
        
        await fs.rename(safeSource, safeDestination);
        
        result = {
          message: 'File moved successfully',
          source: source,
          destination: destination
        };
        
        // Notify MCP
        sendMCPMessage('file_moved', { source: source, destination: destination });
        break;
        
      case 'copy':
        if (!source || !destination) {
          return res.status(400).json({
            success: false,
            error: 'Source and destination paths are required for copy operation'
          });
        }
        
        await fs.copyFile(safeSource, safeDestination);
        
        result = {
          message: 'File copied successfully',
          source: source,
          destination: destination
        };
        
        // Notify MCP
        sendMCPMessage('file_copied', { source: source, destination: destination });
        break;
        
      case 'apply-diff':
        if (!source || !content) {
          return res.status(400).json({
            success: false,
            error: 'Source path and diff content are required for apply-diff operation'
          });
        }
        
        // Read existing content
        const existingContent = await fs.readFile(safeSource, 'utf8').catch(() => '');
        
        // Simple diff application (in practice, use proper diff library)
        const newContent = content.startsWith('+ ') ? 
          existingContent + '\n' + content.substring(2) : 
          content;
          
        await fs.writeFile(safeSource, newContent, 'utf8');
        
        result = {
          message: 'Diff applied successfully',
          path: source,
          originalSize: existingContent.length,
          newSize: newContent.length
        };
        
        // Notify MCP
        sendMCPMessage('diff_applied', { 
          path: source, 
          originalSize: existingContent.length, 
          newSize: newContent.length 
        });
        break;
        
      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported operation: ${operation}`
        });
    }
    
    logger.info('Editor operation completed', {
      operation,
      source,
      destination,
      success: true
    });
    
    return res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Editor operation failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to process editor operation',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// WebSocket connection for MCP communication
router.post('/connect-websocket', async (req, res) => {
  try {
    const { websocketUrl } = req.body;
    
    if (!websocketUrl || typeof websocketUrl !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'WebSocket URL is required'
      });
    }
    
    // Close existing connection if any
    if (websocketConnection) {
      websocketConnection.close();
    }
    
    // Create new WebSocket connection
    websocketConnection = new WebSocket(websocketUrl);
    
    websocketConnection.on('open', () => {
      editorAgentState.connected = true;
      logger.info('Editor Agent connected to MCP server');
      
      // Send agent ready message
      sendMCPMessage('agent_ready', {
        agent_id: 'editor-agent-1',
        capabilities: [
          'file_operations',
          'code_completion',
          'debugging_support',
          'refactoring_tools',
          'context_awareness',
          'realtime_sync'
        ],
        status: 'ready',
        workspace: editorAgentState.workspace
      });
    });
    
    websocketConnection.on('message', (data) => {
      try {
        const message: MCPMessage = JSON.parse(data.toString());
        logger.info('Received MCP message:', message.type);
        
        // Handle incoming MCP messages
        switch (message.type) {
          case 'editor_request':
            // Handle editor requests from MCP
            handleEditorRequest(message);
            break;
          case 'context_update':
            // Update editor context
            Object.assign(editorAgentState, message.data);
            break;
          case 'agent_command':
            // Handle agent commands
            handleAgentCommand(message);
            break;
        }
      } catch (error) {
        logger.error('Failed to process MCP message:', error);
      }
    });
    
    websocketConnection.on('close', () => {
      editorAgentState.connected = false;
      logger.info('Editor Agent disconnected from MCP server');
    });
    
    websocketConnection.on('error', (error) => {
      logger.error('WebSocket error:', error);
    });
    
    return res.json({
      success: true,
      message: 'WebSocket connection initiated',
      websocketUrl,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('WebSocket connection failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to establish WebSocket connection',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Handle editor requests from MCP
async function handleEditorRequest(message: MCPMessage): Promise<void> {
  const { action, path: filePath, content, cursor } = message.data;
  
  try {
    let result;
    
    switch (action) {
      case 'open_file':
        const fileContent = await fs.readFile(path.resolve(filePath), 'utf8');
        result = {
          content: fileContent,
          language: detectLanguage(filePath),
          path: filePath
        };
        break;
        
      case 'save_file':
        await fs.writeFile(path.resolve(filePath), content, 'utf8');
        result = { path: filePath, saved: true };
        break;
        
      case 'insert_at_cursor':
        const existing = await fs.readFile(path.resolve(filePath), 'utf8').catch(() => '');
        const lines = existing.split('\n');
        const insertPos = cursor || { line: 0, column: 0 };
        
        if (insertPos.line < lines.length) {
          const line = lines[insertPos.line];
          lines[insertPos.line] = line.substring(0, insertPos.column) + 
                                content + 
                                line.substring(insertPos.column);
        } else {
          lines.push(content);
        }
        
        await fs.writeFile(path.resolve(filePath), lines.join('\n'), 'utf8');
        result = { path: filePath, inserted: true };
        break;
        
      case 'get_file_content':
        const contentResult = await fs.readFile(path.resolve(filePath), 'utf8');
        result = {
          content: contentResult,
          language: detectLanguage(filePath),
          path: filePath
        };
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    sendMCPMessage('editor_response', {
      success: true,
      action: action,
      result: result,
      original_request_id: message.id
    }, message.id);
    
  } catch (error) {
    logger.error('Editor request failed:', error);
    sendMCPMessage('editor_response', {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      original_request_id: message.id
    }, message.id);
  }
}

// Handle agent commands from MCP
function handleAgentCommand(message: MCPMessage): void {
  const { command, params } = message.data;
  
  switch (command) {
    case 'get_capabilities':
      sendMCPMessage('agent_info', {
        agent_id: 'editor-agent-1',
        capabilities: [
          'file_operations',
          'code_completion',
          'debugging_support',
          'refactoring_tools',
          'context_awareness',
          'realtime_sync'
        ],
        status: editorAgentState.connected ? 'active' : 'disconnected'
      });
      break;
      
    case 'get_state':
      sendMCPMessage('agent_state', {
        agent_id: 'editor-agent-1',
        state: editorAgentState
      });
      break;
      
    case 'set_workspace':
      if (params?.workspace) {
        const safePath = path.resolve(params.workspace);
        const workingDir = process.cwd();
        
        if (safePath.startsWith(workingDir)) {
          editorAgentState.workspace = safePath;
          logger.info('Workspace updated:', safePath);
        }
      }
      break;
  }
}

// Get editor agent status
router.get('/status', async (req, res) => {
  try {
    res.json({
      success: true,
      agent: {
        id: 'editor-agent-1',
        connected: editorAgentState.connected,
        workspace: editorAgentState.workspace,
        currentFile: editorAgentState.currentFile,
        language: editorAgentState.language,
        cursorPosition: editorAgentState.cursorPosition,
        sessionId: editorAgentState.sessionId,
        capabilities: [
          'file_operations',
          'code_completion',
          'debugging_support',
          'refactoring_tools',
          'context_awareness',
          'realtime_sync'
        ]
      },
      websocket: {
        connected: websocketConnection?.readyState === WebSocket.OPEN,
        url: websocketConnection ? 'Connected' : 'Not connected'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get editor status:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get editor agent status',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Disconnect WebSocket
router.post('/disconnect', async (req, res) => {
  try {
    if (websocketConnection) {
      sendMCPMessage('agent_shutdown', {
        agent_id: 'editor-agent-1',
        reason: 'manual_disconnect'
      });
      
      websocketConnection.close();
      websocketConnection = null;
      editorAgentState.connected = false;
    }
    
    res.json({
      success: true,
      message: 'Editor agent disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Disconnect failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect editor agent',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
