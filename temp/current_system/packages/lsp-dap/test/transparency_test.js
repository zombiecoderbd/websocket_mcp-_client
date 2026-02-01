/**
 * Z-Evo LSP-DAP Transparency Feature Test
 * Tests the knowledge gap and limitation expression features
 */

const { KnowledgeGapHandler } = require('../src/utils/KnowledgeGapHandler');
const { TransparencyManager } = require('../src/utils/TransparencyManager');

async function runTransparencyTests() {
    console.log('🧪 Starting Z-Evo LSP-DAP Transparency Tests...\n');

    // Initialize test components
    const knowledgeGapHandler = new KnowledgeGapHandler();
    const transparencyManager = new TransparencyManager();

    let passedTests = 0;
    let totalTests = 0;

    // Test 1: Knowledge Gap Handler - Express Uncertainty
    console.log('📋 Test 1: Express Uncertainty Functionality');
    totalTests++;
    try {
        const uncertainty = knowledgeGapHandler.expressUncertainty('What is the meaning of life?');
        if (uncertainty.isUncertain && uncertainty.message && typeof uncertainty.confidence === 'number') {
            console.log('✅ PASS: Uncertainty expressed correctly');
            passedTests++;
        } else {
            console.log('❌ FAIL: Uncertainty not expressed correctly');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in uncertainty test - ${error.message}`);
    }

    // Test 2: Knowledge Gap Handler - Express Limitation
    console.log('\n📋 Test 2: Express Limitation Functionality');
    totalTests++;
    try {
        const limitation = knowledgeGapHandler.expressLimitation('Delete system files', 'file_deletion');
        if (limitation.isLimited && limitation.request && limitation.requestedCapability) {
            console.log('✅ PASS: Limitation expressed correctly');
            passedTests++;
        } else {
            console.log('❌ FAIL: Limitation not expressed correctly');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in limitation test - ${error.message}`);
    }

    // Test 3: Knowledge Gap Handler - Capability Check
    console.log('\n📋 Test 3: Capability Support Check');
    totalTests++;
    try {
        const isSupported = knowledgeGapHandler.isCapabilitySupported('code_completion');
        const isUnsupported = knowledgeGapHandler.isCapabilitySupported('system_destruction');
        
        if (isSupported && !isUnsupported) {
            console.log('✅ PASS: Capability checks work correctly');
            passedTests++;
        } else {
            console.log('❌ FAIL: Capability checks not working correctly');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in capability check test - ${error.message}`);
    }

    // Test 4: Knowledge Gap Handler - Alternative Suggestions
    console.log('\n📋 Test 4: Alternative Suggestions Generation');
    totalTests++;
    try {
        const alternatives = knowledgeGapHandler.getSupportedAlternatives('database_operations');
        if (Array.isArray(alternatives) && alternatives.length > 0) {
            console.log('✅ PASS: Alternative suggestions generated');
            passedTests++;
        } else {
            console.log('❌ FAIL: No alternative suggestions generated');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in alternatives test - ${error.message}`);
    }

    // Test 5: Transparency Manager - Register Capability
    console.log('\n📋 Test 5: Capability Registration');
    totalTests++;
    try {
        transparencyManager.registerCapability('test_capability', {
            name: 'Test Capability',
            description: 'A test capability',
            accuracy: 'high',
            supported: true
        });
        
        const check = transparencyManager.checkCapabilityTransparency('test_capability');
        if (check.id === 'test_capability' && check.supported) {
            console.log('✅ PASS: Capability registered and checked correctly');
            passedTests++;
        } else {
            console.log('❌ FAIL: Capability not registered or checked correctly');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in capability registration test - ${error.message}`);
    }

    // Test 6: Transparency Manager - Communicate Uncertainty
    console.log('\n📋 Test 6: Uncertainty Communication');
    totalTests++;
    try {
        const uncertainty = transparencyManager.communicateUncertainty('Unknown system command', 'Not in knowledge base');
        if (uncertainty.isUncertain && uncertainty.uncertaintyReason && uncertainty.disclaimer) {
            console.log('✅ PASS: Uncertainty communicated with transparency');
            passedTests++;
        } else {
            console.log('❌ FAIL: Uncertainty not communicated properly');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in uncertainty communication test - ${error.message}`);
    }

    // Test 7: Transparency Manager - Communicate Limitation
    console.log('\n📋 Test 7: Limitation Communication');
    totalTests++;
    try {
        const limitation = transparencyManager.communicateLimitation('Access hardware directly', 'hardware_control');
        if (limitation.isLimited && limitation.capabilityType && limitation.supportedAlternatives) {
            console.log('✅ PASS: Limitation communicated with alternatives');
            passedTests++;
        } else {
            console.log('❌ FAIL: Limitation not communicated properly');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in limitation communication test - ${error.message}`);
    }

    // Test 8: Transparency Manager - Transparency Report
    console.log('\n📋 Test 8: Transparency Reporting');
    totalTests++;
    try {
        const report = transparencyManager.getTransparencyReport();
        if (typeof report === 'object' && 'totalTransparencyInteractions' in report) {
            console.log('✅ PASS: Transparency report generated');
            passedTests++;
        } else {
            console.log('❌ FAIL: Transparency report not generated properly');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in transparency report test - ${error.message}`);
    }

    // Test 9: Transparency Manager - Response Honesty Validation
    console.log('\n📋 Test 9: Response Honesty Validation');
    totalTests++;
    try {
        const validation = transparencyManager.validateResponseHonesty('I am absolutely certain about this.', 'test query');
        if (typeof validation === 'object' && 'honestyScore' in validation) {
            console.log('✅ PASS: Response honesty validated');
            passedTests++;
        } else {
            console.log('❌ FAIL: Response honesty not validated properly');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in honesty validation test - ${error.message}`);
    }

    // Test 10: Knowledge Gap Handler - Honest Response Generation
    console.log('\n📋 Test 10: Honest Response Generation');
    totalTests++;
    try {
        const honestResponse = knowledgeGapHandler.generateHonestResponse('Run system command', 'system_operations');
        if (typeof honestResponse === 'object' && ('isLimited' in honestResponse || 'isSupported' in honestResponse)) {
            console.log('✅ PASS: Honest response generated');
            passedTests++;
        } else {
            console.log('❌ FAIL: Honest response not generated properly');
        }
    } catch (error) {
        console.log(`❌ FAIL: Error in honest response test - ${error.message}`);
    }

    // Summary
    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

    if (passedTests === totalTests) {
        console.log('\n🎉 All transparency tests passed! The ethical features are working correctly.');
        console.log('\n🎯 The system can now:');
        console.log('   • Clearly express uncertainty when information is unknown');
        console.log('   • Honestly communicate limitations');
        console.log('   • Provide alternative suggestions when capabilities are exceeded');
        console.log('   • Maintain transparency in all interactions');
        console.log('   • Validate response honesty to prevent overconfidence');
        return true;
    } else {
        console.log('\n⚠️ Some tests failed. Please review the implementation.');
        return false;
    }
}

// Run the tests
if (require.main === module) {
    runTransparencyTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test execution error:', error);
            process.exit(1);
        });
}

module.exports = { runTransparencyTests };
