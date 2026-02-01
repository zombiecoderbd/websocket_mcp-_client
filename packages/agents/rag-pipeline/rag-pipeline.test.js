/**
 * RAG Pipeline Test
 * Test the complete RAG pipeline with mock memory API
 */

const RAGPipeline = require('./rag-pipeline');
const { MockMemoryManagementAPI } = require('../../../server/src/services/memory/mock-memory-api.test');

async function testRAGPipeline() {
    // Create mock memory API with test data
    const memoryAPI = new MockMemoryManagementAPI();
    
    // Create RAG pipeline
    const ragPipeline = new RAGPipeline({
        llm: {
            model: 'qwen2.5:1.5b',
            host: 'http://localhost:11434'
        },
        rag: {
            contextLimit: 3,
            similarityThreshold: 0.5
        }
    });

    try {
        console.log('=== RAG Pipeline Test ===\n');

        // Test 1: Initialize services
        console.log('1. Initializing services...');
        await memoryAPI.initialize();
        console.log('✓ Memory API initialized');
        
        // Add test data to memory
        await memoryAPI.insertDocument(
            'JavaScript is a versatile programming language used for web development. It runs in browsers and can also be used for server-side development with Node.js.',
            { type: 'programming', category: 'web', language: 'javascript' },
            'user_knowledge'
        );
        
        await memoryAPI.insertDocument(
            'React is a popular JavaScript library for building user interfaces. It uses a component-based architecture and virtual DOM for efficient rendering.',
            { type: 'framework', category: 'frontend', language: 'javascript' },
            'code_patterns'
        );
        
        await memoryAPI.insertDocument(
            'To debug JavaScript code, use console.log() statements, browser developer tools, and consider using a debugger statement for breakpoints.',
            { type: 'debugging', category: 'development', language: 'javascript' },
            'user_knowledge'
        );
        
        console.log('✓ Test data inserted into memory\n');

        // Test 2: Initialize RAG pipeline
        console.log('2. Initializing RAG pipeline...');
        await ragPipeline.initialize(memoryAPI);
        console.log('✓ RAG pipeline initialized\n');

        // Test 3: Process coding query
        console.log('3. Processing coding query: "How to debug JavaScript code?"');
        const codingResult = await ragPipeline.processQuery(
            'How to debug JavaScript code?',
            { temperature: 0.7 }
        );
        
        console.log('✓ Query processed successfully');
        console.log('  Context documents found:', codingResult.context.documents.length);
        console.log('  Response length:', codingResult.response.content.length, 'characters');
        console.log('  Processing time:', codingResult.metadata.processingTime, 'ms\n');

        // Test 4: Process explanation query
        console.log('4. Processing explanation query: "What is React library?"');
        const explanationResult = await ragPipeline.processQuery(
            'What is React library?',
            { temperature: 0.8 }
        );
        
        console.log('✓ Query processed successfully');
        console.log('  Context documents found:', explanationResult.context.documents.length);
        console.log('  Response length:', explanationResult.response.content.length, 'characters\n');

        // Test 5: Process general query
        console.log('5. Processing general query: "Tell me about JavaScript"');
        const generalResult = await ragPipeline.processQuery(
            'Tell me about JavaScript',
            { temperature: 0.6 }
        );
        
        console.log('✓ Query processed successfully');
        console.log('  Context documents found:', generalResult.context.documents.length);
        console.log('  Response length:', generalResult.response.content.length, 'characters\n');

        // Test 6: Get pipeline statistics
        console.log('6. Getting pipeline statistics...');
        const stats = await ragPipeline.getStats();
        console.log('✓ Pipeline stats retrieved');
        console.log('  Initialized:', stats.initialized);
        console.log('  LLM Model:', stats.llm.model);
        console.log('  Context Limit:', stats.rag.contextLimit);
        console.log('  Components ready:', Object.values(stats.components).every(Boolean), '\n');

        // Test 7: Health check
        console.log('7. Performing health check...');
        const health = await ragPipeline.healthCheck();
        console.log('✓ Health check completed');
        console.log('  Status:', health.status);
        console.log('  LLM Healthy:', health.llm);
        console.log('  Components Healthy:', health.components, '\n');

        console.log('=== All RAG pipeline tests completed successfully ===\n');

        // Display sample responses
        console.log('Sample Responses:');
        console.log('\n--- Coding Query Response ---');
        console.log(codingResult.response.content.substring(0, 300) + '...');
        
        console.log('\n--- Explanation Query Response ---');
        console.log(explanationResult.response.content.substring(0, 300) + '...');
        
        console.log('\n--- General Query Response ---');
        console.log(generalResult.response.content.substring(0, 300) + '...');

    } catch (error) {
        console.error('RAG pipeline test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        // Cleanup
        await memoryAPI.shutdown();
        console.log('\n✓ All services shutdown complete');
    }
}

// Export for use in other tests
module.exports = { testRAGPipeline };

// Run test if this file is executed directly
if (require.main === module) {
    testRAGPipeline();
}