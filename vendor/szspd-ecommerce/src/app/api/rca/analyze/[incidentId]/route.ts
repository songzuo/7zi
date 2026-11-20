/**
 * RCA Analyze API Endpoint
 * GET /api/rca/analyze/[incidentId]
 * 
 * Analyzes a specific incident and returns root cause analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  IntelligentRCA, 
  Incident, 
  Symptom, 
  Metric,
  createIntelligentRCA 
} from '@/lib/performance/root-cause-analysis'

// Singleton RCA instance
let rcaInstance: IntelligentRCA | null = null

function getRCA(): IntelligentRCA {
  if (!rcaInstance) {
    rcaInstance = createIntelligentRCA()
  }
  return rcaInstance
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ incidentId: string }> }
) {
  try {
    const { incidentId } = await params
    
    // For demo/testing, we'll create a sample incident
    // In production, this would fetch from a database
    const incident = await fetchIncident(incidentId)
    
    if (!incident) {
      return NextResponse.json(
        { error: 'Incident not found' },
        { status: 404 }
      )
    }

    const rca = getRCA()
    const report = await rca.analyze(incident)

    return NextResponse.json({
      success: true,
      report
    })
  } catch (error) {
    console.error('RCA Analysis Error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze incident' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate incident data
    const incident = validateIncident(body)
    
    if (!incident) {
      return NextResponse.json(
        { error: 'Invalid incident data' },
        { status: 400 }
      )
    }

    const rca = getRCA()
    const report = await rca.analyze(incident)

    return NextResponse.json({
      success: true,
      report
    })
  } catch (error) {
    console.error('RCA Analysis Error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze incident' },
      { status: 500 }
    )
  }
}

// Helper function to fetch incident (placeholder)
async function fetchIncident(id: string): Promise<Incident | null> {
  // In production, this would query a database
  // For now, return a sample incident for testing
  if (id === 'sample' || id === 'test') {
    return createSampleIncident(id)
  }
  
  return null
}

// Create a sample incident for testing
function createSampleIncident(id: string): Incident {
  const now = Date.now()
  
  return {
    id,
    title: 'Database Performance Degradation',
    description: 'Slow API response times detected in user service',
    severity: 'high',
    timestamp: now - 300000, // 5 minutes ago
    affectedServices: ['user-service', 'api-gateway', 'database'],
    symptoms: [
      {
        id: 'symptom-1',
        type: 'latency',
        name: 'api_response_time',
        description: 'API response time exceeded threshold',
        value: 2500,
        threshold: 500,
        unit: 'ms',
        service: 'api-gateway',
        component: 'user-endpoint',
        timestamp: now - 300000
      },
      {
        id: 'symptom-2',
        type: 'latency',
        name: 'db_query_time',
        description: 'Database query time high',
        value: 1800,
        threshold: 200,
        unit: 'ms',
        service: 'database',
        component: 'user-queries',
        timestamp: now - 295000
      },
      {
        id: 'symptom-3',
        type: 'error',
        name: 'error_rate',
        description: 'Error rate spike detected',
        value: 15,
        threshold: 5,
        unit: '%',
        service: 'user-service',
        timestamp: now - 290000
      }
    ],
    metrics: [
      {
        id: 'metric-1',
        name: 'api_latency',
        value: 2500,
        unit: 'ms',
        timestamp: now - 300000,
        service: 'api-gateway'
      },
      {
        id: 'metric-2',
        name: 'db_latency',
        value: 1800,
        unit: 'ms',
        timestamp: now - 295000,
        service: 'database'
      },
      {
        id: 'metric-3',
        name: 'error_count',
        value: 45,
        unit: 'count',
        timestamp: now - 290000,
        service: 'user-service'
      },
      {
        id: 'metric-4',
        name: 'cpu_usage',
        value: 85,
        unit: '%',
        timestamp: now - 285000,
        service: 'database'
      },
      {
        id: 'metric-5',
        name: 'connection_pool_usage',
        value: 92,
        unit: '%',
        timestamp: now - 280000,
        service: 'database'
      }
    ],
    status: 'active'
  }
}

// Validate incident data from request body
function validateIncident(data: unknown): Incident | null {
  if (!data || typeof data !== 'object') {
    return null
  }

  const obj = data as Record<string, unknown>

  // Check required fields
  if (!obj.id || !obj.title || !obj.timestamp || !Array.isArray(obj.symptoms)) {
    return null
  }

  // Validate symptoms
  const symptoms: Symptom[] = (obj.symptoms as unknown[]).map((s, i) => {
    const symptom = s as Record<string, unknown>
    return {
      id: (symptom.id as string) || `symptom-${i}`,
      type: (symptom.type as Symptom['type']) || 'custom',
      name: (symptom.name as string) || 'unknown',
      description: (symptom.description as string) || '',
      value: (symptom.value as number) || 0,
      threshold: (symptom.threshold as number) || 0,
      unit: (symptom.unit as string) || '',
      service: (symptom.service as string) || 'unknown',
      component: symptom.component as string | undefined,
      timestamp: (symptom.timestamp as number) || Date.now(),
      metadata: symptom.metadata as Record<string, unknown> | undefined
    }
  })

  // Validate metrics
  const metrics: Metric[] = Array.isArray(obj.metrics) 
    ? (obj.metrics as unknown[]).map((m, i) => {
        const metric = m as Record<string, unknown>
        return {
          id: (metric.id as string) || `metric-${i}`,
          name: (metric.name as string) || 'unknown',
          value: (metric.value as number) || 0,
          unit: (metric.unit as string) || '',
          timestamp: (metric.timestamp as number) || Date.now(),
          service: (metric.service as string) || 'unknown',
          tags: metric.tags as Record<string, string> | undefined
        }
      })
    : []

  return {
    id: obj.id as string,
    title: obj.title as string,
    description: (obj.description as string) || '',
    severity: (obj.severity as Incident['severity']) || 'medium',
    timestamp: obj.timestamp as number,
    affectedServices: Array.isArray(obj.affectedServices) 
      ? obj.affectedServices as string[] 
      : [],
    symptoms,
    metrics,
    status: (obj.status as Incident['status']) || 'active'
  }
}
