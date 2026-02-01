# Master Documentation Index

This is the central documentation hub for the UAS Admin System. All documentation is organized by category for easy navigation. **See [project-index.json](../project-index.json) for comprehensive system overview and component mapping.**

## 📚 Documentation Categories

### System Integration Updates (2026-01-31)

#### Dynamic Agent Configuration
- **Dynamic Config Service**: `/server/src/services/dynamic-config.ts` - Real-time configuration with database polling
- **Agent Management API**: `/server/src/routes/agent-management.ts` - Full CRUD operations for agents
- **Persona Integration**: `/server/src/services/ollama.ts` - Agent-specific response generation with Bengali transparency

#### Proxy Pattern Implementation
- **MCP Proxy Service**: `/server/src/services/mcp-proxy.ts` - Standardized frontend-backend-MCP communication
- **Chat Service**: `/server/src/routes/chat.ts` - Persona-aware chat with error handling
- **Editor Integration**: `/app/editor/` - AI-assisted code editing

#### RAG Pipeline Enhancements
- **Query Processor**: Enhanced natural language understanding
- **Context Retriever**: Improved semantic search capabilities
- **Response Generator**: Persona-consistent LLM integration

### 1. System Architecture
Core system design and architectural documentation.

- [System Architecture Overview (BN)](./system_overview_bn.md) - Bangla system overview
- [Database Architecture](./database_architecture.md) - Database design and schema
- [Database Architecture (BN)](./database_architecture_bn.md) - Bangla database documentation
- [Architecture Documentation](./architecture/) - Complete architectural blueprints

### 2. Installation & Setup
Guides for installing and configuring the system.

- [Installation Guide](./installation/INSTALLATION.md) - Complete installation instructions
- [Quick Start Guide](./installation/QUICK_START.md) - Fast setup guide
- [Configuration Guide](./configuration/CONFIGURATION.md) - System configuration documentation

### 3. API Documentation
API endpoints, usage, and integration guides.

- [API Documentation](./api/API_DOCUMENTATION.md) - Complete API reference
- [API Overview](./api/API.md) - API usage guide

### 4. Development
Developer guides and contribution documentation.

- [Development Guide](./development/DEVELOPMENT.md) - Development workflow
- [Next.js Development](./development/next.md) - Next.js specific documentation

### 5. Deployment
Deployment strategies and platform-specific guides.

- [Vercel Deployment](./deployment/vercel.md) - Vercel deployment guide

### 6. Cloudflare Tunnel
Cloudflare tunnel setup and configuration.

- [Cloudflare Tunnel Implementation](./cloudflare%20tunnel/) - Complete tunnel documentation
- [Local Setup Guide](./cloudflare%20tunnel/LOCAL_SETUP_GUIDE.md) - Local development setup
- [Domain Setup](./cloudflare%20tunnel/domain-setup.html) - Domain configuration guide

### 7. Identity & Authentication
Identity management and authentication systems.

- [Identity System](./identity/) - Identity management documentation

### 8. Testing
Testing strategies and procedures.

- [Testing Documentation](./testing/TESTING.md) - Testing guidelines

### 9. Admin Panel Design
Admin panel interface and functionality design.

- [Admin Panel Design](./admin_panel_design.md) - Admin panel design documentation
- [Admin Panel Design (BN)](./admin_panel_design_bn.md) - Bangla admin panel design

## 🚀 Quick Start

For immediate setup, refer to:
1. [Quick Start Guide](./installation/QUICK_START.md)
2. [Installation Guide](./installation/INSTALLATION.md)
3. [Configuration Guide](./configuration/CONFIGURATION.md)

## 🛠 Development

For developers:
1. [Development Guide](./development/DEVELOPMENT.md)
2. [API Documentation](./api/API_DOCUMENTATION.md)
3. [Architecture Documentation](./architecture/)

## 📖 Additional Resources

- [README](./README.md) - Main project documentation
- [System Architecture (BN)](./system_overview_bn.md) - Comprehensive Bangla documentation

## 📁 Directory Structure

```
docs/
├── architecture/          # System architecture documentation
├── installation/          # Installation guides
├── configuration/         # Configuration documentation
├── api/                  # API documentation
├── development/          # Development guides
├── deployment/           # Deployment guides
├── cloudflare tunnel/    # Cloudflare tunnel documentation
├── identity/             # Identity management
├── testing/              # Testing documentation
├── admin_panel_design.md # Admin panel design
├── database_architecture.md # Database design
└── MASTER_DOCUMENTATION_INDEX.md # This file
```

## 🔧 System Components

The UAS Admin System consists of:

1. **Frontend** - Next.js React application
2. **Backend** - Node.js API server
3. **Database** - MySQL database
4. **MCP Server** - Model Control Protocol server
5. **WebSocket Server** - Real-time communication
6. **Services** - Various microservices

### Recent Component Additions (2026-01-31)

7. **Dynamic Configuration Service** - Runtime agent management
8. **MCP Proxy Service** - Standardized communication pattern
9. **Persona-aware Response System** - Agent-specific communication
10. **Real-time Configuration Updates** - Polling-based configuration sync

## 📞 Support

For issues and questions:
- Check the [Testing Documentation](./testing/TESTING.md)
- Review [Development Guide](./development/DEVELOPMENT.md)
- Refer to specific component documentation in respective directories

## 🔄 Recent System Updates (2026-01-31)

### Major Enhancements Implemented
- ✅ Dynamic agent configuration with real-time updates
- ✅ Proxy pattern implementation for standardized communication
- ✅ Persona-aware response generation with Bengali transparency
- ✅ Enhanced RAG pipeline with improved context retrieval
- ✅ LSP/DAP proxy services for editor integration
- ✅ Comprehensive error handling and system monitoring

### Key Files Updated
- `/server/src/services/dynamic-config.ts` - New dynamic configuration service
- `/server/src/routes/agent-management.ts` - Agent CRUD operations
- `/server/src/services/mcp-proxy.ts` - MCP proxy implementation
- `/server/src/services/ollama.ts` - Persona integration
- `/docs/rag-pipeline-implementation.md` - Updated RAG documentation
- `/project-index.json` - Comprehensive system index

---
*Last Updated: January 31, 2026*
*Version: 2.0.0*