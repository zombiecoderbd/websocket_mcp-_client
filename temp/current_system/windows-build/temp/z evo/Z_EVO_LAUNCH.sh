#!/bin/bash

# Z-Evo System Launcher
# Main entry point for the Z-Evo AI Agent System

echo "🚀 Starting Z-Evo AI Agent System..."
echo "==================================="

# Check if running from the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the Z-Evo root directory"
    exit 1
fi

# Source environment variables
if [ -f ".env" ]; then
    export $(cat .env | xargs)
fi

# Function to check dependencies
check_dependencies() {
    echo "🔍 Checking system dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed"
        exit 1
    fi
    
    # Check if node version is >= 18
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo "❌ Node.js version must be >= 18.0.0"
        exit 1
    fi
    
    echo "✅ All dependencies are available"
}

# Function to install dependencies
install_dependencies() {
    echo "📦 Installing dependencies..."
    npm run setup
    echo "✅ Dependencies installed"
}

# Function to start MCP Server
start_mcp_server() {
    echo "📡 Starting MCP Server..."
    cd packages/mcp-server
    if [ -f "package.json" ]; then
        npm start &
        echo "✅ MCP Server started (PID: $!)"
    else
        echo "❌ MCP Server package not found"
    fi
    cd ../..
}

# Function to start API Gateway
start_api_gateway() {
    echo "🌐 Starting API Gateway..."
    cd services/api-gateway
    if [ -f "package.json" ]; then
        npm start &
        echo "✅ API Gateway started (PID: $!)"
    else
        echo "⚠️ API Gateway not yet implemented"
    fi
    cd ../..
}

# Main execution
main() {
    case "${1:-start}" in
        "start")
            check_dependencies
            install_dependencies
            start_mcp_server
            start_api_gateway
            echo "🎯 Z-Evo System is now running!"
            echo "   MCP Server: http://localhost:3002"
            echo "   API Gateway: http://localhost:8000"
            ;;
        "stop")
            echo "🛑 Stopping Z-Evo System..."
            pkill -f "node.*Server.js"
            pkill -f "node.*api-gateway"
            echo "✅ System stopped"
            ;;
        "status")
            echo "📊 Z-Evo System Status:"
            if pgrep -f "node.*Server.js" > /dev/null; then
                echo "   MCP Server: ✅ Running"
            else
                echo "   MCP Server: ❌ Stopped"
            fi
            
            if pgrep -f "node.*api-gateway" > /dev/null; then
                echo "   API Gateway: ✅ Running"
            else
                echo "   API Gateway: ❌ Stopped"
            fi
            ;;
        "dev")
            echo "🔧 Starting Development Mode..."
            check_dependencies
            cd packages/mcp-server
            npm run dev
            ;;
        "help"|*)
            echo "Z-Evo System Launcher"
            echo "Usage: ./bin/launch.sh [start|stop|status|dev|help]"
            echo ""
            echo "Commands:"
            echo "  start   - Start all services"
            echo "  stop    - Stop all services"
            echo "  status  - Check system status"
            echo "  dev     - Start development mode"
            echo "  help    - Show this help"
            ;;
    esac
}

main "$@"