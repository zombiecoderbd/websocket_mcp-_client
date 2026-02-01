# Development Guidelines and Documentation Standards

## 📋 Overview

This document establishes clear development guidelines and documentation standards to ensure consistency, maintainability, and clarity across the entire project lifecycle. These guidelines are designed to prevent confusion between components and maintain a clear focus on our objectives.

## 🎯 Core Principles

### 1. **Always-On Objective Awareness**
> "যেখানেই যাব যাই করব আসলে আমাদের উদ্দেশ্য সবগুলোই একসাথে মাথায় থাকবে যাতে ভুল না করি"
> 
> "Wherever we go, whatever we do, our objectives should always be clear in our minds to avoid mistakes"

### 2. **Documentation-First Approach**
- Every code change must be accompanied by updated documentation
- Clear separation between demo/experimental code and production code
- Maintain comprehensive project index and cross-references

### 3. **Component Clarity**
- Each component must have a single, well-defined purpose
- Clear naming conventions to distinguish between similar components
- Regular audit to identify and remove redundant/duplicate code

## 📚 Documentation Standards

### Documentation Structure
```
/docs/
├── MASTER_DOCUMENTATION_INDEX.md  # Main navigation hub
├── system-overview.md             # High-level system architecture
├── component-guides/              # Component-specific documentation
├── api-documentation/             # API specifications
├── development-guidelines.md      # This file
└── project-index.json             # Machine-readable project structure
```

### Documentation Requirements

#### 1. **Every Component Must Have:**
- Clear purpose statement
- Integration points with other components
- Dependencies and requirements
- Usage examples
- Error handling patterns
- Current status (active/inactive/demo)

#### 2. **Code Comments Standards:**
```javascript
// ✅ GOOD - Clear, contextual comments
/**
 * Dynamic Configuration Service
 * Purpose: Real-time agent configuration management
 * Integration: Used by chat service and agent management API
 * Status: Production-ready
 */
class DynamicConfigService {
    // Implementation details...
}

// ❌ AVOID - Vague or redundant comments
// This function does something
function process() {
    // Do the thing
}
```

#### 3. **File Naming Conventions:**
- `component-name.ts` - Production code
- `component-name.demo.ts` - Demonstration code
- `component-name.test.ts` - Test code (authentic)
- `component-name.example.ts` - Example usage

## 🔧 Development Workflow

### 1. **Before Starting Any Work**
1. Review project objectives in `/project-index.json`
2. Check existing documentation for related components
3. Identify if similar functionality already exists
4. Plan integration points with existing system

### 2. **During Development**
1. Keep objectives visible (terminal/command line reference)
2. Update documentation in parallel with code changes
3. Test integration with dependent components
4. Verify no conflicts with existing functionality

### 3. **Before Committing**
1. Run full test suite
2. Verify documentation is complete and accurate
3. Check for duplicate/redundant code
4. Ensure proper component categorization

## 📁 Component Organization

### Production vs Demo Code Separation

#### Production Code Location:
```
/packages/
├── mcp-server/           # Main MCP server implementation
├── agents/              # Core agent functionality
├── database/            # Database integration
└── lsp-dap/             # Language server protocols
```

#### Demo/Experimental Code Location:
```
/temp/
├── demo-implementations/
├── experimental-features/
└── proof-of-concepts/
```

### MCP Server Organization Strategy

Based on analysis of both MCP server packages:

**Production MCP Server**: `/packages/mcp-server/`
- Standard MCP SDK implementation
- Core functionality only
- Production-ready dependencies
- Minimal external dependencies

**Demo/Experimental Code**: `/packages/zombiecoder-mcp-server/`
- Extended features and experimental functionality
- Additional dependencies (LangChain, etc.)
- Test files and demonstration code
- Should be moved to `/temp/` for clarity

## 🔄 Integration Guidelines

### 1. **Proxy Pattern Implementation**
```
Frontend UI → Backend API → MCP Proxy → Target Service
```

### 2. **Agent Configuration Flow**
```
Dynamic Config Service → Agent Management API → Chat Service → Ollama Service
```

### 3. **Error Handling Standards**
- Bengali transparent error messages for user-facing errors
- English technical logs for debugging
- Consistent error response format across all services

## ✅ Quality Assurance Checklist

Before any commit, verify:

- [ ] Documentation updated and accurate
- [ ] No duplicate functionality exists
- [ ] Component purpose is clear and singular
- [ ] Integration points documented
- [ ] Dependencies properly managed
- [ ] Error handling implemented
- [ ] Test coverage maintained
- [ ] Project index updated

## 🚨 Common Pitfalls to Avoid

### 1. **Component Confusion**
- ❌ Having multiple similar components with unclear differences
- ✅ Clear naming and documentation to distinguish components

### 2. **Documentation Lag**
- ❌ Code changes without documentation updates
- ✅ Documentation-first development approach

### 3. **Objective Drift**
- ❌ Losing sight of main project objectives
- ✅ Regular reference to project index and objectives

### 4. **Integration Issues**
- ❌ Components developed in isolation
- ✅ Continuous integration testing and documentation

## 📞 Support and Questions

For questions about these guidelines:
1. Check existing documentation first
2. Review project index for related components
3. Refer to component-specific documentation
4. Consult team leads for clarification

---

*Last Updated: February 1, 2026*
*Version: 1.0*