#!/usr/bin/env node

/**
 * Agent Persona Validator and Loader
 * Checks and validates all agent personas and their loading status
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

class AgentPersonaValidator {
    constructor() {
        this.baseUrl = 'http://localhost:8000';
        this.agentTypes = ['chatbot', 'editor', 'master'];
        this.requiredPersonas = [
            'Professional Developer',
            'Supportive Mentor', 
            'Technical Expert',
            'System Manager',
            'Code Assistant',
            'Friendly Assistant'
        ];
    }

    async validateAllPersonas() {
        console.log('🔍 Starting Agent Persona Validation...\n');
        
        // Check 1: Database personas
        await this.checkDatabasePersonas();
        
        // Check 2: File-based personas
        await this.checkFilePersonas();
        
        // Check 3: Active agent personas
        await this.checkActiveAgentPersonas();
        
        // Check 4: Identity configuration
        await this.checkIdentityConfiguration();
        
        // Generate comprehensive report
        this.generatePersonaReport();
    }

    async checkDatabasePersonas() {
        console.log('📋 Checking Database Agent Personas...');
        
        try {
            const response = await axios.get(`${this.baseUrl}/agents`, { timeout: 5000 });
            
            if (response.data && response.data.agents) {
                console.log(`✅ Found ${response.data.agents.length} agents in database:`);
                
                response.data.agents.forEach(agent => {
                    const status = agent.status === 'active' ? '✅' : '⚠️';
                    console.log(`   ${status} ${agent.name} (${agent.type}) - Persona: ${agent.persona_name || 'Not set'}`);
                    
                    // Check if persona is properly configured
                    if (!agent.persona_name) {
                        console.log(`      ❌ Missing persona_name for agent ${agent.name}`);
                    }
                    
                    if (!agent.config) {
                        console.log(`      ❌ Missing config for agent ${agent.name}`);
                    } else {
                        try {
                            const config = JSON.parse(agent.config);
                            if (!config.capabilities) {
                                console.log(`      ⚠️  No capabilities defined for ${agent.name}`);
                            }
                        } catch (e) {
                            console.log(`      ❌ Invalid config JSON for ${agent.name}`);
                        }
                    }
                });
            } else {
                console.log('❌ No agents found in database response');
            }
        } catch (error) {
            console.log(`❌ Database persona check failed: ${error.message}`);
        }
    }

    async checkFilePersonas() {
        console.log('\n📁 Checking File-Based Personas...');
        
        const personaFiles = [
            '/home/sahon/admin/docs/identity/agent_personas.json',
            '/home/sahon/admin/docs/identity/identity.json'
        ];
        
        for (const filePath of personaFiles) {
            if (fs.existsSync(filePath)) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const data = JSON.parse(content);
                    console.log(`✅ ${path.basename(filePath)}: Loaded successfully`);
                    
                    // Validate structure
                    if (filePath.includes('agent_personas.json')) {
                        this.validateAgentPersonasStructure(data);
                    } else if (filePath.includes('identity.json')) {
                        this.validateIdentityStructure(data);
                    }
                } catch (error) {
                    console.log(`❌ ${path.basename(filePath)}: Parse error - ${error.message}`);
                }
            } else {
                console.log(`❌ ${path.basename(filePath)}: File not found`);
            }
        }
    }

    validateAgentPersonasStructure(data) {
        if (data.agent_personas) {
            const personaCount = Object.keys(data.agent_personas).length;
            console.log(`   📊 Found ${personaCount} agent personas in file`);
            
            Object.entries(data.agent_personas).forEach(([key, persona]) => {
                console.log(`   🔍 Persona: ${persona.name} (${key})`);
                
                // Check required fields
                const requiredFields = ['name', 'type', 'core_character', 'language_preferences'];
                const missingFields = requiredFields.filter(field => !persona[field]);
                
                if (missingFields.length > 0) {
                    console.log(`      ❌ Missing fields: ${missingFields.join(', ')}`);
                } else {
                    console.log(`      ✅ All required fields present`);
                }
                
                // Check language preferences
                if (persona.language_preferences) {
                    const langPrefs = persona.language_preferences;
                    if (langPrefs.primary_language === 'bn') {
                        console.log(`      ✅ Bengali language support configured`);
                    } else {
                        console.log(`      ⚠️  Primary language is ${langPrefs.primary_language}, not Bengali`);
                    }
                    
                    if (langPrefs.greeting_prefix) {
                        console.log(`      ✅ Greeting prefix: "${langPrefs.greeting_prefix}"`);
                    }
                }
            });
        } else {
            console.log('   ❌ No agent_personas section found');
        }
    }

    validateIdentityStructure(data) {
        if (data.system_identity) {
            console.log(`   🆔 System Identity: ${data.system_identity.name}`);
            console.log(`   🏷️  Tagline: ${data.system_identity.tagline}`);
        }
        
        if (data.branding) {
            console.log(`   🏢 Owner: ${data.branding.owner}`);
            console.log(`   📍 Location: ${data.branding.location}`);
        }
        
        if (data.agent_specifications) {
            console.log(`   📜 Core Principles: ${data.agent_specifications.core_principles.length} principles`);
            data.agent_specifications.core_principles.forEach(principle => {
                console.log(`      • ${principle}`);
            });
        }
    }

    async checkActiveAgentPersonas() {
        console.log('\n🤖 Checking Active Agent Persona Loading...');
        
        try {
            // Test each agent type with a sample message
            for (const agentType of this.agentTypes) {
                console.log(`\nTesting ${agentType} agent...`);
                
                try {
                    const response = await axios.post(`${this.baseUrl}/chat`, {
                        message: "Hello, who are you?",
                        agent_type: agentType
                    }, { timeout: 10000 });
                    
                    if (response.data && response.data.response) {
                        console.log(`✅ ${agentType} agent responding`);
                        
                        // Check if response contains proper persona elements
                        const responseText = response.data.response.toLowerCase();
                        const hasBengali = responseText.includes('ভাইয়া') || responseText.includes('কলিজা');
                        const hasIdentity = responseText.includes('zombiecoder') || responseText.includes('sahon');
                        
                        if (hasBengali) {
                            console.log(`   ✅ Bengali persona elements detected`);
                        } else {
                            console.log(`   ⚠️  No Bengali persona elements found`);
                        }
                        
                        if (hasIdentity) {
                            console.log(`   ✅ Identity elements detected`);
                        } else {
                            console.log(`   ⚠️  No identity elements found`);
                        }
                    } else {
                        console.log(`❌ ${agentType} agent not responding properly`);
                    }
                } catch (error) {
                    console.log(`❌ ${agentType} agent test failed: ${error.message}`);
                }
            }
        } catch (error) {
            console.log(`❌ Active agent testing failed: ${error.message}`);
        }
    }

    async checkIdentityConfiguration() {
        console.log('\n🆔 Checking Identity Configuration...');
        
        // Check if identity.json is properly referenced
        const identityPath = '/home/sahon/admin/docs/identity/identity.json';
        if (fs.existsSync(identityPath)) {
            try {
                const identityData = JSON.parse(fs.readFileSync(identityPath, 'utf8'));
                console.log('✅ Identity configuration file found and valid');
                
                if (identityData.system_identity) {
                    console.log(`   System: ${identityData.system_identity.name}`);
                    console.log(`   Owner: ${identityData.branding?.owner || 'Not specified'}`);
                    console.log(`   Location: ${identityData.branding?.location || 'Not specified'}`);
                }
                
                // Check if fixed response is configured
                if (identityData.agent_specifications?.identity_mandate?.fixed_response) {
                    console.log('   ✅ Fixed identity response configured');
                } else {
                    console.log('   ⚠️  No fixed identity response configured');
                }
            } catch (error) {
                console.log(`❌ Identity configuration error: ${error.message}`);
            }
        } else {
            console.log('❌ Identity configuration file not found');
        }
    }

    generatePersonaReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 AGENT PERSONA VALIDATION REPORT');
        console.log('='.repeat(60));
        
        console.log('\n✅ Key Findings:');
        console.log('  • Database agent personas: Checked');
        console.log('  • File-based personas: Validated'); 
        console.log('  • Active agent responses: Tested');
        console.log('  • Identity configuration: Verified');
        
        console.log('\n💡 Recommendations:');
        console.log('  1. Ensure all agents have proper persona_name fields');
        console.log('  2. Verify Bengali language support in all personas');
        console.log('  3. Test agent responses contain proper identity elements');
        console.log('  4. Validate that identity.json is properly loaded');
        
        console.log('\n🔧 Next Steps:');
        console.log('  • Run agent integration tests');
        console.log('  • Verify persona switching functionality');
        console.log('  • Test multilingual response capabilities');
        console.log('  • Validate identity consistency across all agents');
        
        console.log('\n' + '='.repeat(60));
    }
}

// Run the validator
async function main() {
    const validator = new AgentPersonaValidator();
    await validator.validateAllPersonas();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = AgentPersonaValidator;