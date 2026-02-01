// API route for service restart
import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'

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
    
    // Define service restart commands based on service name
    const restartCommands: Record<string, string[]> = {
      'Frontend Admin Panel': ['npm', 'run', 'dev'],
      'Backend API Server': ['npm', 'run', 'dev'],
      'MCP Server': ['npm', 'run', 'dev'],
      'WebSocket MCP Server': ['node', 'websocket-mcp-server.js']
    }
    
    const command = restartCommands[service_name]
    
    if (!command) {
      return NextResponse.json(
        { success: false, error: 'Unknown service or restart not supported' },
        { status: 400 }
      )
    }
    
    // Determine working directory based on service
    let cwd = '/home/sahon/admin'
    if (service_name === 'Backend API Server') {
      cwd = '/home/sahon/admin/server'
    } else if (service_name === 'WebSocket MCP Server') {
      cwd = '/home/sahon/admin/packages/mcp-server'
    } else if (service_name === 'MCP Server') {
      cwd = '/home/sahon/admin/packages/zombiecoder-mcp-server'
    }
    
    // Execute restart command
    const process = spawn(command[0], command.slice(1), {
      cwd,
      detached: true,
      stdio: 'ignore'
    })
    
    process.unref()
    
    return NextResponse.json({
      success: true,
      message: `Restart command initiated for ${service_name}`
    })
    
  } catch (error) {
    console.error('Error restarting service:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to restart service',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}