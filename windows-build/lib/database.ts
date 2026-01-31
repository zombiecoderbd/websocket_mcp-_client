import * as mysql from 'mysql2/promise';

// Simple database connection utility for Next.js API routes
export class DatabaseConnection {
  private static pool: mysql.Pool | null = null;

  static getPool(): mysql.Pool {
    if (!this.pool) {
      this.pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'uas_admin',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        insecureAuth: true
      });
    }
    return this.pool;
  }

  static async executeQuery(sql: string, values?: any[]): Promise<any> {
    const pool = this.getPool();
    const connection = await pool.getConnection();
    try {
      const [results] = await connection.execute(sql, values);
      return results;
    } finally {
      connection.release();
    }
  }

  static async executeTransaction(queries: Array<{ sql: string, values?: any[] }>): Promise<any[]> {
    const pool = this.getPool();
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const results = [];
      for (const query of queries) {
        const [result] = await connection.execute(query.sql, query.values);
        results.push(result);
      }
      
      await connection.commit();
      return results;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}