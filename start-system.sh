#!/bin/bash

# UAS Admin System Startup Script
# This script provides easy access to the unified startup system

cd /home/sahon/admin

echo "🚀 Starting UAS Admin System..."
echo "================================"

# Make the startup script executable if it isn't already
chmod +x unified-system-startup.js

# Run the unified startup script
node unified-system-startup.js