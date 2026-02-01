import { Logger } from '../utils/logger';
import { executeQuery } from '../database/connection';
import axios from 'axios';
import { spawn } from 'child_process';

const logger = new Logger();

export interface CloudProvider {
    id: number;
    name: string;
    type: string;
    api_endpoint: string;
    is_active: boolean;
    status: 'connected' | 'disconnected' | 'error';
    last_tested: string;
    response_time: number;
    api_key_encrypted?: string;
    config_json?: any;
}

export interface CloudTunnelStatus {
    tunnel_id: string;
    tunnel_name: string;
    status: 'active' | 'inactive' | 'error';
    connections: number;
    last_updated: string;
    public_url: string;
}

export interface ProviderTestResult {
    provider_id: number;
    success: boolean;
    response_time: number;
    error_message?: string;
    timestamp: Date;
}

export interface SystemIntegrationStatus {
    providers_connected: number;
    total_providers: number;
    tunnel_status: 'active' | 'inactive' | 'error';
    proxy_status: 'active' | 'inactive' | 'error';
    overall_health: 'healthy' | 'degraded' | 'unhealthy';
}

export class CloudProviderManager {
    private httpClient = axios.create({
        timeout: 5000,
        headers: {
            'Content-Type': 'application/json',
        }
    });

    async getProviderStatus(providerId: number): Promise<CloudProvider | null> {
        try {
            const result = await executeQuery(
                `SELECT 
                    id, name, type, api_endpoint, is_active, 
                    config_json, api_key_encrypted,
                    created_at, updated_at
                 FROM ai_providers 
                 WHERE id = ?`,
                [providerId]
            );

            if (!result || result.length === 0) {
                return null;
            }

            const provider = result[0];
            const testResult = await this.testProviderConnection(providerId);
            
            return {
                id: provider.id,
                name: provider.name,
                type: provider.type,
                api_endpoint: provider.api_endpoint,
                is_active: provider.is_active === 1,
                status: testResult.success ? 'connected' : 'error',
                last_tested: testResult.timestamp.toISOString(),
                response_time: testResult.response_time,
                api_key_encrypted: provider.api_key_encrypted,
                config_json: provider.config_json
            };

        } catch (error) {
            logger.error(`Failed to get provider status for ID ${providerId}:`, error);
            return null;
        }
    }

    async getAllProviderStatuses(): Promise<CloudProvider[]> {
        try {
            const results = await executeQuery(
                `SELECT 
                    id, name, type, api_endpoint, is_active,
                    config_json, api_key_encrypted,
                    created_at, updated_at
                 FROM ai_providers 
                 WHERE is_active = 1
                 ORDER BY name`
            );

            const providerStatuses: CloudProvider[] = [];
            
            for (const provider of results) {
                const testResult = await this.testProviderConnection(provider.id);
                
                providerStatuses.push({
                    id: provider.id,
                    name: provider.name,
                    type: provider.type,
                    api_endpoint: provider.api_endpoint,
                    is_active: provider.is_active === 1,
                    status: testResult.success ? 'connected' : 'error',
                    last_tested: testResult.timestamp.toISOString(),
                    response_time: testResult.response_time,
                    api_key_encrypted: provider.api_key_encrypted,
                    config_json: provider.config_json
                });
            }

            return providerStatuses;

        } catch (error) {
            logger.error('Failed to get all provider statuses:', error);
            return [];
        }
    }

    async testProviderConnection(providerId: number): Promise<ProviderTestResult> {
        try {
            const provider = await executeQuery(
                'SELECT id, name, type, api_endpoint, api_key_encrypted FROM ai_providers WHERE id = ?',
                [providerId]
            );

            if (!provider || provider.length === 0) {
                return {
                    provider_id: providerId,
                    success: false,
                    response_time: 0,
                    error_message: 'Provider not found',
                    timestamp: new Date()
                };
            }

            const providerData = provider[0];
            const startTime = Date.now();

            let success = false;
            let errorMessage = '';

            try {
                // Test different provider types
                switch (providerData.type) {
                    case 'ollama':
                        success = await this.testOllamaProvider(providerData.api_endpoint);
                        break;
                    case 'google':
                        success = await this.testGoogleProvider(providerData.api_endpoint, providerData.api_key_encrypted);
                        break;
                    case 'openai':
                        success = await this.testOpenAIProvider(providerData.api_endpoint, providerData.api_key_encrypted);
                        break;
                    default:
                        // Generic HTTP test for other providers
                        success = await this.testGenericProvider(providerData.api_endpoint);
                        break;
                }
            } catch (testError) {
                errorMessage = testError instanceof Error ? testError.message : 'Unknown error';
                success = false;
            }

            const responseTime = Date.now() - startTime;

            // Record test result
            await this.recordProviderTest(providerId, success, responseTime, errorMessage);

            return {
                provider_id: providerId,
                success,
                response_time: responseTime,
                error_message: success ? undefined : errorMessage,
                timestamp: new Date()
            };

        } catch (error) {
            logger.error(`Failed to test provider connection ${providerId}:`, error);
            return {
                provider_id: providerId,
                success: false,
                response_time: 0,
                error_message: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            };
        }
    }

    private async testOllamaProvider(endpoint: string): Promise<boolean> {
        try {
            const response = await this.httpClient.get(`${endpoint}/api/tags`, { timeout: 3000 });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    private async testGoogleProvider(endpoint: string, apiKey: string): Promise<boolean> {
        try {
            // Simple connectivity test - in production, you'd use actual Google API
            const response = await this.httpClient.get(endpoint, { 
                timeout: 3000,
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    private async testOpenAIProvider(endpoint: string, apiKey: string): Promise<boolean> {
        try {
            const response = await this.httpClient.get(endpoint, { 
                timeout: 3000,
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    private async testGenericProvider(endpoint: string): Promise<boolean> {
        try {
            const response = await this.httpClient.get(endpoint, { timeout: 3000 });
            return response.status < 500; // Consider 4xx as connected but with auth issues
        } catch (error) {
            return false;
        }
    }

    private async recordProviderTest(
        providerId: number, 
        success: boolean, 
        responseTime: number, 
        errorMessage?: string
    ): Promise<void> {
        try {
            await executeQuery(
                `INSERT INTO model_performance_metrics 
                 (model_id, test_type, response_time_ms, success, error_message, metadata) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    null, // No specific model
                    'provider_connectivity',
                    responseTime,
                    success ? 1 : 0,
                    errorMessage || null,
                    JSON.stringify({ provider_id: providerId, timestamp: new Date().toISOString() })
                ]
            );
        } catch (error) {
            logger.error('Failed to record provider test:', error);
        }
    }

    async getTunnelInfo(): Promise<CloudTunnelStatus | null> {
        try {
            // Execute cloudflared tunnel list command
            const tunnelInfo = await this.executeCloudflaredCommand(['tunnel', 'list']);
            
            if (!tunnelInfo.success) {
                return {
                    tunnel_id: '',
                    tunnel_name: 'Unknown',
                    status: 'error',
                    connections: 0,
                    last_updated: new Date().toISOString(),
                    public_url: ''
                };
            }

            // Parse tunnel information
            const lines = tunnelInfo.output.split('\n');
            const tunnelLine = lines.find(line => line.includes('zombiecoder-tunnel'));
            
            if (!tunnelLine) {
                return {
                    tunnel_id: '',
                    tunnel_name: 'zombiecoder-tunnel',
                    status: 'inactive',
                    connections: 0,
                    last_updated: new Date().toISOString(),
                    public_url: ''
                };
            }

            // Extract tunnel details (simplified parsing)
            const parts = tunnelLine.trim().split(/\s+/);
            const tunnelId = parts[0] || '';
            const connections = parts.length > 3 ? parseInt(parts[3]) || 0 : 0;

            // Get tunnel info details
            const tunnelDetails = await this.executeCloudflaredCommand(['tunnel', 'info', 'zombiecoder-tunnel']);
            
            let publicUrl = '';
            if (tunnelDetails.success) {
                // Extract public URL from tunnel info
                const urlMatch = tunnelDetails.output.match(/https?:\/\/[^\s]+/);
                publicUrl = urlMatch ? urlMatch[0] : '';
            }

            return {
                tunnel_id: tunnelId,
                tunnel_name: 'zombiecoder-tunnel',
                status: connections > 0 ? 'active' : 'inactive',
                connections: connections,
                last_updated: new Date().toISOString(),
                public_url: publicUrl
            };

        } catch (error) {
            logger.error('Failed to get tunnel info:', error);
            return {
                tunnel_id: '',
                tunnel_name: 'zombiecoder-tunnel',
                status: 'error',
                connections: 0,
                last_updated: new Date().toISOString(),
                public_url: ''
            };
        }
    }

    async refreshTunnelStatus(): Promise<CloudTunnelStatus> {
        try {
            // This would typically restart or refresh the tunnel
            // For now, we'll just get current status
            return await this.getTunnelInfo() || {
                tunnel_id: '',
                tunnel_name: 'zombiecoder-tunnel',
                status: 'error',
                connections: 0,
                last_updated: new Date().toISOString(),
                public_url: ''
            };
        } catch (error) {
            logger.error('Failed to refresh tunnel status:', error);
            return {
                tunnel_id: '',
                tunnel_name: 'zombiecoder-tunnel',
                status: 'error',
                connections: 0,
                last_updated: new Date().toISOString(),
                public_url: ''
            };
        }
    }

    private async executeCloudflaredCommand(args: string[]): Promise<{ success: boolean; output: string; error: string }> {
        return new Promise((resolve) => {
            try {
                const child = spawn('cloudflared', args, {
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

    async getSystemIntegrationStatus(): Promise<SystemIntegrationStatus> {
        try {
            // Get provider statuses
            const providers = await this.getAllProviderStatuses();
            const connectedProviders = providers.filter(p => p.status === 'connected').length;
            
            // Get tunnel status
            const tunnelStatus = await this.getTunnelInfo();
            const tunnelHealth = tunnelStatus?.status === 'active' ? 'active' : 'inactive';
            
            // Get proxy status (simplified)
            const proxyHealth = 'active'; // Would check actual proxy status
            
            // Calculate overall health
            const healthScore = (connectedProviders / Math.max(providers.length, 1)) * 0.5 + 
                              (tunnelHealth === 'active' ? 0.3 : 0) + 
                              (proxyHealth === 'active' ? 0.2 : 0);
            
            let overallHealth: 'healthy' | 'degraded' | 'unhealthy' = 'unhealthy';
            if (healthScore >= 0.8) overallHealth = 'healthy';
            else if (healthScore >= 0.5) overallHealth = 'degraded';

            return {
                providers_connected: connectedProviders,
                total_providers: providers.length,
                tunnel_status: tunnelHealth as 'active' | 'inactive' | 'error',
                proxy_status: proxyHealth as 'active' | 'inactive' | 'error',
                overall_health: overallHealth
            };

        } catch (error) {
            logger.error('Failed to get system integration status:', error);
            return {
                providers_connected: 0,
                total_providers: 0,
                tunnel_status: 'error',
                proxy_status: 'error',
                overall_health: 'unhealthy'
            };
        }
    }
}