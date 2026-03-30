/**
 * Call Chain Tracer
 *
 * Traces call chains across modules, APIs, and components
 * to identify performance bottlenecks and dependencies
 */

import { Severity, SeverityLevel } from './types';

// ============================================================================
// Types
// ============================================================================

export interface CallNode {
  id: string;
  type: CallNodeType;
  name: string;
  parent?: string;
  children: string[];
  timestamp: number;
  duration: number;
  status: 'success' | 'error' | 'timeout';
  metadata: CallNodeMetadata;
  metrics: CallNodeMetrics;
}

export type CallNodeType =
  | 'api'
  | 'database'
  | 'function'
  | 'component'
  | 'service'
  | 'external'
  | 'worker'
  | 'cache'
  | 'file'
  | 'network';

export interface CallNodeMetadata {
  module?: string;
  component?: string;
  endpoint?: string;
  method?: string;
  query?: string;
  cacheKey?: string;
  url?: string;
  status?: number;
  error?: string;
  tags?: string[];
  custom?: Record<string, any>;
}

export interface CallNodeMetrics {
  cpu?: number;
  memory?: number;
  io?: number;
  network?: number;
  dbQueries?: number;
  cacheHits?: number;
  cacheMisses?: number;
}

export interface CallChain {
  id: string;
  root: CallNode;
  nodes: Map<string, CallNode>;
  duration: number;
  depth: number;
  breadth: number;
  status: 'success' | 'error' | 'partial' | 'timeout';
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  startedAt: number;
  endedAt: number;
}

export interface CallChainAnalysis {
  chainId: string;
  summary: CallChainSummary;
  bottlenecks: CallBottleneck[];
  hotPaths: HotPath[];
  criticalPath: CriticalPath;
  recommendations: CallChainRecommendation[];
}

export interface CallChainSummary {
  totalCalls: number;
  totalDuration: number;
  avgDuration: number;
  slowestCall: CallNode;
  errorCount: number;
  timeoutCount: number;
  successRate: number;
  dbCalls: number;
  apiCalls: number;
  cacheCalls: number;
}

export interface CallBottleneck {
  id: string;
  node: CallNode;
  type: 'slow' | 'repeated' | 'inefficient' | 'n-plus-1';
  severity: SeverityLevel;
  description: string;
  impact: string;
  contribution: number; // % of total duration
}

export interface HotPath {
  nodes: CallNode[];
  totalDuration: number;
  contribution: number; // % of total duration
  frequency: number;
  description: string;
}

export interface CriticalPath {
  nodes: CallNode[];
  totalDuration: number;
  bottleneckNodes: CallNode[];
  description: string;
}

export interface CallChainRecommendation {
  id: string;
  type: 'optimize' | 'cache' | 'parallelize' | 'refactor' | 'monitor';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionItems: string[];
  estimatedImpact: string;
  affectedNodes: string[];
}

export interface CallChainConfig {
  minDurationThreshold: number; // ms
  slowCallThreshold: number; // ms
  enableAutoTracing: boolean;
  enableHotPathDetection: boolean;
  maxChainDepth: number;
  sampleRate: number; // 0-1
}

export const DEFAULT_CALL_CHAIN_CONFIG: CallChainConfig = {
  minDurationThreshold: 50,
  slowCallThreshold: 500,
  enableAutoTracing: true,
  enableHotPathDetection: true,
  maxChainDepth: 50,
  sampleRate: 1.0
};

// ============================================================================
// Call Chain Tracer
// ============================================================================

/**
 * Call Chain Tracer
 *
 * Traces call chains across modules, APIs, and components
 */
export class CallChainTracer {
  private config: CallChainConfig;
  private activeChains: Map<string, CallChain> = new Map();
  private completedChains: Map<string, CallChain> = new Map();
  private chainHistory: CallChain[] = [];

  constructor(config: Partial<CallChainConfig> = {}) {
    this.config = { ...DEFAULT_CALL_CHAIN_CONFIG, ...config };
  }

  // ============================================================================
// Call Chain Management
  // ============================================================================

  /**
   * Start a new call chain
   */
  startChain(options: {
    traceId?: string;
    spanId?: string;
    parentSpanId?: string;
    name: string;
    type: CallNodeType;
    metadata?: Partial<CallNodeMetadata>;
  }): string {
    const traceId = options.traceId || this.generateTraceId();
    const spanId = options.spanId || this.generateSpanId();

    const root: CallNode = {
      id: spanId,
      type: options.type,
      name: options.name,
      children: [],
      timestamp: Date.now(),
      duration: 0,
      status: 'success',
      metadata: options.metadata || {},
      metrics: {}
    };

    const chain: CallChain = {
      id: traceId,
      root,
      nodes: new Map([[spanId, root]]),
      duration: 0,
      depth: 0,
      breadth: 0,
      status: 'success',
      traceId,
      spanId,
      parentSpanId: options.parentSpanId,
      startedAt: root.timestamp,
      endedAt: 0
    };

    this.activeChains.set(traceId, chain);
    return traceId;
  }

  /**
   * End a call chain
   */
  endChain(chainId: string, status: 'success' | 'error' | 'partial' | 'timeout' = 'success'): void {
    const chain = this.activeChains.get(chainId);
    if (!chain) {
      throw new Error(`Chain ${chainId} not found`);
    }

    const now = Date.now();
    chain.duration = now - chain.startedAt;
    chain.status = status;
    chain.endedAt = now;

    // Recalculate chain properties
    this.recalculateChain(chain);

    // Move to completed
    this.activeChains.delete(chainId);
    this.completedChains.set(chainId, chain);
    this.chainHistory.push(chain);

    // Keep history manageable
    if (this.chainHistory.length > 1000) {
      this.chainHistory = this.chainHistory.slice(-1000);
    }
  }

  /**
   * Add a child node to a chain
   */
  addNode(
    chainId: string,
    parentId: string,
    node: {
      type: CallNodeType;
      name: string;
      metadata?: Partial<CallNodeMetadata>;
      metrics?: Partial<CallNodeMetrics>;
    }
  ): string {
    const chain = this.activeChains.get(chainId);
    if (!chain) {
      throw new Error(`Chain ${chainId} not found`);
    }

    const parent = chain.nodes.get(parentId);
    if (!parent) {
      throw new Error(`Parent node ${parentId} not found`);
    }

    const childId = this.generateSpanId();
    const child: CallNode = {
      id: childId,
      type: node.type,
      name: node.name,
      parent: parentId,
      children: [],
      timestamp: Date.now(),
      duration: 0,
      status: 'success',
      metadata: node.metadata || {},
      metrics: node.metrics || {}
    };

    parent.children.push(childId);
    chain.nodes.set(childId, child);

    return childId;
  }

  /**
   * End a specific node
   */
  endNode(
    chainId: string,
    nodeId: string,
    status: 'success' | 'error' | 'timeout' = 'success',
    metrics?: Partial<CallNodeMetrics>
  ): void {
    const chain = this.activeChains.get(chainId);
    if (!chain) {
      throw new Error(`Chain ${chainId} not found`);
    }

    const node = chain.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    node.duration = Date.now() - node.timestamp;
    node.status = status;

    if (metrics) {
      node.metrics = { ...node.metrics, ...metrics };
    }
  }

  /**
   * Get a call chain
   */
  getChain(chainId: string): CallChain | null {
    return (
      this.activeChains.get(chainId) || this.completedChains.get(chainId) || null
    );
  }

  /**
   * Get all completed chains
   */
  getCompletedChains(filter?: {
    startTime?: number;
    endTime?: number;
    status?: 'success' | 'error' | 'partial' | 'timeout';
  }): CallChain[] {
    let chains = Array.from(this.completedChains.values());

    if (filter) {
      if (filter.startTime !== undefined) {
        const startTime = filter.startTime;
        chains = chains.filter(c => c.startedAt >= startTime);
      }
      if (filter.endTime !== undefined) {
        const endTime = filter.endTime;
        chains = chains.filter(c => c.endedAt <= endTime);
      }
      if (filter.status) {
        chains = chains.filter(c => c.status === filter.status);
      }
    }

    return chains;
  }

  // ============================================================================
  // Call Chain Analysis
  // ============================================================================

  /**
   * Analyze a call chain
   */
  analyzeChain(chainId: string): CallChainAnalysis {
    const chain = this.getChain(chainId);
    if (!chain) {
      throw new Error(`Chain ${chainId} not found`);
    }

    const summary = this.calculateChainSummary(chain);
    const bottlenecks = this.identifyBottlenecks(chain, summary);
    const hotPaths = this.identifyHotPaths(chain);
    const criticalPath = this.identifyCriticalPath(chain);
    const recommendations = this.generateRecommendations(chain, bottlenecks, hotPaths);

    return {
      chainId,
      summary,
      bottlenecks,
      hotPaths,
      criticalPath,
      recommendations
    };
  }

  /**
   * Calculate chain summary
   */
  private calculateChainSummary(chain: CallChain): CallChainSummary {
    const nodes = Array.from(chain.nodes.values());
    const slowest = nodes.reduce((max, node) =>
      node.duration > max.duration ? node : max
    );

    const errorCount = nodes.filter(n => n.status === 'error').length;
    const timeoutCount = nodes.filter(n => n.status === 'timeout').length;

    const dbCalls = nodes.filter(n => n.type === 'database').length;
    const apiCalls = nodes.filter(n => n.type === 'api').length;
    const cacheCalls = nodes.filter(n => n.type === 'cache').length;

    return {
      totalCalls: nodes.length,
      totalDuration: chain.duration,
      avgDuration: nodes.length > 0 ? chain.duration / nodes.length : 0,
      slowestCall: slowest,
      errorCount,
      timeoutCount,
      successRate: nodes.length > 0 ? 1 - (errorCount + timeoutCount) / nodes.length : 1,
      dbCalls,
      apiCalls,
      cacheCalls
    };
  }

  /**
   * Identify bottlenecks
   */
  private identifyBottlenecks(
    chain: CallChain,
    summary: CallChainSummary
  ): CallBottleneck[] {
    const bottlenecks: CallBottleneck[] = [];
    const nodes = Array.from(chain.nodes.values());

    // Slow calls
    for (const node of nodes) {
      if (node.duration > this.config.slowCallThreshold) {
        bottlenecks.push({
          id: `slow-${node.id}`,
          node,
          type: 'slow',
          severity: this.calculateBottleneckSeverity(node.duration, this.config.slowCallThreshold),
          description: `${node.name} took ${node.duration}ms`,
          impact: `Contributes ${((node.duration / chain.duration) * 100).toFixed(1)}% of total duration`,
          contribution: (node.duration / chain.duration) * 100
        });
      }
    }

    // N+1 query pattern
    const dbCallsByParent = this.groupCallsByParent(nodes.filter(n => n.type === 'database'));
    for (const [parentId, calls] of Object.entries(dbCallsByParent)) {
      if (calls.length > 5) {
        const parent = chain.nodes.get(parentId);
        const totalTime = calls.reduce((sum, c) => sum + c.duration, 0);
        bottlenecks.push({
          id: `n-plus-1-${parentId}`,
          node: parent || calls[0],
          type: 'n-plus-1',
          severity: 'high',
          description: `N+1 query pattern: ${calls.length} database calls from ${parent?.name || 'unknown'}`,
          impact: `Total DB time: ${totalTime}ms`,
          contribution: (totalTime / chain.duration) * 100
        });
      }
    }

    // Repeated calls
    const callFrequencies = this.calculateCallFrequencies(nodes);
    for (const [name, calls] of Object.entries(callFrequencies)) {
      if (calls.length > 3) {
        const totalTime = calls.reduce((sum, c) => sum + c.duration, 0);
        bottlenecks.push({
          id: `repeated-${name}`,
          node: calls[0],
          type: 'repeated',
          severity: 'medium',
          description: `${name} called ${calls.length} times`,
          impact: `Total time: ${totalTime}ms`,
          contribution: (totalTime / chain.duration) * 100
        });
      }
    }

    return bottlenecks.sort((a, b) => b.contribution - a.contribution);
  }

  /**
   * Identify hot paths
   */
  private identifyHotPaths(chain: CallChain): HotPath[] {
    const hotPaths: HotPath[] = [];

    // Find paths with high total duration
    const paths = this.findAllPaths(chain);
    const pathDurations = paths.map(path => ({
      nodes: path,
      totalDuration: path.reduce((sum, node) => sum + node.duration, 0),
      frequency: 1 // Could be calculated from historical data
    }));

    // Sort by duration and take top paths
    pathDurations.sort((a, b) => b.totalDuration - a.totalDuration);

    const topPaths = pathDurations.slice(0, 5);

    for (const path of topPaths) {
      hotPaths.push({
        nodes: path.nodes,
        totalDuration: path.totalDuration,
        contribution: (path.totalDuration / chain.duration) * 100,
        frequency: path.frequency,
        description: `Hot path: ${path.nodes.map(n => n.name).join(' → ')}`
      });
    }

    return hotPaths;
  }

  /**
   * Identify critical path
   */
  private identifyCriticalPath(chain: CallChain): CriticalPath {
    const allPaths = this.findAllPaths(chain);

    // Find path with maximum total duration
    const criticalPath = allPaths.reduce((maxPath, currentPath) => {
      const maxDuration = maxPath.reduce((sum, node) => sum + node.duration, 0);
      const currentDuration = currentPath.reduce((sum, node) => sum + node.duration, 0);
      return currentDuration > maxDuration ? currentPath : maxPath;
    }, allPaths[0] || []);

    const bottleneckNodes = criticalPath.filter(
      node => node.duration > this.config.slowCallThreshold
    );

    return {
      nodes: criticalPath,
      totalDuration: criticalPath.reduce((sum, node) => sum + node.duration, 0),
      bottleneckNodes,
      description: `Critical path: ${criticalPath.map(n => n.name).join(' → ')}`
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    chain: CallChain,
    bottlenecks: CallBottleneck[],
    hotPaths: HotPath[]
  ): CallChainRecommendation[] {
    const recommendations: CallChainRecommendation[] = [];

    // Recommendations for slow calls
    for (const bottleneck of bottlenecks.filter(b => b.type === 'slow')) {
      const node = bottleneck.node;
      const rec: CallChainRecommendation = {
        id: `optimize-slow-${node.id}`,
        type: 'optimize',
        priority: bottleneck.severity === 'critical' ? 'high' : 'medium',
        title: `Optimize slow ${node.type} call`,
        description: `${node.name} took ${node.duration}ms, which is significantly above threshold`,
        actionItems: this.getOptimizationActions(node),
        estimatedImpact: `${bottleneck.contribution.toFixed(1)}% of total duration`,
        affectedNodes: [node.id]
      };

      recommendations.push(rec);
    }

    // Recommendations for N+1 queries
    for (const bottleneck of bottlenecks.filter(b => b.type === 'n-plus-1')) {
      const rec: CallChainRecommendation = {
        id: `fix-n-plus-1-${bottleneck.node.id}`,
        type: 'refactor',
        priority: 'high',
        title: 'Fix N+1 query pattern',
        description: bottleneck.description,
        actionItems: [
          'Use eager loading or join queries',
          'Implement query batching',
          'Use data loader pattern',
          'Add pagination to reduce result size'
        ],
        estimatedImpact: `${bottleneck.contribution.toFixed(1)}% of total duration`,
        affectedNodes: [bottleneck.node.id]
      };

      recommendations.push(rec);
    }

    // Recommendations for hot paths
    for (const hotPath of hotPaths.slice(0, 2)) {
      const rec: CallChainRecommendation = {
        id: `optimize-hot-path-${hotPath.nodes[0].id}`,
        type: 'optimize',
        priority: 'medium',
        title: 'Optimize hot path',
        description: hotPath.description,
        actionItems: [
          'Consider parallelizing independent operations',
          'Add caching for frequently accessed data',
          'Review algorithm efficiency',
          'Consider moving to background processing'
        ],
        estimatedImpact: `${hotPath.contribution.toFixed(1)}% of total duration`,
        affectedNodes: hotPath.nodes.map(n => n.id)
      };

      recommendations.push(rec);
    }

    // Cache recommendations
    const dbCalls = Array.from(chain.nodes.values()).filter(n => n.type === 'database');
    if (dbCalls.length > 10) {
      const rec: CallChainRecommendation = {
        id: 'add-cache',
        type: 'cache',
        priority: 'medium',
        title: 'Add caching for database queries',
        description: `${dbCalls.length} database calls detected`,
        actionItems: [
          'Implement caching for frequently accessed data',
          'Use Redis or Memcached for distributed caching',
          'Set appropriate TTL values',
          'Cache invalidation strategy'
        ],
        estimatedImpact: 'Potential 30-60% reduction in DB calls',
        affectedNodes: dbCalls.map(n => n.id)
      };

      recommendations.push(rec);
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Recalculate chain properties
   */
  private recalculateChain(chain: CallChain): void {
    // Calculate depth
    const calculateDepth = (nodeId: string, depth = 0): number => {
      const node = chain.nodes.get(nodeId);
      if (!node || node.children.length === 0) {
        return depth;
      }
      return 1 + Math.max(...node.children.map(childId => calculateDepth(childId, depth)));
    };

    chain.depth = calculateDepth(chain.root.id);

    // Calculate breadth (max nodes at any level)
    const nodesByLevel = new Map<number, Set<string>>();
    const traverse = (nodeId: string, level: number) => {
      const node = chain.nodes.get(nodeId);
      if (!node) return;

      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, new Set());
      }
      nodesByLevel.get(level)!.add(nodeId);

      node.children.forEach(childId => traverse(childId, level + 1));
    };

    traverse(chain.root.id, 0);
    chain.breadth = Math.max(...Array.from(nodesByLevel.values()).map(s => s.size));
  }

  /**
   * Find all paths from root to leaves
   */
  private findAllPaths(chain: CallChain): CallNode[][] {
    const paths: CallNode[][] = [];

    const traverse = (nodeId: string, currentPath: CallNode[]) => {
      const node = chain.nodes.get(nodeId);
      if (!node) return;

      const newPath = [...currentPath, node];

      if (node.children.length === 0) {
        paths.push(newPath);
      } else {
        node.children.forEach(childId => traverse(childId, newPath));
      }
    };

    traverse(chain.root.id, []);
    return paths;
  }

  /**
   * Group calls by parent
   */
  private groupCallsByParent(calls: CallNode[]): Record<string, CallNode[]> {
    const groups: Record<string, CallNode[]> = {};

    for (const call of calls) {
      const parentId = call.parent || 'root';
      if (!groups[parentId]) {
        groups[parentId] = [];
      }
      groups[parentId].push(call);
    }

    return groups;
  }

  /**
   * Calculate call frequencies
   */
  private calculateCallFrequencies(calls: CallNode[]): Record<string, CallNode[]> {
    const frequencies: Record<string, CallNode[]> = {};

    for (const call of calls) {
      const key = `${call.type}:${call.name}`;
      if (!frequencies[key]) {
        frequencies[key] = [];
      }
      frequencies[key].push(call);
    }

    return frequencies;
  }

  /**
   * Calculate bottleneck severity
   */
  private calculateBottleneckSeverity(
    duration: number,
    threshold: number
  ): SeverityLevel {
    const ratio = duration / threshold;
    if (ratio >= 5) return 'critical';
    if (ratio >= 3) return 'high';
    if (ratio >= 2) return 'medium';
    return 'low';
  }

  /**
   * Get optimization actions for a node
   */
  private getOptimizationActions(node: CallNode): string[] {
    const actions: string[] = [];

    switch (node.type) {
      case 'database':
        actions.push(
          'Review and optimize SQL query',
          'Add or update database indexes',
          'Consider query result caching',
          'Implement pagination for large result sets'
        );
        break;
      case 'api':
        actions.push(
          'Check for network latency',
          'Review API endpoint implementation',
          'Consider caching API responses',
          'Implement retry logic with exponential backoff'
        );
        break;
      case 'function':
        actions.push(
          'Review algorithm efficiency',
          'Consider memoization for pure functions',
          'Look for unnecessary loops or computations',
          'Consider Web Workers for CPU-intensive tasks'
        );
        break;
      case 'component':
        actions.push(
          'Review React.memo usage',
          'Optimize component re-renders',
          'Consider code splitting',
          'Use virtualization for long lists'
        );
        break;
      default:
        actions.push('Review implementation for optimization opportunities');
    }

    return actions;
  }

  /**
   * Generate trace ID
   */
  private generateTraceId(): string {
    return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate span ID
   */
  private generateSpanId(): string {
    return `span-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================================
  // Visualization Helpers
  // ============================================================================

  /**
   * Get chain as tree structure (for visualization)
   */
  getChainTree(chainId: string): any {
    const chain = this.getChain(chainId);
    if (!chain) {
      return null;
    }

    const toTree = (nodeId: string): any => {
      const node = chain.nodes.get(nodeId);
      if (!node) {
        return null;
      }

      return {
        id: node.id,
        name: node.name,
        type: node.type,
        duration: node.duration,
        status: node.status,
        children: node.children.map(childId => toTree(childId))
      };
    };

    return {
      id: chain.id,
      traceId: chain.traceId,
      duration: chain.duration,
      status: chain.status,
      root: toTree(chain.root.id)
    };
  }

  /**
   * Generate waterfall data (for visualization)
   */
  generateWaterfallData(chainId: string): Array<{
    id: string;
    name: string;
    type: CallNodeType;
    start: number;
    duration: number;
    level: number;
    parent?: string;
  }> {
    const chain = this.getChain(chainId);
    if (!chain) {
      return [];
    }

    const waterfall: Array<{
      id: string;
      name: string;
      type: CallNodeType;
      start: number;
      duration: number;
      level: number;
      parent?: string;
    }> = [];

    const addNode = (nodeId: string, level: number) => {
      const node = chain.nodes.get(nodeId);
      if (!node) return;

      waterfall.push({
        id: node.id,
        name: node.name,
        type: node.type,
        start: node.timestamp - chain.startedAt,
        duration: node.duration,
        level,
        parent: node.parent
      });

      node.children.forEach(childId => addNode(childId, level + 1));
    };

    addNode(chain.root.id, 0);

    return waterfall;
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get chain statistics
   */
  getStatistics(): {
    totalChains: number;
    activeChains: number;
    completedChains: number;
    averageChainDuration: number;
    errorRate: number;
    topSlowestChains: Array<{ id: string; duration: number }>;
  } {
    const completed = Array.from(this.completedChains.values());
    const totalDuration = completed.reduce((sum, c) => sum + c.duration, 0);
    const errorCount = completed.filter(c => c.status === 'error').length;

    const topSlowest = [...completed]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
      .map(c => ({ id: c.id, duration: c.duration }));

    return {
      totalChains: this.chainHistory.length,
      activeChains: this.activeChains.size,
      completedChains: this.completedChains.size,
      averageChainDuration: completed.length > 0 ? totalDuration / completed.length : 0,
      errorRate: completed.length > 0 ? errorCount / completed.length : 0,
      topSlowestChains: topSlowest
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.activeChains.clear();
    this.completedChains.clear();
    this.chainHistory = [];
  }
}

export default CallChainTracer;
