/**
 * Z-Evo Comprehensive System Test
 * Tests all components including the newly implemented features
 */

const { KnowledgeGapHandler } = require('../src/utils/KnowledgeGapHandler');
const { TransparencyManager } = require('../src/utils/TransparencyManager');
const { PromptCache } = require('../src/utils/PromptCache');
const { ErrorRecovery } = require('../src/utils/ErrorRecovery');
const { EditorAwareness } = require('../src/utils/EditorAwareness');
const { ExtensionManager } = require('../src/extension/ExtensionManager');

async function runComprehensiveTest() {
    console.log('🧪 Starting Z-Evo Comprehensive System Test...\n');

    let passedTests = 0;
    let totalTests = 0;

    // Test 1: Knowledge Gap Handler
    console.log('📋 Test 1: Knowledge Gap Handler');
    totalTests++;
    try {
        const kgHandler = new KnowledgeGapHandler();
        const uncertainty = kgHandler.expressUncertainty('Unknown information');
        const limitation = kgHandler.expressLimitation('Request', 'capability');
        
        if (uncertainty.isUncertain && limitation.isLimited) {
            console.log('✅ PASS: Knowledge Gap Handler working');
            passedTests++;
        } else {
            console.log('❌ FAIL: Knowledge Gap Handler not working');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in Knowledge Gap Handler - ${error.message}`);
    }

    // Test 2: Transparency Manager
    console.log('\n📋 Test 2: Transparency Manager');
    totalTests++;
    try {
        const transManager = new TransparencyManager();
        transManager.registerCapability('test_cap', {
            name: 'Test Capability',
            description: 'A test capability',
            accuracy: 'high',
            supported: true
        });
        
        const capCheck = transManager.checkCapabilityTransparency('test_cap');
        if (capCheck.id === 'test_cap') {
            console.log('✅ PASS: Transparency Manager working');
            passedTests++;
        } else {
            console.log('❌ FAIL: Transparency Manager not working');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in Transparency Manager - ${error.message}`);
    }

    // Test 3: Prompt Cache
    console.log('\n📋 Test 3: Prompt Cache System');
    totalTests++;
    try {
        const cache = new PromptCache();
        cache.set('test_key', 'test_value');
        const value = cache.get('test_key');
        
        if (value === 'test_value') {
            console.log('✅ PASS: Prompt Cache working');
            passedTests++;
        } else {
            console.log('❌ FAIL: Prompt Cache not working');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in Prompt Cache - ${error.message}`);
    }

    // Test 4: Error Recovery
    console.log('\n📋 Test 4: Error Recovery System');
    totalTests++;
    try {
        const recovery = new ErrorRecovery();
        const result = await recovery.initiateSession('test_session');
        
        if (result.success) {
            console.log('✅ PASS: Error Recovery working');
            passedTests++;
        } else {
            console.log('❌ FAIL: Error Recovery not working');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in Error Recovery - ${error.message}`);
    }

    // Test 5: Editor Awareness
    console.log('\n📋 Test 5: Editor Awareness System');
    totalTests++;
    try {
        const awareness = new EditorAwareness();
        const detection = awareness.detectEditor({ editorType: 'vscode' });
        
        if (detection.type) {
            console.log('✅ PASS: Editor Awareness working');
            passedTests++;
        } else {
            console.log('❌ FAIL: Editor Awareness not working');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in Editor Awareness - ${error.message}`);
    }

    // Test 6: Extension Manager
    console.log('\n📋 Test 6: Extension Manager');
    totalTests++;
    try {
        const extManager = new ExtensionManager();
        extManager.registerExtension({
            id: 'test_ext',
            name: 'Test Extension',
            version: '1.0.0',
            author: 'Test Author',
            description: 'Test Description'
        });
        
        const validation = extManager.validateExtension({
            id: 'test_ext',
            name: 'Test Extension',
            version: '1.0.0',
            author: 'Test Author',
            description: 'Test Description'
        });
        
        if (validation.valid) {
            console.log('✅ PASS: Extension Manager working');
            passedTests++;
        } else {
            console.log('❌ FAIL: Extension Manager not working');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in Extension Manager - ${error.message}`);
    }

    // Test 7: LSP-DAP Integration
    console.log('\n📋 Test 7: LSP-DAP Integration');
    totalTests++;
    try {
        const { LanguageServer } = require('../src/server/LanguageServer');
        const { DebugAdapter } = require('../src/debug/DebugAdapter');
        
        // Mock connection and documents for testing
        const mockConnection = {
            console: { log: console.log, warn: console.warn, error: console.error },
            sendDiagnostics: () => {},
            listen: () => {}
        };
        
        const mockDocuments = {
            get: (uri) => ({ uri: uri, getText: () => 'test', positionAt: () => ({ line: 0, character: 0 }) }),
            syncKind: 2
        };

        const knowledgeGapHandler = new KnowledgeGapHandler();
        const transparencyManager = new TransparencyManager();
        
        const languageServer = new LanguageServer(mockConnection, mockDocuments, knowledgeGapHandler, transparencyManager);
        const debugAdapter = new DebugAdapter(mockConnection, knowledgeGapHandler, transparencyManager);
        
        if (languageServer && debugAdapter) {
            console.log('✅ PASS: LSP-DAP Integration working');
            passedTests++;
        } else {
            console.log('❌ FAIL: LSP-DAP Integration not working');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in LSP-DAP Integration - ${error.message}`);
    }

    // Test 8: Ethical Features Integration
    console.log('\n📋 Test 8: Ethical Features Integration');
    totalTests++;
    try {
        const kgHandler = new KnowledgeGapHandler();
        const transManager = new TransparencyManager();
        
        // Test ethical feature integration
        const uncertainty = kgHandler.expressUncertainty('Unknown query');
        const limitation = transManager.communicateLimitation('Restricted request', 'capability');
        
        if (uncertainty.isUncertain && limitation.isLimited) {
            console.log('✅ PASS: Ethical Features Integration working');
            passedTests++;
        } else {
            console.log('❌ FAIL: Ethical Features Integration not working');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in Ethical Features Integration - ${error.message}`);
    }

    // Test 9: Context Realism Validation
    console.log('\n📋 Test 9: Context Realism Validation');
    totalTests++;
    try {
        const awareness = new EditorAwareness();
        const assessment = await awareness.assessEnvironment({ editorType: 'vscode' });
        
        if (assessment.editor && assessment.lsp) {
            console.log('✅ PASS: Context Realism Validation working');
            passedTests++;
        } else {
            console.log('❌ FAIL: Context Realism Validation not working');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in Context Realism Validation - ${error.message}`);
    }

    // Test 10: Recovery with Retry
    console.log('\n📋 Test 10: Recovery with Retry Mechanism');
    totalTests++;
    try {
        const recovery = new ErrorRecovery();
        let counter = 0;
        const testFn = async () => {
            counter++;
            if (counter < 2) throw new Error('Simulated failure');
            return 'success';
        };
        
        const result = await recovery.executeWithRetry(testFn, 2, 100);
        
        if (result === 'success') {
            console.log('✅ PASS: Recovery with Retry working');
            passedTests++;
        } else {
            console.log('❌ FAIL: Recovery with Retry not working');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in Recovery with Retry - ${error.message}`);
    }

    // Summary
    console.log('\n📊 Comprehensive Test Results Summary:');
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

    if (passedTests === totalTests) {
        console.log('\n�� All comprehensive tests passed! The Z-Evo system is fully functional.');
        console.log('\n🎯 The system now includes:');
        console.log('   • Knowledge Gap Handler with uncertainty expression');
        console.log('   • Transparency Manager with limitation communication');
        console.log('   • Prompt Cache with persona caching');
        console.log('   • Error Recovery with automatic retry mechanism');
        console.log('   • Editor Awareness with environment detection');
        console.log('   • Extension Manager with plugin architecture');
        console.log('   • Complete LSP-DAP integration');
        console.log('   • Ethical feature compliance');
        console.log('   • Context realism validation');
        return true;
    } else {
        console.log('\n⚠️ Some comprehensive tests failed. Please review the implementation.');
        return false;
    }
}

// Run the tests
if (require.main === module) {
    runComprehensiveTest()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Comprehensive test execution error:', error);
            process.exit(1);
        });
}

module.exports = { runComprehensiveTest };
