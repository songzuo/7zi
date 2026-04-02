/**
 * Intelligent Root Cause Analysis (v1.9.0)
 * 
 * Advanced automated root cause analysis with:
 * - Intelligent fault localization
 * - Fault propagation chain modeling
 * - Correlation analysis
 * - Knowledge base integration
 * - Automated diagnostic workflow
 */

import { 
  RootCause, 
  RootCauseType, 
  Severity, 
  SeverityLevel,
  AnalysisReport,
  CorrelationEngine,
  Correlation,
  CorrelationConfig,
  DEFAULT_CORRELATION_CONFIG,
  CausalityAnalyzer,
  CausalityConfig,
  DEFAULT_CAUSALITY_CONFIG,
  CausalChain,
  TimeSeriesPoint,
  CallChainTracer,
  CallChainConfig,
  DEFAULT_CALL_CHAIN_CONFIG
} from './index'
import { IncrementalZScore } from '../anomaly-detection'

// ============================================================================
// Types
// ============================================================================

/**
 * Incident - A fault event requiring analysis
 */
export interface Incident {
  id: string
  title: string
  description: string
  severity: SeverityLevel
  timestamp: number
  affectedServices: string[]
  symptoms: Symptom[]
  metrics: Metric[]
  status: 'active' | 'investigating' | 'resolved' | 'recurring'
}

/**
 * Symptom - Observable anomaly or issue
 */
export interface Symptom {
  id: string
  type: 'error' | 'latency' | 'resource' | 'availability' | 'custom'
  name: string
  description: string
  value: number
  threshold: number
  unit: string
  service: string
  component?: string
  timestamp: number
  metadata?: Record<string, unknown>
}

/**
 * Metric - Performance or system metric
 */
export interface Metric {
  id: string
  name: string
  value: number
  unit: string
  timestamp: number
  service: string
  tags?: Record<string, string>
}

/**
 * Root Cause Report - Complete analysis result
 */
export interface RootCauseReport {
  incidentId: string
  timestamp: number
  analysisDuration: number
  rootCauses: RootCause[]
  propagationChain?: PropagationChain
  correlations: Correlation[]
  recommendations: Recommendation[]
  knowledgeBaseMatches: KnownIssue[]
  confidence: number
  status: 'completed' | 'partial' | 'failed'
}

/**
 * Propagation Chain - Fault propagation visualization
 */
export interface PropagationChain {
  nodes: PropagationNode[]
  edges: PropagationEdge[]
  rootCause: string
  impactScope: string[]
  analysisTime: number
}

/**
 * Node in propagation chain
 */
export interface PropagationNode {
  id: string
  type: 'service' | 'component' | 'resource'
  name: string
  health: number // 0-100
  isRootCause: boolean
  metadata?: Record<string, unknown>
}

/**
 * Edge in propagation chain
 */
export interface PropagationEdge {
  from: string
  to: string
  latency: number // ms
  errorRate: number // 0-1
  correlation: number // 0-1
  isActive: boolean
}

/**
 * Correlation between metrics
 */
export interface Correlation {
  id: string
  type: 'positive' | 'negative' | 'temporal' | 'causal'
  sourceMetric: string
  targetMetric: string
  strength: number // 0-1
  lag?: number // time lag in ms
  confidence: number
  description: string
}

/**
 * Recommendation for fixing the issue
 */
export interface Recommendation {
  id: string
  priority: number // 1-10
  title: string
  description: string
  actionItems: string[]
  estimatedImpact: string
  estimatedTime: string
  complexity: 'low' | 'medium' | 'high'
  risk: 'low' | 'medium' | 'high'
  rootCauseId?: string
}

/**
 * Known Issue - Historical故障 from knowledge base
 */
export interface KnownIssue {
  id: string
  title: string
  description: string
  rootCause: string
  symptoms: string[]
  resolution: string
  occurrences: number
  lastOccurred: number
  firstOccurred: number
  tags: string[]
  affectedServices: string[]
  fixVerified: boolean
}

/**
 * Resolution - Solution to an incident
 */
export interface Resolution {
  id: string
  incidentId: string
  solution: string
  timestamp: number
  resolvedBy: string
  verificationSteps: string[]
  outcome: 'success' | 'partial' | 'failed'
}

// ============================================================================
// Knowledge Base
// ============================================================================

/**
 * Historical故障 Knowledge Base
 */
export class FaultKnowledgeBase {
  private issues: Map<string, KnownIssue> = new Map()
  private similarityThreshold = 0.7

  /**
   * Add a known issue to the knowledge base
   */
  addKnownIssue(issue: KnownIssue): void {
    this.issues.set(issue.id, issue)
  }

  /**
   * Find similar incidents from history
   */
  findSimilar(incident: Incident): KnownIssue[] {
    const similar: Array<{ issue: KnownIssue; score: number }> = []

    for (const issue of this.issues.values()) {
      const score = this.calculateSimilarity(incident, issue)
      if (score >= this.similarityThreshold) {
        similar.push({ issue, score })
      }
    }

    // Sort by score descending
    similar.sort((a, b) => b.score - a.score)
    return similar.map(s => s.issue)
  }

  /**
   * Learn from a new incident and its resolution
   */
  learnFromIncident(incident: Incident, resolution: Resolution): void {
    if (resolution.outcome !== 'success') {
      return
    }

    const issue: KnownIssue = {
      id: `issue-${incident.id}`,
      title: incident.title,
      description: incident.description,
      rootCause: resolution.solution,
      symptoms: incident.symptoms.map(s => s.name),
      resolution: resolution.solution,
      occurrences: 1,
      lastOccurred: incident.timestamp,
      firstOccurred: incident.timestamp,
      tags: incident.affectedServices,
      affectedServices: incident.affectedServices,
      fixVerified: resolution.outcome === 'success'
    }

    this.addKnownIssue(issue)
  }

  /**
   * Get all known issues
   */
  getAll(): KnownIssue[] {
    return Array.from(this.issues.values())
  }

  /**
   * Get issue by ID
   */
  getById(id: string): KnownIssue | undefined {
    return this.issues.get(id)
  }

  /**
   * Clear knowledge base
   */
  clear(): void {
    this.issues.clear()
  }

  /**
   * Calculate similarity between incident and known issue
   */
  private calculateSimilarity(incident: Incident, issue: KnownIssue): number {
    let score = 0
    let factors = 0

    // Check affected services overlap
    const serviceOverlap = incident.affectedServices.filter(s => 
      issue.affectedServices.includes(s)
    ).length
    if (issue.affectedServices.length > 0) {
      score += serviceOverlap / issue.affectedServices.length
      factors++
    }

    // Check symptom similarity
    const incidentSymptoms = incident.symptoms.map(s => s.name.toLowerCase())
    const symptomMatch = issue.symptoms.filter(s => 
      incidentSymptoms.some(is => is.includes(s.toLowerCase()) || s.toLowerCase().includes(is))
    ).length
    if (issue.symptoms.length > 0) {
      score += symptomMatch / issue.symptoms.length
      factors++
    }

    // Check title/description similarity
    const titleWords = incident.title.toLowerCase().split(/\s+/)
    const descWords = incident.description.toLowerCase().split(/\s+/)
    const issueWords = (issue.title + ' ' + issue.description).toLowerCase().split(/\s+/)
    
    const titleMatch = titleWords.filter(w => w.length > 3 && issueWords.includes(w)).length
    const descMatch = descWords.filter(w => w.length > 3 && issueWords.includes(w)).length
    
    if (titleWords.length > 0) {
      score += titleMatch / titleWords.length
      factors++
    }
    if (descWords.length > 0) {
      score += descMatch / descWords.length
      factors++
    }

    return factors > 0 ? score / factors : 0
  }
}

// ============================================================================
// Intelligent Root Cause Analyzer
// ============================================================================

/**
 * Intelligent RCA - Advanced root cause analysis with automation
 */
export class IntelligentRCA {
  private knowledgeBase: FaultKnowledgeBase
  private correlationEngine: CorrelationEngine
  private causalityAnalyzer: CausalityAnalyzer
  private callChainTracer: CallChainTracer
  private zScoreDetectors: Map<string, IncrementalZScore> = new Map()
  private config: RCAConfig

  constructor(config?: Partial<RCAConfig>) {
    this.config = { ...DEFAULT_RCA_CONFIG, ...config }
    this.knowledgeBase = new FaultKnowledgeBase()
    this.correlationEngine = new CorrelationEngine(this.config.correlation)
    this.causalityAnalyzer = new CausalityAnalyzer(this.config.causality)
    this.callChainTracer = new CallChainTracer(this.config.callChain)
  }

  /**
   * Main analysis method - performs complete RCA
   */
  async analyze(incident: Incident): Promise<RootCauseReport> {
    const startTime = Date.now()
    
    try {
      // Step 1: Collect relevant metrics
      const relevantMetrics = await this.collectMetrics(incident)
      
      // Step 2: Perform correlation analysis
      const correlations = this.findCorrelations(relevantMetrics)
      
      // Step 3: Analyze propagation chain
      const propagationChain = this.analyzePropagationChain(incident.symptoms)
      
      // Step 4: Find root causes using existing analyzers
      const rootCauses = await this.findRootCauses(incident, relevantMetrics, propagationChain)
      
      // Step 5: Generate recommendations
      const recommendations = this.generateRecommendationsFromRootCauses(rootCauses)
      
      // Step 6: Query knowledge base for similar issues
      const knowledgeBaseMatches = this.knowledgeBase.findSimilar(incident)
      
      const analysisDuration = Date.now() - startTime
      
      return {
        incidentId: incident.id,
        timestamp: Date.now(),
        analysisDuration,
        rootCauses,
        propagationChain,
        correlations,
        recommendations,
        knowledgeBaseMatches,
        confidence: this.calculateConfidence(rootCauses, correlations),
        status: rootCauses.length > 0 ? 'completed' : 'partial'
      }
    } catch (error) {
      return {
        incidentId: incident.id,
        timestamp: Date.now(),
        analysisDuration: Date.now() - startTime,
        rootCauses: [],
        correlations: [],
        recommendations: [],
        knowledgeBaseMatches: [],
        confidence: 0,
        status: 'failed'
      }
    }
  }

  /**
   * Analyze fault propagation chain
   */
  analyzePropagationChain(symptoms: Symptom[]): PropagationChain {
    const nodes: PropagationNode[] = []
    const edges: PropagationEdge[] = []
    const serviceMap = new Map<string, Set<string>>()

    // Build nodes from symptoms
    for (const symptom of symptoms) {
      // Add service node
      if (!serviceMap.has(symptom.service)) {
        serviceMap.set(symptom.service, new Set())
        nodes.push({
          id: `service-${symptom.service}`,
          type: 'service',
          name: symptom.service,
          health: this.calculateHealth(symptom),
          isRootCause: false
        })
      }

      // Add component node if present
      if (symptom.component) {
        const componentId = `component-${symptom.component}`
        if (!nodes.find(n => n.id === componentId)) {
          nodes.push({
            id: componentId,
            type: 'component',
            name: symptom.component,
            health: this.calculateHealth(symptom),
            isRootCause: false
          })
        }
        serviceMap.get(symptom.service)!.add(symptom.component)
      }
    }

    // Build edges based on symptom relationships
    for (let i = 0; i < symptoms.length; i++) {
      for (let j = i + 1; j < symptoms.length; j++) {
        const s1 = symptoms[i]
        const s2 = symptoms[j]
        
        if (s1.service !== s2.service || s1.component !== s2.component) {
          // Check for temporal correlation
          const timeDiff = Math.abs(s1.timestamp - s2.timestamp)
          if (timeDiff < this.config.propagationTimeWindow) {
            edges.push({
              from: s1.component 
                ? `component-${s1.component}` 
                : `service-${s1.service}`,
              to: s2.component 
                ? `component-${s2.component}` 
                : `service-${s2.service}`,
              latency: timeDiff,
              errorRate: this.calculateErrorRate(s1, s2),
              correlation: 1 - (timeDiff / this.config.propagationTimeWindow),
              isActive: true
            })
          }
        }
      }
    }

    // Identify potential root cause nodes (lowest health that's not leaf)
    const rootCauseNode = this.identifyRootCauseNode(nodes, edges)
    if (rootCauseNode) {
      const node = nodes.find(n => n.id === rootCauseNode)
      if (node) {
        node.isRootCause = true
      }
    }

    return {
      nodes,
      edges,
      rootCause: rootCauseNode || 'unknown',
      impactScope: Array.from(serviceMap.keys()),
      analysisTime: Date.now()
    }
  }

  /**
   * Find correlations between metrics
   */
  findCorrelations(metrics: Metric[]): Correlation[] {
    const correlations: Correlation[] = []
    const metricGroups = new Map<string, Metric[]>()

    // Group metrics by name
    for (const metric of metrics) {
      const group = metricGroups.get(metric.name) || []
      group.push(metric)
      metricGroups.set(metric.name, group)
    }

    // Calculate correlations between different metric groups
    const metricNames = Array.from(metricGroups.keys())
    for (let i = 0; i < metricNames.length; i++) {
      for (let j = i + 1; j < metricNames.length; j++) {
        const name1 = metricNames[i]
        const name2 = metricNames[j]
        const group1 = metricGroups.get(name1)!
        const group2 = metricGroups.get(name2)!

        const correlation = this.calculateMetricCorrelation(group1, group2)
        if (Math.abs(correlation.strength) >= this.config.correlationThreshold) {
          correlations.push(correlation)
        }
      }
    }

    return correlations
  }

  /**
   * Generate recommendations based on root causes
   */
  generateRecommendations(rootCause: RootCause): Recommendation[] {
    const recommendations: Recommendation[] = []

    // Generate recommendations based on root cause type
    switch (rootCause.type) {
      case 'database':
        recommendations.push({
          id: `rec-${rootCause.id}-db`,
          priority: 10 - rootCause.priority + 1,
          title: 'Database Optimization Required',
          description: rootCause.description,
          actionItems: [
            'Analyze slow query logs',
            'Add appropriate indexes',
            'Optimize query execution plans',
            'Consider query caching'
          ],
          estimatedImpact: 'High - 50-80% performance improvement',
          estimatedTime: rootCause.estimatedFixTime,
          complexity: 'medium',
          risk: 'medium',
          rootCauseId: rootCause.id
        })
        break

      case 'api':
        recommendations.push({
          id: `rec-${rootCause.id}-api`,
          priority: 10 - rootCause.priority + 1,
          title: 'API Performance Optimization',
          description: rootCause.description,
          actionItems: [
            'Implement response caching',
            'Add request rate limiting',
            'Optimize payload size',
            'Consider async processing'
          ],
          estimatedImpact: 'High - 40-60% response time reduction',
          estimatedTime: rootCause.estimatedFixTime,
          complexity: 'low',
          risk: 'low',
          rootCauseId: rootCause.id
        })
        break

      case 'rendering':
        recommendations.push({
          id: `rec-${rootCause.id}-render`,
          priority: 10 - rootCause.priority + 1,
          title: 'Rendering Performance Optimization',
          description: rootCause.description,
          actionItems: [
            'Implement code splitting',
            'Optimize component re-renders',
            'Use virtualization for long lists',
            'Optimize images and assets'
          ],
          estimatedImpact: 'Medium - 30-50% improvement',
          estimatedTime: rootCause.estimatedFixTime,
          complexity: 'medium',
          risk: 'low',
          rootCauseId: rootCause.id
        })
        break

      case 'resource':
        recommendations.push({
          id: `rec-${rootCause.id}-resource`,
          priority: 10 - rootCause.priority + 1,
          title: 'Resource Management Optimization',
          description: rootCause.description,
          actionItems: [
            'Review resource allocation',
            'Implement auto-scaling',
            'Add resource caching',
            'Optimize memory usage'
          ],
          estimatedImpact: 'High - Depends on resource type',
          estimatedTime: rootCause.estimatedFixTime,
          complexity: 'high',
          risk: 'medium',
          rootCauseId: rootCause.id
        })
        break

      default:
        recommendations.push({
          id: `rec-${rootCause.id}-general`,
          priority: 5,
          title: 'General Performance Review',
          description: rootCause.description,
          actionItems: [
            'Collect more detailed metrics',
            'Review recent changes',
            'Check system logs'
          ],
          estimatedImpact: 'Variable',
          estimatedTime: '1-2 hours',
          complexity: 'low',
          risk: 'low',
          rootCauseId: rootCause.id
        })
    }

    // Add fix recommendations from the root cause analysis
    for (const fix of rootCause.fixRecommendations) {
      recommendations.push({
        id: `rec-${rootCause.id}-${fix.id}`,
        priority: 10 - rootCause.priority + 1,
        title: fix.title,
        description: fix.description,
        actionItems: fix.actionItems,
        estimatedImpact: 'High',
        estimatedTime: fix.estimatedTime,
        complexity: fix.complexity,
        risk: fix.risk,
        rootCauseId: rootCause.id
      })
    }

    return recommendations
  }

  /**
   * Get knowledge base instance
   */
  getKnowledgeBase(): FaultKnowledgeBase {
    return this.knowledgeBase
  }

  /**
   * Set knowledge base (for persistence)
   */
  setKnowledgeBase(kb: FaultKnowledgeBase): void {
    this.knowledgeBase = kb
  }

  // Private helper methods

  private async collectMetrics(incident: Incident): Promise<Metric[]> {
    // Use provided metrics or collect from symptoms
    return incident.metrics.length > 0 
      ? incident.metrics 
      : incident.symptoms.map(s => ({
          id: s.id,
          name: s.name,
          value: s.value,
          unit: s.unit,
          timestamp: s.timestamp,
          service: s.service,
          tags: s.component ? { component: s.component } : undefined
        }))
  }

  private async findRootCauses(
    incident: Incident,
    metrics: Metric[],
    propagationChain: PropagationChain
  ): Promise<RootCause[]> {
    const rootCauses: RootCause[] = []

    // Analyze based on symptoms
    for (const symptom of incident.symptoms) {
      const rootCause = this.analyzeSymptom(symptom, propagationChain)
      if (rootCause) {
        rootCauses.push(rootCause)
      }
    }

    // Use causality analyzer for deeper analysis
    // First, add data points to causality analyzer
    const timeSeriesPoints: TimeSeriesPoint[] = metrics.map(m => ({
      timestamp: m.timestamp,
      value: m.value,
      metric: m.name,
      tags: m.tags
    }))
    
    // Add data points
    this.causalityAnalyzer.addDataPoints(timeSeriesPoints)
    
    // Analyze causal chains
    const chains: CausalityChain[] = []
    const availableMetrics = this.causalityAnalyzer.getAvailableMetrics()
    for (const metric of availableMetrics.slice(0, 3)) {
      const metricTimeSeries = this.causalityAnalyzer.getTimeSeries(metric)
      if (metricTimeSeries.length > 0) {
        const lastTimestamp = metricTimeSeries[metricTimeSeries.length - 1]?.timestamp || Date.now()
        const metricChains = this.causalityAnalyzer.analyzeCausalChains(metric, lastTimestamp)
        chains.push(...metricChains)
      }
    }

    // Add causal root causes
    for (const chain of chains.slice(0, 3)) {
      const rootCauseNode = chain.rootCause
      const timeline = chain.timeline
      
      rootCauses.push({
        id: `causal-${chain.id}`,
        type: this.inferRootCauseTypeFromMetric(rootCauseNode.metric),
        severity: { level: 'high', score: 80, label: 'High' },
        confidence: chain.confidence,
        title: `Causal: ${rootCauseNode.metric}`,
        description: `Causal chain detected starting from ${rootCauseNode.metric}`,
        evidence: [
          `Root cause: ${rootCauseNode.metric} = ${rootCauseNode.value}`,
          `Change: ${rootCauseNode.percentage.toFixed(2)}%`,
          `Timeline: ${timeline.duration}ms`
        ],
        impact: { 
          userExperience: 'Degraded due to causal chain',
          performance: 'Multiple metrics affected'
        },
        fixRecommendations: [],
        estimatedFixTime: '2-4 hours',
        priority: 7,
        detectedAt: chain.rootCause.timestamp
      })
    }

    // Sort by confidence and priority
    rootCauses.sort((a, b) => {
      const scoreA = a.confidence * (11 - a.priority)
      const scoreB = b.confidence * (11 - b.priority)
      return scoreB - scoreA
    })

    return rootCauses.slice(0, 5) // Return top 5 root causes
  }

  private analyzeSymptom(symptom: Symptom, chain: PropagationChain): RootCause | null {
    // Determine root cause type based on symptom
    let type: RootCauseType = 'resource'
    
    if (symptom.type === 'error') {
      type = 'api'
    } else if (symptom.type === 'latency') {
      type = 'rendering'
    } else if (symptom.type === 'resource') {
      type = 'resource'
    }

    const severity = this.mapSeverity(symptom)
    const isRootCause = chain.nodes.find(n => n.name === symptom.service)?.isRootCause

    // Only create root cause if confidence is high enough
    const deviation = Math.abs(symptom.value - symptom.threshold) / symptom.threshold
    if (deviation < 0.1 && !isRootCause) {
      return null
    }

    return {
      id: `rc-${symptom.id}`,
      type,
      severity,
      confidence: Math.min(0.9, deviation + 0.3),
      title: `${type} issue in ${symptom.service}`,
      description: `${symptom.name}: ${symptom.value}${symptom.unit} exceeded threshold of ${symptom.threshold}${symptom.unit}`,
      evidence: [
        `Symptom: ${symptom.name}`,
        `Value: ${symptom.value}${symptom.unit}`,
        `Threshold: ${symptom.threshold}${symptom.unit}`,
        `Service: ${symptom.service}`,
        `Component: ${symptom.component || 'N/A'}`
      ],
      impact: {
        userExperience: `Degraded due to ${symptom.type}`,
        performance: `${symptom.type === 'latency' ? 'High' : 'Medium'} impact`
      },
      fixRecommendations: [],
      estimatedFixTime: '1-2 hours',
      priority: isRootCause ? 9 : 6,
      detectedAt: symptom.timestamp
    }
  }

  private mapSeverity(symptom: Symptom): Severity {
    const ratio = symptom.value / symptom.threshold
    if (ratio >= 2) {
      return { level: 'critical', score: 95, label: 'Critical' }
    } else if (ratio >= 1.5) {
      return { level: 'high', score: 75, label: 'High' }
    } else if (ratio >= 1.2) {
      return { level: 'medium', score: 50, label: 'Medium' }
    } else {
      return { level: 'low', score: 25, label: 'Low' }
    }
  }

  private calculateHealth(symptom: Symptom): number {
    const ratio = symptom.threshold / symptom.value
    return Math.max(0, Math.min(100, ratio * 100))
  }

  private identifyRootCauseNode(nodes: PropagationNode[], edges: PropagationEdge[]): string | null {
    // Find node with no incoming edges (root)
    const hasIncoming = new Set(edges.map(e => e.to))
    const rootCandidates = nodes.filter(n => !hasIncoming.has(n.id))
    
    if (rootCandidates.length > 0) {
      // Return the one with lowest health
      rootCandidates.sort((a, b) => a.health - b.health)
      return rootCandidates[0].id
    }

    // Fallback: return lowest health node
    if (nodes.length > 0) {
      nodes.sort((a, b) => a.health - b.health)
      return nodes[0].id
    }

    return null
  }

  private calculateErrorRate(s1: Symptom, s2: Symptom): number {
    // Calculate error rate based on symptom values
    const e1 = s1.type === 'error' ? s1.value : 0
    const e2 = s2.type === 'error' ? s2.value : 0
    return Math.min(1, (e1 + e2) / 100)
  }

  private calculateMetricCorrelation(group1: Metric[], group2: Metric[]): Correlation {
    // Simple Pearson correlation
    const values1 = group1.map(m => m.value)
    const values2 = group2.map(m => m.value)
    const n = Math.min(values1.length, values2.length)
    
    if (n < 2) {
      return {
        id: `corr-${group1[0]?.name}-${group2[0]?.name}`,
        type: 'temporal',
        sourceMetric: group1[0]?.name || '',
        targetMetric: group2[0]?.name || '',
        strength: 0,
        confidence: 0,
        description: 'Insufficient data for correlation'
      }
    }

    // Calculate Pearson correlation coefficient
    const mean1 = values1.slice(0, n).reduce((a, b) => a + b, 0) / n
    const mean2 = values2.slice(0, n).reduce((a, b) => a + b, 0) / n
    
    let numerator = 0
    let denom1 = 0
    let denom2 = 0
    
    for (let i = 0; i < n; i++) {
      const d1 = values1[i] - mean1
      const d2 = values2[i] - mean2
      numerator += d1 * d2
      denom1 += d1 * d1
      denom2 += d2 * d2
    }
    
    const strength = denom1 * denom2 > 0 
      ? numerator / Math.sqrt(denom1 * denom2) 
      : 0

    return {
      id: `corr-${group1[0].name}-${group2[0].name}`,
      type: strength > 0 ? 'positive' : strength < 0 ? 'negative' : 'temporal',
      sourceMetric: group1[0].name,
      targetMetric: group2[0].name,
      strength: Math.abs(strength),
      confidence: n > 10 ? 0.9 : n > 5 ? 0.7 : 0.5,
      description: `${group1[0].name} and ${group2[0].name} have ${strength > 0 ? 'positive' : 'negative'} correlation`
    }
  }

  private generateRecommendationsFromRootCauses(rootCauses: RootCause[]): Recommendation[] {
    const recommendations: Recommendation[] = []
    
    for (const rc of rootCauses) {
      const recs = this.generateRecommendations(rc)
      recommendations.push(...recs)
    }

    // Sort by priority
    recommendations.sort((a, b) => b.priority - a.priority)
    return recommendations.slice(0, 10)
  }

  private calculateConfidence(rootCauses: RootCause[], correlations: Correlation[]): number {
    if (rootCauses.length === 0) return 0
    
    let totalConfidence = 0
    for (const rc of rootCauses) {
      totalConfidence += rc.confidence
    }
    const avgConfidence = totalConfidence / rootCauses.length

    // Boost confidence if correlations found
    const correlationBoost = correlations.length > 0 
      ? Math.min(0.2, correlations.length * 0.05) 
      : 0

    return Math.min(1, avgConfidence + correlationBoost)
  }

  private inferRootCauseTypeFromMetric(metric: string): RootCauseType {
    const metricLower = metric.toLowerCase()
    
    if (metricLower.includes('query') || metricLower.includes('db') || metricLower.includes('sql')) {
      return 'database'
    }
    if (metricLower.includes('api') || metricLower.includes('http') || metricLower.includes('request')) {
      return 'api'
    }
    if (metricLower.includes('render') || metricLower.includes('lcp') || metricLower.includes('fps')) {
      return 'rendering'
    }
    if (metricLower.includes('memory') || metricLower.includes('cpu') || metricLower.includes('resource')) {
      return 'resource'
    }
    
    return 'resource'
  }
}

// ============================================================================
// Configuration
// ============================================================================

export interface RCAConfig {
  correlation: {
    threshold: number
    maxLags: number
    windowSize: number
  }
  causality: {
    maxChainLength: number
    minStrength: number
    timeWindow: number
  }
  callChain: {
    maxDepth: number
    captureMetrics: boolean
  }
  propagationTimeWindow: number
  correlationThreshold: number
}

const DEFAULT_RCA_CONFIG: RCAConfig = {
  correlation: {
    threshold: 0.5,
    maxLags: 5,
    windowSize: 100
  },
  causality: {
    maxChainLength: 10,
    minStrength: 0.5,
    timeWindow: 60000
  },
  callChain: {
    maxDepth: 20,
    captureMetrics: true
  },
  propagationTimeWindow: 5000, // 5 seconds
  correlationThreshold: 0.5
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new IntelligentRCA instance
 */
export function createIntelligentRCA(config?: Partial<RCAConfig>): IntelligentRCA {
  return new IntelligentRCA(config)
}

// ============================================================================
// Export all types
// ============================================================================

export type {
  RCAConfig,
  Incident,
  Symptom,
  Metric,
  RootCauseReport,
  PropagationChain,
  PropagationNode,
  PropagationEdge,
  Correlation,
  Recommendation,
  KnownIssue,
  Resolution
}
