-- UAS Admin System - Dynamic Column Enhancement
-- Version: 2.1
-- Date: January 31, 2026
-- Purpose: Add dynamic UI configuration columns to existing tables

USE uas_admin;

-- =====================================================
-- ADD DYNAMIC COLUMNS TO AI_PROVIDERS TABLE
-- =====================================================
ALTER TABLE ai_providers 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(150) AFTER name,
ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0 AFTER is_active,
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE AFTER sort_order,
ADD COLUMN IF NOT EXISTS category VARCHAR(100) AFTER is_visible,
ADD COLUMN IF NOT EXISTS tags JSON AFTER category,
ADD COLUMN IF NOT EXISTS ui_config JSON AFTER tags;

-- =====================================================
-- ADD DYNAMIC COLUMNS TO SERVERS TABLE
-- =====================================================
ALTER TABLE servers 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(150) AFTER name,
ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0 AFTER status,
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE AFTER sort_order,
ADD COLUMN IF NOT EXISTS category VARCHAR(100) AFTER is_visible,
ADD COLUMN IF NOT EXISTS tags JSON AFTER category,
ADD COLUMN IF NOT EXISTS ui_config JSON AFTER tags;

-- =====================================================
-- ADD DYNAMIC COLUMNS TO AI_MODELS TABLE
-- =====================================================
ALTER TABLE ai_models 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(150) AFTER model_name,
ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0 AFTER status,
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE AFTER sort_order,
ADD COLUMN IF NOT EXISTS category VARCHAR(100) AFTER is_visible,
ADD COLUMN IF NOT EXISTS tags JSON AFTER category,
ADD COLUMN IF NOT EXISTS ui_config JSON AFTER tags;

-- =====================================================
-- ADD DYNAMIC COLUMNS TO AGENTS TABLE
-- =====================================================
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(150) AFTER name,
ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0 AFTER status,
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE AFTER sort_order,
ADD COLUMN IF NOT EXISTS category VARCHAR(100) AFTER is_visible,
ADD COLUMN IF NOT EXISTS tags JSON AFTER category,
ADD COLUMN IF NOT EXISTS ui_config JSON AFTER tags;

-- =====================================================
-- ADD DYNAMIC COLUMNS TO PROMPT_TEMPLATES TABLE
-- =====================================================
ALTER TABLE prompt_templates 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(150) AFTER name,
ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0 AFTER is_active,
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE AFTER sort_order,
ADD COLUMN IF NOT EXISTS category VARCHAR(100) AFTER is_visible,
ADD COLUMN IF NOT EXISTS tags JSON AFTER category,
ADD COLUMN IF NOT EXISTS ui_config JSON AFTER tags;

-- =====================================================
-- ADD DYNAMIC COLUMNS TO EDITOR_INTEGRATIONS TABLE
-- =====================================================
ALTER TABLE editor_integrations 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(150) AFTER name,
ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0 AFTER is_connected,
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE AFTER sort_order,
ADD COLUMN IF NOT EXISTS category VARCHAR(100) AFTER is_visible,
ADD COLUMN IF NOT EXISTS tags JSON AFTER category,
ADD COLUMN IF NOT EXISTS ui_config JSON AFTER tags;

-- =====================================================
-- CREATE INDEXES FOR NEW DYNAMIC COLUMNS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_ai_providers_display ON ai_providers(display_name);
CREATE INDEX IF NOT EXISTS idx_ai_providers_sort ON ai_providers(sort_order);
CREATE INDEX IF NOT EXISTS idx_ai_providers_visible ON ai_providers(is_visible);
CREATE INDEX IF NOT EXISTS idx_ai_providers_category ON ai_providers(category);

CREATE INDEX IF NOT EXISTS idx_servers_display ON servers(display_name);
CREATE INDEX IF NOT EXISTS idx_servers_sort ON servers(sort_order);
CREATE INDEX IF NOT EXISTS idx_servers_visible ON servers(is_visible);
CREATE INDEX IF NOT EXISTS idx_servers_category ON servers(category);

CREATE INDEX IF NOT EXISTS idx_ai_models_display ON ai_models(display_name);
CREATE INDEX IF NOT EXISTS idx_ai_models_sort ON ai_models(sort_order);
CREATE INDEX IF NOT EXISTS idx_ai_models_visible ON ai_models(is_visible);
CREATE INDEX IF NOT EXISTS idx_ai_models_category ON ai_models(category);

CREATE INDEX IF NOT EXISTS idx_agents_display ON agents(display_name);
CREATE INDEX IF NOT EXISTS idx_agents_sort ON agents(sort_order);
CREATE INDEX IF NOT EXISTS idx_agents_visible ON agents(is_visible);
CREATE INDEX IF NOT EXISTS idx_agents_category ON agents(category);

CREATE INDEX IF NOT EXISTS idx_prompt_templates_display ON prompt_templates(display_name);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_sort ON prompt_templates(sort_order);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_visible ON prompt_templates(is_visible);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON prompt_templates(category);

CREATE INDEX IF NOT EXISTS idx_editor_integrations_display ON editor_integrations(display_name);
CREATE INDEX IF NOT EXISTS idx_editor_integrations_sort ON editor_integrations(sort_order);
CREATE INDEX IF NOT EXISTS idx_editor_integrations_visible ON editor_integrations(is_visible);
CREATE INDEX IF NOT EXISTS idx_editor_integrations_category ON editor_integrations(category);

-- =====================================================
-- UPDATE EXISTING RECORDS WITH DEFAULT DISPLAY NAMES
-- =====================================================
UPDATE ai_providers SET display_name = name WHERE display_name IS NULL OR display_name = '';
UPDATE servers SET display_name = name WHERE display_name IS NULL OR display_name = '';
UPDATE ai_models SET display_name = model_name WHERE display_name IS NULL OR display_name = '';
UPDATE agents SET display_name = name WHERE display_name IS NULL OR display_name = '';
UPDATE prompt_templates SET display_name = name WHERE display_name IS NULL OR display_name = '';
UPDATE editor_integrations SET display_name = name WHERE display_name IS NULL OR display_name = '';

-- =====================================================
-- ADD DEFAULT UI CONFIGURATIONS
-- =====================================================
UPDATE ai_providers SET ui_config = JSON_OBJECT(
    'color', '#3b82f6',
    'icon', 'Server',
    'showInDashboard', true,
    'dashboardPriority', 1
) WHERE ui_config IS NULL;

UPDATE servers SET ui_config = JSON_OBJECT(
    'color', '#10b981',
    'icon', 'HardDrive',
    'showInDashboard', true,
    'dashboardPriority', 2
) WHERE ui_config IS NULL;

UPDATE ai_models SET ui_config = JSON_OBJECT(
    'color', '#8b5cf6',
    'icon', 'Brain',
    'showInDashboard', true,
    'dashboardPriority', 3
) WHERE ui_config IS NULL;

UPDATE agents SET ui_config = JSON_OBJECT(
    'color', '#f59e0b',
    'icon', 'Bot',
    'showInDashboard', true,
    'dashboardPriority', 4
) WHERE ui_config IS NULL;

UPDATE prompt_templates SET ui_config = JSON_OBJECT(
    'color', '#ef4444',
    'icon', 'FileText',
    'showInDashboard', false,
    'dashboardPriority', 5
) WHERE ui_config IS NULL;

UPDATE editor_integrations SET ui_config = JSON_OBJECT(
    'color', '#06b6d4',
    'icon', 'Code',
    'showInDashboard', true,
    'dashboardPriority', 6
) WHERE ui_config IS NULL;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
SELECT 'Dynamic column enhancement completed successfully!' as status;

SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'uas_admin' 
    AND TABLE_NAME IN ('ai_providers', 'servers', 'ai_models', 'agents', 'prompt_templates', 'editor_integrations')
    AND COLUMN_NAME IN ('display_name', 'sort_order', 'is_visible', 'category', 'tags', 'ui_config')
ORDER BY TABLE_NAME, COLUMN_NAME;

-- Show sample data with new columns
SELECT 
    id,
    name,
    display_name,
    sort_order,
    is_visible,
    category
FROM ai_providers 
LIMIT 3;

SELECT 
    id,
    name,
    display_name,
    sort_order,
    is_visible,
    category
FROM servers 
LIMIT 3;