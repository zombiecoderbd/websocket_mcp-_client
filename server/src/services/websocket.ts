import { WebSocketServer, WebSocket } from 'ws';
import { Logger } from '../utils/logger';

interface WebSocketMessage {
    type: string;
    data?: any;
    timestamp?: string;
}

export class WebSocketService {
    private wss: WebSocketServer;
    private clients: Map<WebSocket, any>;
    private logger: Logger;

    constructor(wss: WebSocketServer) {
        this.wss = wss;
        this.clients = new Map();
        this.logger = new Logger();

        this.setupWebSocketServer();
    }

    private setupWebSocketServer(): void {
        this.wss.on('connection', (ws: WebSocket, req) => {
            this.logger.info('New WebSocket connection', {
                ip: req.socket.remoteAddress,
                userAgent: req.headers['user-agent']
            });

            // Store client information
            this.clients.set(ws, {
                connectedAt: new Date(),
                ip: req.socket.remoteAddress,
                userAgent: req.headers['user-agent']
            });

            // Send welcome message
            this.sendMessage(ws, {
                type: 'connected',
                data: {
                    message: 'Connected to UAS WebSocket server',
                    serverTime: new Date().toISOString()
                }
            });

            // Handle incoming messages
            ws.on('message', (data: Buffer) => {
                try {
                    const message: WebSocketMessage = JSON.parse(data.toString());
                    this.handleMessage(ws, message);
                } catch (error) {
                    this.logger.error('Invalid WebSocket message:', error);
                    this.sendMessage(ws, {
                        type: 'error',
                        data: {
                            message: 'Invalid message format'
                        }
                    });
                }
            });

            // Handle client disconnect
            ws.on('close', (code: number, reason: Buffer) => {
                this.logger.info('WebSocket connection closed', {
                    code,
                    reason: reason.toString(),
                    clientCount: this.clients.size - 1
                });
                this.clients.delete(ws);
            });

            // Handle errors
            ws.on('error', (error: Error) => {
                this.logger.error('WebSocket error:', error);
                this.clients.delete(ws);
            });

            // Send periodic heartbeat
            const heartbeat = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    this.sendMessage(ws, {
                        type: 'heartbeat',
                        data: {
                            timestamp: new Date().toISOString()
                        }
                    });
                } else {
                    clearInterval(heartbeat);
                }
            }, 30000); // Send heartbeat every 30 seconds

            ws.on('close', () => {
                clearInterval(heartbeat);
            });
        });

        this.logger.info('WebSocket server initialized');
    }

    private handleMessage(ws: WebSocket, message: WebSocketMessage): void {
        const clientInfo = this.clients.get(ws);

        this.logger.info('WebSocket message received', {
            type: message.type,
            clientIp: clientInfo?.ip
        });

        switch (message.type) {
            case 'ping':
                this.sendMessage(ws, {
                    type: 'pong',
                    data: {
                        timestamp: new Date().toISOString()
                    }
                });
                break;

            case 'subscribe':
                // Handle subscription to specific events
                this.sendMessage(ws, {
                    type: 'subscribed',
                    data: {
                        events: message.data?.events || [],
                        message: 'Successfully subscribed to events'
                    }
                });
                break;

            case 'unsubscribe':
                // Handle unsubscription from events
                this.sendMessage(ws, {
                    type: 'unsubscribed',
                    data: {
                        events: message.data?.events || [],
                        message: 'Successfully unsubscribed from events'
                    }
                });
                break;

            case 'agent_command':
                // Handle agent commands
                this.handleAgentCommand(ws, message);
                break;

            default:
                this.sendMessage(ws, {
                    type: 'error',
                    data: {
                        message: `Unknown message type: ${message.type}`
                    }
                });
        }
    }

    private sendMessage(ws: WebSocket, message: WebSocketMessage): void {
        if (ws.readyState === WebSocket.OPEN) {
            const messageWithTimestamp = {
                ...message,
                timestamp: new Date().toISOString()
            };

            ws.send(JSON.stringify(messageWithTimestamp));
        }
    }

    // Broadcast message to all connected clients
    public broadcast(message: WebSocketMessage): void {
        const messageWithTimestamp = {
            ...message,
            timestamp: new Date().toISOString()
        };

        this.clients.forEach((clientInfo, ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(messageWithTimestamp));
            }
        });

        this.logger.info('Broadcasted message to all clients', {
            type: message.type,
            clientCount: this.clients.size
        });
    }

    // Send message to specific client
    public sendToClient(ws: WebSocket, message: WebSocketMessage): void {
        this.sendMessage(ws, message);
    }

    // Handle agent commands
    private handleAgentCommand(ws: WebSocket, message: WebSocketMessage): void {
        const clientInfo = this.clients.get(ws);
        
        this.logger.info('Agent command received', {
            command: message.data?.command,
            clientId: clientInfo?.id,
            clientIp: clientInfo?.ip
        });
        
        try {
            const command = message.data?.command;
            const params = message.data?.params || {};
            
            // Process different agent commands
            switch (command) {
                case 'get_agent_list':
                    this.sendAgentList(ws);
                    break;
                
                case 'get_agent_metadata':
                    this.sendAgentMetadata(ws, params.agentId);
                    break;
                
                case 'execute_agent_task':
                    this.executeAgentTask(ws, params);
                    break;
                
                default:
                    this.sendMessage(ws, {
                        type: 'agent_response',
                        data: {
                            success: false,
                            error: `Unknown agent command: ${command}`
                        }
                    });
            }
        } catch (error) {
            this.logger.error('Error handling agent command:', error);
            this.sendMessage(ws, {
                type: 'agent_response',
                data: {
                    success: false,
                    error: 'Failed to process agent command'
                }
            });
        }
    }
    
    // Send agent list to client
    private sendAgentList(ws: WebSocket): void {
        // Mock agent list - in real implementation, this would come from database
        const agents = [
            {
                id: 'agent-1',
                name: 'Code Assistant',
                type: 'editor',
                status: 'active',
                persona: 'professional'
            },
            {
                id: 'agent-2',
                name: 'System Monitor',
                type: 'monitoring',
                status: 'active',
                persona: 'technical'
            }
        ];
        
        this.sendMessage(ws, {
            type: 'agent_list',
            data: {
                agents: agents,
                timestamp: new Date().toISOString()
            }
        });
    }
    
    // Send agent metadata
    private sendAgentMetadata(ws: WebSocket, agentId: string): void {
        // Mock agent metadata
        const metadata = {
            id: agentId,
            name: 'Code Assistant',
            description: 'Helps with code editing and development tasks',
            capabilities: ['code_completion', 'debugging', 'refactoring'],
            persona: {
                name: 'Professional Developer',
                prefix: 'ভাইয়া,',
                style: 'technical_bengali',
                response_template: 'ভাইয়া, {message} সম্পর্কে আমি বিস্তারিত ব্যাখ্যা করতে পারি।'
            }
        };
        
        this.sendMessage(ws, {
            type: 'agent_metadata',
            data: {
                agentId: agentId,
                metadata: metadata,
                timestamp: new Date().toISOString()
            }
        });
    }
    
    // Execute agent task
    private executeAgentTask(ws: WebSocket, params: any): void {
        const { agentId, task, inputData } = params;
        
        // Simulate agent processing
        setTimeout(() => {
            const response = {
                type: 'agent_response',
                data: {
                    agentId: agentId,
                    task: task,
                    success: true,
                    result: `Processed task: ${task} with input: ${JSON.stringify(inputData)}`,
                    timestamp: new Date().toISOString()
                }
            };
            
            this.sendMessage(ws, response);
        }, 1000);
    }
    
    // Broadcast agent status update
    public broadcastAgentStatus(agentId: string, status: string): void {
        this.broadcast({
            type: 'agent.status',
            data: {
                agentId,
                status,
                timestamp: new Date().toISOString()
            }
        });
    }

    // Broadcast metrics update
    public broadcastMetrics(metrics: any): void {
        this.broadcast({
            type: 'metrics.update',
            data: {
                ...metrics,
                timestamp: new Date().toISOString()
            }
        });
    }

    // Broadcast new log entry
    public broadcastLog(level: string, message: string, metadata?: any): void {
        this.broadcast({
            type: 'logs.new',
            data: {
                level,
                message,
                metadata,
                timestamp: new Date().toISOString()
            }
        });
    }

    // Broadcast chat message
    public broadcastChatMessage(userMessage: string, aiResponse: string, model?: string): void {
        this.broadcast({
            type: 'chat.message',
            data: {
                user: userMessage,
                assistant: aiResponse,
                model: model || 'default',
                timestamp: new Date().toISOString()
            }
        });
    }

    // Get connected clients count
    public getClientCount(): number {
        return this.clients.size;
    }

    // Get client information
    public getClients(): Map<WebSocket, any> {
        return this.clients;
    }
}
