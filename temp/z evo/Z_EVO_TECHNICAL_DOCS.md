# 🧬 Z-Evo System Documentation

## 📋 Project Overview

Z-Evo is a professional AI agent system built with industry-standard architecture following modular monorepo patterns. The system is organized into separate, well-defined modules for maximum maintainability and scalability.

## 🏗️ Architecture Structure

```
z-evo/
├── bin/                        # Launcher scripts
│   └── launch.sh              # Main system launcher
├── packages/                   # Core modules
│   ├── core/                  # Shared utilities and types
│   ├── mcp-server/            # Model Coordination Protocol server
│   ├── lsp-dap/               # Language Server Protocol & Debug Adapter Protocol
│   ├── proxy-extension/       # Proxy and extension handling
│   ├── agents/                # AI agent implementations
│   ├── websocket/             # WebSocket communication layer
│   └── database/              # Database management
├── services/                   # Backend services
│   ├── api-gateway/           # Central API routing
│   ├── auth-service/          # Authentication and authorization
│   └── monitoring-service/    # System monitoring
├── libs/                       # Shared libraries
│   ├── utils/                 # Utility functions
│   ├── logger/                # Logging system
│   ├── config/                # Configuration management
│   └── security/              # Security utilities
├── docs/                       # Documentation
├── tests/                      # Test files
├── config/                     # Configuration files
├── data/                       # Data files and databases
├── package.json               # Root package configuration
└── README.md                  # Project overview
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 8+

### Installation
```bash
# Navigate to project root
cd /home/sahon/Desktop/sahon/z-evo

# Install all dependencies
npm run setup

# Start the system
./bin/launch.sh start

# Check system status
./bin/launch.sh status

# Stop the system
./bin/launch.sh stop
```

## 📦 Package Structure

### Core Packages (`packages/`)

#### 1. MCP Server (`packages/mcp-server/`)
- **Purpose**: Model Coordination Protocol implementation
- **Main Components**:
  - `Server.js` - Main server entry point
  - `ZombieCoderMCP.js` - MCP protocol handler
  - `WebSocketServer.js` - WebSocket communication
  - `AgentRuntimeMonitor.js` - Agent monitoring
  - `EditorConnectionManager.js` - Editor integration
- **Dependencies**: ws, sqlite3
- **Ports**: 3002 (WebSocket), 3003 (HTTP)

#### 2. LSP-DAP (`packages/lsp-dap/`)
- **Purpose**: Language Server Protocol and Debug Adapter Protocol
- **Features**: 
  - Code completion and IntelliSense
  - Debugging support
  - Language-specific features
- **Status**: To be implemented

#### 3. Proxy Extension (`packages/proxy-extension/`)
- **Purpose**: Extension and proxy management
- **Features**:
  - Extension loading/unloading
  - Proxy configuration
  - Plugin system
- **Status**: To be implemented

#### 4. Agents (`packages/agents/`)
- **Purpose**: AI agent implementations
- **Components**:
  - Multiple agent personas
  - Memory management
  - Conversation handling
- **Status**: Partially migrated from src/agents/

#### 5. WebSocket (`packages/websocket/`)
- **Purpose**: Real-time communication layer
- **Features**:
  - WebSocket server/client
  - Message routing
  - Connection management
- **Status**: To be implemented

#### 6. Database (`packages/database/`)
- **Purpose**: Database management and ORM
- **Components**:
  - SQLite database files
  - Schema definitions
  - Data access layer
- **Status**: Migrated from database/

### Services (`services/`)

#### 1. API Gateway (`services/api-gateway/`)
- **Purpose**: Central API routing and request handling
- **Features**:
  - REST API endpoints
  - Request validation
  - Rate limiting
- **Status**: To be implemented

#### 2. Auth Service (`services/auth-service/`)
- **Purpose**: Authentication and authorization
- **Features**:
  - User authentication
  - JWT token management
  - Role-based access control
- **Status**: To be implemented

#### 3. Monitoring Service (`services/monitoring-service/`)
- **Purpose**: System monitoring and metrics
- **Features**:
  - Performance monitoring
  - Health checks
  - Logging and metrics collection
- **Status**: To be implemented

### Libraries (`libs/`)

#### 1. Utils (`libs/utils/`)
- **Purpose**: Common utility functions
- **Components**: Helper functions, data processing

#### 2. Logger (`libs/logger/`)
- **Purpose**: Centralized logging system
- **Components**: `Logger.js` (migrated from packages/mcp-server/)

#### 3. Config (`libs/config/`)
- **Purpose**: Configuration management
- **Components**: Environment variables, config files

#### 4. Security (`libs/security/`)
- **Purpose**: Security utilities and middleware
- **Components**: Authentication, encryption, validation

## 🔧 Development Workflow

### Commands
```bash
# Development mode (hot reload)
./bin/launch.sh dev

# Run tests
npm test

# Build all packages
npm run build

# Check system status
./bin/launch.sh status
```

### Adding New Modules
1. Create new package in `packages/` or `services/`
2. Add package.json with proper dependencies
3. Update root package.json workspaces
4. Add to launch script if needed

## 📊 System Architecture

### Communication Flow
```
[Frontend] ←→ [API Gateway] ←→ [MCP Server] ←→ [Agents]
     ↓              ↓               ↓            ↓
[WebSocket]    [Auth Service]   [Database]   [LSP-DAP]
     ↓              ↓               ↓            ↓
[Extensions]   [Monitoring]     [Logging]    [Proxy]
```

### Port Allocation
- **3002**: MCP WebSocket Server
- **3003**: MCP HTTP Server  
- **8000**: API Gateway
- **8080**: WebSocket Communication
- **5432**: PostgreSQL (future)

## 🔒 Security Features

- JWT-based authentication
- Role-based access control
- Input validation and sanitization
- Secure WebSocket connections
- Environment-based configuration

## 📈 Performance Monitoring

- Real-time system metrics
- Agent performance tracking
- Database query optimization
- Memory usage monitoring
- Connection pooling

## 🛠️ Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check which ports are in use
   netstat -tlnp | grep :3002
   ```

2. **Dependency Issues**
   ```bash
   # Clean install
   rm -rf node_modules package-lock.json
   npm run setup
   ```

3. **Database Connection**
   ```bash
   # Check database status
   ls -la data/databases/
   ```

### Logs
- System logs: `data/logs/`
- Server logs: `packages/mcp-server/*.log`
- Error logs: Check console output

## 📚 Documentation

- **API Documentation**: `docs/api/`
- **Architecture Guide**: `docs/architecture/`
- **Development Setup**: `docs/development/`
- **Deployment Guide**: `docs/deployment/`

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Follow coding standards
4. Add tests for new features
5. Submit pull request

## 📄 License

This project is licensed under the MIT License.

---
**Developed by: Sahon Srabon**  
**Architecture: Modular Monorepo**  
**Status: Active Development**