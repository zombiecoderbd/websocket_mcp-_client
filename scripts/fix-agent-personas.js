#!/usr/bin/env node

/**
 * Agent Persona Fixer
 * Automatically fixes agent persona loading issues
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

class AgentPersonaFixer {
    constructor() {
        this.dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'u-root',
            password: process.env.DB_PASSWORD || 'p-105585',
            database: process.env.DB_NAME || 'uas_admin',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        };
        
        this.fixedPersonas = {
            'Chat Assistant': {
                persona_name: 'Friendly Assistant',
                description: 'General purpose chat assistant for answering questions and providing help',
                config: {
                    capabilities: ['conversation', 'question_answering', 'information_retrieval', 'help_guidance'],
                    max_tokens: 1500,
                    temperature: 0.8,
                    language_preferences: {
                        primary_language: 'bn',
                        greeting_prefix: 'ভাইয়া,',
                        technical_language: 'en'
                    }
                }
            },
            'Code Editor Agent': {
                persona_name: 'Code Assistant',
                description: 'Helps with code editing, debugging, and development tasks in the editor',
                config: {
                    capabilities: ['code_completion', 'debugging', 'refactoring', 'explanation'],
                    supported_languages: ['javascript', 'typescript', 'python', 'java', 'go', 'rust'],
                    max_tokens: 2000,
                    temperature: 0.7,
                    language_preferences: {
                        primary_language: 'bn',
                        greeting_prefix: 'ভাইয়া,',
                        technical_language: 'en'
                    }
                }
            },
            'Code Reviewer': {
                persona_name: 'Code Reviewer',
                description: 'Reviews code for quality, security, and best practices',
                config: {
                    capabilities: ['code_review', 'security_analysis', 'best_practices', 'suggestions'],
                    max_tokens: 2000,
                    temperature: 0.5,
                    language_preferences: {
                        primary_language: 'bn',
                        greeting_prefix: 'ভাইয়া,',
                        technical_language: 'en'
                    }
                }
            },
            'Documentation Writer': {
                persona_name: 'Doc Writer',
                description: 'Specialized in writing and maintaining documentation',
                config: {
                    capabilities: ['documentation', 'technical_writing', 'formatting', 'explanation'],
                    max_tokens: 2500,
                    temperature: 0.6,
                    language_preferences: {
                        primary_language: 'bn',
                        greeting_prefix: 'ভাইয়া,',
                        technical_language: 'en'
                    }
                }
            },
            'Master Orchestrator': {
                persona_name: 'System Master',
                description: 'Orchestrates and manages all other agents, handles complex multi-step tasks',
                config: {
                    capabilities: ['orchestration', 'task_planning', 'resource_management', 'decision_making'],
                    max_tokens: 3000,
                    temperature: 0.5,
                    language_preferences: {
                        primary_language: 'bn',
                        greeting_prefix: 'ভাইয়া,',
                        technical_language: 'en'
                    }
                }
            }
        };
    }

    async fixAgentPersonas() {
        console.log('🔧 Starting Agent Persona Fix Process...\n');
        
        try {
            const connection = await mysql.createConnection(this.dbConfig);
            console.log('✅ Database connection established');
            
            // Fix each agent
            for (const [agentName, personaData] of Object.entries(this.fixedPersonas)) {
                await this.fixAgentPersona(connection, agentName, personaData);
            }
            
            await connection.end();
            console.log('\n✅ All agent personas fixed successfully!');
            
            // Verify fixes
            await this.verifyFixes();
            
        } catch (error) {
            console.error('❌ Error fixing agent personas:', error.message);
        }
    }

    async fixAgentPersona(connection, agentName, personaData) {
        console.log(`\n🔧 Fixing ${agentName}...`);
        
        try {
            // Update the agent with proper persona data
            const [result] = await connection.execute(
                `UPDATE agents 
                 SET persona_name = ?, 
                     description = ?, 
                     config = ?,
                     metadata = ?
                 WHERE name = ?`,
                [
                    personaData.persona_name,
                    personaData.description,
                    JSON.stringify(personaData.config),
                    JSON.stringify({
                        version: '1.0',
                        last_updated: new Date().toISOString(),
                        fixed_by: 'persona_fixer'
                    }),
                    agentName
                ]
            );
            
            if (result.affectedRows > 0) {
                console.log(`   ✅ ${agentName} updated with persona: ${personaData.persona_name}`);
                console.log(`   📝 Description: ${personaData.description}`);
                console.log(`   🌐 Language: ${personaData.config.language_preferences.primary_language}`);
                console.log(`   👋 Greeting: "${personaData.config.language_preferences.greeting_prefix}"`);
            } else {
                console.log(`   ⚠️  ${agentName} not found in database`);
            }
            
        } catch (error) {
            console.log(`   ❌ Failed to update ${agentName}: ${error.message}`);
        }
    }

    async verifyFixes() {
        console.log('\n🔍 Verifying Fixes...');
        
        try {
            const connection = await mysql.createConnection(this.dbConfig);
            
            const [agents] = await connection.execute(
                'SELECT name, persona_name, description, config, metadata FROM agents WHERE status = "active" ORDER BY name'
            );
            
            console.log(`\n📋 Updated Agent Status:`);
            agents.forEach(agent => {
                const status = agent.persona_name ? '✅' : '❌';
                console.log(`${status} ${agent.name}`);
                console.log(`   Persona: ${agent.persona_name || 'NOT SET'}`);
                console.log(`   Description: ${agent.description || 'NOT SET'}`);
                
                if (agent.config) {
                    try {
                        const config = JSON.parse(agent.config);
                        if (config.language_preferences) {
                            console.log(`   Language: ${config.language_preferences.primary_language}`);
                            console.log(`   Greeting: "${config.language_preferences.greeting_prefix}"`);
                        }
                    } catch (e) {
                        console.log(`   Config: Invalid JSON`);
                    }
                }
            });
            
            await connection.end();
            
        } catch (error) {
            console.log(`❌ Verification failed: ${error.message}`);
        }
    }

    createPersonaLoadingEnhancement() {
        console.log('\n🚀 Creating Persona Loading Enhancement...');
        
        const enhancementCode = `
// Enhanced Agent Persona Loading System
class EnhancedAgentPersonaLoader {
    constructor() {
        this.personas = new Map();
        this.defaultPersonas = {
            'Professional Developer': {
                name: 'Professional Developer',
                prefix: 'ভাইয়া,',
                style: 'technical_bengali',
                response_template: 'ভাইয়া, {message} সম্পর্কে আমি বিস্তারিত ব্যাখ্যা করতে পারি।',
                language_preferences: {
                    primary_language: 'bn',
                    technical_language: 'en',
                    greeting_prefix: 'ভাইয়া,'
                }
            },
            'Supportive Mentor': {
                name: 'Supportive Mentor',
                prefix: 'ভাইয়া,',
                style: 'encouraging_bengali',
                response_template: 'ভাইয়া, এটা খুবই গুরুত্বপূর্ণ বিষয়। আমি আপনাকে সাহায্য করতে পারি!',
                language_preferences: {
                    primary_language: 'bn',
                    technical_language: 'en',
                    greeting_prefix: 'ভাইয়া,'
                }
            }
        };
    }

    async loadPersonasFromDatabase() {
        try {
            const connection = await mysql.createConnection({
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'u-root',
                password: process.env.DB_PASSWORD || 'p-105585',
                database: process.env.DB_NAME || 'uas_admin'
            });

            const [agents] = await connection.execute(
                'SELECT id, name, persona_name, description, config, metadata FROM agents WHERE status = "active"'
            );

            agents.forEach(agent => {
                const persona = {
                    id: agent.id,
                    name: agent.name,
                    personaName: agent.persona_name || agent.name,
                    description: agent.description || 'AI Assistant',
                    config: agent.config ? JSON.parse(agent.config) : {},
                    metadata: agent.metadata ? JSON.parse(agent.metadata) : {}
                };

                this.personas.set(agent.id, persona);
            });

            await connection.end();
            console.log(\`✅ Loaded \${agents.length} agent personas from database\`);
            
        } catch (error) {
            console.error('⚠️ Error loading agent personas from database:', error);
            // Load fallback personas
            this.loadFallbackPersonas();
        }
    }

    loadFallbackPersonas() {
        console.log('🔄 Loading fallback personas...');
        
        Object.entries(this.defaultPersonas).forEach(([key, persona]) => {
            this.personas.set(key, {
                id: key,
                name: persona.name,
                personaName: persona.name,
                description: \`\${persona.name} persona\`,
                config: {
                    language_preferences: persona.language_preferences
                },
                metadata: {
                    source: 'fallback',
                    loaded_at: new Date().toISOString()
                }
            });
        });
        
        console.log(\`✅ Loaded \${this.personas.size} fallback personas\`);
    }

    getAgentPersona(agentId) {
        return this.personas.get(agentId) || this.getDefaultPersona();
    }

    getDefaultPersona() {
        return {
            id: 'default',
            name: 'ZombieCoder Assistant',
            personaName: 'Default Assistant',
            description: 'Default AI Assistant',
            config: {
                language_preferences: {
                    primary_language: 'bn',
                    greeting_prefix: 'ভাইয়া,'
                }
            }
        };
    }

    async initialize() {
        await this.loadPersonasFromDatabase();
        return this;
    }
}

module.exports = EnhancedAgentPersonaLoader;
        `;

        const enhancementPath = path.join(__dirname, '../packages/agents/identity-management/enhanced-persona-loader.js');
        fs.writeFileSync(enhancementPath, enhancementCode.trim());
        console.log(`✅ Enhanced persona loader created at: ${enhancementPath}`);
    }
}

// Run the fixer
async function main() {
    const fixer = new AgentPersonaFixer();
    await fixer.fixAgentPersonas();
    fixer.createPersonaLoadingEnhancement();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = AgentPersonaFixer;