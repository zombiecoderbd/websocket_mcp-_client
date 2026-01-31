// API route for individual data items
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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const { searchParams } = new URL(request.url)
    const table = searchParams.get('table')
    
    if (!table) {
      return NextResponse.json(
        { success: false, error: 'Table parameter is required' },
        { status: 400 }
      )
    }
    
    const pool = getAdminPool()
    
    const [rows] = await pool.execute(
      'SELECT * FROM ?? WHERE id = ?',
      [table, parseInt(id)]
    )
    
    if (Array.isArray(rows) && rows.length > 0) {
      return NextResponse.json({
        success: true,
        data: rows[0]
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      )
    }
    
  } catch (error) {
    console.error('Error fetching record:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch record',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await request.json()
    const { table, data } = body
    
    if (!table || !data) {
      return NextResponse.json(
        { success: false, error: 'Table and data are required' },
        { status: 400 }
      )
    }
    
    const pool = getAdminPool()
    
    // Build update query
    const columns = Object.keys(data)
    const values = Object.values(data)
    
    const setClause = columns.map(col => `?? = ?`).join(', ')
    const query = `UPDATE ?? SET ${setClause} WHERE id = ?`
    const queryParams = [table, ...columns.flatMap((col, i) => [col, values[i]]), parseInt(id)]
    
    const [result] = await pool.execute(query, queryParams)
    
    if ((result as any).affectedRows > 0) {
      return NextResponse.json({
        success: true,
        message: 'Record updated successfully'
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      )
    }
    
  } catch (error) {
    console.error('Error updating record:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update record',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await request.json()
    const { table } = body
    
    if (!table) {
      return NextResponse.json(
        { success: false, error: 'Table is required' },
        { status: 400 }
      )
    }
    
    const pool = getAdminPool()
    
    const [result] = await pool.execute(
      'DELETE FROM ?? WHERE id = ?',
      [table, parseInt(id)]
    )
    
    if ((result as any).affectedRows > 0) {
      return NextResponse.json({
        success: true,
        message: 'Record deleted successfully'
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      )
    }
    
  } catch (error) {
    console.error('Error deleting record:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete record',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}