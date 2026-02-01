/**
 * Core Memory Management API
 * Advanced AI Agent Architecture - Memory Management Service
 * 
 * This service provides the main interface for agent memory operations
 * integrating vector database and embedding services.
 */

const ChromaDBService = require('../../../../packages/database/vector-db/chroma-service');
const EmbeddingService = require('../../../../packages/database/embedding/embedding-service');

class MemoryManagementAPI {
    constructor(config = {}) {
        this.config = {
            chromaConfig: config.chromaConfig || {
                host: 'localhost',
                port: 8000
            },
            embeddingConfig: config.embeddingConfig || {
                model: 'Xenova/all-MiniLM-L6-v2'
            },
            defaultCollection: config.defaultCollection || 'user_knowledge'
        };

        // Initialize services
        this.chromaService = new ChromaDBService(this.config.chromaConfig);
        this.embeddingService = new EmbeddingService(this.config.embeddingConfig);
        
        this.isInitialized = false;
    }

    /**
     * Initialize all memory services
     */
    async initialize() {
        try {
            console.log('Initializing Memory Management API...');
            
            // Initialize ChromaDB service
            await this.chromaService.initialize();
            
            // Initialize embedding service
            await this.embeddingService.initialize();
            
            this.isInitialized = true;
            console.log('Memory Management API initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Memory Management API:', error);
            throw new Error(`Memory API initialization failed: ${error.message}`);
        }
    }

    /**
     * Insert document with automatic embedding
     */
    async insertDocument(text, metadata = {}, collection = this.config.defaultCollection) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            // Add timestamp and source info
            const documentMetadata = {
                ...metadata,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                source: metadata.source || 'api',
                embedding_model: this.config.embeddingConfig.model
            };

            // Insert into vector database
            const docId = await this.chromaService.insertDocument(
                collection,
                text,
                documentMetadata
            );

            return {
                id: docId,
                collection: collection,
                metadata: documentMetadata,
                status: 'inserted'
            };
        } catch (error) {
            console.error('Failed to insert document:', error);
            throw error;
        }
    }

    /**
     * Retrieve context using semantic search
     */
    async retrieveContext(query, k = 5, collection = null, filters = {}) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            let results;
            
            if (collection) {
                // Search in specific collection
                results = await this.chromaService.retrieveContext(
                    collection,
                    query,
                    k,
                    filters
                );
            } else {
                // Search across all collections
                results = await this.chromaService.semanticSearch(
                    query,
                    k,
                    null // All collections
                );
            }

            // Enrich results with additional metadata
            const enrichedResults = results.map(result => ({
                ...result,
                query_used: query,
                retrieved_at: new Date().toISOString()
            }));

            return {
                query: query,
                results: enrichedResults,
                count: enrichedResults.length,
                collection: collection || 'all'
            };
        } catch (error) {
            console.error('Failed to retrieve context:', error);
            throw error;
        }
    }

    /**
     * Update existing document
     */
    async updateDocument(docId, newText, newMetadata = {}, collection = this.config.defaultCollection) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            const updatedMetadata = {
                ...newMetadata,
                updated_at: new Date().toISOString()
            };

            await this.chromaService.updateDocument(
                collection,
                docId,
                newText,
                updatedMetadata
            );

            return {
                id: docId,
                collection: collection,
                status: 'updated'
            };
        } catch (error) {
            console.error('Failed to update document:', error);
            throw error;
        }
    }

    /**
     * Delete document
     */
    async deleteDocument(docId, collection = this.config.defaultCollection) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            await this.chromaService.deleteDocument(collection, docId);

            return {
                id: docId,
                collection: collection,
                status: 'deleted'
            };
        } catch (error) {
            console.error('Failed to delete document:', error);
            throw error;
        }
    }

    /**
     * Semantic search with similarity threshold
     */
    async semanticSearch(query, threshold = 0.7, k = 10, collection = null) {
        try {
            const context = await this.retrieveContext(query, k, collection);
            
            // Filter by similarity threshold
            const filteredResults = context.results.filter(
                result => result.similarity >= threshold
            );

            return {
                query: query,
                threshold: threshold,
                results: filteredResults,
                count: filteredResults.length,
                original_count: context.results.length
            };
        } catch (error) {
            console.error('Failed to perform semantic search:', error);
            throw error;
        }
    }

    /**
     * Find similar documents to a given text
     */
    async findSimilarDocuments(text, k = 5, collection = null) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            // Get embedding for the text
            const textEmbedding = await this.embeddingService.embedText(text);
            
            // Search using the embedding
            const results = await this.chromaService.semanticSearch(
                text,
                k,
                collection ? [collection] : null
            );

            return {
                reference_text: text,
                results: results,
                count: results.length
            };
        } catch (error) {
            console.error('Failed to find similar documents:', error);
            throw error;
        }
    }

    /**
     * Memory cleanup operations
     */
    async memoryCleanup(keepDays = 30, collection = null) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            const collectionsToClean = collection ? 
                [collection] : 
                this.config.chromaConfig.collections;

            const cleanupResults = {};

            for (const colName of collectionsToClean) {
                const deletedCount = await this.chromaService.cleanupOldDocuments(
                    colName,
                    keepDays
                );
                cleanupResults[colName] = deletedCount;
            }

            // Clear embedding cache
            this.embeddingService.clearCache();

            return {
                cleanup_results: cleanupResults,
                cache_cleared: true,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Failed to cleanup memory:', error);
            throw error;
        }
    }

    /**
     * Get memory statistics
     */
    async getMemoryStats() {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            // Get ChromaDB stats
            const chromaStats = await this.chromaService.healthCheck();
            
            // Get embedding service stats
            const embeddingStats = await this.embeddingService.healthCheck();

            return {
                chroma_db: chromaStats,
                embedding_service: embeddingStats,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Failed to get memory stats:', error);
            throw error;
        }
    }

    /**
     * Batch document operations
     */
    async batchInsert(documents, collection = this.config.defaultCollection) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            const results = [];
            
            for (const doc of documents) {
                try {
                    const result = await this.insertDocument(
                        doc.text,
                        doc.metadata || {},
                        collection
                    );
                    results.push({ ...result, success: true });
                } catch (error) {
                    results.push({
                        text: doc.text,
                        error: error.message,
                        success: false
                    });
                }
            }

            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            return {
                total: results.length,
                successful: successful,
                failed: failed,
                results: results
            };
        } catch (error) {
            console.error('Failed to batch insert documents:', error);
            throw error;
        }
    }

    /**
     * Search with multiple queries
     */
    async multiQuerySearch(queries, k = 3, collection = null) {
        try {
            const results = {};

            for (const query of queries) {
                results[query] = await this.retrieveContext(query, k, collection);
            }

            return {
                queries: queries,
                results: results
            };
        } catch (error) {
            console.error('Failed to perform multi-query search:', error);
            throw error;
        }
    }

    /**
     * Check if service is ready
     */
    async isReady() {
        try {
            if (!this.isInitialized) {
                return false;
            }

            const chromaHealth = await this.chromaService.healthCheck();
            const embeddingHealth = await this.embeddingService.healthCheck();

            return chromaHealth.status === 'healthy' && 
                   embeddingHealth.status === 'healthy';
        } catch (error) {
            return false;
        }
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        try {
            console.log('Shutting down Memory Management API...');
            
            await this.chromaService.close();
            await this.embeddingService.cleanup();
            
            this.isInitialized = false;
            console.log('Memory Management API shutdown complete');
        } catch (error) {
            console.error('Error during shutdown:', error);
        }
    }
}

module.exports = MemoryManagementAPI;