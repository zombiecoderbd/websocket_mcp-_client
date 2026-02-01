/**
 * Agent Memory Hierarchy Test
 * Test the complete memory architecture implementation
 */

const { AgentMemoryHierarchy } = require('./memory-hierarchy');

// Mock vector database for testing
class MockVectorDB {
    constructor() {
        this.collections = new Map();
    }

    async createCollection(name) {
        if (!this.collections.has(name)) {
            this.collections.set(name, []);
        }
        console.log(`Mock collection created: ${name}`);
        return { name, status: 'created' };
    }

    async insertDocument(collectionName, text, metadata = {}) {
        if (!this.collections.has(collectionName)) {
            await this.createCollection(collectionName);
        }

        const doc = {
            id: this.generateId(),
            text,
            metadata,
            timestamp: new Date().toISOString()
        };

        this.collections.get(collectionName).push(doc);
        console.log(`Document inserted into ${collectionName}: ${doc.id}`);
        return doc.id;
    }

    async retrieveContext(query, k = 5, collectionName) {
        if (!this.collections.has(collectionName)) {
            return { results: [], count: 0 };
        }

        const docs = this.collections.get(collectionName);
        const results = docs
            .filter(doc => doc.text.toLowerCase().includes(query.toLowerCase()))
            .slice(0, k)
            .map(doc => ({
                id: doc.id,
                document: doc.text,
                metadata: doc.metadata,
                similarity: 0.9 // Mock similarity
            }));

        return {
            query,
            results,
            count: results.length,
            collection: collectionName
        };
    }

    generateId() {
        return `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

async function testMemoryHierarchy() {
    console.log('=== Agent Memory Hierarchy Test ===\n');

    try {
        // Create mock vector database
        const mockVectorDB = new MockVectorDB();
        
        // Create memory hierarchy
        const memoryHierarchy = new AgentMemoryHierarchy();
        
        // Test 1: Initialize memory hierarchy
        console.log('1. Initializing memory hierarchy...');
        await memoryHierarchy.initialize(mockVectorDB);
        console.log('✓ Memory hierarchy initialized\n');

        // Test 2: Create a session
        console.log('2. Creating session...');
        const sessionId = 'session_123';
        const session = await memoryHierarchy.createSession(sessionId, {
            user: 'test_user',
            project: 'test_project'
        });
        console.log('✓ Session created:', session.id, '\n');

        // Test 3: Add learning to global knowledge
        console.log('3. Adding learning to global knowledge...');
        const learningId = await memoryHierarchy.addLearning(
            'JavaScript async/await is used for handling promises',
            { category: 'javascript', type: 'concept' }
        );
        console.log('✓ Learning added:', learningId, '\n');

        // Test 4: Add best practice
        console.log('4. Adding best practice...');
        const practiceId = await memoryHierarchy.addBestPractice(
            'Always use try/catch blocks when using async/await',
            'error_handling'
        );
        console.log('✓ Best practice added:', practiceId, '\n');

        // Test 5: Set role preference
        console.log('5. Setting role preference...');
        await memoryHierarchy.setRolePreference('developer', 'preferred_language', 'javascript');
        console.log('✓ Role preference set\n');

        // Test 6: Update session memory
        console.log('6. Updating session memory...');
        await memoryHierarchy.updateMemory('developer', sessionId, {
            content: 'Working on React component for user authentication',
            metadata: { type: 'task', priority: 'high' }
        });
        console.log('✓ Session memory updated\n');

        // Test 7: Get combined context
        console.log('7. Getting combined context...');
        const context = await memoryHierarchy.getContext(
            'developer',
            sessionId,
            'javascript async'
        );
        console.log('✓ Combined context retrieved');
        console.log('  - Session results:', context.session.results.length);
        console.log('  - Role results:', context.role.results.length);
        console.log('  - Global results:', context.global.length);
        console.log('');

        // Test 8: Create context snapshot
        console.log('8. Creating context snapshot...');
        const snapshot = await memoryHierarchy.createSnapshot(sessionId, 'developer');
        console.log('✓ Context snapshot created:', snapshot.id);
        console.log('');

        // Test 9: Check system status
        console.log('9. Checking system status...');
        const status = memoryHierarchy.getStatus();
        console.log('✓ System status retrieved');
        console.log('  - Initialized:', status.initialized);
        console.log('  - Components ready:', Object.values(status.components).every(Boolean));
        console.log('');

        console.log('=== All Memory Hierarchy Tests Passed ===\n');

        // Display some results
        console.log('Sample Results:');
        console.log('- Learning ID:', learningId);
        console.log('- Practice ID:', practiceId);
        console.log('- Session ID:', sessionId);
        console.log('- Snapshot ID:', snapshot.id);
        console.log('- Context results count:', context.combined.metadata.totalContextItems);

    } catch (error) {
        console.error('Memory hierarchy test failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Export for use in other tests
module.exports = { testMemoryHierarchy };

// Run test if this file is executed directly
if (require.main === module) {
    testMemoryHierarchy();
}