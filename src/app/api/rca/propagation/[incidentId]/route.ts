/**
 * RCA Propagation Chain API Endpoint
 * GET /api/rca/propagation/[incidentId]
 * 
 * Returns the fault propagation chain for an incident
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  IntelligentRCA,
  Symptom,
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
    const searchParams = request.nextUrl.searchParams
    
    // Get symptoms from query params or use sample
    const symptoms = parseSymptomsFromQuery(searchParams)
    
    if (symptoms.length === 0) {
      // Use sample symptoms for testing
      const sampleSymptoms = createSampleSymptoms()
      const rca = getRCA()
      const propagationChain = rca.analyzePropagationChain(sampleSymptoms)
      
      return NextResponse.json({
        success: true,
        incidentId,
        propagationChain
      })
    }

    const rca = getRCA()
    const propagationChain = rca.analyzePropagationChain(symptoms)

    return NextResponse.json({
      success: true,
      incidentId,
      propagationChain
    })
  } catch (error) {
    console.error('Propagation Chain Analysis Error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze propagation chain' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.symptoms || !Array.isArray(body.symptoms)) {
      return NextResponse.json(
        { error: 'Invalid symptoms data' },
        { status: 400 }
      )
    }

    const symptoms: Symptom[] = body.symptoms.map((s: Record<string, unknown>, i: number) => ({
      id: (s.id as string) || `symptom-${i}`,
      type: (s.type as Symptom['type']) || 'custom',
      name: (s.name as string) || 'unknown',
      description: (s.description as string) || '',
      value: (s.value as number) || 0,
      threshold: (s.threshold as number) || 0,
      unit: (s.unit as string) || '',
      service: (s.service as string) || 'unknown',
      component: s.component as string | undefined,
      timestamp: (s.timestamp as number) || Date.now(),
      metadata: s.metadata as Record<string, unknown> | undefined
    }))

    const rca = getRCA()
    const propagationChain = rca.analyzePropagationChain(symptoms)

    return NextResponse.json({
      success: true,
      propagationChain
    })
  } catch (error) {
    console.error('Propagation Chain Analysis Error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze propagation chain' },
      { status: 500 }
    )
  }
}

// Parse symptoms from query parameters
function parseSymptomsFromQuery(params: URLSearchParams): Symptom[] {
  const symptomsData = params.get('symptoms')
  
  if (!symptomsData) {
    return []
  }

  try {
    const parsed = JSON.parse(symptomsData)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.map((s, i) => ({
      id: s.id || `symptom-${i}`,
      type: s.type || 'custom',
      name: s.name || 'unknown',
      description: s.description || '',
      value: s.value || 0,
      threshold: s.threshold || 0,
      unit: s.unit || '',
      service: s.service || 'unknown',
      component: s.component,
      timestamp: s.timestamp || Date.now(),
      metadata: s.metadata
    }))
  } catch {
    return []
  }
}

// Create sample symptoms for testing
function createSampleSymptoms(): Symptom[] {
  const now = Date.now()
  
  return [
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
    },
    {
      id: 'symptom-4',
      type: 'resource',
      name: 'cpu_usage',
      description: 'CPU usage high',
      value: 92,
      threshold: 80,
      unit: '%',
      service: 'database',
      timestamp: now - 285000
    }
  ]
}
