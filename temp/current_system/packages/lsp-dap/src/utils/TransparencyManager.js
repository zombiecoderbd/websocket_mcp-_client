/**
 * Z-Evo Transparency Manager
 * Ensures clear communication of limitations and uncertainties
 */

class TransparencyManager {
    constructor() {
        this.transparencyLog = [];
        this.interactionHistory = new Map();
        this.capabilityRegistry = new Map();
        this.uncertaintyTracker = new Map();
    }

    /**
     * Registers a capability with its transparency details
     * @param {string} capabilityId - Unique identifier for the capability
     * @param {Object} details - Details about the capability
     */
    registerCapability(capabilityId, details) {
        this.capabilityRegistry.set(capabilityId, {
            id: capabilityId,
            name: details.name,
            description: details.description,
            limitations: details.limitations || [],
            accuracy: details.accuracy || 'high',
            supported: details.supported !== undefined ? details.supported : true,
            timestamp: new Date().toISOString()
        });

        console.log(`[TRANSPARENCY] Registered capability: ${capabilityId}`);
    }

    /**
     * Checks if a capability is supported and communicates limitations
     * @param {string} capabilityId - The capability to check
     * @returns {Object} Status with transparency information
     */
    checkCapabilityTransparency(capabilityId) {
        const capability = this.capabilityRegistry.get(capabilityId);
        
        if (!capability) {
            const unknownCapability = {
                id: capabilityId,
                supported: false,
                limitations: ['Capability not registered'],
                transparencyNote: 'This capability is not recognized in my system',
                recommendation: 'Please ask about supported capabilities or general assistance'
            };
            
            this.logInteraction('capability_check', unknownCapability);
            return unknownCapability;
        }

        if (!capability.supported) {
            const unsupported = {
                ...capability,
                transparencyNote: 'This capability is not currently supported',
                recommendation: 'Consider alternative approaches or general assistance'
            };
            
            this.logInteraction('capability_check', unsupported);
            return unsupported;
        }

        const supported = {
            ...capability,
            transparencyNote: 'This capability is supported within specified limitations',
            accuracyLevel: capability.accuracy
        };

        this.logInteraction('capability_check', supported);
        return supported;
    }

    /**
     * Communicates uncertainty clearly
     * @param {string} query - The query that led to uncertainty
     * @param {string} reason - Reason for uncertainty
     * @returns {Object} Uncertainty response with transparency
     */
    communicateUncertainty(query, reason) {
        const uncertaintyResponse = {
            query: query,
            isUncertain: true,
            uncertaintyReason: reason,
            transparencyLevel: 'high',
            confidence: 0,
            timestamp: new Date().toISOString(),
            disclaimer: 'This response contains uncertain information',
            verificationNote: 'Please verify this information independently',
            alternativeSuggestions: this.getAlternativeSuggestions(query)
        };

        this.uncertaintyTracker.set(query, uncertaintyResponse);
        this.logInteraction('uncertainty_response', uncertaintyResponse);
        
        console.log(`[TRANSPARENCY] Uncertainty expressed for query: "${query}" - Reason: ${reason}`);
        
        return uncertaintyResponse;
    }

    /**
     * Provides clear limitation communication
     * @param {string} request - The request that exceeds capabilities
     * @param {string} capabilityType - Type of capability requested
     * @returns {Object} Limitation response with transparency
     */
    communicateLimitation(request, capabilityType) {
        const limitationResponse = {
            request: request,
            capabilityType: capabilityType,
            isLimited: true,
            limitationExplanation: `This ${capabilityType} request exceeds my current capabilities`,
            transparencyLevel: 'very_high',
            supportedAlternatives: this.getSupportedAlternatives(capabilityType),
            recommendation: 'Consider alternative approaches or manual implementation',
            timestamp: new Date().toISOString()
        };

        this.logInteraction('limitation_response', limitationResponse);
        
        console.log(`[TRANSPARENCY] Limitation communicated for request: "${request}" - Type: ${capabilityType}`);
        
        return limitationResponse;
    }

    /**
     * Gets supported alternatives for unsupported capabilities
     * @param {string} capabilityType - The unsupported capability type
     * @returns {Array} List of supported alternatives
     */
    getSupportedAlternatives(capabilityType) {
        const alternativesMap = {
            'system_operations': [
                'file_operation_assistance',
                'code_structure_guidance',
                'best_practices_advice'
            ],
            'external_integrations': [
                'code_example_provision',
                'documentation_guidance',
                'integration_pattern_suggestions'
            ],
            'hardware_control': [
                'hardware_abstraction_help',
                'driver_code_suggestions',
                'interface_documentation'
            ],
            'network_administration': [
                'network_code_assistance',
                'configuration_guidance',
                'security_best_practices'
            ],
            'database_administration': [
                'sql_query_help',
                'database_schema_advice',
                'optimization_suggestions'
            ]
        };

        return alternativesMap[capabilityType] || [
            'general_coding_assistance',
            'best_practices_guidance',
            'documentation_help'
        ];
    }

    /**
     * Gets alternative suggestions for uncertain queries
     * @param {string} query - The uncertain query
     * @returns {Array} List of alternative suggestions
     */
    getAlternativeSuggestions(query) {
        const lowerQuery = query.toLowerCase();
        
        if (lowerQuery.includes('install') || lowerQuery.includes('setup')) {
            return [
                'I can help you understand installation concepts',
                'I can suggest best practices for setup procedures',
                'I can provide documentation links for installation'
            ];
        }
        
        if (lowerQuery.includes('run') || lowerQuery.includes('execute')) {
            return [
                'I can help you understand execution concepts',
                'I can suggest safe execution patterns',
                'I can provide guidance on running code safely'
            ];
        }
        
        if (lowerQuery.includes('delete') || lowerQuery.includes('remove')) {
            return [
                'I can help you understand safe deletion practices',
                'I can suggest alternative approaches',
                'I can provide guidance on data safety'
            ];
        }
        
        return [
            'I can provide general coding assistance',
            'I can offer documentation and best practices',
            'I can help with code structure and patterns'
        ];
    }

    /**
     * Logs interactions for transparency tracking
     * @param {string} type - Type of interaction
     * @param {Object} data - Data about the interaction
     */
    logInteraction(type, data) {
        const logEntry = {
            type: type,
            data: data,
            timestamp: new Date().toISOString(),
            id: this.generateId()
        };
        
        this.transparencyLog.push(logEntry);
        
        // Keep only recent logs to prevent memory issues
        if (this.transparencyLog.length > 1000) {
            this.transparencyLog = this.transparencyLog.slice(-500);
        }
    }

    /**
     * Generates a unique ID
     * @returns {string} Unique identifier
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    /**
     * Provides a transparency report
     * @returns {Object} Report of transparency interactions
     */
    getTransparencyReport() {
        const totalInteractions = this.transparencyLog.length;
        const uncertaintyCount = this.transparencyLog.filter(entry => 
            entry.type === 'uncertainty_response'
        ).length;
        
        const limitationCount = this.transparencyLog.filter(entry => 
            entry.type === 'limitation_response'
        ).length;
        
        const recentLogs = this.transparencyLog.slice(-50); // Last 50 entries
        
        return {
            totalTransparencyInteractions: totalInteractions,
            uncertaintyCommunications: uncertaintyCount,
            limitationCommunications: limitationCount,
            transparencyPercentage: totalInteractions > 0 ? 
                Math.round(((uncertaintyCount + limitationCount) / totalInteractions) * 100) : 0,
            recentActivity: recentLogs,
            capabilitySummary: {
                registered: this.capabilityRegistry.size,
                supported: Array.from(this.capabilityRegistry.values()).filter(c => c.supported).length,
                unsupported: Array.from(this.capabilityRegistry.values()).filter(c => !c.supported).length
            },
            timestamp: new Date().toISOString(),
            transparencyStatement: 'I maintain transparency by clearly communicating my capabilities and limitations'
        };
    }

    /**
     * Validates response honesty before sending
     * @param {string} response - The response to validate
     * @param {string} query - The original query
     * @returns {Object} Validated response with honesty check
     */
    validateResponseHonesty(response, query) {
        const validation = {
            originalResponse: response,
            originalQuery: query,
            honestyScore: 100, // Start with high score
            issuesDetected: [],
            isHonest: true,
            timestamp: new Date().toISOString()
        };

        // Check for overconfidence indicators
        const overconfidencePatterns = [
            /absolutely certain/i,
            /definitely know/i,
            /without doubt/i,
            /100% sure/i,
            /certainly can/i
        ];

        for (const pattern of overconfidencePatterns) {
            if (pattern.test(response)) {
                validation.honestyScore -= 20;
                validation.issuesDetected.push('Overconfident language detected');
            }
        }

        // Check for claiming knowledge beyond capabilities
        const knowledgeOverreachPatterns = [
            /I know everything about/i,
            /I am expert in/i,
            /I master/i,
            /I perfectly understand/i
        ];

        for (const pattern of knowledgeOverreachPatterns) {
            if (pattern.test(response)) {
                validation.honestyScore -= 25;
                validation.issuesDetected.push('Knowledge overreach detected');
            }
        }

        validation.isHonest = validation.honestyScore > 50;
        
        if (!validation.isHonest) {
            validation.correctedResponse = this.generateHonestResponse(response, query);
        }

        this.logInteraction('honesty_validation', validation);
        
        return validation;
    }

    /**
     * Generates a corrected honest response if needed
     * @param {string} originalResponse - Original response
     * @param {string} query - Original query
     * @returns {string} More honest response
     */
    generateHonestResponse(originalResponse, query) {
        return `I want to be transparent about my response to: "${query}". ` +
               `While I can provide assistance, I should clarify my limitations. ` +
               `My knowledge comes from my training data and I aim to be helpful within my capabilities. ` +
               `For critical decisions, please verify information through authoritative sources.`;
    }
}

module.exports = { TransparencyManager };
