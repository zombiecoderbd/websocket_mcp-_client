#!/bin/bash

echo "🔧 ADVANCED UAS SYSTEM STARTUP WITH AGENT COMMUNICATION"
echo "====================================================="
echo ""

# Clean up existing processes first
echo "🧹 Cleaning up existing processes..."
pkill -f "node.*dev" 2>/dev/null
pkill -f "next dev" 2>/dev/null
pkill -f "nodemon" 2>/dev/null
pkill -f "fixed-startup" 2>/dev/null
pkill -f "clean-restart" 2>/dev/null

# Wait for processes to terminate
sleep 3

# Clean specific ports
echo "🧹 Cleaning ports..."
for port in 3001 3500 8000 3002 8080; do
  pids=$(lsof -ti:$port 2>/dev/null)
  if [ ! -z "$pids" ]; then
    echo "Killing processes on port $port: $pids"
    kill -9 $pids 2>/dev/null
  fi
done

sleep 2
echo "✅ Ports cleaned!"

# Start backend first (on port 8000)
echo "🚀 Starting Backend API Server (port 8000)..."
cd /home/sahon/admin/server
npm run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
sleep 8

# Start frontend on port 3500 (instead of 3001)
echo "🌐 Starting Frontend Admin Panel (port 3500)..."
cd /home/sahon/admin
PORT=3500 npm run dev > /tmp/frontend3500.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"
sleep 5

# Start MCP server
echo "⚙️  Starting MCP Server (port 3002)..."
cd /home/sahon/admin/packages/zombiecoder-mcp-server
npm run dev > /tmp/mcp.log 2>&1 &
MCP_PID=$!
echo "MCP Server PID: $MCP_PID"
sleep 3

# Start WebSocket MCP server
echo "📡 Starting WebSocket MCP Server (port 8080)..."
cd /home/sahon/admin/packages/mcp-server
node websocket-mcp-server.js > /tmp/websocket.log 2>&1 &
WEBSOCKET_PID=$!
echo "WebSocket MCP Server PID: $WEBSOCKET_PID"
sleep 2

echo ""
echo "✅ SYSTEM STARTUP COMPLETE"
echo "=========================="
echo "Frontend Admin Panel:  http://localhost:3500"
echo "Backend API Server:    http://localhost:8000"
echo "MCP Server:            http://localhost:3002/admin"
echo "WebSocket MCP Server:  http://localhost:8080"
echo "WebSocket Client:      http://localhost:8080/client"
echo ""

# Check if services are running
echo "🔍 Verifying services..."
if lsof -Pi :3500 -sTCP:LISTEN -t >/dev/null ; then
  echo "✅ Frontend (3500): Running"
else
  echo "❌ Frontend (3500): Not running"
fi

if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
  echo "✅ Backend (8000): Running"
else
  echo "❌ Backend (8000): Not running"
fi

if lsof -Pi :3002 -sTCP:LISTEN -t >/dev/null ; then
  echo "✅ MCP Server (3002): Running"
else
  echo "❌ MCP Server (3002): Not running"
fi

if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
  echo "✅ WebSocket MCP (8080): Running"
else
  echo "❌ WebSocket MCP (8080): Not running"
fi

echo ""
echo "📊 Process PIDs:"
echo "  Backend: $BACKEND_PID"
echo "  Frontend: $FRONTEND_PID"
echo "  MCP Server: $MCP_PID"
echo "  WebSocket: $WEBSOCKET_PID"
echo ""

echo "📋 Log files are in /tmp/:"
echo "  - /tmp/backend.log"
echo "  - /tmp/frontend3500.log"
echo "  - /tmp/mcp.log"
echo "  - /tmp/websocket.log"
echo ""

echo "🔗 Agent Communication Test:"
echo "  Visit http://localhost:8080/client to test agent communication"
echo "  The WebSocket MCP server handles agent persona and metadata exchange"
echo ""

echo "💡 To stop all services: kill $BACKEND_PID $FRONTEND_PID $MCP_PID $WEBSOCKET_PID"
echo ""
echo "🚀 Advanced UAS System with Agent Communication is now operational!"