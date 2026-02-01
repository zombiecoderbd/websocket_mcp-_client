// API route for admin settings
import { NextRequest, NextResponse } from 'next/server'
import * as mysql from 'mysql2/promise'

// Create a dedicated connection pool for admin routes to handle auth issues
let adminPool: mysql.Pool | null = null;

function getAdminPool(): mysql.Pool {
  if (!adminPool) {
    adminPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
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
    
    const [rows] = await pool.execute(
      `SELECT * FROM admin_settings ORDER BY category, setting_key`
    )
    
    return NextResponse.json({
      success: true,
      data: rows
    })
    
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { setting_key, setting_value, display_name, description, setting_type, category, is_editable = true, ui_config } = body
    
    if (!setting_key) {
      return NextResponse.json(
        { success: false, error: 'setting_key is required' },
        { status: 400 }
      )
    }
    
    const pool = getAdminPool()
    
    const [result] = await pool.execute(
      `INSERT INTO admin_settings (setting_key, setting_value, display_name, description, setting_type, category, is_editable, ui_config) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [setting_key, setting_value, display_name, description, setting_type || 'string', category || 'general', is_editable, JSON.stringify(ui_config || {})]
    )
    
    return NextResponse.json({
      success: true,
      data: { id: (result as any).insertId, ...body }
    })
    
  } catch (error) {
    console.error('Error creating setting:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create setting',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}