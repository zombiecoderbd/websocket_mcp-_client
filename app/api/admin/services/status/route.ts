// API route for service monitoring
import { NextRequest, NextResponse } from 'next/server'
import * as mysql from 'mysql2/promise'

// Create a dedicated connection pool for admin routes to handle auth issues
let adminPool: mysql.Pool | null = null;

function getAdminPool(): mysql.Pool {
  if (!adminPool) {
    adminPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'u-root',
      password: process.env.DB_PASSWORD || 'p-105585',
      database: process.env.DB_NAME || 'uas_admin',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      insecureAuth: true
    });
  }
  return adminPool;
}

export async function GET() {
  try {
    const pool = getAdminPool()
    
    // Get current service status from database
    const [rows] = await pool.execute(
      `SELECT service_name, service_type, status, last_check_timestamp, response_time_ms, error_message 
       FROM service_monitoring 
       ORDER BY service_name`
    )
    
    // If no data exists, create default service entries
    if (!Array.isArray(rows) || rows.length === 0) {
      const defaultServices = [
        { name: 'Frontend Admin Panel', type: 'frontend', url: 'http://localhost:3001/api/health' },
        { name: 'Backend API Server', type: 'backend', url: 'http://localhost:8000/health' },
        { name: 'MCP Server', type: 'mcp', url: 'http://localhost:3002/api/health' },
        { name: 'WebSocket MCP Server', type: 'websocket', url: 'http://localhost:8080/health' }
      ]
      
      for (const service of defaultServices) {
        await pool.execute(
          `INSERT INTO service_monitoring (service_name, service_type, health_check_url, status) 
           VALUES (?, ?, ?, 'offline') 
           ON DUPLICATE KEY UPDATE service_type = VALUES(service_type), health_check_url = VALUES(health_check_url)`,
          [service.name, service.type, service.url]
        )
      }
      
      // Fetch again after inserting defaults
      const [newRows] = await pool.execute(
        `SELECT service_name, service_type, status, last_check_timestamp, response_time_ms, error_message 
         FROM service_monitoring 
         ORDER BY service_name`
      )
      
      return NextResponse.json({
        success: true,
        data: newRows
      })
    }
    
    return NextResponse.json({
      success: true,
      data: rows
    })
    
  } catch (error) {
    console.error('Error fetching service status:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch service status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Manual service check
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { service_name } = body
    
    if (!service_name) {
      return NextResponse.json(
        { success: false, error: 'service_name is required' },
        { status: 400 }
      )
    }
    
    const pool = getAdminPool()
    
    // Get service info
    const [serviceRows] = await pool.execute(
      'SELECT id, health_check_url FROM service_monitoring WHERE service_name = ?',
      [service_name]
    ) as any[]
    
    if (!serviceRows || serviceRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Service not found' },
        { status: 404 }
      )
    }
    
    const service = serviceRows[0]
    let status = 'offline'
    let responseTime = null
    let errorMessage = null
    
    // Perform health check
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const startTime = Date.now()
      const response = await fetch(service.health_check_url, { 
        method: 'GET',
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      const endTime = Date.now()
      
      responseTime = endTime - startTime
      
      if (response.ok) {
        status = 'online'
      } else {
        status = 'degraded'
        errorMessage = `HTTP ${response.status}: ${response.statusText}`
      }
    } catch (error) {
      status = 'offline'
      errorMessage = error instanceof Error ? error.message : 'Unknown error'
    }
    
    // Update service status
    await pool.execute(
      `UPDATE service_monitoring 
       SET status = ?, response_time_ms = ?, error_message = ?, last_check_timestamp = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [status, responseTime, errorMessage, service.id]
    )
    
    return NextResponse.json({
      success: true,
      data: {
        service_name,
        status,
        response_time_ms: responseTime,
        error_message: errorMessage
      }
    })
    
  } catch (error) {
    console.error('Error checking service:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check service',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}