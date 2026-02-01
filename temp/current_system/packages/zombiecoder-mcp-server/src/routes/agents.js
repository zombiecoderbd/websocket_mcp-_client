// Agent Configuration API Routes
// REST API for dynamic agent management and configuration

const express = require('express');
const router = express.Router();
const AgentFactory = require('../AgentFactory');
const IdentityAnchoringSystem = require('../IdentityAnchoringSystem');

// Initialize systems
const agentFactory = new AgentFactory();
const identityAnchoring = new IdentityAnchoringSystem();

// In-memory storage for demonstration (in production, use database)
let agentsStore = new Map();
let nextAgentId = 1;

// Middleware for request validation
const validateAgentRequest = (req, res, next) => {
    const { name, type } = req.body;
    
    if (!name) {
        return res.status(400).json({
            success: false,
            error: "Agent name is required"
        });
    }
    
    if (!type) {
        return res.status(400).json({
            success: false,
            error: "Agent type is required"
        });
    }
    
    const availableTypes = agentFactory.getAvailableTemplates();
    if (!availableTypes.includes(type)) {
        return res.status(400).json({
            success: false,
            error: `Invalid agent type. Available types: ${availableTypes.join(', ')}`
        });
    }
    
    next();
};

// GET /api/agents - List all agents
router.get('/', async (req, res) => {
    try {
        // In production, fetch from database
        const agents = Array.from(agentsStore.values()).map(agent => ({
            id: agent.id,
            name: agent.name,
            type: agent.type,
            status: agent.status,
            primary_language: agent.primary_language,
            greeting_prefix: agent.greeting_prefix,
            is_zombie_coder: agent.is_zombie_coder,
            created_at: agent.created_at
        }));
        
        res.json({
            success: true,
            data: agents,
            count: agents.length
        });
    } catch (error) {
        console.error('Error fetching agents:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch agents',
            details: error.message
        });
    }
});

// GET /api/agents/:id - Get specific agent
router.get('/:id', async (req, res) => {
    try {
        const agentId = parseInt(req.params.id);
        const agent = agentsStore.get(agentId);
        
        if (!agent) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found'
            });
        }
        
        // Get identity status
        const identityStatus = identityAnchoring.getIdentityStatus(agentId);
        
        res.json({
            success: true,
            data: {
                ...agent,
                identity_status: identityStatus
            }
        });
    } catch (error) {
        console.error('Error fetching agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch agent',
            details: error.message
        });
    }
});

// POST /api/agents/create - Create new agent
router.post('/create', validateAgentRequest, async (req, res) => {
    try {
        const { name, type, description, customConfig = {} } = req.body;
        
        // Create agent using factory
        const agentConfig = agentFactory.createAgent(name, type, {
            description,
            ...customConfig
        });
        
        // Assign ID and timestamps
        const agentId = nextAgentId++;
        const newAgent = {
            id: agentId,
            ...agentConfig,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // Anchor identity
        const identityAnchor = identityAnchoring.anchorAgentIdentity(newAgent);
        
        // Store agent
        agentsStore.set(agentId, newAgent);
        
        res.status(201).json({
            success: true,
            data: {
                agent: newAgent,
                identity_anchor: identityAnchor
            },
            message: 'Agent created successfully'
        });
    } catch (error) {
        console.error('Error creating agent:', error);
        res.status(400).json({
            success: false,
            error: 'Failed to create agent',
            details: error.message
        });
    }
});

// PUT /api/agents/:id - Update agent configuration
router.put('/:id', async (req, res) => {
    try {
        const agentId = parseInt(req.params.id);
        const agent = agentsStore.get(agentId);
        
        if (!agent) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found'
            });
        }
        
        const updates = req.body;
        
        // Prevent modification of core identity fields
        const protectedFields = [
            'primary_language',
            'greeting_prefix', 
            'is_zombie_coder',
            'communication_rules' // Partial protection
        ];
        
        for (const field of protectedFields) {
            if (updates[field] !== undefined) {
                if (field === 'communication_rules') {
                    // Allow adding rules but not removing core prohibitions
                    const coreProhibitions = identityAnchoring.identityManifest
                        .agent_specifications.identity_mandate.prohibitions;
                    for (const prohibition of coreProhibitions) {
                        const key = prohibition.replace(/\s+/g, '_').toLowerCase();
                        if (updates[field][key] === false) {
                            return res.status(400).json({
                                success: false,
                                error: `Cannot modify core prohibition: ${prohibition}`
                            });
                        }
                    }
                } else {
                    return res.status(400).json({
                        success: false,
                        error: `Cannot modify protected field: ${field}`
                    });
                }
            }
        }
        
        // Apply updates
        const updatedAgent = {
            ...agent,
            ...updates,
            updated_at: new Date().toISOString()
        };
        
        // Re-validate identity
        const validation = identityAnchoring.validateAgentIdentity(updatedAgent);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                error: 'Update would violate identity integrity',
                validation_errors: validation.errors
            });
        }
        
        // Update anchor
        identityAnchoring.anchorAgentIdentity(updatedAgent);
        
        // Store updated agent
        agentsStore.set(agentId, updatedAgent);
        
        res.json({
            success: true,
            data: updatedAgent,
            message: 'Agent updated successfully'
        });
    } catch (error) {
        console.error('Error updating agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update agent',
            details: error.message
        });
    }
});

// DELETE /api/agents/:id - Delete agent
router.delete('/:id', async (req, res) => {
    try {
        const agentId = parseInt(req.params.id);
        const agent = agentsStore.get(agentId);
        
        if (!agent) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found'
            });
        }
        
        // Remove identity anchor
        identityAnchoring.anchorPoints.delete(agentId);
        
        // Remove agent
        agentsStore.delete(agentId);
        
        res.json({
            success: true,
            message: 'Agent deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete agent',
            details: error.message
        });
    }
});

// GET /api/agents/:id/identity - Get agent identity information
router.get('/:id/identity', async (req, res) => {
    try {
        const agentId = parseInt(req.params.id);
        const agent = agentsStore.get(agentId);
        
        if (!agent) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found'
            });
        }
        
        const identityStatus = identityAnchoring.getIdentityStatus(agentId);
        const validation = identityAnchoring.validateAgentIdentity(agent);
        
        res.json({
            success: true,
            data: {
                agent_identity: {
                    name: agent.name,
                    primary_language: agent.primary_language,
                    greeting_prefix: agent.greeting_prefix,
                    is_zombie_coder: agent.is_zombie_coder,
                    communication_style: agent.communication_style,
                    technical_depth: agent.technical_depth
                },
                identity_status: identityStatus,
                validation_result: validation,
                core_mandate: identityAnchoring.identityManifest.agent_specifications.identity_mandate
            }
        });
    } catch (error) {
        console.error('Error fetching identity:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch identity information',
            details: error.message
        });
    }
});

// POST /api/agents/:id/validate - Validate agent identity integrity
router.post('/:id/validate', async (req, res) => {
    try {
        const agentId = parseInt(req.params.id);
        const agent = agentsStore.get(agentId);
        
        if (!agent) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found'
            });
        }
        
        const validation = identityAnchoring.validateAgentIdentity(agent);
        
        res.json({
            success: true,
            data: validation
        });
    } catch (error) {
        console.error('Error validating agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to validate agent',
            details: error.message
        });
    }
});

// POST /api/agents/:id/restore - Restore compromised identity
router.post('/:id/restore', async (req, res) => {
    try {
        const agentId = parseInt(req.params.id);
        
        const restoredAgent = identityAnchoring.restoreAgentIdentity(agentId);
        
        // Update stored agent
        agentsStore.set(agentId, restoredAgent);
        
        res.json({
            success: true,
            data: restoredAgent,
            message: 'Agent identity restored successfully'
        });
    } catch (error) {
        console.error('Error restoring identity:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to restore agent identity',
            details: error.message
        });
    }
});

// GET /api/agents/templates - Get available agent templates
router.get('/templates', async (req, res) => {
    try {
        const templates = agentFactory.getAvailableTemplates();
        const templateDetails = {};
        
        for (const template of templates) {
            templateDetails[template] = agentFactory.getTemplateDetails(template);
        }
        
        res.json({
            success: true,
            data: {
                available_templates: templates,
                template_details: templateDetails
            }
        });
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch templates',
            details: error.message
        });
    }
});

// GET /api/agents/identity/status - Get overall identity system status
router.get('/identity/status', async (req, res) => {
    try {
        const allAnchors = identityAnchoring.getAllIdentityAnchors();
        const validAnchors = allAnchors.filter(anchor => anchor.validation_status === 'valid');
        const invalidAnchors = allAnchors.filter(anchor => anchor.validation_status !== 'valid');
        
        res.json({
            success: true,
            data: {
                total_agents: agentsStore.size,
                total_anchors: allAnchors.length,
                valid_identities: validAnchors.length,
                invalid_identities: invalidAnchors.length,
                identity_system_status: invalidAnchors.length === 0 ? 'healthy' : 'degraded',
                violations: invalidAnchors.map(anchor => ({
                    agent_id: anchor.agent_id,
                    errors: anchor.violation_errors,
                    timestamp: anchor.violation_timestamp
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching identity status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch identity status',
            details: error.message
        });
    }
});

module.exports = router;