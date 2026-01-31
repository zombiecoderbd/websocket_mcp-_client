import express from 'express';
import { OllamaService, ModelRuntimeInfo, ModelMetrics } from '../services/ollama';
import { Logger } from '../utils/logger';
import { executeQuery } from '../database/connection';

const router = express.Router();
const ollamaService = new OllamaService();
const logger = new Logger();

// Get all models with runtime information
router.get('/', async (req, res) => {
    try {
        // Get runtime models with enhanced information
        const runtimeModels = await ollamaService.getRuntimeModels();
        
        res.json({
            success: true,
            data: runtimeModels,
            count: runtimeModels.length,
            source: 'runtime',
            timestamp: new Date().toISOString()
        });
        return;
    } catch (error) {
        logger.error('Failed to get runtime models:', error);
        
        // Fallback to database models
        try {
            const models = await executeQuery(`
                SELECT 
                    m.id,
                    m.model_name,
                    m.model_version,
                    m.status,
                    m.cpu_usage,
                    m.memory_usage,
                    m.requests_handled,
                    m.last_response_time,
                    m.total_tokens_used,
                    m.metadata,
                    m.created_at,
                    m.updated_at,
                    p.id as provider_id,
                    p.name as provider_name,
                    p.type as provider_type
                FROM ai_models m
                JOIN ai_providers p ON m.provider_id = p.id
                ORDER BY p.name, m.model_name
            `);

            res.json({
                success: true,
                data: models,
                count: models.length,
                source: 'database',
                timestamp: new Date().toISOString()
            });
            return;
        } catch (dbError) {
            logger.error('Failed to get models from database, falling back to Ollama:', dbError);
            
            // Final fallback to Ollama
            try {
                const models = await ollamaService.getModels();

                const modelsList = models.map(model => ({
                    name: model.name,
                    model: model.model,
                    size: model.size,
                    modified: model.modified_at,
                    digest: model.digest,
                    details: {
                        format: model.details.format,
                        family: model.details.family,
                        parameterSize: model.details.parameter_size,
                        quantizationLevel: model.details.quantization_level
                    }
                }));

                res.json({
                    success: true,
                    data: modelsList,
                    count: models.length,
                    source: 'ollama',
                    timestamp: new Date().toISOString()
                });
            } catch (ollamaError) {
                logger.error('Failed to get models from Ollama:', ollamaError);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch models',
                    message: ollamaError instanceof Error ? ollamaError.message : 'Unknown error',
                    timestamp: new Date().toISOString()
                });
            }
        }
    }
});

// Get runtime models status
router.get('/runtime', async (req, res) => {
    try {
        const runtimeModels = await ollamaService.getRuntimeModels();
        
        // Get health information
        const healthInfo = await ollamaService.healthCheck();
        
        res.json({
            success: true,
            models: runtimeModels,
            health: healthInfo,
            count: runtimeModels.length,
            timestamp: new Date().toISOString()
        });
        return;
    } catch (error) {
        logger.error('Failed to get runtime models:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch runtime models',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        return;
    }
});

// Get model metrics
router.get('/:id/metrics', async (req, res) => {
    try {
        const { id } = req.params;
        const { hours = '24' } = req.query;
        
        const metrics = await ollamaService.getModelMetrics(parseInt(id), parseInt(hours as string));
        
        res.json({
            success: true,
            model_id: parseInt(id),
            metrics: metrics,
            count: metrics.length,
            time_range_hours: parseInt(hours as string),
            timestamp: new Date().toISOString()
        });
        return;
    } catch (error) {
        logger.error(`Failed to get metrics for model ${req.params.id}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch model metrics',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        return;
    }
});

// Get model status
router.get('/:modelName/status', async (req, res) => {
    try {
        const { modelName } = req.params;
        
        const status = await ollamaService.getModelStatus(modelName);
        
        if (!status) {
            return res.status(404).json({
                success: false,
                error: 'Model not found',
                model: modelName,
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            success: true,
            model: modelName,
            status: status,
            timestamp: new Date().toISOString()
        });
        return;
    } catch (error) {
        logger.error(`Failed to get status for model ${req.params.modelName}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch model status',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        return;
    }
});

// Start model
router.post('/:modelName/start', async (req, res) => {
    try {
        const { modelName } = req.params;
        
        const success = await ollamaService.startModel(modelName);
        
        if (success) {
            res.json({
                success: true,
                message: `Model ${modelName} started successfully`,
                model: modelName,
                timestamp: new Date().toISOString()
            });
            return;
        } else {
            res.status(500).json({
                success: false,
                error: `Failed to start model ${modelName}`,
                model: modelName,
                timestamp: new Date().toISOString()
            });
            return;
        }
    } catch (error) {
        logger.error(`Failed to start model ${req.params.modelName}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to start model',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        return;
    }
});

// Stop model
router.post('/:modelName/stop', async (req, res) => {
    try {
        const { modelName } = req.params;
        
        const success = await ollamaService.stopModel(modelName);
        
        if (success) {
            res.json({
                success: true,
                message: `Model ${modelName} stopped successfully`,
                model: modelName,
                timestamp: new Date().toISOString()
            });
            return;
        } else {
            res.status(500).json({
                success: false,
                error: `Failed to stop model ${modelName}`,
                model: modelName,
                timestamp: new Date().toISOString()
            });
            return;
        }
    } catch (error) {
        logger.error(`Failed to stop model ${req.params.modelName}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to stop model',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        return;
    }
});

// Test model functionality
router.post('/:modelName/test', async (req, res) => {
    try {
        const { modelName } = req.params;
        const { prompt } = req.body;
        
        const testResult = await ollamaService.testModel(modelName, prompt);
        
        res.json({
            success: true,
            model: modelName,
            test_result: testResult,
            timestamp: new Date().toISOString()
        });
        return;
    } catch (error) {
        logger.error(`Failed to test model ${req.params.modelName}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to test model',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        return;
    }
});

// Get all models (from database with provider info) - legacy endpoint
router.get('/database', async (req, res) => {
    try {
        // Try to fetch from database
        const models = await executeQuery(`
            SELECT 
                m.id,
                m.model_name,
                m.model_version,
                m.status,
                m.cpu_usage,
                m.memory_usage,
                m.requests_handled,
                m.last_response_time,
                m.total_tokens_used,
                m.metadata,
                m.created_at,
                m.updated_at,
                p.id as provider_id,
                p.name as provider_name,
                p.type as provider_type
            FROM ai_models m
            JOIN ai_providers p ON m.provider_id = p.id
            ORDER BY p.name, m.model_name
        `);

        res.json({
            success: true,
            data: models,
            count: models.length,
            source: 'database',
            timestamp: new Date().toISOString()
        });
        return;
    } catch (error) {
        logger.error('Failed to get models from database, falling back to Ollama:', error);
        
        // Fallback to Ollama if database fails
        try {
            const models = await ollamaService.getModels();

            const modelsList = models.map(model => ({
                name: model.name,
                model: model.model,
                size: model.size,
                modified: model.modified_at,
                digest: model.digest,
                details: {
                    format: model.details.format,
                    family: model.details.family,
                    parameterSize: model.details.parameter_size,
                    quantizationLevel: model.details.quantization_level
                }
            }));

            res.json({
                success: true,
                data: modelsList,
                count: models.length,
                source: 'ollama',
                timestamp: new Date().toISOString()
            });
        } catch (ollamaError) {
            logger.error('Failed to get models from Ollama:', ollamaError);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch models',
                message: ollamaError instanceof Error ? ollamaError.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
            return;
        }
    }
});

// POST create new model
router.post('/', async (req, res) => {
    try {
        const { provider_id, model_name, model_version, status, metadata } = req.body;

        if (!provider_id || !model_name) {
            return res.status(400).json({
                success: false,
                error: 'provider_id and model_name are required'
            });
        }

        const result = await executeQuery(`
            INSERT INTO ai_models (provider_id, model_name, model_version, status, metadata)
            VALUES (?, ?, ?, ?, ?)
        `, [provider_id, model_name, model_version || 'latest', status || 'pending', JSON.stringify(metadata || {})]);

        res.status(201).json({
            success: true,
            message: 'Model created successfully',
            data: { id: (result as any).insertId },
            timestamp: new Date().toISOString()
        });
        return;
    } catch (error) {
        logger.error('Error creating model:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create model',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        return;
    }
});

// PUT update model
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, cpu_usage, memory_usage, requests_handled, metadata } = req.body;

        await executeQuery(`
            UPDATE ai_models 
            SET 
                status = COALESCE(?, status),
                cpu_usage = COALESCE(?, cpu_usage),
                memory_usage = COALESCE(?, memory_usage),
                requests_handled = COALESCE(?, requests_handled),
                metadata = COALESCE(?, metadata),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [status, cpu_usage, memory_usage, requests_handled, metadata ? JSON.stringify(metadata) : null, id]);

        res.json({
            success: true,
            message: 'Model updated successfully',
            timestamp: new Date().toISOString()
        });
        return;
    } catch (error) {
        logger.error('Error updating model:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update model',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        return;
    }
});

// DELETE model
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await executeQuery('DELETE FROM ai_models WHERE id = ?', [id]);

        if ((result as any).affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Model not found',
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            message: 'Model deleted successfully',
            timestamp: new Date().toISOString()
        });
        return;
    } catch (error) {
        logger.error('Error deleting model:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete model',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        return;
    }
});

// GET models by provider
router.get('/provider/:providerId', async (req, res) => {
    try {
        const { providerId } = req.params;

        const models = await executeQuery(`
            SELECT * FROM ai_models WHERE provider_id = ?
            ORDER BY model_name
        `, [providerId]);

        res.json({
            success: true,
            data: models,
            count: models.length,
            timestamp: new Date().toISOString()
        });
        return;
    } catch (error) {
        logger.error('Error fetching models by provider:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch models',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        return;
    }
});

// Get specific model info
router.get('/:modelName', async (req, res) => {
    try {
        const { modelName } = req.params;
        const modelInfo = await ollamaService.getModelInfo(modelName);

        res.json({
            success: true,
            model: modelName,
            info: modelInfo,
            timestamp: new Date().toISOString()
        });
        return;
    } catch (error) {
        logger.error(`Failed to get model info for ${req.params.modelName}:`, error);

        res.status(500).json({
            success: false,
            error: 'Failed to get model information',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        return;
    }
});

// Pull a new model
router.post('/pull', async (req, res) => {
    try {
        const { modelName } = req.body;

        if (!modelName || typeof modelName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Model name is required'
            });
        }

        const success = await ollamaService.pullModel(modelName);

        if (success) {
            res.json({
                success: true,
                message: `Model ${modelName} pulled successfully`,
                model: modelName,
                timestamp: new Date().toISOString()
            });
            return;
        } else {
            res.status(500).json({
                success: false,
                error: `Failed to pull model ${modelName}`,
                timestamp: new Date().toISOString()
            });
            return;
        }
    } catch (error) {
        logger.error('Failed to pull model:', error);

        res.status(500).json({
            success: false,
            error: 'Failed to pull model',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        return;
    }
});

// Test model
router.post('/test', async (req, res) => {
    try {
        const { modelName, prompt } = req.body;

        if (!modelName || typeof modelName !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Model name is required'
            });
        }

        const testPrompt = prompt || 'Hello, how are you?';
        const response = await ollamaService.generate(testPrompt, modelName);

        res.json({
            success: true,
            model: modelName,
            testPrompt,
            response,
            timestamp: new Date().toISOString()
        });
        return;
    } catch (error) {
        logger.error('Failed to test model:', error);

        res.status(500).json({
            success: false,
            error: 'Failed to test model',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        return;
    }
});

export default router;
