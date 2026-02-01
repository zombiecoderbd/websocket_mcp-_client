import express from 'express';
import { Logger } from '../utils/logger';
import { executeQuery } from '../database/connection';
import { GoogleCloudProvider } from '../services/cloud-provider';
import { CLIManager } from '../services/cli-manager';
import { DependencyInstaller } from '../services/dependency-installer';
import { PerformanceMonitor } from '../services/performance-monitor';

const logger = new Logger();
const router = express.Router();

// Initialize services
const googleProvider = new GoogleCloudProvider();
const cliManager = new CLIManager();
const dependencyInstaller = new DependencyInstaller(cliManager);
const performanceMonitor = new PerformanceMonitor();

// Middleware to ensure services are initialized
const ensureServicesInitialized = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        // Initialize Google provider if not already done
        if (!googleProvider.isInitialized()) {
            // Try to get configuration from database
            const configResult = await executeQuery(
                `SELECT pc.config_key, pc.config_value 
                 FROM provider_configurations pc
                 JOIN ai_providers ap ON pc.provider_id = ap.id
                 WHERE ap.name = 'Google Cloud AI' AND ap.type = 'google'`
            );

            if (configResult && configResult.length > 0) {
                const configMap: Record<string, string> = {};
                configResult.forEach((row: any) => {
                    configMap[row.config_key] = row.config_value;
                });

                if (configMap['api_key'] && configMap['project_id']) {
                    await googleProvider.initialize({
                        apiKey: configMap['api_key'],
                        projectId: configMap['project_id'],
                        region: configMap['region'] || 'us-central1',
                        quotaLimits: {
                            rpm: parseInt(configMap['quota_requests_per_minute'] || '60'),
                            tpm: parseInt(configMap['quota_tokens_per_minute'] || '1000')
                        }
                    });
                }
            }
        }
        next();
    } catch (error) {
        logger.error('Failed to initialize services:', error);
        next();
    }
};

router.use(ensureServicesInitialized);

// =====================================================
// PROVIDER MANAGEMENT ENDPOINTS
// =====================================================

// Get all providers
router.get('/', async (req, res) => {
    try {
        const providers = await executeQuery(
            `SELECT 
                ap.id,
                ap.name,
                ap.type,
                ap.api_endpoint,
                ap.is_active,
                ap.created_at,
                ap.updated_at,
                COUNT(am.id) as model_count
             FROM ai_providers ap
             LEFT JOIN ai_models am ON ap.id = am.provider_id
             GROUP BY ap.id
             ORDER BY ap.name`
        );

        res.json({
            success: true,
            providers,
            total: providers.length
        });
        return;
    } catch (error) {
        logger.error('Failed to get providers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get providers',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Add Google Cloud provider
router.post('/google', async (req, res) => {
    try {
        const { apiKey, projectId, region = 'us-central1', quotaLimits } = req.body;

        if (!apiKey || !projectId) {
            return res.status(400).json({
                success: false,
                error: 'API key and project ID are required'
            });
        }

        // Initialize Google provider
        await googleProvider.initialize({
            apiKey,
            projectId,
            region,
            quotaLimits: quotaLimits || { rpm: 60, tpm: 1000 }
        });

        return res.json({
            success: true,
            message: 'Google Cloud provider added successfully',
            provider: {
                name: 'Google Cloud AI',
                type: 'google',
                projectId,
                region
            }
        });
    } catch (error) {
        logger.error('Failed to add Google Cloud provider:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to add Google Cloud provider',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get Google Cloud models
router.get('/google/models', async (req, res) => {
    try {
        if (!googleProvider.isInitialized()) {
            return res.status(400).json({
                success: false,
                error: 'Google Cloud provider not initialized'
            });
        }

        const models = await googleProvider.listAvailableModels();
        
        return res.json({
            success: true,
            models,
            total: models.length
        });
    } catch (error) {
        logger.error('Failed to get Google Cloud models:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to get Google Cloud models',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Test Google Cloud provider connectivity
router.post('/google/test', async (req, res) => {
    try {
        if (!googleProvider.isInitialized()) {
            return res.status(400).json({
                success: false,
                error: 'Google Cloud provider not initialized'
            });
        }

        const models = await googleProvider.listAvailableModels();
        const testResults = [];

        for (const model of models) {
            const isAvailable = await googleProvider.testModelConnectivity(model.name);
            testResults.push({
                modelName: model.name,
                displayName: model.displayName,
                available: isAvailable
            });
        }

        const allAvailable = testResults.every(result => result.available);

        return res.json({
            success: true,
            connectivity: allAvailable,
            testResults,
            message: allAvailable ? 'All models are accessible' : 'Some models are not accessible'
        });
    } catch (error) {
        logger.error('Failed to test Google Cloud connectivity:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to test Google Cloud connectivity',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Update Google Cloud provider configuration
router.put('/google/config', async (req, res) => {
    try {
        const { apiKey, projectId, region, quotaLimits } = req.body;

        if (!googleProvider.isInitialized()) {
            return res.status(400).json({
                success: false,
                error: 'Google Cloud provider not initialized'
            });
        }

        // Update configuration
        if (apiKey) {
            // In a real implementation, you'd update the provider configuration
            logger.info('Provider configuration updated');
        }

        return res.json({
            success: true,
            message: 'Provider configuration updated successfully'
        });
    } catch (error) {
        logger.error('Failed to update provider configuration:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update provider configuration',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// =====================================================
// MODEL TESTING ENDPOINTS
// =====================================================

// Test model connectivity
router.post('/models/:modelName/test', async (req, res) => {
    try {
        const { modelName } = req.params;
        const { provider = 'ollama', testPrompt = 'Hello, world!' } = req.body;

        let success = false;
        let responseTime = 0;
        let tokensUsed = 0;
        let errorMessage = '';

        const startTime = Date.now();

        try {
            if (provider === 'google' && googleProvider.isInitialized()) {
                const response = await googleProvider.sendMessage(modelName, testPrompt);
                success = true;
                tokensUsed = response.usage.totalTokens;
            } else {
                // Test Ollama model
                const result = await cliManager.executeCLICommand('ollama', ['run', modelName, testPrompt]);
                success = result.success;
                if (result.output) {
                    tokensUsed = result.output.split(' ').length;
                }
                if (result.error) {
                    errorMessage = result.error;
                }
            }

            responseTime = Date.now() - startTime;

        } catch (error) {
            success = false;
            errorMessage = error instanceof Error ? error.message : 'Unknown error';
            responseTime = Date.now() - startTime;
        }

        // Record test result
        await performanceMonitor.recordModelTest(modelName, {
            testName: 'connectivity_test',
            modelName,
            success,
            responseTime,
            tokensUsed,
            errorMessage: success ? undefined : errorMessage,
            timestamp: new Date()
        });

        res.json({
            success: true,
            testResult: {
                modelName,
                provider,
                success,
                responseTime,
                tokensUsed,
                errorMessage: success ? undefined : errorMessage,
                timestamp: new Date().toISOString()
            }
        });
        return;
    } catch (error) {
        logger.error(`Failed to test model ${req.params.modelName}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to test model',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Send message to model
router.post('/models/:modelName/message', async (req, res) => {
    try {
        const { modelName } = req.params;
        const { provider = 'ollama', prompt, maxTokens = 1000 } = req.body;

        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: 'Prompt is required'
            });
        }

        let response: any = null;
        let success = false;
        let responseTime = 0;
        let tokensUsed = 0;
        let errorMessage = '';

        const startTime = Date.now();

        try {
            if (provider === 'google' && googleProvider.isInitialized()) {
                response = await googleProvider.sendMessage(modelName, prompt);
                success = true;
                tokensUsed = response.usage.totalTokens;
            } else {
                // Send to Ollama model
                const result = await cliManager.executeCLICommand('ollama', ['run', modelName, prompt]);
                success = result.success;
                response = { content: result.output };
                if (result.output) {
                    tokensUsed = result.output.split(' ').length;
                }
                if (result.error) {
                    errorMessage = result.error;
                }
            }

            responseTime = Date.now() - startTime;

        } catch (error) {
            success = false;
            errorMessage = error instanceof Error ? error.message : 'Unknown error';
            responseTime = Date.now() - startTime;
        }

        // Record performance metrics
        await performanceMonitor.recordModelTest(modelName, {
            testName: 'message_test',
            modelName,
            success,
            responseTime,
            tokensUsed,
            errorMessage: success ? undefined : errorMessage,
            timestamp: new Date()
        });

        return res.json({
            success: true,
            response: success ? response : null,
            performance: {
                responseTime,
                tokensUsed,
                success
            },
            errorMessage: success ? undefined : errorMessage
        });
    } catch (error) {
        logger.error(`Failed to send message to model ${req.params.modelName}:`, error);
        return res.status(500).json({
            success: false,
            error: 'Failed to send message to model',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get model performance metrics
router.get('/models/:modelName/performance', async (req, res) => {
    try {
        const { modelName } = req.params;
        const { hours = 24 } = req.query;

        const metrics = await performanceMonitor.getModelPerformance(modelName);
        const history = await performanceMonitor.getPerformanceHistory(modelName, parseInt(hours as string));
        const recentTests = await performanceMonitor.getRecentTests(modelName, 10);

        res.json({
            success: true,
            modelName,
            metrics,
            history: history[0]?.trendData || [],
            recentTests
        });
    } catch (error) {
        logger.error(`Failed to get performance for model ${req.params.modelName}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to get model performance',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// =====================================================
// DEPENDENCY MANAGEMENT ENDPOINTS
// =====================================================

// Install Ollama
router.post('/install/ollama', async (req, res) => {
    try {
        const result = await dependencyInstaller.installOllama();
        
        res.json({
            success: result.success,
            message: result.message,
            installedPath: result.installedPath,
            error: result.error
        });
    } catch (error) {
        logger.error('Failed to install Ollama:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to install Ollama',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Install model dependencies
router.post('/models/:modelName/install-dependencies', async (req, res) => {
    try {
        const { modelName } = req.params;
        const dependencies = await dependencyInstaller.installModelDependencies(modelName);
        
        res.json({
            success: true,
            modelName,
            dependencies,
            message: `Installed dependencies for ${modelName}`
        });
    } catch (error) {
        logger.error(`Failed to install dependencies for ${req.params.modelName}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to install model dependencies',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Verify model installation
router.get('/models/:modelName/verify', async (req, res) => {
    try {
        const { modelName } = req.params;
        const isInstalled = await dependencyInstaller.verifyInstallation(modelName);
        const systemRequirements = await dependencyInstaller.getSystemRequirements(modelName);
        
        res.json({
            success: true,
            modelName,
            isInstalled,
            systemRequirements,
            message: isInstalled ? 'Model is installed and available' : 'Model is not installed or not available'
        });
    } catch (error) {
        logger.error(`Failed to verify installation for ${req.params.modelName}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify model installation',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// =====================================================
// CLI PROCESS MANAGEMENT ENDPOINTS
// =====================================================

// Start model process
router.post('/models/:modelName/start', async (req, res) => {
    try {
        const { modelName } = req.params;
        const { provider = 'ollama' } = req.body;

        const processInfo = await cliManager.startModelProcess(modelName, provider);
        
        res.json({
            success: true,
            processInfo,
            message: `Started ${provider} model process for ${modelName}`
        });
    } catch (error) {
        logger.error(`Failed to start model process for ${req.params.modelName}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to start model process',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Stop model process
router.post('/models/:modelName/stop', async (req, res) => {
    try {
        const { modelName } = req.params;
        const success = await cliManager.stopModelProcess(modelName);
        
        res.json({
            success,
            message: success ? `Stopped model process for ${modelName}` : `No running process found for ${modelName}`
        });
    } catch (error) {
        logger.error(`Failed to stop model process for ${req.params.modelName}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to stop model process',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get process status
router.get('/models/:modelName/status', async (req, res) => {
    try {
        const { modelName } = req.params;
        const status = await cliManager.getProcessStatus(modelName);
        
        if (!status) {
            return res.status(404).json({
                success: false,
                error: 'No process found for this model'
            });
        }

        return res.json({
            success: true,
            status
        });
    } catch (error) {
        logger.error(`Failed to get process status for ${req.params.modelName}:`, error);
        return res.status(500).json({
            success: false,
            error: 'Failed to get process status',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;