-- Cloud Provider Integration Schema Updates
-- Version: 1.1
-- Last Updated: 2026-01-30

USE uas_admin;

-- =====================================================
-- PROVIDER CONFIGURATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS provider_configurations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id INT NOT NULL,
    config_key VARCHAR(100) NOT NULL,
    config_value TEXT,
    config_type ENUM('string', 'integer', 'boolean', 'json', 'encrypted') DEFAULT 'string',
    is_required BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES ai_providers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_provider_config (provider_id, config_key),
    INDEX idx_provider_id (provider_id),
    INDEX idx_config_key (config_key)
);

-- =====================================================
-- PROVIDER MODEL MAPPINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS provider_model_mappings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id INT NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    model_alias VARCHAR(100),
    model_version VARCHAR(50),
    model_type ENUM('text', 'vision', 'embedding', 'audio', 'multimodal') DEFAULT 'text',
    is_available BOOLEAN DEFAULT TRUE,
    quota_limits JSON,
    rate_limits JSON,
    pricing_info JSON,
    metadata JSON,
    last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES ai_providers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_provider_model (provider_id, model_name),
    INDEX idx_provider_id (provider_id),
    INDEX idx_model_name (model_name),
    INDEX idx_is_available (is_available),
    INDEX idx_model_type (model_type)
);

-- =====================================================
-- MODEL PERFORMANCE METRICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS model_performance_metrics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    model_id INT,
    provider_model_id INT,
    test_type ENUM('connectivity', 'response_time', 'accuracy', 'token_efficiency') NOT NULL,
    response_time_ms INT,
    tokens_used INT DEFAULT 0,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    performance_score DECIMAL(5,2),
    metadata JSON,
    tested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES ai_models(id) ON DELETE SET NULL,
    FOREIGN KEY (provider_model_id) REFERENCES provider_model_mappings(id) ON DELETE SET NULL,
    INDEX idx_model_id (model_id),
    INDEX idx_provider_model_id (provider_model_id),
    INDEX idx_test_type (test_type),
    INDEX idx_tested_at (tested_at),
    INDEX idx_success (success)
);

-- =====================================================
-- CLI PROCESS MANAGEMENT TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS cli_processes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    provider_id INT,
    process_id INT,
    command TEXT NOT NULL,
    arguments JSON,
    status ENUM('running', 'stopped', 'error', 'pending') DEFAULT 'pending',
    start_time TIMESTAMP NULL,
    end_time TIMESTAMP NULL,
    exit_code INT,
    logs TEXT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES ai_providers(id) ON DELETE SET NULL,
    INDEX idx_model_name (model_name),
    INDEX idx_process_id (process_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- DEPENDENCY INSTALLATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS dependency_installations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dependency_name VARCHAR(255) NOT NULL,
    dependency_version VARCHAR(50),
    installation_path TEXT,
    status ENUM('installed', 'pending', 'failed', 'removed') DEFAULT 'pending',
    installation_output TEXT,
    error_message TEXT,
    system_requirements JSON,
    installed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_dependency_name (dependency_name),
    INDEX idx_status (status),
    INDEX idx_installed_at (installed_at)
);

-- =====================================================
-- MODEL DEPENDENCY MAPPINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS model_dependency_mappings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    dependency_id INT NOT NULL,
    is_required BOOLEAN DEFAULT TRUE,
    installation_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dependency_id) REFERENCES dependency_installations(id) ON DELETE CASCADE,
    INDEX idx_model_name (model_name),
    INDEX idx_dependency_id (dependency_id),
    INDEX idx_is_required (is_required)
);

-- =====================================================
-- INSERT GOOGLE CLOUD PROVIDER
-- =====================================================
INSERT INTO ai_providers (name, type, api_endpoint, is_active) 
VALUES ('Google Cloud AI', 'google', 'https://aiplatform.googleapis.com', TRUE)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- INSERT GOOGLE PROVIDER CONFIGURATION FIELDS
-- =====================================================
INSERT INTO provider_configurations (provider_id, config_key, config_type, is_required, description) 
SELECT id, 'api_key', 'encrypted', TRUE, 'Google Cloud API Key for authentication'
FROM ai_providers WHERE name = 'Google Cloud AI'
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

INSERT INTO provider_configurations (provider_id, config_key, config_type, is_required, description) 
SELECT id, 'project_id', 'string', TRUE, 'Google Cloud Project ID'
FROM ai_providers WHERE name = 'Google Cloud AI'
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

INSERT INTO provider_configurations (provider_id, config_key, config_type, is_required, description) 
SELECT id, 'region', 'string', FALSE, 'Google Cloud Region (default: us-central1)'
FROM ai_providers WHERE name = 'Google Cloud AI'
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

INSERT INTO provider_configurations (provider_id, config_key, config_type, is_required, description) 
SELECT id, 'quota_requests_per_minute', 'integer', FALSE, 'Rate limit: Requests per minute'
FROM ai_providers WHERE name = 'Google Cloud AI'
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

INSERT INTO provider_configurations (provider_id, config_key, config_type, is_required, description) 
SELECT id, 'quota_tokens_per_minute', 'integer', FALSE, 'Rate limit: Tokens per minute'
FROM ai_providers WHERE name = 'Google Cloud AI'
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- INSERT COMMON GOOGLE MODELS
-- =====================================================
INSERT INTO provider_model_mappings (provider_id, model_name, model_alias, model_type, is_available, metadata) 
SELECT 
    id,
    'gemini-pro',
    'Gemini Pro',
    'text',
    TRUE,
    JSON_OBJECT('family', 'gemini', 'parameters', 'unknown', 'description', 'Google Gemini Pro model')
FROM ai_providers WHERE name = 'Google Cloud AI'
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

INSERT INTO provider_model_mappings (provider_id, model_name, model_alias, model_type, is_available, metadata) 
SELECT 
    id,
    'gemini-pro-vision',
    'Gemini Pro Vision',
    'vision',
    TRUE,
    JSON_OBJECT('family', 'gemini', 'parameters', 'unknown', 'description', 'Google Gemini Pro Vision model')
FROM ai_providers WHERE name = 'Google Cloud AI'
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

INSERT INTO provider_model_mappings (provider_id, model_name, model_alias, model_type, is_available, metadata) 
SELECT 
    id,
    'text-embedding-004',
    'Text Embedding',
    'embedding',
    TRUE,
    JSON_OBJECT('family', 'embedding', 'parameters', 'unknown', 'description', 'Google Text Embedding model')
FROM ai_providers WHERE name = 'Google Cloud AI'
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_perf_metrics_model_test ON model_performance_metrics(model_id, test_type, tested_at);
CREATE INDEX idx_cli_processes_model_status ON cli_processes(model_name, status, created_at);
CREATE INDEX idx_provider_models_sync ON provider_model_mappings(provider_id, is_available, last_synced);