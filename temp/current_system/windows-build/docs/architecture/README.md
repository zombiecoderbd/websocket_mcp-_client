# 🏗️ Architecture Documentation

This folder contains all core architectural documentation for the ZombieCoder system.

## 📚 Documentation Overview

### [MCP-Editor Agent Architecture.md](./MCP-Editor%20Agent%20Architecture.md)
**Core System Architecture** - Defines the fundamental architectural principles and component interactions.

Key topics covered:
- **Architectural Tenets** - Centralized intelligence and decentralized execution philosophy
- **Component Roles** - MCP Core (Leader), Editor Bridge (Client), Agent Layer (Worker)
- **Communication Protocols** - STDIO, HTTP, WebSocket implementations
- **Implementation Roadmap** - Phase 1 (Deterministic Core) and Phase 2 (Goal State)

### [Operational Blueprint.md](./Operational%20Blueprint.md)
**System Operations Design** - Comprehensive operational framework and component specifications.

Key sections:
- **Dashboard Design** - Command and control tower with system health monitoring
- **Models Management** - Unified view for local and cloud LLM management
- **Agent Orchestration** - System's brain for transforming model output into actions
- **Infrastructure Management** - Server visibility and distributed system control
- **Memory Systems** - AI's historical context and learning mechanisms

## 🎯 Purpose

These documents serve as the foundational blueprints for:
- System design and component interactions
- Protocol specifications and communication standards
- Operational procedures and monitoring requirements
- Scalability and future enhancement planning

## 📋 Standards Followed

- Industry best practices for modular system design
- Clear separation of concerns and responsibilities
- Standardized communication protocols
- Observable and debuggable system architecture