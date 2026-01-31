import axios, { AxiosResponse } from 'axios';
import { Logger } from '../utils/logger';
import { executeQuery } from '../database/connection';
import { performance } from 'perf_hooks';

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

export interface ModelRuntimeInfo {
    id: number;
    model_name: string;
    is_running: boolean;
    last_heartbeat: Date | null;
    system_resources: {
        cpu_usage?: number;
        memory_usage?: number;
        gpu_usage?: number;
    } | null;
    status: string;
    requests_handled: number;
    avg_response_time: number;
}

export interface ModelMetrics {
    model_id: number;
    cpu_usage: number;
    memory_usage_mb: number;
    gpu_usage: number;
    active_connections: number;
    requests_per_minute: number;
    avg_response_time_ms: number;
    timestamp: Date;
}

export interface RuntimeModel extends OllamaModel {
    is_running: boolean;
    last_heartbeat: Date | null;
    status: string;
    requests_handled: number;
    avg_response_time: number;
    system_resources: any;
    provider_name: string;
    metrics?: ModelMetrics[];
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
    private runtimeInterval: NodeJS.Timeout | null = null;
    private metricsBuffer: Map<string, {
        requestCount: number;
        totalTime: number;
        startTime: number;
    }> = new Map();
    private healthCheckInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        this.defaultModel = process.env.OLLAMA_DEFAULT_MODEL || 'qwen2.5:1.5b';
        this.logger = new Logger();
        
        // Start runtime monitoring
        this.startRuntimeMonitoring();
        this.startHealthChecks();
    }
    
    // Cleanup on destruction
    public destroy(): void {
        if (this.runtimeInterval) {
            clearInterval(this.runtimeInterval);
            this.runtimeInterval = null;
        }
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }
    
    // Start runtime monitoring
    private startRuntimeMonitoring(): void {
        this.runtimeInterval = setInterval(async () => {
            try {
                await this.updateRuntimeMetrics();
            } catch (error) {
                this.logger.error('Runtime monitoring error:', error);
            }
        }, 30000); // Update every 30 seconds
    }
    
    // Start health checks
    private startHealthChecks(): void {
        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.healthCheck();
            } catch (error) {
                this.logger.error('Health check error:', error);
            }
        }, 60000); // Check every minute
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
    
    // Get runtime models with database integration
    async getRuntimeModels(): Promise<RuntimeModel[]> {
        try {
            // Get models from database with runtime info
            const dbModels = await executeQuery(`
                SELECT 
                    m.id,
                    m.model_name,
                    m.model_version,
                    m.status,
                    m.requests_handled,
                    m.last_response_time,
                    m.is_running,
                    m.last_heartbeat,
                    m.system_resources,
                    p.name as provider_name
                FROM ai_models m
                JOIN ai_providers p ON m.provider_id = p.id
                WHERE p.type = 'ollama'
                ORDER BY m.model_name
            `);
            
            // Get current Ollama models
            const ollamaModels = await this.getModels();
            
            // Merge database info with Ollama data
            const runtimeModels: RuntimeModel[] = ollamaModels.map(ollamaModel => {
                const dbModel = dbModels.find((db: any) => 
                    db.model_name === ollamaModel.name.split(':')[0]
                );
                
                return {
                    ...ollamaModel,
                    is_running: dbModel?.is_running || false,
                    last_heartbeat: dbModel?.last_heartbeat ? new Date(dbModel.last_heartbeat) : null,
                    status: dbModel?.status || 'stopped',
                    requests_handled: dbModel?.requests_handled || 0,
                    avg_response_time: dbModel?.last_response_time || 0,
                    system_resources: dbModel?.system_resources || null,
                    provider_name: dbModel?.provider_name || 'ollama'
                };
            });
            
            return runtimeModels;
        } catch (error) {
            this.logger.error('Failed to fetch runtime models:', error);
            // Fallback to basic Ollama models
            const models = await this.getModels();
            return models.map(model => ({
                ...model,
                is_running: false,
                last_heartbeat: null,
                status: 'unknown',
                requests_handled: 0,
                avg_response_time: 0,
                system_resources: null,
                provider_name: 'ollama'
            }));
        }
    }
    
    // Get model metrics
    async getModelMetrics(modelId: number, hours: number = 24): Promise<ModelMetrics[]> {
        try {
            const metrics = await executeQuery(`
                SELECT 
                    model_id,
                    cpu_usage,
                    memory_usage_mb,
                    gpu_usage,
                    active_connections,
                    requests_per_minute,
                    avg_response_time_ms,
                    timestamp
                FROM model_metrics 
                WHERE model_id = ? AND timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR)
                ORDER BY timestamp DESC
                LIMIT 100
            `, [modelId, hours]);
            
            return metrics.map((metric: any) => ({
                ...metric,
                timestamp: new Date(metric.timestamp)
            }));
        } catch (error) {
            this.logger.error(`Failed to fetch metrics for model ${modelId}:`, error);
            return [];
        }
    }
    
    // Start model
    async startModel(modelName: string): Promise<boolean> {
        try {
            // Try to load the model by making a request
            const testPrompt = "Hello";
            await this.generate(testPrompt, modelName);
            
            // Update database
            await executeQuery(`
                UPDATE ai_models 
                SET is_running = TRUE, 
                    last_heartbeat = NOW(), 
                    status = 'running'
                WHERE model_name = ?
            `, [modelName.split(':')[0]]);
            
            this.logger.info(`Model ${modelName} started successfully`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to start model ${modelName}:`, error);
            return false;
        }
    }
    
    // Stop model
    async stopModel(modelName: string): Promise<boolean> {
        try {
            // Update database
            await executeQuery(`
                UPDATE ai_models 
                SET is_running = FALSE, 
                    status = 'stopped',
                    last_heartbeat = NULL
                WHERE model_name = ?
            `, [modelName.split(':')[0]]);
            
            this.logger.info(`Model ${modelName} stopped successfully`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to stop model ${modelName}:`, error);
            return false;
        }
    }
    
    // Update runtime metrics
    private async updateRuntimeMetrics(): Promise<void> {
        try {
            const models = await this.getRuntimeModels();
            
            for (const model of models) {
                if (model.is_running) {
                    // Get model ID from database
                    const dbModel = await executeQuery(`
                        SELECT id FROM ai_models WHERE model_name = ?
                    `, [model.name.split(':')[0]]);
                    
                    if (dbModel.length > 0) {
                        const modelId = dbModel[0].id;
                        
                        // Calculate current metrics
                        const metrics = this.metricsBuffer.get(model.name) || {
                            requestCount: 0,
                            totalTime: 0,
                            startTime: Date.now()
                        };
                        
                        const requestsPerMinute = metrics.requestCount / ((Date.now() - metrics.startTime) / 60000);
                        const avgResponseTime = metrics.requestCount > 0 ? metrics.totalTime / metrics.requestCount : 0;
                        
                        // Insert metrics record
                        await executeQuery(`
                            INSERT INTO model_metrics 
                            (model_id, cpu_usage, memory_usage_mb, gpu_usage, 
                             active_connections, requests_per_minute, avg_response_time_ms)
                            VALUES (?, 0, 0, 0, 1, ?, ?)
                        `, [modelId, Math.round(requestsPerMinute), Math.round(avgResponseTime)]);
                        
                        // Update model heartbeat
                        await executeQuery(`
                            UPDATE ai_models 
                            SET last_heartbeat = NOW()
                            WHERE id = ?
                        `, [modelId]);
                    }
                }
            }
        } catch (error) {
            this.logger.error('Failed to update runtime metrics:', error);
        }
    }

    async generate(prompt: string, model?: string): Promise<string> {
        const startTime = performance.now();
        const modelName = model || this.defaultModel;
        
        try {
            // Track request metrics
            const metrics = this.metricsBuffer.get(modelName) || {
                requestCount: 0,
                totalTime: 0,
                startTime: Date.now()
            };
            
            const response: AxiosResponse<GenerateResponse> = await axios.post(
                `${this.baseURL}/api/generate`,
                {
                    model: modelName,
                    prompt: prompt,
                    stream: false
                },
                {
                    timeout: 30000 // 30 seconds timeout
                }
            );

            const responseTime = performance.now() - startTime;
            
            // Update metrics
            this.metricsBuffer.set(modelName, {
                requestCount: metrics.requestCount + 1,
                totalTime: metrics.totalTime + responseTime,
                startTime: metrics.startTime
            });
            
            // Update database records
            await this.updateModelRequestStats(modelName, responseTime);
            
            return response.data.response || 'No response generated';
        } catch (error) {
            this.logger.error('Failed to generate response:', error);
            throw new Error('Failed to generate response from Ollama');
        }
    }
    
    // Update model request statistics
    private async updateModelRequestStats(modelName: string, responseTime: number): Promise<void> {
        try {
            const baseModelName = modelName.split(':')[0];
            
            await executeQuery(`
                UPDATE ai_models 
                SET requests_handled = requests_handled + 1,
                    last_response_time = ?,
                    is_running = TRUE,
                    last_heartbeat = NOW()
                WHERE model_name = ?
            `, [Math.round(responseTime), baseModelName]);
            
            // If no rows affected, create the model record
            const result = await executeQuery(`
                SELECT id FROM ai_models WHERE model_name = ?
            `, [baseModelName]);
            
            if (result.length === 0) {
                // Find Ollama provider
                const provider = await executeQuery(`
                    SELECT id FROM ai_providers WHERE type = 'ollama' LIMIT 1
                `);
                
                if (provider.length > 0) {
                    await executeQuery(`
                        INSERT INTO ai_models 
                        (provider_id, model_name, model_version, status, requests_handled, 
                         last_response_time, is_running, last_heartbeat)
                        VALUES (?, ?, ?, 'running', 1, ?, TRUE, NOW())
                    `, [provider[0].id, baseModelName, modelName.split(':')[1] || 'latest', Math.round(responseTime)]);
                }
            }
        } catch (error) {
            this.logger.error('Failed to update model stats:', error);
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

    // Enhanced health check with runtime info
    async healthCheck(): Promise<{ 
        status: string; 
        models: number; 
        defaultModel: string;
        runtimeModels: number;
        activeModels: number;
        uptime: number;
    }> {
        try {
            const models = await this.getModels();
            const runtimeModels = await this.getRuntimeModels();
            const activeModels = runtimeModels.filter(m => m.is_running).length;
            
            // Update service connection status
            this.isConnected = true;
            
            return {
                status: 'healthy',
                models: models.length,
                defaultModel: this.defaultModel,
                runtimeModels: runtimeModels.length,
                activeModels: activeModels,
                uptime: process.uptime()
            };
        } catch (error) {
            this.isConnected = false;
            return {
                status: 'unhealthy',
                models: 0,
                defaultModel: this.defaultModel,
                runtimeModels: 0,
                activeModels: 0,
                uptime: process.uptime()
            };
        }
    }
    
    // Get model status
    async getModelStatus(modelName: string): Promise<ModelRuntimeInfo | null> {
        try {
            const models = await this.getRuntimeModels();
            const model = models.find(m => m.name === modelName || m.name.startsWith(modelName + ':'));
            
            if (!model) return null;
            
            const metrics = await this.getModelMetrics(
                await this.getModelId(modelName), 
                1 // Last 1 hour
            );
            
            return {
                id: await this.getModelId(modelName),
                model_name: modelName,
                is_running: model.is_running,
                last_heartbeat: model.last_heartbeat,
                system_resources: model.system_resources,
                status: model.status,
                requests_handled: model.requests_handled,
                avg_response_time: model.avg_response_time
            };
        } catch (error) {
            this.logger.error(`Failed to get status for model ${modelName}:`, error);
            return null;
        }
    }
    
    // Helper to get model ID
    private async getModelId(modelName: string): Promise<number> {
        const baseModelName = modelName.split(':')[0];
        const result = await executeQuery(`
            SELECT id FROM ai_models WHERE model_name = ?
        `, [baseModelName]);
        
        if (result.length > 0) {
            return result[0].id;
        }
        
        // Create model record if it doesn't exist
        const provider = await executeQuery(`
            SELECT id FROM ai_providers WHERE type = 'ollama' LIMIT 1
        `);
        
        if (provider.length > 0) {
            const insertResult = await executeQuery(`
                INSERT INTO ai_models 
                (provider_id, model_name, model_version, status)
                VALUES (?, ?, ?, 'stopped')
            `, [provider[0].id, baseModelName, modelName.split(':')[1] || 'latest']);
            
            return insertResult.insertId;
        }
        
        throw new Error('No Ollama provider found');
    }
    
    // Test model functionality
    async testModel(modelName: string, testPrompt: string = "Hello, how are you?"): Promise<{ success: boolean; response?: string; error?: string }> {
        try {
            const response = await this.generate(testPrompt, modelName);
            return {
                success: true,
                response: response
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
