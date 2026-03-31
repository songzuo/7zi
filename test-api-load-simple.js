/**
 * 7zi v1.5.0 - API 性能压测脚本 (简化版)
 * 
 * 测试目标：
 * 1. Agent 协作接口 (/api/a2a/jsonrpc)
 * 2. WebSocket/SSE 连接 (/api/stream/health)  
 * 3. 工作流触发 (/api/workflow/[id]/run)
 * 
 * @author ⚡ Executor
 * @date 2026-03-31
 */

const http = require('http');
const { performance } = require('perf_hooks');

// 配置
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 30000,
  scenarios: {
    normal: { concurrency: 100, duration: 30, requests: 1000 },
    peak: { concurrency: 500, duration: 60, requests: 5000 },
    extreme: { concurrency: 1000, duration: 90, requests: 10000 },
  },
};

// 统计收集器
class Stats {
  constructor() {
    this.latencies = [];
    this.successes = 0;
    this.failures = 0;
    this.errors = {};
    this.startTime = performance.now();
  }

  add(success, latency, error = null) {
    this.latencies.push(latency);
    if (success) {
      this.successes++;
    } else {
      this.failures++;
      if (error) {
        this.errors[error] = (this.errors[error] || 0) + 1;
      }
    }
  }

  getPercentile(p) {
    if (this.latencies.length === 0) return 0;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const index = Math.floor((sorted.length - 1) * (p / 100));
    return sorted[index];
  }

  getSummary() {
    const duration = (performance.now() - this.startTime) / 1000;
    const total = this.successes + this.failures;
    const sum = this.latencies.reduce((a, b) => a + b, 0);

    return {
      total,
      successes: this.successes,
      failures: this.failures,
      qps: total / duration,
      errorRate: total > 0 ? (this.failures / total) * 100 : 0,
      latency: {
        min: Math.min(...this.latencies),
        max: Math.max(...this.latencies),
        mean: this.latencies.length > 0 ? sum / this.latencies.length : 0,
        p50: this.getPercentile(50),
        p90: this.getPercentile(90),
        p95: this.getPercentile(95),
        p99: this.getPercentile(99),
      },
      errors: this.errors,
      duration,
    };
  }
}

// HTTP 请求函数
function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const url = new URL(path, CONFIG.baseUrl);

    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: CONFIG.timeout,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const latency = performance.now() - startTime;
        resolve({
          success: res.statusCode >= 200 && res.statusCode < 400,
          statusCode: res.statusCode,
          latency,
          data: data.substring(0, 200),
        });
      });
    });

    req.on('error', (error) => {
      const latency = performance.now() - startTime;
      resolve({
        success: false,
        latency,
        error: error.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const latency = performance.now() - startTime;
      resolve({
        success: false,
        latency,
        error: 'timeout',
      });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// 并发测试函数
async function runConcurrentTest(name, path, method, bodyFactory, concurrency, totalRequests) {
  console.log(`\n🔄 测试 ${name} (并发: ${concurrency}, 总请求: ${totalRequests})...`);

  const stats = new Stats();
  const batchSize = Math.min(concurrency, 50);
  const batches = Math.ceil(totalRequests / batchSize);

  for (let batch = 0; batch < batches; batch++) {
    const promises = [];
    const currentBatchSize = Math.min(batchSize, totalRequests - batch * batchSize);

    for (let i = 0; i < currentBatchSize; i++) {
      const body = bodyFactory ? bodyFactory() : null;
      promises.push(makeRequest(path, method, body));
    }

    const results = await Promise.all(promises);
    for (const result of results) {
      stats.add(result.success, result.latency, result.error || result.statusCode?.toString());
    }

    // 显示进度
    const progress = ((batch + 1) / batches * 100).toFixed(1);
    process.stdout.write(`\r   进度: ${progress}% (${stats.successes + stats.failures}/${totalRequests})`);
  }

  console.log('\n');
  return stats.getSummary();
}

// 主测试函数
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║         7zi v1.5.0 - API 性能压测                              ║');
  console.log('║         📅 ' + new Date().toISOString() + '                              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const results = [];
  const memoryBefore = process.memoryUsage();

  // 测试场景
  const scenarios = [
    { name: 'normal', ...CONFIG.scenarios.normal },
    { name: 'peak', ...CONFIG.scenarios.peak },
    { name: 'extreme', ...CONFIG.scenarios.extreme },
  ];

  // 测试端点
  const endpoints = [
    {
      name: 'A2A JSON-RPC',
      path: '/api/a2a/jsonrpc',
      method: 'POST',
      bodyFactory: () => ({
        jsonrpc: '2.0',
        id: Math.random().toString(36).substr(2, 9),
        method: 'task/create',
        params: { message: 'Load test task' },
      }),
    },
    {
      name: 'Workflow Run',
      path: '/api/workflow/test-workflow/run',
      method: 'POST',
      bodyFactory: () => ({
        inputs: { query: 'Test query' },
        userId: 'test-user',
        triggerType: 'api',
      }),
    },
    {
      name: 'SSE Health',
      path: '/api/stream/health',
      method: 'GET',
      bodyFactory: null,
    },
    {
      name: 'Health Check',
      path: '/api/health',
      method: 'GET',
      bodyFactory: null,
    },
    {
      name: 'Status API',
      path: '/api/status',
      method: 'GET',
      bodyFactory: null,
    },
  ];

  // 先测试基础连接
  console.log('🔍 测试基础连接...\n');
  const healthCheck = await makeRequest('/api/health');
  if (!healthCheck.success) {
    console.log('❌ 无法连接到服务器，请确保 Next.js 服务器正在运行');
    console.log(`   错误: ${healthCheck.error}`);
    return;
  }
  console.log('✅ 服务器连接正常\n');

  // 按场景测试
  for (const scenario of scenarios) {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 场景: ${scenario.name.toUpperCase()} (并发: ${scenario.concurrency})`);
    console.log(`${'═'.repeat(70)}`);

    for (const endpoint of endpoints) {
      const result = await runConcurrentTest(
        endpoint.name,
        endpoint.path,
        endpoint.method,
        endpoint.bodyFactory,
        scenario.concurrency,
        scenario.requests
      );

      results.push({
        scenario: scenario.name,
        endpoint: endpoint.name,
        path: endpoint.path,
        ...result,
      });

      // 短暂休息
      await new Promise((r) => setTimeout(r, 1000));
    }

    // 场景间休息
    console.log('\n⏳ 等待 5 秒后继续下一个场景...\n');
    await new Promise((r) => setTimeout(r, 5000));
  }

  // 生成报告
  console.log('\n' + '═'.repeat(70));
  console.log('📋 压测报告');
  console.log('═'.repeat(70) + '\n');

  const memoryAfter = process.memoryUsage();

  // 按场景分组输出
  for (const scenario of scenarios) {
    const scenarioResults = results.filter((r) => r.scenario === scenario.name);

    console.log(`\n┌${'─'.repeat(68)}┐`);
    console.log(`│  场景: ${scenario.name.toUpperCase().padEnd(20)} 并发: ${scenario.concurrency.toString().padEnd(10)} 请求: ${scenario.requests}  │`);
    console.log(`└${'─'.repeat(68)}┘`);

    for (const r of scenarioResults) {
      const status = r.errorRate < 5 ? '✅' : r.errorRate < 20 ? '⚠️' : '❌';
      console.log(`\n  ${status} ${r.endpoint}`);
      console.log(`     路径: ${r.path}`);
      console.log(`     总请求: ${r.total} | 成功: ${r.successes} | 失败: ${r.failures}`);
      console.log(`     QPS: ${r.qps.toFixed(2)} | 错误率: ${r.errorRate.toFixed(2)}%`);
      console.log(`     延迟: P50=${r.latency.p50.toFixed(0)}ms P90=${r.latency.p90.toFixed(0)}ms P99=${r.latency.p99.toFixed(0)}ms`);
      console.log(`           Min=${r.latency.min.toFixed(0)}ms Max=${r.latency.max.toFixed(0)}ms Mean=${r.latency.mean.toFixed(0)}ms`);

      if (Object.keys(r.errors).length > 0 && r.errorRate > 0) {
        console.log(`     错误: ${Object.entries(r.errors).map(([k, v]) => `${k}(${v})`).join(', ')}`);
      }
    }
  }

  // 系统资源
  console.log(`\n\n┌${'─'.repeat(68)}┐`);
  console.log('│  💻 系统资源消耗                                                │');
  console.log(`└${'─'.repeat(68)}┘`);
  console.log(`\n  内存使用:`);
  console.log(`    测试前: ${(memoryBefore.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`    测试后: ${(memoryAfter.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`    增长: ${((memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024).toFixed(2)} MB`);

  // 性能分析
  console.log(`\n\n┌${'─'.repeat(68)}┐`);
  console.log('│  🔍 性能分析                                                    │');
  console.log(`└${'─'.repeat(68)}┘`);

  const highLatency = results.filter((r) => r.latency.p95 > 1000);
  const highError = results.filter((r) => r.errorRate > 5);

  if (highLatency.length > 0) {
    console.log('\n  ⚠️  高延迟端点 (P95 > 1s):');
    for (const r of highLatency) {
      console.log(`    - ${r.endpoint}: P95=${r.latency.p95.toFixed(0)}ms, P99=${r.latency.p99.toFixed(0)}ms`);
    }
  }

  if (highError.length > 0) {
    console.log('\n  ❌ 高错误率端点 (>5%):');
    for (const r of highError) {
      console.log(`    - ${r.endpoint}: ${r.errorRate.toFixed(2)}%`);
    }
  }

  if (highLatency.length === 0 && highError.length === 0) {
    console.log('\n  ✅ 所有端点性能良好，无明显瓶颈');
  }

  // 优化建议
  console.log(`\n\n┌${'─'.repeat(68)}┐`);
  console.log('│  💡 优化建议                                                    │');
  console.log(`└${'─'.repeat(68)}┘`);

  const avgQps = results.reduce((a, b) => a + b.qps, 0) / results.length;
  const maxMemory = (memoryAfter.heapUsed / 1024 / 1024).toFixed(2);

  if (avgQps < 100) {
    console.log('\n  📊 QPS 较低 (<100)');
    console.log('     - 考虑启用响应缓存');
    console.log('     - 优化数据库查询');
    console.log('     - 增加服务器资源');
  }

  if (parseFloat(maxMemory) > 500) {
    console.log('\n  🚨 内存使用较高');
    console.log('     - 增加堆内存: --max-old-space-size=4096');
    console.log('     - 检查内存泄漏');
    console.log('     - 优化大对象处理');
  }

  if (highLatency.length > 0) {
    console.log('\n  ⏱️  响应延迟优化');
    console.log('     - 实现请求限流和队列');
    console.log('     - 优化慢查询');
    console.log('     - 添加响应缓存');
    console.log('     - 检查第三方 API 超时');
  }

  if (highError.length > 0) {
    console.log('\n  ❌ 错误率优化');
    console.log('     - 实现重试机制');
    console.log('     - 添加熔断器');
    console.log('     - 优化错误处理');
    console.log('     - 检查服务依赖');
  }

  // 保存 JSON 报告
  const reportPath = '/root/.openclaw/workspace/test-results/api-load-test-' + Date.now() + '.json';
  const fs = require('fs');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        config: CONFIG,
        results,
        memory: {
          before: memoryBefore,
          after: memoryAfter,
        },
      },
      null,
      2
    )
  );
  console.log(`\n\n📄 原始数据已保存到: ${reportPath}`);

  console.log('\n' + '═'.repeat(70));
  console.log('✅ 压测完成');
  console.log('═'.repeat(70) + '\n');
}

// 运行测试
runTests().catch(console.error);
