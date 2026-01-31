// API route for admin menu items
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

export async function GET(request: NextRequest) {
  try {
    const pool = getAdminPool()
    
    // Get all active and visible menu items
    const [rows] = await pool.execute(
      `SELECT id, name, display_name, href, icon_name, category, sort_order, is_active, is_visible, ui_config 
       FROM admin_menu_items 
       WHERE is_active = TRUE 
       ORDER BY category, sort_order, name`
    )
    
    return NextResponse.json({
      success: true,
      data: rows
    })
    
  } catch (error) {
    console.error('Error fetching menu items:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch menu items',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, display_name, href, icon_name, category, sort_order = 0, is_active = true, is_visible = true } = body
    
    if (!name || !href || !icon_name) {
      return NextResponse.json(
        { success: false, error: 'Name, href, and icon_name are required' },
        { status: 400 }
      )
    }
    
    const pool = getAdminPool()
    
    const [result] = await pool.execute(
      `INSERT INTO admin_menu_items (name, display_name, href, icon_name, category, sort_order, is_active, is_visible) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, display_name || name, href, icon_name, category || 'main', sort_order, is_active, is_visible]
    )
    
    return NextResponse.json({
      success: true,
      data: { id: (result as any).insertId, ...body }
    })
    
  } catch (error) {
    console.error('Error creating menu item:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create menu item',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}