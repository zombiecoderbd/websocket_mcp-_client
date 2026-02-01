import { spawn, ChildProcess } from 'child_process';
import { Logger } from '../utils/logger';
import { executeQuery } from '../database/connection';

const logger = new Logger();

export interface CLIResult {
    success: boolean;
    output: string;
    error: string;
    exitCode: number | null;
    processId: number | null;
}

export interface ProcessInfo {
    processId: number;
    modelName: string;
    command: string;
    status: 'running' | 'stopped' | 'error' | 'pending';
    startTime: Date | null;
    pid: number | null;
}

export interface ProcessStatus {
    processId: number;
    modelName: string;
    status: 'running' | 'stopped' | 'error' | 'pending';
    pid: number | null;
    cpuUsage: number;
    memoryUsage: number;
    uptime: number;
}

export interface PerformanceData {
    processId: number;
    cpuUsage: number;
    memoryUsage: number;
    responseTime: number;
    requestsHandled: number;
    timestamp: Date;
}

export class CLIManager {
    private cliProcesses: Map<string, ChildProcess> = new Map();
    private processInfo: Map<number, ProcessInfo> = new Map();
    private nextProcessId: number = 1;

    async executeCLICommand(command: string, args: string[] = []): Promise<CLIResult> {
        return new Promise((resolve) => {
            try {
                logger.info(`Executing CLI command: ${command} ${args.join(' ')}`);
                
                const child = spawn(command, args, {
                    cwd: process.cwd(),
                    env: process.env,
                    stdio: ['pipe', 'pipe', 'pipe']
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
                    const result: CLIResult = {
                        success: code === 0,
                        output: output.trim(),
                        error: error.trim(),
                        exitCode: code,
                        processId: null
                    };
                    resolve(result);
                });

                child.on('error', (err) => {
                    const result: CLIResult = {
                        success: false,
                        output: '',
                        error: err.message,
                        exitCode: null,
                        processId: null
                    };
                    resolve(result);
                });

            } catch (error) {
                const result: CLIResult = {
                    success: false,
                    output: '',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    exitCode: null,
                    processId: null
                };
                resolve(result);
            }
        });
    }

    async startModelProcess(modelName: string, providerType: string = 'ollama'): Promise<ProcessInfo> {
        try {
            // Check if process already exists
            const existingProcess = this.findProcessByModel(modelName);
            if (existingProcess && existingProcess.status === 'running') {
                logger.warn(`Model ${modelName} is already running with process ID ${existingProcess.processId}`);
                return existingProcess;
            }

            let command = '';
            let args: string[] = [];

            // Determine command based on provider type
            switch (providerType) {
                case 'ollama':
                    command = 'ollama';
                    args = ['run', modelName];
                    break;
                case 'google':
                    // For Google Cloud, we might start a local proxy or service
                    command = 'node';
                    args = ['google-model-proxy.js', modelName];
                    break;
                default:
                    throw new Error(`Unsupported provider type: ${providerType}`);
            }

            logger.info(`Starting ${providerType} model process: ${modelName}`);
            
            const child = spawn(command, args, {
                cwd: process.cwd(),
                env: process.env,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            const processId = this.nextProcessId++;
            const processInfo: ProcessInfo = {
                processId,
                modelName,
                command: `${command} ${args.join(' ')}`,
                status: 'pending',
                startTime: new Date(),
                pid: child.pid || null
            };

            this.cliProcesses.set(modelName, child);
            this.processInfo.set(processId, processInfo);

            // Update database
            await this.recordProcessStart(processInfo);

            // Handle process events
            child.on('spawn', () => {
                processInfo.status = 'running';
                logger.info(`Model process ${processId} for ${modelName} started successfully (PID: ${child.pid})`);
                this.updateProcessInDatabase(processId, 'running');
            });

            child.on('close', (code) => {
                processInfo.status = code === 0 ? 'stopped' : 'error';
                logger.info(`Model process ${processId} for ${modelName} closed with code ${code}`);
                this.updateProcessInDatabase(processId, processInfo.status);
                this.cliProcesses.delete(modelName);
            });

            child.on('error', (err) => {
                processInfo.status = 'error';
                logger.error(`Model process ${processId} for ${modelName} failed:`, err.message);
                this.updateProcessInDatabase(processId, 'error', err.message);
                this.cliProcesses.delete(modelName);
            });

            return processInfo;

        } catch (error) {
            logger.error(`Failed to start model process for ${modelName}:`, error);
            throw error;
        }
    }

    async stopModelProcess(modelName: string): Promise<boolean> {
        try {
            const process = this.cliProcesses.get(modelName);
            if (!process) {
                logger.warn(`No running process found for model ${modelName}`);
                return false;
            }

            const processInfo = this.findProcessByModel(modelName);
            if (!processInfo) return false;

            logger.info(`Stopping model process for ${modelName} (PID: ${process.pid})`);
            
            // Try graceful shutdown first
            process.kill('SIGTERM');
            
            // Wait a bit, then force kill if needed
            setTimeout(() => {
                if (!process.killed) {
                    logger.warn(`Force killing model process for ${modelName}`);
                    process.kill('SIGKILL');
                }
            }, 5000);

            // Update database
            await this.updateProcessInDatabase(processInfo.processId, 'stopped');
            
            this.cliProcesses.delete(modelName);
            return true;

        } catch (error) {
            logger.error(`Failed to stop model process for ${modelName}:`, error);
            return false;
        }
    }

    async getProcessStatus(modelName: string): Promise<ProcessStatus | null> {
        try {
            const process = this.cliProcesses.get(modelName);
            const processInfo = this.findProcessByModel(modelName);
            
            if (!process || !processInfo) {
                return null;
            }

            // Get system information (simplified)
            const cpuUsage = this.getProcessCPUUsage(process.pid || null);
            const memoryUsage = this.getProcessMemoryUsage(process.pid || null);
            const uptime = processInfo.startTime ? 
                Math.floor((Date.now() - processInfo.startTime.getTime()) / 1000) : 0;

            return {
                processId: processInfo.processId,
                modelName: processInfo.modelName,
                status: processInfo.status,
                pid: process.pid || null,
                cpuUsage,
                memoryUsage,
                uptime
            };

        } catch (error) {
            logger.error(`Failed to get process status for ${modelName}:`, error);
            return null;
        }
    }

    async monitorProcessPerformance(processId: number): Promise<PerformanceData> {
        try {
            const processInfo = this.processInfo.get(processId);
            if (!processInfo || !processInfo.pid) {
                throw new Error(`Process ${processId} not found or has no PID`);
            }

            const cpuUsage = this.getProcessCPUUsage(processInfo.pid);
            const memoryUsage = this.getProcessMemoryUsage(processInfo.pid);
            const responseTime = await this.measureProcessResponseTime(processInfo.modelName);

            return {
                processId,
                cpuUsage,
                memoryUsage,
                responseTime,
                requestsHandled: 0, // Would be tracked in real implementation
                timestamp: new Date()
            };

        } catch (error) {
            logger.error(`Failed to monitor process performance for ${processId}:`, error);
            throw error;
        }
    }

    async listAllProcesses(): Promise<ProcessInfo[]> {
        return Array.from(this.processInfo.values());
    }

    private findProcessByModel(modelName: string): ProcessInfo | undefined {
        for (const processInfo of this.processInfo.values()) {
            if (processInfo.modelName === modelName) {
                return processInfo;
            }
        }
        return undefined;
    }

    private getProcessCPUUsage(pid: number | null): number {
        // In a real implementation, this would use system monitoring
        // For now, return simulated data
        if (!pid) return 0;
        return Math.random() * 50; // 0-50% CPU usage
    }

    private getProcessMemoryUsage(pid: number | null): number {
        // In a real implementation, this would use system monitoring
        // For now, return simulated data
        if (!pid) return 0;
        return Math.random() * 1000; // 0-1000 MB
    }

    private async measureProcessResponseTime(modelName: string): Promise<number> {
        // Simulate response time measurement
        return Math.floor(Math.random() * 1000) + 50; // 50-1050ms
    }

    private async recordProcessStart(processInfo: ProcessInfo): Promise<void> {
        try {
            await executeQuery(
                `INSERT INTO cli_processes 
                 (model_name, provider_id, process_id, command, arguments, status, start_time, metadata) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    processInfo.modelName,
                    null, // Would be the actual provider ID
                    processInfo.processId,
                    processInfo.command,
                    JSON.stringify([]), // Empty args array
                    processInfo.status,
                    processInfo.startTime,
                    JSON.stringify({
                        pid: processInfo.pid,
                        startedBy: 'admin_panel'
                    })
                ]
            );
        } catch (error) {
            logger.error('Failed to record process start:', error);
        }
    }

    private async updateProcessInDatabase(processId: number, status: string, errorMessage?: string): Promise<void> {
        try {
            const updates: any[] = [status, processId];
            let query = 'UPDATE cli_processes SET status = ?';
            
            if (status === 'stopped' || status === 'error') {
                query += ', end_time = CURRENT_TIMESTAMP';
                if (errorMessage) {
                    query += ', exit_code = -1, logs = ?';
                    updates.unshift(errorMessage);
                }
            }
            
            query += ' WHERE process_id = ?';
            
            await executeQuery(query, updates);
        } catch (error) {
            logger.error('Failed to update process in database:', error);
        }
    }

    // Cleanup method to be called on shutdown
    async cleanup(): Promise<void> {
        logger.info('Cleaning up CLI processes...');
        
        for (const [modelName, process] of this.cliProcesses.entries()) {
            try {
                if (!process.killed) {
                    process.kill('SIGTERM');
                    logger.info(`Terminated process for model: ${modelName}`);
                }
            } catch (error) {
                logger.error(`Failed to terminate process for ${modelName}:`, error);
            }
        }
        
        this.cliProcesses.clear();
        this.processInfo.clear();
        this.nextProcessId = 1;
    }
}