/**
 * Database Query Tracker
 *
 * Tracks slow database queries and identifies performance issues
 */

import {
  DatabaseQuery,
  DatabaseAnalysis,
  DatabaseIssueType,
  DatabaseIssue,
  DatabaseRecommendation,
  QueryStatistics,
  ExecutionPlan,
  Severity,
  SeverityLevel,
  RootCauseAnalysisConfig,
  DEFAULT_CONFIG
} from './types';

// ============================================================================
// Database Tracker Class
// ============================================================================

export class DatabaseTracker {
  private config: RootCauseAnalysisConfig;
  private queryHistory: DatabaseQuery[] = [];
  private issuePatterns: Map<DatabaseIssueType, IssuePattern>;

  constructor(config: Partial<RootCauseAnalysisConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.issuePatterns = this.initializeIssuePatterns();
  }

  // ============================================================================
  // Query Tracking
  // ============================================================================

  /**
   * Track a database query
   */
  trackQuery(query: Omit<DatabaseQuery, 'id' | 'issues' | 'timestamp'>): DatabaseQuery {
    const trackedQuery: DatabaseQuery = {
      id: this.generateQueryId(),
      query: this.sanitizeQuery(query.query),
      duration: query.duration,
      rowCount: query.rowCount,
      timestamp: Date.now(),
      table: query.table,
      operation: query.operation,
      executionPlan: query.executionPlan,
      affectedRows: query.affectedRows,
      issues: this.detectIssues(query)
    };

    // Add to history
    this.queryHistory.push(trackedQuery);
    this.pruneHistory();

    return trackedQuery;
  }

  /**
   * Track multiple queries in batch
   */
  trackQueries(queries: Array<Omit<DatabaseQuery, 'id' | 'issues' | 'timestamp'>>): DatabaseQuery[] {
    return queries.map(q => this.trackQuery(q));
  }

  // ============================================================================
  // Issue Detection
  // ============================================================================

  /**
   * Detect issues in a query
   */
  private detectIssues(query: Omit<DatabaseQuery, 'id' | 'issues' | 'timestamp'>): DatabaseIssueType[] {
    const issues: DatabaseIssueType[] = [];

    // Check for slow query
    if (query.duration > this.config.database.slowQueryThreshold) {
      issues.push('slow-query');
    }

    // Check for full scan
    if (query.executionPlan?.scanType === 'full') {
      issues.push('full-scan');
    }

    // Check for large result set
    if (query.rowCount && query.rowCount > this.config.database.maxResultRows) {
      issues.push('large-result');
    }

    // Check for missing index
    if (this.detectMissingIndex(query)) {
      issues.push('missing-index');
    }

    // Check for N+1 pattern
    if (this.detectNPlusOne(query)) {
      issues.push('n-plus-1');
    }

    // Check for inefficient WHERE clause
    if (this.detectInefficientWhere(query)) {
      issues.push('inefficient-where');
    }

    // Check for lock wait
    if (query.duration > 5000 && query.executionPlan?.scanType === 'range') {
      issues.push('lock-wait');
    }

    return issues;
  }

  /**
   * Detect missing index
   */
  private detectMissingIndex(query: Omit<DatabaseQuery, 'id' | 'issues' | 'timestamp'>): boolean {
    if (query.executionPlan) {
      // Full scan on large table suggests missing index
      if (query.executionPlan.scanType === 'full' && query.executionPlan.estimatedRows > 1000) {
        return true;
      }

      // High filter cost suggests missing index
      if (query.executionPlan.filterCost > 0.5) {
        return true;
      }
    }

    // Query patterns that typically need indexes
    const wherePattern = /WHERE\s+\w+\s*=\s*\?/gi;
    const hasWhereClause = wherePattern.test(query.query);

    if (hasWhereClause && query.duration > 100 && !query.executionPlan?.indexUsed) {
      return true;
    }

    return false;
  }

  /**
   * Detect N+1 query pattern
   */
  private detectNPlusOne(query: Omit<DatabaseQuery, 'id' | 'issues' | 'timestamp'>): boolean {
    const recentQueries = this.queryHistory.slice(-10);

    // Look for similar queries executed multiple times
    const similarQueries = recentQueries.filter(q => {
      const queryPattern = this.extractQueryPattern(q.query);
      const currentPattern = this.extractQueryPattern(query.query);
      return queryPattern === currentPattern && Date.now() - q.timestamp < 5000;
    });

    if (similarQueries.length >= 3) {
      return true;
    }

    return false;
  }

  /**
   * Detect inefficient WHERE clause
   */
  private detectInefficientWhere(query: Omit<DatabaseQuery, 'id' | 'issues' | 'timestamp'>): boolean {
    // Functions in WHERE clause
    if (/WHERE.*\w+\s*\(/i.test(query.query)) {
      return true;
    }

    // LIKE with leading wildcard
    if (/WHERE.*LIKE\s+['"]%/i.test(query.query)) {
      return true;
    }

    // OR conditions that might not use index
    if (/WHERE.*\s+OR\s+/i.test(query.query) && query.duration > 100) {
      return true;
    }

    return false;
  }

  // ============================================================================
  // Analysis
  // ============================================================================

  /**
   * Analyze all tracked queries
   */
  analyze(): DatabaseAnalysis {
    const slowQueries = this.getSlowQueries();
    const queryStatistics = this.calculateStatistics();
    const criticalIssues = this.identifyCriticalIssues();
    const recommendations = this.generateRecommendations();

    return {
      slowQueries,
      queryStatistics,
      criticalIssues,
      recommendations
    };
  }

  /**
   * Get slow queries
   */
  getSlowQueries(): DatabaseQuery[] {
    return this.queryHistory
      .filter(q => q.duration > this.config.database.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration);
  }

  /**
   * Calculate query statistics
   */
  private calculateStatistics(): QueryStatistics {
    const queries = this.queryHistory;
    const slowQueries = queries.filter(q => q.duration > this.config.database.slowQueryThreshold);

    // Queries by table
    const queriesByTable = new Map<string, number>();
    queries.forEach(q => {
      if (q.table) {
        queriesByTable.set(q.table, (queriesByTable.get(q.table) || 0) + 1);
      }
    });

    // Queries by issue type
    const queriesByType = new Map<DatabaseIssueType, number>();
    queries.forEach(q => {
      q.issues.forEach(issue => {
        queriesByType.set(issue, (queriesByType.get(issue) || 0) + 1);
      });
    });

    // Top slow queries
    const topSlowQueries = [...queries]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    return {
      totalQueries: queries.length,
      slowQueriesCount: slowQueries.length,
      averageDuration: queries.length > 0
        ? queries.reduce((sum, q) => sum + q.duration, 0) / queries.length
        : 0,
      slowQueryThreshold: this.config.database.slowQueryThreshold,
      queriesByTable,
      queriesByType,
      topSlowQueries
    };
  }

  /**
   * Identify critical issues
   */
  private identifyCriticalIssues(): DatabaseIssue[] {
    const issues: DatabaseIssue[] = [];
    const issueMap = new Map<DatabaseIssueType, DatabaseQuery[]>();

    // Group queries by issue type
    this.queryHistory.forEach(query => {
      query.issues.forEach(issueType => {
        if (!issueMap.has(issueType)) {
          issueMap.set(issueType, []);
        }
        issueMap.get(issueType)!.push(query);
      });
    });

    // Create issue objects
    issueMap.forEach((affectedQueries, type) => {
      const severity = this.calculateIssueSeverity(type, affectedQueries);

      issues.push({
        id: `issue-${type}-${Date.now()}`,
        type,
        severity,
        description: this.getIssueDescription(type, affectedQueries),
        affectedQueries,
        impact: this.calculateImpact(type, affectedQueries),
        table: this.getMostAffectedTable(affectedQueries)
      });
    });

    // Sort by severity
    return issues.sort((a, b) => b.severity.score - a.severity.score);
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(): DatabaseRecommendation[] {
    const recommendations: DatabaseRecommendation[] = [];
    const issues = this.identifyCriticalIssues();

    issues.forEach(issue => {
      const recommendation = this.createRecommendation(issue);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    });

    return recommendations.sort((a, b) => b.severity.score - a.severity.score);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Calculate issue severity
   */
  private calculateIssueSeverity(type: DatabaseIssueType, queries: DatabaseQuery[]): Severity {
    const avgDuration = queries.reduce((sum, q) => sum + q.duration, 0) / queries.length;
    const count = queries.length;

    // Base severity by type
    const typeSeverity: Record<DatabaseIssueType, SeverityLevel> = {
      'full-scan': 'high',
      'large-result': 'medium',
      'missing-index': 'high',
      'n-plus-1': 'high',
      'inefficient-where': 'medium',
      'slow-query': 'medium',
      'connection-pool-exhausted': 'critical',
      'lock-wait': 'high'
    };

    const level = typeSeverity[type] || 'low';
    let score = 0;

    // Calculate score based on impact
    switch (level) {
      case 'critical':
        score = 90 + Math.min(count, 10);
        break;
      case 'high':
        score = 70 + Math.min(count * 2, 20);
        break;
      case 'medium':
        score = 50 + Math.min(count, 20);
        break;
      case 'low':
        score = 30 + Math.min(count, 10);
        break;
      default:
        score = 10;
    }

    // Adjust for average duration
    if (avgDuration > 5000) {
      score = Math.min(score + 10, 100);
    }

    return { level, score: Math.min(score, 100), label: this.getSeverityLabel(level) };
  }

  /**
   * Get severity label
   */
  private getSeverityLabel(level: SeverityLevel): string {
    const labels: Record<SeverityLevel, string> = {
      critical: '🔴 Critical - Immediate attention required',
      high: '🟠 High - Should be addressed soon',
      medium: '🟡 Medium - Should be optimized',
      low: '🟢 Low - Minor improvement',
      info: 'ℹ️ Info - For awareness'
    };
    return labels[level];
  }

  /**
   * Get issue description
   */
  private getIssueDescription(type: DatabaseIssueType, queries: DatabaseQuery[]): string {
    const descriptions: Record<DatabaseIssueType, string> = {
      'full-scan': `${queries.length} queries performing full table scans`,
      'large-result': `${queries.length} queries returning large result sets`,
      'missing-index': `${queries.length} queries would benefit from an index`,
      'n-plus-1': `${queries.length} queries show N+1 pattern`,
      'inefficient-where': `${queries.length} queries have inefficient WHERE clauses`,
      'slow-query': `${queries.length} queries exceed slow query threshold`,
      'connection-pool-exhausted': 'Connection pool exhaustion detected',
      'lock-wait': `${queries.length} queries show lock wait symptoms`
    };
    return descriptions[type];
  }

  /**
   * Calculate impact
   */
  private calculateImpact(type: DatabaseIssueType, queries: DatabaseQuery[]): string {
    const totalDuration = queries.reduce((sum, q) => sum + q.duration, 0);
    const avgDuration = totalDuration / queries.length;

    const impacts: Record<DatabaseIssueType, string> = {
      'full-scan': `Average duration: ${avgDuration.toFixed(0)}ms, Total: ${(totalDuration / 1000).toFixed(2)}s`,
      'large-result': `Average rows: ${Math.round(queries.reduce((sum, q) => sum + (q.rowCount || 0), 0) / queries.length)}`,
      'missing-index': `Potential improvement: 50-90% faster with proper index`,
      'n-plus-1': `Potential ${queries.length}x improvement by batching`,
      'inefficient-where': `Average duration: ${avgDuration.toFixed(0)}ms`,
      'slow-query': `Average duration: ${avgDuration.toFixed(0)}ms`,
      'connection-pool-exhausted': 'May cause request failures under load',
      'lock-wait': `Average duration: ${avgDuration.toFixed(0)}ms, potential deadlock risk`
    };
    return impacts[type];
  }

  /**
   * Get most affected table
   */
  private getMostAffectedTable(queries: DatabaseQuery[]): string | undefined {
    const tableCounts = new Map<string, number>();
    queries.forEach(q => {
      if (q.table) {
        tableCounts.set(q.table, (tableCounts.get(q.table) || 0) + 1);
      }
    });

    let maxTable: string | undefined;
    let maxCount = 0;
    tableCounts.forEach((count, table) => {
      if (count > maxCount) {
        maxCount = count;
        maxTable = table;
      }
    });

    return maxTable;
  }

  /**
   * Create recommendation
   */
  private createRecommendation(issue: DatabaseIssue): DatabaseRecommendation | null {
    const templates: Record<DatabaseIssueType, () => DatabaseRecommendation> = {
      'full-scan': () => ({
        id: `rec-full-scan-${Date.now()}`,
        type: 'full-scan',
        severity: issue.severity,
        title: 'Add Index to Avoid Full Scans',
        description: 'Queries are performing full table scans which are inefficient for large tables.',
        actionItems: [
          `Add index on columns used in WHERE clause for table: ${issue.table || 'identified tables'}`,
          'Review query execution plan',
          'Consider composite indexes for multi-column queries'
        ],
        estimatedImpact: '50-90% query performance improvement',
        complexity: 'low',
        estimatedTime: '1-2 hours'
      }),

      'missing-index': () => ({
        id: `rec-missing-index-${Date.now()}`,
        type: 'missing-index',
        severity: issue.severity,
        title: 'Add Missing Indexes',
        description: 'Queries would benefit from indexes on frequently queried columns.',
        actionItems: [
          `Analyze query patterns on table: ${issue.table || 'affected tables'}`,
          'Create indexes on columns used in WHERE, JOIN, and ORDER BY clauses',
          'Monitor query performance after index creation'
        ],
        estimatedImpact: '50-95% query performance improvement',
        complexity: 'low',
        estimatedTime: '2-4 hours'
      }),

      'n-plus-1': () => ({
        id: `rec-n-plus-1-${Date.now()}`,
        type: 'n-plus-1',
        severity: issue.severity,
        title: 'Fix N+1 Query Pattern',
        description: 'Multiple similar queries detected. Consider batching or using JOINs.',
        actionItems: [
          'Use DataLoader or similar batching mechanism',
          'Replace multiple queries with a single JOIN query',
          'Implement query result caching'
        ],
        estimatedImpact: '50-80% reduction in database queries',
        complexity: 'medium',
        estimatedTime: '4-8 hours'
      }),

      'large-result': () => ({
        id: `rec-large-result-${Date.now()}`,
        type: 'large-result',
        severity: issue.severity,
        title: 'Optimize Large Result Sets',
        description: 'Queries returning large result sets can impact memory and network.',
        actionItems: [
          'Add LIMIT clauses to queries',
          'Implement pagination',
          'Select only needed columns instead of SELECT *'
        ],
        estimatedImpact: '50-70% reduction in data transfer',
        complexity: 'low',
        estimatedTime: '1-3 hours'
      }),

      'inefficient-where': () => ({
        id: `rec-inefficient-where-${Date.now()}`,
        type: 'inefficient-where',
        severity: issue.severity,
        title: 'Optimize WHERE Clauses',
        description: 'WHERE clauses are not using indexes efficiently.',
        actionItems: [
          'Avoid functions on indexed columns in WHERE clause',
          'Replace leading wildcards in LIKE with trailing wildcards when possible',
          'Consider using UNION instead of OR for better index usage'
        ],
        estimatedImpact: '30-60% query performance improvement',
        complexity: 'medium',
        estimatedTime: '2-4 hours'
      }),

      'slow-query': () => ({
        id: `rec-slow-query-${Date.now()}`,
        type: 'slow-query',
        severity: issue.severity,
        title: 'Optimize Slow Queries',
        description: 'Queries exceed the slow query threshold.',
        actionItems: [
          'Review query execution plan',
          'Identify bottlenecks using EXPLAIN ANALYZE',
          'Consider query restructuring or caching'
        ],
        estimatedImpact: 'Variable based on root cause',
        complexity: 'medium',
        estimatedTime: '2-6 hours'
      }),

      'connection-pool-exhausted': () => ({
        id: `rec-pool-exhausted-${Date.now()}`,
        type: 'connection-pool-exhausted',
        severity: issue.severity,
        title: 'Address Connection Pool Exhaustion',
        description: 'Database connection pool is running out of connections.',
        actionItems: [
          'Increase connection pool size',
          'Implement connection timeout and retry logic',
          'Review long-running transactions',
          'Check for connection leaks'
        ],
        estimatedImpact: 'Prevent request failures under load',
        complexity: 'medium',
        estimatedTime: '2-4 hours'
      }),

      'lock-wait': () => ({
        id: `rec-lock-wait-${Date.now()}`,
        type: 'lock-wait',
        severity: issue.severity,
        title: 'Address Lock Wait Issues',
        description: 'Queries are waiting for locks, potentially causing deadlocks.',
        actionItems: [
          'Review transaction isolation levels',
          'Optimize long-running transactions',
          'Consider optimistic locking strategies',
          'Add appropriate indexes to reduce lock duration'
        ],
        estimatedImpact: 'Reduce lock contention and prevent deadlocks',
        complexity: 'high',
        estimatedTime: '4-8 hours'
      })
    };

    const template = templates[issue.type];
    return template ? template() : null;
  }

  /**
   * Sanitize query to remove sensitive data
   */
  private sanitizeQuery(query: string): string {
    let sanitized = query;

    // Remove literal values
    sanitized = sanitized.replace(/'[^']*'/g, "'?'");
    sanitized = sanitized.replace(/\b\d+\b/g, '?');

    // Apply sensitive data patterns
    this.config.database.sensitiveDataPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });

    return sanitized;
  }

  /**
   * Extract query pattern (without parameters)
   */
  private extractQueryPattern(query: string): string {
    return query
      .replace(/'[^']*'/g, '?')
      .replace(/\b\d+\b/g, '?')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  /**
   * Generate unique query ID
   */
  private generateQueryId(): string {
    return `query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize issue patterns
   */
  private initializeIssuePatterns(): Map<DatabaseIssueType, IssuePattern> {
    return new Map([
      ['full-scan', { pattern: /FULL SCAN/i, weight: 1.0 }],
      ['missing-index', { pattern: /NO INDEX/i, weight: 0.9 }],
      ['n-plus-1', { pattern: /REPEATED QUERY/i, weight: 0.85 }],
      ['inefficient-where', { pattern: /FUNCTION IN WHERE/i, weight: 0.7 }],
      ['large-result', { pattern: /LARGE RESULT/i, weight: 0.6 }],
      ['lock-wait', { pattern: /LOCK WAIT/i, weight: 0.95 }],
      ['connection-pool-exhausted', { pattern: /POOL EXHAUSTED/i, weight: 1.0 }],
      ['slow-query', { pattern: /SLOW/i, weight: 0.5 }]
    ]);
  }

  /**
   * Prune history to max entries
   */
  private pruneHistory(): void {
    if (this.queryHistory.length > this.config.history.maxEntries) {
      this.queryHistory = this.queryHistory.slice(-this.config.history.maxEntries);
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Get all tracked queries
   */
  getHistory(): DatabaseQuery[] {
    return [...this.queryHistory];
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.queryHistory = [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RootCauseAnalysisConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): RootCauseAnalysisConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Helper Types
// ============================================================================

interface IssuePattern {
  pattern: RegExp;
  weight: number;
}
