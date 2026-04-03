/**
 * Basic Usage Example - Log Aggregator v1.10.0
 * 基础使用示例
 */

import { createLogAggregator, getDefaultConfig } from '../index.js';

async function main() {
  console.log('=== Log Aggregator Basic Usage Example ===\n');

  // 1. 创建日志聚合器
  console.log('1. Creating log aggregator...');
  const config = getDefaultConfig() as import('../types.js').LogAggregatorConfig;
  const aggregator = createLogAggregator(config);
  console.log('✓ Log aggregator created\n');

  // 2. 启动聚合器
  console.log('2. Starting aggregator...');
  await aggregator.start();
  console.log('✓ Aggregator started\n');

  // 3. 检查健康状态
  console.log('3. Checking health status...');
  const health = await aggregator.getHealth();
  console.log(`   Status: ${health.status}`);
  console.log(`   Checks: ${JSON.stringify(health.checks, null, 2)}\n`);

  // 4. 获取状态
  console.log('4. Getting status...');
  const status = aggregator.getStatus();
  console.log(`   Running: ${status.isRunning}`);
  console.log(`   Collectors: ${status.collectors.length}`);
  console.log(`   Queue size: ${status.queueSize}\n`);

  // 5. 添加一些测试日志
  console.log('5. Adding test logs...');
  const testLogs = [
    {
      id: 'log-1',
      timestamp: new Date(),
      level: 'info' as const,
      message: 'Application started successfully',
      source: { type: 'file' as const, name: 'app.log' },
      metadata: { service: 'api', version: '1.0.0' },
      tags: ['startup'],
    },
    {
      id: 'log-2',
      timestamp: new Date(),
      level: 'error' as const,
      message: 'Database connection failed',
      source: { type: 'file' as const, name: 'app.log' },
      metadata: { service: 'api', error: 'ECONNREFUSED' },
      tags: ['database', 'error'],
    },
    {
      id: 'log-3',
      timestamp: new Date(),
      level: 'warn' as const,
      message: 'High memory usage detected',
      source: { type: 'file' as const, name: 'app.log' },
      metadata: { service: 'api', memoryUsage: 0.85 },
      tags: ['performance'],
    },
  ];

  await aggregator.storage.store(testLogs);
  console.log(`✓ Added ${testLogs.length} test logs\n`);

  // 6. 查询日志
  console.log('6. Querying logs...');
  const queryResult = await aggregator.storage.query({
    timeRange: {
      start: new Date(Date.now() - 60000),
      end: new Date(),
    },
    sort: [{ field: 'timestamp', order: 'desc' }],
  });
  console.log(`   Found ${queryResult.total} logs`);
  console.log(`   Query took ${queryResult.took}ms\n`);

  // 7. 过滤查询
  console.log('7. Filtering by level...');
  const errorResult = await aggregator.storage.query({
    timeRange: {
      start: new Date(Date.now() - 60000),
      end: new Date(),
    },
    filters: [
      { field: 'level', operator: 'eq', value: 'error' },
    ],
  });
  console.log(`   Found ${errorResult.total} error logs\n`);

  // 8. 聚合查询
  console.log('8. Aggregating by level...');
  const aggResult = await aggregator.storage.aggregate({
    timeRange: {
      start: new Date(Date.now() - 60000),
      end: new Date(),
    },
    groupBy: ['level'],
    aggregations: [
      { type: 'count', field: 'id', name: 'count' },
    ],
    granularity: 'hour',
  });
  console.log('   Aggregation results:');
  for (const bucket of aggResult.buckets) {
    console.log(`   - ${bucket.key.level}: ${bucket.values.count}`);
  }
  console.log();

  // 9. 搜索日志
  console.log('9. Searching logs...');
  const searchResult = await aggregator.searchApi.search({
    query: 'database OR memory',
    timeRange: {
      start: new Date(Date.now() - 60000),
      end: new Date(),
    },
  });
  console.log(`   Found ${searchResult.total} matching logs\n`);

  // 10. 添加告警规则
  console.log('10. Adding alert rule...');
  await aggregator.alertManager.addRule({
    id: 'error-alert',
    name: 'Error Alert',
    enabled: true,
    severity: 'high',
    condition: {
      type: 'threshold',
      field: 'level',
      operator: 'eq',
      value: 'error',
      timeWindow: 60,
      minOccurrences: 1,
    },
    actions: [
      { type: 'log', config: {} },
    ],
    throttle: {
      enabled: true,
      period: 300,
      maxAlerts: 3,
    },
    notification: {
      channels: [],
    },
    tags: ['error'],
  });
  console.log('✓ Alert rule added\n');

  // 11. 评估告警
  console.log('11. Evaluating alerts...');
  const alerts = await aggregator.alertManager.evaluate(testLogs);
  console.log(`   Triggered ${alerts.length} alerts\n`);

  // 12. 获取存储统计
  console.log('12. Getting storage stats...');
  const stats = aggregator.storage.getStats();
  console.log(`   Total entries: ${stats.totalEntries}`);
  console.log(`   Total size: ${stats.totalSize} bytes`);
  console.log(`   Avg entry size: ${stats.avgEntrySize.toFixed(2)} bytes\n`);

  // 13. 停止聚合器
  console.log('13. Stopping aggregator...');
  await aggregator.stop();
  console.log('✓ Aggregator stopped\n');

  console.log('=== Example completed successfully ===');
}

// Run the example
main().catch(console.error);