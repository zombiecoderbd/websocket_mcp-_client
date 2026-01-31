# 🧬 Z-Evo AI Agent System

Professional modular AI agent platform following industry best practices.

## 🚀 Quick Start

```bash
# Navigate to project directory
cd /home/sahon/Desktop/sahon/z-evo

# Install dependencies
npm run setup

# Start the system
./bin/launch.sh start

# Check status
./bin/launch.sh status

# Stop system
./bin/launch.sh stop
```

## 🏗️ Architecture

### Modular Structure
```
z-evo/
├── bin/           # Launcher scripts
├── packages/      # Core modules (mcp-server, lsp-dap, agents, etc.)
├── services/      # Backend services (api-gateway, auth, monitoring)
├── libs/          # Shared libraries (utils, logger, config, security)
├── docs/          # Documentation
├── tests/         # Test files
├── config/        # Configuration
└── data/          # Data files
```

### Key Modules
- **MCP Server**: Model Coordination Protocol implementation
- **LSP-DAP**: Language Server & Debug Adapter Protocol
- **Agents**: AI agent system with multiple personas
- **WebSocket**: Real-time communication layer
- **Database**: SQLite database management

## 📚 Documentation

- [Technical Documentation](docs/TECHNICAL_DOCUMENTATION.md)
- [API Documentation](docs/api/)
- [Development Guide](docs/development/)

## 🛠️ Development

### Commands
```bash
# Development mode
./bin/launch.sh dev

# Run tests
npm test

# Build all packages
npm run build
```

## 🔧 Requirements

- Node.js 18+
- npm 8+

## 📊 Status

✅ MCP Server Module  
✅ Project Structure  
✅ Launcher Scripts  
✅ Documentation  
✅ Test Framework  
🚧 LSP-DAP Module  
🚧 API Gateway  
🚧 Authentication Service  

## 🤝 Contributing

1. Follow the modular structure
2. Write tests for new features
3. Update documentation
4. Follow coding standards

---
**Developed by: Sahon Srabon**  
**Architecture: Modular Monorepo**