import { executeQuery } from '../database/connection';
import { Logger } from '../utils/logger';
import { EventEmitter } from 'events';

class DynamicConfigService {
    private static instance: DynamicConfigService;
    private configCache: Map<string, any>;
    private logger: Logger;
    private eventEmitter: EventEmitter;
    private pollInterval: NodeJS.Timeout | null = null;

    private constructor() {
        this.configCache = new Map();
        this.logger = new Logger();
        this.eventEmitter = new EventEmitter();
        this.initialize();
    }

    public static getInstance(): DynamicConfigService {
        if (!DynamicConfigService.instance) {
            DynamicConfigService.instance = new DynamicConfigService();
        }
        return DynamicConfigService.instance;
    }

    private initialize() {
        // Initialize without waiting to avoid blocking startup
        this.safeInitialize();
    }
    
    private async safeInitialize() {
        try {
            await this.loadAllConfigs();
            this.startPolling();
        } catch (error) {
            // If database isn't ready yet, schedule a retry with max attempts
            this.scheduleRetry();
        }
    }
    
    private retryCount = 0;
    private maxRetries = 10;
    
    private scheduleRetry() {
        if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            setTimeout(() => {
                this.safeInitialize().catch(err => {
                    console.error('Failed to initialize dynamic config service:', err);
                });
            }, 2000); // Retry in 2 seconds
        } else {
            console.warn('Max retries reached for dynamic config service initialization');
        }
    }

    private startPolling() {
        // Poll for configuration changes every 30 seconds
        this.pollInterval = setInterval(async () => {
            try {
                await this.checkForUpdates();
            } catch (error) {
                this.logger.error('Error checking for config updates', { error: (error as Error).message });
            }
        }, 30000); // 30 seconds
    }

    private async checkForUpdates() {
        const currentConfigs = await this.fetchAllConfigsFromDB();
        
        for (const [key, newValue] of Object.entries(currentConfigs)) {
            const cachedValue = this.configCache.get(key);
            
            if (JSON.stringify(cachedValue) !== JSON.stringify(newValue)) {
                this.configCache.set(key, newValue);
                this.eventEmitter.emit('configChanged', { key, oldValue: cachedValue, newValue });
                this.logger.info('Configuration updated', { key });
            }
        }
    }

    private async fetchAllConfigsFromDB() {
        const configs: any = {};

        // Fetch agent configurations
        const agents = await executeQuery(`
            SELECT 
                id, name, type, greeting_prefix, signature_prefix, 
                transparency_mode, error_handling_strategy, config
            FROM agents 
            WHERE is_enabled = 1
        `);

        for (const agent of agents) {
            configs[`agent_${agent.id}`] = agent;
        }

        // Fetch response templates
        const templates = await executeQuery(`
            SELECT agent_id, template_type, template_content, language 
            FROM agent_response_templates 
            WHERE is_active = 1
        `);

        for (const template of templates) {
            const key = `template_${template.agent_id}_${template.template_type}`;
            configs[key] = template;
        }

        return configs;
    }

    public async loadAllConfigs() {
        try {
            const configs = await this.fetchAllConfigsFromDB();
            this.configCache.clear();
            
            for (const [key, value] of Object.entries(configs)) {
                this.configCache.set(key, value);
            }

            this.logger.info('All configurations loaded', { count: this.configCache.size });
        } catch (error) {
            this.logger.error('Failed to load configurations', { error: (error as Error).message });
            throw error;
        }
    }

    public getConfig(key: string): any {
        return this.configCache.get(key);
    }

    public getAllAgentConfigs(): any[] {
        const agentConfigs = [];
        for (const [key, value] of this.configCache.entries()) {
            if (key.startsWith('agent_')) {
                agentConfigs.push(value);
            }
        }
        return agentConfigs;
    }

    public getAgentConfig(agentId: number): any {
        const config = this.configCache.get(`agent_${agentId}`);
        // Return a default config if not found
        if (!config) {
            return {
                id: agentId,
                greeting_prefix: 'ভাইয়া,',
                signature_prefix: 'জম্বি কোডার সিস্টেম থেকে বলছি...',
                transparency_mode: 'strict',
                error_handling_strategy: 'transparent'
            };
        }
        return config;
    }

    public getAgentTemplate(agentId: number, templateType: string): any {
        const template = this.configCache.get(`template_${agentId}_${templateType}`);
        // Return default templates if not found
        if (!template) {
            const defaultTemplates: Record<string, string> = {
                success: '{greeting_prefix} {response}',
                server_down: '{greeting_prefix} সরাসরি বলছি ভাই, আমাদের সিস্টেমের মগজে (Server) এই মুহূর্তে একটা যান্ত্রিক গোলযোগ দেখা দিয়েছে। আমি আপনার অনুরোধটি প্রসেস করার জন্য প্রয়োজনীয় তথ্য খুঁজে পাচ্ছি না। কোনো কিছু লুকাবো না—সিস্টেম এখন মেইনটেন্যান্স বা গুরুতর টেকনিক্যাল এররের মধ্য দিয়ে যাচ্ছে। আপনি চাইলে কিছুক্ষণ পর আবার চেষ্টা করতে পারেন। সত্যটা জানানোর জন্য ধন্যবাদ।',
                data_not_found: '{greeting_prefix}, আমি আপনার প্রশ্নের সঠিক উত্তরটি এই মুহূর্তে খুঁজে পাচ্ছি না। আমার মেমোরিতে (Database) এই বিষয়ে কোনো অথেন্টিক রেফারেন্স বা ট্রেনিং ডাটা নেই। ভুল তথ্য দিয়ে আপনাকে বিভ্রান্ত করতে চাই না। আমি বিষয়টি এডমিন লেভেলে নোট করে রাখছি। আগামীতে হয়তো আপনাকে এ বিষয়ে পরিষ্কার জানাতে পারবো।',
                capability_restriction: '{greeting_prefix} সহজভাবে স্বীকার করছি, আমার এই মুহূর্তে উত্তর দেওয়ার মতো সক্ষমতা নেই। এডমিন প্যানেল থেকে কিছু সীমাবদ্ধতা বা কনফিগারেশন আপডেট চলছে, যার ফলে আমি আপনার সাথে পুরোপুরি কানেক্ট হতে পারছি না। হতাশ হবেন না, আমাদের টিম এটা নিয়ে কাজ করছে। ধৈর্য ধরার জন্য আপনার প্রতি কৃতজ্ঞতা।',
                error: '{greeting_prefix} আমি আপনার অনুরোধটি প্রসেস করতে পারছি না। সিস্টেমে কিছু সমস্যা হতে পারে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।'
            };
            return {
                agent_id: agentId,
                template_type: templateType,
                template_content: defaultTemplates[templateType] || `{greeting_prefix} ${templateType} template not found.`
            };
        }
        return template;
    }

    public onConfigChange(listener: (data: { key: string, oldValue: any, newValue: any }) => void) {
        this.eventEmitter.on('configChanged', listener);
    }

    public offConfigChange(listener: (data: { key: string, oldValue: any, newValue: any }) => void) {
        this.eventEmitter.off('configChanged', listener);
    }

    public async reloadConfig(key?: string) {
        if (key) {
            // Reload specific config
            if (key.startsWith('agent_')) {
                const agentId = parseInt(key.split('_')[1]);
                const [agent] = await executeQuery('SELECT * FROM agents WHERE id = ?', [agentId]);
                if (agent) {
                    this.configCache.set(key, agent);
                }
            } else if (key.startsWith('template_')) {
                const parts = key.split('_');
                const agentId = parseInt(parts[1]);
                const templateType = parts[2];
                
                const [template] = await executeQuery(
                    'SELECT * FROM agent_response_templates WHERE agent_id = ? AND template_type = ?',
                    [agentId, templateType]
                );
                
                if (template) {
                    this.configCache.set(key, template);
                }
            }
        } else {
            // Reload all configs
            await this.loadAllConfigs();
        }
    }

    public destroy() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }
}

export const dynamicConfigService = DynamicConfigService.getInstance();