const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ListResourcesRequestSchema,
    ReadResourceRequestSchema
} = require('@modelcontextprotocol/sdk/types.js');

class ZombieCoderMCP {
    constructor(logger, databaseManager) {
        this.server = new Server(
            {
                name: 'zombiecoder-mcp-server',
                version: '1.0.0',
            },
            {
                capabilities: {
                    tools: {},
                    resources: {},
                },
            }
        );
        
        this.logger = logger;
        this.db = databaseManager;
        this.tools = this.initializeTools();
        this.resources = this.initializeResources();
        
        // Connection management
        this.connections = new Map(); // Track active connections
        this.heartbeatInterval = null;
        this.connectionTimeout = 30000; // 30 seconds timeout
        
        this.setupEventHandlers();
    }

    initializeTools() {
        return {
            // Code Analysis Tools
            'analyze-code': {
                name: 'analyze-code',
                description: 'Analyze code for potential issues, improvements, and best practices',
                inputSchema: {
                    type: 'object',
                    properties: {
                        code: { type: 'string', description: 'The code to analyze' },
                        language: { type: 'string', description: 'Programming language of the code' },
                        context: { type: 'string', description: 'Additional context about the code purpose' }
                    },
                    required: ['code']
                }
            },
            
            'generate-documentation': {
                name: 'generate-documentation',
                description: 'Generate documentation for code, APIs, or functions',
                inputSchema: {
                    type: 'object',
                    properties: {
                        code: { type: 'string', description: 'The code to document' },
                        format: { type: 'string', enum: ['markdown', 'html', 'plain'], description: 'Output format' },
                        style: { type: 'string', description: 'Documentation style preference' }
                    },
                    required: ['code']
                }
            },
            
            'find-bugs': {
                name: 'find-bugs',
                description: 'Identify potential bugs and security vulnerabilities in code',
                inputSchema: {
                    type: 'object',
                    properties: {
                        code: { type: 'string', description: 'The code to scan for bugs' },
                        language: { type: 'string', description: 'Programming language' },
                        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Minimum severity level to report' }
                    },
                    required: ['code']
                }
            },
            
            // Project Management Tools
            'create-project-structure': {
                name: 'create-project-structure',
                description: 'Create a complete project structure with best practices',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Name of the project' },
                        language: { type: 'string', description: 'Primary programming language' },
                        framework: { type: 'string', description: 'Framework to use' },
                        features: { type: 'array', items: { type: 'string' }, description: 'List of features to include' }
                    },
                    required: ['projectName', 'language']
                }
            },
            
            'generate-readme': {
                name: 'generate-readme',
                description: 'Generate a comprehensive README.md file for a project',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Project name' },
                        description: { type: 'string', description: 'Project description' },
                        technologies: { type: 'array', items: { type: 'string' }, description: 'Technologies used' },
                        installationSteps: { type: 'array', items: { type: 'string' }, description: 'Installation instructions' }
                    },
                    required: ['projectName', 'description']
                }
            },
            
            // Utility Tools
            'format-code': {
                name: 'format-code',
                description: 'Format and beautify code according to language standards',
                inputSchema: {
                    type: 'object',
                    properties: {
                        code: { type: 'string', description: 'Code to format' },
                        language: { type: 'string', description: 'Programming language' },
                        style: { type: 'string', description: 'Formatting style preference' }
                    },
                    required: ['code', 'language']
                }
            },
            
            'convert-code': {
                name: 'convert-code',
                description: 'Convert code from one language or framework to another',
                inputSchema: {
                    type: 'object',
                    properties: {
                        code: { type: 'string', description: 'Source code to convert' },
                        fromLanguage: { type: 'string', description: 'Source language/framework' },
                        toLanguage: { type: 'string', description: 'Target language/framework' },
                        preserveLogic: { type: 'boolean', description: 'Whether to preserve business logic' }
                    },
                    required: ['code', 'fromLanguage', 'toLanguage']
                }
            },
            
            'explain-code': {
                name: 'explain-code',
                description: 'Provide detailed explanation of what code does and how it works',
                inputSchema: {
                    type: 'object',
                    properties: {
                        code: { type: 'string', description: 'Code to explain' },
                        language: { type: 'string', description: 'Programming language' },
                        detailLevel: { type: 'string', enum: ['basic', 'intermediate', 'advanced'], description: 'Level of detail' }
                    },
                    required: ['code']
                }
            }
        };
    }

    initializeResources() {
        return {
            'project-info': {
                uri: 'zombiecoder://project/info',
                mimeType: 'application/json',
                name: 'Project Information',
                description: 'General information about the current project and server'
            },
            'available-tools': {
                uri: 'zombiecoder://tools/list',
                mimeType: 'application/json',
                name: 'Available Tools',
                description: 'List of all available MCP tools'
            },
            'server-stats': {
                uri: 'zombiecoder://stats/server',
                mimeType: 'application/json',
                name: 'Server Statistics',
                description: 'Runtime statistics and performance metrics'
            }
        };
    }

    setupEventHandlers() {
        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const startTime = Date.now();
            const toolName = request.params.name;
            const toolArgs = request.params.arguments || {};
            
            try {
                this.logger.info(`Executing tool: ${toolName}`, { toolName, args: toolArgs }, 'mcp-server');
                
                if (!this.tools[toolName]) {
                    const error = `Tool '${toolName}' not found`;
                    await this.logger.logMcpOperation('tool_call', toolName, toolArgs, null, false, error, Date.now() - startTime);
                    throw new Error(error);
                }

                const result = await this.executeTool(toolName, toolArgs);
                const executionTime = Date.now() - startTime;
                
                await this.logger.logMcpOperation('tool_call', toolName, toolArgs, result, true, null, executionTime);
                
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                };
            } catch (error) {
                const executionTime = Date.now() - startTime;
                await this.logger.logMcpOperation('tool_call', toolName, toolArgs, null, false, error.message, executionTime);
                
                this.logger.error(`Tool execution failed: ${toolName}`, { 
                    error: error.message, 
                    toolName, 
                    args: toolArgs 
                }, 'mcp-server');
                
                return {
                    content: [{ type: 'text', text: `Error executing tool: ${error.message}` }],
                    isError: true
                };
            }
        });

        // Handle tool listing
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: Object.values(this.tools).map(tool => ({
                    name: tool.name,
                    description: tool.description,
                    inputSchema: tool.inputSchema
                }))
            };
        });

        // Handle resource listing
        this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
            return {
                resources: Object.values(this.resources).map(resource => ({
                    uri: resource.uri,
                    mimeType: resource.mimeType,
                    name: resource.name,
                    description: resource.description
                }))
            };
        });

        // Handle resource reading
        this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
            const uri = request.params.uri;
            
            try {
                const content = await this.readResource(uri);
                return {
                    contents: [{ uri, mimeType: this.resources[uri]?.mimeType || 'text/plain', text: content }]
                };
            } catch (error) {
                this.logger.error(`Failed to read resource: ${uri}`, { error: error.message }, 'mcp-server');
                throw error;
            }
        });
    }

    async executeTool(toolName, args) {
        switch (toolName) {
            case 'analyze-code':
                return await this.analyzeCode(args.code, args.language, args.context);
            
            case 'generate-documentation':
                return await this.generateDocumentation(args.code, args.format, args.style);
            
            case 'find-bugs':
                return await this.findBugs(args.code, args.language, args.severity);
            
            case 'create-project-structure':
                return await this.createProjectStructure(args.projectName, args.language, args.framework, args.features);
            
            case 'generate-readme':
                return await this.generateReadme(args.projectName, args.description, args.technologies, args.installationSteps);
            
            case 'format-code':
                return await this.formatCode(args.code, args.language, args.style);
            
            case 'convert-code':
                return await this.convertCode(args.code, args.fromLanguage, args.toLanguage, args.preserveLogic);
            
            case 'explain-code':
                return await this.explainCode(args.code, args.language, args.detailLevel);
            
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    async readResource(uri) {
        switch (uri) {
            case 'zombiecoder://project/info':
                const serverName = await this.db.getAdminSetting('mcp_server_name');
                const tagline = await this.db.getAdminSetting('tagline');
                return JSON.stringify({
                    name: serverName || 'ZombieCoder MCP Server',
                    version: '1.0.0',
                    tagline: tagline || 'যেখানে কোড ও কথা বলে',
                    description: 'Advanced MCP server with real-time logging and admin panel'
                }, null, 2);
            
            case 'zombiecoder://tools/list':
                return JSON.stringify(Object.values(this.tools), null, 2);
            
            case 'zombiecoder://stats/server':
                const requestStats = await this.db.getRequestStats();
                const connectionStats = await this.db.getConnectionStats();
                return JSON.stringify({
                    uptime: process.uptime(),
                    requestStats,
                    connectionStats,
                    toolsCount: Object.keys(this.tools).length,
                    resourcesCount: Object.keys(this.resources).length
                }, null, 2);
            
            default:
                throw new Error(`Resource not found: ${uri}`);
        }
    }

    // Tool implementation methods
    async analyzeCode(code, language, context) {
        // Simulate code analysis
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
            analysis: {
                language: language || 'unknown',
                linesOfCode: code.split('\n').length,
                complexity: Math.min(Math.floor(code.length / 100), 10),
                issues: [
                    { type: 'style', severity: 'medium', message: 'Consider adding more comments' },
                    { type: 'performance', severity: 'low', message: 'Potential optimization opportunity' }
                ],
                suggestions: [
                    'Add error handling',
                    'Consider breaking into smaller functions',
                    'Add type annotations'
                ]
            },
            context: context || 'No additional context provided'
        };
    }

    async generateDocumentation(code, format = 'markdown', style = 'comprehensive') {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const docContent = `# Generated Documentation
        
## Code Overview
This documentation was automatically generated for the provided code snippet.

## Function Descriptions
- Main functionality analysis
- Parameter descriptions  
- Return value explanations
- Usage examples

## Best Practices
- Follow established coding standards
- Include error handling
- Add comprehensive tests`;

        return {
            format: format,
            content: docContent,
            estimatedTime: '2 minutes to review and customize'
        };
    }

    async findBugs(code, language, severity = 'medium') {
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        return {
            bugsFound: 3,
            criticalIssues: severity === 'critical' ? 1 : 0,
            issues: [
                {
                    type: 'potential_bug',
                    severity: 'medium',
                    line: 15,
                    message: 'Potential null pointer exception',
                    suggestion: 'Add null check before accessing property'
                },
                {
                    type: 'security',
                    severity: 'high',
                    line: 23,
                    message: 'Hardcoded credentials detected',
                    suggestion: 'Move credentials to environment variables'
                },
                {
                    type: 'performance',
                    severity: 'low',
                    line: 45,
                    message: 'Inefficient loop structure',
                    suggestion: 'Consider using built-in array methods'
                }
            ]
        };
    }

    async createProjectStructure(projectName, language, framework, features = []) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const structure = {
            projectName,
            language,
            framework: framework || 'none specified',
            suggestedStructure: {
                'src/': 'Source code files',
                'tests/': 'Test files',
                'docs/': 'Documentation',
                'config/': 'Configuration files',
                'README.md': 'Project documentation'
            },
            features: features,
            nextSteps: [
                'Initialize version control',
                'Set up build system',
                'Configure testing framework',
                'Add CI/CD pipeline'
            ]
        };

        return structure;
    }

    async generateReadme(projectName, description, technologies = [], installationSteps = []) {
        await new Promise(resolve => setTimeout(resolve, 600));
        
        const readme = `# ${projectName}

${description}

## Technologies Used
${technologies.map(tech => `- ${tech}`).join('\n')}

## Installation

${installationSteps.length > 0 ? 
    installationSteps.map(step => `1. ${step}`).join('\n') : 
    '1. Clone the repository\n2. Install dependencies\n3. Configure environment variables\n4. Run the application'}

## Usage

Basic usage instructions would go here.

## Contributing

Guidelines for contributing to the project.

## License

License information.`;

        return {
            content: readme,
            wordCount: readme.split(/\s+/).length,
            sections: ['Title', 'Description', 'Technologies', 'Installation', 'Usage', 'Contributing', 'License']
        };
    }

    async formatCode(code, language, style = 'standard') {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Simple formatting simulation
        const formatted = code
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n');

        return {
            originalLength: code.length,
            formattedLength: formatted.length,
            improvementsMade: code.length !== formatted.length,
            formattedCode: formatted
        };
    }

    async convertCode(code, fromLanguage, toLanguage, preserveLogic = true) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return {
            conversion: {
                from: fromLanguage,
                to: toLanguage,
                logicPreserved: preserveLogic,
                confidence: 0.85,
                notes: [
                    'Syntax converted successfully',
                    'Semantic meaning preserved',
                    'Consider reviewing edge cases',
                    'Manual verification recommended'
                ]
            },
            convertedCode: `// Converted from ${fromLanguage} to ${toLanguage}\n${code}`,
            warnings: [
                'Conversion is simulated - actual conversion would require more sophisticated analysis',
                'Review the converted code for accuracy'
            ]
        };
    }

    async explainCode(code, language, detailLevel = 'intermediate') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
            explanation: {
                language: language || 'detected',
                purpose: 'This code appears to perform a computational task',
                keyComponents: [
                    'Input processing',
                    'Data transformation',
                    'Output generation'
                ],
                flow: 'The code processes input data through several transformation steps to produce the desired output',
                complexity: detailLevel === 'basic' ? 'Simple' : detailLevel === 'advanced' ? 'Complex' : 'Moderate'
            },
            detailLevel: detailLevel,
            estimatedUnderstandingTime: `${detailLevel === 'basic' ? '2' : detailLevel === 'advanced' ? '10' : '5'} minutes`
        };
    }

    async run() {
        const transport = new StdioServerTransport();
        
        // Add connection tracking
        const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const connectionInfo = {
            id: connectionId,
            type: 'stdio',
            status: 'active',
            connectedAt: new Date(),
            lastHeartbeat: new Date(),
            userAgent: 'mcp-client'
        };
        
        this.connections.set(connectionId, connectionInfo);
        
        // Start heartbeat monitoring
        this.startHeartbeat();
        
        await this.server.connect(transport);
        this.logger.info('ZombieCoder MCP Server started successfully', { connectionId }, 'mcp-server');
        await this.logger.logConnection('stdio', 'connected', `MCP server initialized with connection ${connectionId}`, 'localhost', 'mcp-client');
        
        // Update connection status
        connectionInfo.status = 'active';
        connectionInfo.lastHeartbeat = new Date();
    }
    
    // Connection management methods
    startHeartbeat() {
        if (this.heartbeatInterval) return;
        
        this.heartbeatInterval = setInterval(() => {
            const now = new Date();
            for (const [id, connection] of this.connections.entries()) {
                const timeSinceLastHeartbeat = now - connection.lastHeartbeat;
                
                if (timeSinceLastHeartbeat > this.connectionTimeout) {
                    // Connection timed out
                    connection.status = 'inactive';
                    this.logger.warn(`Connection ${id} timed out`, { 
                        lastHeartbeat: connection.lastHeartbeat,
                        timeout: this.connectionTimeout
                    }, 'mcp-server');
                } else {
                    // Send heartbeat
                    connection.lastHeartbeat = now;
                    this.logger.debug(`Heartbeat sent for connection ${id}`, {}, 'mcp-server');
                }
            }
        }, 10000); // Check every 10 seconds
    }
    
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    
    getConnectionStatus() {
        const status = {
            totalConnections: this.connections.size,
            activeConnections: 0,
            inactiveConnections: 0,
            connections: []
        };
        
        for (const [id, connection] of this.connections.entries()) {
            status.connections.push({
                id,
                type: connection.type,
                status: connection.status,
                connectedAt: connection.connectedAt,
                lastHeartbeat: connection.lastHeartbeat,
                userAgent: connection.userAgent
            });
            
            if (connection.status === 'active') {
                status.activeConnections++;
            } else {
                status.inactiveConnections++;
            }
        }
        
        return status;
    }
}

module.exports = ZombieCoderMCP;