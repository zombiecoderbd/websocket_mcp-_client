/**
 * Script to populate default agents in the database
 */

const fs = require('fs');
const path = require('path');

// Import database connection
const { db } = require('../lib/database');

async function populateDefaultAgents() {
  console.log('Populating default agents...');
  
  const defaultAgents = [
    {
      name: 'System Agent',
      type: 'master',
      persona_name: 'System Manager',
      description: 'Core system management agent responsible for coordinating other agents',
      status: 'active',
      config: JSON.stringify({
        priority: 10,
        max_concurrent_tasks: 10,
        memory_limit: '512MB',
        cpu_limit: '50%'
      })
    },
    {
      name: 'MCP Agent',
      type: 'master',
      persona_name: 'MCP Coordinator',
      description: 'Model Context Protocol agent for managing communication between models',
      status: 'active',
      config: JSON.stringify({
        protocol: 'mcp',
        supported_tools: ['analyze-code', 'generate-documentation', 'find-bugs'],
        heartbeat_interval: 30000
      })
    },
    {
      name: 'DAP Agent',
      type: 'master',
      persona_name: 'Debug Adapter',
      description: 'Debug Adapter Protocol agent for debugging capabilities',
      status: 'active',
      config: JSON.stringify({
        protocol: 'dap',
        supported_languages: ['javascript', 'python', 'typescript'],
        debug_port: 8081
      })
    },
    {
      name: 'LSP Agent',
      type: 'master',
      persona_name: 'Language Server',
      description: 'Language Server Protocol agent for code intelligence',
      status: 'active',
      config: JSON.stringify({
        protocol: 'lsp',
        supported_languages: ['javascript', 'python', 'typescript', 'go', 'rust'],
        port: 8082
      })
    },
    {
      name: 'Code Editor Agent',
      type: 'editor',
      persona_name: 'Code Assistant',
      description: 'Helps with code editing, debugging, and development tasks in the editor',
      status: 'active',
      config: JSON.stringify({
        capabilities: ['code-completion', 'syntax-highlighting', 'refactoring'],
        supported_file_types: ['.js', '.ts', '.py', '.go', '.rs', '.java', '.cpp'],
        max_file_size_kb: 5000
      })
    },
    {
      name: 'Chat Agent',
      type: 'chatbot',
      persona_name: 'Conversational AI',
      description: 'Handles natural language conversations and provides contextual responses',
      status: 'active',
      config: JSON.stringify({
        max_context_length: 4096,
        response_timeout_ms: 30000,
        temperature: 0.7
      })
    },
    {
      name: 'ZombieCoder Agent',
      type: 'master',
      persona_name: 'ZombieCoder AI',
      description: 'Primary AI agent for the ZombieCoder system with advanced capabilities',
      status: 'active',
      config: JSON.stringify({
        capabilities: ['code-generation', 'bug-fixing', 'documentation', 'analysis'],
        personality: 'helpful, detailed, context-aware',
        languages: ['bengali', 'english'],
        tagline: 'যেখানে কোড ও কথা বলে'
      })
    },
    {
      name: 'Proxy Agent',
      type: 'master',
      persona_name: 'Communication Proxy',
      description: 'Manages communication between different system components and external services',
      status: 'active',
      config: JSON.stringify({
        protocols: ['http', 'websocket', 'tcp'],
        max_connections: 100,
        connection_timeout: 30000
      })
    }
  ];

  try {
    for (const agent of defaultAgents) {
      // Check if agent already exists
      const existingAgent = await db.get('SELECT id FROM agents WHERE name = ?', [agent.name]);
      
      if (!existingAgent) {
        await db.run(
          'INSERT INTO agents (name, type, persona_name, description, status, config) VALUES (?, ?, ?, ?, ?, ?)',
          [agent.name, agent.type, agent.persona_name, agent.description, agent.status, agent.config]
        );
        console.log(`Created agent: ${agent.name}`);
      } else {
        console.log(`Agent already exists: ${agent.name}`);
      }
    }
    
    console.log('Default agents populated successfully!');
  } catch (error) {
    console.error('Error populating default agents:', error);
    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  populateDefaultAgents()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { populateDefaultAgents };