/**
 * Automated Documentation Generation Engine
 * Advanced AI Agent Architecture - Documentation System
 * 
 * Generates comprehensive documentation for code files, identifies dependencies,
 * creates API documentation, and manages knowledge curation.
 */

class DocumentationEngine {
    constructor(config = {}) {
        this.config = {
            outputFormats: config.outputFormats || ['markdown', 'json'],
            includeCodeSnippets: config.includeCodeSnippets !== false,
            generateAPIEndpoints: config.generateAPIEndpoints !== false,
            analyzeDependencies: config.analyzeDependencies !== false,
            createDiagrams: config.createDiagrams || false,
            maxFileSize: config.maxFileSize || 100000 // 100KB
        };
        
        this.parsers = new Map();
        this.documentationCache = new Map();
        this.dependencyGraph = new Map();
    }

    /**
     * Initialize documentation engine with parsers for different file types
     */
    initialize() {
        // Register parsers for different file types
        this.registerParser('.js', new JSParser());
        this.registerParser('.ts', new TSParser());
        this.registerParser('.jsx', new JSXParser());
        this.registerParser('.tsx', new TSXParser());
        this.registerParser('.py', new PythonParser());
        this.registerParser('.go', new GoParser());
        this.registerParser('.java', new JavaParser());
        this.registerParser('.html', new HTMLParser());
        this.registerParser('.css', new CSSParser());
        this.registerParser('.md', new MarkdownParser());
        
        console.log('Documentation engine initialized with parsers');
    }

    registerParser(extension, parser) {
        this.parsers.set(extension.toLowerCase(), parser);
    }

    /**
     * Generate documentation for a single file
     */
    async generateDocumentation(filePath) {
        try {
            // Check cache first
            if (this.documentationCache.has(filePath)) {
                return this.documentationCache.get(filePath);
            }

            const extension = require('path').extname(filePath).toLowerCase();
            const parser = this.parsers.get(extension);

            if (!parser) {
                throw new Error(`No parser available for ${extension} files`);
            }

            // Read file content
            const fs = require('fs');
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Check file size to prevent memory issues
            if (Buffer.byteLength(content) > this.config.maxFileSize) {
                throw new Error(`File ${filePath} exceeds maximum size limit`);
            }

            // Parse the file content
            const parsedData = await parser.parse(content, filePath);
            
            // Generate documentation
            const documentation = this.createDocumentation(parsedData, filePath);
            
            // Add to cache
            this.documentationCache.set(filePath, documentation);
            
            return documentation;
        } catch (error) {
            console.error(`Error generating documentation for ${filePath}:`, error.message);
            throw error;
        }
    }

    /**
     * Generate documentation for multiple files
     */
    async generateDocumentationBatch(filePaths) {
        const results = [];
        
        for (const filePath of filePaths) {
            try {
                const doc = await this.generateDocumentation(filePath);
                results.push({
                    filePath,
                    documentation: doc,
                    status: 'success'
                });
            } catch (error) {
                results.push({
                    filePath,
                    error: error.message,
                    status: 'error'
                });
            }
        }
        
        return results;
    }

    /**
     * Create documentation structure from parsed data
     */
    createDocumentation(parsedData, filePath) {
        const now = new Date().toISOString();
        
        const documentation = {
            id: this.generateId(),
            filePath: filePath,
            fileName: require('path').basename(filePath),
            fileType: require('path').extname(filePath),
            parsedData: parsedData,
            metadata: {
                createdAt: now,
                updatedAt: now,
                generator: 'ZombieCoder Documentation Engine',
                version: '1.0'
            },
            summary: this.generateSummary(parsedData),
            dependencies: this.config.analyzeDependencies ? 
                this.extractDependencies(parsedData, filePath) : [],
            apiEndpoints: this.config.generateAPIEndpoints ? 
                this.extractAPIEndpoints(parsedData) : [],
            codeSnippets: this.config.includeCodeSnippets ? 
                this.extractCodeSnippets(parsedData) : [],
            complexity: this.calculateComplexity(parsedData),
            qualityMetrics: this.calculateQualityMetrics(parsedData)
        };

        return documentation;
    }

    /**
     * Generate summary of the file
     */
    generateSummary(parsedData) {
        const summary = {
            totalFunctions: parsedData.functions ? parsedData.functions.length : 0,
            totalClasses: parsedData.classes ? parsedData.classes.length : 0,
            totalVariables: parsedData.variables ? parsedData.variables.length : 0,
            totalComments: parsedData.comments ? parsedData.comments.length : 0,
            hasImports: !!(parsedData.imports && parsedData.imports.length > 0),
            hasExports: !!(parsedData.exports && parsedData.exports.length > 0),
            description: this.inferDescription(parsedData)
        };

        return summary;
    }

    /**
     * Infer description from code
     */
    inferDescription(parsedData) {
        if (parsedData.comments && parsedData.comments.length > 0) {
            // Look for JSDoc or other comment blocks at the top
            const topComment = parsedData.comments[0];
            if (topComment && topComment.content) {
                return topComment.content.substring(0, 200) + '...';
            }
        }
        
        if (parsedData.functions && parsedData.functions.length > 0) {
            return `Contains ${parsedData.functions.length} function(s) and ${parsedData.classes ? parsedData.classes.length : 0} class(es)`;
        }
        
        return 'Code file with unknown content';
    }

    /**
     * Extract dependencies from parsed data
     */
    extractDependencies(parsedData, filePath) {
        if (!parsedData.imports) return [];
        
        const dependencies = parsedData.imports.map(imp => ({
            module: imp.module,
            type: imp.type,
            alias: imp.alias || null,
            resolvedPath: this.resolveImportPath(imp.module, filePath)
        }));

        return dependencies;
    }

    /**
     * Resolve import path relative to the current file
     */
    resolveImportPath(importPath, currentFile) {
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
            const path = require('path');
            const resolved = path.resolve(path.dirname(currentFile), importPath);
            return resolved;
        }
        return importPath; // External module
    }

    /**
     * Extract API endpoints from parsed data
     */
    extractAPIEndpoints(parsedData) {
        if (!parsedData.functions) return [];
        
        // Look for functions that might be API endpoints
        const endpointPatterns = [
            /get.*api/i,
            /post.*api/i,
            /api.*get/i,
            /api.*post/i,
            /handler/i,
            /route/i,
            /endpoint/i,
            /controller/i
        ];

        const endpoints = parsedData.functions.filter(fn => {
            return endpointPatterns.some(pattern => pattern.test(fn.name));
        }).map(fn => ({
            name: fn.name,
            type: this.inferEndpointType(fn.name),
            parameters: fn.parameters || [],
            returnType: fn.returnType || 'unknown',
            description: fn.description || `API endpoint function ${fn.name}`
        }));

        return endpoints;
    }

    /**
     * Infer endpoint type from function name
     */
    inferEndpointType(functionName) {
        if (/get/i.test(functionName)) return 'GET';
        if (/post/i.test(functionName)) return 'POST';
        if (/put/i.test(functionName)) return 'PUT';
        if (/delete/i.test(functionName)) return 'DELETE';
        return 'UNKNOWN';
    }

    /**
     * Extract code snippets from parsed data
     */
    extractCodeSnippets(parsedData) {
        if (!parsedData.functions) return [];
        
        return parsedData.functions.slice(0, 3).map(fn => ({
            name: fn.name,
            signature: fn.signature || this.generateSignature(fn),
            snippet: this.generateSnippet(fn),
            complexity: fn.complexity || this.calculateFunctionComplexity(fn)
        }));
    }

    /**
     * Generate function signature
     */
    generateSignature(functionData) {
        if (functionData.parameters) {
            const params = functionData.parameters.map(p => p.name).join(', ');
            return `${functionData.name}(${params})`;
        }
        return `${functionData.name}(...)`;
    }

    /**
     * Generate code snippet
     */
    generateSnippet(functionData) {
        // Generate a simple code snippet based on function data
        const params = (functionData.parameters || []).map(p => p.name).join(', ');
        return `function ${functionData.name}(${params}) {\n  // Implementation here\n}`;
    }

    /**
     * Calculate code complexity
     */
    calculateComplexity(parsedData) {
        let complexity = 0;
        
        if (parsedData.functions) {
            complexity += parsedData.functions.length * 2;
        }
        
        if (parsedData.classes) {
            complexity += parsedData.classes.length * 3;
        }
        
        if (parsedData.variables) {
            complexity += parsedData.variables.length;
        }
        
        if (parsedData.imports) {
            complexity += parsedData.imports.length;
        }
        
        return complexity;
    }

    /**
     * Calculate function complexity
     */
    calculateFunctionComplexity(functionData) {
        let complexity = 1; // Base complexity
        
        if (functionData.parameters) {
            complexity += functionData.parameters.length;
        }
        
        // Add complexity for control structures
        if (functionData.body) {
            if (functionData.body.includes('if')) complexity += 1;
            if (functionData.body.includes('for')) complexity += 1;
            if (functionData.body.includes('while')) complexity += 1;
            if (functionData.body.includes('switch')) complexity += 2;
        }
        
        return complexity;
    }

    /**
     * Calculate quality metrics
     */
    calculateQualityMetrics(parsedData) {
        const metrics = {
            commentRatio: 0,
            functionCount: parsedData.functions ? parsedData.functions.length : 0,
            avgFunctionLength: 0,
            cohesion: 0,
            coupling: 0
        };

        if (parsedData.comments && parsedData.functions) {
            const totalLines = this.estimateLines(parsedData);
            const commentLines = parsedData.comments.reduce((sum, comment) => 
                sum + comment.content.split('\n').length, 0);
            
            metrics.commentRatio = totalLines > 0 ? commentLines / totalLines : 0;
        }

        return metrics;
    }

    /**
     * Estimate number of lines in parsed data
     */
    estimateLines(parsedData) {
        // Simplified estimation
        let lines = 0;
        if (parsedData.functions) {
            lines += parsedData.functions.length * 10; // Assume ~10 lines per function
        }
        if (parsedData.classes) {
            lines += parsedData.classes.length * 20; // Assume ~20 lines per class
        }
        return lines;
    }

    /**
     * Export documentation in different formats
     */
    exportDocumentation(documentation, format = 'json') {
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(documentation, null, 2);
            case 'markdown':
                return this.toMarkdown(documentation);
            case 'html':
                return this.toHTML(documentation);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Convert documentation to Markdown format
     */
    toMarkdown(documentation) {
        let md = `# Documentation: ${documentation.fileName}\n\n`;
        
        md += `**File:** ${documentation.filePath}\n`;
        md += `**Type:** ${documentation.fileType}\n`;
        md += `**Generated:** ${documentation.metadata.createdAt}\n\n`;
        
        // Summary
        md += `## Summary\n\n`;
        md += `- Functions: ${documentation.summary.totalFunctions}\n`;
        md += `- Classes: ${documentation.summary.totalClasses}\n`;
        md += `- Comments: ${documentation.summary.totalComments}\n`;
        md += `- Dependencies: ${documentation.dependencies.length}\n`;
        md += `- Complexity Score: ${documentation.complexity}\n\n`;
        
        // Description
        if (documentation.summary.description) {
            md += `## Description

${documentation.summary.description}

`;
        }
        
        // Functions
        if (documentation.parsedData.functions && documentation.parsedData.functions.length > 0) {
            md += `## Functions\n\n`;
            documentation.parsedData.functions.forEach(fn => {
                md += `- **${fn.name}** - ${fn.description || 'No description'}\n`;
            });
            md += `\n`;
        }
        
        // Classes
        if (documentation.parsedData.classes && documentation.parsedData.classes.length > 0) {
            md += `## Classes\n\n`;
            documentation.parsedData.classes.forEach(cls => {
                md += `- **${cls.name}** - ${cls.description || 'No description'}\n`;
            });
            md += `\n`;
        }
        
        // API Endpoints
        if (documentation.apiEndpoints && documentation.apiEndpoints.length > 0) {
            md += `## API Endpoints\n\n`;
            documentation.apiEndpoints.forEach(endpoint => {
                md += `- **${endpoint.name}** (${endpoint.type}): ${endpoint.description}\n`;
            });
            md += `\n`;
        }
        
        // Dependencies
        if (documentation.dependencies && documentation.dependencies.length > 0) {
            md += `## Dependencies\n\n`;
            documentation.dependencies.forEach(dep => {
                md += `- ${dep.module} (${dep.type})\n`;
            });
            md += `\n`;
        }
        
        return md;
    }

    /**
     * Convert documentation to HTML format
     */
    toHTML(documentation) {
        let html = `<!DOCTYPE html>
<html>
<head>
    <title>Documentation: ${documentation.fileName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .section { margin: 20px 0; }
        .function, .class, .endpoint, .dependency { margin: 10px 0; padding: 10px; border-left: 3px solid #ccc; }
        h1, h2 { color: #333; }
    </style>
</head>
<body>
    <h1>Documentation: ${documentation.fileName}</h1>
    <div class="section">
        <p><strong>File:</strong> ${documentation.filePath}</p>
        <p><strong>Type:</strong> ${documentation.fileType}</p>
        <p><strong>Generated:</strong> ${documentation.metadata.createdAt}</p>
    </div>`;

        // Summary
        html += `<div class="section"><h2>Summary</h2>`;
        html += `<ul>
            <li>Functions: ${documentation.summary.totalFunctions}</li>
            <li>Classes: ${documentation.summary.totalClasses}</li>
            <li>Comments: ${documentation.summary.totalComments}</li>
            <li>Dependencies: ${documentation.dependencies.length}</li>
            <li>Complexity Score: ${documentation.complexity}</li>
        </ul></div>`;

        // Description
        if (documentation.summary.description) {
            html += `<div class="section"><h2>Description</h2><p>${documentation.summary.description}</p></div>`;
        }

        // Functions
        if (documentation.parsedData.functions && documentation.parsedData.functions.length > 0) {
            html += `<div class="section"><h2>Functions</h2>`;
            documentation.parsedData.functions.forEach(fn => {
                html += `<div class="function"><strong>${fn.name}</strong> - ${fn.description || 'No description'}</div>`;
            });
            html += `</div>`;
        }

        // Classes
        if (documentation.parsedData.classes && documentation.parsedData.classes.length > 0) {
            html += `<div class="section"><h2>Classes</h2>`;
            documentation.parsedData.classes.forEach(cls => {
                html += `<div class="class"><strong>${cls.name}</strong> - ${cls.description || 'No description'}</div>`;
            });
            html += `</div>`;
        }

        // API Endpoints
        if (documentation.apiEndpoints && documentation.apiEndpoints.length > 0) {
            html += `<div class="section"><h2>API Endpoints</h2>`;
            documentation.apiEndpoints.forEach(endpoint => {
                html += `<div class="endpoint"><strong>${endpoint.name}</strong> (${endpoint.type}): ${endpoint.description}</div>`;
            });
            html += `</div>`;
        }

        // Dependencies
        if (documentation.dependencies && documentation.dependencies.length > 0) {
            html += `<div class="section"><h2>Dependencies</h2>`;
            documentation.dependencies.forEach(dep => {
                html += `<div class="dependency">${dep.module} (${dep.type})</div>`;
            });
            html += `</div>`;
        }

        html += `</body></html>`;
        return html;
    }

    generateId() {
        return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get documentation engine status
     */
    getStatus() {
        return {
            initialized: this.parsers.size > 0,
            registeredParsers: Array.from(this.parsers.keys()),
            cachedDocuments: this.documentationCache.size,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Base parser class
 */
class BaseParser {
    async parse(content, filePath) {
        throw new Error('parse method must be implemented by subclasses');
    }
}

/**
 * JavaScript Parser
 */
class JSParser extends BaseParser {
    async parse(content, filePath) {
        // Simple regex-based parsing for demonstration
        // In a real implementation, this would use a proper AST parser
        const functions = this.extractFunctions(content);
        const classes = this.extractClasses(content);
        const variables = this.extractVariables(content);
        const imports = this.extractImports(content);
        const exports = this.extractExports(content);
        const comments = this.extractComments(content);

        return {
            functions,
            classes,
            variables,
            imports,
            exports,
            comments,
            content: content.substring(0, 1000) + '...' // Truncate for performance
        };
    }

    extractFunctions(content) {
        const functionRegex = /(?:function\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*{/g;
        const functions = [];
        let match;

        while ((match = functionRegex.exec(content)) !== null) {
            functions.push({
                name: match[1],
                signature: match[0].trim(),
                position: match.index
            });
        }

        return functions;
    }

    extractClasses(content) {
        const classRegex = /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:extends\s+[a-zA-Z_$][a-zA-Z0-9_$]*)?\s*{/g;
        const classes = [];
        let match;

        while ((match = classRegex.exec(content)) !== null) {
            classes.push({
                name: match[1],
                extends: match[2] || null,
                position: match.index
            });
        }

        return classes;
    }

    extractVariables(content) {
        const varRegex = /(var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        const variables = [];
        let match;

        while ((match = varRegex.exec(content)) !== null) {
            variables.push({
                name: match[2],
                type: match[1],
                position: match.index
            });
        }

        return variables;
    }

    extractImports(content) {
        const importRegex = /import\s+(?:(?:\{[^}]*\}|[^'"\s]+)\s+from\s+)?['"]([^'"]+)['"]/g;
        const imports = [];
        let match;

        while ((match = importRegex.exec(content)) !== null) {
            imports.push({
                module: match[1],
                type: 'import'
            });
        }

        return imports;
    }

    extractExports(content) {
        const exportRegex = /export\s+(?:default\s+)?(?:function|class|const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        const exports = [];
        let match;

        while ((match = exportRegex.exec(content)) !== null) {
            exports.push({
                name: match[1],
                type: 'export'
            });
        }

        return exports;
    }

    extractComments(content) {
        const commentRegex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g;
        const comments = [];
        let match;

        while ((match = commentRegex.exec(content)) !== null) {
            comments.push({
                content: match[1],
                type: match[1].startsWith('//') ? 'single-line' : 'multi-line',
                position: match.index
            });
        }

        return comments;
    }
}

/**
 * TypeScript Parser
 */
class TSParser extends JSParser {
    // TypeScript extends JavaScript, so we can reuse the JS parser
    // Additional TypeScript-specific parsing can be added here
}

/**
 * JSX Parser
 */
class JSXParser extends JSParser {
    // JSX is an extension of JavaScript, so we can reuse the JS parser
    // Additional JSX-specific parsing can be added here
}

/**
 * TSX Parser
 */
class TSXParser extends JSParser {
    // TSX combines TypeScript and JSX, so we can reuse the JS parser
    // Additional TSX-specific parsing can be added here
}

/**
 * Python Parser
 */
class PythonParser extends BaseParser {
    async parse(content, filePath) {
        // Simple regex-based parsing for Python
        const functions = this.extractFunctions(content);
        const classes = this.extractClasses(content);
        const imports = this.extractImports(content);
        const variables = this.extractVariables(content);
        const comments = this.extractComments(content);

        return {
            functions,
            classes,
            variables,
            imports,
            comments,
            content: content.substring(0, 1000) + '...'
        };
    }

    extractFunctions(content) {
        const functionRegex = /def\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\):/g;
        const functions = [];
        let match;

        while ((match = functionRegex.exec(content)) !== null) {
            functions.push({
                name: match[1],
                signature: match[0].trim(),
                position: match.index
            });
        }

        return functions;
    }

    extractClasses(content) {
        const classRegex = /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:\([^)]*\))?:/g;
        const classes = [];
        let match;

        while ((match = classRegex.exec(content)) !== null) {
            classes.push({
                name: match[1],
                position: match.index
            });
        }

        return classes;
    }

    extractImports(content) {
        const importRegex = /(import|from)\s+([a-zA-Z_$][a-zA-Z0-9_$\.]+)/g;
        const imports = [];
        let match;

        while ((match = importRegex.exec(content)) !== null) {
            imports.push({
                module: match[2],
                type: match[1]
            });
        }

        return imports;
    }

    extractVariables(content) {
        // Simple variable assignment detection
        const varRegex = /^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/gm;
        const variables = [];
        let match;

        while ((match = varRegex.exec(content)) !== null) {
            variables.push({
                name: match[1],
                position: match.index
            });
        }

        return variables;
    }

    extractComments(content) {
        const commentRegex = /(#.*?$|""".[\s\S]*?"""|'''.[\s\S]*?''')/gm;
        const comments = [];
        let match;

        while ((match = commentRegex.exec(content)) !== null) {
            comments.push({
                content: match[1],
                type: match[1].startsWith('#') ? 'single-line' : 'multi-line',
                position: match.index
            });
        }

        return comments;
    }
}

/**
 * Go Parser
 */
class GoParser extends BaseParser {
    async parse(content, filePath) {
        const functions = this.extractFunctions(content);
        const imports = this.extractImports(content);
        const structs = this.extractStructs(content);
        const comments = this.extractComments(content);

        return {
            functions,
            structs,
            imports,
            comments,
            content: content.substring(0, 1000) + '...'
        };
    }

    extractFunctions(content) {
        const functionRegex = /func\s+(?:\([^)]+\)\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*[^{]*/g;
        const functions = [];
        let match;

        while ((match = functionRegex.exec(content)) !== null) {
            functions.push({
                name: match[1],
                signature: match[0].trim(),
                position: match.index
            });
        }

        return functions;
    }

    extractImports(content) {
        const importRegex = /import\s+\([^)]*\)|import\s+["']([^"']+)["']/g;
        const imports = [];
        let match;

        while ((match = importRegex.exec(content)) !== null) {
            if (match[1]) {
                imports.push({
                    module: match[1],
                    type: 'import'
                });
            }
        }

        return imports;
    }

    extractStructs(content) {
        const structRegex = /type\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s+struct\s*{/g;
        const structs = [];
        let match;

        while ((match = structRegex.exec(content)) !== null) {
            structs.push({
                name: match[1],
                position: match.index
            });
        }

        return structs;
    }

    extractComments(content) {
        const commentRegex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g;
        const comments = [];
        let match;

        while ((match = commentRegex.exec(content)) !== null) {
            comments.push({
                content: match[1],
                type: match[1].startsWith('//') ? 'single-line' : 'multi-line',
                position: match.index
            });
        }

        return comments;
    }
}

/**
 * Java Parser
 */
class JavaParser extends BaseParser {
    async parse(content, filePath) {
        const classes = this.extractClasses(content);
        const functions = this.extractFunctions(content);
        const imports = this.extractImports(content);
        const variables = this.extractVariables(content);
        const comments = this.extractComments(content);

        return {
            classes,
            functions,
            imports,
            variables,
            comments,
            content: content.substring(0, 1000) + '...'
        };
    }

    extractClasses(content) {
        const classRegex = /(?:public|private|protected)?\s*class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        const classes = [];
        let match;

        while ((match = classRegex.exec(content)) !== null) {
            classes.push({
                name: match[1],
                position: match.index
            });
        }

        return classes;
    }

    extractFunctions(content) {
        const functionRegex = /(?:public|private|protected)?\s+(?:static\s+)?[a-zA-Z_$<>[\]]+\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*{/g;
        const functions = [];
        let match;

        while ((match = functionRegex.exec(content)) !== null) {
            functions.push({
                name: match[1],
                signature: match[0].trim(),
                position: match.index
            });
        }

        return functions;
    }

    extractImports(content) {
        const importRegex = /import\s+([a-zA-Z0-9_.]+);/g;
        const imports = [];
        let match;

        while ((match = importRegex.exec(content)) !== null) {
            imports.push({
                module: match[1],
                type: 'import'
            });
        }

        return imports;
    }

    extractVariables(content) {
        const varRegex = /(?:public|private|protected)?\s+[a-zA-Z_$][a-zA-Z0-9_$<>[\]]+\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[=;]/g;
        const variables = [];
        let match;

        while ((match = varRegex.exec(content)) !== null) {
            variables.push({
                name: match[1],
                position: match.index
            });
        }

        return variables;
    }

    extractComments(content) {
        const commentRegex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g;
        const comments = [];
        let match;

        while ((match = commentRegex.exec(content)) !== null) {
            comments.push({
                content: match[1],
                type: match[1].startsWith('//') ? 'single-line' : 'multi-line',
                position: match.index
            });
        }

        return comments;
    }
}

/**
 * HTML Parser
 */
class HTMLParser extends BaseParser {
    async parse(content, filePath) {
        const elements = this.extractElements(content);
        const comments = this.extractComments(content);

        return {
            elements,
            comments,
            content: content.substring(0, 1000) + '...'
        };
    }

    extractElements(content) {
        const elementRegex = /<([a-zA-Z][a-zA-Z0-9-]*)[^>]*>/g;
        const elements = [];
        let match;

        while ((match = elementRegex.exec(content)) !== null) {
            elements.push({
                tagName: match[1],
                position: match.index
            });
        }

        return elements;
    }

    extractComments(content) {
        const commentRegex = /<!--[\s\S]*?-->/g;
        const comments = [];
        let match;

        while ((match = commentRegex.exec(content)) !== null) {
            comments.push({
                content: match[0],
                type: 'html-comment',
                position: match.index
            });
        }

        return comments;
    }
}

/**
 * CSS Parser
 */
class CSSParser extends BaseParser {
    async parse(content, filePath) {
        const selectors = this.extractSelectors(content);
        const variables = this.extractVariables(content);
        const comments = this.extractComments(content);

        return {
            selectors,
            variables,
            comments,
            content: content.substring(0, 1000) + '...'
        };
    }

    extractSelectors(content) {
        const selectorRegex = /([.#]?[a-zA-Z0-9_-]+[^{]*)\s*{/g;
        const selectors = [];
        let match;

        while ((match = selectorRegex.exec(content)) !== null) {
            selectors.push({
                selector: match[1].trim(),
                position: match.index
            });
        }

        return selectors;
    }

    extractVariables(content) {
        const varRegex = /--([a-zA-Z0-9_-]+)\s*:\s*[^;]+;/g;
        const variables = [];
        let match;

        while ((match = varRegex.exec(content)) !== null) {
            variables.push({
                name: match[1],
                position: match.index
            });
        }

        return variables;
    }

    extractComments(content) {
        const commentRegex = /\/\*[\s\S]*?\*\//g;
        const comments = [];
        let match;

        while ((match = commentRegex.exec(content)) !== null) {
            comments.push({
                content: match[0],
                type: 'css-comment',
                position: match.index
            });
        }

        return comments;
    }
}

/**
 * Markdown Parser
 */
class MarkdownParser extends BaseParser {
    async parse(content, filePath) {
        const headings = this.extractHeadings(content);
        const links = this.extractLinks(content);
        const images = this.extractImages(content);

        return {
            headings,
            links,
            images,
            content: content.substring(0, 1000) + '...'
        };
    }

    extractHeadings(content) {
        const headingRegex = /^(#{1,6})\s+(.+)$/gm;
        const headings = [];
        let match;

        while ((match = headingRegex.exec(content)) !== null) {
            headings.push({
                level: match[1].length,
                text: match[2],
                position: match.index
            });
        }

        return headings;
    }

    extractLinks(content) {
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const links = [];
        let match;

        while ((match = linkRegex.exec(content)) !== null) {
            links.push({
                text: match[1],
                url: match[2],
                position: match.index
            });
        }

        return links;
    }

    extractImages(content) {
        const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
        const images = [];
        let match;

        while ((match = imgRegex.exec(content)) !== null) {
            images.push({
                alt: match[1],
                url: match[2],
                position: match.index
            });
        }

        return images;
    }
}

module.exports = DocumentationEngine;