// API route for dynamic data operations
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
    const { searchParams } = new URL(request.url)
    const table = searchParams.get('table')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const search = searchParams.get('search') || ''
    const offset = (page - 1) * pageSize
    
    if (!table) {
      return NextResponse.json(
        { success: false, error: 'Table parameter is required' },
        { status: 400 }
      )
    }
    
    const pool = getAdminPool()
    
    // Get column information
    const [columns] = await pool.execute(
      `SELECT COLUMN_NAME as key, COLUMN_NAME as title 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = 'uas_admin' AND TABLE_NAME = ? 
       AND COLUMN_NAME NOT IN ('created_at', 'updated_at')`,
      [table]
    ) as any[]
    
    // Build search query
    let searchCondition = ''
    let searchParamsArray: any[] = []
    
    if (search && Array.isArray(columns) && columns.length > 0) {
      const searchableColumns = columns
        .filter((col: any) => ['name', 'display_name', 'title', 'description'].includes(col.key))
        .map((col: any) => col.key)
      
      if (searchableColumns.length > 0) {
        searchCondition = `WHERE (${searchableColumns.map(() => `?? LIKE ?`).join(' OR ')})`
        searchableColumns.forEach(col => {
          searchParamsArray.push(col, `%${search}%`)
        })
      }
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM ?? ${searchCondition}`
    const countParams = [table, ...searchParamsArray]
    const [countResult] = await pool.execute(countQuery, countParams) as any[]
    const total = countResult[0].total
    
    // Get data
    const dataQuery = `SELECT * FROM ?? ${searchCondition} ORDER BY id DESC LIMIT ? OFFSET ?`
    const dataParams = [table, ...searchParamsArray, pageSize, offset]
    const [data] = await pool.execute(dataQuery, dataParams)
    
    return NextResponse.json({
      success: true,
      data: {
        columns: Array.isArray(columns) ? columns : [],
        data,
        total,
        page,
        pageSize
      }
    })
    
  } catch (error) {
    console.error('Error fetching data:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { table, data } = body
    
    if (!table || !data) {
      return NextResponse.json(
        { success: false, error: 'Table and data are required' },
        { status: 400 }
      )
    }
    
    const pool = getAdminPool()
    
    // Build insert query
    const columns = Object.keys(data)
    const values = Object.values(data)
    const placeholders = columns.map(() => '?').join(', ')
    
    const query = `INSERT INTO ?? (${columns.map(col => '??').join(', ')}) VALUES (${placeholders})`
    const params = [table, ...columns, ...values]
    
    const [result] = await pool.execute(query, params)
    
    return NextResponse.json({
      success: true,
      data: { id: (result as any).insertId, ...data }
    })
    
  } catch (error) {
    console.error('Error creating record:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create record',
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
    const { id } = params
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