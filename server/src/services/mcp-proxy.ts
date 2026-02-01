import axios from 'axios';
import { Logger } from '../utils/logger';

class MCProxyService {
    private mcpBaseUrl: string;
    private logger: Logger;
    private axiosInstance: any;

    constructor() {
        this.mcpBaseUrl = process.env.MCP_SERVER_URL || 'http://localhost:3002';
        this.logger = new Logger();
        
        this.axiosInstance = axios.create({
            baseURL: this.mcpBaseUrl,
            timeout: 30000, // 30 seconds timeout
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'ZombieCoder-Agent-Proxy/1.0'
            }
        });

        // Add request interceptor
        this.axiosInstance.interceptors.request.use(
            (config: any) => {
                this.logger.info('MCP Proxy Request', {
                    method: config.method,
                    url: config.url,
                    headers: config.headers
                });
                return config;
            },
            (error: any) => {
                this.logger.error('MCP Proxy Request Error', { error: error.message });
                return Promise.reject(error);
            }
        );

        // Add response interceptor
        this.axiosInstance.interceptors.response.use(
            (response: any) => {
                this.logger.info('MCP Proxy Response', {
                    status: response.status,
                    statusText: response.statusText,
                    duration: response.duration
                });
                return response;
            },
            (error: any) => {
                this.logger.error('MCP Proxy Response Error', {
                    error: error.message,
                    status: error.response?.status,
                    data: error.response?.data
                });
                return Promise.reject(error);
            }
        );
    }

    // Proxy agent-related requests to MCP server
    async getMCPAgents() {
        try {
            const response = await this.axiosInstance.get('/api/agents');
            return response.data;
        } catch (error: any) {
            this.logger.error('Failed to fetch agents from MCP', { error: error.message });
            throw error;
        }
    }

    async getMCPAgentById(agentId: string) {
        try {
            const response = await this.axiosInstance.get(`/api/agents/${agentId}`);
            return response.data;
        } catch (error: any) {
            this.logger.error('Failed to fetch agent from MCP', { 
                error: error.message, 
                agentId 
            });
            throw error;
        }
    }

    async createMCPAgent(agentData: any) {
        try {
            const response = await this.axiosInstance.post('/api/agents', agentData);
            return response.data;
        } catch (error: any) {
            this.logger.error('Failed to create agent in MCP', { error: error.message });
            throw error;
        }
    }

    async updateMCPAgent(agentId: string, agentData: any) {
        try {
            const response = await this.axiosInstance.put(`/api/agents/${agentId}`, agentData);
            return response.data;
        } catch (error: any) {
            this.logger.error('Failed to update agent in MCP', { 
                error: error.message, 
                agentId 
            });
            throw error;
        }
    }

    async deleteMCPAgent(agentId: string) {
        try {
            const response = await this.axiosInstance.delete(`/api/agents/${agentId}`);
            return response.data;
        } catch (error: any) {
            this.logger.error('Failed to delete agent from MCP', { 
                error: error.message, 
                agentId 
            });
            throw error;
        }
    }

    // Proxy chat requests to MCP server
    async processChatRequest(chatData: any) {
        try {
            const response = await this.axiosInstance.post('/api/chat', chatData);
            return response.data;
        } catch (error: any) {
            this.logger.error('Failed to process chat request via MCP', { error: error.message });
            throw error;
        }
    }

    // Health check for MCP server
    async checkMCPHealth() {
        try {
            const response = await this.axiosInstance.get('/api/health');
            return response.data;
        } catch (error: any) {
            this.logger.error('MCP server health check failed', { error: error.message });
            return { status: 'error', error: error.message };
        }
    }
}

export const mcpProxyService = new MCProxyService();