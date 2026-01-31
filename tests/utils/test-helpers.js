/**
 * Test Utilities and Helper Functions
 * 
 * This file contains shared utilities for test setup, teardown, and common assertions.
 */

const fs = require('fs');
const path = require('path');

/**
 * Test Data Generator
 */
class TestDataGenerator {
  /**
   * Generate mock user data for testing
   * @param {Object} overrides - Custom data to override defaults
   * @returns {Object} Mock user object
   */
  static generateUser(overrides = {}) {
    return {
      id: Math.floor(Math.random() * 10000),
      name: 'Test User',
      email: 'test@example.com',
      createdAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Generate mock agent configuration
   * @param {Object} overrides - Custom configuration to override defaults
   * @returns {Object} Mock agent configuration
   */
  static generateAgentConfig(overrides = {}) {
    return {
      agentId: `agent-${Math.floor(Math.random() * 1000)}`,
      persona: 'test-developer',
      allowedTools: ['fs.read', 'fs.write', 'shell.run'],
      memory: true,
      ...overrides
    };
  }

  /**
   * Generate mock API response
   * @param {Object} data - Response data
   * @param {string} status - Response status ('ok' or 'error')
   * @returns {Object} Mock API response
   */
  static generateApiResponse(data = {}, status = 'ok') {
    return {
      status,
      timestamp: new Date().toISOString(),
      requestId: `req-${Math.random().toString(36).substr(2, 9)}`,
      data
    };
  }
}

/**
 * Test Environment Setup
 */
class TestEnvironment {
  /**
   * Create temporary test directory
   * @param {string} testName - Name of the test
   * @returns {string} Path to temporary directory
   */
  static createTempDir(testName) {
    const tempDir = path.join(__dirname, '../../temp', `test-${testName}-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    return tempDir;
  }

  /**
   * Clean up temporary directory
   * @param {string} dirPath - Path to directory to clean up
   */
  static cleanupTempDir(dirPath) {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  }

  /**
   * Mock console methods for testing
   * @returns {Object} Object with restore method
   */
  static mockConsole() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    const logs = [];
    const errors = [];
    const warnings = [];

    console.log = (...args) => logs.push(args.join(' '));
    console.error = (...args) => errors.push(args.join(' '));
    console.warn = (...args) => warnings.push(args.join(' '));

    return {
      logs,
      errors,
      warnings,
      restore: () => {
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
      }
    };
  }
}

/**
 * Assertion Helpers
 */
class TestAssertions {
  /**
   * Assert that an object has required properties
   * @param {Object} obj - Object to check
   * @param {Array<string>} requiredProps - Required property names
   */
  static assertHasProperties(obj, requiredProps) {
    if (!obj || typeof obj !== 'object') {
      throw new Error(`Expected object, got ${typeof obj}`);
    }

    const missingProps = requiredProps.filter(prop => !(prop in obj));
    if (missingProps.length > 0) {
      throw new Error(`Missing required properties: ${missingProps.join(', ')}`);
    }
  }

  /**
   * Assert that a value is within expected range
   * @param {number} value - Value to check
   * @param {number} min - Minimum expected value
   * @param {number} max - Maximum expected value
   */
  static assertInRange(value, min, max) {
    if (value < min || value > max) {
      throw new Error(`Value ${value} is not in range [${min}, ${max}]`);
    }
  }

  /**
   * Assert that a promise rejects with expected error
   * @param {Promise} promise - Promise to test
   * @param {RegExp|string} expectedError - Expected error message or pattern
   */
  static async assertRejectsWith(promise, expectedError) {
    try {
      await promise;
      throw new Error('Expected promise to reject, but it resolved');
    } catch (error) {
      if (expectedError instanceof RegExp) {
        if (!expectedError.test(error.message)) {
          throw new Error(`Expected error to match ${expectedError}, got ${error.message}`);
        }
      } else if (typeof expectedError === 'string') {
        if (!error.message.includes(expectedError)) {
          throw new Error(`Expected error to include "${expectedError}", got "${error.message}"`);
        }
      } else {
        throw error;
      }
    }
  }
}

/**
 * Timing Utilities
 */
class TestTiming {
  /**
   * Measure execution time of a function
   * @param {Function} fn - Function to measure
   * @returns {Object} Result with execution time
   */
  static async measureExecution(fn) {
    const start = process.hrtime.bigint();
    const result = await fn();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    
    return {
      result,
      duration,
      durationFormatted: `${duration.toFixed(2)}ms`
    };
  }

  /**
   * Wait for specified time
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise} Promise that resolves after specified time
   */
  static async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = {
  TestDataGenerator,
  TestEnvironment,
  TestAssertions,
  TestTiming
};