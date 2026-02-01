# Cloudflare Tunnel Local System Configuration

This directory contains the configuration files for setting up Cloudflare Tunnel with your local development environment.

## Prerequisites

Before setting up Cloudflare Tunnel, ensure you have:

1. **Cloudflare Account** - Free account at [cloudflare.com](https://cloudflare.com)
2. **Domain Ownership** - You own `zombiecoder.my.id` domain
3. **cloudflared** - Cloudflare Tunnel client installed on your system

## Installation Steps

### 1. Install cloudflared

```bash
# For Ubuntu/Debian
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# For other systems, visit: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
```

### 2. Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

This will open a browser window where you need to log in to your Cloudflare account.

### 3. Create the Tunnel

```bash
cloudflared tunnel create zombiecoder-local-tunnel
```

Note the tunnel UUID that is returned.

### 4. Configure the Tunnel

Create the configuration file at `/etc/cloudflared/config.yml`:

```yaml
tunnel: YOUR_TUNNEL_UUID_HERE
credentials-file: /etc/cloudflared/YOUR_TUNNEL_UUID_HERE.json

# Ingress rules for routing traffic
ingress:
  # Main domain - routes to Next.js frontend (port 3001)
  - hostname: zombiecoder.my.id
    service: http://localhost:3001
  
  # App subdomain - routes to TypeScript backend (port 8000)  
  - hostname: app.zombiecoder.my.id
    service: http://localhost:8000
    
  # Zombie subdomain - can be used for special services
  - hostname: zombie.zombiecoder.my.id
    service: http://localhost:8000
    
  # Catch-all rule
  - service: http_status:404
```

### 5. Route DNS Records

```bash
# Route the main domain
cloudflared tunnel route dns zombiecoder-local-tunnel zombiecoder.my.id

# Route subdomains
cloudflared tunnel route dns zombiecoder-local-tunnel app.zombiecoder.my.id
cloudflared tunnel route dns zombiecoder-local-tunnel zombie.zombiecoder.my.id
```

### 6. Start the Services

First, make sure your local services are running:

```bash
# Terminal 1: Start Next.js frontend (from project root)
npm run dev
# Note: Frontend runs on port 3001 (since 3000 is in use)

# Terminal 2: Start TypeScript backend (from /server directory)
cd server
npm run dev
```

### 7. Run Cloudflare Tunnel

```bash
# Run in foreground to test
cloudflared tunnel --config /etc/cloudflared/config.yml run zombiecoder-local-tunnel

# Or run as a service (recommended for production)
sudo cloudflared --config /etc/cloudflared/config.yml service install
sudo systemctl start cloudflared
```

## Local Development Setup

### Environment Configuration

Update your `.env` files to work with the tunnel:

**Frontend (.env.local)**:
```env
NEXT_PUBLIC_API_BASE_URL=https://app.zombiecoder.my.id/api
NEXT_PUBLIC_WEBSOCKET_URL=wss://app.zombiecoder.my.id
NEXT_PUBLIC_FRONTEND_URL=https://zombiecoder.my.id
```

**Backend (server/.env)**:
```env
CORS_ORIGIN=https://zombiecoder.my.id,https://app.zombiecoder.my.id
```

### Port Mapping

- **Port 3001**: Next.js Frontend (zombiecoder.my.id)
- **Port 8000**: TypeScript Backend (app.zombiecoder.my.id)

## Testing the Setup

1. Visit `https://zombiecoder.my.id` - Should show your Next.js frontend
2. Visit `https://app.zombiecoder.my.id` - Should show your backend API
3. Visit `https://app.zombiecoder.my.id/health` - Should return health status

## Troubleshooting

### Common Issues

1. **DNS not resolving**: Wait 24-48 hours for DNS propagation
2. **SSL Certificate issues**: Cloudflare handles SSL automatically
3. **Connection refused**: Ensure local services are running on correct ports
4. **CORS errors**: Update CORS_ORIGIN in backend .env file

### Debug Commands

```bash
# Check tunnel status
cloudflared tunnel list

# View tunnel info
cloudflared tunnel info zombiecoder-local-tunnel

# Check logs
journalctl -u cloudflared -f

# Test local connectivity
curl http://localhost:3001
curl http://localhost:8000/health
```

## Security Considerations

1. **Firewall**: Your local services don't need public ports open
2. **Authentication**: Implement proper auth for sensitive endpoints
3. **Rate Limiting**: Configure in Cloudflare dashboard
4. **WAF**: Enable Web Application Firewall in Cloudflare

## Production Deployment

For production use:

1. Set up proper SSL certificates
2. Configure load balancing if needed
3. Implement monitoring and alerting
4. Set up automated deployment pipelines
5. Configure backup and disaster recovery

## Useful Links

- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Cloudflare Dashboard](https://dash.cloudflare.com)
- [Local Development Best Practices](https://developers.cloudflare.com/cloudflare-one/tutorials/)

---
**Note**: This configuration exposes your local development environment to the internet. Use appropriate security measures and only expose what's necessary.