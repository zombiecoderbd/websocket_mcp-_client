/**
 * File Monitor System
 * Advanced AI Agent Architecture - File Watching and Change Detection
 * 
 * Implements real file system monitoring with SHA-256 hashing for change detection
 * and intelligent filtering of relevant file types.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const chokidar = require('chokidar');

class FileMonitor {
    constructor(config = {}) {
        this.directories = config.directories || [
            './src', 
            './components', 
            './app', 
            './pages', 
            './server/src',
            './packages/agents'
        ];
        this.fileTypes = config.fileTypes || [
            '.js', '.jsx', '.ts', '.tsx', 
            '.py', '.go', '.java', '.cpp', 
            '.html', '.css', '.scss',
            '.json', '.yaml', '.yml',
            '.md'
        ];
        this.ignorePatterns = config.ignorePatterns || [
            '**/node_modules/**',
            '**/.git/**',
            '**/dist/**',
            '**/build/**',
            '**/.next/**',
            '**/coverage/**',
            '**/*.log',
            '**/temp/**',
            '**/tmp/**'
        ];
        this.onChangeCallback = config.onChangeCallback || (() => {});
        this.fileHashes = new Map(); // Store file hashes for change detection
        this.watcher = null;
        this.isWatching = false;
    }

    async startWatching() {
        if (this.isWatching) {
            console.log('File monitor already running');
            return this.watcher;
        }

        console.log('Starting file monitoring...');
        
        // Initialize file hashes for existing files
        await this.initializeFileHashes();
        
        // Create chokidar watcher
        this.watcher = chokidar.watch(this.directories, {
            ignored: this.ignorePatterns,
            persistent: true,
            ignoreInitial: true, // Don't fire events for initial file discovery
            followSymlinks: true,
            ignorePermissionErrors: true,
            interval: 100,
            binaryInterval: 300
        });

        this.watcher
            .on('add', (filePath) => this.handleFileChange('add', filePath))
            .on('change', (filePath) => this.handleFileChange('change', filePath))
            .on('unlink', (filePath) => this.handleFileChange('unlink', filePath))
            .on('error', (error) => this.handleError(error))
            .on('ready', () => {
                console.log('File monitor ready - watching for changes...');
                this.isWatching = true;
            });

        return this.watcher;
    }

    async initializeFileHashes() {
        // Walk through directories and calculate hashes for existing files
        for (const dir of this.directories) {
            if (fs.existsSync(dir)) {
                await this.walkDirectory(dir);
            }
        }
    }

    async walkDirectory(dirPath) {
        try {
            const items = fs.readdirSync(dirPath);
            
            for (const item of items) {
                const fullPath = path.join(dirPath, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    await this.walkDirectory(fullPath);
                } else if (this.isFileOfType(fullPath)) {
                    const hash = await this.calculateFileHash(fullPath);
                    this.fileHashes.set(fullPath, hash);
                }
            }
        } catch (error) {
            console.warn(`Error walking directory ${dirPath}:`, error.message);
        }
    }

    async handleFileChange(type, filePath) {
        try {
            // Check if file type is relevant
            if (!this.isFileOfType(filePath)) {
                return;
            }

            let hash = null;
            let content = null;
            let size = 0;

            if (type !== 'unlink') {
                // Calculate hash and get content for add/change
                content = fs.readFileSync(filePath, 'utf8');
                hash = await this.calculateFileHash(filePath);
                size = Buffer.byteLength(content);
            }

            // For 'add' and 'change', check if it's actually a change by comparing hashes
            if (type === 'change') {
                const previousHash = this.fileHashes.get(filePath);
                if (previousHash === hash) {
                    // File content hasn't actually changed, just return
                    return;
                }
            }

            // Update hash in our map
            if (hash) {
                this.fileHashes.set(filePath, hash);
            } else {
                // For unlink, remove from hash map
                this.fileHashes.delete(filePath);
            }

            const fileInfo = {
                type, // 'add', 'change', or 'unlink'
                filePath,
                hash,
                previousHash: type === 'change' ? this.fileHashes.get(filePath) : null,
                timestamp: new Date().toISOString(),
                size,
                extension: path.extname(filePath),
                relativePath: path.relative(process.cwd(), filePath),
                content: type !== 'unlink' ? this.truncateContent(content) : null
            };

            // Call the registered callback
            await this.onChangeCallback(fileInfo);

            console.log(`File ${type}: ${filePath} (size: ${size} bytes)`);

        } catch (error) {
            console.error(`Error processing file change ${type} for ${filePath}:`, error.message);
        }
    }

    handleError(error) {
        console.error('File monitor error:', error);
    }

    isFileOfType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return this.fileTypes.includes(ext);
    }

    async calculateFileHash(filePath) {
        try {
            const content = fs.readFileSync(filePath);
            return crypto.createHash('sha256').update(content).digest('hex');
        } catch (error) {
            console.error(`Error calculating hash for ${filePath}:`, error.message);
            return null;
        }
    }

    truncateContent(content, maxLength = 5000) {
        // Truncate content to prevent memory issues with large files
        if (content && content.length > maxLength) {
            return content.substring(0, maxLength) + '... [TRUNCATED]';
        }
        return content;
    }

    async stopWatching() {
        if (this.watcher) {
            await this.watcher.close();
            this.isWatching = false;
            console.log('File monitoring stopped');
        }
    }

    getFileHashes() {
        return new Map(this.fileHashes);
    }

    getStatus() {
        return {
            isWatching: this.isWatching,
            watchedDirectories: this.directories,
            fileTypes: this.fileTypes,
            trackedFiles: this.fileHashes.size,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * File Change Processor
 * Processes file changes and integrates with agent memory system
 */
class FileChangeProcessor {
    constructor(config = {}) {
        this.memoryHierarchy = config.memoryHierarchy || null;
        this.agentRole = config.agentRole || 'developer';
        this.sessionId = config.sessionId || 'default_session';
        this.changeQueue = [];
        this.isProcessing = false;
    }

    setMemoryHierarchy(memoryHierarchy) {
        this.memoryHierarchy = memoryHierarchy;
    }

    setSession(sessionId, role = 'developer') {
        this.sessionId = sessionId;
        this.agentRole = role;
    }

    async processFileChange(changeInfo) {
        try {
            console.log(`Processing file change: ${changeInfo.type} - ${changeInfo.filePath}`);

            // Add to processing queue
            this.changeQueue.push(changeInfo);

            // Process immediately if not already processing
            if (!this.isProcessing) {
                await this.processQueue();
            }

        } catch (error) {
            console.error('Error processing file change:', error);
        }
    }

    async processQueue() {
        if (this.changeQueue.length === 0) {
            this.isProcessing = false;
            return;
        }

        this.isProcessing = true;

        while (this.changeQueue.length > 0) {
            const change = this.changeQueue.shift();
            
            try {
                await this.processSingleChange(change);
            } catch (error) {
                console.error(`Error processing change ${change.filePath}:`, error);
            }
        }

        this.isProcessing = false;
    }

    async processSingleChange(change) {
        // Create a structured representation of the change
        const structuredChange = {
            type: change.type,
            filePath: change.filePath,
            relativePath: change.relativePath,
            extension: change.extension,
            size: change.size,
            timestamp: change.timestamp,
            summary: this.generateFileSummary(change),
            changeType: this.categorizeChange(change),
            affectedComponents: await this.identifyAffectedComponents(change)
        };

        // Store in agent memory system
        if (this.memoryHierarchy) {
            await this.memoryHierarchy.updateMemory(
                this.agentRole,
                this.sessionId,
                {
                    content: `File ${change.type}: ${change.filePath}\n${structuredChange.summary}`,
                    metadata: {
                        ...structuredChange,
                        source: 'file_monitor',
                        eventType: 'file_change'
                    }
                }
            );
        }

        // Trigger documentation generation if needed
        await this.triggerDocumentationGeneration(structuredChange);

        console.log(`Processed file change: ${change.type} ${change.filePath}`);
    }

    generateFileSummary(change) {
        if (change.type === 'unlink') {
            return `File deleted: ${change.filePath}`;
        }

        if (!change.content) {
            return `File ${change.type}: ${change.filePath} (${change.size} bytes)`;
        }

        // Generate a summary based on file content
        const lines = change.content.split('\n');
        const firstFewLines = lines.slice(0, 5).join('\n').substring(0, 200);
        
        return `File ${change.type}: ${change.filePath}
Type: ${change.extension}
Size: ${change.size} bytes
First lines: ${firstFewLines}...`;
    }

    categorizeChange(change) {
        if (change.type === 'unlink') return 'deletion';

        const ext = change.extension.toLowerCase();
        if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
            return 'code';
        } else if (['.py'].includes(ext)) {
            return 'python';
        } else if (['.go'].includes(ext)) {
            return 'go';
        } else if (['.html', '.css', '.scss', '.sass'].includes(ext)) {
            return 'frontend';
        } else if (['.json', '.yaml', '.yml'].includes(ext)) {
            return 'config';
        } else if (['.md'].includes(ext)) {
            return 'documentation';
        }
        
        return 'other';
    }

    async identifyAffectedComponents(change) {
        // Analyze the file to identify what components might be affected
        if (!change.content) return [];

        const affected = [];
        
        // Look for imports/references in the content
        if (change.content.includes('import') || change.content.includes('require')) {
            affected.push('dependencies');
        }
        
        // Look for function/class definitions
        if (change.content.match(/function\s+\w+|class\s+\w+|def\s+\w+/)) {
            affected.push('functions');
        }
        
        // Look for API endpoints
        if (change.content.match(/getServerSideProps|getStaticProps|api|endpoint/)) {
            affected.push('api');
        }

        return affected;
    }

    async triggerDocumentationGeneration(change) {
        // Placeholder for documentation generation trigger
        // This would integrate with the documentation engine
        console.log(`Documentation generation triggered for: ${change.filePath}`);
    }

    getQueueStatus() {
        return {
            pendingChanges: this.changeQueue.length,
            isProcessing: this.isProcessing,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = {
    FileMonitor,
    FileChangeProcessor
};