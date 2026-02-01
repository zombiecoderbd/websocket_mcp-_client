-- UAS Admin System - Populate Dynamic Column Data
-- Version: 2.2
-- Date: January 31, 2026
-- Purpose: Populate existing dynamic columns with default data

USE uas_admin;

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
) WHERE ui_config IS NULL OR JSON_LENGTH(ui_config) = 0;

UPDATE servers SET ui_config = JSON_OBJECT(
    'color', '#10b981',
    'icon', 'HardDrive',
    'showInDashboard', true,
    'dashboardPriority', 2
) WHERE ui_config IS NULL OR JSON_LENGTH(ui_config) = 0;

UPDATE ai_models SET ui_config = JSON_OBJECT(
    'color', '#8b5cf6',
    'icon', 'Brain',
    'showInDashboard', true,
    'dashboardPriority', 3
) WHERE ui_config IS NULL OR JSON_LENGTH(ui_config) = 0;

UPDATE agents SET ui_config = JSON_OBJECT(
    'color', '#f59e0b',
    'icon', 'Bot',
    'showInDashboard', true,
    'dashboardPriority', 4
) WHERE ui_config IS NULL OR JSON_LENGTH(ui_config) = 0;

UPDATE prompt_templates SET ui_config = JSON_OBJECT(
    'color', '#ef4444',
    'icon', 'FileText',
    'showInDashboard', false,
    'dashboardPriority', 5
) WHERE ui_config IS NULL OR JSON_LENGTH(ui_config) = 0;

UPDATE editor_integrations SET ui_config = JSON_OBJECT(
    'color', '#06b6d4',
    'icon', 'Code',
    'showInDashboard', true,
    'dashboardPriority', 6
) WHERE ui_config IS NULL OR JSON_LENGTH(ui_config) = 0;

-- =====================================================
-- SET DEFAULT SORT ORDERS
-- =====================================================
UPDATE ai_providers SET sort_order = id WHERE sort_order = 0;
UPDATE servers SET sort_order = id WHERE sort_order = 0;
UPDATE ai_models SET sort_order = id WHERE sort_order = 0;
UPDATE agents SET sort_order = id WHERE sort_order = 0;
UPDATE prompt_templates SET sort_order = id WHERE sort_order = 0;
UPDATE editor_integrations SET sort_order = id WHERE sort_order = 0;

-- =====================================================
-- SET DEFAULT CATEGORIES
-- =====================================================
UPDATE ai_providers SET category = 'AI Provider' WHERE category IS NULL OR category = '';
UPDATE servers SET category = 'Infrastructure' WHERE category IS NULL OR category = '';
UPDATE ai_models SET category = 'AI Model' WHERE category IS NULL OR category = '';
UPDATE agents SET category = 'AI Agent' WHERE category IS NULL OR category = '';
UPDATE prompt_templates SET category = 'Content' WHERE category IS NULL OR category = '';
UPDATE editor_integrations SET category = 'Development Tools' WHERE category IS NULL OR category = '';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
SELECT 'Dynamic column data population completed successfully!' as status;

-- Show sample data with new columns
SELECT 
    'AI Providers' as table_name,
    COUNT(*) as total_records,
    COUNT(display_name) as records_with_display_name,
    COUNT(ui_config) as records_with_ui_config
FROM ai_providers
UNION ALL
SELECT 
    'Servers' as table_name,
    COUNT(*) as total_records,
    COUNT(display_name) as records_with_display_name,
    COUNT(ui_config) as records_with_ui_config
FROM servers
UNION ALL
SELECT 
    'AI Models' as table_name,
    COUNT(*) as total_records,
    COUNT(display_name) as records_with_display_name,
    COUNT(ui_config) as records_with_ui_config
FROM ai_models;

-- Sample data view
SELECT 
    id,
    name,
    display_name,
    sort_order,
    is_visible,
    category,
    JSON_EXTRACT(ui_config, '$.color') as color,
    JSON_EXTRACT(ui_config, '$.icon') as icon
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