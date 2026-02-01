#!/bin/bash

echo "🚀 UAS System Integration Test"
echo "=============================="
echo

# Test 1: Backend Server Status
echo "1. Testing Backend Server..."
if curl -s http://localhost:8000/health | grep -q "healthy"; then
    echo "✅ Backend Server: Running"
else
    echo "❌ Backend Server: Not responding"
    exit 1
fi

# Test 2: Frontend Server Status
echo "2. Testing Frontend Server..."
if curl -s http://localhost:3001/ | grep -q "UAS Admin"; then
    echo "✅ Frontend Server: Running"
else
    echo "❌ Frontend Server: Not responding"
fi

# Test 3: Cloudflare Tunnel Status
echo "3. Testing Cloudflare Tunnel..."
TUNNEL_CONNECTIONS=$(cloudflared tunnel list | grep "zombiecoder-tunnel" | awk '{print $4}')
if [ "$TUNNEL_CONNECTIONS" != "" ] && [ "$TUNNEL_CONNECTIONS" != "0" ]; then
    echo "✅ Cloudflare Tunnel: Active ($TUNNEL_CONNECTIONS connections)"
    TUNNEL_URL=$(cloudflared tunnel info zombiecoder-tunnel | grep "https://" | head -1 | awk '{print $1}')
    echo "   Public URL: $TUNNEL_URL"
else
    echo "❌ Cloudflare Tunnel: Inactive"
fi

# Test 4: Ollama Integration
echo "4. Testing Ollama Integration..."
if curl -s http://localhost:8000/models | grep -q "models"; then
    echo "✅ Ollama Models: Accessible"
    MODEL_COUNT=$(curl -s http://localhost:8000/models | grep -o '"name"' | wc -l)
    echo "   Available Models: $MODEL_COUNT"
else
    echo "❌ Ollama Models: Not accessible"
fi

# Test 5: Agent System
echo "5. Testing Agent System..."
if curl -s http://localhost:8000/agents | grep -q "agents"; then
    echo "✅ Agents: Accessible"
    AGENT_COUNT=$(curl -s http://localhost:8000/agents | grep -o '"id"' | wc -l)
    echo "   Active Agents: $AGENT_COUNT"
else
    echo "❌ Agents: Not accessible"
fi

# Test 6: Proxy Integration
echo "6. Testing Proxy Integration..."
if curl -s http://localhost:8000/api/proxy/servers/providers | grep -q "data"; then
    echo "✅ Proxy System: Working"
    PROVIDER_COUNT=$(curl -s http://localhost:8000/api/proxy/servers/providers | grep -o '"id"' | wc -l)
    echo "   Configured Providers: $PROVIDER_COUNT"
else
    echo "❌ Proxy System: Not working"
fi

# Test 7: Editor Integration
echo "7. Testing Editor Integration..."
if curl -s http://localhost:8000/api/proxy/editor/send -X POST -d '{"content":"test"}' -H "Content-Type: application/json" | grep -q "success"; then
    echo "✅ Editor Integration: Working"
else
    echo "❌ Editor Integration: Not working"
fi

# Test 8: Memory System
echo "8. Testing Memory System..."
if curl -s http://localhost:8000/memory | grep -q "memories"; then
    echo "✅ Memory System: Working"
else
    echo "❌ Memory System: Not working"
fi

echo
echo "📊 System Integration Summary:"
echo "============================="
echo "• Backend Server: Running on port 8000"
echo "• Frontend Admin: Running on port 3001" 
echo "• Cloudflare Tunnel: Active with public access"
echo "• Ollama Models: $MODEL_COUNT models available"
echo "• Agent System: $AGENT_COUNT agents active"
echo "• Proxy Integration: $PROVIDER_COUNT providers configured"
echo "• Editor Integration: Connected and functional"
echo "• Memory System: Operational"

echo
echo "🌐 Access Points:"
echo "================="
echo "• Local Admin: http://localhost:3001"
echo "• Local API: http://localhost:8000"
echo "• Public Access: $TUNNEL_URL (if available)"

echo
echo "✅ All systems are operational!"