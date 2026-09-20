/**
 * RCA Knowledge Base API Endpoint
 * GET /api/rca/knowledge - Query knowledge base
 * POST /api/rca/knowledge - Add knowledge
 * 
 * Manages the historical故障 knowledge base
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  IntelligentRCA,
  KnownIssue,
  Incident,
  createIntelligentRCA 
} from '@/lib/performance/root-cause-analysis'

// Singleton RCA instance with persistent knowledge base
let rcaInstance: IntelligentRCA | null = null

function getRCA(): IntelligentRCA {
  if (!rcaInstance) {
    rcaInstance = createIntelligentRCA()
    // Initialize with sample known issues
    initializeKnowledgeBase(rcaInstance)
  }
  return rcaInstance
}

// Initialize knowledge base with sample issues
function initializeKnowledgeBase(rca: IntelligentRCA): void {
  const kb = rca.getKnowledgeBase()
  
  // Add sample known issues
  kb.addKnownIssue({
    id: 'known-1',
    title: 'Database Connection Pool Exhaustion',
    description: 'Connection pool exhausted due to slow queries holding connections too long',
    rootCause: 'Missing database indexes causing full table scans',
    symptoms: ['high_latency', 'connection_timeout', 'error_rate_spike'],
    resolution: 'Add appropriate indexes and optimize slow queries',
    occurrences: 5,
    lastOccurred: Date.now() - 86400000, // 1 day ago
    firstOccurred: Date.now() - 2592000000, // 30 days ago
    tags: ['database', 'performance', 'connection'],
    affectedServices: ['database', 'api-gateway'],
    fixVerified: true
  })

  kb.addKnownIssue({
    id: 'known-2',
    title: 'Memory Leak in Node.js Process',
    description: 'Gradual memory increase leading to performance degradation',
    rootCause: 'Event listener not properly removed',
    symptoms: ['memory_increase', 'slow_response', 'gc_pressure'],
    resolution: 'Fix event listener cleanup in component unmount',
    occurrences: 3,
    lastOccurred: Date.now() - 172800000, // 2 days ago
    firstOccurred: Date.now() - 1209600000, // 14 days ago
    tags: ['memory', 'nodejs', 'performance'],
    affectedServices: ['api-gateway', 'user-service'],
    fixVerified: true
  })

  kb.addKnownIssue({
    id: 'known-3',
    title: 'N+1 Query Problem',
    description: 'Excessive database queries due to missing eager loading',
    rootCause: 'ORM relationship not properly loaded',
    symptoms: ['high_db_load', 'slow_api_response', 'timeout_errors'],
    resolution: 'Add eager loading for frequently accessed relationships',
    occurrences: 8,
    lastOccurred: Date.now() - 43200000, // 12 hours ago
    firstOccurred: Date.now() - 5184000000, // 60 days ago
    tags: ['database', 'orm', 'performance'],
    affectedServices: ['user-service', 'order-service'],
    fixVerified: true
  })
}

// GET - Query knowledge base
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const tags = searchParams.get('tags')
    const service = searchParams.get('service')
    
    const rca = getRCA()
    const kb = rca.getKnowledgeBase()
    let issues = kb.getAll()

    // Filter by query
    if (query) {
      const queryLower = query.toLowerCase()
      issues = issues.filter(issue => 
        issue.title.toLowerCase().includes(queryLower) ||
        issue.description.toLowerCase().includes(queryLower) ||
        issue.rootCause.toLowerCase().includes(queryLower)
      )
    }

    // Filter by tags
    if (tags) {
      const tagList = tags.split(',').map(t => t.trim().toLowerCase())
      issues = issues.filter(issue =>
        issue.tags.some(t => tagList.includes(t.toLowerCase()))
      )
    }

    // Filter by service
    if (service) {
      issues = issues.filter(issue =>
        issue.affectedServices.includes(service)
      )
    }

    return NextResponse.json({
      success: true,
      count: issues.length,
      issues
    })
  } catch (error) {
    console.error('Knowledge Base Query Error:', error)
    return NextResponse.json(
      { error: 'Failed to query knowledge base' },
      { status: 500 }
    )
  }
}

// POST - Add knowledge
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.title || !body.rootCause || !body.resolution) {
      return NextResponse.json(
        { error: 'Missing required fields: title, rootCause, resolution' },
        { status: 400 }
      )
    }

    const issue: KnownIssue = {
      id: body.id || `issue-${Date.now()}`,
      title: body.title,
      description: body.description || '',
      rootCause: body.rootCause,
      symptoms: Array.isArray(body.symptoms) ? body.symptoms : [],
      resolution: body.resolution,
      occurrences: body.occurrences || 1,
      lastOccurred: body.lastOccurred || Date.now(),
      firstOccurred: body.firstOccurred || Date.now(),
      tags: Array.isArray(body.tags) ? body.tags : [],
      affectedServices: Array.isArray(body.affectedServices) ? body.affectedServices : [],
      fixVerified: body.fixVerified || false
    }

    const rca = getRCA()
    const kb = rca.getKnowledgeBase()
    kb.addKnownIssue(issue)

    return NextResponse.json({
      success: true,
      message: 'Knowledge added successfully',
      issue
    })
  } catch (error) {
    console.error('Knowledge Base Add Error:', error)
    return NextResponse.json(
      { error: 'Failed to add knowledge' },
      { status: 500 }
    )
  }
}

// PUT - Learn from incident resolution
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.incident || !body.resolution) {
      return NextResponse.json(
        { error: 'Missing required fields: incident, resolution' },
        { status: 400 }
      )
    }

    const incident: Incident = {
      id: body.incident.id || `incident-${Date.now()}`,
      title: body.incident.title || 'Unknown Incident',
      description: body.incident.description || '',
      severity: body.incident.severity || 'medium',
      timestamp: body.incident.timestamp || Date.now(),
      affectedServices: body.incident.affectedServices || [],
      symptoms: body.incident.symptoms || [],
      metrics: body.incident.metrics || [],
      status: 'resolved'
    }

    const resolution = {
      id: `resolution-${Date.now()}`,
      incidentId: incident.id,
      solution: body.resolution.solution || '',
      timestamp: Date.now(),
      resolvedBy: body.resolution.resolvedBy || 'system',
      verificationSteps: body.resolution.verificationSteps || [],
      outcome: body.resolution.outcome || 'success'
    }

    const rca = getRCA()
    rca.getKnowledgeBase().learnFromIncident(incident, resolution)

    return NextResponse.json({
      success: true,
      message: 'Learned from incident successfully'
    })
  } catch (error) {
    console.error('Knowledge Base Learn Error:', error)
    return NextResponse.json(
      { error: 'Failed to learn from incident' },
      { status: 500 }
    )
  }
}

// DELETE - Clear knowledge base (for testing)
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const issueId = searchParams.get('id')
    
    const rca = getRCA()
    const kb = rca.getKnowledgeBase()

    if (issueId) {
      // For now, we don't have a delete method in FaultKnowledgeBase
      // This would require adding that functionality
      return NextResponse.json(
        { error: 'Delete by ID not implemented yet' },
        { status: 501 }
      )
    }

    // Clear all if no ID specified
    kb.clear()
    
    return NextResponse.json({
      success: true,
      message: 'Knowledge base cleared'
    })
  } catch (error) {
    console.error('Knowledge Base Delete Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete knowledge' },
      { status: 500 }
    )
  }
}
