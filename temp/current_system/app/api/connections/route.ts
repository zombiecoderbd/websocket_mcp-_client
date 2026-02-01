import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    
    // Mock connections data
    const connections = [
      {
        id: 'conn-001',
        agentId: 'agent-001',
        agentName: 'Code Assistant',
        status: 'connected',
        type: 'websocket',
        connectedAt: '2026-01-30T10:30:00Z',
        lastActivity: '2026-01-30T10:35:00Z',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        id: 'conn-002',
        agentId: 'agent-002',
        agentName: 'Data Analyzer',
        status: 'connected',
        type: 'websocket',
        connectedAt: '2026-01-30T10:25:00Z',
        lastActivity: '2026-01-30T10:34:00Z',
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      {
        id: 'conn-003',
        agentId: 'agent-003',
        agentName: 'System Monitor',
        status: 'disconnected',
        type: 'websocket',
        connectedAt: '2026-01-30T09:15:00Z',
        lastActivity: '2026-01-30T10:20:00Z',
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_66) AppleWebKit/537.36'
      },
      {
        id: 'conn-004',
        agentId: 'agent-004',
        agentName: 'File Processor',
        status: 'connected',
        type: 'http',
        connectedAt: '2026-01-30T10:00:00Z',
        lastActivity: '2026-01-30T10:33:00Z',
        ipAddress: '192.168.1.103',
        userAgent: 'PostmanRuntime/7.29.0'
      }
    ];

    // Apply limit
    const paginatedConnections = connections.slice(0, limit);
    
    return NextResponse.json({
      connections: paginatedConnections,
      total: connections.length,
      page,
      limit,
      totalPages: Math.ceil(connections.length / limit)
    });
  } catch (error) {
    console.error('Error fetching connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}