# ZombieCoder MCP Server

## Overview

ZombieCoder MCP Server is an advanced Model Context Protocol (MCP) server built for Qoder IDE integration. It provides real-time logging, comprehensive admin panel, and dynamic monitoring capabilities.

**Tagline:** যেখানে কোড ও কথা বলে (Where code speaks)

## Features

### 🚀 Core Features
- **Real-time Logging**: Comprehensive logging of all MCP operations with SQLite persistence
- **Dynamic Admin Panel**: Web-based administration interface with live data
- **Multiple MCP Tools**: Built-in tools for code analysis, documentation, bug detection, and more
- **RESTful API**: Complete API for admin panel integration
- **SQLite Database**: Persistent storage for logs, requests, and operations

### 🔧 MCP Tools Included
1. **analyze-code** - Analyze code for issues and improvements
2. **generate-documentation** - Generate documentation for code
3. **find-bugs** - Identify potential bugs and security vulnerabilities
4. **create-project-structure** - Create complete project structures
5. **generate-readme** - Generate comprehensive README files
6. **format-code** - Format and beautify code
7. **convert-code** - Convert code between languages/frameworks
8. **explain-code** - Provide detailed code explanations

### 📊 Admin Panel Features
- Real-time dashboard with live statistics
- Dynamic log viewer with filtering capabilities
- Connection monitoring and management
- Configuration management interface
- Performance metrics and charts

## Installation

### Prerequisites
- Node.js v16 or higher
- npm or yarn package manager

### Setup Steps

1. **Clone and Navigate**
```bash
cd zombiecoder-mcp-server
```

2. **Install Dependencies**
```bash
npm install
```

3. **Initialize Database**
The database will be automatically created on first run, but you can manually initialize it:
```bash
# Database is automatically created when server starts
```

4. **Start the Server**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Configuration

### Environment Variables
Create a `.env` file in the project root:

```env
ADMIN_PORT=3001
LOGGING_ENABLED=true
MAX_LOG_ENTRIES=10000
AUTO_CLEANUP_DAYS=30
```

### Default Settings
- **Admin API Port**: 3001
- **Logging**: Enabled by default
- **Max Log Entries**: 10,000
- **Auto Cleanup**: 30 days

## Usage

### Qoder Integration

1. **Configure MCP Server in Qoder**
   - Open Qoder Settings
   - Navigate to MCP section
   - Add new server with STDIO transport
   - Command: `node`
   - Arguments: `[/path/to/zombiecoder-mcp-server/src/index.js]`

2. **Using MCP Tools**
   In Qoder chat with Agent mode enabled:
   ```
   /analyze-code
   Please analyze this Python function for potential improvements
   ```

### Admin Panel Access

Visit `http://localhost:3001/admin` to access the web admin panel.

#### Available Pages:
- **Dashboard** (`/admin`) - Overview and live statistics
- **Logs** (`/admin/logs-realtime.html`) - Real-time log monitoring
- **Connections** (`/admin/connections-dynamic.html`) - Connection status
- **Configuration** (`/admin/config-dynamic.html`) - Server settings

### API Endpoints

#### Health Check
```
GET /api/health
```

#### Dashboard Data
```
GET /api/dashboard/stats
```

#### Logs
```
GET /api/logs?limit=100&level=error&component=mcp-server
```

#### Operations
```
GET /api/operations?limit=50
```

#### Connections
```
GET /api/connections?limit=100
```

#### Settings
```
GET /api/settings
POST /api/settings
{
  "key": "setting_name",
  "value": "setting_value",
  "description": "optional description"
}
```

## Directory Structure

```
zombiecoder-mcp-server/
├── src/
│   ├── index.js          # Main entry point
│   ├── Server.js         # Server orchestration
│   ├── ZombieCoderMCP.js # Core MCP implementation
│   ├── AdminAPI.js       # REST API server
│   └── Logger.js         # Logging system
├── database/
│   ├── DatabaseManager.js # SQLite database manager
│   ├── schema.sql         # Database schema
│   └── zombiecoder.db     # SQLite database file
├── logs/                  # Log files directory
├── admin/                 # Admin panel HTML files
├── package.json
└── README.md
```

## Development

### Adding New MCP Tools

1. Add tool definition in `ZombieCoderMCP.js`:
```javascript
'new-tool-name': {
    name: 'new-tool-name',
    description: 'Tool description',
    inputSchema: {
        type: 'object',
        properties: {
            param1: { type: 'string', description: 'Parameter description' }
        },
        required: ['param1']
    }
}
```

2. Implement tool method:
```javascript
async executeTool(toolName, args) {
    switch (toolName) {
        case 'new-tool-name':
            return await this.newToolImplementation(args.param1);
        // ... other cases
    }
}
```

### Extending Admin API

Add new endpoints in `AdminAPI.js`:
```javascript
this.app.get('/api/new-endpoint', async (req, res) => {
    try {
        const data = await this.db.all('SELECT * FROM new_table');
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

## Security Considerations

### 🔒 Best Practices
- Change default admin port in production
- Implement authentication for admin panel
- Restrict access by IP addresses
- Regular log cleanup to prevent disk space issues
- Monitor for unusual activity patterns

### 🔐 Security Features
- Configurable IP whitelisting
- Optional authentication requirement
- Encrypted log storage
- Rate limiting capabilities

## Troubleshooting

### Common Issues

**Server Won't Start**
- Check Node.js version (≥16)
- Verify all dependencies are installed
- Check port availability (default 3001)

**Database Errors**
- Ensure write permissions in database directory
- Check available disk space
- Verify SQLite installation

**MCP Connection Issues**
- Confirm Qoder MCP configuration
- Check server logs for connection errors
- Verify STDIO transport settings

### Log Locations
- **Console Output**: Real-time server output
- **File Logs**: `logs/combined.log`, `logs/error.log`
- **Database Logs**: Stored in `database/zombiecoder.db` (logs table)

## Performance Optimization

### 🚀 Recommendations
- Use SSD storage for database files
- Allocate sufficient RAM (4GB+ recommended)
- Monitor log file sizes and implement rotation
- Consider read replicas for high-traffic scenarios

### 📊 Monitoring
- Watch memory usage with `process.memoryUsage()`
- Monitor database size and query performance
- Track API response times
- Set up alerts for error rate thresholds

## Contributing

### Development Setup
1. Fork the repository
2. Create feature branch
3. Make changes
4. Run tests
5. Submit pull request

### Code Standards
- Follow existing code style
- Add JSDoc comments for new functions
- Include error handling
- Write unit tests for new features

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- Check the troubleshooting section above
- Review server logs for error details
- Open GitHub issues for bugs/features

---

**Version**: 1.0.0  
**Author**: ZombieCoder Team  
**Website**: [Your website if applicable]