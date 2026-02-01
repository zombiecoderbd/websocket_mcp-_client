import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { Logger } from '../utils/logger';
import { TFIDFEmbeddingService } from './embedding';

interface FileIndexRecord {
  id: number;
  project_id: number;
  file_path: string;
  file_name: string;
  file_extension: string;
  file_size: number;
  content_hash: string;
  last_modified: Date;
  is_indexed: boolean;
  index_timestamp: Date | null;
  embedding_id: number | null;
  file_type: 'source' | 'config' | 'document' | 'binary' | 'unknown';
  programming_language: string | null;
  semantic_context: any | null;
}

interface ProjectContextRecord {
  id: number;
  project_path: string;
  project_name: string;
  root_directory: boolean;
  file_count: number;
  folder_count: number;
  last_indexed: Date;
  indexing_status: 'pending' | 'indexing' | 'complete' | 'error';
  context_metadata: any | null;
}

export class FileWatcherService {
  private dbPool: mysql.Pool;
  private logger: Logger;
  private embeddingService: TFIDFEmbeddingService;
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private watchedProjects: Map<string, ProjectContextRecord> = new Map();
  private readonly WATCH_INTERVAL_MS = 30000; // 30 seconds
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly SUPPORTED_EXTENSIONS = [
    '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.go', 
    '.rb', '.php', '.html', '.css', '.scss', '.sql', '.json', '.yaml', '.yml',
    '.md', '.txt', '.xml', '.env', '.dockerfile', 'dockerfile'
  ];

  constructor(dbPool: mysql.Pool, embeddingService: TFIDFEmbeddingService) {
    this.dbPool = dbPool;
    this.embeddingService = embeddingService;
    this.logger = new Logger();
  }

  /**
   * Initialize the file watcher service
   */
  public async initialize(): Promise<boolean> {
    try {
      // Load existing projects from database
      await this.loadExistingProjects();
      
      // Start watching projects
      await this.startWatchingAllProjects();
      
      this.logger.info('File watcher service initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize file watcher service:', error);
      return false;
    }
  }

  /**
   * Load existing projects from database
   */
  private async loadExistingProjects(): Promise<void> {
    try {
      const connection = await this.dbPool.getConnection();
      try {
        const [rows] = await connection.execute(
          'SELECT * FROM project_context WHERE indexing_status != ?',
          ['error']
        ) as [ProjectContextRecord[], any];

        for (const project of rows) {
          this.watchedProjects.set(project.project_path, project);
        }
      } finally {
        connection.release();
      }
    } catch (error) {
      this.logger.error('Failed to load existing projects:', error);
      throw error;
    }
  }

  /**
   * Start watching all projects
   */
  private async startWatchingAllProjects(): Promise<void> {
    for (const [projectPath, project] of this.watchedProjects) {
      await this.startWatchingProject(projectPath);
    }
  }

  /**
   * Add a new project to watch
   */
  public async addProject(projectPath: string, projectName?: string): Promise<boolean> {
    try {
      if (!fs.existsSync(projectPath)) {
        this.logger.error(`Project path does not exist: ${projectPath}`);
        return false;
      }

      const stats = fs.statSync(projectPath);
      if (!stats.isDirectory()) {
        this.logger.error(`Project path is not a directory: ${projectPath}`);
        return false;
      }

      const resolvedPath = path.resolve(projectPath);
      const name = projectName || path.basename(resolvedPath);

      // Check if project already exists in database
      const existingProject = await this.getProjectByPath(resolvedPath);
      if (existingProject) {
        this.logger.info(`Project already exists: ${resolvedPath}`);
        return true;
      }

      // Insert project into database
      const connection = await this.dbPool.getConnection();
      try {
        const [result] = await connection.execute(
          `INSERT INTO project_context 
           (project_path, project_name, root_directory, file_count, folder_count, indexing_status, context_metadata) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            resolvedPath,
            name,
            true, // Assuming it's a root directory
            0,    // Will be updated after scanning
            0,    // Will be updated after scanning
            'pending',
            JSON.stringify({ added_at: new Date().toISOString() })
          ]
        );

        const projectId = (result as any).insertId;

        // Create project record in memory
        const newProject: ProjectContextRecord = {
          id: projectId,
          project_path: resolvedPath,
          project_name: name,
          root_directory: true,
          file_count: 0,
          folder_count: 0,
          last_indexed: new Date(),
          indexing_status: 'pending',
          context_metadata: { added_at: new Date().toISOString() }
        };

        this.watchedProjects.set(resolvedPath, newProject);

        // Start watching the project
        await this.startWatchingProject(resolvedPath);

        // Perform initial indexing
        await this.indexProject(resolvedPath);

        return true;
      } finally {
        connection.release();
      }
    } catch (error) {
      this.logger.error(`Failed to add project: ${projectPath}`, error);
      return false;
    }
  }

  /**
   * Start watching a specific project
   */
  private async startWatchingProject(projectPath: string): Promise<void> {
    try {
      if (this.watchers.has(projectPath)) {
        // Stop existing watcher first
        await this.stopWatchingProject(projectPath);
      }

      // Use native Node.js fs.watch
      const watcher = fs.watch(projectPath, { recursive: true }, async (eventType, filename) => {
        if (!filename) return;
              
        const fullPath = path.resolve(projectPath, filename);
              
        try {
          // Determine if it's a file or directory
          const stats = await fs.promises.stat(fullPath);
                
          if (eventType === 'rename') {
            // File or directory was added or removed
            const exists = fs.existsSync(fullPath);
            if (exists) {
              if (stats.isFile()) {
                this.handleFileAdded(fullPath, projectPath);
              } else if (stats.isDirectory()) {
                this.handleDirectoryAdded(fullPath, projectPath);
              }
            } else {
              // File or directory was removed
              if (stats.isFile()) {
                this.handleFileRemoved(fullPath, projectPath);
              } else {
                this.handleDirectoryRemoved(fullPath, projectPath);
              }
            }
          } else if (eventType === 'change') {
            // File was changed
            if (stats.isFile()) {
              this.handleFileChanged(fullPath, projectPath);
            }
          }
        } catch (err) {
          // File might have been deleted between event and stat call
          if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
            this.handleError(err as Error, projectPath);
          }
        }
      });

      this.watchers.set(projectPath, watcher);

      this.logger.info(`Started watching project: ${projectPath}`);
    } catch (error) {
      this.logger.error(`Failed to start watching project: ${projectPath}`, error);
      throw error;
    }
  }

  /**
   * Stop watching a specific project
   */
  private async stopWatchingProject(projectPath: string): Promise<void> {
    const watcher = this.watchers.get(projectPath);
    if (watcher) {
      watcher.close(); // fs.FSWatcher doesn't have a promise-based close method
      this.watchers.delete(projectPath);
      this.logger.info(`Stopped watching project: ${projectPath}`);
    }
  }

  /**
   * Handle file addition event
   */
  private async handleFileAdded(filePath: string, projectPath: string): Promise<void> {
    try {
      const resolvedFilePath = path.resolve(filePath);
      
      // Only process supported file types
      if (this.isSupportedFile(resolvedFilePath)) {
        await this.indexFile(resolvedFilePath, projectPath);
        this.logger.info(`File added and indexed: ${resolvedFilePath}`);
      } else {
        this.logger.debug(`Skipped unsupported file: ${resolvedFilePath}`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle file addition: ${filePath}`, error);
    }
  }

  /**
   * Handle file change event
   */
  private async handleFileChanged(filePath: string, projectPath: string): Promise<void> {
    try {
      const resolvedFilePath = path.resolve(filePath);
      
      // Only process supported file types
      if (this.isSupportedFile(resolvedFilePath)) {
        await this.updateIndexedFile(resolvedFilePath, projectPath);
        this.logger.info(`File changed and re-indexed: ${resolvedFilePath}`);
      } else {
        this.logger.debug(`Skipped unsupported file change: ${resolvedFilePath}`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle file change: ${filePath}`, error);
    }
  }

  /**
   * Handle file removal event
   */
  private async handleFileRemoved(filePath: string, projectPath: string): Promise<void> {
    try {
      await this.removeIndexedFile(filePath);
      this.logger.info(`File removed from index: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to handle file removal: ${filePath}`, error);
    }
  }

  /**
   * Handle directory addition event
   */
  private async handleDirectoryAdded(dirPath: string, projectPath: string): Promise<void> {
    try {
      await this.updateProjectStats(projectPath);
      this.logger.info(`Directory added: ${dirPath}`);
    } catch (error) {
      this.logger.error(`Failed to handle directory addition: ${dirPath}`, error);
    }
  }

  /**
   * Handle directory removal event
   */
  private async handleDirectoryRemoved(dirPath: string, projectPath: string): Promise<void> {
    try {
      await this.updateProjectStats(projectPath);
      this.logger.info(`Directory removed: ${dirPath}`);
    } catch (error) {
      this.logger.error(`Failed to handle directory removal: ${dirPath}`, error);
    }
  }

  /**
   * Handle error event
   */
  private handleError(error: Error, projectPath: string): void {
    this.logger.error(`File watcher error for project ${projectPath}:`, error);
  }

  /**
   * Check if file extension is supported
   */
  private isSupportedFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath).toLowerCase();
    
    return this.SUPPORTED_EXTENSIONS.includes(ext) || 
           this.SUPPORTED_EXTENSIONS.includes(basename);
  }

  /**
   * Index a single file
   */
  private async indexFile(filePath: string, projectPath: string): Promise<void> {
    try {
      const stats = fs.statSync(filePath);
      if (stats.size > this.MAX_FILE_SIZE) {
        this.logger.warn(`File too large to index: ${filePath} (${stats.size} bytes)`);
        return;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const contentHash = this.generateHash(content);
      
      const fileExtension = path.extname(filePath).toLowerCase();
      const fileType = this.getFileType(fileExtension);
      const programmingLanguage = this.getProgrammingLanguage(fileExtension);

      const project = this.watchedProjects.get(projectPath);
      if (!project) {
        throw new Error(`Project not found: ${projectPath}`);
      }

      const connection = await this.dbPool.getConnection();
      try {
        // Insert or update file index record
        const [result] = await connection.execute(
          `INSERT INTO file_index 
           (project_id, file_path, file_name, file_extension, file_size, content_hash, 
            last_modified, is_indexed, file_type, programming_language) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           file_size = VALUES(file_size),
           content_hash = VALUES(content_hash),
           last_modified = VALUES(last_modified),
           is_indexed = VALUES(is_indexed),
           file_type = VALUES(file_type),
           programming_language = VALUES(programming_language)`,
          [
            project.id,
            filePath,
            path.basename(filePath),
            fileExtension,
            stats.size,
            contentHash,
            new Date(stats.mtime),
            true,
            fileType,
            programmingLanguage
          ]
        );

        const fileId = (result as any).insertId;

        // Generate and store embedding for the file content
        if (this.embeddingService && fileType !== 'binary') {
          try {
            const embedding = await this.embeddingService.generateEmbedding(
              content,
              {
                file_path: filePath,
                project_id: project.id,
                file_type: fileType
              }
            );

            const embeddingStored = await this.embeddingService.storeEmbedding(fileId, content, embedding);
            if (embeddingStored) {
              // Update the embedding_id in file_index
              await connection.execute(
                'UPDATE file_index SET embedding_id = LAST_INSERT_ID() WHERE id = ?',
                [fileId]
              );
            }
          } catch (embeddingError) {
            this.logger.warn(`Could not generate embedding for file: ${filePath}`, embeddingError);
          }
        }

        // Update project statistics
        await this.updateProjectStats(projectPath);
      } finally {
        connection.release();
      }
    } catch (error) {
      this.logger.error(`Failed to index file: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Update an already indexed file
   */
  private async updateIndexedFile(filePath: string, projectPath: string): Promise<void> {
    try {
      // For updates, we can just call the same index function
      // since it uses INSERT ... ON DUPLICATE KEY UPDATE
      await this.indexFile(filePath, projectPath);
    } catch (error) {
      this.logger.error(`Failed to update indexed file: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Remove file from index
   */
  private async removeIndexedFile(filePath: string): Promise<void> {
    try {
      const connection = await this.dbPool.getConnection();
      try {
        // Find the file in the index
        const [rows] = await connection.execute(
          'SELECT id, embedding_id FROM file_index WHERE file_path = ?',
          [filePath]
        ) as [Array<{id: number, embedding_id: number | null}>, any];

        if (rows.length > 0) {
          const fileId = rows[0].id;
          
          // Remove embedding if it exists
          if (rows[0].embedding_id && this.embeddingService) {
            try {
              await this.embeddingService.removeEmbedding(rows[0].embedding_id);
            } catch (embeddingError) {
              this.logger.warn(`Could not remove embedding for file: ${filePath}`, embeddingError);
            }
          }

          // Delete from file index
          await connection.execute(
            'DELETE FROM file_index WHERE file_path = ?',
            [filePath]
          );

          this.logger.info(`Removed file from index: ${filePath}`);
        }
      } finally {
        connection.release();
      }
    } catch (error) {
      this.logger.error(`Failed to remove indexed file: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Index entire project
   */
  public async indexProject(projectPath: string): Promise<void> {
    try {
      const project = this.watchedProjects.get(projectPath);
      if (!project) {
        throw new Error(`Project not found: ${projectPath}`);
      }

      // Update project status to indexing
      await this.updateProjectStatus(project.id, 'indexing');

      const files = this.walkDirectory(projectPath);

      // Update project stats initially
      await this.updateProjectStats(projectPath);

      // Process each file
      for (const file of files) {
        if (this.isSupportedFile(file)) {
          try {
            await this.indexFile(file, projectPath);
          } catch (fileError) {
            this.logger.error(`Failed to index file ${file}:`, fileError);
          }
        }
      }

      // Update project status to complete
      await this.updateProjectStatus(project.id, 'complete');
      
      this.logger.info(`Completed indexing project: ${projectPath}`);
    } catch (error) {
      this.logger.error(`Failed to index project: ${projectPath}`, error);
      
      // Update project status to error
      const project = this.watchedProjects.get(projectPath);
      if (project) {
        await this.updateProjectStatus(project.id, 'error');
      }
      
      throw error;
    }
  }

  /**
   * Walk directory recursively and get all files
   */
  private walkDirectory(dirPath: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip node_modules and other common directories that shouldn't be indexed
        const dirName = path.basename(fullPath);
        if (!['node_modules', '.git', '.vscode', '.idea', 'dist', 'build', 'coverage'].includes(dirName)) {
          this.walkDirectory(fullPath, fileList);
        }
      } else {
        fileList.push(fullPath);
      }
    }

    return fileList;
  }

  /**
   * Update project statistics
   */
  private async updateProjectStats(projectPath: string): Promise<void> {
    try {
      const project = this.watchedProjects.get(projectPath);
      if (!project) {
        return;
      }

      let fileCount = 0;
      let folderCount = 0;

      // Count files and folders
      const walk = (currentPath: string) => {
        const items = fs.readdirSync(currentPath);
        for (const item of items) {
          const fullPath = path.join(currentPath, item);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            const dirName = path.basename(fullPath);
            if (!['node_modules', '.git', '.vscode', '.idea', 'dist', 'build', 'coverage'].includes(dirName)) {
              folderCount++;
              walk(fullPath);
            }
          } else {
            fileCount++;
          }
        }
      };

      walk(projectPath);

      // Update in database
      const connection = await this.dbPool.getConnection();
      try {
        await connection.execute(
          `UPDATE project_context 
           SET file_count = ?, folder_count = ?, last_indexed = NOW()
           WHERE id = ?`,
          [fileCount, folderCount, project.id]
        );

        // Update in memory
        project.file_count = fileCount;
        project.folder_count = folderCount;
        project.last_indexed = new Date();
      } finally {
        connection.release();
      }
    } catch (error) {
      this.logger.error(`Failed to update project stats for: ${projectPath}`, error);
    }
  }

  /**
   * Update project status
   */
  private async updateProjectStatus(projectId: number, status: ProjectContextRecord['indexing_status']): Promise<void> {
    try {
      const connection = await this.dbPool.getConnection();
      try {
        await connection.execute(
          'UPDATE project_context SET indexing_status = ? WHERE id = ?',
          [status, projectId]
        );
      } finally {
        connection.release();
      }
    } catch (error) {
      this.logger.error(`Failed to update project status for ID: ${projectId}`, error);
    }
  }

  /**
   * Get project by path
   */
  private async getProjectByPath(projectPath: string): Promise<ProjectContextRecord | null> {
    try {
      const connection = await this.dbPool.getConnection();
      try {
        const [rows] = await connection.execute(
          'SELECT * FROM project_context WHERE project_path = ?',
          [projectPath]
        ) as [ProjectContextRecord[], any];

        return rows.length > 0 ? rows[0] : null;
      } finally {
        connection.release();
      }
    } catch (error) {
      this.logger.error(`Failed to get project by path: ${projectPath}`, error);
      return null;
    }
  }

  /**
   * Get file type based on extension
   */
  private getFileType(extension: string): FileIndexRecord['file_type'] {
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico'].includes(extension)) {
      return 'binary';
    }
    
    if (['.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf'].includes(extension)) {
      return 'config';
    }
    
    if (['.md', '.txt', '.doc', '.docx', '.pdf', '.rtf'].includes(extension)) {
      return 'document';
    }
    
    if (['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.go', 
         '.rb', '.php', '.html', '.css', '.scss', '.sql'].includes(extension)) {
      return 'source';
    }
    
    return 'unknown';
  }

  /**
   * Get programming language based on extension
   */
  private getProgrammingLanguage(extension: string): string | null {
    const langMap: Record<string, string> = {
      '.js': 'JavaScript',
      '.ts': 'TypeScript',
      '.jsx': 'React JSX',
      '.tsx': 'React TSX',
      '.py': 'Python',
      '.java': 'Java',
      '.cpp': 'C++',
      '.c': 'C',
      '.cs': 'C#',
      '.go': 'Go',
      '.rb': 'Ruby',
      '.php': 'PHP',
      '.html': 'HTML',
      '.css': 'CSS',
      '.scss': 'SCSS',
      '.sql': 'SQL',
      '.json': 'JSON',
      '.yaml': 'YAML',
      '.yml': 'YAML',
      '.md': 'Markdown'
    };

    return langMap[extension] || null;
  }

  /**
   * Generate hash for content comparison
   */
  private generateHash(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Search files by content or semantic similarity
   */
  public async searchFiles(query: string, projectPath?: string, limit: number = 20): Promise<FileIndexRecord[]> {
    try {
      const connection = await this.dbPool.getConnection();
      try {
        let sql = `
          SELECT *
          FROM file_index fi
          JOIN project_context pc ON fi.project_id = pc.id
          WHERE fi.file_type != 'binary'
        `;
        
        const params: any[] = [];

        if (projectPath) {
          sql += ' AND pc.project_path = ?';
          params.push(projectPath);
        }

        sql += ` ORDER BY fi.last_modified DESC LIMIT ?`;
        params.push(limit);

        const [rows] = await connection.execute(sql, params) as [FileIndexRecord[], any];
        
        // If embedding service is available, try semantic search
        if (this.embeddingService) {
          try {
            // This is a simplified approach - in a real implementation, 
            // we'd search the embeddings table and join with file_index
            const semanticResults = await this.embeddingService.semanticSearch(query, limit, 'text');
            
            // For now, we'll just return the DB results
            // In a full implementation, we'd combine both approaches
          } catch (semanticError) {
            this.logger.warn('Semantic search failed, falling back to traditional search:', semanticError);
          }
        }

        return rows;
      } finally {
        connection.release();
      }
    } catch (error) {
      this.logger.error('Failed to search files:', error);
      return [];
    }
  }

  /**
   * Get project context information
   */
  public async getProjectContext(projectPath: string): Promise<ProjectContextRecord | null> {
    try {
      const project = this.watchedProjects.get(projectPath);
      if (project) {
        return project;
      }

      // If not in memory, try to load from database
      return await this.getProjectByPath(projectPath);
    } catch (error) {
      this.logger.error(`Failed to get project context: ${projectPath}`, error);
      return null;
    }
  }

  /**
   * Stop the file watcher service
   */
  public async stop(): Promise<void> {
    // Close all watchers
    for (const [projectPath, watcher] of this.watchers) {
      try {
        watcher.close();
        this.logger.info(`Stopped watching project: ${projectPath}`);
      } catch (error) {
        this.logger.error(`Failed to stop watcher for project: ${projectPath}`, error);
      }
    }
    
    this.watchers.clear();
    this.watchedProjects.clear();
    
    this.logger.info('File watcher service stopped');
  }
}