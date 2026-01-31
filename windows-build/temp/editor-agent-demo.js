#!/usr/bin/env node

/**
 * Editor Agent Demonstration
 * Shows practical usage of the Editor Agent system
 */

const { EditorAgent } = require('./editor-agent-complete.js');
const fs = require('fs').promises;
const path = require('path');

async function demonstrateEditorAgent() {
    console.log('🤖 Editor Agent Demonstration');
    console.log('=============================\n');
    
    // Create demo workspace
    const demoWorkspace = './temp/demo-project';
    await fs.mkdir(demoWorkspace, { recursive: true });
    
    const agent = new EditorAgent();
    agent.editorState.workspace = path.resolve(demoWorkspace);
    
    console.log('🔧 Setting up demo environment...');
    console.log(`Workspace: ${agent.editorState.workspace}\n`);
    
    try {
        // Demo 1: Create a JavaScript project structure
        console.log('1️⃣ Creating project structure...');
        
        const filesToCreate = [
            {
                path: 'package.json',
                content: `{
  "name": "demo-project",
  "version": "1.0.0",
  "description": "Demo project created by Editor Agent",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "echo 'No tests yet'"
  }
}`
            },
            {
                path: 'index.js',
                content: `// Main application file
console.log('Hello from Editor Agent demo!');

function greet(name) {
    return \`Hello, \${name}!\`;
}

// Export for use in other modules
module.exports = { greet };`
            },
            {
                path: 'README.md',
                content: `# Demo Project

This project was created automatically by the Editor Agent system.

## Features
- Automated file creation
- Smart content generation
- MCP protocol compliance`
            }
        ];
        
        for (const file of filesToCreate) {
            const fullPath = path.join(demoWorkspace, file.path);
            await agent.createFile(fullPath, file.content);
            console.log(`   ✅ Created ${file.path}`);
        }
        
        // Demo 2: Read and analyze files
        console.log('\n2️⃣ Analyzing created files...');
        
        const readmeContent = await agent.getFileContent(path.join(demoWorkspace, 'README.md'));
        console.log(`   📖 README content (${readmeContent.size} chars):`);
        console.log(`      ${readmeContent.content.split('\n')[0]}...`);
        
        const jsContent = await agent.getFileContent(path.join(demoWorkspace, 'index.js'));
        console.log(`   💻 JavaScript detected: ${jsContent.language}`);
        console.log(`      Lines of code: ${jsContent.content.split('\n').length}`);
        
        // Demo 3: Update existing file
        console.log('\n3️⃣ Updating index.js with new functionality...');
        
        const updatedJS = jsContent.content + `\n\n// Added by Editor Agent
function calculateSum(a, b) {
    return a + b;
}

console.log('Sum of 5 and 3:', calculateSum(5, 3));`;
        
        await agent.saveFile(path.join(demoWorkspace, 'index.js'), updatedJS);
        console.log('   ✅ Added calculation function to index.js');
        
        // Demo 4: Insert at specific location
        console.log('\n4️⃣ Adding documentation comment...');
        
        await agent.insertAtCursor(
            path.join(demoWorkspace, 'index.js'),
            '\n// This function was added automatically by Editor Agent\n',
            { line: 8, column: 0 }
        );
        console.log('   ✅ Inserted documentation comment');
        
        // Demo 5: Create utility module
        console.log('\n5️⃣ Creating utilities module...');
        
        await agent.createFile(path.join(demoWorkspace, 'utils.js'), `// Utility functions
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = { formatDate, capitalize };`);
        
        console.log('   ✅ Created utils.js with helper functions');
        
        // Demo 6: Show final project structure
        console.log('\n6️⃣ Final project structure:');
        const files = await fs.readdir(demoWorkspace);
        for (const file of files) {
            const stats = await fs.stat(path.join(demoWorkspace, file));
            const size = stats.size;
            const type = stats.isDirectory() ? '[DIR]' : '[FILE]';
            console.log(`   ${type} ${file} (${size} bytes)`);
        }
        
        // Demo 7: Show agent status
        console.log('\n7️⃣ Editor Agent Status:');
        const status = agent.getStatus();
        console.log(`   Agent ID: ${status.agent_id}`);
        console.log(`   Session: ${status.session_id.substring(0, 8)}...`);
        console.log(`   Capabilities: ${status.capabilities.length} loaded`);
        console.log(`   Workspace: ${path.basename(status.workspace)}`);
        
        // Demo 8: MCP Protocol demonstration
        console.log('\n8️⃣ MCP Protocol Features:');
        console.log('   📤 Standardized headers for traceability');
        console.log('   🔄 Real-time context synchronization');  
        console.log('   🔧 Queued operation processing');
        console.log('   🛡️  Security validation for all operations');
        
        console.log('\n🎉 Demonstration completed successfully!');
        console.log('\n📁 Demo project created at:', demoWorkspace);
        console.log('You can explore the generated files to see the Editor Agent in action.');
        
    } catch (error) {
        console.error('💥 Demonstration failed:', error.message);
    } finally {
        // Cleanup demonstration
        console.log('\n🧹 Cleaning up demo files...');
        try {
            await fs.rm(demoWorkspace, { recursive: true, force: true });
            console.log('✅ Demo cleanup completed');
        } catch (cleanupError) {
            console.log('⚠️  Cleanup warning:', cleanupError.message);
        }
    }
}

// Run demonstration
if (require.main === module) {
    demonstrateEditorAgent().catch(console.error);
}

module.exports = { demonstrateEditorAgent };