# Database Architecture and Memory Strategy

## Vector Database Strategy

### Data Types for Vector Database Inclusion

**Primary Data to Include:**
- **User Interaction History**: Past conversations, queries, and responses
- **Code Knowledge Base**: Frequently used code patterns, snippets, and best practices
- **Project Context**: Domain-specific information, project documentation
- **Learned Preferences**: User coding style, preferred patterns, common workflows
- **Problem-Solution Pairs**: Previously solved issues and their resolutions

**Data to Exclude (Redundant/Unnecessary):**
- Temporary session data that can be reconstructed
- Debug logs and system diagnostics
- Redundant configuration files that can be regenerated
- Temporary cache data
- Duplicate code samples already indexed elsewhere

### Agent Memory Architecture Decision

**Chosen Approach: Hybrid Model**
We will implement a **role-based shared memory** system with individual session contexts:

**Core Memory Structure:**
```
Memory Hierarchy:
├── Global Knowledge Base (Vector DB)
│   ├── Long-term Learning
│   ├── Code Patterns & Best Practices
│   └── Cross-project Insights
├── Role-based Memory Pools
│   ├── Developer Role Context
│   ├── Reviewer Role Context
│   └── Debugger Role Context
└── Session Memory (Individual Context)
    ├── Current Project Context
    ├── Recent File Changes
    └── Immediate Conversation History
```

**Rationale for Hybrid Approach:**
- Shared knowledge base prevents redundant learning
- Role-based partitioning maintains context relevance
- Individual session memory ensures privacy and personalization
- Scalable architecture for future multi-user scenarios

### Memory Monitoring and Sanity Checks

**Monitoring Script Framework:**
```javascript
// agent_monitor.js
class AgentMonitor {
  constructor() {
    this.thresholds = {
      memoryUsage: 80, // percentage
      responseTime: 2000, // milliseconds
      errorRate: 5, // percentage
      contextDrift: 0.3 // similarity threshold
    };
  }

  async checkAgentSanity(agentId) {
    const metrics = await this.collectMetrics(agentId);
    
    // Sanity checks
    const sanityReport = {
      memoryStable: metrics.memoryUsage < this.thresholds.memoryUsage,
      responseTimely: metrics.avgResponseTime < this.thresholds.responseTime,
      errorControlled: metrics.errorRate < this.thresholds.errorRate,
      contextConsistent: metrics.contextSimilarity > this.thresholds.contextDrift
    };

    if (!this.isAgentSane(sanityReport)) {
      await this.triggerIntervention(agentId, sanityReport);
    }

    return sanityReport;
  }

  async triggerIntervention(agentId, issues) {
    console.log(`Agent ${agentId} showing instability:`, issues);
    
    // Intervention strategies:
    // 1. Memory cleanup and optimization
    // 2. Context reset for specific areas
    // 3. Temporary role restriction
    // 4. Enhanced logging for debugging
  }
}
```

### Database Relations and Structure

**Multi-Database Architecture:**
```
Core Databases:
├── Vector Database (ChromaDB)
│   ├── Collections: user_knowledge, code_patterns, project_context
│   └── Embedding Model: sentence-transformers/all-MiniLM-L6-v2
├── Metadata Database (SQLite)
│   ├── Tables: agents, sessions, configurations, metrics
│   └── Relationships: Foreign keys linking agents to sessions
└── Cache Database (Redis)
    ├── TTL-based caching for frequent queries
    └── Session state management
```

**Key Relationships:**
- Each agent session references specific memory contexts
- User interactions link to relevant vector database entries
- Configuration changes trigger memory re-indexing
- Performance metrics feed into monitoring system

### CLI Features

**Essential CLI Commands:**
```bash
# Memory Management
zombiecoder memory status          # Check memory usage and health
zombiecoder memory cleanup         # Remove redundant entries
zombiecoder memory optimize        # Re-index and optimize storage

# Agent Monitoring
zombiecoder agent monitor          # Start real-time monitoring
zombiecoder agent sanity-check     # Run comprehensive sanity tests
zombiecoder agent reset-context    # Reset specific agent context

# Database Operations
zombiecoder db backup              # Create database backup
zombiecoder db restore             # Restore from backup
zombiecoder db migrate             # Apply schema migrations
```

### LSP-DAP Module Features (Minimalist & Effective)

**Core LSP Features:**
- **Diagnostics**: Real-time error detection and suggestions
- **Code Completion**: Context-aware intelligent completion
- **Definition Lookup**: Quick navigation to definitions
- **Hover Information**: Detailed documentation on hover

**Core DAP Features:**
- **Breakpoint Management**: Simple breakpoint setting/clearing
- **Variable Inspection**: Basic variable value display
- **Call Stack Navigation**: Simple stack trace viewing
- **Step Controls**: Basic step over/into/out functionality

**Philosophy**: Focus on reliability over feature completeness. Each feature must work flawlessly rather than having many half-working features.

### Implementation Timeline

**Phase 1 (Week 1-2):**
- [ ] Set up vector database infrastructure
- [ ] Implement basic memory storage structure
- [ ] Create monitoring framework foundation

**Phase 2 (Week 3-4):**
- [ ] Develop role-based memory partitioning
- [ ] Implement sanity checking mechanisms
- [ ] Build CLI tools for memory management

**Phase 3 (Week 5-6):**
- [ ] Integrate LSP-DAP minimal features
- [ ] Optimize database relationships and queries
- [ ] Comprehensive testing and validation

**Key Success Metrics:**
- Memory usage stays below 80% threshold
- Response times remain under 2 seconds
- Context drift stays above 70% similarity
- Zero critical sanity failures in production