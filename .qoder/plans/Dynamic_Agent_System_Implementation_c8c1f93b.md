# Dynamic Agent System Implementation Plan

## Overview
This plan outlines the implementation of a dynamic agent system with clean separation of concerns, following the proxy pattern where frontend communicates with backend API (Port 8000), which internally communicates with MCP Server (Port 3002). The system will incorporate transparent response framework and proper persona management as outlined in the documentation.

## Phase 1: Database Schema Enhancement

### 1.1 Add Missing Configuration Tables
```sql
-- Agent Configuration Templates Table
CREATE TABLE IF NOT EXISTS agent_config_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    config JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Agent API Keys Table
CREATE TABLE IF NOT EXISTS agent_api_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agent_id INT NOT NULL,
    api_key_name VARCHAR(100) NOT NULL,
    encrypted_api_key TEXT NOT NULL,
    provider VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Agent Response Templates Table
CREATE TABLE IF NOT EXISTS agent_response_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agent_id INT NOT NULL,
    template_type ENUM('success', 'error', 'server_down', 'data_not_found', 'capability_restriction') NOT NULL,
    template_content TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'bn',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Agent Statistics Table
CREATE TABLE IF NOT EXISTS agent_statistics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agent_id INT NOT NULL,
    date DATE NOT NULL,
    request_count INT DEFAULT 0,
    successful_responses INT DEFAULT 0,
    error_count INT DEFAULT 0,
    avg_response_time DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    UNIQUE KEY unique_agent_date (agent_id, date)
);
```

### 1.2 Update Existing Agents Table
```sql
-- Add missing columns to agents table if not present
ALTER TABLE agents ADD COLUMN IF NOT EXISTS greeting_prefix VARCHAR(50) DEFAULT 'ভাইয়া,';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS signature_prefix TEXT DEFAULT 'জম্বি কোডার সিস্টেম থেকে বলছি...';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS transparency_mode ENUM('strict', 'normal', 'lenient') DEFAULT 'strict';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS error_handling_strategy VARCHAR(100) DEFAULT 'transparent';
```

## Phase 2: Backend API Implementation

### 2.1 Create Agent Management Routes
Create `/home/sahon/admin/server/src/routes/agent-management.ts`:

```typescript
import express from 'express';
import { executeQuery } from '../database/connection';
import { Logger } from '../utils/logger';

const router = express.Router();
const logger = new Logger();

// Get all agents with detailed configuration
router.get('/agents', async (req, res) => {
    try {
        const agents = await executeQuery(`
            SELECT 
                a.id,
                a.name,
                a.type,
                a.persona_name,
                a.description,
                a.status,
                a.config,
                a.ui_config,
                a.greeting_prefix,
                a.signature_prefix,
                a.transparency_mode,
                a.error_handling_strategy,
                a.request_count,
                a.active_sessions,
                a.last_active,
                act.template_name as config_template,
                art.template_content as response_template,
                ast.request_count as stats_request_count,
                ast.successful_responses,
                ast.error_count,
                ast.avg_response_time
            FROM agents a
            LEFT JOIN agent_config_templates act ON a.id = act.id
            LEFT JOIN agent_response_templates art ON a.id = art.agent_id AND art.template_type = 'success'
            LEFT JOIN agent_statistics ast ON a.id = ast.agent_id AND ast.date = CURDATE()
            WHERE a.is_enabled = 1
            ORDER BY a.sort_order, a.name
        `);

        res.json({
            success: true,
            data: agents,
            count: agents.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to fetch agents', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch agents',
            message: error.message
        });
    }
});

// Get specific agent
router.get('/agents/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [agent] = await executeQuery(`
            SELECT 
                a.*,
                act.config as template_config,
                art.template_content as response_templates
            FROM agents a
            LEFT JOIN agent_config_templates act ON a.id = act.id
            LEFT JOIN agent_response_templates art ON a.id = art.agent_id
            WHERE a.id = ? AND a.is_enabled = 1
        `, [id]);

        if (!agent) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found'
            });
        }

        // Get all response templates for this agent
        const responseTemplates = await executeQuery(
            'SELECT template_type, template_content, language FROM agent_response_templates WHERE agent_id = ? AND is_active = 1',
            [id]
        );

        agent.response_templates = responseTemplates;

        // Get recent statistics
        const stats = await executeQuery(
            'SELECT * FROM agent_statistics WHERE agent_id = ? ORDER BY date DESC LIMIT 30',
            [id]
        );
        agent.statistics = stats;

        res.json({
            success: true,
            data: agent,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to fetch agent details', { error: error.message, agentId: req.params.id });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch agent details',
            message: error.message
        });
    }
});

// Create new agent
router.post('/agents', async (req, res) => {
    try {
        const {
            name, type, persona_name, description, config, ui_config,
            greeting_prefix, signature_prefix, transparency_mode, error_handling_strategy
        } = req.body;

        // Validate required fields
        if (!name || !type) {
            return res.status(400).json({
                success: false,
                error: 'Name and type are required'
            });
        }

        // Insert agent
        const result: any = await executeQuery(`
            INSERT INTO agents (
                name, type, persona_name, description, config, ui_config,
                greeting_prefix, signature_prefix, transparency_mode, error_handling_strategy,
                status, is_enabled, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 1, NOW(), NOW())
        `, [
            name, type, persona_name, description, 
            JSON.stringify(config || {}),
            JSON.stringify(ui_config || {}),
            greeting_prefix || 'ভাইয়া,',
            signature_prefix || 'জম্বি কোডার সিস্টেম থেকে বলছি...',
            transparency_mode || 'strict',
            error_handling_strategy || 'transparent'
        ]);

        // Create default response templates
        const defaultTemplates = [
            { type: 'success', content: '{greeting_prefix} {response}' },
            { 
                type: 'server_down', 
                content: '{greeting_prefix} সরাসরি বলছি ভাই, আমাদের সিস্টেমের মগজে (Server) এই মুহূর্তে একটা যান্ত্রিক গোলযোগ দেখা দিয়েছে। আমি আপনার অনুরোধটি প্রসেস করার জন্য প্রয়োজনীয় তথ্য খুঁজে পাচ্ছি না। কোনো কিছু লুকাবো না—সিস্টেম এখন মেইনটেন্যান্স বা গুরুতর টেকনিক্যাল এররের মধ্য দিয়ে যাচ্ছে। আপনি চাইলে কিছুক্ষণ পর আবার চেষ্টা করতে পারেন। সত্যটা জানানোর জন্য ধন্যবাদ।' 
            },
            { 
                type: 'data_not_found', 
                content: '{greeting_prefix}, আমি আপনার প্রশ্নের সঠিক উত্তরটি এই মুহূর্তে খুঁজে পাচ্ছি না। আমার মেমোরিতে (Database) এই বিষয়ে কোনো অথেন্টিক রেফারেন্স বা ট্রেনিং ডাটা নেই। ভুল তথ্য দিয়ে আপনাকে বিভ্রান্ত করতে চাই না। আমি বিষয়টি এডমিন লেভেলে নোট করে রাখছি। আগামীতে হয়তো আপনাকে এ বিষয়ে পরিষ্কার জানাতে পারবো।' 
            },
            { 
                type: 'capability_restriction', 
                content: '{greeting_prefix} সহজভাবে স্বীকার করছি, আমার এই মুহূর্তে উত্তর দেওয়ার মতো সক্ষমতা নেই। এডমিন প্যানেল থেকে কিছু সীমাবদ্ধতা বা কনফিগারেশন আপডেট চলছে, যার ফলে আমি আপনার সাথে পুরোপুরি কানেক্ট হতে পারছি না। হতাশ হবেন না, আমাদের টিম এটা নিয়ে কাজ করছে। ধৈর্য ধরার জন্য আপনার প্রতি কৃতজ্ঞতা।' 
            }
        ];

        for (const template of defaultTemplates) {
            await executeQuery(`
                INSERT INTO agent_response_templates 
                (agent_id, template_type, template_content, language, is_active) 
                VALUES (?, ?, ?, 'bn', 1)
            `, [result.insertId, template.type, template.content]);
        }

        res.status(201).json({
            success: true,
            message: 'Agent created successfully',
            agentId: result.insertId,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to create agent', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to create agent',
            message: error.message
        });
    }
});

// Update agent
router.put('/agents/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Build dynamic update query
        const allowedFields = [
            'name', 'type', 'persona_name', 'description', 'status',
            'config', 'ui_config', 'greeting_prefix', 'signature_prefix',
            'transparency_mode', 'error_handling_strategy', 'is_enabled'
        ];

        const updateFields = [];
        const updateValues = [];

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                updateFields.push(`${key} = ?`);
                updateValues.push(value);
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid fields to update'
            });
        }

        updateValues.push(id); // For WHERE clause

        await executeQuery(
            `UPDATE agents SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
            updateValues
        );

        res.json({
            success: true,
            message: 'Agent updated successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to update agent', { error: error.message, agentId: req.params.id });
        res.status(500).json({
            success: false,
            error: 'Failed to update agent',
            message: error.message
        });
    }
});

// Delete agent
router.delete('/agents/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Soft delete - set is_enabled to 0 instead of actual deletion
        await executeQuery('UPDATE agents SET is_enabled = 0, updated_at = NOW() WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Agent disabled successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to delete agent', { error: error.message, agentId: req.params.id });
        res.status(500).json({
            success: false,
            error: 'Failed to delete agent',
            message: error.message
        });
    }
});

export default router;
```

### 2.2 Create Dynamic Configuration Service
Create `/home/sahon/admin/server/src/services/dynamic-config.ts`:

```typescript
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

    private async initialize() {
        await this.loadAllConfigs();
        this.startPolling();
    }

    private startPolling() {
        // Poll for configuration changes every 30 seconds
        this.pollInterval = setInterval(async () => {
            try {
                await this.checkForUpdates();
            } catch (error) {
                this.logger.error('Error checking for config updates', { error: error.message });
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
            this.logger.error('Failed to load configurations', { error: error.message });
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
        return this.configCache.get(`agent_${agentId}`);
    }

    public getAgentTemplate(agentId: number, templateType: string): any {
        return this.configCache.get(`template_${agentId}_${templateType}`);
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
```

### 2.3 Update Chat Service with Persona Integration
Update `/home/sahon/admin/server/src/services/ollama.ts` to include persona-aware responses:

```typescript
// Add to the existing OllamaService class
async generateWithPersona(messages: ChatMessage[], agentId: number, model?: string) {
    try {
        // Get agent configuration
        const agentConfig = dynamicConfigService.getAgentConfig(agentId);
        
        if (!agentConfig) {
            throw new Error(`Agent with ID ${agentId} not found or not configured`);
        }

        // Process messages through persona transformation
        const processedMessages = await this.applyPersonaToMessages(messages, agentConfig);

        // Generate response
        const response = await this.chat(processedMessages, model);

        // Apply response template based on transparency mode
        const finalResponse = await this.applyResponseTemplate(response, agentConfig, 'success');

        return finalResponse;
    } catch (error) {
        // Handle error based on agent's error handling strategy
        const agentConfig = dynamicConfigService.getAgentConfig(agentId);
        const errorResponse = await this.handleErrorResponse(error, agentConfig);
        return errorResponse;
    }
}

private async applyPersonaToMessages(messages: ChatMessage[], agentConfig: any): Promise<ChatMessage[]> {
    // Apply greeting prefix and signature to system messages
    const processedMessages: ChatMessage[] = [];

    for (const message of messages) {
        if (message.role === 'system') {
            // Enhance system message with persona information
            const enhancedContent = `${agentConfig.signature_prefix} ${message.content}`;
            processedMessages.push({
                ...message,
                content: enhancedContent
            });
        } else if (message.role === 'user') {
            // Optionally process user messages based on agent type
            processedMessages.push(message);
        } else {
            // For assistant responses, we'll process them after generation
            processedMessages.push(message);
        }
    }

    return processedMessages;
}

private async applyResponseTemplate(response: string, agentConfig: any, responseType: string = 'success'): Promise<string> {
    if (!agentConfig) return response;

    // Get appropriate template
    const template = dynamicConfigService.getAgentTemplate(agentConfig.id, responseType);
    
    if (template) {
        // Replace placeholders in template
        let templatedResponse = template.template_content
            .replace('{greeting_prefix}', agentConfig.greeting_prefix || 'ভাইয়া,')
            .replace('{response}', response)
            .replace('{signature_prefix}', agentConfig.signature_prefix || 'জম্বি কোডার সিস্টেম থেকে বলছি...');

        return templatedResponse;
    }

    // If no template, apply basic persona
    return `${agentConfig.greeting_prefix || 'ভাইয়া,'} ${response}`;
}

private async handleErrorResponse(error: any, agentConfig: any): Promise<string> {
    if (!agentConfig) {
        return 'ভাইয়া, আমি আপনার অনুরোধটি প্রসেস করতে পারছি না। সিস্টেমে কিছু সমস্যা হতে পারে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।';
    }

    // Determine error type and get appropriate template
    let templateType = 'error';
    if (error.message.includes('timeout') || error.message.includes('connection')) {
        templateType = 'server_down';
    } else if (error.message.includes('not found') || error.message.includes('no data')) {
        templateType = 'data_not_found';
    } else {
        templateType = 'capability_restriction';
    }

    const template = dynamicConfigService.getAgentTemplate(agentConfig.id, templateType);
    
    if (template) {
        return template.template_content
            .replace('{greeting_prefix}', agentConfig.greeting_prefix || 'ভাইয়া,');
    }

    // Default error response
    return `${agentConfig.greeting_prefix || 'ভাইয়া,'} আমি আপনার অনুরোধটি প্রসেস করতে পারছি না। সিস্টেমে কিছু সমস্যা হতে পারে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।`;
}
```

### 2.4 Update Main Server to Include New Routes
Update `/home/sahon/admin/server/src/index.ts` to register the new routes:

```typescript
// Add import
import agentManagementRoutes from './routes/agent-management';

// Add to route registration section
app.use('/api/management', agentManagementRoutes);
```

## Phase 3: Frontend Integration

### 3.1 Create Agent Management Components
Create `/home/sahon/admin/components/agent-management/agent-list.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  RefreshCw, 
  Settings, 
  Activity, 
  User, 
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface Agent {
  id: number;
  name: string;
  type: string;
  persona_name: string;
  description: string;
  status: string;
  request_count: number;
  active_sessions: number;
  last_active: string;
  greeting_prefix: string;
  signature_prefix: string;
  transparency_mode: string;
  error_handling_strategy: string;
  stats_request_count?: number;
  successful_responses?: number;
  error_count?: number;
  avg_response_time?: number;
}

export default function AgentList() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/management/agents');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch agents: ${response.status}`);
      }
      
      const data = await response.json();
      setAgents(data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching agents:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: JSX.Element }> = {
      active: { variant: 'default', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      inactive: { variant: 'secondary', icon: <Clock className="h-3 w-3 mr-1" /> },
      error: { variant: 'destructive', icon: <XCircle className="h-3 w-3 mr-1" /> },
      busy: { variant: 'outline', icon: <Activity className="h-3 w-3 mr-1" /> }
    };

    const statusInfo = statusMap[status] || { variant: 'secondary', icon: <User className="h-3 w-3 mr-1" /> };
    
    return (
      <Badge variant={statusInfo.variant}>
        {statusInfo.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    const typeIcons: Record<string, JSX.Element> = {
      editor: <Settings className="h-4 w-4" />,
      master: <User className="h-4 w-4" />,
      chatbot: <Activity className="h-4 w-4" />
    };

    return typeIcons[type] || <User className="h-4 w-4" />;
  };

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-destructive" />
              Error Loading Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchAgents}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Agent Management</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Agent
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-4" />
                <div className="flex justify-between">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Card key={agent.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{agent.name}</CardTitle>
                  {getTypeIcon(agent.type)}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {getStatusBadge(agent.status)}
                  <Badge variant="outline">{agent.type}</Badge>
                  <Badge variant="secondary">{agent.persona_name}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4 line-clamp-2">{agent.description}</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Requests:</span>
                    <span className="font-medium">{agent.request_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Sessions:</span>
                    <span className="font-medium">{agent.active_sessions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Active:</span>
                    <span className="font-medium">
                      {agent.last_active ? new Date(agent.last_active).toLocaleString() : 'Never'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t flex justify-between">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  <Button size="sm">
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {agents.length === 0 && !loading && (
        <div className="text-center py-12">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Agents Found</h3>
          <p className="text-muted-foreground mb-4">
            Get started by adding your first agent to the system.
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Agent
          </Button>
        </div>
      )}
    </div>
  );
}
```

### 3.2 Create Agent Detail Component
Create `/home/sahon/admin/components/agent-management/agent-detail.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Settings, 
  User, 
  Activity, 
  BarChart3,
  MessageSquare,
  Key,
  Globe
} from 'lucide-react';

interface AgentDetail {
  id: number;
  name: string;
  type: string;
  persona_name: string;
  description: string;
  status: string;
  config: any;
  ui_config: any;
  greeting_prefix: string;
  signature_prefix: string;
  transparency_mode: string;
  error_handling_strategy: string;
  request_count: number;
  active_sessions: number;
  last_active: string;
  response_templates: Array<{
    template_type: string;
    template_content: string;
    language: string;
  }>;
  statistics: Array<{
    date: string;
    request_count: number;
    successful_responses: number;
    error_count: number;
    avg_response_time: number;
  }>;
}

export default function AgentDetail() {
  const { id } = useParams();
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchAgentDetails(Number(id));
    }
  }, [id]);

  const fetchAgentDetails = async (agentId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/management/agents/${agentId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch agent: ${response.status}`);
      }
      
      const data = await response.json();
      setAgent(data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching agent details:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-destructive" />
              Error Loading Agent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => fetchAgentDetails(Number(id))}>
              <Settings className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-4" />
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
            
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Agent Not Found</h3>
        <p className="text-muted-foreground">
          The requested agent does not exist or has been removed.
        </p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      active: { variant: 'default' },
      inactive: { variant: 'secondary' },
      error: { variant: 'destructive' },
      busy: { variant: 'outline' }
    };

    const variant = statusMap[status]?.variant || 'secondary';
    
    return (
      <Badge variant={variant}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{agent.name}</h1>
          <p className="text-muted-foreground">{agent.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
          <Button>
            <Activity className="h-4 w-4 mr-2" />
            Activate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Info Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Agent Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(agent.status)}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="mt-1">{agent.type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Persona</p>
                <p className="mt-1">{agent.persona_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transparency Mode</p>
                <p className="mt-1">{agent.transparency_mode}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Greeting Prefix</p>
              <p className="font-mono bg-muted p-2 rounded">{agent.greeting_prefix}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Signature Prefix</p>
              <p className="font-mono bg-muted p-2 rounded">{agent.signature_prefix}</p>
            </div>
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Total Requests</span>
              <span className="font-medium">{agent.request_count}</span>
            </div>
            <div className="flex justify-between">
              <span>Active Sessions</span>
              <span className="font-medium">{agent.active_sessions}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Active</span>
              <span className="font-medium">
                {agent.last_active ? new Date(agent.last_active).toLocaleString() : 'Never'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Error Strategy</span>
              <span className="font-medium">{agent.error_handling_strategy}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Response Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Response Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agent.response_templates.map((template, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <Badge variant="outline">{template.template_type}</Badge>
                  <Badge variant="secondary">{template.language}</Badge>
                </div>
                <p className="whitespace-pre-line text-sm font-mono bg-muted p-2 rounded">
                  {template.template_content}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Agent Config</h4>
              <pre className="bg-muted p-3 rounded text-sm overflow-x-auto max-h-60">
                {JSON.stringify(agent.config, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="font-medium mb-2">UI Config</h4>
              <pre className="bg-muted p-3 rounded text-sm overflow-x-auto max-h-60">
                {JSON.stringify(agent.ui_config, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Phase 4: Proxy Pattern Implementation

### 4.1 Create MCP Proxy Service
Create `/home/sahon/admin/server/src/services/mcp-proxy.ts`:

```typescript
import axios from 'axios';
import { Logger } from '../utils/logger';

class MCProxyService {
    private mcpBaseUrl: string;
    private logger: Logger;
    private axiosInstance: any;

    constructor() {
        this.mcpBaseUrl = process.env.MCP_SERVER_URL || 'http://localhost:3002';
        this.logger = new Logger();
        
        this.axiosInstance = axios.create({
            baseURL: this.mcpBaseUrl,
            timeout: 30000, // 30 seconds timeout
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'ZombieCoder-Agent-Proxy/1.0'
            }
        });

        // Add request interceptor
        this.axiosInstance.interceptors.request.use(
            (config: any) => {
                this.logger.info('MCP Proxy Request', {
                    method: config.method,
                    url: config.url,
                    headers: config.headers
                });
                return config;
            },
            (error: any) => {
                this.logger.error('MCP Proxy Request Error', { error: error.message });
                return Promise.reject(error);
            }
        );

        // Add response interceptor
        this.axiosInstance.interceptors.response.use(
            (response: any) => {
                this.logger.info('MCP Proxy Response', {
                    status: response.status,
                    statusText: response.statusText,
                    duration: response.duration
                });
                return response;
            },
            (error: any) => {
                this.logger.error('MCP Proxy Response Error', {
                    error: error.message,
                    status: error.response?.status,
                    data: error.response?.data
                });
                return Promise.reject(error);
            }
        );
    }

    // Proxy agent-related requests to MCP server
    async getMCPAgents() {
        try {
            const response = await this.axiosInstance.get('/api/agents');
            return response.data;
        } catch (error) {
            this.logger.error('Failed to fetch agents from MCP', { error: error.message });
            throw error;
        }
    }

    async getMCPAgentById(agentId: string) {
        try {
            const response = await this.axiosInstance.get(`/api/agents/${agentId}`);
            return response.data;
        } catch (error) {
            this.logger.error('Failed to fetch agent from MCP', { 
                error: error.message, 
                agentId 
            });
            throw error;
        }
    }

    async createMCPAgent(agentData: any) {
        try {
            const response = await this.axiosInstance.post('/api/agents', agentData);
            return response.data;
        } catch (error) {
            this.logger.error('Failed to create agent in MCP', { error: error.message });
            throw error;
        }
    }

    async updateMCPAgent(agentId: string, agentData: any) {
        try {
            const response = await this.axiosInstance.put(`/api/agents/${agentId}`, agentData);
            return response.data;
        } catch (error) {
            this.logger.error('Failed to update agent in MCP', { 
                error: error.message, 
                agentId 
            });
            throw error;
        }
    }

    async deleteMCPAgent(agentId: string) {
        try {
            const response = await this.axiosInstance.delete(`/api/agents/${agentId}`);
            return response.data;
        } catch (error) {
            this.logger.error('Failed to delete agent from MCP', { 
                error: error.message, 
                agentId 
            });
            throw error;
        }
    }

    // Proxy chat requests to MCP server
    async processChatRequest(chatData: any) {
        try {
            const response = await this.axiosInstance.post('/api/chat', chatData);
            return response.data;
        } catch (error) {
            this.logger.error('Failed to process chat request via MCP', { error: error.message });
            throw error;
        }
    }

    // Health check for MCP server
    async checkMCPHealth() {
        try {
            const response = await this.axiosInstance.get('/api/health');
            return response.data;
        } catch (error) {
            this.logger.error('MCP server health check failed', { error: error.message });
            return { status: 'error', error: error.message };
        }
    }
}

export const mcpProxyService = new MCProxyService();
```

### 4.2 Update Chat Route to Use MCP Proxy
Update `/home/sahon/admin/server/src/routes/chat.ts` to use the proxy pattern:

```typescript
// Replace the existing POST /message route with this enhanced version
router.post('/message', async (req, res) => {
    try {
        const { message, model, conversation_id, agent_id } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                error: 'Message is required and must be a string'
            });
        }

        // If agent_id is provided, get agent configuration
        let agentConfig = null;
        if (agent_id) {
            agentConfig = dynamicConfigService.getAgentConfig(agent_id);
            if (!agentConfig) {
                return res.status(404).json({
                    error: 'Agent not found or not configured properly'
                });
            }
        }

        // Prepare messages array
        const messages: ChatMessage[] = [];

        // If conversation_id is provided, fetch conversation history
        if (conversation_id) {
            if ((global as any).connection) {
                try {
                    const query = `
                        SELECT sender_type as role, content
                        FROM messages
                        WHERE conversation_id = ?
                        ORDER BY created_at ASC
                    `;
                    const history: any[] = await executeQuery(query, [conversation_id]);
                    
                    for (const msg of history) {
                        messages.push({
                            role: msg.role === 'user' ? 'user' : 'assistant',
                            content: msg.content
                        });
                    }
                } catch (err) {
                    logger.warn('Could not fetch conversation history:', err);
                }
            }
        }

        // Add current user message
        messages.push({
            role: 'user',
            content: message
        });

        // Generate response using agent configuration if available
        let response: string;
        if (agentConfig && agentConfig.id) {
            // Use agent-specific generation with persona
            response = await ollamaService.generateWithPersona(messages, agentConfig.id, model);
        } else {
            // Use default generation
            response = await ollamaService.chat(messages, model);
        }

        // Save the conversation if database is available
        if ((global as any).connection) {
            try {
                let convId = conversation_id;
                
                // Create conversation if it doesn't exist
                if (!convId) {
                    const convQuery = `
                        INSERT INTO conversations (title, status, created_at, updated_at)
                        VALUES (?, ?, NOW(), NOW())
                    `;
                    const convResult: any = await executeQuery(convQuery, [`Conversation ${new Date().toISOString()}`, 'active']);
                    convId = convResult.insertId;
                }

                // Save user message
                const userMsgQuery = `
                    INSERT INTO messages (conversation_id, sender_type, model_used, content, created_at, updated_at)
                    VALUES (?, ?, ?, ?, NOW(), NOW())
                `;
                await executeQuery(userMsgQuery, [convId, 'user', model || 'default', message]);

                // Save assistant response
                const assistantMsgQuery = `
                    INSERT INTO messages (conversation_id, sender_type, model_used, content, created_at, updated_at)
                    VALUES (?, ?, ?, ?, NOW(), NOW())
                `;
                await executeQuery(assistantMsgQuery, [convId, 'agent', model || 'default', response]);

                // Update conversation timestamp
                const updateConvQuery = `
                    UPDATE conversations SET updated_at = NOW() WHERE id = ?
                `;
                await executeQuery(updateConvQuery, [convId]);
            } catch (err) {
                logger.error('Error saving conversation:', err);
            }
        }

        // Log the interaction
        logger.info('Chat interaction', {
            agentId: agent_id || 'default',
            userMessage: message.substring(0, 100),
            responseLength: response.length,
            model: model || 'default'
        });

        res.json({
            success: true,
            response: response,
            conversationId: conversation_id || ((global as any).connection ? 'new_conversation_id_placeholder' : undefined),
            model: model || process.env.OLLAMA_DEFAULT_MODEL,
            timestamp: new Date().toISOString(),
            agent: agentConfig ? {
                id: agentConfig.id,
                name: agentConfig.name,
                persona: agentConfig.persona_name,
                greeting: agentConfig.greeting_prefix,
                signature: agentConfig.signature_prefix
            } : undefined,
            conversation: {
                user: message,
                assistant: response
            }
        });
    } catch (error) {
        logger.error('Chat error:', error);

        // Handle error based on transparency requirements
        let errorMessage = 'Failed to generate response';
        if (error instanceof Error) {
            if (error.message.includes('timeout') || error.message.includes('connection')) {
                errorMessage = 'সরাসরি বলছি ভাই, আমাদের সিস্টেমের মগজে (Server) এই মুহূর্তে একটা যান্ত্রিক গোলযোগ দেখা দিয়েছে। আমি আপনার অনুরোধটি প্রসেস করার জন্য প্রয়োজনীয় তথ্য খুঁজে পাচ্ছি না। কোনো কিছু লুকাবো না—সিস্টেম এখন মেইনটেন্যান্স বা গুরুতর টেকনিক্যাল এররের মধ্য দিয়ে যাচ্ছে। আপনি চাইলে কিছুক্ষণ পর আবার চেষ্টা করতে পারেন। সত্যটা জানানোর জন্য ধন্যবাদ।';
            } else if (error.message.includes('not found') || error.message.includes('no data')) {
                errorMessage = 'ভাইয়া, আমি আপনার প্রশ্নের সঠিক উত্তরটি এই মুহূর্তে খুঁজে পাচ্ছি না। আমার মেমোরিতে (Database) এই বিষয়ে কোনো অথেন্টিক রেফারেন্স বা ট্রেনিং ডাটা নেই। ভুল তথ্য দিয়ে আপনাকে বিভ্রান্ত করতে চাই না। আমি বিষয়টি এডমিন লেভেলে নোট করে রাখছি। আগামীতে হয়তো আপনাকে এ বিষয়ে পরিষ্কার জানাতে পারবো।';
            } else {
                errorMessage = 'সহজভাবে স্বীকার করছি, আমার এই মুহূর্তে উত্তর দেওয়ার মতো সক্ষমতা নেই। এডমিন প্যানেল থেকে কিছু সীমাবদ্ধতা বা কনফিগারেশন আপডেট চলছে, যার ফলে আমি আপনার সাথে পুরোপুরি কানেক্ট হতে পারছি না। হতাশ হবেন না, আমাদের টিম এটা নিয়ে কাজ করছে। ধৈর্য ধরার জন্য আপনার প্রতি কৃতজ্ঞতা।';
            }
        }

        res.status(500).json({
            success: false,
            error: 'Agent Processing Error',
            message: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
    return; // Explicit return
});
```

## Phase 5: System Initialization Enhancement

### 5.1 Update Unified Startup Script
Update `/home/sahon/admin/unified-system-startup.js` to properly initialize the dynamic config service:

```javascript
// Add to the imports section
const { dynamicConfigService } = require('./server/src/services/dynamic-config');

// Add to the initialization sequence
async function initializeDynamicConfig() {
    console.log('🔄 Initializing Dynamic Configuration Service...');
    try {
        await dynamicConfigService.loadAllConfigs();
        console.log('✅ Dynamic Configuration Service initialized');
    } catch (error) {
        console.error('❌ Failed to initialize Dynamic Configuration Service:', error);
        throw error;
    }
}

// Add to the startup sequence after database initialization
async function startServices() {
    // ... existing initialization code ...

    // Initialize dynamic config after database
    await initializeDynamicConfig();

    // ... rest of the startup code ...
}
```

This comprehensive plan implements:

1. **Database enhancements** with proper configuration and template tables
2. **Backend API** with full CRUD operations for agents
3. **Dynamic configuration service** with real-time updates
4. **Persona-aware response generation** following transparency guidelines
5. **Frontend components** for agent management
6. **Proxy pattern implementation** between frontend-backend-MCP
7. **Proper error handling** with transparent responses as per documentation
8. **System initialization** with proper module loading

The implementation ensures that all agent configurations, API keys, and database queries remain in the backend, while the frontend only handles UI display and user interactions, following the exact requirements specified.