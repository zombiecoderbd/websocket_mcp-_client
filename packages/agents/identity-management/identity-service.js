// Agent Identity and Metadata Management Service
// Handles agent personal identity, persona management, and metadata tracking

class AgentIdentityService {
  constructor(config = {}) {
    this.config = {
      defaultIdentity: config.defaultIdentity || {
        system_identity: {
          name: "ZombieCoder",
          owner: "Sahon Srabon",
          organization: "Developer Zone",
          location: "Dhaka, Bangladesh"
        }
      },
      personaTypes: config.personaTypes || ['professional', 'mentor', 'technical'],
      enableMetadataTracking: config.enableMetadataTracking !== false,
      metadataStoragePath: config.metadataStoragePath || './temp/agent-metadata.json'
    };
    
    this.identityCache = new Map();
    this.personas = new Map();
    this.sessionMetadata = new Map();
    this.systemIdentity = this.config.defaultIdentity;
  }

  /**
   * Initialize the identity service with database connection
   */
  async initialize(dbConnection) {
    this.dbConnection = dbConnection;
    
    // Load system identity from database if available
    await this.loadSystemIdentity();
    
    // Load agent personas from database
    await this.loadAgentPersonas();
    
    console.log('✅ Agent Identity Service initialized');
  }

  /**
   * Load system identity from database
   */
  async loadSystemIdentity() {
    try {
      if (this.dbConnection) {
        const results = await this.dbConnection.executeQuery(
          `SELECT setting_key, setting_value FROM system_settings 
           WHERE setting_key LIKE 'system_%'`
        );

        if (results && results.length > 0) {
          const identity = { system_identity: {} };
          results.forEach((row) => {
            const key = row.setting_key.replace('system_', '');
            identity.system_identity[key] = row.setting_value;
          });

          // Ensure required fields exist
          identity.system_identity.name = identity.system_identity.name || this.config.defaultIdentity.system_identity.name;
          identity.system_identity.owner = identity.system_identity.owner || this.config.defaultIdentity.system_identity.owner;
          identity.system_identity.organization = identity.system_identity.organization || this.config.defaultIdentity.system_identity.organization;
          identity.system_identity.location = identity.system_identity.location || this.config.defaultIdentity.system_identity.location;

          this.systemIdentity = identity;
          console.log('✅ Loaded system identity from database');
        }
      }
    } catch (error) {
      console.error('⚠️ Error loading system identity from database:', error);
      // Fallback to default identity
      this.systemIdentity = this.config.defaultIdentity;
    }
  }

  /**
   * Load agent personas from database
   */
  async loadAgentPersonas() {
    try {
      if (this.dbConnection) {
        const results = await this.dbConnection.executeQuery(
          `SELECT id, name, persona_name, description, config, metadata FROM agents 
           WHERE type IN ('editor', 'master', 'chatbot')`
        );

        if (results && results.length > 0) {
          results.forEach((agent) => {
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
          
          console.log(`✅ Loaded ${results.length} agent personas from database`);
        }
      }
    } catch (error) {
      console.error('⚠️ Error loading agent personas from database:', error);
    }
  }

  /**
   * Get system identity
   */
  getSystemIdentity() {
    return this.systemIdentity;
  }

  /**
   * Get agent persona by ID
   */
  getAgentPersona(agentId) {
    return this.personas.get(agentId) || null;
  }

  /**
   * Get all available agent personas
   */
  getAllAgentPersonas() {
    return Array.from(this.personas.values());
  }

  /**
   * Create a new agent persona
   */
  async createAgentPersona(personaData) {
    try {
      const persona = {
        id: Date.now(), // In a real implementation, this would be a proper ID
        name: personaData.name,
        personaName: personaData.personaName || personaData.name,
        description: personaData.description || 'AI Assistant',
        config: personaData.config || {},
        metadata: {
          ...personaData.metadata,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        }
      };

      // Store in database if available
      if (this.dbConnection) {
        await this.dbConnection.executeQuery(
          `INSERT INTO agents (name, type, persona_name, description, config, metadata, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            persona.name,
            personaData.type || 'custom',
            persona.personaName,
            persona.description,
            JSON.stringify(persona.config),
            JSON.stringify(persona.metadata),
            'active'
          ]
        );

        // Get the actual ID from the database
        const results = await this.dbConnection.executeQuery(
          'SELECT id FROM agents WHERE name = ? ORDER BY created_at DESC LIMIT 1',
          [persona.name]
        );

        if (results && results.length > 0) {
          persona.id = results[0].id;
        }
      }

      this.personas.set(persona.id, persona);
      return persona;
    } catch (error) {
      console.error('❌ Error creating agent persona:', error);
      throw error;
    }
  }

  /**
   * Update agent persona
   */
  async updateAgentPersona(agentId, updateData) {
    try {
      const existingPersona = this.personas.get(agentId);
      if (!existingPersona) {
        throw new Error(`Agent persona with ID ${agentId} not found`);
      }

      const updatedPersona = {
        ...existingPersona,
        ...updateData,
        config: { ...existingPersona.config, ...(updateData.config || {}) },
        metadata: { 
          ...existingPersona.metadata, 
          ...(updateData.metadata || {}),
          updatedAt: new Date().toISOString()
        }
      };

      // Update in database if available
      if (this.dbConnection) {
        await this.dbConnection.executeQuery(
          `UPDATE agents 
           SET name = ?, persona_name = ?, description = ?, config = ?, metadata = ?
           WHERE id = ?`,
          [
            updatedPersona.name,
            updatedPersona.personaName,
            updatedPersona.description,
            JSON.stringify(updatedPersona.config),
            JSON.stringify(updatedPersona.metadata),
            agentId
          ]
        );
      }

      this.personas.set(agentId, updatedPersona);
      return updatedPersona;
    } catch (error) {
      console.error('❌ Error updating agent persona:', error);
      throw error;
    }
  }

  /**
   * Create session metadata
   */
  createSessionMetadata(sessionData) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const sessionMetadata = {
      sessionId,
      ...sessionData,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: 'active',
      metadata: {
        ...sessionData.metadata,
        sessionType: sessionData.sessionType || 'standard',
        clientInfo: sessionData.clientInfo || {},
        context: sessionData.context || {}
      }
    };

    this.sessionMetadata.set(sessionId, sessionMetadata);
    return sessionMetadata;
  }

  /**
   * Update session metadata
   */
  updateSessionMetadata(sessionId, updateData) {
    const existingSession = this.sessionMetadata.get(sessionId);
    if (!existingSession) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }

    const updatedSession = {
      ...existingSession,
      ...updateData,
      metadata: { 
        ...existingSession.metadata, 
        ...(updateData.metadata || {}),
        updatedAt: new Date().toISOString()
      }
    };

    this.sessionMetadata.set(sessionId, updatedSession);
    return updatedSession;
  }

  /**
   * Get session metadata
   */
  getSessionMetadata(sessionId) {
    return this.sessionMetadata.get(sessionId) || null;
  }

  /**
   * End session
   */
  endSession(sessionId) {
    const session = this.sessionMetadata.get(sessionId);
    if (session) {
      session.status = 'ended';
      session.endedAt = new Date().toISOString();
      this.sessionMetadata.set(sessionId, session);
      return session;
    }
    return null;
  }

  /**
   * Get identity with persona and session metadata
   */
  getFullIdentity(agentId, sessionId) {
    const systemIdentity = this.getSystemIdentity();
    const persona = this.getAgentPersona(agentId);
    const sessionMetadata = this.getSessionMetadata(sessionId);

    return {
      systemIdentity,
      persona: persona || { id: agentId, name: 'Unknown Agent', personaName: 'default', description: 'Generic AI Assistant' },
      sessionMetadata: sessionMetadata || { sessionId: 'unknown', timestamp: new Date().toISOString() },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Serialize identity for transmission
   */
  serializeIdentity(identityData) {
    return JSON.stringify(identityData, null, 2);
  }

  /**
   * Deserialize identity from received data
   */
  deserializeIdentity(identityString) {
    try {
      return JSON.parse(identityString);
    } catch (error) {
      console.error('❌ Error deserializing identity:', error);
      return null;
    }
  }
}

module.exports = { AgentIdentityService };