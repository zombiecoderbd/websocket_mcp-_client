#!/bin/bash
# Server Cleanup and Maintenance Script
# Purpose: Comprehensive server maintenance including log cleanup, dependency management, and integrity verification

set -e  # Exit on any error

echo "==========================================="
echo "SERVER MAINTENANCE SCRIPT"
echo "Started at: $(date)"
echo "==========================================="

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Phase 1: Log Cleanup
print_status "Starting Phase 1: Log Cleanup"
echo ""

# Backup critical logs first
print_status "Creating backup of production logs..."
mkdir -p /tmp/server_logs_backup_$(date +%Y%m%d_%H%M%S)
if [ -d "/home/sahon/admin/server/logs" ]; then
    cp -r /home/sahon/admin/server/logs/* /tmp/server_logs_backup_$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true
    print_status "Production logs backed up to /tmp/server_logs_backup_$(date +%Y%m%d_%H%M%S)/"
fi

# Remove all non-production log files
print_status "Removing unnecessary log files..."
find /home/sahon/admin -name "*.log" -not -path "/home/sahon/admin/server/logs/*" -not -path "/home/sahon/admin/packages/logs/*" -exec rm -f {} + 2>/dev/null || true
find /home/sahon/admin -name "nohup.out" -not -path "/home/sahon/admin/server/logs/*" -not -path "/home/sahon/admin/packages/logs/*" -exec rm -f {} + 2>/dev/null || true
find /home/sahon/admin -name "*.out" -not -path "/home/sahon/admin/server/logs/*" -not -path "/home/sahon/admin/packages/logs/*" -exec rm -f {} + 2>/dev/null || true

# Clean temp directories completely
find /home/sahon/admin/temp -name "*.log" -exec rm -f {} + 2>/dev/null || true
find /home/sahon/admin/temp -name "nohup.out" -exec rm -f {} + 2>/dev/null || true

print_status "Log cleanup completed!"

echo ""
print_status "Starting Phase 2: Package Audit"
echo ""

# Phase 2: Package Audit
cd /home/sahon/admin

# Check for outdated or vulnerable packages
print_status "Checking for vulnerable packages in root directory..."
npm audit --audit-level moderate || print_warning "Some vulnerabilities found, but continuing"

# Check individual package directories
for pkg_dir in server packages/database packages/agents packages/mcp-server; do
    if [ -d "$pkg_dir" ] && [ -f "$pkg_dir/package.json" ]; then
        print_status "Auditing $pkg_dir..."
        (cd "$pkg_dir" && npm audit --audit-level moderate) || print_warning "Vulnerabilities found in $pkg_dir"
    fi
done

print_status "Package audit completed!"

echo ""
print_status "Starting Phase 3: Dependency Cleanup and Reinstall"
echo ""

# Phase 3: Dependency Force Reinstall
print_status "Clearing npm cache..."
npm cache clean --force

# Remove all node_modules directories
print_status "Removing node_modules directories..."
find /home/sahon/admin -name "node_modules" -type d -prune -exec rm -rf '{}' + 2>/dev/null || true

# Remove package-lock.json files to ensure fresh install
print_status "Removing package-lock.json files..."
find /home/sahon/admin -name "package-lock.json" -delete 2>/dev/null || true

print_status "Dependency cleanup completed!"

echo ""
print_status "Starting Phase 4: Fresh Dependency Installation"
echo ""

# Phase 4: Fresh Dependency Installation
cd /home/sahon/admin

# Install root dependencies
print_status "Installing root dependencies..."
npm install --legacy-peer-deps

# Install server dependencies
if [ -d "server" ] && [ -f "server/package.json" ]; then
    print_status "Installing server dependencies..."
    (cd server && npm install --legacy-peer-deps)
fi

# Install package dependencies
for pkg_dir in packages/database packages/agents packages/mcp-server; do
    if [ -d "$pkg_dir" ] && [ -f "$pkg_dir/package.json" ]; then
        print_status "Installing $pkg_dir dependencies..."
        (cd "$pkg_dir" && npm install --legacy-peer-deps)
    fi
done

print_status "Fresh dependency installation completed!"

echo ""
print_status "Starting Phase 5: File Integrity Verification"
echo ""

# Phase 5: File Integrity Verification
print_status "Checking critical directories..."
critical_dirs=(
    "/home/sahon/admin/server/src"
    "/home/sahon/admin/app"
    "/home/sahon/admin/components"
    "/home/sahon/admin/config"
    "/home/sahon/admin/scripts"
)

for dir in "${critical_dirs[@]}"; do
    if [ ! -d "$dir" ]; then
        print_error "Critical directory missing: $dir"
    else
        print_status "OK: Directory exists: $dir"
    fi
done

print_status "Checking critical files..."
critical_files=(
    "/home/sahon/admin/server/src/index.ts"
    "/home/sahon/admin/package.json"
    "/home/sahon/admin/server/package.json"
    "/home/sahon/admin/SHORT_TERM_MEMORY.md"
    "/home/sahon/admin/SYSTEM_TEST_REPORT.md"
)

for file in "${critical_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Critical file missing: $file"
    else
        print_status "OK: File exists: $file"
    fi
done

# Verify package.json files have valid JSON
print_status "Validating package.json files..."
find /home/sahon/admin -name "package.json" -not -path "*/node_modules/*" -exec sh -c '
    for file; do
        if ! node -e "JSON.parse(require(\"fs\").readFileSync(\"$file\", \"utf8\"))" >/dev/null 2>&1; then
            echo "$(tput setaf 1)[ERROR]$(tput sgr0) Invalid JSON in $file"
        else
            echo "$(tput setaf 2)[OK]$(tput sgr0) Valid JSON in $file"
        fi
    done
' _ {} +

print_status "File integrity verification completed!"

echo ""
print_status "Starting Phase 6: LangChain Version Management"
echo ""

# Phase 6: LangChain Version Management
cd /home/sahon/admin

# Check if LangChain is used in the project
if grep -r "langchain" /home/sahon/admin/packages/mcp-server/ /home/sahon/admin/temp/mcp-server-demo/ 2>/dev/null; then
    print_status "LangChain detected in project, checking version..."
    
    # Get current LangChain version if installed
    current_version=$(npm list langchain 2>/dev/null | grep langchain | head -1 | cut -d "@" -f 2- | tr -d " " | sed 's/^[[:space:]]*//' || echo "")
    
    if [ -n "$current_version" ]; then
        print_status "Current LangChain version: $current_version"
        
        # Check if version is in recommended range (0.0.200-0.0.250 or 0.1.0-0.1.63)
        if [[ "$current_version" =~ ^(0\.0\.(2[0-4][0-9]|25[0-5])|0\.1\.([0-5][0-9]|6[0-3]))$ ]]; then
            print_status "LangChain version is within recommended range"
        else
            print_warning "LangChain version $current_version is not in recommended range, reinstalling recommended version..."
            npm install langchain@0.0.245 @langchain/core@0.1.63 --save --legacy-peer-deps
        fi
    else
        print_warning "LangChain not currently installed, skipping version check"
    fi
else
    print_status "LangChain not detected in main project directories, skipping version management"
fi

print_status "LangChain version management completed!"

echo ""
print_status "Starting Phase 7: System Status Verification"
echo ""

# Phase 7: System Status Verification
print_status "Checking system status..."

# Check if main package.json exists
if [ -f "/home/sahon/admin/package.json" ]; then
    print_status "Main package.json exists"
    # Count dependencies
    dep_count=$(jq '.dependencies | length' /home/sahon/admin/package.json 2>/dev/null || echo "0")
    dev_dep_count=$(jq '.devDependencies | length' /home/sahon/admin/package.json 2>/dev/null || echo "0")
    print_status "Dependencies: $dep_count, Dev Dependencies: $dev_dep_count"
else
    print_error "Main package.json not found!"
fi

# Check disk usage
print_status "Disk usage:"
df -h /home/sahon/admin

# Check memory usage
print_status "Memory usage:"
free -h

print_status "System status verification completed!"

echo ""
print_status "MAINTENANCE COMPLETED SUCCESSFULLY!"
echo ""
print_status "Summary of actions performed:"
echo "  ✓ Log files cleaned (except production logs)"
echo "  ✓ npm cache cleared"
echo "  ✓ node_modules directories removed"
echo "  ✓ package-lock.json files removed"
echo "  ✓ Fresh dependencies installed"
echo "  ✓ Critical files and directories verified"
echo "  ✓ LangChain version checked/updated if needed"
echo "  ✓ System status verified"
echo ""
print_status "Next steps:"
echo "  1. Run tests to verify functionality: npm test"
echo "  2. Start services: npm run dev"
echo "  3. Monitor logs for any issues"
echo ""
print_status "Maintenance completed at: $(date)"
echo "==========================================="