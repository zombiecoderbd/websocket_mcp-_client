import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Mock dashboard statistics
    const stats = {
      totalAgents: 12,
      activeConnections: 8,
      totalProjects: 24,
      completedTasks: 156,
      uptime: '99.9%',
      cpuUsage: 45,
      memoryUsage: 68,
      diskUsage: 32,
      networkTraffic: {
        incoming: '2.4 GB',
        outgoing: '1.8 GB'
      },
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}