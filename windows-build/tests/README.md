# 🧪 Test Suite Documentation

This directory contains all automated tests for the ZombieCoder system, organized by testing type and scope.

## 📁 Test Structure

```
tests/
├── unit/          # Unit tests for individual components and functions
├── integration/   # Integration tests for component interactions
├── e2e/          # End-to-end tests simulating real user workflows
└── utils/        # Test utilities and helper functions
```

## 🎯 Test Categories

### Unit Tests (`tests/unit/`)
**Purpose**: Test individual components, functions, and modules in isolation.

**Characteristics**:
- Fast execution (milliseconds)
- No external dependencies
- Mock external services
- High code coverage targets
- Run frequently during development

**Example Tests**:
- `simple-test.js` - Basic functionality verification

### Integration Tests (`tests/integration/`)
**Purpose**: Test interactions between multiple components and services.

**Characteristics**:
- Moderate execution time (seconds)
- Real component interactions
- Test API endpoints and service communication
- Validate data flow between modules

**Example Tests**:
- `test-api-endpoints.js` - API endpoint validation
- `integration-test.js` - Component integration scenarios
- `test-integration.js` - Service interaction testing

### End-to-End Tests (`tests/e2e/`)
**Purpose**: Simulate complete user workflows and real-world scenarios.

**Characteristics**:
- Slower execution (minutes)
- Full system testing
- Real browser/environment simulation
- User journey validation
- Production-like environment

**Example Tests**:
- `editor-agent-test.js` - Editor-agent workflow testing
- `bridge-test.js` - Editor bridge functionality testing

### Test Utilities (`tests/utils/`)
**Purpose**: Shared testing helpers, fixtures, and utility functions.

**Contents**:
- Mock data generators
- Test configuration files
- Helper functions for common testing patterns
- Setup and teardown utilities

## 🚀 Running Tests

### Prerequisites
```bash
# Install test dependencies
npm install --save-dev jest chai mocha

# Ensure test environment is set up
npm run test:setup
```

### Test Commands
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run e2e tests only
npm run test:e2e

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📊 Test Coverage Goals

- **Unit Tests**: 80%+ code coverage
- **Integration Tests**: 70%+ critical path coverage
- **E2E Tests**: 90%+ core user workflows

## 🔧 Test Configuration

### Jest Configuration (`jest.config.js`)
```javascript
module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Test Environment Variables
```bash
# Test database configuration
TEST_DB_HOST=localhost
TEST_DB_NAME=zombiecoder_test
TEST_DB_USER=test_user
TEST_DB_PASS=test_password

# API test configuration
TEST_API_BASE_URL=http://localhost:8000
TEST_API_TIMEOUT=10000

# Browser test configuration
TEST_BROWSER=chrome
TEST_HEADLESS=true
```

## 📈 Quality Assurance

### Test Writing Standards
- **Descriptive Test Names**: Clearly describe what is being tested
- **AAA Pattern**: Arrange-Act-Assert structure
- **Isolation**: Tests should not depend on each other
- **Speed**: Keep tests fast and focused
- **Reliability**: Tests should produce consistent results

### Continuous Integration
Tests are automatically run on:
- Every pull request
- Main branch commits
- Scheduled nightly builds
- Release candidate validation

## 🛠️ Troubleshooting

### Common Issues
1. **Test Timeout**: Increase timeout values for slow tests
2. **Database Connection**: Verify test database is accessible
3. **Port Conflicts**: Ensure test ports are available
4. **Mock Issues**: Update mocks when dependencies change

### Debugging Tests
```bash
# Run specific test file
npm test -- tests/unit/simple-test.js

# Run tests with verbose output
npm test -- --verbose

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [CI/CD Pipeline Configuration](../docs/deployment/)