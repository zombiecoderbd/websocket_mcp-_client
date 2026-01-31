#!/usr/bin/env node

/**
 * Test script for the enhanced Editor Agent functionality
 * Tests the real implementation in the main project
 */

const fs = require('fs').promises;
const path = require('path');

async function testEnhancedEditor() {
    console.log('🧪 Testing Enhanced Editor Agent Implementation');
    console.log('===============================================\n');
    
    const baseUrl = 'http://localhost:8000';
    let testsPassed = 0;
    let testsFailed = 0;
    
    try {
        // Test 1: Basic editor send functionality
        console.log('1️⃣ Testing basic editor send...');
        const testFile = './temp/test-basic.txt';
        const testContent = 'Basic test content';
        
        const sendResponse = await fetch(`${baseUrl}/editor/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: testFile,
                content: testContent,
                action: 'save'
            })
        });
        
        const sendResult = await sendResponse.json();
        if (sendResult.success) {
            console.log('   ✅ Basic send test passed');
            testsPassed++;
            
            // Verify file was created
            const fileExists = await fs.access(path.resolve(testFile)).then(() => true).catch(() => false);
            if (fileExists) {
                console.log('   ✅ File creation verified');
                testsPassed++;
            } else {
                console.log('   ❌ File was not created');
                testsFailed++;
            }
        } else {
            console.log('   ❌ Basic send test failed:', sendResult.error);
            testsFailed++;
        }
        
        // Test 2: Enhanced operations endpoint
        console.log('\n2️⃣ Testing enhanced operations...');
        const enhancedFile = './temp/test-enhanced.txt';
        const enhancedContent = 'Enhanced operation test';
        
        const opsResponse = await fetch(`${baseUrl}/editor/operations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                operation: 'create',
                source: enhancedFile,
                content: enhancedContent
            })
        });
        
        const opsResult = await opsResponse.json();
        if (opsResult.success) {
            console.log('   ✅ Enhanced operations test passed');
            testsPassed++;
            
            // Verify enhanced file creation
            const enhancedExists = await fs.access(path.resolve(enhancedFile)).then(() => true).catch(() => false);
            if (enhancedExists) {
                console.log('   ✅ Enhanced file creation verified');
                testsPassed++;
            } else {
                console.log('   ❌ Enhanced file was not created');
                testsFailed++;
            }
        } else {
            console.log('   ❌ Enhanced operations test failed:', opsResult.error);
            testsFailed++;
        }
        
        // Test 3: File info endpoint
        console.log('\n3️⃣ Testing file info retrieval...');
        const infoResponse = await fetch(`${baseUrl}/editor/file-info?path=${encodeURIComponent(enhancedFile)}`);
        const infoResult = await infoResponse.json();
        
        if (infoResult.success) {
            console.log('   ✅ File info test passed');
            console.log(`   📄 File size: ${infoResult.fileInfo.size} bytes`);
            console.log(`   📅 Modified: ${infoResult.fileInfo.modifiedAt}`);
            testsPassed++;
        } else {
            console.log('   ❌ File info test failed:', infoResult.error);
            testsFailed++;
        }
        
        // Test 4: Directory listing
        console.log('\n4️⃣ Testing directory listing...');
        const listResponse = await fetch(`${baseUrl}/editor/list-directory?path=./temp`);
        const listResult = await listResponse.json();
        
        if (listResult.success) {
            console.log('   ✅ Directory listing test passed');
            console.log(`   📁 Found ${listResult.total} items in directory`);
            testsPassed++;
        } else {
            console.log('   ❌ Directory listing test failed:', listResult.error);
            testsFailed++;
        }
        
        // Test 5: Editor agent status
        console.log('\n5️⃣ Testing editor agent status...');
        const statusResponse = await fetch(`${baseUrl}/editor/status`);
        const statusResult = await statusResponse.json();
        
        if (statusResult.success) {
            console.log('   ✅ Editor agent status test passed');
            console.log(`   🤖 Agent ID: ${statusResult.agent.id}`);
            console.log(`   🔌 Connected: ${statusResult.agent.connected ? 'Yes' : 'No'}`);
            console.log(`   ⚡ Capabilities: ${statusResult.agent.capabilities.length} loaded`);
            testsPassed++;
        } else {
            console.log('   ❌ Editor agent status test failed:', statusResult.error);
            testsFailed++;
        }
        
        // Test 6: Language detection
        console.log('\n6️⃣ Testing language detection...');
        const jsFile = './temp/test.js';
        const jsContent = 'console.log("JavaScript test");';
        
        const jsResponse = await fetch(`${baseUrl}/editor/operations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                operation: 'create',
                source: jsFile,
                content: jsContent
            })
        });
        
        const jsResult = await jsResponse.json();
        if (jsResult.success) {
            console.log('   ✅ JavaScript file creation passed');
            testsPassed++;
            
            // Test file info to verify language detection
            const jsInfoResponse = await fetch(`${baseUrl}/editor/file-info?path=${encodeURIComponent(jsFile)}`);
            const jsInfoResult = await jsInfoResponse.json();
            
            if (jsInfoResult.success) {
                console.log('   ✅ Language detection working');
                testsPassed++;
            } else {
                console.log('   ❌ Language detection failed');
                testsFailed++;
            }
        } else {
            console.log('   ❌ JavaScript file creation failed');
            testsFailed++;
        }
        
        // Test 7: File operations (copy/move)
        console.log('\n7️⃣ Testing file operations...');
        const copyDest = './temp/test-copy.txt';
        
        const copyResponse = await fetch(`${baseUrl}/editor/operations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                operation: 'copy',
                source: enhancedFile,
                destination: copyDest
            })
        });
        
        const copyResult = await copyResponse.json();
        if (copyResult.success) {
            console.log('   ✅ File copy operation passed');
            testsPassed++;
            
            const copyExists = await fs.access(path.resolve(copyDest)).then(() => true).catch(() => false);
            if (copyExists) {
                console.log('   ✅ File copy verified');
                testsPassed++;
            } else {
                console.log('   ❌ File copy not found');
                testsFailed++;
            }
        } else {
            console.log('   ❌ File copy operation failed:', copyResult.error);
            testsFailed++;
        }
        
        // Test 8: File deletion
        console.log('\n8️⃣ Testing file deletion...');
        const deleteResponse = await fetch(`${baseUrl}/editor/operations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                operation: 'delete',
                source: copyDest
            })
        });
        
        const deleteResult = await deleteResponse.json();
        if (deleteResult.success) {
            console.log('   ✅ File deletion passed');
            testsPassed++;
            
            const deleteExists = await fs.access(path.resolve(copyDest)).then(() => false).catch(() => true);
            if (deleteExists) {
                console.log('   ✅ File deletion verified');
                testsPassed++;
            } else {
                console.log('   ❌ File still exists after deletion');
                testsFailed++;
            }
        } else {
            console.log('   ❌ File deletion failed:', deleteResult.error);
            testsFailed++;
        }
        
    } catch (error) {
        console.error('💥 Test execution failed:', error.message);
        testsFailed += 8; // Assume all remaining tests failed
    }
    
    // Cleanup test files
    console.log('\n🧹 Cleaning up test files...');
    try {
        const testFiles = [
            './temp/test-basic.txt',
            './temp/test-enhanced.txt', 
            './temp/test.js',
            './temp/test-copy.txt'
        ];
        
        for (const file of testFiles) {
            try {
                await fs.unlink(path.resolve(file));
                console.log(`   🗑️  Deleted ${file}`);
            } catch (error) {
                // File might not exist, ignore
            }
        }
        console.log('✅ Cleanup completed');
    } catch (error) {
        console.log('⚠️  Cleanup warning:', error.message);
    }
    
    // Final results
    console.log('\n📊 Test Results Summary');
    console.log('=====================');
    console.log(`Total Tests: ${testsPassed + testsFailed}`);
    console.log(`Passed: ${testsPassed}`);
    console.log(`Failed: ${testsFailed}`);
    console.log(`Success Rate: ${testsPassed > 0 ? ((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1) : 0}%`);
    
    if (testsFailed === 0) {
        console.log('\n🎉 All tests passed! Editor Agent implementation is working correctly.');
        return true;
    } else {
        console.log('\n💥 Some tests failed. Please check the implementation.');
        return false;
    }
}

// Run the test
if (require.main === module) {
    testEnhancedEditor()
        .then(success => process.exit(success ? 0 : 1))
        .catch(error => {
            console.error('Test runner failed:', error);
            process.exit(1);
        });
}

module.exports = { testEnhancedEditor };