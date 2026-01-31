#!/bin/bash

# Cloudflare Tunnel Setup Script for Local Development
# This script automates the setup of Cloudflare Tunnel for zombiecoder.my.id domain

set -e  # Exit on any error

echo "========================================="
echo "Cloudflare Tunnel Setup for Local System"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Check prerequisites
print_status "Checking prerequisites..."

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    print_warning "cloudflared not found. Installing..."
    
    # Detect OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Ubuntu/Debian
        if command -v apt-get &> /dev/null; then
            wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
            sudo dpkg -i cloudflared-linux-amd64.deb
            rm cloudflared-linux-amd64.deb
        # CentOS/RHEL/Fedora
        elif command -v yum &> /dev/null; then
            wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-x86_64.rpm
            sudo rpm -ivh cloudflared-linux-x86_64.rpm
            rm cloudflared-linux-x86_64.rpm
        fi
    else
        print_error "Unsupported OS. Please install cloudflared manually."
        print_error "Visit: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
        exit 1
    fi
    
    print_success "cloudflared installed successfully"
else
    print_success "cloudflared is already installed"
fi

# Authenticate with Cloudflare
print_status "Authenticating with Cloudflare..."
print_warning "A browser window will open. Please log in to your Cloudflare account."
read -p "Press Enter to continue..."

cloudflared tunnel login

# Create tunnel
print_status "Creating tunnel..."
TUNNEL_NAME="zombiecoder-local-tunnel"
TUNNEL_INFO=$(cloudflared tunnel create $TUNNEL_NAME)
TUNNEL_UUID=$(echo "$TUNNEL_INFO" | grep -oE '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}')

if [ -z "$TUNNEL_UUID" ]; then
    print_error "Failed to create tunnel"
    exit 1
fi

print_success "Tunnel created with UUID: $TUNNEL_UUID"

# Create configuration directory
sudo mkdir -p /etc/cloudflared

# Copy configuration file
print_status "Setting up configuration..."
CONFIG_FILE="/etc/cloudflared/config.yml"

# Create the config file with the tunnel UUID
cat > /tmp/config.yml << EOF
# Cloudflare Tunnel Configuration for Local Development
tunnel: $TUNNEL_UUID
credentials-file: /etc/cloudflared/${TUNNEL_UUID}.json

# Ingress rules define how traffic is routed to your local services
ingress:
  # Main website - zombiecoder.my.id routes to Next.js frontend (port 3001)
  - hostname: zombiecoder.my.id
    service: http://localhost:3001
  
  # Application API - app.zombiecoder.my.id routes to TypeScript backend (port 8000)
  - hostname: app.zombiecoder.my.id
    service: http://localhost:8000
    
  # Special services - zombie.zombiecoder.my.id also routes to backend
  - hostname: zombie.zombiecoder.my.id
    service: http://localhost:8000
    
  # Health check endpoint for monitoring
  - hostname: app.zombiecoder.my.id
    path: /health
    service: http://localhost:8000/health
    
  # Catch-all rule - returns 404 for unmatched requests
  - service: http_status:404

# Logging configuration
loglevel: info
logfile: /var/log/cloudflared.log

# Metrics endpoint for monitoring
metrics: localhost:3001
EOF

sudo mv /tmp/config.yml $CONFIG_FILE
sudo chown $(whoami) $CONFIG_FILE

print_success "Configuration file created at $CONFIG_FILE"

# Route DNS records
print_status "Routing DNS records..."

# Check if domains exist in Cloudflare
DOMAIN_EXISTS=$(cloudflared tunnel route dns $TUNNEL_NAME zombiecoder.my.id 2>&1 || true)
if [[ $DOMAIN_EXISTS == *"already exists"* ]]; then
    print_warning "DNS record for zombiecoder.my.id already exists"
else
    print_success "DNS record created for zombiecoder.my.id"
fi

DOMAIN_EXISTS=$(cloudflared tunnel route dns $TUNNEL_NAME app.zombiecoder.my.id 2>&1 || true)
if [[ $DOMAIN_EXISTS == *"already exists"* ]]; then
    print_warning "DNS record for app.zombiecoder.my.id already exists"
else
    print_success "DNS record created for app.zombiecoder.my.id"
fi

DOMAIN_EXISTS=$(cloudflared tunnel route dns $TUNNEL_NAME zombie.zombiecoder.my.id 2>&1 || true)
if [[ $DOMAIN_EXISTS == *"already exists"* ]]; then
    print_warning "DNS record for zombie.zombiecoder.my.id already exists"
else
    print_success "DNS record created for zombie.zombiecoder.my.id"
fi

# Update environment files
print_status "Updating environment configuration..."

# Frontend .env.local
FRONTEND_ENV="../.env.local"
if [ ! -f "$FRONTEND_ENV" ]; then
    touch "$FRONTEND_ENV"
fi

# Add or update frontend environment variables
{
    echo "# Cloudflare Tunnel Configuration"
    echo "NEXT_PUBLIC_API_BASE_URL=https://app.zombiecoder.my.id/api"
    echo "NEXT_PUBLIC_WEBSOCKET_URL=wss://app.zombiecoder.my.id"
    echo ""
} > /tmp/frontend_env

# Merge with existing file
if [ -f "$FRONTEND_ENV" ]; then
    grep -v "NEXT_PUBLIC_API_BASE_URL\|NEXT_PUBLIC_WEBSOCKET_URL" "$FRONTEND_ENV" >> /tmp/frontend_env 2>/dev/null || true
fi

mv /tmp/frontend_env "$FRONTEND_ENV"

# Backend .env
BACKEND_ENV="../server/.env"
if [ -f "$BACKEND_ENV" ]; then
    # Update CORS_ORIGIN
    sed -i 's/CORS_ORIGIN=.*/CORS_ORIGIN=https:\/\/zombiecoder.my.id,https:\/\/app.zombiecoder.my.id/' "$BACKEND_ENV"
else
    echo "CORS_ORIGIN=https://zombiecoder.my.id,https://app.zombiecoder.my.id" > "$BACKEND_ENV"
fi

print_success "Environment files updated"

# Create systemd service file
print_status "Creating systemd service..."

SERVICE_FILE="/tmp/cloudflared.service"
cat > $SERVICE_FILE << EOF
[Unit]
Description=cloudflared
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/cloudflared --config /etc/cloudflared/config.yml tunnel run
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo mv $SERVICE_FILE /etc/systemd/system/cloudflared.service

# Instructions for user
echo ""
echo "========================================="
print_success "Setup Complete!"
echo "========================================="
echo ""
print_status "Next steps:"
echo ""
print_status "1. Make sure your local services are running:"
echo "   - Frontend (port 3002): npm run dev"
echo "   - Backend (port 8000): cd server && npm run dev"
echo ""
print_status "2. Test the tunnel in foreground mode:"
echo "   cloudflared tunnel --config /etc/cloudflared/config.yml run $TUNNEL_NAME"
echo ""
print_status "3. To run as a service:"
echo "   sudo systemctl daemon-reload"
echo "   sudo systemctl enable cloudflared"
echo "   sudo systemctl start cloudflared"
echo ""
print_status "4. Check service status:"
echo "   sudo systemctl status cloudflared"
echo ""
print_status "5. View logs:"
echo "   journalctl -u cloudflared -f"
echo ""
print_warning "Important Notes:"
echo "• DNS propagation may take 24-48 hours"
echo "• Your domain will be accessible at:"
echo "  - https://zombiecoder.my.id (frontend)"
echo "  - https://app.zombiecoder.my.id (backend API)"
echo "• Ensure your domain uses Cloudflare nameservers:"
echo "  carmelo.ns.cloudflare.com"
echo "  eloise.ns.cloudflare.com"
echo ""
print_status "For troubleshooting, visit the documentation in this directory."