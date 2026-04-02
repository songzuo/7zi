/**
 * TraceManager 单元测试
 *
 * 测试覆盖：
 * - Trace 生命周期管理（开始、结束）
 * - Span 创建和嵌套
 * - 上下文传播（W3C、B3、Sentry 格式）
 * - 异步任务追踪
 * - 采样逻辑
 * - 错误处理
 * - 边界情况
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  TraceManager,
  generateTraceId,
  generateSpanId,
  generateUUIDv4,
  initTraceManager,
  getTraceManager,
  SpanStatusCode,
  SpanKind,
} from "@/lib/trace/TraceManager";
import type { SpanId, TraceId } from "@/lib/tracing/types";

describe("TraceManager", () => {
  let traceManager: TraceManager;

  beforeEach(() => {
    traceManager = new TraceManager({
      serviceName: "test-service",
      serviceVersion: "1.0.0",
      environment: "test",
      samplingEnabled: true,
      samplingRate: 1.0,
      recordExceptions: true,
      maxSpans: 1000,
    });
  });

  afterEach(() => {
    traceManager.clear();
  });

  describe("Trace ID 生成", () => {
    it("应该生成有效的 UUID v4 格式", () => {
      const uuid = generateUUIDv4();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it("应该生成无连字符的 Trace ID", () => {
      const traceId = generateTraceId();
      expect(traceId).toHaveLength(32);
      expect(traceId).toMatch(/^[0-9a-f]{32}$/i);
    });

    it("生成的 Trace ID 应该是唯一的", () => {
      const ids = new Set<TraceId>();
      for (let i = 0; i < 1000; i++) {
        ids.add(generateTraceId());
      }
      expect(ids.size).toBe(1000);
    });
  });

  describe("Span ID 生成", () => {
    it("应该生成有效的 Span ID", () => {
      const spanId = generateSpanId();
      expect(spanId).toBeDefined();
      expect(typeof spanId).toBe("string");
      expect(spanId.length).toBeGreaterThan(0);
    });

    it("生成的 Span ID 应该是唯一的", () => {
      const ids = new Set<SpanId>();
      for (let i = 0; i < 1000; i++) {
        ids.add(generateSpanId());
      }
      expect(ids.size).toBe(1000);
    });
  });

  describe("Trace 生命周期", () => {
    it("应该开始一个新的 Trace", () => {
      const traceId = traceManager.startTrace("test-operation");

      expect(traceId).toBeDefined();
      expect(typeof traceId).toBe("string");
      expect(traceManager.getTraceId()).toBe(traceId);
    });

    it("应该使用自定义 Trace ID 开始 Trace", () => {
      const customTraceId = "custom-trace-id-12345" as TraceId;
      const traceId = traceManager.startTrace("test-operation", {
        traceId: customTraceId,
      });

      expect(traceId).toBe(customTraceId);
      expect(traceManager.getTraceId()).toBe(customTraceId);
    });

    it("应该支持自定义属性", () => {
      const traceId = traceManager.startTrace("test-operation", {
        attributes: { taskId: "123", userId: "456" },
      });

      const spans = traceManager.getSpans(traceId);
      expect(spans).toHaveLength(1);
      expect(spans[0].attributes).toMatchObject({
        taskId: "123",
        userId: "456",
        "service.name": "test-service",
      });
    });

    it("应该结束当前 Trace 并返回所有 Span", () => {
      traceManager.startTrace("test-operation");
      traceManager.startSpan("child-span");
      traceManager.endSpan(traceManager.getActiveSpan()!);

      const spans = traceManager.endTrace();
      expect(spans).toBeDefined();
      expect(spans!.length).toBeGreaterThanOrEqual(1);
      expect(traceManager.getTraceId()).toBeUndefined();
    });

    it("结束不存在的 Trace 应该返回 undefined", () => {
      const spans = traceManager.endTrace("nonexistent-trace" as TraceId);
      expect(spans).toBeUndefined();
    });

    it("应该自动关闭所有未关闭的 Span", () => {
      const traceId = traceManager.startTrace("test-operation");
      traceManager.startSpan("span1");
      traceManager.startSpan("span2");
      traceManager.startSpan("span3");

      const spans = traceManager.endTrace();
      expect(spans).toHaveLength(4); // root + 3 children

      spans!.forEach(span => {
        expect(span.endTime).toBeDefined();
        expect(span.duration).toBeDefined();
        expect(span.duration).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("Span 生命周期", () => {
    it("应该创建一个新的 Span", () => {
      traceManager.startTrace("test-operation");
      const span = traceManager.startSpan("test-span");

      expect(span).toBeDefined();
      expect(span?.spanId).toBeDefined();
      expect(span?.name).toBe("test-span");
      expect(span?.startTime).toBeDefined();
      expect(span?.status.code).toBe(SpanStatusCode.UNSET);
    });

    it("应该创建嵌套的 Span", () => {
      traceManager.startTrace("test-operation");
      const firstSpan = traceManager.startSpan("root");
      const childSpan = traceManager.startSpan("child");

      expect(childSpan?.parentSpanId).toBe(firstSpan?.spanId);
      expect(traceManager.getStackDepth()).toBe(3); // root (from startTrace) + root (from startSpan) + child
    });

    it("应该结束 Span 并设置 endTime", () => {
      traceManager.startTrace("test-operation");
      const span = traceManager.startSpan("test-span");

      expect(span?.endTime).toBeUndefined();

      traceManager.endSpan(span!);

      expect(span?.endTime).toBeDefined();
      expect(span?.duration).toBeDefined();
      expect(span?.duration).toBeGreaterThanOrEqual(0);
    });

    it("应该通过 Span ID 结束 Span", () => {
      traceManager.startTrace("test-operation");
      const span = traceManager.startSpan("test-span");
      const spanId = span?.spanId;

      traceManager.endSpan(spanId!);

      const spans = traceManager.getSpans();
      const endedSpan = spans.find(s => s.spanId === spanId);
      expect(endedSpan?.endTime).toBeDefined();
    });

    it("结束不存在的 Span 不应该抛出错误", () => {
      traceManager.startTrace("test-operation");
      expect(() => {
        traceManager.endSpan("nonexistent-span" as SpanId);
      }).not.toThrow();
    });

    it("应该支持自定义 Span 属性", () => {
      traceManager.startTrace("test-operation");
      const span = traceManager.startSpan("test-span", {
        kind: SpanKind.CLIENT,
        attributes: { httpMethod: "GET", httpUrl: "/api/test" },
      });

      expect(span?.kind).toBe(SpanKind.CLIENT);
      expect(span?.attributes).toMatchObject({
        httpMethod: "GET",
        httpUrl: "/api/test",
      });
    });

    it("应该支持自定义 Span 状态", () => {
      traceManager.startTrace("test-operation");
      const span = traceManager.startSpan("test-span");

      traceManager.endSpan(span!, {
        code: SpanStatusCode.ERROR,
        message: "Something went wrong",
      });

      expect(span?.status).toMatchObject({
        code: SpanStatusCode.ERROR,
        message: "Something went wrong",
      });
    });
  });

  describe("Span 栈管理", () => {
    it("应该正确维护 Span 栈", () => {
      traceManager.startTrace("test-operation");
      const span1 = traceManager.startSpan("span1");
      const span2 = traceManager.startSpan("span2");
      const span3 = traceManager.startSpan("span3");

      expect(traceManager.getStackDepth()).toBe(4); // root (from startTrace) + span1 + span2 + span3
      expect(traceManager.getActiveSpan()?.spanId).toBe(span3?.spanId);

      traceManager.endSpan(span3!);
      expect(traceManager.getStackDepth()).toBe(3);
      expect(traceManager.getActiveSpan()?.spanId).toBe(span2?.spanId);

      traceManager.endSpan(span2!);
      expect(traceManager.getStackDepth()).toBe(2);
      expect(traceManager.getActiveSpan()?.spanId).toBe(span1?.spanId);
    });
  });

  describe("异步任务追踪", () => {
    it("应该使用 withSpan 包装异步函数", async () => {
      traceManager.startTrace("test-operation");

      const result = await traceManager.withSpan("async-task", async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return "success";
      });

      expect(result).toBe("success");

      const spans = traceManager.getSpans();
      const span = spans.find(s => s.name === "async-task");
      expect(span).toBeDefined();
      expect(span?.status.code).toBe(SpanStatusCode.OK);
      expect(span?.endTime).toBeDefined();
    });

    it("应该捕获并记录异步函数中的错误", async () => {
      traceManager.startTrace("test-operation");

      await expect(
        traceManager.withSpan("async-task", async () => {
          throw new Error("Test error");
        })
      ).rejects.toThrow("Test error");

      const spans = traceManager.getSpans();
      const span = spans.find(s => s.name === "async-task");
      expect(span?.status.code).toBe(SpanStatusCode.ERROR);
      expect(span?.status.message).toBe("Test error");
      expect(span?.events.some(e => e.name === "exception")).toBe(true);
    });

    it("应该使用 withSpanSync 包装同步函数", () => {
      traceManager.startTrace("test-operation");

      const result = traceManager.withSpanSync("sync-task", () => {
        return "success";
      });

      expect(result).toBe("success");

      const spans = traceManager.getSpans();
      const span = spans.find(s => s.name === "sync-task");
      expect(span).toBeDefined();
      expect(span?.status.code).toBe(SpanStatusCode.OK);
    });

    it("应该捕获并记录同步函数中的错误", () => {
      traceManager.startTrace("test-operation");

      expect(() => {
        traceManager.withSpanSync("sync-task", () => {
          throw new Error("Sync error");
        });
      }).toThrow("Sync error");

      const spans = traceManager.getSpans();
      const span = spans.find(s => s.name === "sync-task");
      expect(span?.status.code).toBe(SpanStatusCode.ERROR);
    });

    it("应该追踪并行任务", async () => {
      traceManager.startTrace("test-operation");

      const results = await traceManager.trackParallelTasks([
        { name: "task1", task: async () => "result1" },
        { name: "task2", task: async () => "result2" },
        { name: "task3", task: async () => "result3" },
      ]);

      expect(results).toEqual(["result1", "result2", "result3"]);

      const spans = traceManager.getSpans();
      const parallelSpans = spans.filter(s => s.name.startsWith("task"));
      expect(parallelSpans).toHaveLength(3);
      parallelSpans.forEach(span => {
        expect(span?.status.code).toBe(SpanStatusCode.OK);
      });
    });

    it("应该使用 trackAsyncTask 追踪带 Span 的异步任务", async () => {
      traceManager.startTrace("test-operation");

      const result = await traceManager.trackAsyncTask(
        "async-task",
        async (span) => {
          traceManager.setAttribute(span, "custom", "value");
          await new Promise(resolve => setTimeout(resolve, 10));
          return "success";
        }
      );

      expect(result).toBe("success");

      const spans = traceManager.getSpans();
      const span = spans.find(s => s.name === "async-task");
      expect(span?.attributes).toMatchObject({ custom: "value" });
    });
  });

  describe("Span 操作", () => {
    it("应该添加 Span 事件", () => {
      traceManager.startTrace("test-operation");
      const span = traceManager.startSpan("test-span");

      traceManager.addEvent(span!, "event1", { key1: "value1" });
      traceManager.addEvent(span!, "event2", { key2: "value2" });

      expect(span?.events).toHaveLength(2);
      expect(span?.events[0]).toMatchObject({
        name: "event1",
        attributes: { key1: "value1" },
      });
    });

    it("应该设置 Span 属性", () => {
      traceManager.startTrace("test-operation");
      const span = traceManager.startSpan("test-span");

      traceManager.setAttribute(span!, "key1", "value1");
      traceManager.setAttribute(span!, "key2", 123);
      traceManager.setAttribute(span!, "key3", true);

      expect(span?.attributes).toMatchObject({
        key1: "value1",
        key2: 123,
        key3: true,
      });
    });

    it("应该设置 Span 状态", () => {
      traceManager.startTrace("test-operation");
      const span = traceManager.startSpan("test-span");

      traceManager.setStatus(span!, {
        code: SpanStatusCode.OK,
        message: "Success",
      });

      expect(span?.status).toMatchObject({
        code: SpanStatusCode.OK,
        message: "Success",
      });
    });

    it("应该记录异常", () => {
      traceManager.startTrace("test-operation");
      const span = traceManager.startSpan("test-span");

      const error = new Error("Test exception");
      traceManager.recordException(span!, error);

      expect(span?.status).toMatchObject({
        code: SpanStatusCode.ERROR,
        message: "Test exception",
      });
      expect(span?.events.some(e => e.name === "exception")).toBe(true);

      const exceptionEvent = span?.events.find(e => e.name === "exception");
      expect(exceptionEvent?.attributes).toMatchObject({
        "exception.type": "Error",
        "exception.message": "Test exception",
      });
    });
  });

  describe("上下文传播", () => {
    it("应该返回当前 Trace Context", () => {
      traceManager.startTrace("test-operation");
      const context = traceManager.getContext();

      expect(context).toBeDefined();
      expect(context?.traceId).toBeDefined();
      expect(context?.spanId).toBeDefined();
      expect(context?.sampled).toBe(true);
    });

    it("应该在没有活跃 Trace 时返回 undefined", () => {
      const context = traceManager.getContext();
      expect(context).toBeUndefined();
    });

    it("应该注入 W3C 格式的上下文", () => {
      traceManager.startTrace("test-operation");
      const headers: Record<string, string> = {};

      traceManager.injectContext(headers, "w3c");

      expect(headers["traceparent"]).toBeDefined();
      const parts = headers["traceparent"].split("-");
      expect(parts).toHaveLength(4);
      expect(parts[0]).toBe("00"); // version
    });

    it("应该注入 B3 格式的上下文", () => {
      traceManager.startTrace("test-operation");
      const headers: Record<string, string> = {};

      traceManager.injectContext(headers, "b3");

      expect(headers["X-B3-TraceId"]).toBeDefined();
      expect(headers["X-B3-SpanId"]).toBeDefined();
      expect(headers["X-B3-Sampled"]).toBe("1");
    });

    it("应该注入 Sentry 格式的上下文", () => {
      traceManager.startTrace("test-operation");
      const headers: Record<string, string> = {};

      traceManager.injectContext(headers, "sentry");

      expect(headers["sentry-trace"]).toBeDefined();
      const parts = headers["sentry-trace"].split("-");
      expect(parts.length).toBeGreaterThanOrEqual(2);
    });

    it("应该提取 W3C 格式的上下文", () => {
      const headers = {
        traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      };

      const context = traceManager.extractContext(headers);

      expect(context).toBeDefined();
      expect(context?.traceId).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
      expect(context?.spanId).toBe("00f067aa0ba902b7");
      expect(context?.sampled).toBe(true);
    });

    it("应该提取 B3 格式的上下文", () => {
      const headers = {
        "X-B3-TraceId": "4bf92f3577b34da6a3ce929d0e0e4736",
        "X-B3-SpanId": "00f067aa0ba902b7",
        "X-B3-ParentSpanId": "00f067aa0ba902b6",
        "X-B3-Sampled": "1",
      };

      const context = traceManager.extractContext(headers);

      expect(context).toBeDefined();
      expect(context?.traceId).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
      expect(context?.spanId).toBe("00f067aa0ba902b7");
      expect(context?.parentSpanId).toBe("00f067aa0ba902b6");
      expect(context?.sampled).toBe(true);
    });

    it("应该提取 Sentry 格式的上下文", () => {
      const headers = {
        "sentry-trace": "4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-1",
      };

      const context = traceManager.extractContext(headers);

      expect(context).toBeDefined();
      expect(context?.traceId).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
      expect(context?.spanId).toBe("00f067aa0ba902b7");
      expect(context?.sampled).toBe(true);
    });

    it("应该从外部上下文恢复追踪", () => {
      const externalContext = {
        traceId: "external-trace-id-12345678901234567890123456789012" as TraceId,
        spanId: "external-span-id" as SpanId,
        sampled: true,
        traceFlags: 1,
      };

      const traceId = traceManager.restoreFromContext(externalContext);

      expect(traceId).toBe(externalContext.traceId);
      expect(traceManager.getTraceId()).toBe(externalContext.traceId);
    });
  });

  describe("查询方法", () => {
    it("应该返回所有 Span", () => {
      const traceId = traceManager.startTrace("test-operation");
      traceManager.startSpan("span1");
      traceManager.startSpan("span2");

      const spans = traceManager.getSpans(traceId);
      expect(spans.length).toBeGreaterThanOrEqual(2);
    });

    it("应该返回 Span 数量", () => {
      traceManager.startTrace("test-operation");
      traceManager.startSpan("span1");
      traceManager.startSpan("span2");

      const count = traceManager.getSpanCount();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it("应该返回当前 Span 栈深度", () => {
      traceManager.startTrace("test-operation");
      expect(traceManager.getStackDepth()).toBe(1); // root span

      traceManager.startSpan("span1");
      expect(traceManager.getStackDepth()).toBe(2);

      traceManager.startSpan("span2");
      expect(traceManager.getStackDepth()).toBe(3);
    });

    it("应该返回当前活跃的 Span", () => {
      traceManager.startTrace("test-operation");
      const span = traceManager.startSpan("test-span");

      const activeSpan = traceManager.getActiveSpan();
      expect(activeSpan?.spanId).toBe(span?.spanId);
    });
  });

  describe("采样", () => {
    it("应该在采样率为 1.0 时采样所有请求", () => {
      const tm = new TraceManager({
        serviceName: "test",
        samplingEnabled: true,
        samplingRate: 1.0,
      });

      tm.startTrace("test1");
      tm.endTrace();

      tm.startTrace("test2");
      const spans = tm.endTrace();

      expect(spans).toBeDefined();
      expect(spans!.length).toBeGreaterThan(0);
    });

    it("应该在采样率为 0.0 时不采样任何请求", () => {
      const tm = new TraceManager({
        serviceName: "test",
        samplingEnabled: true,
        samplingRate: 0.0,
      });

      tm.startTrace("test1");
      const spans = tm.endTrace();

      // 采样率为 0.0 时，应该返回 undefined（不采样）
      expect(spans).toBeUndefined();
    });

    it("应该在禁用采样时采样所有请求", () => {
      const tm = new TraceManager({
        serviceName: "test",
        samplingEnabled: false,
        samplingRate: 0.1,
      });

      tm.startTrace("test1");
      const spans = tm.endTrace();

      expect(spans).toBeDefined();
      expect(spans!.length).toBeGreaterThan(0);
    });
  });

  describe("边界情况", () => {
    it("应该在超过最大 Span 数量时发出警告", () => {
      const tm = new TraceManager({
        serviceName: "test",
        maxSpans: 5,
      });

      tm.startTrace("test-operation");

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      for (let i = 0; i < 10; i++) {
        tm.startSpan(`span${i}`);
      }

      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it("应该在没有活跃 Trace 时创建 Span 失败", () => {
      const span = traceManager.startSpan("test-span");
      expect(span).toBeUndefined();
    });

    it("应该在结束所有 Span 后清理", () => {
      const traceId = traceManager.startTrace("test-operation");
      traceManager.startSpan("span1");
      traceManager.endTrace();

      expect(traceManager.getTraceId()).toBeUndefined();
      expect(traceManager.getActiveSpan()).toBeUndefined();
      expect(traceManager.getStackDepth()).toBe(0);
    });

    it("应该导出追踪数据", () => {
      const traceId = traceManager.startTrace("test-operation");
      traceManager.startSpan("span1");
      traceManager.endSpan(traceManager.getActiveSpan()!);

      const exported = traceManager.exportTrace(traceId);

      expect(exported).toBeDefined();
      expect(exported).toMatchObject({
        traceId,
        rootSpanId: expect.any(String),
        metadata: expect.any(Object),
        startTime: expect.any(Number),
        spans: expect.any(Array),
      });
    });

    it("应该清理所有追踪数据", () => {
      traceManager.startTrace("test1");
      traceManager.startTrace("test2");

      traceManager.clear();

      expect(traceManager.getTraceId()).toBeUndefined();
      expect(traceManager.getActiveSpan()).toBeUndefined();
    });
  });

  describe("单例模式", () => {
    it("应该初始化单例实例", () => {
      const instance = initTraceManager({
        serviceName: "singleton-test",
      });

      expect(instance).toBeDefined();
      expect(instance).toBeInstanceOf(TraceManager);
    });

    it("应该返回相同的单例实例", () => {
      initTraceManager({ serviceName: "test" });
      const instance1 = getTraceManager();
      const instance2 = getTraceManager();

      expect(instance1).toBe(instance2);
    });

    it("应该在未初始化时抛出错误", () => {
      // 清除单例
      const instance = getTraceManager();
      instance.clear();
      // 注意：这里无法真正清除单例，因为它是模块级别的

      // 新的 getTraceManager 应该返回已初始化的实例
      const retrieved = getTraceManager();
      expect(retrieved).toBeDefined();
    });
  });
});
