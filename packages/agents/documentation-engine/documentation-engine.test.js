/**
 * Documentation Engine Test
 * Test the automated documentation generation system
 */

const DocumentationEngine = require('./documentation-engine');

async function testDocumentationEngine() {
    console.log('=== Documentation Engine Test ===\n');

    try {
        // Create documentation engine
        const docEngine = new DocumentationEngine({
            outputFormats: ['json', 'markdown'],
            includeCodeSnippets: true,
            generateAPIEndpoints: true,
            analyzeDependencies: true
        });

        // Test 1: Initialize engine
        console.log('1. Initializing documentation engine...');
        docEngine.initialize();
        const status = docEngine.getStatus();
        console.log('✓ Documentation engine initialized');
        console.log('  - Parsers registered:', status.registeredParsers.length);
        console.log('  - Supported extensions:', status.registeredParsers.join(', '));
        console.log('');

        // Test 2: Create a sample JavaScript file for testing
        console.log('2. Creating sample JavaScript file...');
        const fs = require('fs');
        const path = require('path');
        
        const sampleJsContent = `/**
 * Sample utility functions for testing documentation engine
 * This file contains various JavaScript constructs for testing
 */

// Import statements
import { useState, useEffect } from 'react';
import axios from 'axios';

// Variable declarations
const API_BASE_URL = 'https://api.example.com';
let globalCounter = 0;

/**
 * Calculate the sum of two numbers
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} Sum of a and b
 */
function calculateSum(a, b) {
    return a + b;
}

/**
 * Async function to fetch user data
 * @param {string} userId - ID of the user to fetch
 * @returns {Promise<Object>} User data
 */
async function fetchUserData(userId) {
    try {
        const response = await axios.get(\`\${API_BASE_URL}/users/\${userId}\`);
        return response.data;
    } catch (error) {
        console.error('Error fetching user data:', error);
        throw error;
    }
}

// Class definition
class UserManager {
    constructor() {
        this.users = [];
    }

    /**
     * Add a new user
     * @param {Object} user - User object to add
     */
    addUser(user) {
        this.users.push(user);
        globalCounter++;
    }

    /**
     * Get all users
     * @returns {Array} Array of users
     */
    getUsers() {
        return this.users;
    }
}

// Export statements
export { calculateSum, fetchUserData, UserManager };
export default UserManager;
`;

        const testFilePath = './test-sample.js';
        fs.writeFileSync(testFilePath, sampleJsContent);
        console.log('✓ Sample JavaScript file created\n');

        // Test 3: Generate documentation for the sample file
        console.log('3. Generating documentation...');
        const documentation = await docEngine.generateDocumentation(testFilePath);
        console.log('✓ Documentation generated');
        console.log('  - ID:', documentation.id);
        console.log('  - File:', documentation.fileName);
        console.log('  - Functions:', documentation.summary.totalFunctions);
        console.log('  - Classes:', documentation.summary.totalClasses);
        console.log('  - Dependencies:', documentation.dependencies.length);
        console.log('  - Complexity:', documentation.complexity);
        console.log('');

        // Test 4: Export documentation in different formats
        console.log('4. Exporting documentation in different formats...');
        
        // Export as JSON
        const jsonExport = docEngine.exportDocumentation(documentation, 'json');
        console.log('✓ JSON export completed');
        
        // Export as Markdown
        const mdExport = docEngine.exportDocumentation(documentation, 'markdown');
        console.log('✓ Markdown export completed');
        console.log('  - Markdown length:', mdExport.length, 'characters');
        
        // Export as HTML
        const htmlExport = docEngine.exportDocumentation(documentation, 'html');
        console.log('✓ HTML export completed');
        console.log('  - HTML length:', htmlExport.length, 'characters');
        console.log('');

        // Test 5: Check specific documentation details
        console.log('5. Checking documentation details...');
        console.log('  - Has summary:', !!documentation.summary);
        console.log('  - Has dependencies:', Array.isArray(documentation.dependencies));
        console.log('  - Has API endpoints:', Array.isArray(documentation.apiEndpoints));
        console.log('  - Has code snippets:', Array.isArray(documentation.codeSnippets));
        console.log('');

        // Test 6: Check extracted functions
        if (documentation.parsedData.functions) {
            console.log('6. Extracted functions:');
            documentation.parsedData.functions.forEach(func => {
                console.log(`  - ${func.name}: ${func.position}`);
            });
            console.log('');
        }

        // Test 7: Check extracted classes
        if (documentation.parsedData.classes) {
            console.log('7. Extracted classes:');
            documentation.parsedData.classes.forEach(cls => {
                console.log(`  - ${cls.name}: ${cls.position}`);
            });
            console.log('');
        }

        // Test 8: Check extracted dependencies
        if (documentation.dependencies) {
            console.log('8. Extracted dependencies:');
            documentation.dependencies.forEach(dep => {
                console.log(`  - ${dep.module} (${dep.type})`);
            });
            console.log('');
        }

        // Test 9: Check quality metrics
        console.log('9. Quality metrics:');
        console.log('  - Comment ratio:', documentation.qualityMetrics.commentRatio);
        console.log('  - Function count:', documentation.qualityMetrics.functionCount);
        console.log('');

        // Test 10: Test batch processing
        console.log('10. Testing batch documentation generation...');
        const batchResults = await docEngine.generateDocumentationBatch([testFilePath]);
        console.log('✓ Batch processing completed');
        console.log('  - Files processed:', batchResults.length);
        console.log('  - Success:', batchResults.filter(r => r.status === 'success').length);
        console.log('  - Errors:', batchResults.filter(r => r.status === 'error').length);
        console.log('');

        // Clean up test file
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }

        console.log('=== All Documentation Engine Tests Passed ===\n');

        // Display summary
        console.log('Test Summary:');
        console.log('- Parsers registered:', status.registeredParsers.length);
        console.log('- Supported extensions:', status.registeredParsers.join(', '));
        console.log('- Functions found:', documentation.summary.totalFunctions);
        console.log('- Classes found:', documentation.summary.totalClasses);
        console.log('- Dependencies found:', documentation.dependencies.length);
        console.log('- Complexity score:', documentation.complexity);
        console.log('- Export formats tested: 3 (JSON, Markdown, HTML)');

    } catch (error) {
        console.error('Documentation engine test failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Export for use in other tests
module.exports = { testDocumentationEngine };

// Run test if this file is executed directly
if (require.main === module) {
    testDocumentationEngine();
}