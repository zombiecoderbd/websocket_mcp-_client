/**
 * Sample Unit Test for ZombieCoder System
 * 
 * This demonstrates the testing structure and best practices
 */

const { TestDataGenerator, TestAssertions, TestTiming } = require('../utils/test-helpers');

describe('TestDataGenerator', () => {
  describe('generateUser', () => {
    test('should generate user with default values', () => {
      const user = TestDataGenerator.generateUser();
      
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('createdAt');
      
      expect(typeof user.id).toBe('number');
      expect(user.name).toBe('Test User');
      expect(user.email).toBe('test@example.com');
    });

    test('should override default values when provided', () => {
      const customUser = TestDataGenerator.generateUser({
        name: 'Custom User',
        email: 'custom@example.com'
      });
      
      expect(customUser.name).toBe('Custom User');
      expect(customUser.email).toBe('custom@example.com');
    });

    test('should generate unique IDs', () => {
      const user1 = TestDataGenerator.generateUser();
      const user2 = TestDataGenerator.generateUser();
      
      expect(user1.id).not.toBe(user2.id);
    });
  });

  describe('generateAgentConfig', () => {
    test('should generate agent config with default values', () => {
      const config = TestDataGenerator.generateAgentConfig();
      
      expect(config).toHaveProperty('agentId');
      expect(config).toHaveProperty('persona');
      expect(config).toHaveProperty('allowedTools');
      expect(config).toHaveProperty('memory');
      
      expect(config.agentId).toMatch(/^agent-\d+$/);
      expect(config.persona).toBe('test-developer');
      expect(Array.isArray(config.allowedTools)).toBe(true);
      expect(config.memory).toBe(true);
    });

    test('should include custom tools when provided', () => {
      const config = TestDataGenerator.generateAgentConfig({
        allowedTools: ['custom.tool']
      });
      
      expect(config.allowedTools).toContain('custom.tool');
    });
  });
});

describe('TestAssertions', () => {
  describe('assertHasProperties', () => {
    test('should pass when object has all required properties', () => {
      const obj = { name: 'test', value: 123 };
      expect(() => {
        TestAssertions.assertHasProperties(obj, ['name', 'value']);
      }).not.toThrow();
    });

    test('should throw when object is missing required properties', () => {
      const obj = { name: 'test' };
      expect(() => {
        TestAssertions.assertHasProperties(obj, ['name', 'value']);
      }).toThrow('Missing required properties: value');
    });

    test('should throw when input is not an object', () => {
      expect(() => {
        TestAssertions.assertHasProperties(null, ['name']);
      }).toThrow('Expected object, got object');
    });
  });

  describe('assertInRange', () => {
    test('should pass when value is within range', () => {
      expect(() => {
        TestAssertions.assertInRange(5, 1, 10);
      }).not.toThrow();
    });

    test('should throw when value is below minimum', () => {
      expect(() => {
        TestAssertions.assertInRange(0, 1, 10);
      }).toThrow('Value 0 is not in range [1, 10]');
    });

    test('should throw when value is above maximum', () => {
      expect(() => {
        TestAssertions.assertInRange(15, 1, 10);
      }).toThrow('Value 15 is not in range [1, 10]');
    });
  });
});

describe('TestTiming', () => {
  describe('measureExecution', () => {
    test('should measure execution time accurately', async () => {
      const result = await TestTiming.measureExecution(async () => {
        await TestTiming.wait(10); // Wait 10ms
        return 'completed';
      });
      
      expect(result.result).toBe('completed');
      expect(result.duration).toBeGreaterThanOrEqual(10);
      expect(result.durationFormatted).toMatch(/\d+\.\d+ms/);
    });
  });

  describe('wait', () => {
    test('should wait for specified time', async () => {
      const start = Date.now();
      await TestTiming.wait(50);
      const end = Date.now();
      
      expect(end - start).toBeGreaterThanOrEqual(45); // Allow small tolerance
    });
  });
});