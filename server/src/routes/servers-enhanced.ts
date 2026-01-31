import * as express from 'express';
import { Logger } from '../utils/logger';
import { CloudProviderManager } from '../services/cloud-provider-manager';
import { ProxyIntegrationService } from '../services/proxy-integration';

const router = express.Router();
const logger = new Logger();
const cloudProviderManager = new CloudProviderManager();
const proxyIntegrationService = new ProxyIntegrationService();

// GET /servers/providers - Get all cloud provider statuses
router.get('/providers', async (req, res) => {
    try {
        const providers = await cloudProviderManager.getAllProviderStatuses();
        
        res.json({
            success: true,
            data: providers,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to fetch provider statuses:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch provider statuses',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

// POST /servers/providers/:id/test - Test specific provider connection
router.post('/providers/:id/test', async (req, res) => {
    try {
        const { id } = req.params;
        const providerId = parseInt(id);
        
        if (isNaN(providerId)) {
            res.status(400).json({
                success: false,
                error: 'Invalid provider ID'
            });
            return;
        }
        
        const testResult = await cloudProviderManager.testProviderConnection(providerId);
        
        res.json({
            success: true,
            data: testResult,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error(`Failed to test provider ${req.params.id}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to test provider connection',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

// GET /servers/tunnel-status - Get Cloudflare tunnel status
router.get('/tunnel-status', async (req, res) => {
    try {
        const tunnelStatus = await cloudProviderManager.getTunnelInfo();
        
        res.json({
            success: true,
            data: tunnelStatus,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to fetch tunnel status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tunnel status',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

// POST /servers/tunnel/refresh - Refresh Cloudflare tunnel status
router.post('/tunnel/refresh', async (req, res) => {
    try {
        const tunnelStatus = await cloudProviderManager.refreshTunnelStatus();
        
        res.json({
            success: true,
            data: tunnelStatus,
            message: 'Tunnel status refreshed successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to refresh tunnel status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to refresh tunnel status',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

// GET /servers/proxy-status - Get proxy server integration status
router.get('/proxy-status', async (req, res) => {
    try {
        const proxyStatus = await proxyIntegrationService.getProxyServerStatus();
        
        res.json({
            success: true,
            data: proxyStatus,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to fetch proxy status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch proxy status',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

// GET /servers/integration-status - Get overall system integration status
router.get('/integration-status', async (req, res) => {
    try {
        const integrationStatus = await cloudProviderManager.getSystemIntegrationStatus();
        
        res.json({
            success: true,
            data: integrationStatus,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to fetch integration status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch integration status',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

// GET /servers/proxy-info - Get detailed proxy server information
router.get('/proxy-info', async (req, res) => {
    try {
        const proxyInfo = await proxyIntegrationService.getProxyServerInfo();
        
        res.json({
            success: true,
            data: proxyInfo,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to fetch proxy info:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch proxy information',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

export default router;