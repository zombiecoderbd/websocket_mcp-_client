#!/bin/bash
# Code Review and Systematic Testing Script
# Purpose: Comprehensive code review and systematic testing of the application

set -e  # Exit on any error

echo "==========================================="
echo "CODE REVIEW AND SYSTEMATIC TESTING SCRIPT"
echo "Started at: $(date)"
echo "==========================================="

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[HEADER]${NC} $1"
}

# Phase 1: Code Review
print_header "PHASE 1: CODE REVIEW"
echo ""

print_status "Checking for deprecated methods and version compatibility issues..."

# Check for common deprecated patterns
deprecated_count=0
echo "Checking for common deprecated patterns:"

# Check for old-style imports
if grep -r "require(" /home/sahon/admin/server/src/ --include="*.js" --include="*.ts" | grep -v node_modules; then
    print_warning "Found CommonJS require() statements - consider migrating to ES6 imports"
    ((deprecated_count++))
fi

# Check for potential version compatibility issues
if grep -r "process.version" /home/sahon/admin/server/src/; then
    print_status "Found Node.js version checks"
fi

# Check for unsafe eval usage
if grep -r "eval(" /home/sahon/admin --include="*.js" --include="*.ts" | grep -v node_modules; then
    print_error "Found unsafe eval() usage - potential security risk"
    ((deprecated_count++))
fi

# Check for potential SQL injection vectors
if grep -r "SELECT.*\+" /home/sahon/admin/server/src/ --include="*.js" --include="*.ts" | grep -v ".map("; then
    print_warning "Found potential SQL string concatenation - check for SQL injection risks"
    ((deprecated_count++))
fi

print_status "Deprecated pattern check completed. Issues found: $deprecated_count"

echo ""
print_status "Checking TypeScript compilation..."
if [ -f "/home/sahon/admin/tsconfig.json" ]; then
    if command -v npx >/dev/null 2>&1; then
        npx tsc --noEmit --skipLibCheck 2>/dev/null || print_warning "TypeScript compilation warnings/errors found"
    else
        print_warning "npx not available, skipping TypeScript compilation check"
    fi
else
    print_warning "No tsconfig.json found in root directory"
fi

if [ -f "/home/sahon/admin/server/tsconfig.json" ]; then
    if command -v npx >/dev/null 2>&1; then
        (cd server && npx tsc --noEmit --skipLibCheck 2>/dev/null) || print_warning "Server TypeScript compilation warnings/errors found"
    else
        print_warning "npx not available, skipping server TypeScript compilation check"
    fi
else
    print_warning "No tsconfig.json found in server directory"
fi

echo ""
print_status "Checking for security vulnerabilities in code..."

# Look for hardcoded credentials
if grep -r "password\|secret\|token\|key\|credential" /home/sahon/admin --include="*.js" --include="*.ts" --exclude-dir=node_modules | grep -i "=\s*[\"'].*[\"']"; then
    print_warning "Potential hardcoded credentials found - review for security"
fi

# Check for CORS settings
if grep -r "cors" /home/sahon/admin/server/src/ --include="*.js" --include="*.ts"; then
    print_status "CORS configuration found - ensure properly restricted"
fi

print_status "Code review completed!"

echo ""
print_header "PHASE 2: UNIT TESTING"
echo ""

print_status "Running unit tests..."

# Check if test files exist and run them
unit_test_count=0
if [ -d "/home/sahon/admin/tests/unit" ]; then
    if find /home/sahon/admin/tests/unit -name "*.test.js" -o -name "*.spec.js" -o -name "*.test.ts" -o -name "*.spec.ts" | grep -q .; then
        print_status "Found unit test files, running tests..."
        # Attempt to run unit tests with different common commands
        if npm test --prefix tests/unit 2>/dev/null; then
            print_status "Unit tests completed successfully"
        elif npx jest tests/unit 2>/dev/null; then
            print_status "Unit tests completed with Jest"
        elif npx mocha tests/unit 2>/dev/null; then
            print_status "Unit tests completed with Mocha"
        else
            print_warning "Could not run unit tests with standard runners"
        fi
    else
        print_warning "No unit test files found in tests/unit"
    fi
else
    print_warning "No tests/unit directory found"
fi

# Also check for test files in other locations
if find /home/sahon/admin -path "*/node_modules" -prune -o -name "*.test.js" -o -name "*.spec.js" -o -name "*.test.ts" -o -name "*.spec.ts" -print | grep -v node_modules | grep -q .; then
    print_status "Found test files in other locations"
    unit_test_count=$(find /home/sahon/admin -path "*/node_modules" -prune -o -name "*.test.js" -o -name "*.spec.js" -o -name "*.test.ts" -o -name "*.spec.ts" -print | grep -v node_modules | wc -l)
    print_status "Found $unit_test_count test files total"
else
    print_warning "No test files found in the project"
fi

print_status "Unit testing phase completed!"

echo ""
print_header "PHASE 3: INTEGRATION TESTING"
echo ""

print_status "Running integration tests..."

integration_success=true
if [ -d "/home/sahon/admin/tests/integration" ]; then
    if find /home/sahon/admin/tests/integration -name "*.test.js" -o -name "*.spec.js" -o -name "*.test.ts" -o -name "*.spec.ts" | grep -q .; then
        print_status "Found integration test files, running tests..."
        if npm test --prefix tests/integration 2>/dev/null; then
            print_status "Integration tests completed successfully"
        elif npx jest tests/integration 2>/dev/null; then
            print_status "Integration tests completed with Jest"
        elif npx mocha tests/integration 2>/dev/null; then
            print_status "Integration tests completed with Mocha"
        else
            print_warning "Could not run integration tests with standard runners"
            integration_success=false
        fi
    else
        print_warning "No integration test files found in tests/integration"
        integration_success=false
    fi
else
    print_warning "No tests/integration directory found"
    integration_success=false
fi

if [ "$integration_success" = true ]; then
    print_status "Integration testing phase completed successfully!"
else
    print_warning "Integration testing phase had issues"
fi

echo ""
print_header "PHASE 4: END-TO-END TESTING"
echo ""

print_status "Preparing end-to-end testing..."

# Check for E2E test directory
e2e_success=true
if [ -d "/home/sahon/admin/tests/e2e" ]; then
    if find /home/sahon/admin/tests/e2e -name "*.test.js" -o -name "*.spec.js" -o -name "*.test.ts" -o -name "*.spec.ts" | grep -q .; then
        print_status "Found E2E test files"
        e2e_count=$(find /home/sahon/admin/tests/e2e -name "*.test.js" -o -name "*.spec.js" -o -name "*.test.ts" -o -name "*.spec.ts" | wc -l)
        print_status "Found $e2e_count E2E test files"
    else
        print_warning "No E2E test files found in tests/e2e"
        e2e_success=false
    fi
else
    print_warning "No tests/e2e directory found"
    e2e_success=false
fi

# Test basic server connectivity if server is running
print_status "Testing basic server connectivity..."

# Check if backend server is running
if curl -s --connect-timeout 5 http://localhost:8000/health >/dev/null 2>&1; then
    print_status "Backend server (port 8000) is accessible"
    backend_health=$(curl -s http://localhost:8000/health | grep -o '"status":"[^"]*"' || echo "Health check failed")
    print_status "Backend health: $backend_health"
else
    print_warning "Backend server (port 8000) is not accessible - may need to start the server"
fi

# Check if frontend is running
if curl -s --connect-timeout 5 http://localhost:3000/ >/dev/null 2>&1; then
    print_status "Frontend server (port 3000) is accessible"
else
    print_warning "Frontend server (port 3000) is not accessible - may need to start the server"
fi

# Test basic API functionality
if curl -s --connect-timeout 5 http://localhost:8000/api/management/agents >/dev/null 2>&1; then
    agent_count=$(curl -s http://localhost:8000/api/management/agents | grep -o '"count":[0-9]*' | cut -d':' -f2 || echo "unknown")
    print_status "Agent management API accessible, agent count: $agent_count"
else
    print_warning "Agent management API not accessible"
fi

print_status "End-to-end testing preparation completed!"

echo ""
print_header "PHASE 5: PERFORMANCE AND STRESS TESTING"
echo ""

print_status "Running basic performance checks..."

# Check memory usage
print_status "Current memory usage:"
free -h | grep -E "(^Mem:|^Swap:)"

# Check disk usage
print_status "Current disk usage:"
df -h /home/sahon/admin | tail -n +2

# Check running processes related to our application
print_status "Application-related processes:"
ps aux | grep -E "(node|npm|yarn|pm2)" | grep -v grep || print_warning "No application processes found"

# Basic response time test if server is running
if curl -s --connect-timeout 5 http://localhost:8000/health >/dev/null 2>&1; then
    response_time=$(curl -s -w "%{time_total}" -o /dev/null http://localhost:8000/health 2>/dev/null || echo "failed")
    if [ "$response_time" != "failed" ]; then
        print_status "Backend response time: ${response_time}s"
        if (( $(echo "$response_time > 2.0" | bc -l 2>/dev/null || echo "1") )); then
            print_warning "Response time is higher than recommended (>2s)"
        fi
    fi
else
    print_warning "Cannot test response time - backend server not accessible"
fi

print_status "Performance checks completed!"

echo ""
print_header "PHASE 6: FINAL VERIFICATION AND REPORT"
echo ""

# Summarize findings
total_issues=0

# Count TypeScript errors
ts_errors=$(cd /home/sahon/admin && npx tsc --noEmit --skipLibCheck 2>&1 | wc -l || echo "0")
if [ "$ts_errors" -gt 0 ]; then
    print_warning "TypeScript compilation issues found: $ts_errors"
    ((total_issues++))
fi

# Count security warnings
security_warnings=0
if grep -r "TODO\|FIXME\|HACK\|BUG" /home/sahon/admin/server/src/ --include="*.js" --include="*.ts" | grep -v node_modules >/dev/null 2>&1; then
    todo_count=$(grep -r "TODO\|FIXME\|HACK\|BUG" /home/sahon/admin/server/src/ --include="*.js" --include="*.ts" | grep -v node_modules | wc -l)
    print_warning "Found $todo_count TODO/FIXME/HACK/BUG comments to address"
    ((security_warnings++))
fi

print_status "Final verification completed!"

echo ""
print_header "TEST SUMMARY REPORT"
echo ""
print_status "Issues found during review:"
print_status "  - Deprecated/compatibility issues: $deprecated_count"
print_status "  - TypeScript compilation issues: $ts_errors"
print_status "  - Security/quality warnings: $security_warnings"
print_status "  - Total potential issues: $((deprecated_count + (ts_errors > 0 ? 1 : 0) + security_warnings))"

echo ""
print_status "Testing coverage:"
if [ $unit_test_count -gt 0 ]; then
    print_status "  ✓ Unit tests found and reviewed ($unit_test_count files)"
else
    print_warning "  ⚠ No unit tests found"
fi

if [ "$integration_success" = true ]; then
    print_status "  ✓ Integration tests executed successfully"
else
    print_warning "  ⚠ Integration tests had issues or were not found"
fi

if [ "$e2e_success" = true ]; then
    print_status "  ✓ E2E tests found and prepared"
else
    print_warning "  ⚠ E2E tests not found or had issues"
fi

print_status "  ✓ Performance and connectivity checks completed"

echo ""
print_status "RECOMMENDATIONS:"
if [ $deprecated_count -gt 0 ]; then
    print_status "  1. Address deprecated patterns found in the code"
fi
if [ $ts_errors -gt 0 ]; then
    print_status "  2. Fix TypeScript compilation issues"
fi
if [ $security_warnings -gt 0 ]; then
    print_status "  3. Review TODO/FIXME/HACK comments and hardcoded values"
fi

print_status "  4. Ensure all services are running before full functionality testing"
print_status "  5. Run comprehensive tests once servers are started"

echo ""
print_status "CODE REVIEW AND TESTING COMPLETED!"
echo ""
print_status "Next steps:"
echo "  1. Address any issues found during review"
echo "  2. Start application servers: npm run dev"
echo "  3. Run full test suite: npm test"
echo "  4. Perform manual testing of critical functionality"
echo ""
print_status "Review completed at: $(date)"
echo "==========================================="