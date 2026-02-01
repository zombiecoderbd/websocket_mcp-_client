/**
 * Retrieval Augmented Generation (RAG) Pipeline
 * Advanced AI Agent Architecture - RAG Framework
 * 
 * This service implements the complete RAG pipeline including:
 * 1. Query Processing and Understanding
 * 2. Context Retrieval from Vector Database
 * 3. Response Generation with LLM Integration
 */

const { Ollama } = require('ollama');

class RAGPipeline {
    constructor(config = {}) {
        this.config = {
            // LLM Configuration
            llm: {
                model: config.llm?.model || 'qwen2.5:1.5b',
                host: config.llm?.host || 'http://localhost:11434',
                timeout: config.llm?.timeout || 30000
            },
            
            // RAG Configuration
            rag: {
                contextLimit: config.rag?.contextLimit || 3,
                similarityThreshold: config.rag?.similarityThreshold || 0.7,
                maxTokens: config.rag?.maxTokens || 2000
            },
            
            // Memory API (to be injected)
            memoryAPI: config.memoryAPI || null
        };

        // Initialize Ollama client
        this.ollama = new Ollama({ host: this.config.llm.host });
        
        // Query processing components
        this.queryProcessor = new QueryProcessor();
        this.contextRetriever = new ContextRetriever(this.config.rag);
        this.responseGenerator = new ResponseGenerator(this.ollama, this.config.llm);
        
        this.isInitialized = false;
    }

    /**
     * Initialize RAG pipeline
     */
    async initialize(memoryAPI) {
        try {
            console.log('Initializing RAG Pipeline...');
            
            // Set memory API if provided
            if (memoryAPI) {
                this.config.memoryAPI = memoryAPI;
                this.contextRetriever.setMemoryAPI(memoryAPI);
            }
            
            // Test LLM connection
            await this.testLLMConnection();
            
            this.isInitialized = true;
            console.log('RAG Pipeline initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize RAG Pipeline:', error);
            throw new Error(`RAG Pipeline initialization failed: ${error.message}`);
        }
    }

    /**
     * Process query through complete RAG pipeline
     */
    async processQuery(query, options = {}) {
        try {
            if (!this.isInitialized) {
                throw new Error('RAG Pipeline not initialized');
            }

            const startTime = Date.now();
            
            // Step 1: Query Processing
            console.log('Step 1: Processing query...');
            const processedQuery = await this.queryProcessor.process(query, options);
            
            // Step 2: Context Retrieval
            console.log('Step 2: Retrieving context...');
            const context = await this.contextRetriever.retrieve(
                processedQuery.processedQuery,
                processedQuery.metadata
            );
            
            // Step 3: Response Generation
            console.log('Step 3: Generating response...');
            const response = await this.responseGenerator.generate(
                processedQuery.originalQuery,
                context,
                processedQuery.metadata
            );
            
            const processingTime = Date.now() - startTime;
            
            return {
                query: processedQuery.originalQuery,
                processedQuery: processedQuery.processedQuery,
                context: context,
                response: response,
                metadata: {
                    ...processedQuery.metadata,
                    processingTime: processingTime,
                    contextCount: context.documents.length,
                    modelUsed: this.config.llm.model
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('RAG pipeline processing failed:', error);
            throw error;
        }
    }

    /**
     * Test LLM connection
     */
    async testLLMConnection() {
        try {
            const response = await this.ollama.generate({
                model: this.config.llm.model,
                prompt: 'Hello, are you working?',
                stream: false
            });
            
            if (!response.response) {
                throw new Error('LLM returned empty response');
            }
            
            console.log('LLM connection test successful');
            return true;
        } catch (error) {
            console.error('LLM connection test failed:', error);
            throw new Error(`LLM connection failed: ${error.message}`);
        }
    }

    /**
     * Get pipeline statistics
     */
    async getStats() {
        return {
            initialized: this.isInitialized,
            llm: {
                model: this.config.llm.model,
                host: this.config.llm.host
            },
            rag: this.config.rag,
            components: {
                queryProcessor: this.queryProcessor.isReady(),
                contextRetriever: this.contextRetriever.isReady(),
                responseGenerator: this.responseGenerator.isReady()
            }
        };
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            if (!this.isInitialized) {
                return { status: 'not_initialized' };
            }

            // Test each component
            const llmHealthy = await this.testLLMConnection().catch(() => false);
            const componentsHealthy = [
                this.queryProcessor.isReady(),
                this.contextRetriever.isReady(),
                this.responseGenerator.isReady()
            ].every(Boolean);

            return {
                status: llmHealthy && componentsHealthy ? 'healthy' : 'degraded',
                llm: llmHealthy,
                components: componentsHealthy,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }
}

/**
 * Query Processing Component
 * Handles query understanding, intent classification, and preprocessing
 */
class QueryProcessor {
    constructor() {
        this.intentClassifiers = {
            'code_help': ['code', 'program', 'function', 'debug', 'fix', 'implement'],
            'knowledge': ['what', 'how', 'explain', 'describe', 'define'],
            'task': ['create', 'build', 'develop', 'make', 'generate'],
            'analysis': ['analyze', 'review', 'check', 'validate', 'test']
        };
    }

    async process(query, options = {}) {
        // Clean and normalize query
        const cleanedQuery = this.cleanQuery(query);
        
        // Classify intent
        const intent = this.classifyIntent(cleanedQuery);
        
        // Extract entities and keywords
        const entities = this.extractEntities(cleanedQuery);
        
        // Determine query type and required context
        const queryType = this.determineQueryType(cleanedQuery, intent);
        
        return {
            originalQuery: query,
            processedQuery: cleanedQuery,
            intent: intent,
            entities: entities,
            type: queryType,
            metadata: {
                ...options,
                processedAt: new Date().toISOString()
            }
        };
    }

    cleanQuery(query) {
        return query
            .trim()
            .replace(/[^\w\s\u0980-\u09FF.!?]/g, ' ')
            .replace(/\s+/g, ' ')
            .toLowerCase();
    }

    classifyIntent(query) {
        const queryWords = query.toLowerCase().split(/\s+/);
        const intentScores = {};

        for (const [intent, keywords] of Object.entries(this.intentClassifiers)) {
            intentScores[intent] = queryWords.filter(word => 
                keywords.includes(word)
            ).length;
        }

        const bestIntent = Object.entries(intentScores)
            .sort(([,a], [,b]) => b - a)[0];

        return bestIntent && bestIntent[1] > 0 ? bestIntent[0] : 'general';
    }

    extractEntities(query) {
        const entities = [];
        
        // Extract programming languages
        const languages = ['javascript', 'python', 'java', 'cpp', 'typescript', 'react', 'node'];
        const foundLanguages = languages.filter(lang => 
            query.toLowerCase().includes(lang)
        );
        
        if (foundLanguages.length > 0) {
            entities.push({
                type: 'language',
                values: foundLanguages
            });
        }
        
        // Extract file types/extensions
        const filePattern = /\b\w+\.\w+\b/g;
        const files = query.match(filePattern) || [];
        if (files.length > 0) {
            entities.push({
                type: 'files',
                values: files
            });
        }
        
        return entities;
    }

    determineQueryType(query, intent) {
        if (intent === 'code_help' || query.includes('code')) {
            return 'coding';
        } else if (intent === 'knowledge' && query.includes('explain')) {
            return 'explanation';
        } else if (intent === 'task') {
            return 'task_execution';
        } else if (intent === 'analysis') {
            return 'analysis';
        }
        return 'general';
    }

    isReady() {
        return true; // Simple processor is always ready
    }
}

/**
 * Context Retrieval Component
 * Retrieves relevant context from memory using semantic search
 */
class ContextRetriever {
    constructor(config) {
        this.config = config;
        this.memoryAPI = null;
    }

    setMemoryAPI(memoryAPI) {
        this.memoryAPI = memoryAPI;
    }

    async retrieve(query, metadata = {}) {
        try {
            if (!this.memoryAPI) {
                throw new Error('Memory API not configured');
            }

            // Determine which collections to search based on query type
            const collections = this.determineCollections(metadata.type);
            
            // Perform semantic search
            const searchResults = await this.memoryAPI.semanticSearch(
                query,
                this.config.similarityThreshold,
                this.config.contextLimit,
                collections
            );
            
            // Format context for LLM
            const formattedContext = this.formatContext(searchResults.results);
            
            return {
                documents: searchResults.results,
                formattedContext: formattedContext,
                metadata: {
                    query: query,
                    collections: collections,
                    threshold: this.config.similarityThreshold,
                    retrievedAt: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('Context retrieval failed:', error);
            return {
                documents: [],
                formattedContext: '',
                metadata: { error: error.message }
            };
        }
    }

    determineCollections(queryType) {
        switch (queryType) {
            case 'coding':
                return ['code_patterns', 'user_knowledge'];
            case 'explanation':
                return ['user_knowledge', 'project_context'];
            case 'task_execution':
                return ['code_patterns', 'project_context'];
            case 'analysis':
                return ['user_knowledge', 'project_context'];
            default:
                return ['user_knowledge', 'code_patterns', 'project_context'];
        }
    }

    formatContext(documents) {
        if (documents.length === 0) {
            return 'No relevant context found.';
        }

        const contextParts = documents.map((doc, index) => {
            const source = doc.metadata?.source || 'unknown';
            const type = doc.metadata?.type || 'document';
            return `[Context ${index + 1} - ${type} from ${source}]:\n${doc.document}`;
        });

        return contextParts.join('\n\n');
    }

    isReady() {
        return this.memoryAPI !== null;
    }
}

/**
 * Response Generation Component
 * Generates final response using LLM with retrieved context
 */
class ResponseGenerator {
    constructor(ollama, llmConfig) {
        this.ollama = ollama;
        this.llmConfig = llmConfig;
    }

    async generate(originalQuery, context, metadata = {}) {
        try {
            // Construct prompt with context
            const prompt = this.constructPrompt(originalQuery, context, metadata);
            
            // Generate response
            const response = await this.ollama.generate({
                model: this.llmConfig.model,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: metadata.temperature || 0.7,
                    top_p: 0.9,
                    max_tokens: this.llmConfig.maxTokens
                }
            });
            
            return {
                content: response.response,
                metadata: {
                    model: this.llmConfig.model,
                    promptTokens: prompt.length,
                    generatedAt: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('Response generation failed:', error);
            throw error;
        }
    }

    constructPrompt(query, context, metadata) {
        const contextText = context.formattedContext;
        const queryType = metadata.type || 'general';
        
        let systemPrompt = '';
        
        switch (queryType) {
            case 'coding':
                systemPrompt = `You are a helpful coding assistant. Provide clear, accurate code examples and explanations.`;
                break;
            case 'explanation':
                systemPrompt = `You are an expert explainer. Provide detailed, easy-to-understand explanations.`;
                break;
            case 'task_execution':
                systemPrompt = `You are a task execution assistant. Provide step-by-step guidance.`;
                break;
            case 'analysis':
                systemPrompt = `You are an analytical assistant. Provide thorough analysis and insights.`;
                break;
            default:
                systemPrompt = `You are a helpful AI assistant. Provide accurate and helpful responses.`;
        }
        
        return `${systemPrompt}

Relevant Context:
${contextText}

Original Query: ${query}

Please provide a helpful response based on the context and query:`;
    }

    isReady() {
        return this.ollama !== null;
    }
}

module.exports = RAGPipeline;