import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Check if the application is running properly
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'frontend-admin-panel',
      version: '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      features: {
        adminPanel: true,
        agentManagement: true,
        modelIntegration: true,
        websocketSupport: true
      }
    }

    return NextResponse.json(healthData, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    )
  }
}