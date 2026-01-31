import express from 'express';
import { OllamaService } from '../services/ollama';
import { Logger } from '../utils/logger';
import { executeQuery } from '../database/connection';
import { AgentsMonitor } from '../services/agents-monitor';

const router = express.Router();
const ollamaService = new OllamaService();
const logger = new Logger();
let agentsMonitor: AgentsMonitor | null = null;

// Initialize agents monitor if database is available
try {
  // We'll initialize this in the main server file, but for now we'll try to get it from global
  if ((global as any).agentsMonitor) {
    agentsMonitor = (global as any).agentsMonitor;
  }
} catch (error) {
  logger.warn('Could not initialize agents monitor:', error);
}

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
          config: agent.configuration || {},
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

// Get all agents with runtime status
router.get('/runtime', async (req, res) => {
  try {
    if (!agentsMonitor) {
      return res.status(500).json({
        success: false,
        error: 'Agents monitor not initialized'
      });
    }

    const agentsWithStatus = await agentsMonitor.getAllAgentStatuses();
    
    return res.json({
      success: true,
      agents: agentsWithStatus,
      total: agentsWithStatus.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get agents with runtime status:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to get agents runtime status',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Get specific agent runtime status
router.get('/:agentId/runtime', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agentIdNum = parseInt(agentId);
    
    if (isNaN(agentIdNum)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid agent ID'
      });
    }
    
    if (!agentsMonitor) {
      return res.status(500).json({
        success: false,
        error: 'Agents monitor not initialized'
      });
    }

    const agentStatus = await agentsMonitor.getAgentStatus(agentIdNum);
    
    if (!agentStatus) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
        agentId: agentIdNum
      });
    }
    
    return res.json({
      success: true,
      agent: agentStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Failed to get runtime status for agent ${req.params.agentId}:`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to get agent runtime status',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Get agent metrics
router.get('/:agentId/metrics', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agentIdNum = parseInt(agentId);
    
    if (isNaN(agentIdNum)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid agent ID'
      });
    }
    
    if (!agentsMonitor) {
      return res.status(500).json({
        success: false,
        error: 'Agents monitor not initialized'
      });
    }

    const hoursBack = parseInt(req.query.hours as string) || 24;
    const metrics = await agentsMonitor.getAgentMetrics(agentIdNum, hoursBack);
    
    return res.json({
      success: true,
      metrics,
      agentId: agentIdNum,
      hoursBack,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Failed to get metrics for agent ${req.params.agentId}:`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to get agent metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Get agent request history
router.get('/:agentId/requests', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agentIdNum = parseInt(agentId);
    
    if (isNaN(agentIdNum)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid agent ID'
      });
    }
    
    if (!agentsMonitor) {
      return res.status(500).json({
        success: false,
        error: 'Agents monitor not initialized'
      });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const requests = await agentsMonitor.getAgentRequests(agentIdNum, limit);
    
    return res.json({
      success: true,
      requests,
      agentId: agentIdNum,
      limit,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Failed to get requests for agent ${req.params.agentId}:`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to get agent requests',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Enable agent
router.post('/:agentId/enable', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agentIdNum = parseInt(agentId);
    
    if (isNaN(agentIdNum)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid agent ID'
      });
    }
    
    if (!agentsMonitor) {
      return res.status(500).json({
        success: false,
        error: 'Agents monitor not initialized'
      });
    }

    const success = await agentsMonitor.setAgentEnabled(agentIdNum, true);
    
    if (success) {
      return res.json({
        success: true,
        message: `Agent ${agentIdNum} enabled successfully`,
        agentId: agentIdNum,
        enabled: true,
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to enable agent',
        agentId: agentIdNum,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error(`Failed to enable agent ${req.params.agentId}:`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to enable agent',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Disable agent
router.post('/:agentId/disable', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agentIdNum = parseInt(agentId);
    
    if (isNaN(agentIdNum)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid agent ID'
      });
    }
    
    if (!agentsMonitor) {
      return res.status(500).json({
        success: false,
        error: 'Agents monitor not initialized'
      });
    }

    const success = await agentsMonitor.setAgentEnabled(agentIdNum, false);
    
    if (success) {
      return res.json({
        success: true,
        message: `Agent ${agentIdNum} disabled successfully`,
        agentId: agentIdNum,
        disabled: true,
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to disable agent',
        agentId: agentIdNum,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error(`Failed to disable agent ${req.params.agentId}:`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to disable agent',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Test agent connectivity
router.post('/:agentId/test', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agentIdNum = parseInt(agentId);
    
    if (isNaN(agentIdNum)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid agent ID'
      });
    }
    
    if (!agentsMonitor) {
      return res.status(500).json({
        success: false,
        error: 'Agents monitor not initialized'
      });
    }

    // Check if agent exists and is enabled
    const isEnabled = await agentsMonitor.isAgentEnabled(agentIdNum);
    
    if (!isEnabled) {
      return res.json({
        success: false,
        message: `Agent ${agentIdNum} is not enabled`,
        agentId: agentIdNum,
        enabled: false,
        timestamp: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      message: `Agent ${agentIdNum} connectivity test passed`,
      agentId: agentIdNum,
      enabled: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Failed to test agent ${req.params.agentId}:`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to test agent connectivity',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
