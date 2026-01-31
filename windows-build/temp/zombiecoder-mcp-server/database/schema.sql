-- ZombieCoder MCP Server Database Schema
-- Version: 1.0.0

CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    method TEXT NOT NULL,
    endpoint TEXT,
    request_data TEXT,
    response_data TEXT,
    status TEXT,
    processing_time INTEGER,
    ip_address TEXT,
    user_agent TEXT
);

CREATE TABLE IF NOT EXISTS connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    connection_type TEXT NOT NULL,
    status TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT
);

CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    meta TEXT,
    component TEXT
);

CREATE TABLE IF NOT EXISTS mcp_operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    operation_type TEXT NOT NULL,
    tool_name TEXT,
    input_params TEXT,
    output_result TEXT,
    success BOOLEAN,
    error_message TEXT,
    execution_time INTEGER
);

CREATE TABLE IF NOT EXISTS admin_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin settings
INSERT OR IGNORE INTO admin_settings (setting_key, setting_value, description) VALUES 
('logging_enabled', 'true', 'Enable/disable real-time logging'),
('max_log_entries', '10000', 'Maximum number of log entries to retain'),
('auto_cleanup_days', '30', 'Days after which old logs are automatically cleaned up'),
('mcp_server_name', 'ZombieCoder MCP Server', 'Display name for the MCP server'),
('tagline', 'যেখানে কোড ও কথা বলে', 'Tagline for the server');

-- Agent-related tables
CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    config TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1
);

CREATE TABLE IF NOT EXISTS agent_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER,
    execution_id TEXT,
    status TEXT NOT NULL,
    input_params TEXT,
    output_result TEXT,
    error_message TEXT,
    success BOOLEAN DEFAULT 1,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    execution_time INTEGER,
    FOREIGN KEY (agent_id) REFERENCES agents (id)
);

CREATE TABLE IF NOT EXISTS agent_monitoring (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER,
    metric_name TEXT NOT NULL,
    metric_value REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents (id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp);
CREATE INDEX IF NOT EXISTS idx_connections_timestamp ON connections(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_mcp_operations_timestamp ON mcp_operations(timestamp);
CREATE INDEX IF NOT EXISTS idx_mcp_operations_success ON mcp_operations(success);

-- Indexes for agent-related tables
CREATE INDEX IF NOT EXISTS idx_agents_active ON agents(is_active);
CREATE INDEX IF NOT EXISTS idx_agent_executions_agent ON agent_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_status ON agent_executions(status);
CREATE INDEX IF NOT EXISTS idx_agent_executions_time ON agent_executions(start_time);
CREATE INDEX IF NOT EXISTS idx_agent_monitoring_agent ON agent_monitoring(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_monitoring_metric ON agent_monitoring(metric_name);

-- Connection status tracking tables
CREATE TABLE IF NOT EXISTS connection_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    connection_id TEXT UNIQUE NOT NULL,
    connection_type TEXT NOT NULL,
    status TEXT NOT NULL,
    connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_heartbeat DATETIME,
    disconnected_at DATETIME,
    user_agent TEXT,
    ip_address TEXT,
    session_id TEXT
);

CREATE TABLE IF NOT EXISTS editor_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    editor_name TEXT NOT NULL,
    connection_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL,
    connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME,
    user_id TEXT,
    project_path TEXT,
    capabilities TEXT
);

CREATE TABLE IF NOT EXISTS performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    component TEXT,
    context TEXT
);

-- Insert default performance baseline data
INSERT OR IGNORE INTO admin_settings (setting_key, setting_value, description) VALUES 
('cpu_monitoring_enabled', 'true', 'Enable CPU usage monitoring'),
('connection_timeout', '30000', 'Connection timeout in milliseconds'),
('heartbeat_interval', '10000', 'Heartbeat check interval in milliseconds'),
('websocket_port', '3003', 'WebSocket server port for real-time communication'),
('editor_socket_enabled', 'true', 'Enable editor socket communication'),
('max_editor_connections', '100', 'Maximum number of concurrent editor connections'),
('agent_runtime_monitoring', 'true', 'Enable real-time agent runtime monitoring'),
('performance_metrics_interval', '5000', 'Performance metrics collection interval in milliseconds');

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_connection_status_connection_id ON connection_status(connection_id);
CREATE INDEX IF NOT EXISTS idx_connection_status_status ON connection_status(status);
CREATE INDEX IF NOT EXISTS idx_editor_connections_editor ON editor_connections(editor_name);
CREATE INDEX IF NOT EXISTS idx_editor_connections_status ON editor_connections(status);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);

-- Enhanced agent monitoring tables
CREATE TABLE IF NOT EXISTS agent_runtime_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL,
    activity_type TEXT NOT NULL,
    model TEXT,
    request_count INTEGER DEFAULT 0,
    execution_time INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents (id)
);

CREATE TABLE IF NOT EXISTS agent_conversation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL,
    conversation_id TEXT NOT NULL,
    message_type TEXT NOT NULL,
    content TEXT,
    model TEXT,
    tokens_used INTEGER,
    response_time INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents (id)
);

CREATE TABLE IF NOT EXISTS agent_tool_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL,
    tool_name TEXT NOT NULL,
    parameters TEXT,
    result TEXT,
    success BOOLEAN,
    error_message TEXT,
    execution_time INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents (id)
);

CREATE TABLE IF NOT EXISTS agent_performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value REAL,
    context TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents (id)
);

CREATE TABLE IF NOT EXISTS editor_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    editor_name TEXT NOT NULL,
    user_id TEXT,
    project_path TEXT,
    capabilities TEXT,
    connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME,
    disconnected_at DATETIME,
    status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS editor_agent_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    agent_id INTEGER NOT NULL,
    interaction_type TEXT NOT NULL,
    request_data TEXT,
    response_data TEXT,
    success BOOLEAN,
    error_message TEXT,
    execution_time INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES editor_sessions (session_id),
    FOREIGN KEY (agent_id) REFERENCES agents (id)
);

-- Create indexes for enhanced monitoring
CREATE INDEX IF NOT EXISTS idx_agent_runtime_activity_agent ON agent_runtime_activity(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_runtime_activity_timestamp ON agent_runtime_activity(timestamp);
CREATE INDEX IF NOT EXISTS idx_agent_conversation_history_agent ON agent_conversation_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversation_history_conversation ON agent_conversation_history(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_tool_executions_agent ON agent_tool_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tool_executions_tool ON agent_tool_executions(tool_name);
CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_agent ON agent_performance_metrics(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_name ON agent_performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_editor_sessions_session ON editor_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_editor_sessions_status ON editor_sessions(status);
CREATE INDEX IF NOT EXISTS idx_editor_agent_interactions_session ON editor_agent_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_editor_agent_interactions_agent ON editor_agent_interactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_editor_agent_interactions_timestamp ON editor_agent_interactions(timestamp);