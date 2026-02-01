#!/bin/bash

# ZombieCoder Migration Script
# Migrates files from old scattered structure to new organized structure

echo "🧟‍♂️ Starting ZombieCoder Migration Process..."
echo "================================================"

# Source and destination paths
SOURCE_ADMIN="/home/sahon/admin"
SOURCE_DESKTOP="/home/sahon/Desktop/sahon"
DEST="/home/sahon/zombiecoder"

echo "📁 Creating backup of current structures..."
cp -r "$SOURCE_ADMIN" "${SOURCE_ADMIN}_backup_$(date +%Y%m%d_%H%M%S)"
cp -r "$SOURCE_DESKTOP" "${SOURCE_DESKTOP}_backup_$(date +%Y%m%d_%H%M%S)"

echo "📦 Migrating core components..."

# Migrate web dashboard (Next.js app)
echo "Moving web dashboard..."
if [ -d "$SOURCE_ADMIN/app" ]; then
    cp -r "$SOURCE_ADMIN/app" "$DEST/apps/web-dashboard/"
    echo "✅ Web dashboard migrated"
fi

# Migrate components
if [ -d "$SOURCE_ADMIN/components" ]; then
    cp -r "$SOURCE_ADMIN/components" "$DEST/packages/core/components/"
    echo "✅ UI components migrated"
fi

# Migrate server code
if [ -d "$SOURCE_ADMIN/server" ]; then
    cp -r "$SOURCE_ADMIN/server" "$DEST/services/api-gateway/"
    echo "✅ Server code migrated"
fi

# Migrate MCP server
echo "Moving MCP server..."
if [ -d "$SOURCE_DESKTOP/zombiecoder-mcp-server" ]; then
    cp -r "$SOURCE_DESKTOP/zombiecoder-mcp-server" "$DEST/packages/mcp-server/src/"
    echo "✅ MCP server migrated"
fi

# Migrate agent scripts
echo "Moving agent components..."
if [ -d "$SOURCE_ADMIN/temp" ]; then
    # Move agent-related JS files
    find "$SOURCE_ADMIN/temp" -name "*.js" -exec cp {} "$DEST/packages/agents/" \;
    echo "✅ Agent scripts migrated"
fi

# Migrate documentation
echo "Moving documentation..."
if [ -d "$SOURCE_ADMIN/docs" ]; then
    cp -r "$SOURCE_ADMIN/docs" "$DEST/docs/architecture/"
fi

if [ -f "$SOURCE_DESKTOP/doc/work.md" ]; then
    cp "$SOURCE_DESKTOP/doc/work.md" "$DEST/docs/development/planning.md"
fi

if [ -f "$SOURCE_DESKTOP/documentation.html" ]; then
    cp "$SOURCE_DESKTOP/documentation.html" "$DEST/docs/architecture/system-overview.html"
fi

echo "✅ Documentation migrated"

# Create symbolic links for easy access
echo "🔗 Creating symbolic links..."
ln -sf "$DEST" "$SOURCE_ADMIN/../zombiecoder-current"
ln -sf "$DEST/apps/web-dashboard" "$SOURCE_ADMIN/../zombiecoder-web"

echo "🔧 Setting up configuration files..."

# Create package.json for monorepo
cat > "$DEST/package.json" << EOF
{
  "name": "zombiecoder-monorepo",
  "version": "1.0.0",
  "description": "Professional AI Agent System",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*",
    "services/*"
  ],
  "scripts": {
    "dev": "npm run dev -w apps/web-dashboard",
    "dev:all": "concurrently \"npm run dev -w apps/web-dashboard\" \"npm run dev -w services/api-gateway\"",
    "build": "npm run build -w apps/web-dashboard",
    "test": "jest",
    "setup": "npm install && npm run setup:workspace",
    "setup:workspace": "npm run setup -w packages/core"
  },
  "devDependencies": {
    "concurrently": "^8.0.0"
  }
}
EOF

# Create basic configuration
mkdir -p "$DEST/config/development"
cat > "$DEST/config/development/.env" << EOF
# Development Environment Configuration
NODE_ENV=development
PORT=3000
API_PORT=8000
WEBSOCKET_PORT=8080
DATABASE_URL=sqlite://./data/databases/zombiecoder.db
JWT_SECRET=your-jwt-secret-key-here
LOG_LEVEL=debug
EOF

echo "✅ Configuration files created"

# Create initial database schema
mkdir -p "$DEST/data/databases"
cat > "$DEST/data/databases/schema.sql" << 'EOF'
-- ZombieCoder Database Schema

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    persona_type TEXT NOT NULL,
    description TEXT,
    config JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    agent_id TEXT REFERENCES agents(id),
    user_id TEXT,
    title TEXT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT REFERENCES conversations(id),
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Models table
CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    config JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent-Model mapping
CREATE TABLE IF NOT EXISTS agent_model_mapping (
    agent_id TEXT REFERENCES agents(id),
    model_id TEXT REFERENCES models(id),
    priority INTEGER DEFAULT 1,
    PRIMARY KEY (agent_id, model_id)
);

-- System configuration
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value JSON,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT,
    key TEXT,
    value JSON,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, key)
);

-- Insert default data
INSERT OR IGNORE INTO system_config (key, value, description) VALUES 
('version', '"1.0.0"', 'System version'),
('default_agent_persona', '"professional"', 'Default agent personality'),
('max_conversation_length', '100', 'Maximum messages per conversation');

INSERT OR IGNORE INTO agents (id, name, persona_type, description) VALUES 
('default_agent', 'ZombieCoder Assistant', 'professional', 'Default professional AI assistant');
EOF

echo "✅ Database schema created"

echo ""
echo "🎉 Migration Complete!"
echo "====================="
echo "New structure created at: $DEST"
echo ""
echo "Next steps:"
echo "1. cd $DEST"
echo "2. npm run setup"
echo "3. npm run dev"
echo ""
echo "Backup locations:"
echo "- ${SOURCE_ADMIN}_backup_*"
echo "- ${SOURCE_DESKTOP}_backup_*"
echo ""
echo "🧟‍♂️ ZombieCoder - Ready for professional development!"