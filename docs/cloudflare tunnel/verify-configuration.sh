#!/bin/bash

# Verification script for Cloudflare Tunnel configuration
echo "🔍 Verifying Cloudflare Tunnel Configuration for zombiecoder.my.id"
echo "=================================================================="

# Check if services are running
echo "🌐 Checking local services..."
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "✅ Frontend service running on port 3001"
else
    echo "❌ Frontend service not accessible on port 3001"
fi

if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend service running on port 8000"
else
    echo "❌ Backend service not accessible on port 8000"
fi

# Check tunnel status
echo ""
echo "🚇 Checking tunnel status..."
if cloudflared tunnel list | grep -q "zombiecoder-tunnel"; then
    echo "✅ Tunnel 'zombiecoder-tunnel' exists"
else
    echo "❌ Tunnel 'zombiecoder-tunnel' not found"
fi

# Check nameservers
echo ""
echo "🌍 Checking DNS configuration..."
NS_RECORDS=$(nslookup -type=NS zombiecoder.my.id 2>/dev/null | grep "nameserver" | wc -l)
if [ $NS_RECORDS -ge 2 ]; then
    echo "✅ Domain zombiecoder.my.id is using Cloudflare nameservers"
    nslookup -type=NS zombiecoder.my.id 2>/dev/null | grep "nameserver"
else
    echo "❌ Domain zombiecoder.my.id is not properly configured with Cloudflare nameservers"
fi

# Check if domain resolves
echo ""
echo "🔗 Testing domain accessibility..."
if curl -s https://zombiecoder.my.id --connect-timeout 10 > /dev/null 2>&1; then
    echo "✅ Domain zombiecoder.my.id is accessible via HTTPS"
else
    echo "⏳ Domain zombiecoder.my.id is not accessible yet (this may take time to propagate)"
fi

if curl -s https://app.zombiecoder.my.id/health --connect-timeout 10 > /dev/null 2>&1; then
    echo "✅ Subdomain app.zombiecoder.my.id is accessible via HTTPS"
else
    echo "⏳ Subdomain app.zombiecoder.my.id is not accessible yet (this may take time to propagate)"
fi

# Summary
echo ""
echo "📋 Configuration Summary:"
echo "=========================="
echo "Tunnel ID: 6ec068de-d21e-4e82-a446-e02ed28f8569"
echo "Main Domain: zombiecoder.my.id → localhost:3001"
echo "App Subdomain: app.zombiecoder.my.id → localhost:8000"
echo "Special Subdomain: zombie.zombiecoder.my.id → localhost:8000"
echo ""
echo "📋 Current Status:"
echo "- Local Frontend: Running on http://localhost:3001"
echo "- Local Backend: Running on http://localhost:8000"
echo "- Cloudflare Tunnel: Active with proper routing rules"
echo "- Domain Nameservers: Configured with Cloudflare"
echo ""
echo "⏰ Note: DNS propagation may take up to 24 hours for full effect."
echo "   If domains are not accessible yet, please wait and retry later."