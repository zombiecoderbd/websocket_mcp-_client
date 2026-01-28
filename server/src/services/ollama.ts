import axios, { AxiosResponse } from 'axios';
import { Logger } from '../utils/logger';

export interface OllamaModel {
    name: string;
    model: string;
    modified_at: string;
    size: number;
    digest: string;
    details: {
        format: string;
        family: string;
        families: string[];
        parameter_size: string;
        quantization_level: string;
    };
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ChatResponse {
    model: string;
    created_at: string;
    message: {
        role: string;
        content: string;
    };
    done: boolean;
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
}

export interface GenerateResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
    context?: number[];
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
}

export class OllamaService {
    private baseURL: string;
    private defaultModel: string;
    private logger: Logger;
    public isConnected: boolean = false;

    constructor() {
        this.baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        this.defaultModel = process.env.OLLAMA_DEFAULT_MODEL || 'qwen2.5:1.5b';
        this.logger = new Logger();
    }

    async testConnection(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.baseURL}/api/tags`, {
                timeout: 5000
            });
            this.isConnected = response.status === 200;
            return this.isConnected;
        } catch (error) {
            this.logger.error('Ollama connection test failed:', error);
            this.isConnected = false;
            return false;
        }
    }

    async getModels(): Promise<OllamaModel[]> {
        try {
            const response: AxiosResponse<{ models: OllamaModel[] }> = await axios.get(
                `${this.baseURL}/api/tags`
            );
            return response.data.models || [];
        } catch (error) {
            this.logger.error('Failed to fetch models:', error);
            throw new Error('Failed to fetch models from Ollama');
        }
    }

    async generate(prompt: string, model?: string): Promise<string> {
        try {
            const response: AxiosResponse<GenerateResponse> = await axios.post(
                `${this.baseURL}/api/generate`,
                {
                    model: model || this.defaultModel,
                    prompt: prompt,
                    stream: false
                },
                {
                    timeout: 30000 // 30 seconds timeout
                }
            );

            return response.data.response || 'No response generated';
        } catch (error) {
            this.logger.error('Failed to generate response:', error);
            throw new Error('Failed to generate response from Ollama');
        }
    }

    async chat(messages: ChatMessage[], model?: string): Promise<string> {
        try {
            const response: AxiosResponse<ChatResponse> = await axios.post(
                `${this.baseURL}/api/chat`,
                {
                    model: model || this.defaultModel,
                    messages: messages,
                    stream: false
                },
                {
                    timeout: 30000
                }
            );

            return response.data.message?.content || 'No response generated';
        } catch (error) {
            this.logger.error('Failed to chat:', error);
            throw new Error('Failed to chat with Ollama');
        }
    }

    async streamGenerate(prompt: string, model?: string, onChunk?: (chunk: string) => void): Promise<string> {
        try {
            const response = await axios.post(
                `${this.baseURL}/api/generate`,
                {
                    model: model || this.defaultModel,
                    prompt: prompt,
                    stream: true
                },
                {
                    responseType: 'stream',
                    timeout: 60000
                }
            );

            let fullResponse = '';

            return new Promise((resolve, reject) => {
                response.data.on('data', (chunk: Buffer) => {
                    const lines = chunk.toString().split('\n').filter((line: string) => line.trim());

                    for (const line of lines) {
                        try {
                            const data = JSON.parse(line);
                            if (data.response) {
                                fullResponse += data.response;
                                if (onChunk) {
                                    onChunk(data.response);
                                }
                            }
                            if (data.done) {
                                resolve(fullResponse);
                                return;
                            }
                        } catch (parseError) {
                            // Skip invalid JSON lines
                        }
                    }
                });

                response.data.on('error', (error: any) => {
                    this.logger.error('Stream error:', error);
                    reject(error);
                });

                response.data.on('end', () => {
                    if (fullResponse) {
                        resolve(fullResponse);
                    }
                });
            });
        } catch (error) {
            this.logger.error('Failed to stream generate:', error);
            throw new Error('Failed to stream generate from Ollama');
        }
    }

    async pullModel(modelName: string): Promise<boolean> {
        try {
            await axios.post(`${this.baseURL}/api/pull`, {
                name: modelName,
                stream: false
            }, {
                timeout: 300000 // 5 minutes timeout for model pulling
            });
            return true;
        } catch (error) {
            this.logger.error('Failed to pull model:', error);
            return false;
        }
    }

    async getModelInfo(modelName: string): Promise<any> {
        try {
            const response = await axios.post(`${this.baseURL}/api/show`, {
                name: modelName
            });
            return response.data;
        } catch (error) {
            this.logger.error('Failed to get model info:', error);
            throw new Error('Failed to get model information');
        }
    }

    // Health check for Ollama service
    async healthCheck(): Promise<{ status: string; models: number; defaultModel: string }> {
        try {
            const models = await this.getModels();
            return {
                status: 'healthy',
                models: models.length,
                defaultModel: this.defaultModel
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                models: 0,
                defaultModel: this.defaultModel
            };
        }
    }
}
