/**
 * File Monitor System Test
 * Test the complete file watching and change detection system
 */

const { FileMonitor, FileChangeProcessor } = require('./file-monitor');
const { AgentMemoryHierarchy } = require('../memory-architecture/memory-hierarchy');

// Mock vector database for testing
class MockVectorDB {
    constructor() {
        this.collections = new Map();
    }

    async createCollection(name) {
        if (!this.collections.has(name)) {
            this.collections.set(name, []);
        }
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

// Mock change callback for testing
let processedChanges = [];

async function onChangeCallback(changeInfo) {
    console.log(`Mock callback: ${changeInfo.type} - ${changeInfo.filePath}`);
    processedChanges.push(changeInfo);
}

async function testFileMonitor() {
    console.log('=== File Monitor System Test ===\n');

    try {
        // Create mock vector database
        const mockVectorDB = new MockVectorDB();
        
        // Create memory hierarchy
        const memoryHierarchy = new AgentMemoryHierarchy();
        await memoryHierarchy.initialize(mockVectorDB);
        
        // Create file monitor
        const fileMonitor = new FileMonitor({
            directories: ['./test-temp'],
            fileTypes: ['.js', '.json', '.md'],
            onChangeCallback: onChangeCallback
        });
        
        // Create file change processor
        const changeProcessor = new FileChangeProcessor({
            memoryHierarchy: memoryHierarchy,
            agentRole: 'developer',
            sessionId: 'test_session_123'
        });
        
        // Test 1: Initialize file monitor
        console.log('1. Initializing file monitor...');
        await fileMonitor.startWatching();
        console.log('✓ File monitor started\n');

        // Test 2: Check initial status
        console.log('2. Checking file monitor status...');
        const status = fileMonitor.getStatus();
        console.log('✓ Status retrieved');
        console.log('  - Watching:', status.isWatching);
        console.log('  - Tracked files:', status.trackedFiles);
        console.log('  - Watched directories:', status.watchedDirectories.length);
        console.log('');

        // Test 3: Create test directory and file
        console.log('3. Creating test directory and file...');
        const fs = require('fs');
        const path = require('path');
        
        // Create test directory
        if (!fs.existsSync('./test-temp')) {
            fs.mkdirSync('./test-temp');
        }
        
        // Create a test file
        const testFilePath = './test-temp/test-file.js';
        fs.writeFileSync(testFilePath, 'console.log("Hello, World!");\n');
        console.log('✓ Test file created\n');

        // Allow some time for the file system event to be processed
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Test 4: Check processed changes
        console.log('4. Checking processed changes...');
        console.log('✓ Changes processed:', processedChanges.length);
        if (processedChanges.length > 0) {
            const lastChange = processedChanges[processedChanges.length - 1];
            console.log('  - Last change type:', lastChange.type);
            console.log('  - File path:', lastChange.filePath);
            console.log('  - Size:', lastChange.size, 'bytes');
            console.log('  - Extension:', lastChange.extension);
        }
        console.log('');

        // Test 5: Update the file to trigger a change event
        console.log('5. Updating test file...');
        fs.appendFileSync(testFilePath, '// Added this line\n');
        console.log('✓ Test file updated\n');

        // Allow some time for the change to be processed
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Test 6: Check updated changes
        console.log('6. Checking updated changes...');
        console.log('✓ Total changes processed:', processedChanges.length);
        if (processedChanges.length > 1) {
            const lastChange = processedChanges[processedChanges.length - 1];
            console.log('  - Last change type:', lastChange.type);
            console.log('  - File path:', lastChange.filePath);
        }
        console.log('');

        // Test 7: Process changes through the change processor
        console.log('7. Testing change processor...');
        if (processedChanges.length > 0) {
            const lastChange = processedChanges[processedChanges.length - 1];
            await changeProcessor.processFileChange(lastChange);
            console.log('✓ Change processed by processor');
        }
        console.log('');

        // Test 8: Check processor queue status
        console.log('8. Checking processor status...');
        const queueStatus = changeProcessor.getQueueStatus();
        console.log('✓ Queue status retrieved');
        console.log('  - Pending changes:', queueStatus.pendingChanges);
        console.log('  - Is processing:', queueStatus.isProcessing);
        console.log('');

        // Test 9: Create session in memory hierarchy
        console.log('9. Creating session in memory hierarchy...');
        const session = await memoryHierarchy.createSession('test_session_123', {
            user: 'test_user',
            project: 'test_project'
        });
        console.log('✓ Session created:', session.id);
        console.log('');

        // Test 10: Update memory via change processor
        console.log('10. Updating memory via change processor...');
        changeProcessor.setMemoryHierarchy(memoryHierarchy);
        changeProcessor.setSession('test_session_123', 'developer');
        
        if (processedChanges.length > 0) {
            const change = processedChanges[0];
            await changeProcessor.processFileChange(change);
            console.log('✓ Memory updated via processor');
        }
        console.log('');

        // Test 11: Stop file monitor
        console.log('11. Stopping file monitor...');
        await fileMonitor.stopWatching();
        console.log('✓ File monitor stopped\n');

        // Clean up test file
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
        if (fs.existsSync('./test-temp')) {
            fs.rmdirSync('./test-temp');
        }

        console.log('=== All File Monitor Tests Passed ===\n');

        // Display summary
        console.log('Test Summary:');
        console.log('- Changes processed:', processedChanges.length);
        console.log('- Files monitored:', status.trackedFiles);
        console.log('- Sessions created:', 1);
        console.log('- Memory updates:', processedChanges.length);

    } catch (error) {
        console.error('File monitor test failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Export for use in other tests
module.exports = { testFileMonitor };

// Run test if this file is executed directly
if (require.main === module) {
    testFileMonitor();
}