import mysql from 'mysql2/promise';
import { Pool } from 'mysql2/promise';
import { WebSocketServer } from 'ws';

interface AgentRuntimeInfo {
  id: number;
  agent_id: number;
  status: 'idle' | 'busy' | 'error' | 'initializing' | 'stopped';
  active_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  memory_usage_mb: number;
  cpu_usage_percent: number;
  current_session_id: string | null;
  last_heartbeat: Date;
  timestamp: Date;
}

interface AgentRequestLog {
  id: number;
  agent_id: number;
  request_type: string;
  request_payload: any;
  response_status: 'success' | 'error' | 'timeout';
  response_time_ms: number;
  error_message: string | null;
  session_id: string | null;
  timestamp: Date;
}

export class AgentsMonitor {
  private dbPool: Pool;
  private wsServer: WebSocketServer | null = null;
  private agentStatusMap: Map<number, AgentRuntimeInfo> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly MONITOR_INTERVAL_MS = 5000; // 5 seconds

  constructor(dbPool: Pool) {
    this.dbPool = dbPool;
  }

  public initialize(wsServer: WebSocketServer | null = null) {
    this.wsServer = wsServer;
    this.startMonitoring();
  }

  private startMonitoring() {
    // Load initial agent statuses
    this.loadInitialStatuses();
    
    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.updateAllAgentStatuses();
    }, this.MONITOR_INTERVAL_MS);
  }

  private async loadInitialStatuses() {
    try {
      const connection = await this.dbPool.getConnection();
      try {
        const [rows] = await connection.execute(
          'SELECT * FROM agent_runtime ORDER BY last_heartbeat DESC'
        ) as [AgentRuntimeInfo[], any];
        
        for (const row of rows) {
          this.agentStatusMap.set(row.agent_id, row);
        }
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error loading initial agent statuses:', error);
    }
  }

  private async updateAllAgentStatuses() {
    try {
      const connection = await this.dbPool.getConnection();
      try {
        // Update heartbeats for all active agents
        await connection.execute(`
          UPDATE agent_runtime 
          SET last_heartbeat = NOW()
          WHERE status IN ('idle', 'busy', 'initializing')
        `);

        // Fetch updated statuses
        const [rows] = await connection.execute(
          'SELECT * FROM agent_runtime ORDER BY last_heartbeat DESC'
        ) as [AgentRuntimeInfo[], any];

        const updatedStatuses: AgentRuntimeInfo[] = [];
        for (const row of rows) {
          this.agentStatusMap.set(row.agent_id, row);
          updatedStatuses.push(row);
        }

        // Broadcast updates to connected clients
        if (this.wsServer && updatedStatuses.length > 0) {
          this.broadcastToClients({
            type: 'agent_status_update',
            data: updatedStatuses
          });
        }

        // Check for stale agents (no heartbeat for more than 30 seconds)
        await this.checkStaleAgents(connection);
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error updating agent statuses:', error);
    }
  }

  private async checkStaleAgents(connection: mysql.Connection) {
    try {
      // Mark agents as error if no heartbeat for more than 30 seconds
      await connection.execute(`
        UPDATE agent_runtime 
        SET status = 'error' 
        WHERE last_heartbeat < DATE_SUB(NOW(), INTERVAL 30 SECOND)
        AND status != 'stopped'
      `);
    } catch (error) {
      console.error('Error checking stale agents:', error);
    }
  }

  public async getAgentStatus(agentId: number): Promise<AgentRuntimeInfo | null> {
    try {
      const connection = await this.dbPool.getConnection();
      try {
        const [rows] = await connection.execute(
          'SELECT * FROM agent_runtime WHERE agent_id = ? ORDER BY timestamp DESC LIMIT 1',
          [agentId]
        ) as [AgentRuntimeInfo[], any];

        return rows.length > 0 ? rows[0] : null;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error(`Error getting agent status for agent ${agentId}:`, error);
      return null;
    }
  }

  public async getAllAgentStatuses(): Promise<AgentRuntimeInfo[]> {
    try {
      const connection = await this.dbPool.getConnection();
      try {
        const [rows] = await connection.execute(
          `SELECT ar.*, a.name as agent_name 
           FROM agent_runtime ar 
           JOIN agents a ON ar.agent_id = a.id 
           ORDER BY ar.last_heartbeat DESC`
        ) as [any[], any];

        return rows.map(row => {
          const { agent_name, ...runtimeInfo } = row;
          return {
            ...runtimeInfo,
            agent_name
          } as AgentRuntimeInfo & { agent_name: string };
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error getting all agent statuses:', error);
      return [];
    }
  }

  public async getAgentRequests(agentId: number, limit: number = 50): Promise<AgentRequestLog[]> {
    try {
      const connection = await this.dbPool.getConnection();
      try {
        const [rows] = await connection.execute(
          `SELECT * FROM agent_requests 
           WHERE agent_id = ? 
           ORDER BY timestamp DESC 
           LIMIT ?`,
          [agentId, limit]
        ) as [AgentRequestLog[], any];

        return rows;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error(`Error getting agent requests for agent ${agentId}:`, error);
      return [];
    }
  }

  public async logAgentRequest(requestData: Omit<AgentRequestLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      const connection = await this.dbPool.getConnection();
      try {
        await connection.execute(
          `INSERT INTO agent_requests 
           (agent_id, request_type, request_payload, response_status, response_time_ms, error_message, session_id) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            requestData.agent_id,
            requestData.request_type,
            JSON.stringify(requestData.request_payload),
            requestData.response_status,
            requestData.response_time_ms,
            requestData.error_message,
            requestData.session_id
          ]
        );
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error logging agent request:', error);
    }
  }

  public async updateAgentStatus(agentId: number, status: AgentRuntimeInfo['status']): Promise<boolean> {
    try {
      const connection = await this.dbPool.getConnection();
      try {
        const [result] = await connection.execute(
          `INSERT INTO agent_runtime (agent_id, status, last_heartbeat) 
           VALUES (?, ?, NOW())
           ON DUPLICATE KEY UPDATE 
           status = VALUES(status),
           last_heartbeat = VALUES(last_heartbeat)`,
          [agentId, status]
        );

        // Update local cache
        const updatedStatus: AgentRuntimeInfo = {
          id: Date.now(), // This will be the auto-generated ID
          agent_id: agentId,
          status,
          active_tasks: 0,
          completed_tasks: 0,
          failed_tasks: 0,
          memory_usage_mb: 0,
          cpu_usage_percent: 0,
          current_session_id: null,
          last_heartbeat: new Date(),
          timestamp: new Date()
        };
        this.agentStatusMap.set(agentId, updatedStatus);

        // Broadcast the update
        if (this.wsServer) {
          this.broadcastToClients({
            type: 'agent_status_change',
            data: { agent_id: agentId, status }
          });
        }

        return (result as any).affectedRows > 0;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error(`Error updating agent status for agent ${agentId}:`, error);
      return false;
    }
  }

  public async setAgentEnabled(agentId: number, isEnabled: boolean): Promise<boolean> {
    try {
      const connection = await this.dbPool.getConnection();
      try {
        const [result] = await connection.execute(
          'UPDATE agents SET is_enabled = ? WHERE id = ?',
          [isEnabled, agentId]
        );

        // Broadcast the update
        if (this.wsServer) {
          this.broadcastToClients({
            type: 'agent_enabled_change',
            data: { agent_id: agentId, is_enabled: isEnabled }
          });
        }

        return (result as any).changedRows > 0;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error(`Error setting agent enabled status for agent ${agentId}:`, error);
      return false;
    }
  }

  public async isAgentEnabled(agentId: number): Promise<boolean> {
    try {
      const connection = await this.dbPool.getConnection();
      try {
        const [rows] = await connection.execute(
          'SELECT is_enabled FROM agents WHERE id = ?',
          [agentId]
        ) as [Array<{is_enabled: boolean}>, any];

        return rows.length > 0 ? rows[0].is_enabled : false;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error(`Error checking if agent ${agentId} is enabled:`, error);
      return false;
    }
  }

  public async incrementAgentTaskCount(agentId: number, taskType: 'active' | 'completed' | 'failed'): Promise<void> {
    try {
      const connection = await this.dbPool.getConnection();
      try {
        let updateField = '';
        if (taskType === 'active') updateField = 'active_tasks = active_tasks + 1';
        else if (taskType === 'completed') updateField = 'completed_tasks = completed_tasks + 1';
        else if (taskType === 'failed') updateField = 'failed_tasks = failed_tasks + 1';

        if (updateField) {
          await connection.execute(
            `UPDATE agent_runtime SET ${updateField}, last_heartbeat = NOW() WHERE agent_id = ?`,
            [agentId]
          );
        }
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error(`Error incrementing agent task count for agent ${agentId}:`, error);
    }
  }

  private broadcastToClients(message: { type: string; data: any }) {
    if (!this.wsServer) return;

    const payload = JSON.stringify(message);
    this.wsServer.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(payload);
      }
    });
  }

  public async getAgentMetrics(agentId: number, hoursBack: number = 24): Promise<any[]> {
    try {
      const connection = await this.dbPool.getConnection();
      try {
        const [rows] = await connection.execute(
          `SELECT 
             DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:00') as time_bucket,
             AVG(cpu_usage_percent) as avg_cpu,
             AVG(memory_usage_mb) as avg_memory,
             COUNT(*) as record_count
           FROM agent_runtime 
           WHERE agent_id = ? 
             AND timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR)
           GROUP BY time_bucket
           ORDER BY time_bucket DESC`,
          [agentId, hoursBack]
        ) as [any[], any];

        return rows;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error(`Error getting agent metrics for agent ${agentId}:`, error);
      return [];
    }
  }

  public stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}