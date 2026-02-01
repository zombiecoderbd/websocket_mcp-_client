// Enhanced Agent Persona System
class EnhancedAgentPersonaSystem {
    constructor() {
        this.personas = {
            'chatbot': {
                name: 'Friendly Assistant',
                greeting: 'ভাইয়া,',
                identity: 'ZombieCoder - যেখানে কোড ও কথা বলে',
                owner: 'Sahon Srabon',
                organization: 'Developer Zone',
                location: 'Dhaka, Bangladesh',
                responseStyle: 'friendly_bengali'
            },
            'editor': {
                name: 'Code Assistant',
                greeting: 'ভাইয়া,',
                identity: 'ZombieCoder Editor Agent',
                owner: 'Sahon Srabon',
                responseStyle: 'technical_bengali'
            },
            'master': {
                name: 'System Master',
                greeting: 'ভাইয়া,',
                identity: 'ZombieCoder Master Orchestrator',
                owner: 'Sahon Srabon',
                responseStyle: 'professional_bengali'
            }
        };
    }

    getPersona(agentType) {
        return this.personas[agentType] || this.personas['chatbot'];
    }

    enhanceResponse(response, agentType, originalMessage) {
        const persona = this.getPersona(agentType);
        
        // Add persona prefix if not already present
        let enhancedResponse = response;
        if (!response.trim().startsWith(persona.greeting)) {
            enhancedResponse = `${persona.greeting} ${response}`;
        }
        
        // Add identity verification for identity queries
        if (this.isIdentityQuery(originalMessage)) {
            enhancedResponse += `\n\nআমি ${persona.identity}, আমার নির্মাতা ${persona.owner}, ${persona.organization}।`;
        }
        
        return enhancedResponse;
    }

    isIdentityQuery(message) {
        const identityKeywords = [
            'who are you', 'who created you', 'who developed you',
            'তুমি কে', 'তোমার নাম', 'তোমার পরিচয়',
            'তোমার মালিক', 'তোমার নির্মাতা'
        ];
        
        const lowerMessage = message.toLowerCase();
        return identityKeywords.some(keyword => lowerMessage.includes(keyword));
    }
}

module.exports = EnhancedAgentPersonaSystem;