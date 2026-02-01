/**
 * MiniLM Embedding Service
 * Advanced AI Agent Architecture - Embedding Model Integration
 * 
 * This service provides text embedding capabilities using sentence-transformers/all-MiniLM-L6-v2
 * optimized for local development with resource constraints.
 */

const { pipeline, env } = require('@xenova/transformers');

class EmbeddingService {
    constructor(config = {}) {
        this.config = {
            model: config.model || 'Xenova/all-MiniLM-L6-v2',
            cacheDir: config.cacheDir || './models/cache',
            maxSequenceLength: config.maxSequenceLength || 512,
            batchSize: config.batchSize || 32
        };
        
        this.pipeline = null;
        this.isInitialized = false;
        this.cache = new Map(); // In-memory cache for embeddings
        
        // Configure transformers.js environment
        env.allowLocalModels = false;
        env.useBrowserCache = false;
        env.backends.onnx.wasm.proxy = false;
    }

    /**
     * Initialize the embedding pipeline
     */
    async initialize() {
        try {
            console.log('Initializing MiniLM embedding service...');
            
            // Create feature extraction pipeline
            this.pipeline = await pipeline('feature-extraction', this.config.model, {
                quantized: true, // Use quantized model for better performance
                progress_callback: (progress) => {
                    console.log(`Model loading progress: ${Math.round(progress * 100)}%`);
                }
            });

            this.isInitialized = true;
            console.log('MiniLM embedding service initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize embedding service:', error);
            throw new Error(`Embedding service initialization failed: ${error.message}`);
        }
    }

    /**
     * Generate embedding for single text
     */
    async embedText(text) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            // Check cache first
            const cacheKey = this.generateCacheKey(text);
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            // Preprocess text
            const processedText = this.preprocessText(text);
            
            // Generate embedding
            const output = await this.pipeline(processedText, {
                pooling: 'mean',
                normalize: true
            });

            // Convert to array format
            const embedding = Array.from(output.data);
            
            // Cache the result
            this.cache.set(cacheKey, embedding);
            
            // Limit cache size
            if (this.cache.size > 1000) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }

            return embedding;
        } catch (error) {
            console.error('Failed to generate embedding:', error);
            throw error;
        }
    }

    /**
     * Generate embeddings for multiple texts
     */
    async embedBatch(texts) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            const embeddings = [];
            const uncachedTexts = [];
            const cacheMap = new Map();

            // Check cache and separate cached from uncached
            texts.forEach((text, index) => {
                const cacheKey = this.generateCacheKey(text);
                if (this.cache.has(cacheKey)) {
                    cacheMap.set(index, this.cache.get(cacheKey));
                } else {
                    uncachedTexts.push({ text: this.preprocessText(text), originalIndex: index });
                }
            });

            // Process uncached texts in batches
            if (uncachedTexts.length > 0) {
                for (let i = 0; i < uncachedTexts.length; i += this.config.batchSize) {
                    const batch = uncachedTexts.slice(i, i + this.config.batchSize);
                    
                    // Process batch
                    const batchTexts = batch.map(item => item.text);
                    const output = await this.pipeline(batchTexts, {
                        pooling: 'mean',
                        normalize: true
                    });

                    // Store results
                    batch.forEach((item, batchIndex) => {
                        const embedding = Array.from(output.data.slice(
                            batchIndex * 384, 
                            (batchIndex + 1) * 384
                        ));
                        
                        cacheMap.set(item.originalIndex, embedding);
                        this.cache.set(this.generateCacheKey(texts[item.originalIndex]), embedding);
                    });
                }
            }

            // Reconstruct results in original order
            texts.forEach((_, index) => {
                embeddings.push(cacheMap.get(index));
            });

            return embeddings;
        } catch (error) {
            console.error('Failed to generate batch embeddings:', error);
            throw error;
        }
    }

    /**
     * Chunk large text into smaller segments
     */
    chunkText(text, chunkSize = this.config.maxSequenceLength, overlap = 50) {
        const chunks = [];
        const words = text.split(/\s+/);
        
        for (let i = 0; i < words.length; i += (chunkSize - overlap)) {
            const chunk = words.slice(i, i + chunkSize).join(' ');
            if (chunk.trim().length > 0) {
                chunks.push(chunk.trim());
            }
        }
        
        return chunks;
    }

    /**
     * Generate embedding for large document by chunking
     */
    async embedDocument(text, chunkSize = 400) {
        try {
            const chunks = this.chunkText(text, chunkSize);
            
            if (chunks.length === 1) {
                return await this.embedText(chunks[0]);
            }

            // Generate embeddings for all chunks
            const chunkEmbeddings = await this.embedBatch(chunks);
            
            // Average the embeddings to get document embedding
            const docEmbedding = new Array(384).fill(0);
            
            chunkEmbeddings.forEach(embedding => {
                embedding.forEach((value, index) => {
                    docEmbedding[index] += value;
                });
            });
            
            // Normalize
            const magnitude = Math.sqrt(docEmbedding.reduce((sum, val) => sum + val * val, 0));
            if (magnitude > 0) {
                docEmbedding.forEach((_, index) => {
                    docEmbedding[index] /= magnitude;
                });
            }
            
            return docEmbedding;
        } catch (error) {
            console.error('Failed to embed document:', error);
            throw error;
        }
    }

    /**
     * Calculate cosine similarity between two embeddings
     */
    calculateSimilarity(embedding1, embedding2) {
        try {
            const dotProduct = embedding1.reduce((sum, val, i) => sum + val * embedding2[i], 0);
            const magnitude1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
            const magnitude2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));
            
            if (magnitude1 === 0 || magnitude2 === 0) {
                return 0;
            }
            
            return dotProduct / (magnitude1 * magnitude2);
        } catch (error) {
            console.error('Failed to calculate similarity:', error);
            return 0;
        }
    }

    /**
     * Find most similar texts from a set of embeddings
     */
    async findSimilar(queryText, candidateTexts, topK = 5) {
        try {
            // Generate query embedding
            const queryEmbedding = await this.embedText(queryText);
            
            // Generate candidate embeddings
            const candidateEmbeddings = await this.embedBatch(candidateTexts);
            
            // Calculate similarities
            const similarities = candidateEmbeddings.map((embedding, index) => ({
                text: candidateTexts[index],
                similarity: this.calculateSimilarity(queryEmbedding, embedding),
                index
            }));
            
            // Sort by similarity and return top K
            similarities.sort((a, b) => b.similarity - a.similarity);
            return similarities.slice(0, topK);
        } catch (error) {
            console.error('Failed to find similar texts:', error);
            throw error;
        }
    }

    /**
     * Preprocess text for embedding
     */
    preprocessText(text) {
        return text
            .replace(/\s+/g, ' ')  // Normalize whitespace
            .replace(/[^\w\s\u0980-\u09FF]/g, '')  // Keep Bengali characters and basic punctuation
            .trim()
            .substring(0, this.config.maxSequenceLength * 4); // Rough character limit
    }

    /**
     * Generate cache key for text
     */
    generateCacheKey(text) {
        return require('crypto').createHash('md5').update(text).digest('hex');
    }

    /**
     * Clear embedding cache
     */
    clearCache() {
        this.cache.clear();
        console.log('Embedding cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: 1000,
            utilization: Math.round((this.cache.size / 1000) * 100)
        };
    }

    /**
     * Check service health
     */
    async healthCheck() {
        try {
            if (!this.isInitialized) {
                return { status: 'not_initialized' };
            }

            // Test with a simple embedding
            const testEmbedding = await this.embedText('health check');
            
            return {
                status: 'healthy',
                model: this.config.model,
                embeddingDimension: testEmbedding.length,
                cacheStats: this.getCacheStats()
            };
        } catch (error) {
            return { 
                status: 'unhealthy', 
                error: error.message 
            };
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            this.clearCache();
            this.pipeline = null;
            this.isInitialized = false;
            console.log('Embedding service cleaned up');
        } catch (error) {
            console.error('Error cleaning up embedding service:', error);
        }
    }
}

module.exports = EmbeddingService;