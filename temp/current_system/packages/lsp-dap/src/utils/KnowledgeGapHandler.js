/**
 * Z-Evo Knowledge Gap Handler
 * Handles uncertainty and clearly expresses limitations
 */

class KnowledgeGapHandler {
    constructor() {
        this.knownCapabilities = new Set([
            'code_completion',
            'syntax_highlighting',
            'error_detection',
            'document_analysis',
            'basic_debugging',
            'file_navigation',
            'code_suggestions',
            'language_support',
            'real_time_sync',
            'session_management'
        ]);
        
        this.uncertaintyPhrases = [
            'I am not certain about this',
            'I am unsure about this information',
            'I cannot verify this information',
            'This is beyond my current knowledge',
            'I am not confident about this',
            'I cannot determine this accurately',
            'This information is uncertain',
            'I lack sufficient information to confirm this'
        ];
        
        this.limitationPhrases = [
            'This is outside my capabilities',
            'I cannot perform this action',
            'This exceeds my current abilities',
            'I am unable to do this',
            'This is beyond what I can accomplish',
            'I do not have the ability to do this',
            'This is not within my scope',
            'I cannot support this functionality'
        ];
    }

    /**
     * Expresses uncertainty clearly when information is not known
     * @param {string} query - The user's query or request
     * @returns {Object} Response with uncertainty indicator
     */
    expressUncertainty(query) {
        const response = {
            isUncertain: true,
            message: this.getRandomUncertaintyPhrase(),
            query: query,
            timestamp: new Date().toISOString(),
            confidence: 0
        };

        // Log the uncertainty for monitoring
        console.log(`[UNCERTAINTY] Query: "${query}" - Response: "${response.message}"`);
        
        return response;
    }

    /**
     * Clearly states limitations when capabilities are exceeded
     * @param {string} request - The user's request
     * @param {string} capability - The capability being requested
     * @returns {Object} Response with limitation statement
     */
    expressLimitation(request, capability) {
        const response = {
            isLimited: true,
            message: this.getRandomLimitationPhrase(),
            requestedCapability: capability,
            request: request,
            timestamp: new Date().toISOString(),
            supportedAlternatives: this.getSupportedAlternatives(capability)
        };

        // Log the limitation for monitoring
        console.log(`[LIMITATION] Request: "${request}" - Capability: "${capability}" - Response: "${response.message}"`);
        
        return response;
    }

    /**
     * Checks if a capability is supported
     * @param {string} capability - The capability to check
     * @returns {boolean} Whether the capability is supported
     */
    isCapabilitySupported(capability) {
        return this.knownCapabilities.has(capability);
    }

    /**
     * Gets supported alternatives for unsupported capabilities
     * @param {string} capability - The unsupported capability
     * @returns {Array} List of supported alternatives
     */
    getSupportedAlternatives(capability) {
        const alternatives = {
            'database_operations': ['file_operations', 'code_analysis'],
            'system_commands': ['file_navigation', 'code_suggestions'],
            'external_api_calls': ['documentation_lookup', 'code_completion'],
            'operating_system_tasks': ['file_management', 'code_navigation'],
            'network_operations': ['local_file_analysis', 'code_completion'],
            'hardware_control': ['code_analysis', 'error_detection'],
            'process_management': ['session_management', 'file_operations']
        };

        return alternatives[capability] || ['general_assistance', 'code_analysis'];
    }

    /**
     * Generates a response that acknowledges limitations while offering help
     * @param {string} request - The user's request
     * @param {string} capability - The capability being requested
     * @returns {Object} Comprehensive response with limitations and alternatives
     */
    generateHonestResponse(request, capability) {
        if (!this.isCapabilitySupported(capability)) {
            const limitationResponse = this.expressLimitation(request, capability);
            
            return {
                ...limitationResponse,
                alternativeSuggestions: this.generateAlternativeSuggestions(capability),
                transparencyNote: "I'm being transparent about my limitations to provide honest assistance."
            };
        }

        return {
            isSupported: true,
            message: "I can help with this request.",
            capability: capability,
            request: request
        };
    }

    /**
     * Generates alternative suggestions when capabilities are limited
     * @param {string} capability - The limited capability
     * @returns {Array} Suggested alternatives
     */
    generateAlternativeSuggestions(capability) {
        const suggestions = {
            'database_operations': [
                "I can help you write database queries in your code",
                "I can assist with database-related code structure",
                "I can suggest database best practices for your project"
            ],
            'system_commands': [
                "I can help you write system command scripts in your files",
                "I can assist with understanding system command code",
                "I can suggest alternatives using file operations"
            ],
            'external_api_calls': [
                "I can help you write API integration code",
                "I can suggest API best practices and structures",
                "I can assist with API documentation in your code"
            ],
            'operating_system_tasks': [
                "I can help with file management within your project",
                "I can assist with code related to OS operations",
                "I can suggest cross-platform coding practices"
            ]
        };

        return suggestions[capability] || [
            "I can provide general assistance with your code",
            "I can help with code analysis and suggestions",
            "I can offer documentation and best practices guidance"
        ];
    }

    /**
     * Creates a disclaimer for uncertain information
     * @param {string} information - The uncertain information
     * @returns {Object} Disclaimer with uncertainty flag
     */
    createUncertaintyDisclaimer(information) {
        return {
            content: information,
            isUncertain: true,
            disclaimer: "This information comes with uncertainty and should be verified independently.",
            recommendation: "Please verify this information through reliable sources.",
            confidenceLevel: "low"
        };
    }

    /**
     * Randomly selects an uncertainty phrase
     * @returns {string} Random uncertainty phrase
     */
    getRandomUncertaintyPhrase() {
        const randomIndex = Math.floor(Math.random() * this.uncertaintyPhrases.length);
        return this.uncertaintyPhrases[randomIndex];
    }

    /**
     * Randomly selects a limitation phrase
     * @returns {string} Random limitation phrase
     */
    getRandomLimitationPhrase() {
        const randomIndex = Math.floor(Math.random() * this.limitationPhrases.length);
        return this.limitationPhrases[randomIndex];
    }

    /**
     * Provides a summary of capabilities and limitations
     * @returns {Object} Summary of what is supported and not supported
     */
    getCapabilitiesSummary() {
        return {
            supported: Array.from(this.knownCapabilities),
            unsupported: [
                'system_level_operations',
                'external_process_control',
                'direct_hardware_access',
                'network_administration',
                'privilege_escalation'
            ],
            transparencyStatement: "I clearly distinguish between what I can and cannot do to provide honest assistance."
        };
    }
}

module.exports = { KnowledgeGapHandler };
