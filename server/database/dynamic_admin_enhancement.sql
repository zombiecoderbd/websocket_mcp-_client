-- UAS Admin System - Dynamic Admin Database Enhancement
-- Version: 2.0
-- Date: January 31, 2026
-- Purpose: Add dynamic admin capabilities and enhanced configuration tables

USE uas_admin;

-- =====================================================
-- DYNAMIC ADMIN PAGES TABLE
-- Stores configuration for dynamic admin pages
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_pages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    page_key VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    route_path VARCHAR(255) NOT NULL UNIQUE,
    component_type ENUM('list', 'form', 'dashboard', 'custom') DEFAULT 'list',
    config_json JSON,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    icon_name VARCHAR(50),
    category VARCHAR(100),
    permissions_required JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_page_key (page_key),
    INDEX idx_route_path (route_path),
    INDEX idx_is_active (is_active),
    INDEX idx_sort_order (sort_order),
    INDEX idx_category (category)
);

-- =====================================================
-- ADMIN MENU ITEMS TABLE
-- Stores dynamic sidebar navigation configuration
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100),
    href VARCHAR(255) NOT NULL,
    icon_name VARCHAR(50),
    category VARCHAR(100),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_visible BOOLEAN DEFAULT TRUE,
    parent_id INT NULL,
    permissions_required JSON,
    ui_config JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES admin_menu_items(id) ON DELETE SET NULL,
    INDEX idx_href (href),
    INDEX idx_is_active (is_active),
    INDEX idx_is_visible (is_visible),
    INDEX idx_sort_order (sort_order),
    INDEX idx_category (category),
    INDEX idx_parent_id (parent_id)
);

-- =====================================================
-- DYNAMIC FORMS TABLE
-- Stores configuration for dynamic form generation
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_forms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    form_key VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_table VARCHAR(100),
    form_config JSON,
    validation_rules JSON,
    ui_config JSON,
    is_active BOOLEAN DEFAULT TRUE,
    permissions_required JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_form_key (form_key),
    INDEX idx_target_table (target_table),
    INDEX idx_is_active (is_active)
);

-- =====================================================
-- ADMIN SETTINGS TABLE
-- Stores system-wide admin configuration settings
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value LONGTEXT,
    display_name VARCHAR(255),
    description TEXT,
    setting_type ENUM('string', 'integer', 'boolean', 'json', 'array') DEFAULT 'string',
    category VARCHAR(100),
    is_editable BOOLEAN DEFAULT TRUE,
    ui_config JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_setting_key (setting_key),
    INDEX idx_category (category),
    INDEX idx_is_editable (is_editable)
);

-- =====================================================
-- USER PREFERENCES TABLE
-- Stores individual user preferences and settings
-- =====================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    preference_key VARCHAR(100) NOT NULL,
    preference_value LONGTEXT,
    setting_type ENUM('string', 'integer', 'boolean', 'json', 'array') DEFAULT 'string',
    category VARCHAR(100),
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_preference (user_id, preference_key),
    INDEX idx_user_id (user_id),
    INDEX idx_preference_key (preference_key),
    INDEX idx_category (category)
);

-- =====================================================
-- ENHANCED AUDIT LOGS TABLE
-- Enhanced audit trail for admin actions
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(100),
    action_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(100),
    action_details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(100),
    is_successful BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    execution_time_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_action_type (action_type),
    INDEX idx_resource_type (resource_type),
    INDEX idx_created_at (created_at),
    INDEX idx_is_successful (is_successful)
);

-- =====================================================
-- SERVICE MONITORING TABLE
-- Track service health and status
-- =====================================================
CREATE TABLE IF NOT EXISTS service_monitoring (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    service_type ENUM('frontend', 'backend', 'database', 'external_api', 'websocket', 'mcp') NOT NULL,
    status ENUM('online', 'offline', 'degraded', 'maintenance') DEFAULT 'offline',
    health_check_url VARCHAR(255),
    last_check_timestamp TIMESTAMP NULL,
    response_time_ms INT,
    error_message TEXT,
    version VARCHAR(50),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_service_name (service_name),
    INDEX idx_service_type (service_type),
    INDEX idx_status (status),
    INDEX idx_last_check (last_check_timestamp)
);

-- =====================================================
-- DASHBOARD WIDGETS TABLE
-- Store configuration for dashboard widgets
-- =====================================================
CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    widget_key VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    widget_type ENUM('chart', 'table', 'metric', 'list', 'custom') NOT NULL,
    data_source VARCHAR(255),
    config_json JSON,
    refresh_interval_seconds INT DEFAULT 300,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    permissions_required JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_widget_key (widget_key),
    INDEX idx_widget_type (widget_type),
    INDEX idx_is_active (is_active),
    INDEX idx_sort_order (sort_order)
);

-- =====================================================
-- INSERT DEFAULT ADMIN MENU ITEMS
-- =====================================================
INSERT INTO admin_menu_items (name, display_name, href, icon_name, category, sort_order, is_active, is_visible) VALUES
('Dashboard', 'Dashboard', '/', 'LayoutDashboard', 'main', 1, TRUE, TRUE),
('Models', 'AI Models', '/models', 'Server', 'main', 2, TRUE, TRUE),
('Ollama Models', 'Ollama Models', '/ollama-models', 'Server', 'main', 3, TRUE, TRUE),
('Agents', 'AI Agents', '/agents', 'Bot', 'main', 4, TRUE, TRUE),
('Servers', 'Server Management', '/servers', 'Server', 'main', 5, TRUE, TRUE),
('Memory', 'Agent Memory', '/memory', 'Database', 'main', 6, TRUE, TRUE),
('Load Balancer', 'Load Balancer', '/loadbalancer', 'Scale', 'main', 7, TRUE, TRUE),
('Prompt Templates', 'Prompt Templates', '/prompt-templates', 'FileCode', 'main', 8, TRUE, TRUE),
('CLI Agent', 'CLI Agent', '/cli-agent', 'Terminal', 'tools', 9, TRUE, TRUE),
('Editor Integration', 'Editor Integration', '/editor-integration', 'Code2', 'tools', 10, TRUE, TRUE),
('Audio Test', 'Audio Test', '/audio-test', 'Mic', 'tools', 11, TRUE, TRUE),
('Mobile Editor', 'Mobile Editor', '/mobile-editor', 'Smartphone', 'tools', 12, TRUE, TRUE),
('Terminal Commands', 'Terminal Commands', '/terminal-commands', 'BookOpen', 'tools', 13, TRUE, TRUE),
('Cloud Providers', 'Cloud Providers', '/providers', 'Cloud', 'infrastructure', 14, TRUE, TRUE),
('AI Chat', 'AI Chat', '/chat', 'MessageSquare', 'communication', 15, TRUE, TRUE),
('Project Ideas', 'Project Ideas', '/project-ideas', 'Lightbulb', 'planning', 16, TRUE, TRUE),
('Settings', 'System Settings', '/settings', 'Settings', 'system', 17, TRUE, TRUE)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- INSERT DEFAULT ADMIN SETTINGS
-- =====================================================
INSERT INTO admin_settings (setting_key, setting_value, display_name, description, setting_type, category, is_editable, ui_config) VALUES
('system_name', 'UAS Admin Panel', 'System Name', 'Name of the admin system', 'string', 'general', TRUE, '{"inputType": "text"}'),
('theme', 'dark', 'Theme', 'Admin panel theme', 'string', 'appearance', TRUE, '{"inputType": "select", "options": ["light", "dark", "system"]}'),
('language', 'en', 'Language', 'Default language for admin panel', 'string', 'general', TRUE, '{"inputType": "select", "options": ["en", "bn"]}'),
('items_per_page', '20', 'Items Per Page', 'Number of items to display per page', 'integer', 'display', TRUE, '{"inputType": "number", "min": 5, "max": 100}'),
('auto_refresh_enabled', 'true', 'Auto Refresh', 'Enable automatic data refresh', 'boolean', 'performance', TRUE, '{"inputType": "checkbox"}'),
('refresh_interval', '30', 'Refresh Interval', 'Auto refresh interval in seconds', 'integer', 'performance', TRUE, '{"inputType": "number", "min": 5, "max": 300}'),
('audit_logging_enabled', 'true', 'Audit Logging', 'Enable audit trail logging', 'boolean', 'security', TRUE, '{"inputType": "checkbox"}'),
('max_audit_days', '90', 'Audit Log Retention', 'Days to keep audit logs', 'integer', 'security', TRUE, '{"inputType": "number", "min": 7, "max": 365}'),
('maintenance_mode', 'false', 'Maintenance Mode', 'Enable maintenance mode', 'boolean', 'system', FALSE, '{"inputType": "checkbox", "readonly": true}'),
('allowed_ips', '[]', 'Allowed IP Addresses', 'IP addresses allowed to access admin', 'array', 'security', TRUE, '{"inputType": "textarea"}')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- INSERT DEFAULT DASHBOARD WIDGETS
-- =====================================================
INSERT INTO dashboard_widgets (widget_key, title, description, widget_type, data_source, config_json, sort_order, is_active) VALUES
('system_health', 'System Health', 'Overall system status and health metrics', 'metric', 'system/health', '{"metrics": ["cpu", "memory", "disk"]}', 1, TRUE),
('active_models', 'Active AI Models', 'Currently running AI models', 'table', 'models/active', '{"columns": ["name", "status", "requests"]}', 2, TRUE),
('recent_activity', 'Recent Activity', 'Latest admin panel activities', 'list', 'audit/recent', '{"limit": 10}', 3, TRUE),
('service_status', 'Service Status', 'Status of all system services', 'chart', 'services/status', '{"chartType": "status"}', 4, TRUE),
('agent_performance', 'Agent Performance', 'Performance metrics for AI agents', 'chart', 'agents/performance', '{"chartType": "line", "metrics": ["response_time", "requests"]}', 5, TRUE)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_admin_pages_active_category ON admin_pages(is_active, category);
CREATE INDEX idx_menu_items_active_visible ON admin_menu_items(is_active, is_visible);
CREATE INDEX idx_audit_logs_user_action ON admin_audit_logs(user_id, action_type, created_at);
CREATE INDEX idx_service_monitoring_status_check ON service_monitoring(status, last_check_timestamp);
CREATE INDEX idx_dashboard_widgets_active_order ON dashboard_widgets(is_active, sort_order);

-- =====================================================
-- ADD TRIGGERS FOR AUDIT LOGGING
-- =====================================================
DELIMITER //

CREATE TRIGGER admin_pages_audit_insert 
AFTER INSERT ON admin_pages 
FOR EACH ROW 
BEGIN
    INSERT INTO admin_audit_logs (action_type, resource_type, resource_id, action_details) 
    VALUES ('CREATE', 'admin_page', NEW.id, JSON_OBJECT('title', NEW.title, 'route', NEW.route_path));
END//

CREATE TRIGGER admin_pages_audit_update 
AFTER UPDATE ON admin_pages 
FOR EACH ROW 
BEGIN
    INSERT INTO admin_audit_logs (action_type, resource_type, resource_id, action_details) 
    VALUES ('UPDATE', 'admin_page', NEW.id, JSON_OBJECT('title', NEW.title, 'route', NEW.route_path));
END//

CREATE TRIGGER admin_pages_audit_delete 
AFTER DELETE ON admin_pages 
FOR EACH ROW 
BEGIN
    INSERT INTO admin_audit_logs (action_type, resource_type, resource_id, action_details) 
    VALUES ('DELETE', 'admin_page', OLD.id, JSON_OBJECT('title', OLD.title, 'route', OLD.route_path));
END//

DELIMITER ;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
SELECT 'Database enhancement completed successfully!' as status;
SELECT COUNT(*) as admin_pages_count FROM admin_pages;
SELECT COUNT(*) as menu_items_count FROM admin_menu_items;
SELECT COUNT(*) as admin_settings_count FROM admin_settings;
SELECT COUNT(*) as dashboard_widgets_count FROM dashboard_widgets;