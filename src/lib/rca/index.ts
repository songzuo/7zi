/**
 * RCA Module - Root Cause Analysis
 *
 * Automated root cause analysis for errors, performance issues, and anomalies.
 *
 * @version v1.8.0
 */

// Core Engine
export { RCAEngine, RCAError, getRCAEngine, initRCAEngine } from "./RCAEngine";

// Types
export type {
  RCAResult,
  Evidence,
  Recommendation,
  EventTimeline,
  TimelineEvent,
  RootCauseHypothesis,
  RCAInput,
  TraceData,
  SpanError,
  TracePerformance,
  SlowSpan,
} from "./RCAEngine";

// Enums
export type { Severity, Priority, Effort, RootCauseType } from "./RCAEngine";
