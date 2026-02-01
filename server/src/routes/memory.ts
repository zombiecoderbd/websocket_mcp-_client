import express from 'express';
import { Logger } from '../utils/logger';
import { executeQuery, getPool } from '../database/connection';
import { TFIDFEmbeddingService } from '../services/embedding';
const MemoryManagementAPI = require('../services/memory/memory-api');

const router = express.Router();
const logger = new Logger();
let embeddingService: TFIDFEmbeddingService | null = null;
let memoryAPI: typeof MemoryManagementAPI | null = null;

// Initialize memory API lazily
async function ensureMemoryAPI() {
  if (!memoryAPI) {
    try {
      memoryAPI = new MemoryManagementAPI({
        chromaConfig: {
          host: 'localhost',
          port: 8000
        }
      });
      await memoryAPI.initialize();
      logger.info('Advanced memory API initialized successfully');
    } catch (error) {
      logger.warn('Could not initialize advanced memory API:', error);
    }
  }
  return memoryAPI;
}

// Initialize embedding service lazily when needed
async function ensureEmbeddingService() {
  if (!embeddingService) {
    try {
      const pool = getPool();
      embeddingService = new TFIDFEmbeddingService(pool);
      logger.info('Embedding service initialized successfully');
    } catch (error) {
      logger.warn('Could not initialize embedding service:', error);
      throw error;
    }
  }
  return embeddingService;
}

// Mock memory storage (for fallback purposes)
const memoryStorage = new Map<string, any>();



// Get conversations
// Advanced memory API endpoints

// Health check for advanced memory system
router.get('/advanced/health', async (req, res) => {
  try {
    const api = await ensureMemoryAPI();
    if (!api) {
      return res.status(503).json({
        success: false,
        error: 'Advanced memory API not available'
      });
    }

    const isReady = await api.isReady();
    const stats = isReady ? await api.getMemoryStats() : null;
    
    return res.json({
      success: true,
      ready: isReady,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to check advanced memory health:', error);
    return res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Insert document using advanced memory system
router.post('/advanced/documents', async (req, res) => {
  try {
    const api = await ensureMemoryAPI();
    
    if (!api) {
      return res.status(503).json({
        success: false,
        error: 'Advanced memory API not available'
      });
    }

    const { text, metadata, collection } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    const result = await api.insertDocument(
      text,
      metadata || {},
      collection
    );

    return res.status(201).json({
      success: true,
      result: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to insert document via advanced API:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to insert document',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Retrieve context using advanced memory system
router.get('/advanced/context', async (req, res) => {
  try {
    const api = await ensureMemoryAPI();
    
    if (!api) {
      return res.status(503).json({
        success: false,
        error: 'Advanced memory API not available'
      });
    }

    const { query, k = 5, collection, filters } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    const result = await api.retrieveContext(
      query,
      parseInt(k as string),
      collection as string || null,
      filters ? JSON.parse(filters as string) : {}
    );

    return res.json({
      success: true,
      result: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to retrieve context via advanced API:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve context',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Semantic search using advanced memory system
router.post('/advanced/search', async (req, res) => {
  try {
    const api = await ensureMemoryAPI();
    
    if (!api) {
      return res.status(503).json({
        success: false,
        error: 'Advanced memory API not available'
      });
    }

    const { query, threshold = 0.7, k = 10, collection } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    const result = await api.semanticSearch(
      query,
      threshold,
      k,
      collection || null
    );

    return res.json({
      success: true,
      result: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to perform semantic search via advanced API:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to perform search',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get memory statistics
router.get('/advanced/stats', async (req, res) => {
  try {
    await ensureMemoryAPI();
    
    if (!memoryAPI) {
      return res.status(503).json({
        success: false,
        error: 'Advanced memory API not available'
      });
    }

    const stats = await memoryAPI.getMemoryStats();
    
    return res.json({
      success: true,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get memory stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get memory stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Original conversations endpoint
router.get('/conversations', async (req, res) => {
    try {
        // Query conversations from database
        const conversations = await executeQuery(
            `SELECT 
                c.id,
                c.title as name,
                c.message_count as messageCount,
                c.updated_at as lastUpdated,
                c.created_at as createdAt
             FROM conversations c
             ORDER BY c.updated_at DESC`
        );

        res.json({
            success: true,
            conversations,
            total: conversations.length,
            timestamp: new Date().toISOString()
        });
        return;
    } catch (error) {
        logger.error('Failed to get conversations:', error);

        res.status(500).json({
            success: false,
            error: 'Failed to fetch conversations',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        return;
    }
});

// Get conversation messages
router.get('/:conversationId', async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { limit = 100, offset = 0 } = req.query;

        // Query messages from database
        const messages = await executeQuery(
            `SELECT 
                m.id,
                m.sender_type as role,
                m.content,
                m.model_used,
                m.latency_ms,
                m.created_at as timestamp,
                m.token_usage
             FROM messages m
             WHERE m.conversation_id = ?
             ORDER BY m.created_at ASC
             LIMIT ? OFFSET ?`,
            [conversationId, parseInt(limit as string), parseInt(offset as string)]
        );

        // Get total message count
        const totalCountResult = await executeQuery(
            'SELECT COUNT(*) as total FROM messages WHERE conversation_id = ?',
            [conversationId]
        );
        const totalCount = totalCountResult[0]?.total || 0;

        res.json({
            success: true,
            conversationId,
            messages,
            total: totalCount,
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            timestamp: new Date().toISOString()
        });
        return;
    } catch (error) {
        logger.error(`Failed to get messages for conversation ${req.params.conversationId}:`, error);

        res.status(500).json({
            success: false,
            error: 'Failed to fetch conversation messages',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        return;
    }
});

// Store data in memory
router.post('/store', async (req, res) => {
    try {
        const { key, value, ttl, agentId, contentType = 'context' } = req.body;

        if (!key || value === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Key and value are required'
            });
        }

        // Determine content based on value type
        const content = typeof value === 'string' ? value : JSON.stringify(value);
        
        // Insert into agent_memory table
        const insertResult = await executeQuery(
            `INSERT INTO agent_memory 
             (agent_id, content_type, content, summary, metadata, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
            [agentId || 1, contentType, content, key, JSON.stringify({ key, ttl })]
        );

        // If embedding service is available, generate and store embedding
        if (embeddingService && insertResult.insertId) {
            try {
                await embeddingService.updateEmbedding(insertResult.insertId, content);
            } catch (embeddingError) {
                logger.warn('Could not generate embedding for stored content:', embeddingError);
            }
        }

        res.json({
            success: true,
            key,
            memoryId: insertResult.insertId,
            timestamp: new Date().toISOString()
        });
        return;
    } catch (error) {
        logger.error('Failed to store data in memory:', error);

        res.status(500).json({
            success: false,
            error: 'Failed to store data',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        return;
    }
});

// Retrieve data from memory
router.get('/retrieve/:memoryId', async (req, res) => {
    try {
        const { memoryId } = req.params;
        
        // Fetch from agent_memory table
        const results = await executeQuery(
            `SELECT 
                am.id,
                am.content,
                am.content_type,
                am.summary,
                am.metadata,
                am.created_at,
                am.updated_at
             FROM agent_memory am
             WHERE am.id = ?`,
            [memoryId]
        );

        if (!results || results.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Memory data not found',
                memoryId
            });
        }

        const data = results[0];
        
        res.json({
            success: true,
            memoryId: data.id,
            value: data.content,
            contentType: data.content_type,
            summary: data.summary,
            metadata: data.metadata ? JSON.parse(data.metadata) : {},
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            timestamp: new Date().toISOString()
        });
        return;
    } catch (error) {
        logger.error(`Failed to retrieve data for memoryId ${req.params.memoryId}:`, error);

        res.status(500).json({
            success: false,
            error: 'Failed to retrieve data',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        return;
    }
});

// Search memory (traditional search)
router.post('/search', async (req, res) => {
    try {
        const { query, limit = 10, searchType = 'traditional' } = req.body;

        if (!query || typeof query !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Search query is required'
            });
        }

        let results = [];

        if (searchType === 'semantic' && embeddingService) {
            // Perform semantic search using embeddings
            results = await embeddingService.semanticSearch(query, limit);
        } else {
            // Traditional keyword search
            results = await executeQuery(
                `SELECT 
                    am.id,
                    am.content,
                    am.content_type,
                    am.summary,
                    am.created_at,
                    MATCH(am.content, am.summary) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance_score
                 FROM agent_memory am
                 WHERE am.content LIKE ? OR am.summary LIKE ?
                 ORDER BY relevance_score DESC, am.created_at DESC
                 LIMIT ?`,
                [`%${query}%`, `%${query}%`, `%${query}%`, limit]
            );
        }

        res.json({
            success: true,
            results,
            total: results.length,
            query,
            searchType,
            timestamp: new Date().toISOString()
        });
        return;
    } catch (error) {
        logger.error('Failed to search memory:', error);

        res.status(500).json({
            success: false,
            error: 'Failed to search memory',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        return;
    }
});

// Semantic search endpoint
router.post('/semantic-search', async (req, res) => {
    try {
        const { query, limit = 10, embeddingType = 'text' } = req.body;

        if (!query || typeof query !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Search query is required'
            });
        }

        if (!embeddingService) {
            return res.status(500).json({
                success: false,
                error: 'Embedding service not available'
            });
        }

        const results = await embeddingService.semanticSearch(query, limit, embeddingType);

        res.json({
            success: true,
            results,
            total: results.length,
            query,
            embeddingType,
            timestamp: new Date().toISOString()
        });
        return;
    } catch (error) {
        logger.error('Failed to perform semantic search:', error);

        res.status(500).json({
            success: false,
            error: 'Failed to perform semantic search',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        return;
    }
});

// Delete data from memory
router.delete('/:memoryId', async (req, res) => {
    try {
        const { memoryId } = req.params;

        // Delete from agent_memory table
        const result = await executeQuery(
            'DELETE FROM agent_memory WHERE id = ?',
            [memoryId]
        );

        // If embedding service is available, remove associated embedding
        if (embeddingService) {
            try {
                await embeddingService.removeEmbedding(parseInt(memoryId));
            } catch (embeddingError) {
                logger.warn('Could not remove embedding:', embeddingError);
            }
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Memory data not found',
                memoryId
            });
        }

        res.json({
            success: true,
            message: 'Memory data deleted successfully',
            memoryId,
            deletedCount: result.affectedRows,
            timestamp: new Date().toISOString()
        });
        return;
    } catch (error) {
        logger.error(`Failed to delete memory data ${req.params.memoryId}:`, error);

        res.status(500).json({
            success: false,
            error: 'Failed to delete memory data',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        return;
    }
});

export default router;
