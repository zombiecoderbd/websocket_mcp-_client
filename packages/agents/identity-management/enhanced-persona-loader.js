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
            console.log(`✅ Loaded ${agents.length} agent personas from database`);
            
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
                description: `${persona.name} persona`,
                config: {
                    language_preferences: persona.language_preferences
                },
                metadata: {
                    source: 'fallback',
                    loaded_at: new Date().toISOString()
                }
            });
        });
        
        console.log(`✅ Loaded ${this.personas.size} fallback personas`);
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