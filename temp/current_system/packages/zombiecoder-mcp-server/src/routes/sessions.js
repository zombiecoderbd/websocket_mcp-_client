// Session Management API Routes
// REST API for 5-day session persistence and management

const express = require('express');
const router = express.Router();
const SessionPersistenceSystem = require('../SessionPersistenceSystem');

// Initialize session system
const sessionSystem = new SessionPersistenceSystem();

// Start cleanup scheduler
sessionSystem.startCleanupScheduler();

// Middleware for session validation
const validateSessionRequest = (req, res, next) => {
    const { clientId } = req.body;
    
    if (!clientId) {
        return res.status(400).json({
            success: false,
            error: "Client ID is required"
        });
    }
    
    next();
};

// POST /api/sessions/create - Create new 5-day session
router.post('/create', validateSessionRequest, async (req, res) => {
    try {
        const { clientId, agentId, sessionData = {} } = req.body;
        
        const session = await sessionSystem.createSession(clientId, agentId, sessionData);
        
        res.status(201).json({
            success: true,
            data: {
                session_id: session.sessionId,
                client_id: session.clientId,
                agent_id: session.agentId,
                created_at: session.createdAt,
                expires_at: session.expiresAt,
                ttl_days: 5
            },
            message: 'Session created successfully with 5-day persistence'
        });
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create session',
            details: error.message
        });
    }
});

// GET /api/sessions/client/:clientId - Get active session for client
router.get('/client/:clientId', async (req, res) => {
    try {
        const clientId = req.params.clientId;
        const session = await sessionSystem.getSessionByClientId(clientId);
        
        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'No active session found for this client'
            });
        }
        
        // Calculate remaining time
        const expiresAt = new Date(session.expires_at);
        const now = new Date();
        const remainingMs = expiresAt.getTime() - now.getTime();
        const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
        
        res.json({
            success: true,
            data: {
                session_id: session.id,
                client_id: session.client_id,
                agent_id: session.agent_id,
                session_data: session.session_data,
                created_at: session.created_at,
                last_activity: session.last_activity,
                expires_at: session.expires_at,
                remaining_days: remainingDays,
                is_active: session.is_active
            }
        });
    } catch (error) {
        console.error('Error fetching session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch session',
            details: error.message
        });
    }
});

// POST /api/sessions/:sessionId/ping - Update session activity (30-second ping)
router.post('/:sessionId/ping', async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        const { sessionData } = req.body;
        
        // Update activity timestamp
        const activityUpdated = await sessionSystem.updateSessionActivity(sessionId);
        
        if (!activityUpdated) {
            return res.status(404).json({
                success: false,
                error: 'Session not found or inactive'
            });
        }
        
        // Update session data if provided
        if (sessionData) {
            await sessionSystem.updateSessionData(sessionId, sessionData);
        }
        
        // Get updated session info
        const session = await sessionSystem.getSessionById(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session expired'
            });
        }
        
        const expiresAt = new Date(session.expires_at);
        const now = new Date();
        const remainingMs = expiresAt.getTime() - now.getTime();
        const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
        
        res.json({
            success: true,
            data: {
                session_id: sessionId,
                last_activity: new Date(),
                expires_at: session.expires_at,
                remaining_hours: remainingHours,
                session_renewed: true
            },
            message: 'Session activity updated successfully'
        });
    } catch (error) {
        console.error('Error updating session activity:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update session activity',
            details: error.message
        });
    }
});

// PUT /api/sessions/:sessionId/data - Update session data
router.put('/:sessionId/data', async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        const { sessionData } = req.body;
        
        if (!sessionData) {
            return res.status(400).json({
                success: false,
                error: 'Session data is required'
            });
        }
        
        const updated = await sessionSystem.updateSessionData(sessionId, sessionData);
        
        if (!updated) {
            return res.status(404).json({
                success: false,
                error: 'Session not found or inactive'
            });
        }
        
        res.json({
            success: true,
            message: 'Session data updated successfully'
        });
    } catch (error) {
        console.error('Error updating session data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update session data',
            details: error.message
        });
    }
});

// DELETE /api/sessions/:sessionId - End session
router.delete('/:sessionId', async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        const ended = await sessionSystem.endSession(sessionId);
        
        if (!ended) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Session ended successfully'
        });
    } catch (error) {
        console.error('Error ending session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to end session',
            details: error.message
        });
    }
});

// GET /api/sessions/stats - Get session statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await sessionSystem.getSessionStatistics();
        
        if (!stats) {
            return res.status(500).json({
                success: false,
                error: 'Failed to retrieve session statistics'
            });
        }
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching session statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch session statistics',
            details: error.message
        });
    }
});

// POST /api/sessions/cleanup - Manual cleanup of expired sessions
router.post('/cleanup', async (req, res) => {
    try {
        const cleanedCount = await sessionSystem.cleanupExpiredSessions();
        
        res.json({
            success: true,
            data: {
                cleaned_sessions: cleanedCount,
                cleanup_time: new Date()
            },
            message: `Cleaned up ${cleanedCount} expired sessions`
        });
    } catch (error) {
        console.error('Error during cleanup:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cleanup expired sessions',
            details: error.message
        });
    }
});

// GET /api/sessions/validate/:sessionId - Validate session status
router.get('/validate/:sessionId', async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        const session = await sessionSystem.getSessionById(sessionId);
        
        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found or expired',
                valid: false
            });
        }
        
        // Calculate time remaining
        const expiresAt = new Date(session.expires_at);
        const now = new Date();
        const remainingMs = expiresAt.getTime() - now.getTime();
        const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
        const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
        
        res.json({
            success: true,
            data: {
                session_id: session.id,
                is_valid: true,
                is_active: session.is_active,
                expires_at: session.expires_at,
                remaining_hours: remainingHours,
                remaining_days: remainingDays,
                last_activity: session.last_activity
            }
        });
    } catch (error) {
        console.error('Error validating session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to validate session',
            details: error.message
        });
    }
});

module.exports = router;