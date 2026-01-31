import { Logger } from '../utils/logger';
import { executeQuery } from '../database/connection';
import { CLIManager } from './cli-manager';

const logger = new Logger();

export interface InstallationResult {
    success: boolean;
    message: string;
    installedPath?: string;
    error?: string;
    dependencies?: string[];
}

export interface SystemSpecs {
    cpu: {
        cores: number;
        architecture: string;
        speed: number;
    };
    memory: {
        total: number;
        available: number;
    };
    storage: {
        total: number;
        available: number;
    };
    os: {
        platform: string;
        version: string;
    };
}

export interface Dependencies {
    name: string;
    version: string;
    requiredBy: string[];
    installed: boolean;
    installationPath?: string;
}

export class DependencyInstaller {
    private cliManager: CLIManager;

    constructor(cliManager: CLIManager) {
        this.cliManager = cliManager;
    }

    async installOllama(): Promise<InstallationResult> {
        try {
            logger.info('Starting Ollama installation process...');
            
            // Check if Ollama is already installed
            const isInstalled = await this.isOllamaInstalled();
            if (isInstalled) {
                return {
                    success: true,
                    message: 'Ollama is already installed',
                    installedPath: await this.getOllamaPath()
                };
            }

            // Determine installation method based on OS
            const osType = process.platform;
            let installCommand = '';
            let installArgs: string[] = [];

            switch (osType) {
                case 'linux':
                    installCommand = 'curl';
                    installArgs = ['-fsSL', 'https://ollama.com/install.sh', '|', 'sh'];
                    break;
                case 'darwin':
                    installCommand = 'brew';
                    installArgs = ['install', 'ollama'];
                    break;
                case 'win32':
                    installCommand = 'powershell';
                    installArgs = ['-Command', 'iwr https://ollama.com/install.ps1 -UseBasicParsing | iex'];
                    break;
                default:
                    throw new Error(`Unsupported operating system: ${osType}`);
            }

            // Execute installation
            const result = await this.cliManager.executeCLICommand(installCommand, installArgs);
            
            if (result.success) {
                // Verify installation
                const verification = await this.verifyOllamaInstallation();
                if (verification) {
                    const installPath = await this.getOllamaPath();
                    
                    // Record installation in database
                    await this.recordDependencyInstallation('ollama', 'latest', installPath, 'installed');
                    
                    return {
                        success: true,
                        message: 'Ollama installed successfully',
                        installedPath: installPath
                    };
                } else {
                    throw new Error('Installation completed but verification failed');
                }
            } else {
                throw new Error(`Installation failed: ${result.error}`);
            }

        } catch (error) {
            logger.error('Ollama installation failed:', error);
            
            await this.recordDependencyInstallation(
                'ollama', 
                'latest', 
                null, 
                'failed', 
                error instanceof Error ? error.message : 'Unknown error'
            );
            
            return {
                success: false,
                message: 'Ollama installation failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async installModelDependencies(modelName: string): Promise<Dependencies[]> {
        try {
            logger.info(`Installing dependencies for model: ${modelName}`);
            
            // Get required dependencies for this model
            const requiredDeps = this.getModelDependencies(modelName);
            
            const results: Dependencies[] = [];
            
            for (const dep of requiredDeps) {
                const result = await this.installSingleDependency(dep.name, dep.version);
                results.push({
                    ...dep,
                    installed: result.success,
                    installationPath: result.installedPath
                });
                
                // Record in database
                await this.recordDependencyInstallation(
                    dep.name,
                    dep.version,
                    result.installedPath || null,
                    result.success ? 'installed' : 'failed',
                    result.error
                );
            }
            
            return results;

        } catch (error) {
            logger.error(`Failed to install dependencies for ${modelName}:`, error);
            throw error;
        }
    }

    async verifyInstallation(modelName: string): Promise<boolean> {
        try {
            // Check if model is available in Ollama
            const result = await this.cliManager.executeCLICommand('ollama', ['list']);
            
            if (!result.success) {
                logger.error('Failed to list Ollama models:', result.error);
                return false;
            }
            
            // Check if our model is in the list
            const modelsList = result.output;
            const isModelAvailable = modelsList.includes(modelName);
            
            if (isModelAvailable) {
                logger.info(`Model ${modelName} is available in Ollama`);
                return true;
            } else {
                logger.warn(`Model ${modelName} not found in Ollama list`);
                return false;
            }

        } catch (error) {
            logger.error(`Failed to verify installation for ${modelName}:`, error);
            return false;
        }
    }

    async getSystemRequirements(modelName: string): Promise<SystemSpecs> {
        try {
            // Get system information
            const systemInfo = await this.getSystemInformation();
            
            // Get model-specific requirements
            const modelRequirements = this.getModelRequirements(modelName);
            
            // Combine system info with model requirements
            return {
                ...systemInfo,
                ...modelRequirements
            };

        } catch (error) {
            logger.error(`Failed to get system requirements for ${modelName}:`, error);
            throw error;
        }
    }

    private async isOllamaInstalled(): Promise<boolean> {
        try {
            const result = await this.cliManager.executeCLICommand('ollama', ['--version']);
            return result.success;
        } catch {
            return false;
        }
    }

    private async getOllamaPath(): Promise<string> {
        try {
            const whichResult = await this.cliManager.executeCLICommand('which', ['ollama']);
            if (whichResult.success) {
                return whichResult.output.trim();
            }
            
            // Fallback paths
            const commonPaths = ['/usr/local/bin/ollama', '/opt/ollama/bin/ollama'];
            for (const path of commonPaths) {
                const testResult = await this.cliManager.executeCLICommand('test', ['-f', path]);
                if (testResult.success) {
                    return path;
                }
            }
            
            return '/usr/local/bin/ollama'; // Default assumption
        } catch {
            return '/usr/local/bin/ollama';
        }
    }

    private async verifyOllamaInstallation(): Promise<boolean> {
        try {
            // Try to start Ollama service
            const startResult = await this.cliManager.executeCLICommand('ollama', ['serve']);
            
            // Give it a moment to start
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Test if it's responding
            const testResult = await this.cliManager.executeCLICommand('ollama', ['list']);
            
            return testResult.success;
        } catch {
            return false;
        }
    }

    private async installSingleDependency(name: string, version: string): Promise<InstallationResult> {
        try {
            logger.info(`Installing dependency: ${name}@${version}`);
            
            let installCommand = '';
            let installArgs: string[] = [];

            // Determine installation method based on dependency type
            if (name.startsWith('python-')) {
                installCommand = 'pip';
                installArgs = ['install', `${name.replace('python-', '')}==${version}`];
            } else if (name.startsWith('npm-')) {
                installCommand = 'npm';
                installArgs = ['install', '-g', `${name.replace('npm-', '')}@${version}`];
            } else {
                // Assume it's a system package
                const osType = process.platform;
                if (osType === 'linux') {
                    installCommand = 'apt-get';
                    installArgs = ['install', '-y', name];
                } else if (osType === 'darwin') {
                    installCommand = 'brew';
                    installArgs = ['install', name];
                } else {
                    throw new Error(`Unsupported OS for dependency ${name}`);
                }
            }

            const result = await this.cliManager.executeCLICommand(installCommand, installArgs);
            
            return {
                success: result.success,
                message: result.success ? `Installed ${name} successfully` : `Failed to install ${name}`,
                installedPath: result.success ? `/usr/local/bin/${name}` : undefined,
                error: result.error || undefined
            };

        } catch (error) {
            return {
                success: false,
                message: `Failed to install ${name}`,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    private getModelDependencies(modelName: string): Dependencies[] {
        // Define dependencies for different models
        const dependencyMap: Record<string, Dependencies[]> = {
            'qwen2.5:1.5b': [
                {
                    name: 'python-numpy',
                    version: '1.24.0',
                    requiredBy: [modelName],
                    installed: false
                },
                {
                    name: 'python-requests',
                    version: '2.31.0',
                    requiredBy: [modelName],
                    installed: false
                }
            ],
            'llama2': [
                {
                    name: 'python-transformers',
                    version: '4.35.0',
                    requiredBy: [modelName],
                    installed: false
                },
                {
                    name: 'python-torch',
                    version: '2.1.0',
                    requiredBy: [modelName],
                    installed: false
                }
            ],
            'default': [
                {
                    name: 'python-numpy',
                    version: '1.24.0',
                    requiredBy: [modelName],
                    installed: false
                }
            ]
        };

        return dependencyMap[modelName] || dependencyMap['default'];
    }

    private async getSystemInformation(): Promise<SystemSpecs> {
        // In a real implementation, this would use systeminformation package
        // For now, return simulated data
        return {
            cpu: {
                cores: 8,
                architecture: process.arch,
                speed: 3.2
            },
            memory: {
                total: 16384,
                available: 8192
            },
            storage: {
                total: 512000,
                available: 256000
            },
            os: {
                platform: process.platform,
                version: process.version
            }
        };
    }

    private getModelRequirements(modelName: string): Partial<SystemSpecs> {
        // Define minimum requirements for different models
        const requirementsMap: Record<string, Partial<SystemSpecs>> = {
            'qwen2.5:1.5b': {
                memory: { total: 8192, available: 4096 },
                storage: { total: 102400, available: 10240 } // 10GB
            },
            'llama2': {
                memory: { total: 16384, available: 8192 },
                storage: { total: 102400, available: 51200 } // 50GB
            },
            'default': {
                memory: { total: 4096, available: 2048 },
                storage: { total: 10240, available: 5120 } // 5GB
            }
        };

        return requirementsMap[modelName] || requirementsMap['default'];
    }

    private async recordDependencyInstallation(
        name: string,
        version: string,
        path: string | null,
        status: 'installed' | 'pending' | 'failed' | 'removed',
        errorMessage?: string
    ): Promise<void> {
        try {
            await executeQuery(
                `INSERT INTO dependency_installations 
                 (dependency_name, dependency_version, installation_path, status, installation_output, error_message, installed_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?) 
                 ON DUPLICATE KEY UPDATE 
                 installation_path = VALUES(installation_path),
                 status = VALUES(status),
                 installation_output = VALUES(installation_output),
                 error_message = VALUES(error_message),
                 installed_at = VALUES(installed_at)`,
                [
                    name,
                    version,
                    path,
                    status,
                    status === 'installed' ? 'Installation successful' : '',
                    errorMessage || null,
                    status === 'installed' ? new Date() : null
                ]
            );
        } catch (error) {
            logger.error('Failed to record dependency installation:', error);
        }
    }
}