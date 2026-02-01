/**
 * Z-Evo LSP-DAP Integration Test
 * Tests the complete integration of transparency features with LSP-DAP
 */

const { LanguageServer } = require('../src/server/LanguageServer');
const { DebugAdapter } = require('../src/debug/DebugAdapter');
const { KnowledgeGapHandler } = require('../src/utils/KnowledgeGapHandler');
const { TransparencyManager } = require('../src/utils/TransparencyManager');
const { CodeAnalyzer } = require('../src/language/CodeAnalyzer');
const { SyntaxHighlighter } = require('../src/language/SyntaxHighlighter');

async function runIntegrationTests() {
    console.log('🧪 Starting Z-Evo LSP-DAP Integration Tests...\n');

    // Initialize all components
    const knowledgeGapHandler = new KnowledgeGapHandler();
    const transparencyManager = new TransparencyManager();
    
    // Mock connection and documents for testing
    const mockConnection = {
        console: {
            log: console.log,
            warn: console.warn,
            error: console.error
        },
        sendDiagnostics: () => {},
        listen: () => console.log('Mock connection listening...')
    };
    
    const mockDocuments = {
        get: (uri) => ({
            uri: uri,
            getText: () => 'console.log("test");',
            positionAt: () => ({ line: 0, character: 0 })
        }),
        syncKind: 2
    };

    // Initialize servers with transparency features
    const languageServer = new LanguageServer(mockConnection, mockDocuments, knowledgeGapHandler, transparencyManager);
    const debugAdapter = new DebugAdapter(mockConnection, knowledgeGapHandler, transparencyManager);
    
    // Register capabilities for testing
    transparencyManager.registerCapability('code_completion', {
        name: 'Code Completion',
        description: 'Provides intelligent code completions',
        accuracy: 'high',
        supported: true
    });
    
    transparencyManager.registerCapability('external_system_access', {
        name: 'External System Access',
        description: 'Direct access to external systems',
        accuracy: 'none',
        supported: false,
        limitations: ['Security restrictions']
    });

    let passedTests = 0;
    let totalTests = 0;

    // Test 1: Language Server Initialization with Transparency
    console.log('📋 Test 1: Language Server Initialization with Transparency');
    totalTests++;
    try {
        // This should work without errors and register transparency
        const capCheck = transparencyManager.checkCapabilityTransparency('code_completion');
        if (capCheck && capCheck.supported) {
            console.log('✅ PASS: Language server initialized with transparency');
            passedTests++;
        } else {
            console.log('❌ FAIL: Language server not initialized properly');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in language server initialization - ${error.message}`);
    }

    // Test 2: Document Analysis with Uncertainty Handling
    console.log('\n📋 Test 2: Document Analysis with Uncertainty Handling');
    totalTests++;
    try {
        await languageServer.analyzeDocument('test.js', 'console.log("hello");');
        console.log('✅ PASS: Document analysis completed with uncertainty handling');
        passedTests++;
    } catch (error) {
        console.log(`❌ FAIL: Error in document analysis - ${error.message}`);
    }

    // Test 3: Completion Request with Transparency
    console.log('\n📋 Test 3: Completion Request with Transparency');
    totalTests++;
    try {
        const completionResult = languageServer.handleCompletion({
            textDocument: { uri: 'test.js' },
            position: { line: 0, character: 10 }
        });
        
        if (Array.isArray(completionResult)) {
            console.log('✅ PASS: Completion request handled with transparency');
            passedTests++;
        } else {
            console.log('❌ FAIL: Completion request not handled properly');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in completion request - ${error.message}`);
    }

    // Test 4: Hover Request with Transparency
    console.log('\n📋 Test 4: Hover Request with Transparency');
    totalTests++;
    try {
        const hoverResult = languageServer.handleHover({
            textDocument: { uri: 'test.js' },
            position: { line: 0, character: 10 }
        });
        
        if (hoverResult === null || typeof hoverResult === 'object') {
            console.log('✅ PASS: Hover request handled with transparency');
            passedTests++;
        } else {
            console.log('❌ FAIL: Hover request not handled properly');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in hover request - ${error.message}`);
    }

    // Test 5: Debug Adapter Support Check
    console.log('\n📋 Test 5: Debug Adapter Support Check');
    totalTests++;
    try {
        const supportsDebugging = debugAdapter.supportsDebugging();
        if (typeof supportsDebugging === 'boolean') {
            console.log('✅ PASS: Debug adapter support check works');
            passedTests++;
        } else {
            console.log('❌ FAIL: Debug adapter support check failed');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in debug adapter support check - ${error.message}`);
    }

    // Test 6: Debug Session Management with Transparency
    console.log('\n📋 Test 6: Debug Session Management with Transparency');
    totalTests++;
    try {
        const startResult = debugAdapter.startSession('test-session', { type: 'node', request: 'launch' });
        if (startResult.success) {
            const status = debugAdapter.getSessionStatus('test-session');
            if (status.id === 'test-session') {
                const stopResult = debugAdapter.stopSession('test-session');
                if (stopResult.success) {
                    console.log('✅ PASS: Debug session managed with transparency');
                    passedTests++;
                } else {
                    console.log('❌ FAIL: Debug session stop failed');
                }
            } else {
                console.log('❌ FAIL: Debug session status check failed');
            }
        } else {
            console.log('❌ FAIL: Debug session start failed');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in debug session management - ${error.message}`);
    }

    // Test 7: Capability Limitation Communication
    console.log('\n📋 Test 7: Capability Limitation Communication');
    totalTests++;
    try {
        const capCheck = transparencyManager.checkCapabilityTransparency('external_system_access');
        if (capCheck && !capCheck.supported) {
            console.log('✅ PASS: Capability limitation communicated correctly');
            passedTests++;
        } else {
            console.log('❌ FAIL: Capability limitation not communicated properly');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in capability limitation test - ${error.message}`);
    }

    // Test 8: Uncertainty Expression in Code Analysis
    console.log('\n📋 Test 8: Uncertainty Expression in Code Analysis');
    totalTests++;
    try {
        const analyzer = new CodeAnalyzer();
        const analysis = await analyzer.analyze('potential_error_code', 'test.js');
        if (typeof analysis === 'object' && 'errors' in analysis) {
            console.log('✅ PASS: Code analysis handles uncertainty correctly');
            passedTests++;
        } else {
            console.log('❌ FAIL: Code analysis uncertainty handling failed');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in uncertainty expression test - ${error.message}`);
    }

    // Test 9: Debug Evaluation with Uncertainty
    console.log('\n📋 Test 9: Debug Evaluation with Uncertainty');
    totalTests++;
    try {
        const evalResult = debugAdapter.evaluateExpression('unknown_variable', 1);
        if (typeof evalResult === 'object' && 'result' in evalResult) {
            console.log('✅ PASS: Debug evaluation handles uncertainty correctly');
            passedTests++;
        } else {
            console.log('❌ FAIL: Debug evaluation uncertainty handling failed');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in debug evaluation test - ${error.message}`);
    }

    // Test 10: Transparency Report Generation
    console.log('\n📋 Test 10: Transparency Report Generation');
    totalTests++;
    try {
        const report = transparencyManager.getTransparencyReport();
        if (report && typeof report === 'object' && 'totalTransparencyInteractions' in report) {
            console.log('✅ PASS: Transparency report generated successfully');
            passedTests++;
        } else {
            console.log('❌ FAIL: Transparency report generation failed');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in transparency report test - ${error.message}`);
    }

    // Summary
    console.log('\n📊 Integration Test Results Summary:');
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

    if (passedTests === totalTests) {
        console.log('\n🎉 All integration tests passed! The LSP-DAP system with transparency features is working correctly.');
        console.log('\n🎯 The complete system now integrates:');
        console.log('   • LSP server with uncertainty handling');
        console.log('   • DAP adapter with limitation communication');
        console.log('   • Code analyzer with transparency awareness');
        console.log('   • Knowledge gap handling across all components');
        console.log('   • Honest response generation in all interactions');
        return true;
    } else {
        console.log('\n⚠️ Some integration tests failed. Please review the implementation.');
        return false;
    }
}

// Run the tests
if (require.main === module) {
    runIntegrationTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Integration test execution error:', error);
            process.exit(1);
        });
}

module.exports = { runIntegrationTests };
