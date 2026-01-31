# Cloudflare Tunnel Implementation Plan for zombiecoder.my.id

## Overview
This document outlines the implementation plan for setting up Cloudflare Tunnel with the zombiecoder.my.id domain and its subdomains. Cloudflare Tunnel provides secure, encrypted connections between your origin servers and Cloudflare's global network without exposing your server IP addresses.

## Why Use Cloudflare Tunnel?
Cloudflare Tunnel offers several key advantages:
- **Security**: Hides your origin server IP address, preventing direct attacks
- **Encryption**: All traffic between your server and Cloudflare is encrypted
- **Reliability**: Provides a stable connection even with changing IP addresses
- **Global Network**: Leverages Cloudflare's worldwide infrastructure for faster response times
- **Access Control**: Allows fine-grained control over who can access your applications

## How Cloudflare Tunnel Works
Cloudflare Tunnel creates a persistent, secure connection from your origin server to Cloudflare's edge network. Instead of configuring firewalls or opening ports, the tunnel connects outbound to Cloudflare, establishing a secure channel through which HTTP requests are forwarded to your applications.

## Domain Details
- **Main Domain**: zombiecoder.my.id
- **Nameservers**: 
  - carmelo.ns.cloudflare.com
  - eloise.ns.cloudflare.com
- **Subdomains**:
  - app.zombiecoder.my.id
  - zombie.zombiecoder.my.id

## Implementation Phases

### Phase 1: Pre-requisites and Preparation
- [ ] Verify domain ownership for zombiecoder.my.id
- [ ] Ensure access to domain registrar account
- [ ] Prepare origin servers that will be exposed via tunnels
- [ ] Install cloudflared on origin servers

### Phase 2: Cloudflare Account Setup
- [ ] Log in to Cloudflare account
- [ ] Add zombiecoder.my.id domain to Cloudflare
- [ ] Verify DNS records import correctly
- [ ] Check current DNS configuration for conflicts

### Phase 3: Nameserver Configuration
- [ ] Update nameservers at registrar to:
  - carmelo.ns.cloudflare.com
  - eloise.ns.cloudflare.com
- [ ] Wait for DNS propagation (typically 24-48 hours)
- [ ] Verify nameserver changes have propagated globally

### Phase 4: Cloudflared Authentication and Tunnel Creation
- [ ] Authenticate cloudflared client: `cloudflared tunnel login`
- [ ] Create tunnel: `cloudflared tunnel create zombiecoder-tunnel`
- [ ] Verify tunnel created successfully
- [ ] Note tunnel ID for configuration

### Phase 5: DNS Routing Configuration
- [ ] Route main domain: `cloudflared tunnel route dns zombiecoder-tunnel zombiecoder.my.id`
- [ ] Route subdomains:
  - `cloudflared tunnel route dns zombiecoder-tunnel app.zombiecoder.my.id`
  - `cloudflared tunnel route dns zombiecoder-tunnel zombie.zombiecoder.my.id`
- [ ] Verify DNS records appear in Cloudflare dashboard

### Phase 6: Origin Configuration
- [ ] Create configuration file `/etc/cloudflared/config.yml`
- [ ] Define origin endpoints for each subdomain
- [ ] Test connectivity to origin servers

### Phase 7: Service Deployment
- [ ] Deploy cloudflared as a system service
- [ ] Monitor tunnel connection status
- [ ] Verify traffic routing works correctly

### Phase 8: Security Hardening
- [ ] Configure SSL/TLS mode to "Full (strict)"
- [ ] Enable WAF rules in Cloudflare dashboard
- [ ] Set up rate limiting if needed
- [ ] Configure firewall rules on origin servers

### Phase 9: Monitoring and Maintenance
- [ ] Set up health checks for tunnels
- [ ] Configure alerts for tunnel disconnections
- [ ] Document procedures for credential rotation
- [ ] Plan for regular maintenance windows

## Technical Specifications

### Cloudflared Configuration Example
```yaml
tunnel: <tunnel-id>
credentials-file: /etc/cloudflared/creds/credentials.json

ingress:
  - hostname: zombiecoder.my.id
    service: http://localhost:8080
  - hostname: app.zombiecoder.my.id
    service: http://localhost:3000
  - hostname: zombie.zombiecoder.my.id
    service: http://localhost:5000
  - service: http_status:404
```

### Security Considerations
- Regularly rotate tunnel credentials
- Monitor tunnel logs for suspicious activity
- Implement proper access controls on origin servers
- Use strong authentication for all administrative access

## Rollback Plan
In case of issues:
1. Temporarily disable tunnel routing
2. Point DNS back to original origin servers
3. Investigate and fix the underlying issue
4. Re-enable tunnel with fixes applied

## Success Criteria
- [ ] Main domain zombiecoder.my.id accessible via Cloudflare Tunnel
- [ ] Subdomains app.zombiecoder.my.id and zombie.zombiecoder.my.id accessible
- [ ] SSL certificates properly configured and valid
- [ ] Traffic properly routed to origin servers
- [ ] No downtime during transition
- [ ] Security measures properly implemented

## Additional Resources
- [Benefits and How It Works](BENEFITS_AND_HOW_IT_WORKS.md) - Detailed explanation of Cloudflare Tunnel benefits
- [Domain Setup Guide](domain-setup.html) - Step-by-step configuration guide