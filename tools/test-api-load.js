/**
 * 7zi v1.5.0 - API 性能压测脚本
 *
 * 测试目标：
 * 1. Agent 协作接口 (/api/a2a/jsonrpc)
 * 2. WebSocket/SSE 连接和消息吞吐 (/api/stream/health)
 * 3. 工作流触发和状态查询 (/api/workflow/[id]/run)
 *
 * @author ⚡ Executor
 * @date 2026-03-31
 */

import { performance } from 'perf_hooks';

// ==================== 配置 ====================

const CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  timeout: 30000,
  scenarios: {
    normal: {
      concurrency: 100,
      duration: 60, // seconds
      thinkTime: 100, // ms between requests
    },
    peak: {
      concurrency: 500,
      duration: 120, // seconds
      thinkTime: 50, // ms between requests
    },
    extreme: {
      concurrency: 1000,
      duration: 180, // seconds
      thinkTime: 10, // ms between requests
    },
  },
};

// ==================== 工具函数 ====================

interface RequestResult {
  success: boolean;
  statusCode?: number;
  latency: number;
  timestamp: number;
  error?: string;
}

interface TestScenario {
  name: string;
  concurrency: number;
  duration: number;
  thinkTime: number;
}

interface TestReport {
  scenario: string;
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  qps: number; // queries per second
  latency: {
    min: number;
    max: number;
    mean: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  errorRate: number;
  errors: Record<string, number>;
}

class TestStats {
  private latencies: number[] = [];
  private successes = 0;
  private failures = 0;
  private errors: Record<string, number> = {};
  private startTime: number;

  constructor() {
    this.startTime = performance.now();
  }

  add(result: RequestResult) {
    this.latencies.push(result.latency);
    if (result.success) {
      this.successes++;
    } else {
      this.failures++;
      const errorMsg = result.error || `HTTP ${result.statusCode}`;
      this.errors[errorMsg] = (this.errors[errorMsg] || 0) + 1;
    }
  }

  get duration() {
    return (performance.now() - this.startTime) / 1000;
  }

  get total() {
    return this.successes + this.failures;
  }

  get qps() {
    return this.total / this.duration;
  }

  get errorRate() {
    return this.total > 0 ? (this.failures / this.total) * 100 : 0;
  }

  get latency() {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    const percentile = (p: number) => {
      const index = Math.floor((sorted.length - 1) * (p / 100));
      return sorted[index];
    };

    return {
      min: sorted[0] || 0,
      max: sorted[sorted.length - 1] || 0,
      mean: sorted.length > 0 ? sum / sorted.length : 0,
      p50: percentile(50),
      p90: percentile(90),
      p95: percentile(95),
      p99: percentile(99),
    };
  }
}

// ==================== API 测试端点 ====================

async function testA2AJsonRPC(scenario: TestScenario): Promise<TestReport> {
  const stats = new TestStats();
  const url = `${CONFIG.baseUrl}/api/a2a/jsonrpc`;
  const startTime = Date.now();

  // 并发测试函数
  const runRequest = async () => {
    const start = performance.now();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Math.random().toString(36).substr(2, 9),
          method: 'task/create',
          params: {
            message: 'Test task for load testing',
          },
        }),
        signal: AbortSignal.timeout(CONFIG.timeout),
      });

      const latency = performance.now() - start;

      stats.add({
        success: response.ok,
        statusCode: response.status,
        latency,
        timestamp: Date.now(),
        error: response.ok ? undefined : `HTTP ${response.status}`,
      });
    } catch (error) {
      const latency = performance.now() - start;
      stats.add({
        success: false,
        latency,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // 并发执行
  const concurrentRequests = Math.ceil(scenario.concurrency);
  const intervalMs = scenario.thinkTime;

  // 启动初始批次
  const initialBatches = Math.min(concurrentRequests, 10);
  const activeRequests: Promise<void>[] = [];

  for (let i = 0; i < initialBatches; i++) {
    activeRequests.push(runRequest());
  }

  // 持续执行直到达到持续时间
  const intervalId = setInterval(() => {
    if (Date.now() - startTime >= scenario.duration * 1000) {
      clearInterval(intervalId);
      return;
    }

    // 补充请求
    const currentActive = activeRequests.filter(p => p !== null).length;
    const toAdd = Math.min(concurrentRequests - currentActive, 5);

    for (let i = 0; i < toAdd; i++) {
      activeRequests.push(runRequest());
    }

    // 清理已完成的请求
    activeRequests.splice(0, activeRequests.length - concurrentRequests);
  }, intervalMs);

  // 等待所有请求完成
  await Promise.all(activeRequests);

  return {
    scenario: scenario.name,
    endpoint: url,
    totalRequests: stats.total,
    successfulRequests: stats.successes,
    failedRequests: stats.failures,
    qps: stats.qps,
    latency: stats.latency,
    errorRate: stats.errorRate,
    errors: stats.errors,
  };
}

async function testWorkflowRun(scenario: TestScenario): Promise<TestReport> {
  const stats = new TestStats();
  const workflowId = 'test-workflow-1';
  const url = `${CONFIG.baseUrl}/api/workflow/${workflowId}/run`;
  const startTime = Date.now();

  const runRequest = async () => {
    const start = performance.now();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: { query: 'Test workflow execution' },
          userId: 'test-user',
          triggerType: 'api',
        }),
        signal: AbortSignal.timeout(CONFIG.timeout),
      });

      const latency = performance.now() - start;

      stats.add({
        success: response.ok,
        statusCode: response.status,
        latency,
        timestamp: Date.now(),
        error: response.ok ? undefined : `HTTP ${response.status}`,
      });
    } catch (error) {
      const latency = performance.now() - start;
      stats.add({
        success: false,
        latency,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // 并发执行
  const concurrentRequests = Math.ceil(scenario.concurrency);
  const intervalMs = scenario.thinkTime;

  const activeRequests: Promise<void>[] = [];
  const intervalId = setInterval(() => {
    if (Date.now() - startTime >= scenario.duration * 1000) {
      clearInterval(intervalId);
      return;
    }

    const currentActive = activeRequests.filter(p => p !== null).length;
    const toAdd = Math.min(concurrentRequests - currentActive, 5);

    for (let i = 0; i < toAdd; i++) {
      activeRequests.push(runRequest());
    }

    activeRequests.splice(0, activeRequests.length - concurrentRequests);
  }, intervalMs);

  await Promise.all(activeRequests);

  return {
    scenario: scenario.name,
    endpoint: url,
    totalRequests: stats.total,
    successfulRequests: stats.successes,
    failedRequests: stats.failures,
    qps: stats.qps,
    latency: stats.latency,
    errorRate: stats.errorRate,
    errors: stats.errors,
  };
}

async function testSSEHealth(scenario: TestScenario): Promise<TestReport> {
  const stats = new TestStats();
  const url = `${CONFIG.baseUrl}/api/stream/health`;
  const startTime = Date.now();

  const runRequest = async () => {
    const start = performance.now();

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
        },
        signal: AbortSignal.timeout(CONFIG.timeout),
      });

      const latency = performance.now() - start;

      stats.add({
        success: response.ok,
        statusCode: response.status,
        latency,
        timestamp: Date.now(),
        error: response.ok ? undefined : `HTTP ${response.status}`,
      });
    } catch (error) {
      const latency = performance.now() - start;
      stats.add({
        success: false,
        latency,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const concurrentRequests = Math.ceil(scenario.concurrency);
  const activeRequests: Promise<void>[] = [];
  const intervalId = setInterval(() => {
    if (Date.now() - startTime >= scenario.duration * 1000) {
      clearInterval(intervalId);
      return;
    }

    const currentActive = activeRequests.filter(p => p !== null).length;
    const toAdd = Math.min(concurrentRequests - currentActive, 5);

    for (let i = 0; i < toAdd; i++) {
      activeRequests.push(runRequest());
    }

    activeRequests.splice(0, activeRequests.length - concurrentRequests);
  }, scenario.thinkTime);

  await Promise.all(activeRequests);

  return {
    scenario: scenario.name,
    endpoint: url,
    totalRequests: stats.total,
    successfulRequests: stats.successes,
    failedRequests: stats.failures,
    qps: stats.qps,
    latency: stats.latency,
    errorRate: stats.errorRate,
    errors: stats.errors,
  };
}

// ==================== 系统资源监控 ====================

interface SystemResources {
  timestamp: number;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number; // MB
    total: number; // MB
    percent: number;
  };
  network: {
    requests: number;
    errors: number;
  };
}

class ResourceMonitor {
  private resources: SystemResources[] = [];
  private intervalId?: NodeJS.Timeout;
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  start(intervalMs: number = 5000) {
    this.intervalId = setInterval(() => {
      this.collect();
    }, intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private collect() {
    const resources: SystemResources = {
      timestamp: Date.now(),
      cpu: {
        usage: process.cpuUsage().user / 1000000, // Convert to seconds
        loadAverage: process.uptime() > 0 ? [process.uptime(), 0, 0] : [0, 0, 0],
      },
      memory: {
        used: process.memoryUsage().heapUsed / 1024 / 1024,
        total: process.memoryUsage().heapTotal / 1024 / 1024,
        percent: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
      },
      network: {
        requests: 0,
        errors: 0,
      },
    };

    this.resources.push(resources);
  }

  getSummary() {
    if (this.resources.length === 0) {
      return null;
    }

    const memoryUsage = this.resources.map(r => r.memory.used);
    const memoryPercent = this.resources.map(r => r.memory.percent);

    return {
      duration: (this.resources[this.resources.length - 1].timestamp - this.startTime) / 1000,
      memory: {
        avg: memoryUsage.reduce((a, b) => a + b, 0) / memoryUsage.length,
        max: Math.max(...memoryUsage),
        min: Math.min(...memoryUsage),
        avgPercent: memoryPercent.reduce((a, b) => a + b, 0) / memoryPercent.length,
        maxPercent: Math.max(...memoryPercent),
      },
      samples: this.resources.length,
    };
  }
}

// ==================== 报告生成 ====================

function generateReport(reports: TestReport[], resources: ResourceMonitor): string {
  const resourceSummary = resources.getSummary();

  let report = `
╔════════════════════════════════════════════════════════════════╗
║           7zi v1.5.0 - API 性能压测报告                         ║
║           📅 ${new Date().toISOString()}                              ║
╚════════════════════════════════════════════════════════════════╝

📋 测试概述
═══════════════════════════════════════════════════════════════
测试环境: ${CONFIG.baseUrl}
总测试场景: ${reports.length}
测试时长: ${resourceSummary?.duration.toFixed(2)}s
资源采样: ${resourceSummary?.samples} 个

`;

  // 按场景分组
  const scenarios = ['normal', 'peak', 'extreme'];
  for (const scenario of scenarios) {
    const scenarioReports = reports.filter(r => r.scenario === scenario);
    if (scenarioReports.length === 0) continue;

    const config = CONFIG.scenarios[scenario as keyof typeof CONFIG.scenarios];
    const scenarioName = {
      normal: '正常负载',
      peak: '峰值负载',
      extreme: '极端情况',
    }[scenario];

    report += `
┌────────────────────────────────────────────────────────────────┐
│  ${scenarioName} (并发: ${config.concurrency} | 时长: ${config.duration}s)  │
└────────────────────────────────────────────────────────────────┘
`;

    for (const r of scenarioReports) {
      const endpointName = r.endpoint.split('/').pop() || r.endpoint;

      report += `
🔹 ${endpointName}
──────────────────────────────────────────────────────────────────
  总请求数:     ${r.totalRequests.toLocaleString()}
  成功请求:     ${r.successfulRequests.toLocaleString()}
  失败请求:     ${r.failedRequests.toLocaleString()}
  QPS:          ${r.qps.toFixed(2)}
  错误率:       ${r.errorRate.toFixed(2)}%

  响应时间 (ms):
    Min:    ${r.latency.min.toFixed(2)}
    P50:    ${r.latency.p50.toFixed(2)}
    P90:    ${r.latency.p90.toFixed(2)}
    P95:    ${r.latency.p95.toFixed(2)}
    P99:    ${r.latency.p99.toFixed(2)}
    Max:    ${r.latency.max.toFixed(2)}
    Mean:   ${r.latency.mean.toFixed(2)}
`;

      if (Object.keys(r.errors).length > 0) {
        report += `
  错误详情:
`;
        for (const [error, count] of Object.entries(r.errors)) {
          report += `    - ${error}: ${count}\n`;
        }
      }
    }
  }

  // 系统资源摘要
  if (resourceSummary) {
    report += `
┌────────────────────────────────────────────────────────────────┐
│  💻 系统资源监控                                                │
└────────────────────────────────────────────────────────────────┘

  内存使用:
    平均:     ${resourceSummary.memory.avg.toFixed(2)} MB
    最大:     ${resourceSummary.memory.max.toFixed(2)} MB
    最小:     ${resourceSummary.memory.min.toFixed(2)} MB
    平均占比: ${resourceSummary.memory.avgPercent.toFixed(2)}%
    最大占比: ${resourceSummary.memory.maxPercent.toFixed(2)}%
`;
  }

  // 性能瓶颈分析
  report += `
┌────────────────────────────────────────────────────────────────┐
│  🔍 性能瓶颈分析                                                │
└────────────────────────────────────────────────────────────────┘
`;

  const highLatencyEndpoints = reports.filter(r => r.latency.p95 > 1000);
  if (highLatencyEndpoints.length > 0) {
    report += `
  ⚠️  高延迟端点 (P95 > 1s):
`;
    for (const r of highLatencyEndpoints) {
      report += `    - ${r.endpoint.split('/').pop()}: P95=${r.latency.p95.toFixed(2)}ms, P99=${r.latency.p99.toFixed(2)}ms\n`;
    }
  }

  const highErrorRateEndpoints = reports.filter(r => r.errorRate > 5);
  if (highErrorRateEndpoints.length > 0) {
    report += `
  ❌ 高错误率端点 (>5%):
`;
    for (const r of highErrorRateEndpoints) {
      report += `    - ${r.endpoint.split('/').pop()}: ${r.errorRate.toFixed(2)}%\n`;
    }
  }

  if (highLatencyEndpoints.length === 0 && highErrorRateEndpoints.length === 0) {
    report += `
  ✅ 所有端点性能良好，无明显瓶颈
`;
  }

  // 优化建议
  report += `
┌────────────────────────────────────────────────────────────────┐
│  💡 优化建议                                                    │
└────────────────────────────────────────────────────────────────┘
`;

  if (resourceSummary?.memory.maxPercent && resourceSummary.memory.maxPercent > 80) {
    report += `
  🚨 内存使用过高 (${resourceSummary.memory.maxPercent.toFixed(2)}%)
     - 建议增加 Node.js 堆内存限制: --max-old-space-size=4096
     - 检查内存泄漏，使用 heapdump 分析
     - 考虑实现缓存清理策略
`;
  }

  if (reports.some(r => r.latency.p99 > 5000)) {
    report += `
  ⚠️  部分端点 P99 响应时间 > 5s
     - 考虑实现请求队列和限流
     - 优化数据库查询，添加索引
     - 实现响应缓存 (Redis/内存缓存)
     - 检查第三方 API 调用超时配置
`;
  }

  if (reports.some(r => r.errorRate > 10)) {
    report += `
  ❌ 错误率过高
     - 检查日志定位失败原因
     - 实现重试机制（带退避）
     - 添加熔断器 (Circuit Breaker)
     - 优化错误处理和监控
`;
  }

  if (highLatencyEndpoints.length === 0 && highErrorRateEndpoints.length === 0) {
    report += `
  ✅ 当前性能表现良好
     - 可以逐步增加并发测试更高负载
     - 考虑实现更细粒度的监控和告警
     - 持续监控生产环境性能指标
`;
  }

  report += `
═══════════════════════════════════════════════════════════════
`;

  return report;
}

// ==================== 主程序 ====================

async function main() {
  console.log('🚀 开始 API 性能压测...\n');

  const reports: TestReport[] = [];
  const resources = new ResourceMonitor();
  resources.start(2000); // 每 2 秒采集一次资源

  // 测试场景配置
  const scenarios: TestScenario[] = [
    { name: 'normal', ...CONFIG.scenarios.normal },
    { name: 'peak', ...CONFIG.scenarios.peak },
    { name: 'extreme', ...CONFIG.scenarios.extreme },
  ];

  // 按场景顺序测试
  for (const scenario of scenarios) {
    console.log(`\n📊 开始测试场景: ${scenario.name} (并发: ${scenario.concurrency})\n`);

    // 测试各个端点
    console.log('  🔄 测试 A2A JSON-RPC 端点...');
    const a2aReport = await testA2AJsonRPC(scenario);
    reports.push(a2aReport);
    console.log(`  ✅ A2A: QPS=${a2aReport.qps.toFixed(2)}, 错误率=${a2aReport.errorRate.toFixed(2)}%`);

    console.log('  🔄 测试 Workflow Run 端点...');
    const workflowReport = await testWorkflowRun(scenario);
    reports.push(workflowReport);
    console.log(`  ✅ Workflow: QPS=${workflowReport.qps.toFixed(2)}, 错误率=${workflowReport.errorRate.toFixed(2)}%`);

    console.log('  🔄 测试 SSE Health 端点...');
    const sseReport = await testSSEHealth(scenario);
    reports.push(sseReport);
    console.log(`  ✅ SSE: QPS=${sseReport.qps.toFixed(2)}, 错误率=${sseReport.errorRate.toFixed(2)}%`);

    console.log(`\n✅ 场景 ${scenario.name} 完成，等待 5 秒后继续...\n`);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  resources.stop();

  // 生成报告
  console.log('\n📝 生成压测报告...\n');
  const report = generateReport(reports, resources);

  console.log(report);

  // 保存报告
  const reportPath = '/root/.openclaw/workspace/test-results/api-load-test-report.md';
  await Bun.write(reportPath, report);
  console.log(`\n📄 报告已保存到: ${reportPath}`);

  // 保存原始数据（JSON）
  const jsonReportPath = '/root/.openclaw/workspace/test-results/api-load-test-raw.json';
  await Bun.write(jsonReportPath, JSON.stringify({ reports, resources: resources.getSummary() }, null, 2));
  console.log(`📄 原始数据已保存到: ${jsonReportPath}`);
}

// 执行主程序
main().catch(console.error);
