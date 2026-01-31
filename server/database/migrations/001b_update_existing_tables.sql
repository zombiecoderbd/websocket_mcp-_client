-- Migration 001b: Update existing admin tables (safe version)
-- Date: 2026-01-31
-- Purpose: Add missing columns to existing tables if they don't exist

USE uas_admin;

-- Add columns to existing tables only if they don't exist
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

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_providers_sort ON ai_providers(sort_order, is_active);
CREATE INDEX IF NOT EXISTS idx_servers_sort ON servers(sort_order, status);
CREATE INDEX IF NOT EXISTS idx_models_sort ON ai_models(sort_order, status);
CREATE INDEX IF NOT EXISTS idx_agents_sort ON agents(sort_order, status);

-- Update existing records to have sort_order
UPDATE ai_providers SET sort_order = id WHERE sort_order = 0;
UPDATE servers SET sort_order = id WHERE sort_order = 0;
UPDATE ai_models SET sort_order = id WHERE sort_order = 0;
UPDATE agents SET sort_order = id WHERE sort_order = 0;

SELECT 'Migration completed successfully - added dynamic columns and indexes' as message;