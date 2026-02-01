# Moved Demo/Experimental Code

This directory contains organized code that has been moved from the main project structure for better clarity, separation of concerns, and maintainability.

## 📁 Directory Structure

### `/mcp-server-demo/`
**Original Location**: `/packages/zombiecoder-mcp-server/`
**Status**: Demo/Experimental code with extended features
**Reason for Move**: Contains additional dependencies (LangChain) and experimental functionality that should be separated from production code

**Key Files Moved**:
- Extended MCP server implementation with additional features
- Test files and demonstration code
- Additional dependency packages (LangChain integration)
- Experimental agent factory and identity systems

### `/demo-implementations/`
**Content**: Working examples and demonstration code
- Complete editor agent implementations
- Various agent implementations and utilities
- Bridge and integration scripts
- Simulator and testing implementations

### `/experimental-features/`
**Content**: Work-in-progress and testing code
- Test scripts and verification tools
- Experimental WebSocket and MCP client implementations
- Cloud provider testing features
- Connection and integration tests

### `/proof-of-concepts/`
**Content**: Early-stage implementations and prototypes
- WebSocket MCP client implementations
- Enhanced MCP client variations
- Real-time technical test implementations
- System demonstration scripts

### `/old-documentation/`
**Content**: Historical documentation and system overviews
- System architecture documents
- Zombiecoder system overviews
- Technical documentation in Bengali
- Historical implementation summaries

## 🎯 Purpose and Guidelines

### What Belongs Here
- ✅ Experimental or demonstration code
- ✅ Deprecated but reference-worthy code
- ✅ Code being refactored or reorganized
- ✅ Temporary backups of working implementations
- ✅ Proof-of-concept implementations

### What Does NOT Belong Here
- ❌ Production-ready code
- ❌ Core system functionality
- ❌ Active development branches
- ❌ Code currently in use by the system

### Usage Guidelines
- 🔧 **Development Only**: Code here is for development, testing, and reference
- 🚫 **No Production Use**: Never use code from this directory in production
- 📋 **Regular Cleanup**: Perform monthly reviews to remove obsolete code
- 🏷️ **Clear Labeling**: All files should indicate their experimental nature
- 📝 **Documentation**: Each subdirectory should have clear README files

## 🔍 Quick Reference

### For Developers
```bash
# View demo implementations
cd /home/sahon/admin/temp/demo-implementations

# Check experimental features
cd /home/sahon/admin/temp/experimental-features

# Review proof of concepts
cd /home/sahon/admin/temp/proof-of-concepts
```

### For System Understanding
- **Current Production Code**: Located in `/packages/` and `/server/src/`
- **Documentation**: Main documentation in `/docs/`
- **System Status**: Check `SHORT_TERM_MEMORY.md` for current status

## 📊 Recent Organization Activities

### January 31, 2026
- ✅ Moved `/packages/zombiecoder-mcp-server/` to `/temp/mcp-server-demo/`
- ✅ Organized HTML files into appropriate categories
- ✅ Separated JavaScript demo files from production code
- ✅ Created clear directory structure with README documentation
- ✅ Established guidelines for future organization

### Verification
All moved code has been:
- ✅ Catalogued in this README
- ✅ Organized by purpose and functionality
- ✅ Labeled appropriately
- ✅ Made easily accessible for reference

## 🔄 Integration Status

### Production MCP Server
The main MCP server implementation remains at `/packages/mcp-server/` which contains:
- Standard MCP SDK implementation
- Core functionality only
- Minimal external dependencies
- Production-ready code

### Demo/Experimental Code
This directory contains extended implementations that:
- Demonstrate advanced features
- Test integration possibilities
- Provide reference implementations
- Support experimental development

### Reference for Future Work
This demo code can be referenced when:
- Implementing advanced features
- Testing new integrations
- Developing experimental functionality
- Creating proof-of-concepts

---
*Last Updated: February 1, 2026*
*Maintainer: System Administrator*