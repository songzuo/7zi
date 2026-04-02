/**
 * Intelligent Root Cause Analysis Tests
 * 
 * Tests for v1.9.0 intelligent故障 analysis capabilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  IntelligentRCA,
  FaultKnowledgeBase,
  createIntelligentRCA,
  Incident,
  Symptom,
  Metric,
  KnownIssue
} from '../IntelligentRCA'

// ============================================================================
// Test Fixtures
// ============================================================================

function createSampleIncident(): Incident {
  const now = Date.now()
  
  return {
    id: 'incident-1',
    title: 'API Latency Spike',
    description: 'API response times increased significantly',
    severity: 'high',
    timestamp: now - 300000,
    affectedServices: ['api-gateway', 'user-service', 'database'],
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
      }
    ],
    status: 'active'
  }
}

function createSampleSymptoms(): Symptom[] {
  const now = Date.now()
  
  return [
    {
      id: 'symptom-1',
      type: 'latency',
      name: 'api_response_time',
      description: 'High API latency',
      value: 2000,
      threshold: 500,
      unit: 'ms',
      service: 'api-gateway',
      timestamp: now
    },
    {
      id: 'symptom-2',
      type: 'latency',
      name: 'db_query_time',
      description: 'High DB query time',
      value: 1500,
      threshold: 200,
      unit: 'ms',
      service: 'database',
      timestamp: now + 100
    }
  ]
}

function createSampleKnownIssue(): KnownIssue {
  return {
    id: 'known-1',
    title: 'Database Slow Query',
    description: 'Slow database queries due to missing indexes',
    rootCause: 'Missing database indexes',
    symptoms: ['high_latency', 'slow_response'],
    resolution: 'Add appropriate indexes',
    occurrences: 5,
    lastOccurred: Date.now() - 86400000,
    firstOccurred: Date.now() - 2592000000,
    tags: ['database', 'performance'],
    affectedServices: ['database', 'api-gateway'],
    fixVerified: true
  }
}

// ============================================================================
// FaultKnowledgeBase Tests
// ============================================================================

describe('FaultKnowledgeBase', () => {
  let kb: FaultKnowledgeBase

  beforeEach(() => {
    kb = new FaultKnowledgeBase()
  })

  describe('addKnownIssue', () => {
    it('should add a known issue to the knowledge base', () => {
      const issue = createSampleKnownIssue()
      kb.addKnownIssue(issue)
      
      const all = kb.getAll()
      expect(all).toHaveLength(1)
      expect(all[0].id).toBe(issue.id)
    })

    it('should overwrite existing issue with same id', () => {
      const issue = createSampleKnownIssue()
      kb.addKnownIssue(issue)
      
      const updatedIssue = { ...issue, occurrences: 10 }
      kb.addKnownIssue(updatedIssue)
      
      const all = kb.getAll()
      expect(all).toHaveLength(1)
      expect(all[0].occurrences).toBe(10)
    })
  })

  describe('findSimilar', () => {
    beforeEach(() => {
      kb.addKnownIssue(createSampleKnownIssue())
    })

    it('should find similar incidents based on affected services', () => {
      const incident: Incident = {
        id: 'test-1',
        title: 'Database Slow Query',
        description: 'Database queries are slow',
        severity: 'medium',
        timestamp: Date.now(),
        affectedServices: ['database', 'api-gateway'],
        symptoms: [{
          id: 's1',
          type: 'latency',
          name: 'high_latency',
          description: 'High latency detected',
          value: 2000,
          threshold: 500,
          unit: 'ms',
          service: 'database',
          timestamp: Date.now()
        }],
        metrics: [],
        status: 'active'
      }

      const similar = kb.findSimilar(incident)
      expect(similar.length).toBeGreaterThan(0)
    })

    it('should return empty array when no similar incidents found', () => {
      const incident: Incident = {
        id: 'test-2',
        title: 'Unrelated Issue',
        description: 'Something completely different',
        severity: 'low',
        timestamp: Date.now(),
        affectedServices: ['payment-service'],
        symptoms: [],
        metrics: [],
        status: 'active'
      }

      const similar = kb.findSimilar(incident)
      expect(similar).toHaveLength(0)
    })
  })

  describe('learnFromIncident', () => {
    it('should learn from successful resolutions', () => {
      const incident = createSampleIncident()
      const resolution = {
        id: 'resolution-1',
        incidentId: incident.id,
        solution: 'Added database indexes',
        timestamp: Date.now(),
        resolvedBy: 'admin',
        verificationSteps: ['Checked query performance'],
        outcome: 'success' as const
      }

      kb.learnFromIncident(incident, resolution)
      
      const all = kb.getAll()
      expect(all.length).toBeGreaterThan(0)
    })

    it('should not learn from failed resolutions', () => {
      const incident = createSampleIncident()
      const resolution = {
        id: 'resolution-2',
        incidentId: incident.id,
        solution: 'Tried fix but failed',
        timestamp: Date.now(),
        resolvedBy: 'admin',
        verificationSteps: [],
        outcome: 'failed' as const
      }

      kb.learnFromIncident(incident, resolution)
      
      const all = kb.getAll()
      expect(all).toHaveLength(0)
    })
  })

  describe('getById', () => {
    it('should return issue by id', () => {
      const issue = createSampleKnownIssue()
      kb.addKnownIssue(issue)
      
      const found = kb.getById(issue.id)
      expect(found).toBeDefined()
      expect(found?.id).toBe(issue.id)
    })

    it('should return undefined for non-existent id', () => {
      const found = kb.getById('non-existent')
      expect(found).toBeUndefined()
    })
  })

  describe('clear', () => {
    it('should clear all issues', () => {
      kb.addKnownIssue(createSampleKnownIssue())
      kb.clear()
      
      expect(kb.getAll()).toHaveLength(0)
    })
  })
})

// ============================================================================
// IntelligentRCA Tests
// ============================================================================

describe('IntelligentRCA', () => {
  let rca: IntelligentRCA

  beforeEach(() => {
    rca = createIntelligentRCA()
  })

  describe('analyze', () => {
    it('should analyze an incident and return a report', async () => {
      const incident = createSampleIncident()
      const report = await rca.analyze(incident)
      
      expect(report).toBeDefined()
      expect(report.incidentId).toBe(incident.id)
      expect(report.timestamp).toBeDefined()
      expect(report.status).toBeDefined()
    })

    it('should identify root causes from symptoms', async () => {
      const incident = createSampleIncident()
      const report = await rca.analyze(incident)
      
      expect(report.rootCauses.length).toBeGreaterThan(0)
    })

    it('should generate recommendations', async () => {
      const incident = createSampleIncident()
      const report = await rca.analyze(incident)
      
      expect(report.recommendations).toBeDefined()
      expect(Array.isArray(report.recommendations)).toBe(true)
    })

    it('should calculate confidence score', async () => {
      const incident = createSampleIncident()
      const report = await rca.analyze(incident)
      
      expect(report.confidence).toBeGreaterThanOrEqual(0)
      expect(report.confidence).toBeLessThanOrEqual(1)
    })

    it('should handle incidents with no symptoms', async () => {
      const incident: Incident = {
        id: 'empty-incident',
        title: 'Empty Incident',
        description: 'No symptoms',
        severity: 'low',
        timestamp: Date.now(),
        affectedServices: [],
        symptoms: [],
        metrics: [],
        status: 'active'
      }
      
      const report = await rca.analyze(incident)
      
      expect(report).toBeDefined()
      expect(report.status).toBe('partial')
    })
  })

  describe('analyzePropagationChain', () => {
    it('should build propagation chain from symptoms', () => {
      const symptoms = createSampleSymptoms()
      const chain = rca.analyzePropagationChain(symptoms)
      
      expect(chain).toBeDefined()
      expect(chain.nodes.length).toBeGreaterThan(0)
      expect(chain.edges).toBeDefined()
    })

    it('should identify root cause node', () => {
      const symptoms = createSampleSymptoms()
      const chain = rca.analyzePropagationChain(symptoms)
      
      expect(chain.rootCause).toBeDefined()
    })

    it('should calculate health for nodes', () => {
      const symptoms = createSampleSymptoms()
      const chain = rca.analyzePropagationChain(symptoms)
      
      for (const node of chain.nodes) {
        expect(node.health).toBeGreaterThanOrEqual(0)
        expect(node.health).toBeLessThanOrEqual(100)
      }
    })

    it('should handle empty symptoms', () => {
      const chain = rca.analyzePropagationChain([])
      
      expect(chain.nodes).toHaveLength(0)
      expect(chain.edges).toHaveLength(0)
      expect(chain.rootCause).toBe('unknown')
    })
  })

  describe('findCorrelations', () => {
    it('should find correlations between metrics', () => {
      const now = Date.now()
      const metrics: Metric[] = [
        { id: 'm1', name: 'cpu', value: 80, unit: '%', timestamp: now, service: 's1' },
        { id: 'm2', name: 'memory', value: 70, unit: '%', timestamp: now, service: 's1' },
        { id: 'm3', name: 'cpu', value: 85, unit: '%', timestamp: now + 1000, service: 's1' },
        { id: 'm4', name: 'memory', value: 75, unit: '%', timestamp: now + 1000, service: 's1' }
      ]

      const correlations = rca.findCorrelations(metrics)
      
      expect(Array.isArray(correlations)).toBe(true)
    })

    it('should handle single metric type', () => {
      const now = Date.now()
      const metrics: Metric[] = [
        { id: 'm1', name: 'cpu', value: 80, unit: '%', timestamp: now, service: 's1' },
        { id: 'm2', name: 'cpu', value: 85, unit: '%', timestamp: now + 1000, service: 's1' }
      ]

      const correlations = rca.findCorrelations(metrics)
      
      // With only one metric type, there are no correlations to find
      expect(correlations).toHaveLength(0)
    })

    it('should handle empty metrics', () => {
      const correlations = rca.findCorrelations([])
      
      expect(correlations).toHaveLength(0)
    })
  })

  describe('generateRecommendations', () => {
    it('should generate recommendations for database root cause', () => {
      const rootCause = {
        id: 'rc-1',
        type: 'database' as const,
        severity: { level: 'high' as const, score: 80, label: 'High' },
        confidence: 0.9,
        title: 'Database Issue',
        description: 'Slow queries detected',
        evidence: [],
        impact: { userExperience: 'Slow', performance: 'Degraded' },
        fixRecommendations: [],
        estimatedFixTime: '1 hour',
        priority: 8,
        detectedAt: Date.now()
      }

      const recommendations = rca.generateRecommendations(rootCause)
      
      expect(recommendations.length).toBeGreaterThan(0)
      expect(recommendations[0].title).toContain('Database')
    })

    it('should generate recommendations for API root cause', () => {
      const rootCause = {
        id: 'rc-2',
        type: 'api' as const,
        severity: { level: 'high' as const, score: 80, label: 'High' },
        confidence: 0.85,
        title: 'API Issue',
        description: 'Slow API responses',
        evidence: [],
        impact: { userExperience: 'Slow', performance: 'Degraded' },
        fixRecommendations: [],
        estimatedFixTime: '30 minutes',
        priority: 7,
        detectedAt: Date.now()
      }

      const recommendations = rca.generateRecommendations(rootCause)
      
      expect(recommendations.length).toBeGreaterThan(0)
      expect(recommendations[0].title).toContain('API')
    })

    it('should include action items in recommendations', () => {
      const rootCause = {
        id: 'rc-3',
        type: 'rendering' as const,
        severity: { level: 'medium' as const, score: 50, label: 'Medium' },
        confidence: 0.7,
        title: 'Rendering Issue',
        description: 'Slow renders',
        evidence: [],
        impact: { userExperience: 'Slow', performance: 'Degraded' },
        fixRecommendations: [],
        estimatedFixTime: '2 hours',
        priority: 5,
        detectedAt: Date.now()
      }

      const recommendations = rca.generateRecommendations(rootCause)
      
      expect(recommendations[0].actionItems.length).toBeGreaterThan(0)
    })
  })

  describe('getKnowledgeBase', () => {
    it('should return the knowledge base instance', () => {
      const kb = rca.getKnowledgeBase()
      
      expect(kb).toBeInstanceOf(FaultKnowledgeBase)
    })

    it('should persist knowledge base across calls', () => {
      const kb = rca.getKnowledgeBase()
      kb.addKnownIssue(createSampleKnownIssue())
      
      const kb2 = rca.getKnowledgeBase()
      expect(kb2.getAll()).toHaveLength(1)
    })
  })
})

// ============================================================================
// Factory Function Tests
// ============================================================================

describe('createIntelligentRCA', () => {
  it('should create an IntelligentRCA instance with default config', () => {
    const rca = createIntelligentRCA()
    
    expect(rca).toBeInstanceOf(IntelligentRCA)
  })

  it('should accept custom configuration', () => {
    const rca = createIntelligentRCA({
      correlationThreshold: 0.7,
      propagationTimeWindow: 10000
    })
    
    expect(rca).toBeInstanceOf(IntelligentRCA)
  })
})

// ============================================================================
// Edge Case Tests
// ============================================================================

describe('Edge Cases', () => {
  let rca: IntelligentRCA

  beforeEach(() => {
    rca = createIntelligentRCA()
  })

  it('should handle very large metric values', async () => {
    const incident: Incident = {
      id: 'large-values',
      title: 'Large Values',
      description: 'Test',
      severity: 'critical',
      timestamp: Date.now(),
      affectedServices: ['service-1'],
      symptoms: [{
        id: 's1',
        type: 'latency',
        name: 'huge_value',
        description: 'Huge value',
        value: Number.MAX_SAFE_INTEGER / 2,
        threshold: 100,
        unit: 'ms',
        service: 'service-1',
        timestamp: Date.now()
      }],
      metrics: [],
      status: 'active'
    }

    const report = await rca.analyze(incident)
    
    expect(report.status).toBeDefined()
    expect(Number.isFinite(report.confidence)).toBe(true)
  })

  it('should handle concurrent analyses', async () => {
    const incidents = Array(5).fill(null).map((_, i) => ({
      ...createSampleIncident(),
      id: `concurrent-${i}`
    }))

    const reports = await Promise.all(
      incidents.map(incident => rca.analyze(incident))
    )

    expect(reports).toHaveLength(5)
    reports.forEach(report => {
      expect(report.status).toBeDefined()
    })
  })

  it('should handle symptoms with missing optional fields', () => {
    const symptoms: Symptom[] = [{
      id: 'minimal',
      type: 'custom',
      name: 'test',
      description: '',
      value: 100,
      threshold: 50,
      unit: 'ms',
      service: 'test-service',
      timestamp: Date.now()
    }]

    const chain = rca.analyzePropagationChain(symptoms)
    
    expect(chain.nodes.length).toBeGreaterThan(0)
  })

  it('should handle symptoms with same timestamp', () => {
    const now = Date.now()
    const symptoms: Symptom[] = [
      {
        id: 's1',
        type: 'latency',
        name: 'metric1',
        description: '',
        value: 100,
        threshold: 50,
        unit: 'ms',
        service: 's1',
        timestamp: now
      },
      {
        id: 's2',
        type: 'latency',
        name: 'metric2',
        description: '',
        value: 200,
        threshold: 50,
        unit: 'ms',
        service: 's2',
        timestamp: now
      }
    ]

    const chain = rca.analyzePropagationChain(symptoms)
    
    expect(chain).toBeDefined()
  })
})
