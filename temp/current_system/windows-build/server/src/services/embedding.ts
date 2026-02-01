import mysql from 'mysql2/promise';
import { Pool } from 'mysql2/promise';
import { Logger } from '../utils/logger';

/**
 * Simple TF-IDF (Term Frequency-Inverse Document Frequency) implementation
 * for lightweight semantic search without external dependencies
 */
export class TFIDFEmbeddingService {
  private dbPool: Pool;
  private logger: Logger;
  
  constructor(dbPool: Pool) {
    this.dbPool = dbPool;
    this.logger = new Logger();
  }

  /**
   * Tokenizes text into words, removing punctuation and converting to lowercase
   */
  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Replace punctuation with spaces
      .split(/\s+/)               // Split by whitespace
      .filter(token => token.length > 0);  // Remove empty tokens
  }

  /**
   * Calculates term frequency for a document
   */
  private calculateTF(tokens: string[]): Map<string, number> {
    const tfMap = new Map<string, number>();
    const uniqueTokens = new Set(tokens);
    
    for (const token of uniqueTokens) {
      const count = tokens.filter(t => t === token).length;
      tfMap.set(token, count / tokens.length);
    }
    
    return tfMap;
  }

  /**
   * Calculates inverse document frequency across all documents
   */
  private async calculateIDF(terms: string[], allDocuments: string[][]): Promise<Map<string, number>> {
    const idfMap = new Map<string, number>();
    const totalDocuments = allDocuments.length;
    
    for (const term of terms) {
      const documentsContainingTerm = allDocuments.filter(doc => doc.includes(term)).length;
      const idf = Math.log(totalDocuments / (1 + documentsContainingTerm));
      idfMap.set(term, idf);
    }
    
    return idfMap;
  }

  /**
   * Creates a TF-IDF vector for a given text
   */
  public async createTFIDFVector(text: string, allDocuments: string[][]): Promise<Map<string, number>> {
    const tokens = this.tokenize(text);
    const tf = this.calculateTF(tokens);
    const uniqueTerms = [...new Set(tokens.concat(...allDocuments))];
    const idf = await this.calculateIDF(uniqueTerms, allDocuments);
    
    const tfidfVector = new Map<string, number>();
    for (const [term, tfValue] of tf) {
      const idfValue = idf.get(term) || 0;
      tfidfVector.set(term, tfValue * idfValue);
    }
    
    return tfidfVector;
  }

  /**
   * Calculates cosine similarity between two TF-IDF vectors
   */
  public calculateCosineSimilarity(vec1: Map<string, number>, vec2: Map<string, number>): number {
    const terms1 = Array.from(vec1.keys());
    const terms2 = Array.from(vec2.keys());
    const allTerms = [...new Set([...terms1, ...terms2])];
    
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    
    for (const term of allTerms) {
      const val1 = vec1.get(term) || 0;
      const val2 = vec2.get(term) || 0;
      
      dotProduct += val1 * val2;
      magnitude1 += val1 * val1;
      magnitude2 += val2 * val2;
    }
    
    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);
    
    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0; // If one vector is zero, similarity is 0
    }
    
    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Generates an embedding representation for text content
   */
  public async generateEmbedding(content: string, context?: any): Promise<any> {
    // For now, we'll return the TF-IDF vector as a JSON object
    // In a real implementation, this would generate a dense vector
    const tokens = this.tokenize(content);
    const tf = this.calculateTF(tokens);
    
    // Create a simplified embedding representation
    const embedding = {
      tokens: Array.from(tf.keys()),
      values: Array.from(tf.values()),
      dimensions: Array.from(tf.keys()).length,
      hash: this.generateHash(content),
      metadata: context || {}
    };
    
    return embedding;
  }

  /**
   * Stores embedding in the database
   */
  public async storeEmbedding(memoryId: number, content: string, embedding: any): Promise<boolean> {
    try {
      const connection = await this.dbPool.getConnection();
      try {
        // Calculate content hash
        const contentHash = this.generateHash(content);
        
        // Store the embedding
        await connection.execute(
          `INSERT INTO memory_embeddings 
           (memory_id, embedding_type, embedding_model, embedding_dimensions, content_hash, vector_data, metadata) 
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           embedding_type = VALUES(embedding_type),
           embedding_dimensions = VALUES(embedding_dimensions),
           vector_data = VALUES(vector_data),
           metadata = VALUES(metadata)`,
          [
            memoryId,
            'text',  // Could be 'text', 'code', 'context', 'semantic'
            'tfidf-lightweight',  // Our custom model name
            embedding.dimensions,
            contentHash,
            JSON.stringify(embedding),  // Store as JSON since we don't have actual vectors
            JSON.stringify(embedding.metadata || {})
          ]
        );
        
        return true;
      } finally {
        connection.release();
      }
    } catch (error) {
      this.logger.error('Error storing embedding:', error);
      return false;
    }
  }

  /**
   * Performs semantic search using TF-IDF similarity
   */
  public async semanticSearch(query: string, topK: number = 5, embeddingType: string = 'text'): Promise<any[]> {
    try {
      const connection = await this.dbPool.getConnection();
      try {
        // Get all relevant embeddings from the database
        const [rows] = await connection.execute(
          `SELECT 
             me.id as embedding_id,
             am.id as memory_id,
             am.content,
             am.content_type,
             am.summary,
             me.vector_data,
             me.metadata,
             am.created_at
           FROM memory_embeddings me
           JOIN agent_memory am ON me.memory_id = am.id
           WHERE me.embedding_type = ?
           ORDER BY am.created_at DESC
           LIMIT 100`,  // Limit to 100 recent embeddings for performance
          [embeddingType]
        ) as [any[], any];
        
        if (rows.length === 0) {
          return [];
        }
        
        // Convert stored embeddings to vectors and calculate similarity
        const queryTokens = this.tokenize(query);
        const queryTF = this.calculateTF(queryTokens);
        
        const similarities: { memory_id: number; similarity: number; content: string; summary: string; content_type: string; created_at: Date }[] = [];
        
        for (const row of rows) {
          try {
            const storedEmbedding = typeof row.vector_data === 'string' 
              ? JSON.parse(row.vector_data) 
              : row.vector_data;
              
            // Calculate similarity based on overlapping tokens
            const storedTokens = storedEmbedding.tokens || [];
            const intersection = queryTokens.filter(token => storedTokens.includes(token));
            const union = [...new Set([...queryTokens, ...storedTokens])];
            
            // Jaccard similarity for simplicity (intersection / union)
            const similarity = union.length > 0 ? intersection.length / union.length : 0;
            
            // Also calculate TF-IDF similarity if possible
            const tfidfSimilarity = this.calculateTokenOverlapSimilarity(queryTF, storedEmbedding.tokens);
            
            // Combine both scores
            const combinedScore = (similarity + tfidfSimilarity) / 2;
            
            similarities.push({
              memory_id: row.memory_id,
              similarity: combinedScore,
              content: row.content,
              summary: row.summary,
              content_type: row.content_type,
              created_at: row.created_at
            });
          } catch (parseError) {
            this.logger.warn(`Could not parse embedding for memory ${row.memory_id}:`, parseError);
          }
        }
        
        // Sort by similarity and return top K
        const sortedResults = similarities
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, topK)
          .filter(result => result.similarity > 0.1); // Filter out very low similarity matches
        
        return sortedResults;
      } finally {
        connection.release();
      }
    } catch (error) {
      this.logger.error('Error in semantic search:', error);
      return [];
    }
  }

  /**
   * Calculates similarity based on TF-IDF overlap
   */
  private calculateTokenOverlapSimilarity(queryTF: Map<string, number>, storedTokens: string[]): number {
    if (!storedTokens || !Array.isArray(storedTokens) || storedTokens.length === 0) {
      return 0;
    }
    
    // Calculate how many query tokens appear in the stored content
    let score = 0;
    let totalWeight = 0;
    
    for (const [token, weight] of queryTF) {
      if (storedTokens.includes(token)) {
        score += weight; // Weight by TF value
      }
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? score / totalWeight : 0;
  }

  /**
   * Generates a simple hash for content identification
   */
  private generateHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Updates embedding for existing memory
   */
  public async updateEmbedding(memoryId: number, content: string): Promise<boolean> {
    try {
      const embedding = await this.generateEmbedding(content, { updated_at: new Date() });
      return await this.storeEmbedding(memoryId, content, embedding);
    } catch (error) {
      this.logger.error(`Error updating embedding for memory ${memoryId}:`, error);
      return false;
    }
  }

  /**
   * Removes embedding for a specific memory
   */
  public async removeEmbedding(memoryId: number): Promise<boolean> {
    try {
      const connection = await this.dbPool.getConnection();
      try {
        await connection.execute(
          'DELETE FROM memory_embeddings WHERE memory_id = ?',
          [memoryId]
        );
        
        return true;
      } finally {
        connection.release();
      }
    } catch (error) {
      this.logger.error(`Error removing embedding for memory ${memoryId}:`, error);
      return false;
    }
  }
}

/**
 * Custom similarity algorithm for specific use cases
 */
export class CustomSimilarityService {
  private embeddingService: TFIDFEmbeddingService;
  
  constructor(embeddingService: TFIDFEmbeddingService) {
    this.embeddingService = embeddingService;
  }

  /**
   * Code-specific similarity calculation
   */
  public async codeSimilarity(query: string, candidateCode: string): Promise<number> {
    // Tokenize as code (preserve identifiers, keywords, operators)
    const queryTokens = this.tokenizeCode(query);
    const candidateTokens = this.tokenizeCode(candidateCode);
    
    // Calculate similarity considering code structure
    const structuralSimilarity = this.calculateStructuralSimilarity(queryTokens, candidateTokens);
    const tokenSimilarity = this.calculateTokenSimilarity(queryTokens, candidateTokens);
    
    // Return weighted average
    return (structuralSimilarity * 0.6 + tokenSimilarity * 0.4);
  }

  private tokenizeCode(code: string): string[] {
    // Extract identifiers, keywords, and symbols
    const tokens = code.toLowerCase()
      .match(/[\w]+|[{}()[\];,.<>~!@#$%^&*+=|\\:"'?/\-]+/g) || [];
    
    // Filter out very common tokens that don't contribute to meaning
    const filteredTokens = tokens.filter(token => 
      !['the', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(token)
    );
    
    return filteredTokens;
  }

  private calculateStructuralSimilarity(tokens1: string[], tokens2: string[]): number {
    // Calculate similarity based on shared structural elements
    const intersection = tokens1.filter(token => tokens2.includes(token));
    const union = [...new Set([...tokens1, ...tokens2])];
    
    return union.length > 0 ? intersection.length / union.length : 0;
  }

  private calculateTokenSimilarity(tokens1: string[], tokens2: string[]): number {
    // More sophisticated token comparison
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    
    const intersection = [...set1].filter(x => set2.has(x));
    const minSize = Math.min(set1.size, set2.size);
    
    return minSize > 0 ? intersection.length / minSize : 0;
  }
}