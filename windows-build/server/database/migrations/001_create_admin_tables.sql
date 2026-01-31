-- Migration 001: Create Admin Dynamic Configuration Tables
-- Date: 2026-01-31
-- Purpose: Add tables for dynamic admin panel configuration and management

USE uas_admin;

-- =====================================================
-- ADMIN CONFIGURATIONS TABLE
-- Stores dynamic configuration for admin panel behavior
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value JSON NOT NULL,
    config_type ENUM('string', 'number', 'boolean', 'array', 'object') DEFAULT 'string',
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_config_key (config_key),
    INDEX idx_category (category),
    INDEX idx_is_active (is_active)
);

-- =====================================================
-- DYNAMIC FORMS TABLE
-- Stores form configurations for admin pages
-- =====================================================
CREATE TABLE IF NOT EXISTS dynamic_forms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    form_key VARCHAR(100) NOT NULL UNIQUE,
    form_name VARCHAR(100) NOT NULL,
    form_description TEXT,
    form_schema JSON NOT NULL,
    form_ui_schema JSON,
    target_table VARCHAR(100),
    target_operation ENUM('create', 'update', 'view', 'delete') DEFAULT 'view',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_form_key (form_key),
    INDEX idx_target_table (target_table),
    INDEX idx_is_active (is_active)
);

-- =====================================================
-- ADMIN AUDIT LOGS TABLE
-- Track all admin actions for security and monitoring
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(100),
    user_name VARCHAR(100),
    action_type ENUM('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'CONFIGURE', 'LOGIN', 'LOGOUT') NOT NULL,
    target_resource VARCHAR(100) NOT NULL,
    target_id VARCHAR(100),
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_action_type (action_type),
    INDEX idx_target_resource (target_resource),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- USER PREFERENCES TABLE
-- Store individual admin user preferences
-- =====================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    preference_key VARCHAR(100) NOT NULL,
    preference_value JSON NOT NULL,
    preference_type ENUM('string', 'number', 'boolean', 'array', 'object') DEFAULT 'string',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_preference (user_id, preference_key),
    INDEX idx_user_id (user_id),
    INDEX idx_preference_key (preference_key)
);

-- =====================================================
-- ADMIN DASHBOARDS TABLE
-- Store custom dashboard configurations
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_dashboards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dashboard_name VARCHAR(100) NOT NULL,
    dashboard_key VARCHAR(100) NOT NULL UNIQUE,
    layout_config JSON NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_dashboard_key (dashboard_key),
    INDEX idx_is_default (is_default),
    INDEX idx_is_active (is_active)
);

-- =====================================================
-- ADMIN PERMISSIONS TABLE
-- Store role-based permissions for admin features
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action ENUM('read', 'write', 'delete', 'configure') NOT NULL,
    is_allowed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_permission (role_name, resource, action),
    INDEX idx_role_name (role_name),
    INDEX idx_resource (resource)
);

-- Insert default admin configurations
INSERT INTO admin_configs (config_key, config_value, config_type, description, category) VALUES
('admin.theme', '"dark"', 'string', 'Default admin panel theme', 'appearance'),
('admin.language', '"en"', 'string', 'Default admin panel language', 'appearance'),
('admin.refresh_interval', '30000', 'number', 'Data refresh interval in milliseconds', 'performance'),
('admin.items_per_page', '12', 'number', 'Number of items to display per page', 'display'),
('admin.enable_audit_logging', 'true', 'boolean', 'Enable audit logging for admin actions', 'security'),
('admin.session_timeout', '3600000', 'number', 'Session timeout in milliseconds', 'security'),
('admin.enable_notifications', 'true', 'boolean', 'Enable system notifications', 'features'),
('admin.enable_export', 'true', 'boolean', 'Enable data export functionality', 'features');

-- Insert default permissions
INSERT INTO admin_permissions (role_name, resource, action, is_allowed) VALUES
('admin', 'agents', 'read', TRUE),
('admin', 'agents', 'write', TRUE),
('admin', 'agents', 'delete', TRUE),
('admin', 'models', 'read', TRUE),
('admin', 'models', 'write', TRUE),
('admin', 'models', 'delete', TRUE),
('admin', 'providers', 'read', TRUE),
('admin', 'providers', 'write', TRUE),
('admin', 'providers', 'delete', TRUE),
('admin', 'servers', 'read', TRUE),
('admin', 'servers', 'write', TRUE),
('admin', 'servers', 'delete', TRUE),
('admin', 'settings', 'read', TRUE),
('admin', 'settings', 'write', TRUE),
('admin', 'settings', 'delete', TRUE),
('admin', 'configurations', 'read', TRUE),
('admin', 'configurations', 'write', TRUE),
('admin', 'audit_logs', 'read', TRUE);

-- Insert default dashboard configuration
INSERT INTO admin_dashboards (dashboard_name, dashboard_key, layout_config, is_default, created_by) VALUES
('Default Admin Dashboard', 'default_dashboard', '{
    "layout": [
        {"i": "system_stats", "x": 0, "y": 0, "w": 6, "h": 3},
        {"i": "recent_activity", "x": 6, "y": 0, "w": 6, "h": 3},
        {"i": "quick_actions", "x": 0, "y": 3, "w": 4, "h": 4},
        {"i": "agent_status", "x": 4, "y": 3, "w": 4, "h": 4},
        {"i": "model_performance", "x": 8, "y": 3, "w": 4, "h": 4}
    ],
    "widgets": {
        "system_stats": {"type": "system_stats", "title": "System Statistics"},
        "recent_activity": {"type": "recent_activity", "title": "Recent Activity"},
        "quick_actions": {"type": "quick_actions", "title": "Quick Actions"},
        "agent_status": {"type": "agent_status", "title": "Agent Status"},
        "model_performance": {"type": "model_performance", "title": "Model Performance"}
    }
}', TRUE, 'system');

-- Update existing tables with additional columns for dynamic behavior
ALTER TABLE ai_providers 
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(150) AFTER name,
    ADD COLUMN IF NOT EXISTS ui_config JSON AFTER config_json,
    ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0 AFTER is_active;

ALTER TABLE servers 
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(150) AFTER name,
    ADD COLUMN IF NOT EXISTS ui_config JSON AFTER metadata,
    ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0 AFTER provider_id;

ALTER TABLE ai_models 
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(150) AFTER model_name,
    ADD COLUMN IF NOT EXISTS ui_config JSON AFTER metadata,
    ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0 AFTER status;

ALTER TABLE agents 
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(150) AFTER name,
    ADD COLUMN IF NOT EXISTS ui_config JSON AFTER config,
    ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0 AFTER status;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_providers_sort ON ai_providers(sort_order, is_active);
CREATE INDEX IF NOT EXISTS idx_servers_sort ON servers(sort_order, status);
CREATE INDEX IF NOT EXISTS idx_models_sort ON ai_models(sort_order, status);
CREATE INDEX IF NOT EXISTS idx_agents_sort ON agents(sort_order, status);