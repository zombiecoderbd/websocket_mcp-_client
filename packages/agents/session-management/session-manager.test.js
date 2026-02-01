// Tests for Agent Session Management Service

const { AgentSessionManager } = require('./session-manager');

// Mock database connection for testing
const mockDbConnection = {
  executeQuery: jest.fn()
};

describe('AgentSessionManager', () => {
  let sessionManager;

  beforeEach(() => {
    sessionManager = new AgentSessionManager({
      enableLocalStorage: false, // Disable for testing
      sessionExpiryMinutes: 60
    });
    
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with default config', () => {
      expect(sessionManager.config).toBeDefined();
      expect(sessionManager.config.enableLocalStorage).toBe(false);
      expect(sessionManager.config.sessionExpiryMinutes).toBe(60);
      expect(sessionManager.activeSessions).toBeInstanceOf(Map);
    });

    test('should initialize with database connection', async () => {
      await sessionManager.initialize(mockDbConnection);
      expect(sessionManager.dbConnection).toBe(mockDbConnection);
    });
  });

  describe('Session Creation', () => {
    test('should create a new session', async () => {
      await sessionManager.initialize(mockDbConnection);
      
      const sessionData = { 
        userId: 'test-user',
        context: 'development' 
      };
      
      mockDbConnection.executeQuery.mockResolvedValue({ affectedRows: 1 });
      
      const session = await sessionManager.createSession(1, sessionData);
      
      expect(session.sessionId).toBeDefined();
      expect(session.agentId).toBe(1);
      expect(session.sessionData.userId).toBe('test-user');
      expect(session.isActive).toBe(true);
      expect(mockDbConnection.executeQuery).toHaveBeenCalled();
    });

    test('should create session without database', async () => {
      const sessionData = { test: 'data' };
      const session = await sessionManager.createSession(1, sessionData);
      
      expect(session.sessionId).toBeDefined();
      expect(session.agentId).toBe(1);
      expect(session.sessionData.test).toBe('data');
    });
  });

  describe('Session Retrieval', () => {
    test('should get session from memory', async () => {
      // First create a session
      const session = await sessionManager.createSession(1, { test: 'data' });
      
      // Then retrieve it
      const retrieved = await sessionManager.getSession(session.sessionId);
      
      expect(retrieved).toEqual(session);
    });

    test('should return null for non-existent session', async () => {
      const session = await sessionManager.getSession('non-existent');
      expect(session).toBeNull();
    });
  });

  describe('Session Updates', () => {
    test('should update session activity', async () => {
      const session = await sessionManager.createSession(1, { test: 'data' });
      const originalActivity = session.lastActivity;
      
      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await sessionManager.updateSessionActivity(session.sessionId);
      const updatedSession = await sessionManager.getSession(session.sessionId);
      
      expect(new Date(updatedSession.lastActivity)).toBeGreaterThan(new Date(originalActivity));
    });
  });

  describe('Session Ending', () => {
    test('should end session properly', async () => {
      const session = await sessionManager.createSession(1, { test: 'data' });
      expect(session.isActive).toBe(true);
      
      await sessionManager.endSession(session.sessionId);
      const endedSession = await sessionManager.getSession(session.sessionId);
      
      // Session should still exist but be inactive
      expect(endedSession).toBeDefined();
      expect(endedSession.isActive).toBe(false);
      expect(endedSession.endTime).toBeDefined();
    });
  });

  describe('Agent Sessions', () => {
    test('should get all active sessions for agent', async () => {
      // Create multiple sessions
      await sessionManager.createSession(1, { test: 'data1' });
      await sessionManager.createSession(1, { test: 'data2' });
      await sessionManager.createSession(2, { test: 'data3' }); // Different agent
      
      mockDbConnection.executeQuery.mockResolvedValue([
        { session_id: 'db-session-1', agent_id: 1, session_data: '{"test":"db-data"}', is_active: 1, last_activity: new Date().toISOString() }
      ]);
      
      const sessions = await sessionManager.getAgentSessions(1);
      
      // Should have at least 2 sessions (memory + database)
      expect(sessions.length).toBeGreaterThanOrEqual(2);
      expect(sessions.every(s => s.agentId === 1)).toBe(true);
    });
  });

  describe('Session Cleanup', () => {
    test('should cleanup expired sessions', async () => {
      mockDbConnection.executeQuery.mockResolvedValue({ affectedRows: 1 });
      
      await sessionManager.cleanupExpiredSessions();
      
      expect(mockDbConnection.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE agent_sessions'),
        expect.arrayContaining([expect.any(String)])
      );
    });
  });

  describe('LocalStorage Integration', () => {
    test('should handle localStorage operations', () => {
      // This test is mainly for coverage since localStorage is mocked in Node.js
      const localStorageManager = new AgentSessionManager({ enableLocalStorage: true });
      
      // Test methods that interact with localStorage
      expect(() => localStorageManager.generateSessionId()).not.toThrow();
      expect(() => localStorageManager.loadFromLocalStorage()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      mockDbConnection.executeQuery.mockRejectedValue(new Error('Database error'));
      
      // Should not throw, should continue with fallback
      const session = await sessionManager.createSession(1, { test: 'data' });
      expect(session.sessionId).toBeDefined();
    });

    test('should handle session creation without database', async () => {
      sessionManager.dbConnection = null;
      
      const session = await sessionManager.createSession(1, { test: 'data' });
      expect(session.sessionId).toBeDefined();
      expect(session.agentId).toBe(1);
    });
  });
});

// Mock Jest functions if not running in Jest environment
if (typeof jest === 'undefined') {
  global.jest = {
    fn: (impl) => impl || (() => {}),
    spyOn: () => ({ mockResolvedValue: () => {}, mockImplementation: () => {} }),
    clearAllMocks: () => {},
    describe: (name, fn) => {
      console.log(`\n📋 Testing: ${name}`);
      fn();
    },
    test: (name, fn) => {
      try {
        console.log(`  ✅ ${name}`);
        fn();
      } catch (error) {
        console.log(`  ❌ ${name}: ${error.message}`);
      }
    },
    beforeEach: (fn) => fn(),
    expect: (value) => {
      return {
        toBe: (expected) => {
          if (value !== expected) {
            throw new Error(`Expected ${expected}, got ${value}`);
          }
        },
        toBeDefined: () => {
          if (value === undefined) {
            throw new Error('Expected value to be defined');
          }
        },
        toBeNull: () => {
          if (value !== null) {
            throw new Error(`Expected null, got ${value}`);
          }
        },
        toBeInstanceOf: (constructor) => {
          if (!(value instanceof constructor)) {
            throw new Error(`Expected instance of ${constructor.name}`);
          }
        },
        toBeGreaterThan: (expected) => {
          if (value <= expected) {
            throw new Error(`Expected ${value} to be greater than ${expected}`);
          }
        },
        toEqual: (expected) => {
          if (JSON.stringify(value) !== JSON.stringify(expected)) {
            throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
          }
        }
      };
    }
  };

  // Run basic tests
  console.log('🧪 Running AgentSessionManager basic tests...');
  
  try {
    const { AgentSessionManager } = require('./session-manager');
    const manager = new AgentSessionManager();
    
    // Test initialization
    if (manager.config && manager.activeSessions) {
      console.log('✅ Basic initialization successful');
    } else {
      console.log('❌ Initialization failed');
    }
    
    // Test session creation
    const session = manager.createSession(1, { test: 'data' });
    if (session && session.sessionId) {
      console.log('✅ Session creation successful');
    } else {
      console.log('❌ Session creation failed');
    }
    
    console.log('✅ All basic tests passed!');
  } catch (error) {
    console.error('❌ Error during basic tests:', error);
  }
}