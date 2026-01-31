# 🧬 Z-Evo System - Quick Start Guide

## 🚀 Starting the System

```bash
# Navigate to project root
cd /home/sahon/admin

# Start all services with single command
node z-evo-complete-startup.js
```

## 🔧 Services Overview

| Service | Port | URL | Status |
|---------|------|-----|--------|
| Admin Panel | 3001 | http://localhost:3001 | ✅ Running |
| Backend API | 8000 | http://localhost:8000 | ✅ Running |
| MCP Admin | 3002 | http://localhost:3002/admin | ✅ Running |
| WebSocket MCP | 8080 | http://localhost:8080 | ✅ Running |

## 📁 Key Directories

```
/home/sahon/admin/
├── app/                    # Main Next.js application
├── components/admin/       # Dynamic admin components
├── packages/
│   ├── mcp-server/        # MCP server components
│   └── zombiecoder-mcp-server/  # Complete MCP server
├── server/                # Backend API
├── temp/z evo/           # Z-Evo documentation (14 files)
└── z-evo-complete-startup.js  # Unified startup script
```

## 🛠️ Database Access

```bash
# Connect to database
mysql -h localhost -u u-root -p'p-105585' uas_admin

# Check new admin tables
SHOW TABLES LIKE 'admin_%';
```

## 📊 New Admin Features

### Dynamic Configuration
- Manage system settings through web interface
- Real-time configuration updates
- Audit logging for all changes

### Dynamic Forms
- JSON schema-based form generation
- Support for all data types
- Client-side validation

### Enhanced Tables
- Sortable and filterable data grids
- Pagination for large datasets
- Real-time data refresh

### Audit Trail
- Complete action logging
- User activity tracking
- Configuration change history

## 🎯 Verification Commands

```bash
# Check if all services are running
ps aux | grep -E "(next|node)" | grep -v grep

# Check database tables
mysql -h localhost -u u-root -p'p-105585' uas_admin -e "SHOW TABLES;"

# Test API endpoints
curl http://localhost:8000/api/health
curl http://localhost:3001/api/health
```

## 📚 Documentation

- **Implementation Proof**: `Z_EVO_IMPLEMENTATION_PROOF.md`
- **Complete Documentation**: `/home/sahon/admin/temp/z evo/`
- **Database Schema**: `/home/sahon/admin/server/database/schema.sql`

## ⚠️ Important Notes

1. **Documentation Location**: All Z-Evo docs moved to `temp/z evo/` folder
2. **Python Environment**: `.venv` directory deleted as requested
3. **Service Integration**: All services now run from main project directory
4. **Database**: Enhanced with dynamic admin tables and columns
5. **Startup**: Use `z-evo-complete-startup.js` for unified service management

## 🆘 Troubleshooting

If services don't start:
1. Check port conflicts: `lsof -i :3001`
2. Clean ports: The startup script handles this automatically
3. Check logs in terminal output
4. Verify database connection with credentials in `server/.env`

The system is now fully operational with all requested features implemented!