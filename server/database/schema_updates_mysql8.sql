-- Database Schema Updates for Dynamic Ollama Management System
-- MySQL 8.0 Compatible Version
-- Version: 1.1
-- Date: 2026-01-29

USE uas_admin;

-- Add model runtime monitoring fields to ai_models table
ALTER TABLE ai_models ADD COLUMN IF NOT EXISTS is_running BOOLEAN DEFAULT FALSE;
ALTER TABLE ai_models ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMP NULL;
ALTER TABLE ai_models ADD COLUMN IF NOT EXISTS system_resources JSON;

-- Create model runtime metrics table for detailed monitoring
CREATE TABLE IF NOT EXISTS model_metrics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    model_id INT NOT NULL,
    cpu_usage DECIMAL(5,2),
    memory_usage_mb INT,
    gpu_usage DECIMAL(5,2),
    active_connections INT DEFAULT 0,
    requests_per_minute INT DEFAULT 0,
    avg_response_time_ms INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES ai_models(id) ON DELETE CASCADE,
    INDEX idx_model_timestamp (model_id, timestamp),
    INDEX idx_timestamp (timestamp)
);

-- Enhanced agents table with control capabilities
ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS last_active TIMESTAMP NULL;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS auto_restart BOOLEAN DEFAULT FALSE;

-- Create agent runtime table for real-time monitoring
CREATE TABLE IF NOT EXISTS agent_runtime (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    agent_id INT NOT NULL,
    status ENUM('idle', 'busy', 'error', 'initializing', 'stopped') DEFAULT 'idle',
    active_tasks INT DEFAULT 0,
    completed_tasks INT DEFAULT 0,
    failed_tasks INT DEFAULT 0,
    memory_usage_mb INT DEFAULT 0,
    cpu_usage_percent DECIMAL(5,2) DEFAULT 0.00,
    current_session_id VARCHAR(100),
    last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    INDEX idx_agent_status (agent_id, status),
    INDEX idx_heartbeat (last_heartbeat),
    INDEX idx_timestamp (timestamp)
);

-- Create agent requests logging table
CREATE TABLE IF NOT EXISTS agent_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    agent_id INT NOT NULL,
    request_type VARCHAR(100),
    request_payload JSON,
    response_status ENUM('success', 'error', 'timeout') DEFAULT 'success',
    response_time_ms INT,
    error_message TEXT,
    session_id VARCHAR(100),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    INDEX idx_agent_requests (agent_id, timestamp),
    INDEX idx_session (session_id),
    INDEX idx_response_status (response_status),
    INDEX idx_timestamp (timestamp)
);

-- Enhanced agent memory for embedding support
ALTER TABLE agent_memory ADD COLUMN IF NOT EXISTS embedding_vector LONGBLOB;
ALTER TABLE agent_memory ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(100);
ALTER TABLE agent_memory ADD COLUMN IF NOT EXISTS semantic_hash VARCHAR(64);

-- Create embeddings index table
CREATE TABLE IF NOT EXISTS memory_embeddings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    memory_id INT NOT NULL,
    embedding_type ENUM('text', 'code', 'context', 'semantic') DEFAULT 'text',
    embedding_model VARCHAR(100),
    embedding_dimensions INT DEFAULT 0,
    content_hash VARCHAR(64),
    vector_data LONGBLOB,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (memory_id) REFERENCES agent_memory(id) ON DELETE CASCADE,
    INDEX idx_content_hash (content_hash),
    INDEX idx_embedding_type (embedding_type),
    INDEX idx_memory_updated (memory_id, updated_at),
    INDEX idx_created_at (created_at)
);

-- Project context tracking table
CREATE TABLE IF NOT EXISTS project_context (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_path VARCHAR(500) NOT NULL UNIQUE,
    project_name VARCHAR(255),
    root_directory BOOLEAN DEFAULT FALSE,
    file_count INT DEFAULT 0,
    folder_count INT DEFAULT 0,
    last_indexed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    indexing_status ENUM('pending', 'indexing', 'complete', 'error') DEFAULT 'pending',
    context_metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_project_path (project_path),
    INDEX idx_indexing_status (indexing_status),
    INDEX idx_updated_at (updated_at)
);

-- File indexing records table
CREATE TABLE IF NOT EXISTS file_index (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255),
    file_extension VARCHAR(20),
    file_size BIGINT,
    content_hash VARCHAR(64),
    last_modified TIMESTAMP,
    is_indexed BOOLEAN DEFAULT FALSE,
    index_timestamp TIMESTAMP NULL,
    embedding_id BIGINT,
    file_type ENUM('source', 'config', 'document', 'binary', 'unknown') DEFAULT 'unknown',
    programming_language VARCHAR(50),
    semantic_context JSON,
    FOREIGN KEY (project_id) REFERENCES project_context(id) ON DELETE CASCADE,
    FOREIGN KEY (embedding_id) REFERENCES memory_embeddings(id) ON DELETE SET NULL,
    INDEX idx_project_file (project_id, file_path),
    INDEX idx_content_hash (content_hash),
    INDEX idx_file_type (file_type),
    INDEX idx_indexed (is_indexed),
    INDEX idx_last_modified (last_modified)
);

-- Insert default system settings
INSERT IGNORE INTO system_settings (setting_key, setting_value, description, setting_type) VALUES
('embedding.default_model', 'nomic-embed-text', 'Default embedding model for semantic search', 'string'),
('embedding.cache_enabled', 'true', 'Enable caching for embedding vectors', 'boolean'),
('embedding.similarity_threshold', '0.7', 'Minimum similarity threshold for search results', 'string'),
('file_watcher.enabled', 'true', 'Enable automatic file system monitoring', 'boolean'),
('file_watcher.scan_interval', '30', 'File system scan interval in seconds', 'integer');

-- Update existing agents with default runtime values
UPDATE agents SET is_enabled = TRUE, auto_restart = FALSE WHERE is_enabled IS NULL;

-- Initialize agent runtime records for existing agents
INSERT IGNORE INTO agent_runtime (agent_id, status, last_heartbeat)
SELECT id, 'stopped', CURRENT_TIMESTAMP FROM agents 
WHERE id NOT IN (SELECT agent_id FROM agent_runtime);

COMMIT;