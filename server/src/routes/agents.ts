import express from 'express';
import { OllamaService } from '../services/ollama';
import { Logger } from '../utils/logger';
import { executeQuery } from '../database/connection';

const router = express.Router();
const ollamaService = new OllamaService();
const logger = new Logger();

// Get all agents
router.get('/', async (req, res) => {
  try {
    // Try to fetch from database first
    const agents = await executeQuery(`
      SELECT 
        id,
        name,
        type,
        status,
        config AS configuration,
        request_count,
        active_sessions,
        created_at,
        updated_at
      FROM agents
      ORDER BY name
    `);

    // If database query succeeds, return agents from database
    if (Array.isArray(agents)) {
      res.json({
        success: true,
        agents: agents.map(agent => ({
          id: agent.id,
          name: agent.name,
          type: agent.type,
          status: agent.status,
          config: agent.configuration ? JSON.parse(agent.configuration) : {},
          requestCount: agent.request_count || 0,
          activeSessions: agent.active_sessions || 0,
          createdAt: agent.created_at,
          updatedAt: agent.updated_at
        })),
        total: agents.length,
        source: 'database',
        timestamp: new Date().toISOString()
      });
      return;
    }
  } catch (dbError) {
    logger.warn('Failed to fetch agents from database, falling back to defaults:', dbError);
  }

  // Fallback to default agents if database fails
  try {
    const ollamaHealth = await ollamaService.healthCheck();
    
    const defaultAgents = [
      {
        id: 'ollama-agent',
        name: 'Ollama Agent',
        type: 'ai_model',
        status: ollamaHealth.status === 'healthy' ? 'active' : 'inactive',
        endpoint: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        priority: 1,
        capabilities: ['text_generation', 'chat', 'streaming', 'code_generation'],
        metrics: {
          requestCount: 0, // This would be tracked in a real implementation
          avgResponseTime: 0,
          errorRate: 0
        },
        config: {
          defaultModel: ollamaHealth.defaultModel,
          availableModels: ollamaHealth.models,
          maxTokens: 2048,
          temperature: 0.7
        }
      },
      {
        id: 'memory-agent',
        name: 'Memory Agent',
        type: 'memory',
        status: process.env.MEMORY_AGENT_ENABLED === 'true' ? 'active' : 'inactive',
        endpoint: 'http://localhost:8001',
        priority: 2,
        capabilities: ['conversation_history', 'context_management', 'data_persistence'],
        metrics: {
          requestCount: 0,
          avgResponseTime: 0,
          errorRate: 0
        },
        config: {
          storageType: 'file',
          maxHistoryLength: 100,
          autoCleanup: true
        }
      },
      {
        id: 'cli-agent',
        name: 'CLI Agent',
        type: 'command',
        status: process.env.CLI_AGENT_ENABLED === 'true' ? 'active' : 'inactive',
        endpoint: 'http://localhost:8001/v1',
        priority: 3,
        capabilities: ['command_execution', 'file_operations', 'system_monitoring'],
        metrics: {
          requestCount: 0,
          avgResponseTime: 0,
          errorRate: 0
        },
        config: {
          allowedCommands: ['ls', 'cd', 'mkdir', 'touch', 'cat', 'grep'],
          workingDirectory: process.cwd(),
          timeout: 30000
        }
      }
    ];

    res.json({
      success: true,
      agents: defaultAgents,
      total: defaultAgents.length,
      source: 'fallback',
      timestamp: new Date().toISOString()
    });
    return;
  } catch (error) {
    logger.error('Failed to get agents:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agents',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Get specific agent status
router.get('/:agentId/status', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    let agentStatus;
    
    switch (agentId) {
      case 'ollama-agent':
        const ollamaHealth = await ollamaService.healthCheck();
        agentStatus = {
          id: agentId,
          name: 'Ollama Agent',
          status: ollamaHealth.status === 'healthy' ? 'active' : 'inactive',
          uptime: process.uptime(),
          lastRequest: new Date().toISOString(),
          health: {
            status: ollamaHealth.status,
            models: ollamaHealth.models,
            defaultModel: ollamaHealth.defaultModel,
            responseTime: 0
          }
        };
        break;
        
      case 'memory-agent':
        agentStatus = {
          id: agentId,
          name: 'Memory Agent',
          status: process.env.MEMORY_AGENT_ENABLED === 'true' ? 'active' : 'inactive',
          uptime: process.uptime(),
          lastRequest: new Date().toISOString(),
          health: {
            status: 'healthy',
            storageAvailable: true,
            responseTime: 0
          }
        };
        break;
        
      case 'cli-agent':
        agentStatus = {
          id: agentId,
          name: 'CLI Agent',
          status: process.env.CLI_AGENT_ENABLED === 'true' ? 'active' : 'inactive',
          uptime: process.uptime(),
          lastRequest: new Date().toISOString(),
          health: {
            status: 'healthy',
            commandsAvailable: true,
            responseTime: 0
          }
        };
        break;
        
      default:
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
          agentId
        });
    }

    res.json({
      success: true,
      agent: agentStatus,
      timestamp: new Date().toISOString()
    });
    return;
  } catch (error) {
    logger.error(`Failed to get agent status for ${req.params.agentId}:`, error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get agent status',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
    return;
  }
});

// Start agent
router.post('/:agentId/start', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // In a real implementation, this would start the actual agent service
    // For now, we'll just return a success response
    
    res.json({
      success: true,
      message: `Agent ${agentId} started successfully`,
      agentId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Failed to start agent ${req.params.agentId}:`, error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to start agent',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Stop agent
router.post('/:agentId/stop', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // In a real implementation, this would stop the actual agent service
    // For now, we'll just return a success response
    
    res.json({
      success: true,
      message: `Agent ${agentId} stopped successfully`,
      agentId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Failed to stop agent ${req.params.agentId}:`, error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to stop agent',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Call agent
router.post('/:agentId/call', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { action, payload } = req.body;
    
    let result;
    
    switch (agentId) {
      case 'ollama-agent':
        if (action === 'generate_code' && payload.prompt) {
          const response = await ollamaService.generate(payload.prompt);
          result = {
            code: response,
            explanation: 'Code generated successfully'
          };
        } else {
          return res.status(400).json({
            success: false,
            error: 'Invalid action for Ollama agent'
          });
        }
        break;
        
      default:
        return res.status(404).json({
          success: false,
          error: 'Agent not found or not callable'
        });
    }

    res.json({
      success: true,
      result,
      executionTime: Date.now(),
      agentId,
      action,
      timestamp: new Date().toISOString()
    });
    return;
  } catch (error) {
    logger.error(`Failed to call agent ${req.params.agentId}:`, error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to call agent',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
    return;
  }
});

export default router;
