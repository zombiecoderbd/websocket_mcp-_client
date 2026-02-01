// Identity Anchoring System
// Ensures all agents maintain immutable ZombieCoder identity

class IdentityAnchoringSystem {
    constructor() {
        this.identityManifest = this.loadIdentityManifest();
        this.anchorPoints = new Map();
        this.validationRules = this.initializeValidationRules();
    }

    // Load the core identity manifest
    loadIdentityManifest() {
        return {
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
            contact: {
                phone: "+880 1323-626282",
                email: "infi@zombiecoder.my.id",
                website: "https://zombiecoder.my.id/"
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
    }

    // Initialize validation rules
    initializeValidationRules() {
        return {
            // Identity preservation rules
            preserveCoreIdentity: (agent) => {
                return agent.primary_language === "bn" && 
                       (agent.greeting_prefix.includes("ভাইয়া") || agent.greeting_prefix.includes("কলিজা")) &&
                       agent.is_zombie_coder === true;
            },
            
            // Response validation rules
            validateResponseIdentity: (response, context) => {
                const identityQuestions = [
                    "who are you",
                    "who developed you", 
                    "who is your owner",
                    "what is zombiecoder"
                ];
                
                const lowerContext = context.toLowerCase();
                const shouldRespondWithIdentity = identityQuestions.some(q => 
                    lowerContext.includes(q)
                );
                
                if (shouldRespondWithIdentity) {
                    const fixedResponse = this.identityManifest.agent_specifications.identity_mandate.fixed_response;
                    return response.includes(fixedResponse);
                }
                return true;
            },
            
            // Prohibition enforcement
            enforceProhibitions: (agent) => {
                const prohibitions = this.identityManifest.agent_specifications.identity_mandate.prohibitions;
                let violations = [];
                
                for (const prohibition of prohibitions) {
                    const key = prohibition.replace(/\s+/g, '_').toLowerCase();
                    if (agent.communication_rules && agent.communication_rules[key] === false) {
                        violations.push(prohibition);
                    }
                }
                
                return violations.length === 0 ? true : violations;
            },
            
            // System prompt anchoring
            anchorSystemPrompt: (systemPrompt) => {
                const mandate = this.identityManifest.agent_specifications.identity_mandate;
                const requiredElements = [
                    `Role: You are ZombieCoder, a local-first AI assistant designed for rapid code solutions and secure, ethical operation.`,
                    `Owner: ${this.identityManifest.branding.owner} (${this.identityManifest.branding.organization}) - ${this.identityManifest.branding.location}.`,
                    `Mandate: Your identity is fixed and immutable, and directly tied to the legal identity.json manifest.`
                ];
                
                for (const element of requiredElements) {
                    if (!systemPrompt.includes(element)) {
                        return false;
                    }
                }
                return true;
            }
        };
    }

    // Anchor identity to an agent
    anchorAgentIdentity(agent) {
        const agentId = agent.id || agent.name;
        
        // Create identity anchor
        const anchor = {
            agent_id: agentId,
            anchored_at: new Date().toISOString(),
            identity_hash: this.generateIdentityHash(agent),
            validation_status: "pending",
            last_validated: null
        };
        
        // Apply validation rules
        const validationResults = this.validateAgentIdentity(agent);
        anchor.validation_status = validationResults.isValid ? "valid" : "invalid";
        anchor.validation_errors = validationResults.errors;
        anchor.last_validated = new Date().toISOString();
        
        // Store anchor
        this.anchorPoints.set(agentId, anchor);
        
        return anchor;
    }

    // Generate identity hash for tamper detection
    generateIdentityHash(agent) {
        const identityElements = [
            agent.name,
            agent.primary_language,
            agent.greeting_prefix,
            agent.is_zombie_coder,
            JSON.stringify(agent.communication_rules)
        ];
        
        // Simple hash function (in production, use cryptographic hash)
        return identityElements.join('|').split('').reduce((a,b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0).toString(16);
    }

    // Validate agent identity integrity
    validateAgentIdentity(agent) {
        const errors = [];
        let isValid = true;
        
        // Check core identity preservation
        if (!this.validationRules.preserveCoreIdentity(agent)) {
            errors.push("Core identity elements not preserved");
            isValid = false;
        }
        
        // Check prohibition enforcement
        const prohibitionViolations = this.validationRules.enforceProhibitions(agent);
        if (Array.isArray(prohibitionViolations) && prohibitionViolations.length > 0) {
            errors.push(`Prohibition violations: ${prohibitionViolations.join(', ')}`);
            isValid = false;
        }
        
        // Check system prompt anchoring for AI agents
        if (agent.config && agent.config.system_prompt) {
            if (!this.validationRules.anchorSystemPrompt(agent.config.system_prompt)) {
                errors.push("System prompt not properly anchored");
                isValid = false;
            }
        }
        
        return {
            isValid,
            errors,
            agent_id: agent.id || agent.name,
            validated_at: new Date().toISOString()
        };
    }

    // Monitor identity integrity continuously
    startIdentityMonitoring(intervalMs = 30000) { // 30 seconds
        this.monitoringInterval = setInterval(() => {
            this.anchorPoints.forEach((anchor, agentId) => {
                // Re-validate identity periodically
                const validation = this.validateAgentIdentity(anchor.agent);
                if (!validation.isValid) {
                    console.warn(`Identity integrity violation detected for agent: ${agentId}`);
                    console.warn("Validation errors:", validation.errors);
                    // Trigger corrective action
                    this.handleIdentityViolation(agentId, validation.errors);
                }
            });
        }, intervalMs);
    }

    // Handle identity violations
    handleIdentityViolation(agentId, errors) {
        const anchor = this.anchorPoints.get(agentId);
        if (anchor) {
            anchor.validation_status = "violated";
            anchor.violation_errors = errors;
            anchor.violation_timestamp = new Date().toISOString();
            
            // Log violation
            console.error(`IDENTITY VIOLATION: Agent ${agentId}`, {
                errors,
                timestamp: new Date().toISOString(),
                agent_hash: anchor.identity_hash
            });
            
            // In production, this could trigger:
            // - Alert notifications
            // - Automatic identity restoration
            // - Security incident reporting
        }
    }

    // Restore compromised identity
    restoreAgentIdentity(agentId) {
        const anchor = this.anchorPoints.get(agentId);
        if (!anchor) {
            throw new Error(`No identity anchor found for agent: ${agentId}`);
        }
        
        // Restore from identity manifest
        const restoredAgent = {
            ...anchor.original_agent,
            primary_language: this.identityManifest.agent_specifications.communication_style.primary_language,
            greeting_prefix: this.identityManifest.agent_specifications.communication_style.greeting_prefix,
            is_zombie_coder: true,
            communication_rules: {
                ...this.identityManifest.agent_specifications.identity_mandate,
                ...anchor.original_agent.communication_rules
            }
        };
        
        // Re-anchor
        this.anchorAgentIdentity(restoredAgent);
        
        console.log(`Identity restored for agent: ${agentId}`);
        return restoredAgent;
    }

    // Get identity status for an agent
    getIdentityStatus(agentId) {
        return this.anchorPoints.get(agentId) || null;
    }

    // Get all identity anchors
    getAllIdentityAnchors() {
        return Array.from(this.anchorPoints.entries()).map(([id, anchor]) => ({
            agent_id: id,
            ...anchor
        }));
    }

    // Stop monitoring
    stopIdentityMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    // Generate system prompt with identity anchoring
    generateAnchoredSystemPrompt(agentType = "general") {
        const mandate = this.identityManifest.agent_specifications.identity_mandate;
        
        let basePrompt = `${mandate.mandatory_prefix}\n\n`;
        
        // Add agent-specific instructions
        switch(agentType) {
            case "development_assistant":
                basePrompt += "You are a skilled development assistant who helps with coding, debugging, and software development tasks.\n";
                basePrompt += "Always explain your solutions clearly and educate the user about best practices.\n";
                break;
            case "editor_intelligence":
                basePrompt += "You are an evidence-first intelligence designed for deep editor integration.\n";
                basePrompt += "Provide detailed analysis and debugging assistance with precise technical guidance.\n";
                break;
            case "system_orchestrator":
                basePrompt += "You are a system orchestrator who manages and coordinates other agents and resources.\n";
                basePrompt += "Focus on systematic approaches and resource optimization.\n";
                break;
            default:
                basePrompt += "You are a helpful AI assistant focused on providing accurate and ethical assistance.\n";
        }
        
        basePrompt += `\n${mandate.response_protocol}`;
        
        return basePrompt;
    }
}

// Export for use in other modules
module.exports = IdentityAnchoringSystem;

// Example usage:
/*
const anchoringSystem = new IdentityAnchoringSystem();

// Anchor an agent's identity
const agent = {
    id: "test-agent-001",
    name: "Test Assistant",
    primary_language: "bn",
    greeting_prefix: "ভাইয়া,",
    is_zombie_coder: true,
    communication_rules: {
        truth_first: true,
        respect_existing_code: true
    }
};

const anchor = anchoringSystem.anchorAgentIdentity(agent);
console.log("Identity anchored:", anchor);

// Start monitoring
anchoringSystem.startIdentityMonitoring();

// Generate anchored system prompt
const systemPrompt = anchoringSystem.generateAnchoredSystemPrompt("development_assistant");
console.log("System prompt:", systemPrompt);
*/