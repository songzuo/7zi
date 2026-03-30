/**
 * Correlation Engine
 *
 * Analyzes and correlates multiple related anomalies to identify common root causes
 */

import { Severity, SeverityLevel } from './types';

// ============================================================================
// Types
// ============================================================================

export interface AnomalyEvent {
  id: string;
  timestamp: number;
  metric: string;
  value: number;
  severity: SeverityLevel;
  context: EventContext;
  correlationId?: string;
  rootCauseId?: string;
}

export interface EventContext {
  userId?: string;
  sessionId?: string;
  route?: string;
  endpoint?: string;
  component?: string;
  browser?: string;
  device?: string;
  network?: string;
  tags?: string[];
  custom?: Record<string, any>;
}

export interface Correlation {
  id: string;
  type: CorrelationType;
  strength: number; // 0-1 confidence score
  description: string;
  events: AnomalyEvent[];
  pattern: CorrelationPattern;
  timeframe: {
    start: number;
    end: number;
    duration: number;
  };
  rootCauseHypothesis: string;
}

export type CorrelationType =
  | 'temporal' // Events occurring close in time
  | 'contextual' // Events sharing similar context (user, route, etc.)
  | 'causal' // One event triggering another
  | 'cluster' // Multiple events from same component/module
  | 'cascading' // Chain of related events
  | 'simultaneous' // Events occurring simultaneously;

export interface CorrelationPattern {
  type: string;
  frequency: number;
  sequence?: string[];
  metrics: string[];
  timeWindow: number;
}

export interface CorrelationGroup {
  id: string;
  correlations: Correlation[];
  primaryCorrelation: Correlation;
  confidence: number;
  summary: string;
  suggestedRootCause: string;
}

export interface CorrelationConfig {
  temporalWindow: number; // milliseconds
  contextualWeight: number; // 0-1
  causalWeight: number; // 0-1
  minCorrelationStrength: number; // 0-1
  maxTimeBetweenEvents: number; // milliseconds
  enablePatternMatching: boolean;
}

export const DEFAULT_CORRELATION_CONFIG: CorrelationConfig = {
  temporalWindow: 60000, // 1 minute
  contextualWeight: 0.4,
  causalWeight: 0.6,
  minCorrelationStrength: 0.5,
  maxTimeBetweenEvents: 120000, // 2 minutes
  enablePatternMatching: true
};

// ============================================================================
// Correlation Engine
// ============================================================================

/**
 * Correlation Engine
 *
 * Analyzes anomalies to find correlations and identify common root causes
 */
export class CorrelationEngine {
  private config: CorrelationConfig;
  private eventHistory: AnomalyEvent[] = [];
  private correlations: Map<string, Correlation> = new Map();
  private correlationGroups: Map<string, CorrelationGroup> = new Map();

  constructor(config: Partial<CorrelationConfig> = {}) {
    this.config = { ...DEFAULT_CORRELATION_CONFIG, ...config };
  }

  // ============================================================================
  // Event Management
  // ============================================================================

  /**
   * Add an anomaly event to the correlation engine
   */
  addEvent(event: AnomalyEvent): void {
    this.eventHistory.push(event);

    // Keep history size manageable
    if (this.eventHistory.length > 1000) {
      this.eventHistory = this.eventHistory.slice(-1000);
    }
  }

  /**
   * Add multiple anomaly events
   */
  addEvents(events: AnomalyEvent[]): void {
    events.forEach(event => this.addEvent(event));
  }

  /**
   * Get events within a time window
   */
  getEventsInWindow(
    startTimestamp: number,
    endTimestamp: number,
    filter?: (event: AnomalyEvent) => boolean
  ): AnomalyEvent[] {
    return this.eventHistory.filter(event => {
      const inWindow = event.timestamp >= startTimestamp && event.timestamp <= endTimestamp;
      return inWindow && (!filter || filter(event));
    });
  }

  /**
   * Get events by context
   */
  getEventsByContext(context: Partial<EventContext>): AnomalyEvent[] {
    return this.eventHistory.filter(event => {
      return Object.entries(context).every(([key, value]) => {
        return event.context[key as keyof EventContext] === value;
      });
    });
  }

  // ============================================================================
  // Correlation Analysis
  // ============================================================================

  /**
   * Analyze all events for correlations
   */
  analyzeCorrelations(): Correlation[] {
    const correlations: Correlation[] = [];

    // Temporal correlations
    correlations.push(...this.findTemporalCorrelations());

    // Contextual correlations
    correlations.push(...this.findContextualCorrelations());

    // Causal correlations
    correlations.push(...this.findCausalCorrelations());

    // Cluster correlations
    correlations.push(...this.findClusterCorrelations());

    // Cascading correlations
    correlations.push(...this.findCascadingCorrelations());

    // Filter by minimum strength
    const filtered = correlations.filter(
      c => c.strength >= this.config.minCorrelationStrength
    );

    // Store correlations
    filtered.forEach(correlation => {
      this.correlations.set(correlation.id, correlation);
    });

    return filtered;
  }

  /**
   * Find temporal correlations (events close in time)
   */
  private findTemporalCorrelations(): Correlation[] {
    const correlations: Correlation[] = [];
    const sortedEvents = [...this.eventHistory].sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 0; i < sortedEvents.length; i++) {
      const event1 = sortedEvents[i];
      const relatedEvents: AnomalyEvent[] = [event1];

      // Find events within temporal window
      for (let j = i + 1; j < sortedEvents.length; j++) {
        const event2 = sortedEvents[j];
        const timeDiff = event2.timestamp - event1.timestamp;

        if (timeDiff <= this.config.temporalWindow) {
          relatedEvents.push(event2);
        } else {
          break;
        }
      }

      // Only create correlation if multiple events found
      if (relatedEvents.length >= 2) {
        const correlation: Correlation = {
          id: `temporal-${event1.id}-${Date.now()}`,
          type: 'temporal',
          strength: this.calculateTemporalStrength(relatedEvents),
          description: `${relatedEvents.length} events occurred within ${this.config.temporalWindow}ms`,
          events: relatedEvents,
          pattern: {
            type: 'temporal-cluster',
            frequency: relatedEvents.length,
            metrics: relatedEvents.map(e => e.metric),
            timeWindow: this.config.temporalWindow
          },
          timeframe: {
            start: relatedEvents[0].timestamp,
            end: relatedEvents[relatedEvents.length - 1].timestamp,
            duration: relatedEvents[relatedEvents.length - 1].timestamp - relatedEvents[0].timestamp
          },
          rootCauseHypothesis: 'Related events suggest a common trigger or shared resource bottleneck'
        };

        correlations.push(correlation);
      }
    }

    return correlations;
  }

  /**
   * Find contextual correlations (events sharing similar context)
   */
  private findContextualCorrelations(): Correlation[] {
    const correlations: Correlation[] = [];

    // Group events by various context keys
    const contextKeys: (keyof EventContext)[] = ['userId', 'route', 'endpoint', 'component'];

    for (const key of contextKeys) {
      const groups = this.groupEventsByKey(key);

      for (const [value, events] of Object.entries(groups)) {
        if (events.length >= 2) {
          const correlation: Correlation = {
            id: `contextual-${key}-${value}-${Date.now()}`,
            type: 'contextual',
            strength: this.calculateContextualStrength(events, key),
            description: `${events.length} events shared ${key} = ${value}`,
            events: events,
            pattern: {
              type: 'contextual-cluster',
              frequency: events.length,
              metrics: events.map(e => e.metric),
              timeWindow: this.getTimeSpread(events)
            },
            timeframe: (() => {
              const { min, max } = events.reduce(
                (acc, e) => ({
                  min: Math.min(acc.min, e.timestamp),
                  max: Math.max(acc.max, e.timestamp)
                }),
                { min: Infinity, max: -Infinity }
              );
              return {
                start: min,
                end: max,
                duration: max - min
              };
            })(),
            rootCauseHypothesis: `Events related to ${key} suggest issue specific to this context`
          };

          correlations.push(correlation);
        }
      }
    }

    return correlations;
  }

  /**
   * Find causal correlations (one event triggering another)
   */
  private findCausalCorrelations(): Correlation[] {
    const correlations: Correlation[] = [];
    const sortedEvents = [...this.eventHistory].sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 0; i < sortedEvents.length; i++) {
      const event1 = sortedEvents[i];

      for (let j = i + 1; j < sortedEvents.length; j++) {
        const event2 = sortedEvents[j];
        const timeDiff = event2.timestamp - event1.timestamp;

        if (timeDiff > this.config.maxTimeBetweenEvents) {
          break;
        }

        // Check for causal relationships
        const causalStrength = this.calculateCausalStrength(event1, event2);

        if (causalStrength >= this.config.minCorrelationStrength) {
          const correlation: Correlation = {
            id: `causal-${event1.id}-${event2.id}-${Date.now()}`,
            type: 'causal',
            strength: causalStrength,
            description: `${event1.metric} may have triggered ${event2.metric}`,
            events: [event1, event2],
            pattern: {
              type: 'causal-chain',
              frequency: 1,
              sequence: [event1.metric, event2.metric],
              metrics: [event1.metric, event2.metric],
              timeWindow: timeDiff
            },
            timeframe: {
              start: event1.timestamp,
              end: event2.timestamp,
              duration: timeDiff
            },
            rootCauseHypothesis: `${event1.metric} appears to cause ${event2.metric}`
          };

          correlations.push(correlation);
        }
      }
    }

    return correlations;
  }

  /**
   * Find cluster correlations (events from same component/module)
   */
  private findClusterCorrelations(): Correlation[] {
    const correlations: Correlation[] = [];

    // Group by component
    const componentGroups = this.groupEventsByKey('component');

    for (const [component, events] of Object.entries(componentGroups)) {
      if (!component || events.length < 2) continue;

      // Check if events form a temporal cluster
      const timeSpread = this.getTimeSpread(events);

      if (timeSpread <= this.config.temporalWindow * 2) {
        const correlation: Correlation = {
          id: `cluster-${component}-${Date.now()}`,
          type: 'cluster',
          strength: this.calculateClusterStrength(events),
          description: `${events.length} events from component '${component}' clustered temporally`,
          events: events,
          pattern: {
            type: 'component-cluster',
            frequency: events.length,
            metrics: events.map(e => e.metric),
            timeWindow: timeSpread
          },
          timeframe: {
            start: Math.min(...events.map(e => e.timestamp)),
            end: Math.max(...events.map(e => e.timestamp)),
            duration: timeSpread
          },
          rootCauseHypothesis: `Multiple issues in component '${component}' suggest underlying problem`
        };

        correlations.push(correlation);
      }
    }

    return correlations;
  }

  /**
   * Find cascading correlations (chain of related events)
   */
  private findCascadingCorrelations(): Correlation[] {
    const correlations: Correlation[] = [];

    // Sort events by timestamp
    const sortedEvents = [...this.eventHistory].sort((a, b) => a.timestamp - b.timestamp);

    // Find chains of events
    const chains = this.findEventChains(sortedEvents);

    for (const chain of chains) {
      if (chain.length >= 3) {
        const correlation: Correlation = {
          id: `cascading-${chain[0].id}-${chain[chain.length - 1].id}-${Date.now()}`,
          type: 'cascading',
          strength: this.calculateCascadingStrength(chain),
          description: `Cascade of ${chain.length} related events`,
          events: chain,
          pattern: {
            type: 'cascade-chain',
            frequency: chain.length,
            sequence: chain.map(e => e.metric),
            metrics: chain.map(e => e.metric),
            timeWindow: this.getTimeSpread(chain)
          },
          timeframe: {
            start: chain[0].timestamp,
            end: chain[chain.length - 1].timestamp,
            duration: this.getTimeSpread(chain)
          },
          rootCauseHypothesis: `Cascading events suggest compound failure or resource exhaustion`
        };

        correlations.push(correlation);
      }
    }

    return correlations;
  }

  // ============================================================================
  // Correlation Strength Calculations
  // ============================================================================

  private calculateTemporalStrength(events: AnomalyEvent[]): number {
    // More events in shorter time window = stronger correlation
    const timeSpread = this.getTimeSpread(events);
    const density = events.length / Math.max(timeSpread / 1000, 1); // events per second
    return Math.min(density / 10, 1);
  }

  private calculateContextualStrength(events: AnomalyEvent[], key: keyof EventContext): number {
    // More events sharing same context = stronger correlation
    const eventCount = events.length;
    const severityMatch = this.calculateSeverityMatch(events);
    return (Math.min(eventCount / 5, 1) + severityMatch) / 2;
  }

  private calculateCausalStrength(event1: AnomalyEvent, event2: AnomalyEvent): number {
    let strength = 0;

    // Temporal proximity (closer = more likely causal)
    const timeDiff = event2.timestamp - event1.timestamp;
    strength += Math.max(0, 1 - timeDiff / this.config.maxTimeBetweenEvents) * this.config.causalWeight;

    // Context similarity
    const contextSimilarity = this.calculateContextSimilarity(event1.context, event2.context);
    strength += contextSimilarity * this.config.contextualWeight;

    // Metric relationships (known causal patterns)
    const metricRelationship = this.checkMetricRelationship(event1.metric, event2.metric);
    strength += metricRelationship * 0.3;

    return Math.min(strength, 1);
  }

  private calculateClusterStrength(events: AnomalyEvent[]): number {
    // More events from same component = stronger correlation
    const eventCount = events.length;
    const timeSpread = this.getTimeSpread(events);
    const temporalDensity = eventCount / Math.max(timeSpread / 1000, 1);
    return Math.min(temporalDensity / 5, 1);
  }

  private calculateCascadingStrength(chain: AnomalyEvent[]): number {
    // Longer chains with consistent timing = stronger correlation
    const chainLength = chain.length;
    const avgInterval = this.getTimeSpread(chain) / (chainLength - 1);
    const consistency = 1 - Math.min(avgInterval / this.config.maxTimeBetweenEvents, 1);
    return (Math.min(chainLength / 5, 1) + consistency) / 2;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private groupEventsByKey(key: keyof EventContext): Record<string, AnomalyEvent[]> {
    const groups: Record<string, AnomalyEvent[]> = {};

    for (const event of this.eventHistory) {
      const value = event.context[key];
      if (value !== undefined) {
        const stringValue = String(value);
        if (!groups[stringValue]) {
          groups[stringValue] = [];
        }
        groups[stringValue].push(event);
      }
    }

    return groups;
  }

  private getTimeSpread(events: AnomalyEvent[]): number {
    if (events.length === 0) return 0;
    const timestamps = events.map(e => e.timestamp);
    return Math.max(...timestamps) - Math.min(...timestamps);
  }

  private calculateSeverityMatch(events: AnomalyEvent[]): number {
    if (events.length === 0) return 0;
    const severities = events.map(e => {
      const severityLevels = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
      return severityLevels[e.severity] || 0;
    });
    const avgSeverity = severities.reduce((sum, s) => sum + s, 0) / severities.length;
    return avgSeverity / 4;
  }

  private calculateContextSimilarity(
    context1: EventContext,
    context2: EventContext
  ): number {
    const keys: (keyof EventContext)[] = ['userId', 'route', 'endpoint', 'component'];
    let matches = 0;
    let total = 0;

    for (const key of keys) {
      if (context1[key] !== undefined && context2[key] !== undefined) {
        total++;
        if (context1[key] === context2[key]) {
          matches++;
        }
      }
    }

    return total > 0 ? matches / total : 0;
  }

  private checkMetricRelationship(metric1: string, metric2: string): number {
    // Known causal relationships
    const causalPairs: Record<string, number> = {
      'database-query-time->api-response-time': 0.8,
      'api-response-time->lcp': 0.7,
      'lcp->cls': 0.3,
      'memory-usage->gc-pause': 0.9,
      'cpu-usage->long-tasks': 0.8,
      'long-tasks->fid': 0.7
    };

    const key = `${metric1}->${metric2}`;
    return causalPairs[key] || 0;
  }

  private findEventChains(events: AnomalyEvent[]): AnomalyEvent[][] {
    const chains: AnomalyEvent[][] = [];
    const used = new Set<string>();

    for (const event of events) {
      if (used.has(event.id)) continue;

      const chain = [event];
      used.add(event.id);

      // Build chain forward
      let current = event;
      let foundNext = true;
      while (foundNext) {
        foundNext = false;
        const timeWindow = current.timestamp + this.config.maxTimeBetweenEvents;

        for (const next of events) {
          if (used.has(next.id)) continue;
          if (next.timestamp > current.timestamp && next.timestamp <= timeWindow) {
            const strength = this.calculateCausalStrength(current, next);
            if (strength >= this.config.minCorrelationStrength) {
              chain.push(next);
              used.add(next.id);
              current = next;
              foundNext = true;
              break;
            }
          }
        }
      }

      if (chain.length >= 2) {
        chains.push(chain);
      }
    }

    return chains;
  }

  // ============================================================================
  // Correlation Grouping
  // ============================================================================

  /**
   * Group related correlations together
   */
  groupCorrelations(): CorrelationGroup[] {
    const groups: CorrelationGroup[] = [];
    const usedCorrelations = new Set<string>();

    for (const correlation of this.correlations.values()) {
      if (usedCorrelations.has(correlation.id)) continue;

      // Find related correlations
      const related = this.findRelatedCorrelations(correlation);

      if (related.length >= 1) {
        // Determine primary correlation
        const primary = this.determinePrimaryCorrelation(related);
        const confidence = this.calculateGroupConfidence(related);

        const group: CorrelationGroup = {
          id: `group-${primary.id}`,
          correlations: related,
          primaryCorrelation: primary,
          confidence,
          summary: this.generateGroupSummary(related, primary),
          suggestedRootCause: this.inferRootCause(related, primary)
        };

        groups.push(group);

        related.forEach(c => usedCorrelations.add(c.id));
      }
    }

    return groups;
  }

  private findRelatedCorrelations(correlation: Correlation): Correlation[] {
    const related: Correlation[] = [correlation];

    for (const other of this.correlations.values()) {
      if (other.id === correlation.id) continue;

      // Check for overlap in events
      const eventOverlap = correlation.events.some(e =>
        other.events.some(oe => oe.id === e.id)
      );

      // Check for similar timeframes
      const timeOverlap =
        Math.min(correlation.timeframe.end, other.timeframe.end) -
        Math.max(correlation.timeframe.start, other.timeframe.start) > 0;

      if (eventOverlap || timeOverlap) {
        related.push(other);
      }
    }

    return related;
  }

  private determinePrimaryCorrelation(correlations: Correlation[]): Correlation {
    // Select correlation with highest strength
    return correlations.reduce((max, curr) =>
      curr.strength > max.strength ? curr : max
    );
  }

  private calculateGroupConfidence(correlations: Correlation[]): number {
    const avgStrength =
      correlations.reduce((sum, c) => sum + c.strength, 0) / correlations.length;
    return avgStrength;
  }

  private generateGroupSummary(correlations: Correlation[], primary: Correlation): string {
    const totalEvents = new Set(
      correlations.flatMap(c => c.events.map(e => e.id))
    ).size;

    return `${correlations.length} correlations involving ${totalEvents} events. Primary: ${primary.description}`;
  }

  private inferRootCause(correlations: Correlation[], primary: Correlation): string {
    // Use primary correlation's hypothesis as starting point
    const hypotheses = correlations.map(c => c.rootCauseHypothesis);
    const frequencyMap: Record<string, number> = {};

    for (const hypothesis of hypotheses) {
      frequencyMap[hypothesis] = (frequencyMap[hypothesis] || 0) + 1;
    }

    // Find most common hypothesis
    return Object.entries(frequencyMap)
      .sort(([, a], [, b]) => b - a)[0][0];
  }

  // ============================================================================
  // Reporting
  // ============================================================================

  /**
   * Generate correlation report
   */
  generateReport(): {
    totalEvents: number;
    totalCorrelations: number;
    correlationGroups: CorrelationGroup[];
    summary: string;
  } {
    const correlations = this.analyzeCorrelations();
    const groups = this.groupCorrelations();

    return {
      totalEvents: this.eventHistory.length,
      totalCorrelations: correlations.length,
      correlationGroups: groups,
      summary: `Analyzed ${this.eventHistory.length} events, found ${correlations.length} correlations forming ${groups.length} groups`
    };
  }

  /**
   * Clear all events and correlations
   */
  clear(): void {
    this.eventHistory = [];
    this.correlations.clear();
    this.correlationGroups.clear();
  }
}

export default CorrelationEngine;
