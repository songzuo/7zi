import { NextResponse } from 'next/server';

/**
 * Status API
 * Returns public status information for the status page
 * 
 * GET /api/status
 */
export async function GET() {
  // In a real implementation, this would aggregate data from:
  // - UptimeRobot API
  // - Sentry API
  // - Internal health checks

  const now = new Date();
  
  // Calculate uptime for last 30 days (mock data)
  const uptime30Days = 99.98;
  
  // Current system status
  const status = {
    // Overall status
    status: 'operational', // operational | degraded | outage
    lastUpdated: now.toISOString(),
    
    // Services
    services: [
      {
        name: 'Website',
        status: 'operational',
        uptime: uptime30Days,
        responseTime: 120,
      },
      {
        name: 'API',
        status: 'operational',
        uptime: 99.99,
        responseTime: 85,
      },
      {
        name: 'CDN',
        status: 'operational',
        uptime: 99.99,
        responseTime: 45,
      },
    ],
    
    // Metrics (last 24h)
    metrics: {
      requests: 125000,
      errors: 23,
      avgResponseTime: 142,
      p95ResponseTime: 380,
    },
    
    // Recent incidents (last 30 days)
    incidents: [
      // Uncomment when there are actual incidents
      // {
      //   id: 'INC-001',
      //   title: 'Brief API slowdown',
      //   status: 'resolved',
      //   severity: 'minor',
      //   startTime: '2026-03-01T10:30:00Z',
      //   endTime: '2026-03-01T10:45:00Z',
      //   duration: 15, // minutes
      // },
    ],
    
    // Upcoming maintenance
    maintenance: [
      // Uncomment when scheduling maintenance
      // {
      //   id: 'MNT-001',
      //   title: 'Scheduled database upgrade',
      //   startTime: '2026-03-10T02:00:00Z',
      //   duration: 60, // minutes
      //   description: 'Database will be upgraded for improved performance',
      // },
    ],
  };

  return NextResponse.json(status);
}