/**
 * Memory Management API Test
 */

const MemoryManagementAPI = require('./memory-api');

async function testMemoryAPI() {
    const memoryAPI = new MemoryManagementAPI({
        chromaConfig: {
            host: 'localhost',
            port: 8000
        }
    });

    try {
        console.log('=== Memory Management API Test ===\n');

        // Test 1: Initialize service
        console.log('1. Initializing Memory API...');
        await memoryAPI.initialize();
        console.log('✓ Memory API initialized successfully\n');

        // Test 2: Insert document
        console.log('2. Inserting test document...');
        const insertResult = await memoryAPI.insertDocument(
            'This is a test document about JavaScript development patterns',
            {
                type: 'test',
                category: 'development',
                language: 'javascript'
            },
            'user_knowledge'
        );
        console.log('✓ Document inserted:', insertResult.id, '\n');

        // Test 3: Retrieve context
        console.log('3. Retrieving context...');
        const contextResult = await memoryAPI.retrieveContext(
            'JavaScript development',
            3,
            'user_knowledge'
        );
        console.log('✓ Retrieved', contextResult.count, 'documents\n');

        // Test 4: Semantic search
        console.log('4. Performing semantic search...');
        const searchResult = await memoryAPI.semanticSearch(
            'test document',
            0.5,
            5
        );
        console.log('✓ Found', searchResult.count, 'similar documents\n');

        // Test 5: Get statistics
        console.log('5. Getting memory statistics...');
        const stats = await memoryAPI.getMemoryStats();
        console.log('✓ Memory stats retrieved');
        console.log('  ChromaDB status:', stats.chroma_db.status);
        console.log('  Embedding service status:', stats.embedding_service.status);
        console.log('  Total documents:', stats.chroma_db.totalDocuments, '\n');

        // Test 6: Health check
        console.log('6. Checking service health...');
        const isReady = await memoryAPI.isReady();
        console.log('✓ Service ready:', isReady, '\n');

        console.log('=== All tests completed successfully ===');

    } catch (error) {
        console.error('Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        // Cleanup
        await memoryAPI.shutdown();
        console.log('✓ Memory API shutdown complete');
    }
}

// Run test if this file is executed directly
if (require.main === module) {
    testMemoryAPI();
}

module.exports = { testMemoryAPI };