// API route for reordering admin menu items
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { draggedItemId, targetItemId } = body
    
    if (!draggedItemId || !targetItemId) {
      return NextResponse.json(
        { success: false, error: 'Both draggedItemId and targetItemId are required' },
        { status: 400 }
      )
    }
    
    const pool = getAdminPool()
    
    // Get current sort orders
    const [draggedItem] = await pool.execute(
      'SELECT id, sort_order, category FROM admin_menu_items WHERE id = ?',
      [draggedItemId]
    ) as any[]
    
    const [targetItem] = await pool.execute(
      'SELECT id, sort_order, category FROM admin_menu_items WHERE id = ?',
      [targetItemId]
    ) as any[]
    
    if (!draggedItem.length || !targetItem.length) {
      return NextResponse.json(
        { success: false, error: 'One or both items not found' },
        { status: 404 }
      )
    }
    
    // If items are in the same category, swap their sort orders
    if (draggedItem[0].category === targetItem[0].category) {
      await pool.execute(
        'UPDATE admin_menu_items SET sort_order = ? WHERE id = ?',
        [targetItem[0].sort_order, draggedItemId]
      )
      
      await pool.execute(
        'UPDATE admin_menu_items SET sort_order = ? WHERE id = ?',
        [draggedItem[0].sort_order, targetItemId]
      )
    } else {
      // If items are in different categories, move dragged item to target's category with target's sort order
      await pool.execute(
        'UPDATE admin_menu_items SET category = ?, sort_order = ? WHERE id = ?',
        [targetItem[0].category, targetItem[0].sort_order, draggedItemId]
      )
      
      // Update sort orders of other items in the target category to make space
      await pool.execute(
        'UPDATE admin_menu_items SET sort_order = sort_order + 1 WHERE category = ? AND sort_order >= ? AND id != ?',
        [targetItem[0].category, targetItem[0].sort_order, draggedItemId]
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Menu items reordered successfully'
    })
    
  } catch (error) {
    console.error('Error reordering menu items:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to reorder menu items',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}