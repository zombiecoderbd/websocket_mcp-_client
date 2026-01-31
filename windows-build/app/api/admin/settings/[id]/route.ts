// API route for individual admin settings
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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const pool = getAdminPool()
    
    const [rows] = await pool.execute(
      'SELECT * FROM admin_settings WHERE id = ?',
      [parseInt(id)]
    )
    
    if (Array.isArray(rows) && rows.length > 0) {
      return NextResponse.json({
        success: true,
        data: rows[0]
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Setting not found' },
        { status: 404 }
      )
    }
    
  } catch (error) {
    console.error('Error fetching setting:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch setting',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()
    const { setting_value, display_name, description, setting_type, category, is_editable, ui_config } = body
    
    const pool = getAdminPool()
    
    const [result] = await pool.execute(
      `UPDATE admin_settings SET 
        setting_value = COALESCE(?, setting_value),
        display_name = COALESCE(?, display_name),
        description = COALESCE(?, description),
        setting_type = COALESCE(?, setting_type),
        category = COALESCE(?, category),
        is_editable = COALESCE(?, is_editable),
        ui_config = COALESCE(?, ui_config),
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [setting_value, display_name, description, setting_type, category, is_editable, JSON.stringify(ui_config || {}), parseInt(id)]
    )
    
    if ((result as any).affectedRows > 0) {
      return NextResponse.json({
        success: true,
        message: 'Setting updated successfully'
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Setting not found' },
        { status: 404 }
      )
    }
    
  } catch (error) {
    console.error('Error updating setting:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update setting',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const pool = getAdminPool()
    
    const [result] = await pool.execute(
      'DELETE FROM admin_settings WHERE id = ?',
      [parseInt(id)]
    )
    
    if ((result as any).affectedRows > 0) {
      return NextResponse.json({
        success: true,
        message: 'Setting deleted successfully'
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Setting not found' },
        { status: 404 }
      )
    }
    
  } catch (error) {
    console.error('Error deleting setting:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete setting',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}