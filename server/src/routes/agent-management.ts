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
        return;
    } catch (error) {
        logger.error('Failed to fetch agents', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch agents',
            message: (error as Error).message
        });
        return;
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
        return;
    } catch (error) {
        logger.error('Failed to fetch agent details', { error: (error as Error).message, agentId: req.params.id });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch agent details',
            message: (error as Error).message
        });
        return;
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
        return;
    } catch (error) {
        logger.error('Failed to create agent', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Failed to create agent',
            message: (error as Error).message
        });
        return;
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
            if (allowedFields.includes(key as string)) {
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
        return;
    } catch (error) {
        logger.error('Failed to update agent', { error: (error as Error).message, agentId: req.params.id });
        res.status(500).json({
            success: false,
            error: 'Failed to update agent',
            message: (error as Error).message
        });
        return;
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
        return;
    } catch (error) {
        logger.error('Failed to delete agent', { error: (error as Error).message, agentId: req.params.id });
        res.status(500).json({
            success: false,
            error: 'Failed to delete agent',
            message: (error as Error).message
        });
        return;
    }
});

export default router;