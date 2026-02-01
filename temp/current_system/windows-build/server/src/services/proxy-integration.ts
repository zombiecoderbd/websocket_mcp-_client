import { Logger } from '../utils/logger';
import { executeQuery } from '../database/connection';
import axios from 'axios';
import { spawn } from 'child_process';

const logger = new Logger();

export interface ProxyStatus {
    proxy_running: boolean;
    port: number;
    pid: number | null;
    uptime: number;
    requests_handled: number;
    error_count: number;
    last_error: string | null;
}

export interface ProxyServerInfo {
    host: string;
    port: number;
    protocol: string;
    status: 'active' | 'inactive' | 'error';
    response_time: number;
    last_checked: string;
}

export interface IntegrationStatus {
    proxy_server: ProxyStatus;
    cloud_tunnel: {
        connected: boolean;
        public_url: string;
        connections: number;
    };
    database: {
        connected: boolean;
        response_time: number;
    };
    overall_status: 'healthy' | 'degraded' | 'unhealthy';
}

export class ProxyIntegrationService {
    private httpClient = axios.create({
        timeout: 3000,
        headers: {
            'Content-Type': 'application/json',
        }
    });

    async getProxyServerStatus(): Promise<ProxyStatus> {
        try {
            // Check if proxy process is running
            const processCheck = await this.executeCommand(['pgrep', '-f', 'cloudflared']);
            const isRunning = processCheck.success && processCheck.output.length > 0;
            
            let pid: number | null = null;
            let uptime = 0;
            
            if (isRunning) {
                // Get process details
                const pidResult = await this.executeCommand(['pgrep', '-f', 'cloudflared']);
                if (pidResult.success && pidResult.output) {
                    pid = parseInt(pidResult.output.trim()) || null;
                    
                    // Get process uptime
                    if (pid) {
                        const uptimeResult = await this.executeCommand(['ps', '-o', 'etimes=', '-p', pid.toString()]);
                        if (uptimeResult.success) {
                            uptime = parseInt(uptimeResult.output.trim()) || 0;
                        }
                    }
                }
            }

            // Get request statistics from database (if available)
            let requestsHandled = 0;
            let errorCount = 0;
            let lastError: string | null = null;

            try {
                const statsResult = await executeQuery(
                    `SELECT 
                        COUNT(*) as total_requests,
                        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count,
                        MAX(created_at) as last_request
                     FROM api_audit_logs 
                     WHERE endpoint LIKE '%/api/proxy%' 
                     AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`
                );

                if (statsResult && statsResult.length > 0) {
                    requestsHandled = statsResult[0].total_requests || 0;
                    errorCount = statsResult[0].error_count || 0;
                }

                // Get last error
                const errorResult = await executeQuery(
                    `SELECT error_message, created_at 
                     FROM api_audit_logs 
                     WHERE status_code >= 400 
                     AND endpoint LIKE '%/api/proxy%' 
                     ORDER BY created_at DESC 
                     LIMIT 1`
                );

                if (errorResult && errorResult.length > 0) {
                    lastError = errorResult[0].error_message;
                }
            } catch (dbError) {
                logger.warn('Could not fetch proxy statistics from database:', dbError);
            }

            return {
                proxy_running: isRunning,
                port: 8000, // Default port
                pid,
                uptime,
                requests_handled: requestsHandled,
                error_count: errorCount,
                last_error: lastError
            };

        } catch (error) {
            logger.error('Failed to get proxy server status:', error);
            return {
                proxy_running: false,
                port: 8000,
                pid: null,
                uptime: 0,
                requests_handled: 0,
                error_count: 0,
                last_error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async testProxyConnection(): Promise<boolean> {
        try {
            // Test connection to the proxy server
            const response = await this.httpClient.get('http://localhost:8000/health', {
                timeout: 2000
            });
            
            return response.status === 200;
        } catch (error) {
            logger.error('Proxy connection test failed:', error);
            return false;
        }
    }

    async getProxyServerInfo(): Promise<ProxyServerInfo> {
        try {
            const startTime = Date.now();
            
            // Test connection
            const isConnected = await this.testProxyConnection();
            const responseTime = Date.now() - startTime;

            return {
                host: 'localhost',
                port: 8000,
                protocol: 'http',
                status: isConnected ? 'active' : 'inactive',
                response_time: responseTime,
                last_checked: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Failed to get proxy server info:', error);
            return {
                host: 'localhost',
                port: 8000,
                protocol: 'http',
                status: 'error',
                response_time: 0,
                last_checked: new Date().toISOString()
            };
        }
    }

    async getSystemIntegrationStatus(): Promise<IntegrationStatus> {
        try {
            // Get proxy status
            const proxyStatus = await this.getProxyServerStatus();
            
            // Get database status
            const dbStatus = await this.getDatabaseStatus();
            
            // Get cloud tunnel status (using CloudProviderManager)
            const tunnelStatus = await this.getCloudTunnelStatus();
            
            // Calculate overall status
            const statusChecks = [
                proxyStatus.proxy_running,
                dbStatus.connected,
                tunnelStatus.connected
            ];
            
            const healthyChecks = statusChecks.filter(check => check).length;
            const totalChecks = statusChecks.length;
            
            let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'unhealthy';
            if (healthyChecks === totalChecks) {
                overallStatus = 'healthy';
            } else if (healthyChecks >= Math.ceil(totalChecks / 2)) {
                overallStatus = 'degraded';
            }

            return {
                proxy_server: proxyStatus,
                cloud_tunnel: tunnelStatus,
                database: dbStatus,
                overall_status: overallStatus
            };

        } catch (error) {
            logger.error('Failed to get system integration status:', error);
            return {
                proxy_server: {
                    proxy_running: false,
                    port: 8000,
                    pid: null,
                    uptime: 0,
                    requests_handled: 0,
                    error_count: 0,
                    last_error: 'System error'
                },
                cloud_tunnel: {
                    connected: false,
                    public_url: '',
                    connections: 0
                },
                database: {
                    connected: false,
                    response_time: 0
                },
                overall_status: 'unhealthy'
            };
        }
    }

    private async getDatabaseStatus(): Promise<{ connected: boolean; response_time: number }> {
        try {
            const startTime = Date.now();
            
            // Test database connection
            const result = await executeQuery('SELECT 1 as test');
            const responseTime = Date.now() - startTime;
            
            return {
                connected: result !== null,
                response_time: responseTime
            };
        } catch (error) {
            logger.error('Database connection test failed:', error);
            return {
                connected: false,
                response_time: 0
            };
        }
    }

    private async getCloudTunnelStatus(): Promise<{ connected: boolean; public_url: string; connections: number }> {
        try {
            // Execute cloudflared tunnel list command
            const tunnelInfo = await this.executeCommand(['cloudflared', 'tunnel', 'list']);
            
            if (!tunnelInfo.success) {
                return {
                    connected: false,
                    public_url: '',
                    connections: 0
                };
            }

            // Parse tunnel information
            const lines = tunnelInfo.output.split('\n');
            const tunnelLine = lines.find(line => line.includes('zombiecoder-tunnel'));
            
            if (!tunnelLine) {
                return {
                    connected: false,
                    public_url: '',
                    connections: 0
                };
            }

            // Extract connection count
            const parts = tunnelLine.trim().split(/\s+/);
            const connections = parts.length > 3 ? parseInt(parts[3]) || 0 : 0;
            
            // Get public URL
            let publicUrl = '';
            try {
                const urlResult = await this.executeCommand(['cloudflared', 'tunnel', 'info', 'zombiecoder-tunnel']);
                if (urlResult.success) {
                    const urlMatch = urlResult.output.match(/https?:\/\/[^\s]+/);
                    publicUrl = urlMatch ? urlMatch[0] : '';
                }
            } catch (urlError) {
                logger.warn('Could not get public URL:', urlError);
            }

            return {
                connected: connections > 0,
                public_url: publicUrl,
                connections: connections
            };

        } catch (error) {
            logger.error('Failed to get cloud tunnel status:', error);
            return {
                connected: false,
                public_url: '',
                connections: 0
            };
        }
    }

    async refreshProxyConfiguration(): Promise<boolean> {
        try {
            // This would restart or reload the proxy configuration
            // For now, we'll just verify current status
            const status = await this.getProxyServerStatus();
            
            if (!status.proxy_running) {
                // Attempt to start proxy
                const startResult = await this.executeCommand(['cloudflared', 'tunnel', 'run', 'zombiecoder-tunnel']);
                return startResult.success;
            }
            
            return true;
        } catch (error) {
            logger.error('Failed to refresh proxy configuration:', error);
            return false;
        }
    }

    async getProxyLogs(limit: number = 50): Promise<{ timestamp: string; level: string; message: string }[]> {
        try {
            // Get recent proxy-related logs from database
            const logs = await executeQuery(
                `SELECT 
                    created_at as timestamp,
                    'info' as level,
                    CONCAT(endpoint, ' - ', status_code, ' - ', response_time_ms, 'ms') as message
                 FROM api_audit_logs 
                 WHERE endpoint LIKE '%/api/proxy%' 
                 ORDER BY created_at DESC 
                 LIMIT ?`,
                [limit]
            );

            return logs.map((log: any) => ({
                timestamp: log.timestamp,
                level: log.level,
                message: log.message
            }));

        } catch (error) {
            logger.error('Failed to get proxy logs:', error);
            return [];
        }
    }

    async getProxyStatistics(hours: number = 24): Promise<{
        total_requests: number;
        success_rate: number;
        avg_response_time: number;
        error_count: number;
        hourly_stats: { hour: string; requests: number; errors: number }[];
    }> {
        try {
            // Get overall statistics
            const stats = await executeQuery(
                `SELECT 
                    COUNT(*) as total_requests,
                    AVG(response_time_ms) as avg_response_time,
                    SUM(CASE WHEN status_code < 400 THEN 1 ELSE 0 END) as successful_requests,
                    SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count
                 FROM api_audit_logs 
                 WHERE endpoint LIKE '%/api/proxy%' 
                 AND created_at > DATE_SUB(NOW(), INTERVAL ? HOUR)`,
                [hours]
            );

            // Get hourly statistics
            const hourlyStats = await executeQuery(
                `SELECT 
                    DATE_FORMAT(created_at, '%Y-%m-%d %H:00') as hour,
                    COUNT(*) as requests,
                    SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as errors
                 FROM api_audit_logs 
                 WHERE endpoint LIKE '%/api/proxy%' 
                 AND created_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
                 GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d %H:00')
                 ORDER BY hour`,
                [hours]
            );

            const data = stats[0] || {};
            const successRate = data.total_requests > 0 ? 
                (data.successful_requests / data.total_requests) * 100 : 0;

            return {
                total_requests: data.total_requests || 0,
                success_rate: successRate,
                avg_response_time: data.avg_response_time || 0,
                error_count: data.error_count || 0,
                hourly_stats: hourlyStats.map((row: any) => ({
                    hour: row.hour,
                    requests: row.requests,
                    errors: row.errors
                }))
            };

        } catch (error) {
            logger.error('Failed to get proxy statistics:', error);
            return {
                total_requests: 0,
                success_rate: 0,
                avg_response_time: 0,
                error_count: 0,
                hourly_stats: []
            };
        }
    }

    private async executeCommand(args: string[]): Promise<{ success: boolean; output: string; error: string }> {
        return new Promise((resolve) => {
            try {
                const child = spawn(args[0], args.slice(1), {
                    timeout: 5000
                });

                let output = '';
                let error = '';

                child.stdout?.on('data', (data) => {
                    output += data.toString();
                });

                child.stderr?.on('data', (data) => {
                    error += data.toString();
                });

                child.on('close', (code) => {
                    resolve({
                        success: code === 0,
                        output: output.trim(),
                        error: error.trim()
                    });
                });

                child.on('error', (err) => {
                    resolve({
                        success: false,
                        output: '',
                        error: err.message
                    });
                });

            } catch (error) {
                resolve({
                    success: false,
                    output: '',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }
}