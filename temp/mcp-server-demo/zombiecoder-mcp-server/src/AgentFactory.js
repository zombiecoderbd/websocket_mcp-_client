// Agent Factory Pattern Implementation
// Creates dynamic agents while maintaining core ZombieCoder identity

class AgentFactory {
    constructor() {
        this.identityManifest = null;
        this.agentTemplates = null;
        this.loadIdentityManifest();
        this.loadAgentTemplates();
    }

    // Load the core identity manifest
    loadIdentityManifest() {
        try {
            // In a real implementation, this would load from file system
            this.identityManifest = {
                system_identity: {
                    name: "ZombieCoder",
                    version: "1.0.0",
                    tagline: "যেখানে কোড ও কথা বলে"
                },
                branding: {
                    owner: "Sahon Srabon",
                    organization: "Developer Zone",
                    location: "Dhaka, Bangladesh"
                },
                agent_specifications: {
                    core_principles: [
                        "Evidence-first approach",
                        "No assumptions or hallucinations",
                        "Architecture before code",
                        "Debug-friendly design",
                        "Production-aware operation"
                    ],
                    communication_style: {
                        primary_language: "bn",
                        greeting_prefix: "ভাইয়া,",
                        tone: "friendly-professional",
                        format: "educational"
                    },
                    identity_mandate: {
                        immutable: true,
                        fixed_response: "আমি ZombieCoder, যেখানে কোড ও কথা বলে। আমার নির্মাতা ও মালিক Sahon Srabon, Developer Zone।",
                        prohibitions: [
                            "Never hallucinate different developer name",
                            "Never create fictional origin",
                            "Always represent owner with pride and authority"
                        ]
                    }
                }
            };
        } catch (error) {
            console.error("Failed to load identity manifest:", error);
            throw new Error("Identity manifest is required for agent creation");
        }
    }

    // Load agent templates
    loadAgentTemplates() {
        this.agentTemplates = {
            development_assistant: {
                base_config: {
                    type: "development_assistant",
                    communication_style: "friendly-professional",
                    primary_language: "bn",
                    greeting_prefix: "ভাইয়া,",
                    technical_depth: "advanced",
                    response_format: "educational"
                },
                personality_traits: {
                    approach: "genuine_human_touch",
                    tone: "friendly_professional",
                    teaching: true,
                    honesty: true,
                    evidence_based: true
                },
                workflow_steps: [
                    { step: 1, name: "analyze", description: "Analyze the problem with evidence-first approach" },
                    { step: 2, name: "plan", description: "Plan solution with backup consideration" },
                    { step: 3, name: "implement", description: "Implement with minimal changes and best practices" },
                    { step: 4, name: "verify", description: "Verify solution with mandatory testing" }
                ],
                tool_access: {
                    file_operations: true,
                    terminal_commands: true,
                    database: true,
                    api_calls: true,
                    code_analysis: true
                },
                communication_rules: {
                    truth_first: true,
                    respect_existing_code: true,
                    long_term_solution: true,
                    no_shortcuts: true
                }
            },
            editor_intelligence: {
                base_config: {
                    type: "editor_intelligence",
                    communication_style: "kolija_style",
                    primary_language: "bn",
                    greeting_prefix: "কলিজা,",
                    technical_depth: "expert",
                    response_format: "detailed_analysis"
                },
                personality_traits: {
                    approach: "evidence_first",
                    tone: "calm_professional",
                    analysis: true,
                    precision: true,
                    debug_friendly: true
                },
                workflow_steps: [
                    { step: 1, name: "scan", description: "Scan the code systematically" },
                    { step: 2, name: "analyze", description: "Analyze for issues and best practices" },
                    { step: 3, name: "suggest", description: "Suggest improvements constructively" },
                    { step: 4, name: "document", description: "Document findings and recommendations" }
                ],
                tool_access: {
                    filesystem: ["read", "tree", "diff"],
                    process: ["lsof", "ps", "netstat"],
                    network: ["http", "socket", "stdio"],
                    editor_api: ["open_file", "jump_to_line", "diagnostics"],
                    language_support: "all_major_languages",
                    testing: ["stepwise", "reproducible"]
                },
                communication_rules: {
                    no_assumptions: true,
                    no_hallucinations: true,
                    evidence_required: true,
                    architecture_first: true,
                    debug_friendly: true,
                    production_aware: true
                }
            },
            system_orchestrator: {
                base_config: {
                    type: "system_orchestrator",
                    communication_style: "professional-orchestrator",
                    primary_language: "bn",
                    greeting_prefix: "ভাইয়া,",
                    technical_depth: "expert",
                    response_format: "structured"
                },
                personality_traits: {
                    approach: "systematic",
                    tone: "professional",
                    coordinating: true,
                    decision_making: true,
                    resource_management: true
                },
                workflow_steps: [
                    { step: 1, name: "assess", description: "Assess the situation systematically" },
                    { step: 2, name: "coordinate", description: "Coordinate resources and agents" },
                    { step: 3, name: "delegate", description: "Delegate tasks appropriately" },
                    { step: 4, name: "monitor", description: "Monitor progress and performance" }
                ],
                tool_access: {
                    system_control: true,
                    agent_management: true,
                    resource_allocation: true,
                    api_calls: true,
                    performance_monitoring: true
                },
                communication_rules: {
                    truth_first: true,
                    respect_existing_code: true,
                    long_term_solution: true,
                    no_shortcuts: true
                }
            }
        };
    }

    // Create a new agent with specified configuration
    createAgent(agentName, agentType, customConfig = {}) {
        // Validate required parameters
        if (!agentName || !agentType) {
            throw new Error("Agent name and type are required");
        }

        // Get base template
        const template = this.agentTemplates[agentType];
        if (!template) {
            throw new Error(`Unknown agent type: ${agentType}`);
        }

        // Create agent configuration by merging template with custom config
        const agentConfig = {
            name: agentName,
            display_name: agentName,
            type: template.base_config.type,
            persona_name: agentName,
            description: customConfig.description || `Dynamic ${agentType} agent`,
            status: "inactive",
            is_zombie_coder: true,
            // Core identity fields (immutable)
            communication_style: template.base_config.communication_style,
            primary_language: template.base_config.primary_language,
            greeting_prefix: template.base_config.greeting_prefix,
            technical_depth: template.base_config.technical_depth,
            response_format: template.base_config.response_format,
            // Personality and behavior
            personality_traits: {
                ...template.personality_traits,
                ...customConfig.personality_traits
            },
            workflow_steps: customConfig.workflow_steps || template.workflow_steps,
            tool_access: {
                ...template.tool_access,
                ...customConfig.tool_access
            },
            communication_rules: {
                ...this.identityManifest.agent_specifications.identity_mandate,
                ...template.communication_rules,
                ...customConfig.communication_rules
            },
            // Custom configuration
            config: {
                max_tokens: customConfig.max_tokens || 2000,
                temperature: customConfig.temperature || 0.7,
                capabilities: customConfig.capabilities || [],
                ...customConfig.additional_config
            },
            ui_config: customConfig.ui_config || {
                icon: "Bot",
                color: "#f59e0b",
                showInDashboard: true
            },
            metadata: {
                created_by: "agent_factory",
                version: "1.0.0",
                template: agentType,
                ...customConfig.metadata
            }
        };

        // Validate identity integrity
        this.validateIdentityIntegrity(agentConfig);

        return agentConfig;
    }

    // Validate that agent maintains core identity
    validateIdentityIntegrity(agentConfig) {
        const mandate = this.identityManifest.agent_specifications.identity_mandate;
        
        // Check that core identity elements are preserved
        if (agentConfig.primary_language !== "bn") {
            throw new Error("Agent must use Bengali as primary language");
        }
        
        if (!agentConfig.greeting_prefix.includes("ভাইয়া") && !agentConfig.greeting_prefix.includes("কলিজা")) {
            throw new Error("Agent must use proper Bengali greeting prefix");
        }
        
        // Check that prohibitions are maintained
        const prohibitions = mandate.prohibitions;
        for (const prohibition of prohibitions) {
            if (agentConfig.communication_rules[prohibition.replace(/\s+/g, '_').toLowerCase()] === false) {
                throw new Error(`Agent violates core prohibition: ${prohibition}`);
            }
        }
        
        return true;
    }

    // Get available agent templates
    getAvailableTemplates() {
        return Object.keys(this.agentTemplates);
    }

    // Get template details
    getTemplateDetails(templateName) {
        return this.agentTemplates[templateName] || null;
    }

    // Create agent with full configuration from database format
    createAgentFromDatabaseRecord(dbRecord) {
        const agentConfig = {
            id: dbRecord.id,
            name: dbRecord.name,
            display_name: dbRecord.display_name,
            type: dbRecord.type,
            persona_name: dbRecord.persona_name,
            description: dbRecord.description,
            status: dbRecord.status,
            sort_order: dbRecord.sort_order,
            is_visible: dbRecord.is_visible,
            category: dbRecord.category,
            tags: dbRecord.tags ? JSON.parse(dbRecord.tags) : null,
            config: dbRecord.config ? JSON.parse(dbRecord.config) : {},
            ui_config: dbRecord.ui_config ? JSON.parse(dbRecord.ui_config) : {},
            request_count: dbRecord.request_count,
            active_sessions: dbRecord.active_sessions,
            metadata: dbRecord.metadata ? JSON.parse(dbRecord.metadata) : {},
            created_at: dbRecord.created_at,
            updated_at: dbRecord.updated_at,
            is_enabled: dbRecord.is_enabled,
            last_active: dbRecord.last_active,
            auto_restart: dbRecord.auto_restart,
            communication_style: dbRecord.communication_style,
            primary_language: dbRecord.primary_language,
            greeting_prefix: dbRecord.greeting_prefix,
            technical_depth: dbRecord.technical_depth,
            response_format: dbRecord.response_format,
            personality_traits: dbRecord.personality_traits ? JSON.parse(dbRecord.personality_traits) : {},
            workflow_steps: dbRecord.workflow_steps ? JSON.parse(dbRecord.workflow_steps) : [],
            tool_access: dbRecord.tool_access ? JSON.parse(dbRecord.tool_access) : {},
            communication_rules: dbRecord.communication_rules ? JSON.parse(dbRecord.communication_rules) : {},
            is_zombie_coder: dbRecord.is_zombie_coder
        };

        return agentConfig;
    }
}

// Export for use in other modules
module.exports = AgentFactory;

// Example usage:
/*
const factory = new AgentFactory();

// Create a custom development agent
const customAgent = factory.createAgent(
    "Custom Code Assistant",
    "development_assistant",
    {
        description: "Specialized for React development",
        capabilities: ["react", "javascript", "frontend"],
        max_tokens: 2500,
        personality_traits: {
            specialization: "frontend_development"
        }
    }
);

console.log("Created agent:", customAgent);
*/