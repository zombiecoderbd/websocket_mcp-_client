# UAS Admin Panel

Unified Agent System Administration Panel - A comprehensive admin interface for managing AI agents, models, and system infrastructure.

## 🚀 Current System Status (Updated: January 31, 2026)

### System Completion: 85%
- **Core Architecture**: 100% Complete
- **Basic Functionality**: 100% Complete
- **Advanced Features**: 85% Complete
- **Documentation**: 90% Complete
- **Testing Coverage**: 75% Complete

### Active Services
| Service | Port | Status | Notes |
|---------|------|--------|-------|
| Frontend (Next.js) | 3005 | ✅ Running | Moved from 3001 due to port conflict |
| Backend API | 8000 | ✅ Running | Fully operational |
| MCP Server | 3002 | ✅ Running | Agent management system |
| WebSocket MCP | 8080 | ✅ Running | Real-time communication |
| LSP-DAP Server | 3004 | ✅ Running | Code editor integration |

### Active Agents
1. **Girlfriend Coder** - Multi-language programming expertise
2. **Bengali Coding Assistant** - Dual language coding support
3. **Test Agent** - Basic LangChain functionality

### Core Features
- Real-time system monitoring
- Agent management and configuration
- Model management and testing
- Server infrastructure monitoring
- Conversation history tracking
- Memory management system
- Load balancing capabilities
- Prompt template management

### Technology Stack
- **Frontend**: Next.js 15.2.8, React, TypeScript
- **Backend**: Node.js, Express, TypeScript
- **Database**: MySQL with connection pooling
- **AI Integration**: Ollama, LangChain
- **Communication**: WebSocket, REST APIs
- **UI Components**: Shadcn/ui, Tailwind CSS

### Installation

1. Clone the repository:
```bash
git clone https://github.com/zombiecoderbd/websocket_mcp-_client.git
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

4. Start the development servers:
```bash
# Terminal 1: Start the backend
npm run backend

# Terminal 2: Start the frontend
npm run frontend

# Terminal 3: Start the MCP server
npm run mcp-server
```

### Agent Signature
This system is managed by a sophisticated AI agent with capabilities in:
- System administration and monitoring
- Multi-language support (especially Bengali and English)
- Real-time data processing
- Dynamic content generation
- Infrastructure management
- API integration and testing

### Project Structure
```
├── app/                    # Next.js application pages
├── components/            # Reusable UI components
├── server/               # Backend API server
├── packages/             # Shared packages and libraries
├── temp/                 # Temporary files and work-in-progress
├── docs/                 # Documentation files
└── windows-build/        # Windows-specific build artifacts
```

### Development

To contribute to this project:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

### License
MIT License - See LICENSE file for details.

---

**Maintained by**: ZombieCoder Bangladesh  
**Last Updated**: January 31, 2026  
**Version**: 1.0.0
