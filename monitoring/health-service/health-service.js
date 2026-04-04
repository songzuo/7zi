const express = require('express');
const client = require('prom-client');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 8085;

// 创建 Registry
const register = new client.Registry();

// 健康检查指标
const healthCheckStatus = new client.Gauge({
  name: 'health_check_status',
  help: 'Health check status (0=unhealthy, 1=healthy)',
  labelNames: ['service', 'check_type'],
  registers: [register],
});

const healthCheckDuration = new client.Histogram({
  name: 'health_check_duration_seconds',
  help: 'Health check duration in seconds',
  labelNames: ['service', 'check_type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

// 健康检查函数
async function checkService(url, serviceName, checkType, timeout = 5000) {
  const start = Date.now();
  try {
    await axios.get(url, { timeout });
    healthCheckStatus.set({ service: serviceName, check_type: checkType }, 1);
    healthCheckDuration.observe({ service: serviceName, check_type: checkType }, (Date.now() - start) / 1000);
    return { status: 'healthy', duration: Date.now() - start };
  } catch (error) {
    healthCheckStatus.set({ service: serviceName, check_type: checkType }, 0);
    healthCheckDuration.observe({ service: serviceName, check_type: checkType }, (Date.now() - start) / 1000);
    return { status: 'unhealthy', error: error.message, duration: Date.now() - start };
  }
}

// /health 端点 - 存活检查
app.get('/health', async (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// /ready 端点 - 就绪检查
app.get('/ready', async (req, res) => {
  const checks = {
    prometheus: await checkService('http://prometheus:9090/-/healthy', 'prometheus', 'ready'),
    alertmanager: await checkService('http://alertmanager:9093/-/healthy', 'alertmanager', 'ready'),
    loki: await checkService('http://loki:3100/ready', 'loki', 'ready'),
    grafana: await checkService('http://grafana:3000/api/health', 'grafana', 'ready'),
  };

  const allHealthy = Object.values(checks).every(c => c.status === 'healthy');

  if (allHealthy) {
    res.json({
      status: 'ready',
      checks,
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    });
  }
});

// /health/detailed 端点 - 详细检查
app.get('/health/detailed', async (req, res) => {
  const checks = {
    // 服务健康
    prometheus: await checkService('http://prometheus:9090/-/healthy', 'prometheus', 'health'),
    alertmanager: await checkService('http://alertmanager:9093/-/healthy', 'alertmanager', 'health'),
    loki: await checkService('http://loki:3100/ready', 'loki', 'health'),
    grafana: await checkService('http://grafana:3000/api/health', 'grafana', 'health'),

    // 指标采集
    node_exporter: await checkService('http://node-exporter:9100/metrics', 'node_exporter', 'metrics'),
    cadvisor: await checkService('http://cadvisor:8080/metrics', 'cadvisor', 'metrics'),
    pushgateway: await checkService('http://pushgateway:9091/metrics', 'pushgateway', 'metrics'),

    // 数据源连接
    prometheus_targets: await checkService('http://prometheus:9090/api/v1/targets', 'prometheus', 'targets'),
    alertmanager_alerts: await checkService('http://alertmanager:9093/api/v2/alerts', 'alertmanager', 'alerts'),
  };

  const overallStatus = Object.values(checks).every(c => c.status === 'healthy') ? 'healthy' : 'degraded';

  res.json({
    status: overallStatus,
    checks,
    summary: {
      total: Object.keys(checks).length,
      healthy: Object.values(checks).filter(c => c.status === 'healthy').length,
      unhealthy: Object.values(checks).filter(c => c.status !== 'healthy').length,
    },
    timestamp: new Date().toISOString(),
  });
});

// /health/live 端点 - Kubernetes liveness probe
app.get('/health/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

// 指标端点
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// 启动服务
app.listen(port, () => {
  console.log(`Health service listening at http://localhost:${port}`);
  console.log(`Endpoints:`);
  console.log(`  - GET /health          - Liveness check`);
  console.log(`  - GET /ready           - Readiness check`);
  console.log(`  - GET /health/detailed - Detailed health check`);
  console.log(`  - GET /health/live     - Kubernetes liveness probe`);
  console.log(`  - GET /metrics         - Prometheus metrics`);
});