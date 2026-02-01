# Moved Demo/Experimental Code

This directory contains code that has been moved from the main project structure for organizational clarity.

## Contents

### `/mcp-server-demo/`
**Original Location**: `/packages/zombiecoder-mcp-server/`
**Status**: Demo/Experimental code with extended features
**Reason for Move**: Contains additional dependencies (LangChain) and experimental functionality that should be separated from production code

**Key Files Moved**:
- Extended MCP server implementation with additional features
- Test files and demonstration code
- Additional dependency packages (LangChain integration)
- Experimental agent factory and identity systems

### Why This Organization?

1. **Clear Separation**: Production code (`/packages/mcp-server/`) vs Demo code (`/temp/mcp-server-demo/`)
2. **Reduced Confusion**: Prevents mixing experimental features with production-ready components
3. **Dependency Management**: Keeps production dependencies minimal and clean
4. **Future Development**: Demo code can be referenced for future feature implementation

### Production MCP Server
The main MCP server implementation remains at `/packages/mcp-server/` which contains:
- Standard MCP SDK implementation
- Core functionality only
- Minimal external dependencies
- Production-ready code

### Reference for Future Work
This demo code can be referenced when:
- Implementing advanced features
- Testing new integrations
- Developing experimental functionality
- Creating proof-of-concepts

---
*Last Updated: February 1, 2026*