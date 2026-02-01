// API route for dynamic pages
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

export async function GET(request: NextRequest, { params }: { params: { pageKey: string } }) {
  try {
    const resolvedParams = await params;
    const { pageKey } = resolvedParams;
    const pool = getAdminPool()
    
    const [rows] = await pool.execute(
      `SELECT * FROM admin_pages WHERE page_key = ? AND is_active = TRUE`,
      [pageKey]
    )
    
    if (Array.isArray(rows) && rows.length > 0) {
      return NextResponse.json({
        success: true,
        data: rows[0]
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Page not found' },
        { status: 404 }
      )
    }
    
  } catch (error) {
    console.error('Error fetching page config:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch page configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { page_key, title, description, route_path, component_type, config_json, sort_order = 0, icon_name, category } = body
    
    if (!page_key || !title || !route_path) {
      return NextResponse.json(
        { success: false, error: 'page_key, title, and route_path are required' },
        { status: 400 }
      )
    }
    
    const pool = getAdminPool()
    
    const [result] = await pool.execute(
      `INSERT INTO admin_pages (page_key, title, description, route_path, component_type, config_json, sort_order, icon_name, category) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [page_key, title, description, route_path, component_type || 'list', JSON.stringify(config_json || {}), sort_order, icon_name, category || 'main']
    )
    
    return NextResponse.json({
      success: true,
      data: { id: (result as any).insertId, ...body }
    })
    
  } catch (error) {
    console.error('Error creating page:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create page',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { pageKey: string } }) {
  try {
    const resolvedParams = await params;
    const { pageKey } = resolvedParams;
    const body = await request.json()
    const { title, description, component_type, config_json, sort_order, icon_name, category, is_active } = body
    
    const pool = getAdminPool()
    
    const [result] = await pool.execute(
      `UPDATE admin_pages SET 
        title = ?, 
        description = ?, 
        component_type = ?, 
        config_json = ?, 
        sort_order = ?, 
        icon_name = ?, 
        category = ?, 
        is_active = ?,
        updated_at = CURRENT_TIMESTAMP 
       WHERE page_key = ?`,
      [title, description, component_type, JSON.stringify(config_json || {}), sort_order, icon_name, category, is_active, pageKey]
    )
    
    if ((result as any).affectedRows > 0) {
      return NextResponse.json({
        success: true,
        message: 'Page updated successfully'
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Page not found' },
        { status: 404 }
      )
    }
    
  } catch (error) {
    console.error('Error updating page:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update page',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}