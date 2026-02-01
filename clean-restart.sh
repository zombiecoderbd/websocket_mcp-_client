#!/bin/bash

echo "🔧 CLEAN RESTART OF UAS SYSTEM"
echo "=============================="

# Kill all Node.js processes
echo "Killing existing Node processes..."
pkill -f "node.*dev" 2>/dev/null
pkill -f "next dev" 2>/dev/null
pkill -f "nodemon" 2>/dev/null
sleep 3

# Kill specific ports
echo "Cleaning ports..."
for port in 3001 8000 3002 8080; do
  lsof -i :$port | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null
done

sleep 2
echo "Ports cleaned!"

# Start backend first
echo "Starting Backend API Server..."
cd /home/sahon/admin/server
npm run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

sleep 8

# Start frontend
echo "Starting Frontend Admin Panel..."
cd /home/sahon/admin
PORT=3001 npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

sleep 5

# Start MCP server
echo "Starting MCP Server..."
cd /home/sahon/admin/packages/zombiecoder-mcp-server
npm run dev > /tmp/mcp.log 2>&1 &
MCP_PID=$!
echo "MCP Server PID: $MCP_PID"

sleep 3

# Start WebSocket MCP server
echo "Starting WebSocket MCP Server..."
cd /home/sahon/admin/packages/mcp-server
node websocket-mcp-server.js > /tmp/websocket.log 2>&1 &
WEBSOCKET_PID=$!
echo "WebSocket MCP Server PID: $WEBSOCKET_PID"

echo ""
echo "✅ SYSTEM STARTUP COMPLETE"
echo "=========================="
echo "Frontend Admin Panel:  http://localhost:3001"
echo "Backend API Server:    http://localhost:8000"
echo "MCP Server:            http://localhost:3002/admin"
echo "WebSocket MCP Server:  http://localhost:8080"
echo "WebSocket Client:      http://localhost:8080/client"
echo ""
echo "Process PIDs:"
echo "  Backend: $BACKEND_PID"
echo "  Frontend: $FRONTEND_PID"
echo "  MCP Server: $MCP_PID"
echo "  WebSocket: $WEBSOCKET_PID"
echo ""
echo "To stop all services: kill $BACKEND_PID $FRONTEND_PID $MCP_PID $WEBSOCKET_PID"
echo "Log files are in /tmp/"