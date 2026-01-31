-- UAS Admin System - Add Missing Dynamic Columns
-- Version: 2.3
-- Date: January 31, 2026
-- Purpose: Add missing dynamic columns to tables that don't have them all

USE uas_admin;

-- =====================================================
-- ADD MISSING COLUMNS TO PROMPT_TEMPLATES
-- =====================================================
ALTER TABLE prompt_templates ADD COLUMN display_name VARCHAR(150) AFTER name;
ALTER TABLE prompt_templates ADD COLUMN sort_order INT DEFAULT 0 AFTER is_active;
ALTER TABLE prompt_templates ADD COLUMN is_visible BOOLEAN DEFAULT TRUE AFTER sort_order;
ALTER TABLE prompt_templates ADD COLUMN category VARCHAR(100) AFTER is_visible;
ALTER TABLE prompt_templates ADD COLUMN tags JSON AFTER category;
ALTER TABLE prompt_templates ADD COLUMN ui_config JSON AFTER tags;

-- =====================================================
-- ADD MISSING COLUMNS TO EDITOR_INTEGRATIONS
-- =====================================================
ALTER TABLE editor_integrations ADD COLUMN display_name VARCHAR(150) AFTER name;
ALTER TABLE editor_integrations ADD COLUMN sort_order INT DEFAULT 0 AFTER is_connected;
ALTER TABLE editor_integrations ADD COLUMN is_visible BOOLEAN DEFAULT TRUE AFTER sort_order;
ALTER TABLE editor_integrations ADD COLUMN category VARCHAR(100) AFTER is_visible;
ALTER TABLE editor_integrations ADD COLUMN tags JSON AFTER category;
ALTER TABLE editor_integrations ADD COLUMN ui_config JSON AFTER tags;

-- =====================================================
-- ADD MISSING COLUMNS TO SERVERS (if needed)
-- =====================================================
ALTER TABLE servers ADD COLUMN is_visible BOOLEAN DEFAULT TRUE AFTER sort_order;
ALTER TABLE servers ADD COLUMN category VARCHAR(100) AFTER is_visible;
ALTER TABLE servers ADD COLUMN tags JSON AFTER category;

-- =====================================================
-- ADD MISSING COLUMNS TO AI_MODELS (if needed)
-- =====================================================
ALTER TABLE ai_models ADD COLUMN is_visible BOOLEAN DEFAULT TRUE AFTER sort_order;
ALTER TABLE ai_models ADD COLUMN category VARCHAR(100) AFTER is_visible;
ALTER TABLE ai_models ADD COLUMN tags JSON AFTER category;

-- =====================================================
-- ADD MISSING COLUMNS TO AGENTS (if needed)
-- =====================================================
ALTER TABLE agents ADD COLUMN is_visible BOOLEAN DEFAULT TRUE AFTER sort_order;
ALTER TABLE agents ADD COLUMN category VARCHAR(100) AFTER is_visible;
ALTER TABLE agents ADD COLUMN tags JSON AFTER category;

-- =====================================================
-- ADD MISSING COLUMNS TO AI_PROVIDERS (if needed)
-- =====================================================
ALTER TABLE ai_providers ADD COLUMN is_visible BOOLEAN DEFAULT TRUE AFTER sort_order;
ALTER TABLE ai_providers ADD COLUMN category VARCHAR(100) AFTER is_visible;
ALTER TABLE ai_providers ADD COLUMN tags JSON AFTER category;

-- =====================================================
-- POPULATE ALL DATA
-- =====================================================
-- Update display names
UPDATE ai_providers SET display_name = name WHERE display_name IS NULL OR display_name = '';
UPDATE servers SET display_name = name WHERE display_name IS NULL OR display_name = '';
UPDATE ai_models SET display_name = model_name WHERE display_name IS NULL OR display_name = '';
UPDATE agents SET display_name = name WHERE display_name IS NULL OR display_name = '';
UPDATE prompt_templates SET display_name = name WHERE display_name IS NULL OR display_name = '';
UPDATE editor_integrations SET display_name = name WHERE display_name IS NULL OR display_name = '';

-- Set default sort orders
UPDATE ai_providers SET sort_order = id WHERE sort_order = 0;
UPDATE servers SET sort_order = id WHERE sort_order = 0;
UPDATE ai_models SET sort_order = id WHERE sort_order = 0;
UPDATE agents SET sort_order = id WHERE sort_order = 0;
UPDATE prompt_templates SET sort_order = id WHERE sort_order = 0;
UPDATE editor_integrations SET sort_order = id WHERE sort_order = 0;

-- Set default visibility
UPDATE ai_providers SET is_visible = TRUE WHERE is_visible IS NULL;
UPDATE servers SET is_visible = TRUE WHERE is_visible IS NULL;
UPDATE ai_models SET is_visible = TRUE WHERE is_visible IS NULL;
UPDATE agents SET is_visible = TRUE WHERE is_visible IS NULL;
UPDATE prompt_templates SET is_visible = TRUE WHERE is_visible IS NULL;
UPDATE editor_integrations SET is_visible = TRUE WHERE is_visible IS NULL;

-- Set default categories
UPDATE ai_providers SET category = 'AI Provider' WHERE category IS NULL OR category = '';
UPDATE servers SET category = 'Infrastructure' WHERE category IS NULL OR category = '';
UPDATE ai_models SET category = 'AI Model' WHERE category IS NULL OR category = '';
UPDATE agents SET category = 'AI Agent' WHERE category IS NULL OR category = '';
UPDATE prompt_templates SET category = 'Content' WHERE category IS NULL OR category = '';
UPDATE editor_integrations SET category = 'Development Tools' WHERE category IS NULL OR category = '';

-- Set default UI configurations
UPDATE ai_providers SET ui_config = JSON_OBJECT('color', '#3b82f6', 'icon', 'Server', 'showInDashboard', true) WHERE ui_config IS NULL OR JSON_LENGTH(ui_config) = 0;
UPDATE servers SET ui_config = JSON_OBJECT('color', '#10b981', 'icon', 'HardDrive', 'showInDashboard', true) WHERE ui_config IS NULL OR JSON_LENGTH(ui_config) = 0;
UPDATE ai_models SET ui_config = JSON_OBJECT('color', '#8b5cf6', 'icon', 'Brain', 'showInDashboard', true) WHERE ui_config IS NULL OR JSON_LENGTH(ui_config) = 0;
UPDATE agents SET ui_config = JSON_OBJECT('color', '#f59e0b', 'icon', 'Bot', 'showInDashboard', true) WHERE ui_config IS NULL OR JSON_LENGTH(ui_config) = 0;
UPDATE prompt_templates SET ui_config = JSON_OBJECT('color', '#ef4444', 'icon', 'FileText', 'showInDashboard', false) WHERE ui_config IS NULL OR JSON_LENGTH(ui_config) = 0;
UPDATE editor_integrations SET ui_config = JSON_OBJECT('color', '#06b6d4', 'icon', 'Code', 'showInDashboard', true) WHERE ui_config IS NULL OR JSON_LENGTH(ui_config) = 0;

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 'Missing columns added and data populated successfully!' as status;

SELECT 
    TABLE_NAME,
    COUNT(*) as column_count
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'uas_admin' 
    AND TABLE_NAME IN ('ai_providers', 'servers', 'ai_models', 'agents', 'prompt_templates', 'editor_integrations')
    AND COLUMN_NAME IN ('display_name', 'sort_order', 'is_visible', 'category', 'tags', 'ui_config')
GROUP BY TABLE_NAME
ORDER BY TABLE_NAME;