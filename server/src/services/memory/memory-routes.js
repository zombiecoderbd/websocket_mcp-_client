/**
 * Memory Management API Routes
 * REST API endpoints for memory operations
 */

const express = require('express');
const MemoryManagementAPI = require('./memory-api');

const router = express.Router();
const memoryAPI = new MemoryManagementAPI();

// Initialize memory API on first request
let isInitialized = false;

async function ensureInitialized() {
    if (!isInitialized) {
        await memoryAPI.initialize();
        isInitialized = true;
    }
}

// Middleware to ensure initialization
router.use(async (req, res, next) => {
    try {
        await ensureInitialized();
        next();
    } catch (error) {
        res.status(500).json({
            error: 'Memory service initialization failed',
            message: error.message
        });
    }
});

/**
 * @route POST /api/memory/documents
 * @desc Insert a new document
 */
router.post('/documents', async (req, res) => {
    try {
        const { text, metadata, collection } = req.body;
        
        if (!text) {
            return res.status(400).json({
                error: 'Text is required'
            });
        }

        const result = await memoryAPI.insertDocument(
            text,
            metadata || {},
            collection
        );

        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to insert document',
            message: error.message
        });
    }
});

/**
 * @route GET /api/memory/context
 * @desc Retrieve context using semantic search
 */
router.get('/context', async (req, res) => {
    try {
        const { query, k = 5, collection, filters } = req.query;
        
        if (!query) {
            return res.status(400).json({
                error: 'Query parameter is required'
            });
        }

        const result = await memoryAPI.retrieveContext(
            query,
            parseInt(k),
            collection || null,
            filters ? JSON.parse(filters) : {}
        );

        res.json(result);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to retrieve context',
            message: error.message
        });
    }
});

/**
 * @route POST /api/memory/search
 * @desc Semantic search with threshold
 */
router.post('/search', async (req, res) => {
    try {
        const { query, threshold = 0.7, k = 10, collection } = req.body;
        
        if (!query) {
            return res.status(400).json({
                error: 'Query is required'
            });
        }

        const result = await memoryAPI.semanticSearch(
            query,
            threshold,
            k,
            collection || null
        );

        res.json(result);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to perform search',
            message: error.message
        });
    }
});

/**
 * @route PUT /api/memory/documents/:id
 * @desc Update existing document
 */
router.put('/documents/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { text, metadata, collection } = req.body;

        const result = await memoryAPI.updateDocument(
            id,
            text,
            metadata || {},
            collection
        );

        res.json(result);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to update document',
            message: error.message
        });
    }
});

/**
 * @route DELETE /api/memory/documents/:id
 * @desc Delete document
 */
router.delete('/documents/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { collection } = req.query;

        const result = await memoryAPI.deleteDocument(
            id,
            collection
        );

        res.json(result);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to delete document',
            message: error.message
        });
    }
});

/**
 * @route POST /api/memory/batch
 * @desc Batch insert documents
 */
router.post('/batch', async (req, res) => {
    try {
        const { documents, collection } = req.body;
        
        if (!documents || !Array.isArray(documents)) {
            return res.status(400).json({
                error: 'Documents array is required'
            });
        }

        const result = await memoryAPI.batchInsert(documents, collection);

        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to batch insert documents',
            message: error.message
        });
    }
});

/**
 * @route GET /api/memory/stats
 * @desc Get memory statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await memoryAPI.getMemoryStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to get memory stats',
            message: error.message
        });
    }
});

/**
 * @route POST /api/memory/cleanup
 * @desc Cleanup old documents
 */
router.post('/cleanup', async (req, res) => {
    try {
        const { keepDays = 30, collection } = req.body;
        
        const result = await memoryAPI.memoryCleanup(
            keepDays,
            collection
        );

        res.json(result);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to cleanup memory',
            message: error.message
        });
    }
});

/**
 * @route GET /api/memory/health
 * @desc Check service health
 */
router.get('/health', async (req, res) => {
    try {
        const isReady = await memoryAPI.isReady();
        
        res.json({
            status: isReady ? 'healthy' : 'unhealthy',
            ready: isReady,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

module.exports = router;