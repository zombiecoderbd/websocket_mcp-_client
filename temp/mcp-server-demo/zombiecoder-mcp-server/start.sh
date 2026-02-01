#!/bin/bash

# ZombieCoder MCP Server Startup Script

echo "🚀 Starting ZombieCoder MCP Server..."
echo "====================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed or not in PATH"
    echo "Please install Node.js v16 or higher"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Start the server
echo "🔄 Starting server..."
node src/index.js

# Handle graceful shutdown
trap 'echo -e "\n🛑 Shutdown signal received. Stopping server..."' INT TERM