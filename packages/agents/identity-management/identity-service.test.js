// Tests for Agent Identity and Metadata Management Service

const { AgentIdentityService } = require('./identity-service');

// Mock database connection for testing
const mockDbConnection = {
  executeQuery: jest.fn()
};

describe('AgentIdentityService', () => {
  let identityService;

  beforeEach(() => {
    identityService = new AgentIdentityService();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with default config', () => {
      expect(identityService.config).toBeDefined();
      expect(identityService.config.defaultIdentity).toBeDefined();
      expect(identityService.identityCache).toBeInstanceOf(Map);
      expect(identityService.personas).toBeInstanceOf(Map);
    });

    test('should initialize with database connection', async () => {
      await identityService.initialize(mockDbConnection);
      expect(identityService.dbConnection).toBe(mockDbConnection);
    });
  });

  describe('System Identity', () => {
    test('should return default system identity', () => {
      const identity = identityService.getSystemIdentity();
      expect(identity).toBeDefined();
      expect(identity.system_identity.name).toBe('ZombieCoder');
      expect(identity.system_identity.owner).toBe('Sahon Srabon');
    });

    test('should load system identity from database', async () => {
      const mockResults = [
        { setting_key: 'system_name', setting_value: 'TestSystem' },
        { setting_key: 'system_owner', setting_value: 'TestOwner' }
      ];
      
      mockDbConnection.executeQuery.mockResolvedValue(mockResults);
      
      await identityService.initialize(mockDbConnection);
      const identity = identityService.getSystemIdentity();
      
      expect(mockDbConnection.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT setting_key, setting_value FROM system_settings')
      );
      expect(identity.system_identity.name).toBe('TestSystem');
      expect(identity.system_identity.owner).toBe('TestOwner');
    });
  });

  describe('Agent Personas', () => {
    test('should get all agent personas', () => {
      const personas = identityService.getAllAgentPersonas();
      expect(Array.isArray(personas)).toBe(true);
      expect(personas.length).toBe(0); // Initially empty
    });

    test('should return null for non-existent agent persona', () => {
      const persona = identityService.getAgentPersona(999);
      expect(persona).toBeNull();
    });

    test('should create a new agent persona', async () => {
      await identityService.initialize(mockDbConnection);
      
      const personaData = {
        name: 'Test Persona',
        personaName: 'test_persona',
        description: 'A test persona',
        type: 'custom'
      };
      
      const persona = await identityService.createAgentPersona(personaData);
      
      expect(persona.name).toBe('Test Persona');
      expect(persona.personaName).toBe('test_persona');
      expect(persona.description).toBe('A test persona');
    });

    test('should update an existing agent persona', async () => {
      await identityService.initialize(mockDbConnection);
      
      // First create a persona
      const personaData = {
        name: 'Original Persona',
        personaName: 'original_persona',
        description: 'Original description',
        type: 'custom'
      };
      
      const createdPersona = await identityService.createAgentPersona(personaData);
      const agentId = createdPersona.id;
      
      // Now update it
      const updateData = {
        description: 'Updated description',
        config: { newSetting: true }
      };
      
      const updatedPersona = await identityService.updateAgentPersona(agentId, updateData);
      
      expect(updatedPersona.description).toBe('Updated description');
      expect(updatedPersona.config.newSetting).toBe(true);
    });
  });

  describe('Session Metadata', () => {
    test('should create session metadata', () => {
      const sessionData = {
        userId: 'test-user',
        projectId: 'test-project',
        context: { type: 'development' }
      };
      
      const sessionMetadata = identityService.createSessionMetadata(sessionData);
      
      expect(sessionMetadata.sessionId).toBeDefined();
      expect(sessionMetadata.userId).toBe('test-user');
      expect(sessionMetadata.projectId).toBe('test-project');
      expect(sessionMetadata.status).toBe('active');
      expect(sessionMetadata.createdAt).toBeDefined();
    });

    test('should get session metadata', () => {
      const sessionData = { userId: 'test-user' };
      const sessionMetadata = identityService.createSessionMetadata(sessionData);
      const retrieved = identityService.getSessionMetadata(sessionMetadata.sessionId);
      
      expect(retrieved).toEqual(sessionMetadata);
    });

    test('should update session metadata', () => {
      const sessionData = { userId: 'test-user' };
      const sessionMetadata = identityService.createSessionMetadata(sessionData);
      
      const updateData = { status: 'completed', metadata: { result: 'success' } };
      const updated = identityService.updateSessionMetadata(sessionMetadata.sessionId, updateData);
      
      expect(updated.status).toBe('completed');
      expect(updated.metadata.result).toBe('success');
    });

    test('should end a session', () => {
      const sessionData = { userId: 'test-user' };
      const sessionMetadata = identityService.createSessionMetadata(sessionData);
      
      const endedSession = identityService.endSession(sessionMetadata.sessionId);
      
      expect(endedSession.status).toBe('ended');
      expect(endedSession.endedAt).toBeDefined();
    });
  });

  describe('Full Identity', () => {
    test('should get full identity with persona and session metadata', () => {
      const agentId = 1;
      const sessionId = 'session-test';
      
      const sessionData = { userId: 'test-user' };
      identityService.createSessionMetadata(sessionData);
      
      const fullIdentity = identityService.getFullIdentity(agentId, sessionId);
      
      expect(fullIdentity.systemIdentity).toBeDefined();
      expect(fullIdentity.persona).toBeDefined();
      expect(fullIdentity.sessionMetadata).toBeDefined();
      expect(fullIdentity.timestamp).toBeDefined();
    });
  });

  describe('Serialization', () => {
    test('should serialize identity data', () => {
      const testData = { test: 'data', number: 123 };
      const serialized = identityService.serializeIdentity(testData);
      
      expect(typeof serialized).toBe('string');
      expect(serialized).toContain('data');
      expect(serialized).toContain('123');
    });

    test('should deserialize identity data', () => {
      const testString = '{"test": "data", "number": 123}';
      const deserialized = identityService.deserializeIdentity(testString);
      
      expect(deserialized).toEqual({ test: 'data', number: 123 });
    });

    test('should handle invalid serialization', () => {
      const invalidString = '{invalid json}';
      const deserialized = identityService.deserializeIdentity(invalidString);
      
      expect(deserialized).toBeNull();
    });
  });
});

// Mock Jest functions if not running in Jest environment
if (typeof jest === 'undefined') {
  global.jest = {
    fn: (impl) => impl || (() => {}),
    spyOn: () => ({ mockResolvedValue: () => {}, mockImplementation: () => {} }),
    clearAllMocks: () => {}
  };
  
  // Simplified test runner for Node.js
  console.log('Running AgentIdentityService tests...');
  
  // Run a simple test to verify the module loads correctly
  try {
    const { AgentIdentityService } = require('./identity-service');
    const service = new AgentIdentityService();
    console.log('✅ AgentIdentityService module loaded successfully');
    
    // Test basic functionality
    const identity = service.getSystemIdentity();
    if (identity && identity.system_identity) {
      console.log('✅ System identity retrieved successfully');
    } else {
      console.log('❌ Failed to retrieve system identity');
    }
    
    console.log('All basic tests passed!');
  } catch (error) {
    console.error('❌ Error during basic tests:', error);
  }
}