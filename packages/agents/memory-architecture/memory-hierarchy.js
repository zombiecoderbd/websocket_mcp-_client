/**
 * Agent Memory Architecture Hierarchy
 * Advanced AI Agent Architecture - Memory Management System
 * 
 * Implements the complete memory hierarchy as specified:
 * - Global Knowledge Base (Vector DB)
 * - Role-based Memory Pools
 * - Session Memory (Individual Context)
 */

class GlobalKnowledgeBase {
    constructor(config = {}) {
        this.collections = new Map();
        this.learningHistory = [];
        this.bestPractices = new Map();
        this.crossProjectInsights = new Map();
        this.config = config;
    }

    async initialize(vectorDB) {
        this.vectorDB = vectorDB;
        
        // Initialize global collections
        await this.createCollection('long_term_learning');
        await this.createCollection('code_patterns');
        await this.createCollection('best_practices');
        await this.createCollection('cross_project_insights');
        
        console.log('Global Knowledge Base initialized');
    }

    async createCollection(name) {
        if (!this.collections.has(name)) {
            this.collections.set(name, []);
        }
    }

    async storeLearning(content, metadata = {}) {
        const learningEntry = {
            id: this.generateId(),
            content: content,
            metadata: {
                ...metadata,
                timestamp: new Date().toISOString(),
                type: 'learning'
            }
        };
        
        await this.vectorDB.insertDocument('long_term_learning', content, metadata);
        this.learningHistory.push(learningEntry);
        
        return learningEntry.id;
    }

    async getCodePatterns(language = null) {
        const patterns = await this.vectorDB.retrieveContext(
            'code patterns',
            10,
            'code_patterns'
        );
        
        if (language) {
            return patterns.results.filter(pattern => 
                pattern.metadata.language === language
            );
        }
        
        return patterns.results;
    }

    async addBestPractice(practice, category) {
        const practiceEntry = {
            id: this.generateId(),
            practice: practice,
            category: category,
            timestamp: new Date().toISOString()
        };
        
        this.bestPractices.set(practiceEntry.id, practiceEntry);
        
        // Also store in vector database for semantic search
        await this.vectorDB.insertDocument(
            'best_practices',
            practice,
            { category, type: 'best_practice' }
        );
        
        return practiceEntry.id;
    }

    async getCrossProjectInsights(domain = null) {
        const insights = await this.vectorDB.retrieveContext(
            domain || 'insights',
            10,
            'cross_project_insights'
        );
        
        return insights.results;
    }

    generateId() {
        return `global_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

class RoleBasedMemoryPools {
    constructor(config = {}) {
        this.pools = new Map();
        this.config = config;
        this.availableRoles = ['developer', 'reviewer', 'debugger', 'architect', 'tester'];
    }

    async initialize(vectorDB) {
        this.vectorDB = vectorDB;
        
        // Initialize role-specific collections
        for (const role of this.availableRoles) {
            await this.createRolePool(role);
        }
        
        console.log('Role-based Memory Pools initialized');
    }

    async createRolePool(role) {
        if (!this.pools.has(role)) {
            this.pools.set(role, {
                context: [],
                preferences: new Map(),
                commonWorkflows: []
            });
            
            // Create corresponding vector collection
            await this.vectorDB.createCollection(`role_${role}_context`);
        }
    }

    async getContext(role, query, limit = 5) {
        if (!this.pools.has(role)) {
            throw new Error(`Role ${role} not found`);
        }

        // Retrieve from vector database
        const context = await this.vectorDB.retrieveContext(
            query,
            limit,
            `role_${role}_context`
        );
        
        return {
            role: role,
            query: query,
            results: context.results,
            preferences: this.pools.get(role).preferences,
            workflows: this.pools.get(role).commonWorkflows
        };
    }

    async updateRoleContext(role, content, metadata = {}) {
        if (!this.pools.has(role)) {
            await this.createRolePool(role);
        }

        const contextEntry = {
            id: this.generateId(),
            content: content,
            metadata: {
                ...metadata,
                role: role,
                timestamp: new Date().toISOString()
            }
        };

        // Store in vector database
        await this.vectorDB.insertDocument(
            `role_${role}_context`,
            content,
            { ...metadata, role }
        );

        // Update local pool
        const pool = this.pools.get(role);
        pool.context.push(contextEntry);

        return contextEntry.id;
    }

    async setPreference(role, key, value) {
        if (!this.pools.has(role)) {
            await this.createRolePool(role);
        }

        const pool = this.pools.get(role);
        pool.preferences.set(key, value);

        // Store preference in vector database for context
        await this.vectorDB.insertDocument(
            `role_${role}_context`,
            `Preference: ${key} = ${value}`,
            { type: 'preference', key, role }
        );
    }

    async addWorkflow(role, workflow) {
        if (!this.pools.has(role)) {
            await this.createRolePool(role);
        }

        const pool = this.pools.get(role);
        pool.commonWorkflows.push({
            id: this.generateId(),
            workflow: workflow,
            timestamp: new Date().toISOString()
        });
    }

    generateId() {
        return `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

class SessionMemory {
    constructor(config = {}) {
        this.sessions = new Map();
        this.config = config;
    }

    async initialize(vectorDB) {
        this.vectorDB = vectorDB;
        console.log('Session Memory initialized');
    }

    async createSession(sessionId, metadata = {}) {
        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, {
                id: sessionId,
                context: [],
                projectContext: null,
                recentChanges: [],
                conversationHistory: [],
                metadata: {
                    ...metadata,
                    createdAt: new Date().toISOString(),
                    status: 'active'
                }
            });
            
            // Create session-specific collection in vector DB
            await this.vectorDB.createCollection(`session_${sessionId}`);
        }
        
        return this.getSession(sessionId);
    }

    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }

    async updateSessionContext(sessionId, content, metadata = {}) {
        if (!this.sessions.has(sessionId)) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const session = this.sessions.get(sessionId);
        const contextEntry = {
            id: this.generateId(),
            content: content,
            metadata: {
                ...metadata,
                sessionId: sessionId,
                timestamp: new Date().toISOString()
            }
        };

        // Store in vector database
        await this.vectorDB.insertDocument(
            `session_${sessionId}`,
            content,
            { ...metadata, sessionId }
        );

        session.context.push(contextEntry);
        return contextEntry.id;
    }

    async addProjectContext(sessionId, projectData) {
        if (!this.sessions.has(sessionId)) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const session = this.sessions.get(sessionId);
        session.projectContext = {
            ...projectData,
            updatedAt: new Date().toISOString()
        };

        // Store project context in vector database
        await this.vectorDB.insertDocument(
            `session_${sessionId}`,
            JSON.stringify(projectData),
            { type: 'project_context', sessionId }
        );
    }

    async addFileChange(sessionId, fileChange) {
        if (!this.sessions.has(sessionId)) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const session = this.sessions.get(sessionId);
        session.recentChanges.push({
            ...fileChange,
            timestamp: new Date().toISOString()
        });
    }

    async addConversation(sessionId, message) {
        if (!this.sessions.has(sessionId)) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const session = this.sessions.get(sessionId);
        session.conversationHistory.push({
            ...message,
            timestamp: new Date().toISOString()
        });
    }

    async searchSessionContext(sessionId, query, limit = 5) {
        if (!this.sessions.has(sessionId)) {
            throw new Error(`Session ${sessionId} not found`);
        }

        // Search in vector database
        const results = await this.vectorDB.retrieveContext(
            query,
            limit,
            `session_${sessionId}`
        );

        return {
            sessionId: sessionId,
            query: query,
            results: results.results,
            localContext: this.sessions.get(sessionId).context.slice(-limit)
        };
    }

    generateId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

class ContextManager {
    constructor(config = {}) {
        this.config = config;
        this.activeContexts = new Map();
    }

    async initialize(globalKB, rolePools, sessionMemory) {
        this.globalKB = globalKB;
        this.rolePools = rolePools;
        this.sessionMemory = sessionMemory;
        
        console.log('Context Manager initialized');
    }

    async getCombinedContext(sessionId, role, query) {
        // Get context from all hierarchy levels
        const sessionContext = await this.sessionMemory.searchSessionContext(sessionId, query);
        const roleContext = await this.rolePools.getContext(role, query);
        const globalContext = await this.globalKB.getCodePatterns(); // or relevant global context

        return {
            session: sessionContext,
            role: roleContext,
            global: globalContext,
            combined: this.combineContexts(sessionContext, roleContext, globalContext),
            timestamp: new Date().toISOString()
        };
    }

    combineContexts(sessionContext, roleContext, globalContext) {
        // Combine contexts with priority: session > role > global
        const combined = {
            primary: sessionContext.results, // Highest priority
            secondary: roleContext.results,  // Medium priority
            tertiary: globalContext,         // Lowest priority
            metadata: {
                sessionCount: sessionContext.results.length,
                roleCount: roleContext.results.length,
                globalCount: globalContext.length,
                totalContextItems: sessionContext.results.length + 
                                roleContext.results.length + 
                                globalContext.length
            }
        };

        return combined;
    }

    async updateMemory(role, session, data) {
        // Update memory at appropriate hierarchy level
        await this.sessionMemory.updateSessionContext(session.id, data.content, data.metadata);
        await this.rolePools.updateRoleContext(role, data.content, data.metadata);
        await this.globalKB.storeLearning(data.content, data.metadata);
    }

    async createContextSnapshot(sessionId, role) {
        const snapshot = await this.getCombinedContext(sessionId, role, 'current context');
        
        return {
            id: this.generateId(),
            sessionId: sessionId,
            role: role,
            context: snapshot,
            timestamp: new Date().toISOString()
        };
    }

    generateId() {
        return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

class AgentMemoryHierarchy {
    constructor(config = {}) {
        this.config = config;
        this.globalKnowledge = new GlobalKnowledgeBase(config.global);
        this.rolePools = new RoleBasedMemoryPools(config.roles);
        this.sessionMemory = new SessionMemory(config.session);
        this.contextManager = new ContextManager(config.context);
        this.isInitialized = false;
    }

    async initialize(vectorDB) {
        console.log('Initializing Agent Memory Hierarchy...');

        // Initialize all components
        await this.globalKnowledge.initialize(vectorDB);
        await this.rolePools.initialize(vectorDB);
        await this.sessionMemory.initialize(vectorDB);
        await this.contextManager.initialize(
            this.globalKnowledge,
            this.rolePools,
            this.sessionMemory
        );

        this.isInitialized = true;
        console.log('Agent Memory Hierarchy initialized successfully');
    }

    async getContext(role, sessionId, query) {
        if (!this.isInitialized) {
            throw new Error('Memory hierarchy not initialized');
        }

        return await this.contextManager.getCombinedContext(sessionId, role, query);
    }

    async updateMemory(role, sessionId, data) {
        if (!this.isInitialized) {
            throw new Error('Memory hierarchy not initialized');
        }

        await this.contextManager.updateMemory(role, { id: sessionId }, data);
    }

    async createSession(sessionId, metadata = {}) {
        if (!this.isInitialized) {
            throw new Error('Memory hierarchy not initialized');
        }

        return await this.sessionMemory.createSession(sessionId, metadata);
    }

    async addLearning(content, metadata = {}) {
        if (!this.isInitialized) {
            throw new Error('Memory hierarchy not initialized');
        }

        return await this.globalKnowledge.storeLearning(content, metadata);
    }

    async addBestPractice(practice, category) {
        if (!this.isInitialized) {
            throw new Error('Memory hierarchy not initialized');
        }

        return await this.globalKnowledge.addBestPractice(practice, category);
    }

    async setRolePreference(role, key, value) {
        if (!this.isInitialized) {
            throw new Error('Memory hierarchy not initialized');
        }

        return await this.rolePools.setPreference(role, key, value);
    }

    async createSnapshot(sessionId, role) {
        if (!this.isInitialized) {
            throw new Error('Memory hierarchy not initialized');
        }

        return await this.contextManager.createContextSnapshot(sessionId, role);
    }

    getStatus() {
        return {
            initialized: this.isInitialized,
            components: {
                globalKnowledge: !!this.globalKnowledge,
                rolePools: !!this.rolePools,
                sessionMemory: !!this.sessionMemory,
                contextManager: !!this.contextManager
            },
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = {
    GlobalKnowledgeBase,
    RoleBasedMemoryPools,
    SessionMemory,
    ContextManager,
    AgentMemoryHierarchy
};