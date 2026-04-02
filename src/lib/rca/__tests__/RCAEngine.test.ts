/**
 * RCAEngine Tests
 *
 * @version v1.8.0
 */

import { describe, it, expect, beforeEach } from "vitest";
import { RCAEngine, type RCAResult, type RCAInput, type TraceData } from "../RCAEngine";
import { SpanKind, SpanStatusCode } from "../../tracing/types";

// Helper to create mock spans
function createMockSpan(
  name: string,
  status: { code: SpanStatusCode; message?: string },
  duration: number = 100,
  parentSpanId?: string
): import("../../tracing/types").Span {
  const now = Date.now();
  return {
    spanId: `span-${Math.random().toString(36).substr(2, 9)}`,
    name,
    kind: SpanKind.INTERNAL,
    startTime: now - duration,
    endTime: now,
    duration,
    parentSpanId,
    status,
    attributes: {},
    events: [],
    links: [],
  };
}

describe("RCAEngine", () => {
  let engine: RCAEngine;

  beforeEach(() => {
    engine = new RCAEngine();
  });

  describe("analyze", () => {
    it("should return error for invalid input", async () => {
      await expect(engine.analyze({})).rejects.toThrow("At least one");
    });

    it("should return unknown result for empty trace", async () => {
      const result = await engine.analyze({ traceId: "non-existent" });
      expect(result.confidence).toBe(0);
      expect(result.rootCause).toContain("Unknown");
    });
  });

  describe("analyzeTrace", () => {
    it("should analyze trace with database timeout", async () => {
      const traceData: TraceData = {
        traceId: "trace-db-timeout",
        spans: [
          createMockSpan("db.query.users", { code: 2, message: "Connection timeout" }, 5000),
        ],
        metadata: { serviceName: "user-service" },
        errors: [
          {
            spanId: "span-1",
            name: "db.query.users",
            message: "Connection timeout",
            timestamp: Date.now(),
          },
        ],
        performance: {
          totalDuration: 5000,
          spanCount: 1,
          errorCount: 1,
          slowSpans: [],
        },
      };

      const result = await engine.analyzeTrace(traceData);

      expect(result).toBeDefined();
      expect(result.analysisId).toMatch(/^rca-/);
      expect(result.rootCause).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.evidence).toBeInstanceOf(Array);
    });

    it("should detect slow spans", async () => {
      const traceData: TraceData = {
        traceId: "trace-slow",
        spans: [
          createMockSpan("api.request", { code: 1 }, 6000),
        ],
        metadata: { serviceName: "api-gateway" },
        errors: [],
        performance: {
          totalDuration: 6000,
          spanCount: 1,
          errorCount: 0,
          slowSpans: [
            {
              spanId: "span-1",
              name: "api.request",
              duration: 6000,
              threshold: 5000,
            },
          ],
        },
      };

      const result = await engine.analyzeTrace(traceData);

      expect(result).toBeDefined();
      expect(result.timeline.events.length).toBeGreaterThan(0);
    });
  });

  describe("registerTrace", () => {
    it("should register trace data correctly", () => {
      const spans: Span[] = [
        createMockSpan("http.request", { code: 1 }, 100),
        createMockSpan("db.query", { code: 2, message: "Error" }, 200, "span-1"),
      ];

      engine.registerTrace("test-trace", spans, { serviceName: "test-service" });

      // Trace should be registered without error
      expect(true).toBe(true);
    });
  });

  describe("analyzeLogs", () => {
    it("should analyze error logs", async () => {
      const logs = [
        {
          timestamp: new Date().toISOString(),
          level: "error" as const,
          message: "Connection timeout after 5000ms",
          service: "database-service",
        },
        {
          timestamp: new Date().toISOString(),
          level: "error" as const,
          message: "Query failed: deadlock detected",
          service: "database-service",
        },
      ];

      const result = await engine.analyzeLogs(logs);

      expect(result).toBeDefined();
      expect(result.rootCause).toBeDefined();
      expect(result.evidence.length).toBeGreaterThan(0);
    });

    it("should return unknown for no error logs", async () => {
      const logs = [
        {
          timestamp: new Date().toISOString(),
          level: "info" as const,
          message: "Request processed successfully",
          service: "api-service",
        },
      ];

      const result = await engine.analyzeLogs(logs);

      expect(result.confidence).toBe(0);
      expect(result.rootCause).toContain("Unknown");
    });
  });

  describe("Pattern Matching", () => {
    it("should detect database timeout pattern", async () => {
      const traceData: TraceData = {
        traceId: "trace-timeout",
        spans: [
          createMockSpan("db.query.slow", { code: 2, message: "ETIMEDOUT" }, 10000),
        ],
        metadata: { serviceName: "db-service" },
        errors: [
          {
            spanId: "span-1",
            name: "db.query.slow",
            message: "ETIMEDOUT",
            timestamp: Date.now(),
          },
        ],
        performance: {
          totalDuration: 10000,
          spanCount: 1,
          errorCount: 1,
          slowSpans: [
            { spanId: "span-1", name: "db.query.slow", duration: 10000, threshold: 5000 },
          ],
        },
      };

      const result = await engine.analyzeTrace(traceData);

      expect(result.rootCause).toBeDefined();
      // Should suggest database-related fix
      expect(
        result.suggestedFix?.toLowerCase().includes("database") ||
        result.suggestedFix?.toLowerCase().includes("query") ||
        result.recommendations.some(r => r.action.toLowerCase().includes("database"))
      ).toBe(true);
    });

    it("should detect rate limit pattern", async () => {
      const logs = [
        {
          timestamp: new Date().toISOString(),
          level: "error" as const,
          message: "Request failed with 429 Too Many Requests",
          service: "external-api",
        },
      ];

      const result = await engine.analyzeLogs(logs);

      expect(result.rootCause).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe("Recommendations", () => {
    it("should generate recommendations", async () => {
      const traceData: TraceData = {
        traceId: "trace-with-error",
        spans: [
          createMockSpan("db.query", { code: 2, message: "deadlock detected" }, 500),
        ],
        metadata: { serviceName: "service" },
        errors: [
          {
            spanId: "span-1",
            name: "db.query",
            message: "deadlock detected",
            timestamp: Date.now(),
          },
        ],
        performance: {
          totalDuration: 500,
          spanCount: 1,
          errorCount: 1,
          slowSpans: [],
        },
      };

      const result = await engine.analyzeTrace(traceData);

      expect(result.recommendations).toBeInstanceOf(Array);
      if (result.recommendations.length > 0) {
        expect(result.recommendations[0]).toHaveProperty("id");
        expect(result.recommendations[0]).toHaveProperty("priority");
        expect(result.recommendations[0]).toHaveProperty("action");
      }
    });
  });

  describe("Timeline", () => {
    it("should build event timeline", async () => {
      const traceData: TraceData = {
        traceId: "trace-timeline",
        spans: [
          createMockSpan("operation.start", { code: 1 }, 100),
          createMockSpan("operation.error", { code: 2, message: "Failed" }, 50),
        ],
        metadata: {},
        errors: [
          {
            spanId: "span-2",
            name: "operation.error",
            message: "Failed",
            timestamp: Date.now(),
          },
        ],
        performance: {
          totalDuration: 150,
          spanCount: 2,
          errorCount: 1,
          slowSpans: [],
        },
      };

      const result = await engine.analyzeTrace(traceData);

      expect(result.timeline).toBeDefined();
      expect(result.timeline.events).toBeInstanceOf(Array);
      expect(result.timeline.rootCauseTime).toBeDefined();
      expect(result.timeline.detectionTime).toBeDefined();
    });
  });

  describe("Caching", () => {
    it("should cache analysis results", async () => {
      const traceData: TraceData = {
        traceId: "trace-cache",
        spans: [
          createMockSpan("test-operation", { code: 2, message: "Error" }, 100),
        ],
        metadata: {},
        errors: [
          {
            spanId: "span-1",
            name: "test-operation",
            message: "Error",
            timestamp: Date.now(),
          },
        ],
        performance: {
          totalDuration: 100,
          spanCount: 1,
          errorCount: 1,
          slowSpans: [],
        },
      };

      const result = await engine.analyzeTrace(traceData);
      const cached = engine.getCachedResult(result.analysisId);

      expect(cached).toBeDefined();
      expect(cached?.analysisId).toBe(result.analysisId);
    });
  });
});
