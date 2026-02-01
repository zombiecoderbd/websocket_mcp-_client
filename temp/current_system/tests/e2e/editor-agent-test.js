#!/usr/bin/env node

/**
 * Editor Agent Test Suite
 * Demonstrates the complete functionality of the Editor Agent
 */

const { EditorAgent } = require('./editor-agent-complete.js');
const fs = require('fs').promises;
const path = require('path');

class EditorAgentTester {
    constructor() {
        this.agent = new EditorAgent();
        this.testWorkspace = './temp/test-workspace';
    }
    
    async setup() {
        // Create test workspace
        try {
            await fs.mkdir(this.testWorkspace, { recursive: true });
            console.log('📁 Test workspace created:', this.testWorkspace);
        } catch (error) {
            console.log('ℹ️  Test workspace already exists');
        }
        
        // Set workspace in agent
        this.agent.editorState.workspace = path.resolve(this.testWorkspace);
    }
    
    async runAllTests() {
        console.log('🧪 Editor Agent Test Suite');
        console.log('==========================\n');
        
        await this.setup();
        
        const tests = [
            { name: 'File Creation Test', fn: () => this.testFileCreation() },
            { name: 'File Reading Test', fn: () => this.testFileReading() },
            { name: 'File Update Test', fn: () => this.testFileUpdate() },
            { name: 'File Insertion Test', fn: () => this.testFileInsertion() },
            { name: 'File Deletion Test', fn: () => this.testFileDeletion() },
            { name: 'File Copy Test', fn: () => this.testFileCopy() },
            { name: 'File Move Test', fn: () => this.testFileMove() },
            { name: 'Language Detection Test', fn: () => this.testLanguageDetection() },
            { name: 'MCP Message Test', fn: () => this.testMCPMessages() }
        ];
        
        let passed = 0;
        let failed = 0;
        
        for (const test of tests) {
            try {
                console.log(`\n📍 Running: ${test.name}`);
                await test.fn();
                console.log(`✅ PASSED: ${test.name}`);
                passed++;
            } catch (error) {
                console.log(`❌ FAILED: ${test.name}`);
                console.log(`   Error: ${error.message}`);
                failed++;
            }
        }
        
        console.log('\n📊 Test Results');
        console.log('===============');
        console.log(`Total Tests: ${tests.length}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
        
        return failed === 0;
    }
    
    async testFileCreation() {
        const testFile = path.join(this.testWorkspace, 'test-create.txt');
        const content = 'This is a test file created by Editor Agent';
        
        const result = await this.agent.createFile(testFile, content);
        
        // Verify file exists and has correct content
        const fileContent = await fs.readFile(testFile, 'utf8');
        if (fileContent !== content) {
            throw new Error('File content mismatch');
        }
        
        return result;
    }
    
    async testFileReading() {
        const testFile = path.join(this.testWorkspace, 'test-read.txt');
        const content = 'Content to read back';
        
        // Create test file first
        await fs.writeFile(testFile, content);
        
        const result = await this.agent.getFileContent(testFile);
        
        if (result.content !== content) {
            throw new Error('Read content does not match original');
        }
        
        if (result.language !== 'plaintext') {
            throw new Error('Language detection failed');
        }
        
        return result;
    }
    
    async testFileUpdate() {
        const testFile = path.join(this.testWorkspace, 'test-update.txt');
        const originalContent = 'Original content';
        const updatedContent = 'Updated content with more text';
        
        // Create initial file
        await fs.writeFile(testFile, originalContent);
        
        const result = await this.agent.saveFile(testFile, updatedContent);
        
        // Verify update
        const fileContent = await fs.readFile(testFile, 'utf8');
        if (fileContent !== updatedContent) {
            throw new Error('File update failed');
        }
        
        return result;
    }
    
    async testFileInsertion() {
        const testFile = path.join(this.testWorkspace, 'test-insert.txt');
        const originalContent = 'Line 1\nLine 2\nLine 3';
        const insertContent = '// Inserted comment\n';
        
        // Create test file
        await fs.writeFile(testFile, originalContent);
        
        // Insert at line 1, column 0
        const cursor = { line: 1, column: 0 };
        const result = await this.agent.insertAtCursor(testFile, insertContent, cursor);
        
        // Verify insertion
        const fileContent = await fs.readFile(testFile, 'utf8');
        const expectedContent = 'Line 1\n// Inserted comment\nLine 2\nLine 3';
        
        if (fileContent !== expectedContent) {
            throw new Error(`Insertion failed. Expected:\n${expectedContent}\nGot:\n${fileContent}`);
        }
        
        return result;
    }
    
    async testFileDeletion() {
        const testFile = path.join(this.testWorkspace, 'test-delete.txt');
        
        // Create file to delete
        await fs.writeFile(testFile, 'Delete me');
        
        const result = await this.agent.deleteFile(testFile);
        
        // Verify deletion
        try {
            await fs.access(testFile);
            throw new Error('File still exists after deletion');
        } catch (error) {
            // Expected - file should not exist
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        
        return result;
    }
    
    async testFileCopy() {
        const sourceFile = path.join(this.testWorkspace, 'source.txt');
        const destFile = path.join(this.testWorkspace, 'destination.txt');
        const content = 'Content to copy';
        
        // Create source file
        await fs.writeFile(sourceFile, content);
        
        const result = await this.agent.copyFile(sourceFile, destFile);
        
        // Verify copy
        const destContent = await fs.readFile(destFile, 'utf8');
        if (destContent !== content) {
            throw new Error('Copied content does not match source');
        }
        
        return result;
    }
    
    async testFileMove() {
        const sourceFile = path.join(this.testWorkspace, 'move-source.txt');
        const destFile = path.join(this.testWorkspace, 'move-dest.txt');
        const content = 'Content to move';
        
        // Create source file
        await fs.writeFile(sourceFile, content);
        
        const result = await this.agent.moveFile(sourceFile, destFile);
        
        // Verify move
        try {
            await fs.access(sourceFile);
            throw new Error('Source file still exists after move');
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        
        const destContent = await fs.readFile(destFile, 'utf8');
        if (destContent !== content) {
            throw new Error('Moved content does not match original');
        }
        
        return result;
    }
    
    async testLanguageDetection() {
        const testFiles = {
            'test.js': 'javascript',
            'test.ts': 'typescript',
            'test.py': 'python',
            'test.java': 'java',
            'test.go': 'go',
            'test.rs': 'rust',
            'test.cpp': 'cpp',
            'test.html': 'html',
            'test.css': 'css',
            'test.json': 'json'
        };
        
        for (const [filename, expectedLang] of Object.entries(testFiles)) {
            const detectedLang = this.agent.detectLanguage(filename);
            if (detectedLang !== expectedLang) {
                throw new Error(`Language detection failed for ${filename}: expected ${expectedLang}, got ${detectedLang}`);
            }
        }
        
        console.log('✅ All language detections passed');
        return true;
    }
    
    async testMCPMessages() {
        // Mock WebSocket connection for testing
        const mockWs = {
            readyState: 1, // OPEN
            send: (message) => {
                const parsed = JSON.parse(message);
                console.log(`📤 MCP Message Sent: ${parsed.type} (${parsed.id})`);
            }
        };
        
        this.agent.websocket = mockWs;
        
        // Test sending various MCP messages
        this.agent.sendMCPMessage('test_message', { data: 'test' });
        this.agent.sendMCPMessage('file_operation', { operation: 'create', path: 'test.txt' });
        
        // Test status message
        const status = this.agent.getStatus();
        console.log('📊 Agent Status:', JSON.stringify(status, null, 2));
        
        return true;
    }
    
    async cleanup() {
        try {
            // Clean up test workspace
            await fs.rm(this.testWorkspace, { recursive: true, force: true });
            console.log('🧹 Test workspace cleaned up');
        } catch (error) {
            console.log('⚠️  Cleanup warning:', error.message);
        }
    }
}

// Run tests
async function main() {
    const tester = new EditorAgentTester();
    
    try {
        const success = await tester.runAllTests();
        await tester.cleanup();
        
        if (success) {
            console.log('\n🎉 All tests completed successfully!');
            process.exit(0);
        } else {
            console.log('\n💥 Some tests failed.');
            process.exit(1);
        }
    } catch (error) {
        console.error('💥 Test suite failed:', error);
        await tester.cleanup();
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { EditorAgentTester };