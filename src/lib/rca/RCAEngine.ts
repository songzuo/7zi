/**
 * RCAEngine - Root Cause Analysis Engine
 *
 * Core engine for automated root cause analysis.
 * Analyzes traces, logs, and alerts to identify root causes and suggest fixes.
 *
 * @version v1.8.0
 * @author AI Architect
 */

import type { Span, TraceId, SpanId, SpanStatusCode } from "../tracing/types";
import type { LogEntry } from "../trace/StructuredLogger";

// ============================================
// Core Types
// ============================================

/**
 * RCA Analysis Result
 */
export interface RCAResult {
  /** Root cause description */
  rootCause: string;
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
  /** Supporting evidence */
  evidence: Evidence[];
  /** Affected components */
  impactedComponents: string[];
  /** Severity level */
  severity: Severity;
  /** Suggested fix */
  suggestedFix?: string;
  /** Detailed recommendations */
  recommendations: Recommendation[];
  /** Event timeline */
  timeline: EventTimeline;
  /** Analysis metadata */
  analysisId: string;
  analyzedAt: string;
  duration: number;
}

/**
 * Evidence for root cause
 */
export interface Evidence {
  id: string;
  type: "trace" | "log" | "metric" | "alert" | "span";
  source: string;
  timestamp: string;
  description: string;
  data: Record<string, unknown>;
  relevance: number; // 0.0 - 1.0
}

/**
 * Recommendation for remediation
 */
export interface Recommendation {
  id: string;
  priority: Priority;
  action: string;
  description: string;
  estimatedImpact: string;
  implementationEffort: Effort;
  relatedEvidence: string[];
}

/**
 * Event timeline
 */
export interface EventTimeline {
  events: TimelineEvent[];
  rootCauseTime: string;
  detectionTime: string;
  totalDuration: number;
}

/**
 * Timeline event
 */
export interface TimelineEvent {
  timestamp: string;
  type: "error" | "warning" | "info" | "fix";
  component: string;
  description: string;
  traceId?: string;
  spanId?: string;
}

/**
 * Root cause hypothesis
 */
export interface RootCauseHypothesis {
  id: string;
  type: RootCauseType;
  description: string;
  confidence: number;
  evidence: Evidence[];
  affectedComponents: string[];
  possibleFixes: string[];
}

/**
 * RCA Input
 */
export interface RCAInput {
  traceId?: string;
  alertId?: string;
  errorId?: string;
  timeRange?: {
    start: string;
    end: string;
  };
  filters?: {
    services?: string[];
    components?: string[];
    severity?: Severity[];
  };
  context?: {
    deploymentId?: string;
    environment?: string;
    userId?: string;
  };
  options?: {
    includeRelatedTraces?: boolean;
    maxDepth?: number;
    minConfidence?: number;
  };
}

/**
 * Trace data for analysis
 */
export interface TraceData {
  traceId: string;
  spans: Span[];
  metadata: Record<string, unknown>;
  errors: SpanError[];
  performance: TracePerformance;
}

/**
 * Span error
 */
export interface SpanError {
  spanId: string;
  name: string;
  message: string;
  stack?: string;
  timestamp: number;
}

/**
 * Trace performance metrics
 */
export interface TracePerformance {
  totalDuration: number;
  spanCount: number;
  errorCount: number;
  slowSpans: SlowSpan[];
}

/**
 * Slow span info
 */
export interface SlowSpan {
  spanId: string;
  name: string;
  duration: number;
  threshold: number;
}

// ============================================
// Enums
// ============================================

export type Severity = "critical" | "high" | "medium" | "low";
export type Priority = "high" | "medium" | "low";
export type Effort = "easy" | "medium" | "hard";

export type RootCauseType =
  | "database-issue"
  | "api-failure"
  | "resource-exhaustion"
  | "configuration-error"
  | "code-bug"
  | "dependency-failure"
  | "network-issue"
  | "security-issue"
  | "unknown";

// ============================================
// Error Patterns
// ============================================

interface ErrorPattern {
  id: string;
  name: string;
  description: string;
  rootCauseType: RootCauseType;
  signatures: PatternSignature[];
  rootCauseHint: string;
  suggestedFix: string;
  confidence: number;
}

interface PatternSignature {
  type: "error-message" | "span-name" | "attribute" | "duration";
  pattern: string | RegExp | number;
  matchType: "contains" | "regex" | "exact" | "greater-than" | "less-than";
}

/**
 * Known error patterns for pattern matching
 */
const ERROR_PATTERNS: ErrorPattern[] = [
  {
    id: "DB-TIMEOUT",
    name: "Database Timeout",
    description: "Query execution exceeds timeout threshold",
    rootCauseType: "database-issue",
    signatures: [
      { type: "error-message", pattern: "timeout", matchType: "contains" },
      { type: "error-message", pattern: "ETIMEDOUT", matchType: "contains" },
      { type: "span-name", pattern: "db.query", matchType: "contains" },
    ],
    rootCauseHint: "Missing database index or inefficient query",
    suggestedFix: "Add appropriate database indexes or optimize query",
    confidence: 0.85,
  },
  {
    id: "CONN-POOL-EXHAUSTED",
    name: "Connection Pool Exhausted",
    description: "Database connection pool has no available connections",
    rootCauseType: "resource-exhaustion",
    signatures: [
      { type: "error-message", pattern: "connection pool", matchType: "contains" },
      { type: "error-message", pattern: "too many connections", matchType: "contains" },
      { type: "error-message", pattern: "ECONNEXHAUSTED", matchType: "contains" },
    ],
    rootCauseHint: "Connection pool size too small or connection leak",
    suggestedFix: "Increase connection pool size or fix connection leak",
    confidence: 0.9,
  },
  {
    id: "API-RATE-LIMIT",
    name: "API Rate Limited",
    description: "External API rate limit exceeded",
    rootCauseType: "api-failure",
    signatures: [
      { type: "attribute", pattern: "status", matchType: "exact" },
      { type: "error-message", pattern: "429", matchType: "contains" },
      { type: "error-message", pattern: "rate limit", matchType: "contains" },
    ],
    rootCauseHint: "Request rate exceeds API limit",
    suggestedFix: "Implement request throttling or caching",
    confidence: 0.95,
  },
  {
    id: "N+1-QUERY",
    name: "N+1 Query Pattern",
    description: "Multiple similar database queries detected",
    rootCauseType: "database-issue",
    signatures: [
      { type: "span-name", pattern: "db.query", matchType: "contains" },
    ],
    rootCauseHint: "Missing eager loading causing repeated queries",
    suggestedFix: "Implement eager loading or batch queries",
    confidence: 0.75,
  },
  {
    id: "API-TIMEOUT",
    name: "API Request Timeout",
    description: "External API request timed out",
    rootCauseType: "api-failure",
    signatures: [
      { type: "error-message", pattern: "ECONNABORTED", matchType: "contains" },
      { type: "error-message", pattern: "request timeout", matchType: "contains" },
      { type: "span-name", pattern: "http.request", matchType: "contains" },
    ],
    rootCauseHint: "External service slow or unavailable",
    suggestedFix: "Add retry logic with exponential backoff",
    confidence: 0.8,
  },
  {
    id: "MEMORY-EXHAUSTED",
    name: "Memory Exhaustion",
    description: "Out of memory error",
    rootCauseType: "resource-exhaustion",
    signatures: [
      { type: "error-message", pattern: "out of memory", matchType: "contains" },
      { type: "error-message", pattern: "ENOMEM", matchType: "contains" },
      { type: "error-message", pattern: "heap out of memory", matchType: "contains" },
    ],
    rootCauseHint: "Memory leak or insufficient memory allocation",
    suggestedFix: "Increase memory allocation or fix memory leak",
    confidence: 0.9,
  },
  {
    id: "DEADLOCK",
    name: "Database Deadlock",
    description: "Database deadlock detected",
    rootCauseType: "database-issue",
    signatures: [
      { type: "error-message", pattern: "deadlock", matchType: "contains" },
      { type: "error-message", pattern: "lock wait timeout", matchType: "contains" },
    ],
    rootCauseHint: "Transaction ordering issue or lock granularity",
    suggestedFix: "Review transaction order or reduce lock scope",
    confidence: 0.85,
  },
  {
    id: "AUTH-FAILURE",
    name: "Authentication Failure",
    description: "Authentication or authorization failed",
    rootCauseType: "security-issue",
    signatures: [
      { type: "attribute", pattern: "401", matchType: "exact" },
      { type: "error-message", pattern: "unauthorized", matchType: "contains" },
      { type: "error-message", pattern: "invalid token", matchType: "contains" },
    ],
    rootCauseHint: "Invalid credentials or expired token",
    suggestedFix: "Refresh authentication token or check credentials",
    confidence: 0.9,
  },
];

// ============================================
// RCA Engine Implementation
// ============================================

/**
 * RCAEngine - Root Cause Analysis Engine
 *
 * Usage:
 * ```typescript
 * const engine = new RCAEngine();
 *
 * // Analyze by trace ID
 * const result = await engine.analyze({ traceId: 'abc123' });
 *
 * // Analyze by time range
 * const result = await engine.analyze({
 *   timeRange: { start: '2024-01-01T00:00:00Z', end: '2024-01-01T01:00:00Z' }
 * });
 * ```
 */
export class RCAEngine {
  private traces: Map<string, TraceData> = new Map();
  private logs: Map<string, LogEntry[]> = new Map();
  private analysisCache: Map<string, RCAResult> = new Map();

  /**
   * Main analysis entry point
   */
  async analyze(input: RCAInput): Promise<RCAResult> {
    const startTime = Date.now();
    const analysisId = generateAnalysisId();

    // 1. Validate input
    const validated = this.validateInput(input);

    // 2. Collect evidence
    const evidence = await this.collectEvidence(validated);

    // 3. Generate hypotheses
    const hypotheses = this.generateHypotheses(evidence);

    // 4. Score and rank hypotheses
    const scoredHypotheses = this.scoreHypotheses(hypotheses);

    // 5. Select best hypothesis
    const bestHypothesis = scoredHypotheses[0];

    if (!bestHypothesis) {
      return this.createUnknownResult(analysisId, startTime);
    }

    // 6. Build result
    const result: RCAResult = {
      rootCause: bestHypothesis.description,
      confidence: bestHypothesis.confidence,
      evidence: bestHypothesis.evidence,
      impactedComponents: bestHypothesis.affectedComponents,
      severity: this.assessSeverity(bestHypothesis),
      suggestedFix: bestHypothesis.possibleFixes[0],
      recommendations: this.generateRecommendations(bestHypothesis),
      timeline: this.buildTimeline(evidence),
      analysisId,
      analyzedAt: new Date().toISOString(),
      duration: Date.now() - startTime,
    };

    // Cache result
    this.analysisCache.set(analysisId, result);

    return result;
  }

  /**
   * Analyze trace data directly
   */
  async analyzeTrace(traceData: TraceData): Promise<RCAResult> {
    // Store trace data
    this.traces.set(traceData.traceId, traceData);

    // Analyze
    return this.analyze({ traceId: traceData.traceId });
  }

  /**
   * Analyze logs directly
   */
  async analyzeLogs(logs: LogEntry[]): Promise<RCAResult> {
    const analysisId = generateAnalysisId();
    const startTime = Date.now();

    // Convert logs to evidence
    const evidence: Evidence[] = logs.map((log, index) => ({
      id: `log-${index}`,
      type: "log" as const,
      source: log.service || "unknown",
      timestamp: log.timestamp,
      description: log.message,
      data: {
        level: log.level,
        fields: log.fields,
        error: log.error,
      },
      relevance: log.level === "error" ? 1.0 : log.level === "warn" ? 0.7 : 0.3,
    }));

    // Find error logs
    const errorLogs = logs.filter((l) => l.level === "error");

    if (errorLogs.length === 0) {
      return this.createUnknownResult(analysisId, startTime);
    }

    // Generate hypotheses from error patterns
    const hypotheses = this.matchErrorPatterns(errorLogs);

    // Score and rank
    const scoredHypotheses = this.scoreHypotheses(hypotheses);
    const bestHypothesis = scoredHypotheses[0];

    if (!bestHypothesis) {
      return this.createUnknownResult(analysisId, startTime);
    }

    return {
      rootCause: bestHypothesis.description,
      confidence: bestHypothesis.confidence,
      evidence: bestHypothesis.evidence,
      impactedComponents: bestHypothesis.affectedComponents,
      severity: this.assessSeverity(bestHypothesis),
      suggestedFix: bestHypothesis.possibleFixes[0],
      recommendations: this.generateRecommendations(bestHypothesis),
      timeline: this.buildTimeline(evidence),
      analysisId,
      analyzedAt: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  }

  /**
   * Register trace data (for integration with TraceManager)
   */
  registerTrace(traceId: string, spans: Span[], metadata?: Record<string, unknown>): void {
    const errors: SpanError[] = [];
    const slowSpans: SlowSpan[] = [];
    const SLOW_THRESHOLD = 5000; // 5 seconds

    for (const span of spans) {
      // Collect errors
      if (span.status.code === 2) { // SpanStatusCode.ERROR
        errors.push({
          spanId: span.spanId,
          name: span.name,
          message: span.status.message || "Unknown error",
          timestamp: span.endTime || span.startTime,
        });
      }

      // Collect slow spans
      if (span.duration && span.duration > SLOW_THRESHOLD) {
        slowSpans.push({
          spanId: span.spanId,
          name: span.name,
          duration: span.duration,
          threshold: SLOW_THRESHOLD,
        });
      }
    }

    const traceData: TraceData = {
      traceId,
      spans,
      metadata: metadata || {},
      errors,
      performance: {
        totalDuration: Math.max(...spans.map((s) => s.duration || 0)),
        spanCount: spans.length,
        errorCount: errors.length,
        slowSpans,
      },
    };

    this.traces.set(traceId, traceData);
  }

  /**
   * Get cached result
   */
  getCachedResult(analysisId: string): RCAResult | undefined {
    return this.analysisCache.get(analysisId);
  }

  // ============================================
  // Private Methods
  // ============================================

  private validateInput(input: RCAInput): RCAInput {
    if (!input.traceId && !input.alertId && !input.errorId && !input.timeRange) {
      throw new RCAError(
        "At least one of traceId, alertId, errorId, or timeRange must be provided",
        "INPUT_INVALID"
      );
    }

    return {
      ...input,
      options: {
        includeRelatedTraces: true,
        maxDepth: 10,
        minConfidence: 0.5,
        ...input.options,
      },
    };
  }

  private async collectEvidence(input: RCAInput): Promise<Evidence[]> {
    const evidence: Evidence[] = [];

    // Collect from trace
    if (input.traceId) {
      const traceData = this.traces.get(input.traceId);
      if (traceData) {
        evidence.push(...this.collectTraceEvidence(traceData));
      }
    }

    // Collect from time range
    if (input.timeRange) {
      const tracesInRange = this.getTracesInRange(input.timeRange);
      for (const trace of tracesInRange) {
        evidence.push(...this.collectTraceEvidence(trace));
      }
    }

    return evidence;
  }

  private collectTraceEvidence(traceData: TraceData): Evidence[] {
    const evidence: Evidence[] = [];

    // Add trace-level evidence
    evidence.push({
      id: `trace-${traceData.traceId}`,
      type: "trace",
      source: traceData.metadata.serviceName as string || "unknown",
      timestamp: new Date().toISOString(),
      description: `Trace with ${traceData.spans.length} spans, ${traceData.errors.length} errors`,
      data: {
        traceId: traceData.traceId,
        spanCount: traceData.spans.length,
        errorCount: traceData.errors.length,
        performance: traceData.performance,
      },
      relevance: traceData.errors.length > 0 ? 1.0 : 0.5,
    });

    // Add span-level evidence
    for (const span of traceData.spans) {
      if (span.status.code === 2) { // ERROR
        evidence.push({
          id: `span-${span.spanId}`,
          type: "span",
          source: span.name,
          timestamp: new Date(span.startTime).toISOString(),
          description: `Error in span ${span.name}: ${span.status.message || "Unknown error"}`,
          data: {
            spanId: span.spanId,
            name: span.name,
            status: span.status,
            attributes: span.attributes,
            duration: span.duration,
          },
          relevance: 0.9,
        });
      }
    }

    // Add slow span evidence
    for (const slowSpan of traceData.performance.slowSpans) {
      evidence.push({
        id: `slow-${slowSpan.spanId}`,
        type: "span",
        source: slowSpan.name,
        timestamp: new Date().toISOString(),
        description: `Slow span: ${slowSpan.name} took ${slowSpan.duration}ms (threshold: ${slowSpan.threshold}ms)`,
        data: {
          spanId: slowSpan.spanId,
          name: slowSpan.name,
          duration: slowSpan.duration,
          threshold: slowSpan.threshold,
        },
        relevance: 0.7,
      });
    }

    return evidence;
  }

  private getTracesInRange(timeRange: { start: string; end: string }): TraceData[] {
    const start = new Date(timeRange.start).getTime();
    const end = new Date(timeRange.end).getTime();

    return Array.from(this.traces.values()).filter((trace) => {
      const traceStart = Math.min(...trace.spans.map((s) => s.startTime));
      return traceStart >= start && traceStart <= end;
    });
  }

  private generateHypotheses(evidence: Evidence[]): RootCauseHypothesis[] {
    const hypotheses: RootCauseHypothesis[] = [];

    // Match error patterns
    for (const pattern of ERROR_PATTERNS) {
      const matches = this.matchPattern(pattern, evidence);
      if (matches.length > 0) {
        hypotheses.push({
          id: `hypothesis-${pattern.id}`,
          type: pattern.rootCauseType,
          description: `${pattern.name}: ${pattern.description}`,
          confidence: pattern.confidence * (matches.length / evidence.length),
          evidence: matches,
          affectedComponents: this.extractAffectedComponents(matches),
          possibleFixes: [pattern.suggestedFix],
        });
      }
    }

    // Generate hypotheses from slow spans
    const slowEvidence = evidence.filter((e) => e.description.includes("Slow span"));
    if (slowEvidence.length > 0) {
      hypotheses.push({
        id: "hypothesis-performance",
        type: "database-issue",
        description: "Performance degradation detected",
        confidence: 0.7,
        evidence: slowEvidence,
        affectedComponents: slowEvidence.map((e) => e.source),
        possibleFixes: [
          "Optimize database queries",
          "Add caching layer",
          "Review database indexes",
        ],
      });
    }

    return hypotheses;
  }

  private matchPattern(pattern: ErrorPattern, evidence: Evidence[]): Evidence[] {
    const matches: Evidence[] = [];

    for (const ev of evidence) {
      for (const signature of pattern.signatures) {
        if (this.matchesSignature(signature, ev)) {
          matches.push(ev);
          break;
        }
      }
    }

    return matches;
  }

  private matchesSignature(signature: PatternSignature, evidence: Evidence): boolean {
    switch (signature.type) {
      case "error-message":
        return this.matchValue(signature, evidence.description.toLowerCase());

      case "span-name":
        return this.matchValue(signature, evidence.source.toLowerCase());

      case "attribute":
        const value = evidence.data[signature.pattern as string];
        return value !== undefined;

      case "duration":
        const duration = evidence.data.duration as number | undefined;
        if (duration === undefined) return false;
        if (signature.matchType === "greater-than") {
          return duration > (signature.pattern as number);
        }
        return false;

      default:
        return false;
    }
  }

  private matchValue(signature: PatternSignature, value: string): boolean {
    const pattern = signature.pattern.toString().toLowerCase();

    switch (signature.matchType) {
      case "contains":
        return value.includes(pattern);
      case "exact":
        return value === pattern;
      case "regex":
        try {
          return new RegExp(signature.pattern as string, "i").test(value);
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  private matchErrorPatterns(logs: LogEntry[]): RootCauseHypothesis[] {
    const hypotheses: RootCauseHypothesis[] = [];

    for (const pattern of ERROR_PATTERNS) {
      const matchingLogs = logs.filter((log) =>
        pattern.signatures.some((sig) =>
          sig.type === "error-message" && this.matchValue(sig, log.message.toLowerCase())
        )
      );

      if (matchingLogs.length > 0) {
        const evidence: Evidence[] = matchingLogs.map((log, idx) => ({
          id: `log-${idx}`,
          type: "log" as const,
          source: log.service || "unknown",
          timestamp: log.timestamp,
          description: log.message,
          data: { level: log.level, error: log.error },
          relevance: 0.9,
        }));

        hypotheses.push({
          id: `hypothesis-${pattern.id}`,
          type: pattern.rootCauseType,
          description: `${pattern.name}: ${pattern.description}`,
          confidence: pattern.confidence,
          evidence,
          affectedComponents: matchingLogs.map((l) => l.service || "unknown"),
          possibleFixes: [pattern.suggestedFix],
        });
      }
    }

    return hypotheses;
  }

  private scoreHypotheses(hypotheses: RootCauseHypothesis[]): RootCauseHypothesis[] {
    // Sort by confidence (descending)
    return [...hypotheses].sort((a, b) => b.confidence - a.confidence);
  }

  private assessSeverity(hypothesis: RootCauseHypothesis): Severity {
    // Assess severity based on type and affected components
    if (hypothesis.type === "security-issue") return "critical";
    if (hypothesis.type === "resource-exhaustion") return "high";
    if (hypothesis.affectedComponents.length > 3) return "high";
    if (hypothesis.confidence > 0.8) return "high";
    if (hypothesis.confidence > 0.6) return "medium";
    return "low";
  }

  private extractAffectedComponents(evidence: Evidence[]): string[] {
    const components = new Set<string>();
    for (const ev of evidence) {
      components.add(ev.source);
    }
    return Array.from(components);
  }

  private generateRecommendations(hypothesis: RootCauseHypothesis): Recommendation[] {
    return hypothesis.possibleFixes.map((fix, index) => ({
      id: `rec-${index}`,
      priority: this.assessPriority(hypothesis) as Priority,
      action: fix,
      description: `Recommended action for ${hypothesis.type}`,
      estimatedImpact: "High" as const,
      implementationEffort: this.assessEffort(hypothesis),
      relatedEvidence: hypothesis.evidence.map((e) => e.id),
    }));
  }

  private assessPriority(hypothesis: RootCauseHypothesis): string {
    if (hypothesis.confidence > 0.85) return "high";
    if (hypothesis.confidence > 0.7) return "medium";
    return "low";
  }

  private assessEffort(hypothesis: RootCauseHypothesis): Effort {
    switch (hypothesis.type) {
      case "configuration-error":
        return "easy";
      case "database-issue":
      case "api-failure":
        return "medium";
      case "code-bug":
      case "security-issue":
        return "hard";
      default:
        return "medium";
    }
  }

  private buildTimeline(evidence: Evidence[]): EventTimeline {
    const events: TimelineEvent[] = evidence
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .map((ev) => ({
        timestamp: ev.timestamp,
        type: ev.type === "span" && ev.description.includes("Error") ? "error" : "warning",
        component: ev.source,
        description: ev.description,
        traceId: ev.data.traceId as string | undefined,
        spanId: ev.data.spanId as string | undefined,
      }));

    const rootCauseTime = events.length > 0 ? events[0].timestamp : new Date().toISOString();

    return {
      events,
      rootCauseTime,
      detectionTime: new Date().toISOString(),
      totalDuration: events.length > 1
        ? new Date(events[events.length - 1].timestamp).getTime() - new Date(events[0].timestamp).getTime()
        : 0,
    };
  }

  private createUnknownResult(analysisId: string, startTime: number): RCAResult {
    return {
      rootCause: "Unknown - insufficient evidence",
      confidence: 0,
      evidence: [],
      impactedComponents: [],
      severity: "low",
      recommendations: [],
      timeline: {
        events: [],
        rootCauseTime: new Date().toISOString(),
        detectionTime: new Date().toISOString(),
        totalDuration: 0,
      },
      analysisId,
      analyzedAt: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  }
}

// ============================================
// Helper Classes
// ============================================

/**
 * RCA Error
 */
export class RCAError extends Error {
  constructor(
    message: string,
    public code: "INPUT_INVALID" | "DATA_NOT_FOUND" | "ANALYSIS_TIMEOUT" | "INSUFFICIENT_DATA" | "INTERNAL_ERROR",
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "RCAError";
  }
}

/**
 * Generate unique analysis ID
 */
function generateAnalysisId(): string {
  return `rca-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// Singleton Instance
// ============================================

let defaultEngine: RCAEngine | undefined;

/**
 * Get default RCA engine instance
 */
export function getRCAEngine(): RCAEngine {
  if (!defaultEngine) {
    defaultEngine = new RCAEngine();
  }
  return defaultEngine;
}

/**
 * Initialize default RCA engine
 */
export function initRCAEngine(): RCAEngine {
  defaultEngine = new RCAEngine();
  return defaultEngine;
}
