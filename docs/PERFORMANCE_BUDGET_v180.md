# 7zi 项目性能预算与告警系统方案

**版本**: v1.8.0  
**日期**: 2026-04-02  
**状态**: 正式发布  

---

## 1. 概述

本文档定义了 7zi 项目的性能预算体系和告警规则，旨在确保系统在高性能水平上稳定运行。性能预算作为开发流程中的"门禁"，帮助团队在问题影响用户之前发现并修复性能退化。

### 1.1 文档目标

- 定义前端性能预算（Bundle Size、Web Vitals）
- 定义 API 响应时间预算
- 定义构建性能预算
- 设计基于 Sentry 的告警规则
- 与现有 `docs/ALERT_RULES.yaml` 保持一致

### 1.2 参考文档

- `docs/APM_INTEGRATION.md` - Sentry APM 集成
- `docs/BUILD_PERFORMANCE_ANALYSIS.md` - 构建性能分析
- `docs/ALERT_RULES.yaml` - 现有告警规则

---

## 2. 前端性能预算

### 2.1 JavaScript Bundle 预算

基于项目规模（1,217 个 TS 文件，227 个客户端组件）和行业最佳实践：

| 指标 | 预算阈值 | 严重级别 | 说明 |
|------|----------|----------|------|
| **主 Bundle (JS)** | ≤ 300 KB | P1 | 首屏必需 |
| **总计 JS** | ≤ 500 KB | P2 | 所有 JS 文件 |
| **第三方库** | ≤ 200 KB | P2 | vendor  chunk |
| **动态导入** | ≤ 100 KB | P3 | 按需加载 |

**配置方式** - `lighthouserc.json`:

```json
{
  "ci": {
    "collect": {
      "settings": {
        "staticDistDir": "./.next"
      }
    },
    "assert": {
      "assertions": {
        "js-bundle-size": ["error", { "maxNumericValue": 300000 }],
        "total-byte-weight": ["warn", { "maxNumericValue": 500000 }]
      }
    }
  }
}
```

### 2.2 Web Vitals 预算

基于 Google Core Web Vitals 标准，结合 7zi 业务需求：

| 指标 | 预算阈值 | 百分位 | 目标 | 严重级别 |
|------|----------|--------|------|----------|
| **LCP** (Largest Contentful Paint) | ≤ 2.5s | P75 | 优秀 | P1 |
| **LCP** | ≤ 4.0s | P75 | 需要改进 | P2 |
| **FID** (First Input Delay) | ≤ 100ms | P75 | 优秀 | P1 |
| **FID** | ≤ 300ms | P75 | 需要改进 | P2 |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | P75 | 优秀 | P1 |
| **CLS** | ≤ 0.25 | P75 | 需要改进 | P2 |
| **INP** (Interaction to Next Paint) | ≤ 200ms | P75 | 优秀 | P1 |
| **INP** | ≤ 500ms | P75 | 需要改进 | P2 |
| **FCP** (First Contentful Paint) | ≤ 1.8s | P75 | 良好 | P2 |
| **TTFB** (Time to First Byte) | ≤ 600ms | P75 | 良好 | P2 |

**Sentry 性能监控配置**:

```typescript
// sentry.client.config.ts
{
  integrations: [
    new Sentry.BrowserTracing({
      tracingOrigins: ['7zi.com', 'localhost'],
      // Web Vitals 自动采集
      instrumentPageLoad: true,
      instrumentNavigation: true,
    }),
  ],
  // Web Vitals 阈值配置
  beforeSend(event) {
    const measurement = event.measurements;
    if (measurement) {
      // 添加性能预算标记
      event.tags = event.tags || {};
      
      if (measurement.lcp > 4000) {
        event.tags.perf_budget_exceeded = 'lcp';
      }
      if (measurement.cls > 0.25) {
        event.tags.perf_budget_exceeded = 'cls';
      }
    }
    return event;
  }
}
```

### 2.3 Lighthouse CI 配置

创建 `lighthouserc.json` 文件：

```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "settings": {
        "staticDistDir": "./.next",
        "url": [
          "http://localhost:3000/",
          "http://localhost:3000/dashboard",
          "http://localhost:3000/agents"
        ],
        "onlyCategories": ["performance"]
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["warn", { "maxNumericValue": 1800 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "first-input-delay": ["error", { "maxNumericValue": 100 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "interaction-to-next-paint": ["error", { "maxNumericValue": 200 }],
        "total-byte-weight": ["warn", { "maxNumericValue": 500000 }],
        "js-bundle-size": ["error", { "maxNumericValue": 300000 }],
        "offscreen-images": ["warn"],
        "render-blocking-resources": ["warn"]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

**package.json 脚本**:

```json
{
  "scripts": {
    "lh": "lighthouseci autorun",
    "lh:ci": "lighthouseci run --config ./lighthouserc.json",
    "lh:upload": "lighthouseci upload --target temporary-public-storage"
  }
}
```

---

## 3. API 响应时间预算

### 3.1 API 端点预算

基于业务场景和用户体验研究：

| 端点类型 | P50 | P95 | P99 | 严重级别 |
|----------|-----|-----|-----|----------|
| **简单查询** | 50ms | 150ms | 300ms | P2 |
| **列表查询** | 100ms | 300ms | 500ms | P1 |
| **复杂查询** | 200ms | 500ms | 1000ms | P1 |
| **写操作** | 100ms | 300ms | 800ms | P1 |
| **认证** | 50ms | 150ms | 300ms | P1 |
| **WebSocket** | 20ms | 50ms | 100ms | P2 |

### 3.2 全局 API 预算

| 指标 | 阈值 | 百分位 | 严重级别 |
|------|------|--------|----------|
| **平均响应时间** | 200ms | P50 | P2 |
| **P95 响应时间** | 500ms | P95 | P1 |
| **P99 响应时间** | 1000ms | P99 | P2 |
| **错误率** | 0.5% | - | P1 |
| **超时率** | 0.1% | - | P0 |

### 3.3 Sentry 告警配置

```yaml
# API 性能告警规则
api_performance_alerts:
  # P0: API 完全不可用
  - name: "API Complete Failure"
    condition:
      type: "transaction"
      op: "http.server"
      failure_rate: 100
      time_window: "5m"
    severity: "critical"
    notification:
      channels: ["slack", "email", "sms"]

  # P1: P95 响应时间超限
  - name: "API P95 Latency"
    condition:
      type: "performance"
      metric: "p95"
      threshold: 500
      time_window: "15m"
    severity: "high"
    notification:
      channels: ["slack", "email"]

  # P1: 错误率过高
  - name: "API Error Rate"
    condition:
      type: "error_rate"
      threshold: 0.5
      time_window: "15m"
    severity: "high"
    notification:
      channels: ["slack", "email"]

  # P2: P99 响应时间告警
  - name: "API P99 Latency"
    condition:
      type: "performance"
      metric: "p99"
      threshold: 1000
      time_window: "15m"
    severity: "warning"
    notification:
      channels: ["slack"]

  # P2: 慢请求增加
  - name: "Slow Requests Spike"
    condition:
      type: "slow_requests"
      threshold: 10
      time_window: "15m"
      baseline: "1d"
    severity: "warning"
    notification:
      channels: ["slack"]
```

---

## 4. 构建性能预算

### 4.1 当前状态

基于 `docs/BUILD_PERFORMANCE_ANALYSIS.md`:

| 阶段 | 当前 | 目标 | 差距 |
|------|------|------|------|
| **Turbopack 编译** | 3.5 分钟 | 60 秒 | 150 秒 |
| **TypeScript 检查** | 6.5 分钟 | 30 秒 | 360 秒 |
| **总构建时间** | 10 分钟 | 60 秒 | 540 秒 |

### 4.2 构建时间预算

| 阶段 | 警告阈值 | 错误阈值 | 严重级别 |
|------|----------|----------|----------|
| **开发构建** | 30 秒 | 60 秒 | P2 |
| **生产构建** | 5 分钟 | 10 分钟 | P1 |
| **类型检查** | 2 分钟 | 5 分钟 | P1 |
| **增量构建** | 10 秒 | 30 秒 | P2 |

### 4.3 构建预算配置

**package.json**:

```json
{
  "scripts": {
    "build": "next build",
    "build:budget": "NODE_ENV=production next build && node scripts/check-build-budget.js"
  },
  "config": {
    "build_budget": {
      "maxBuildTime": 600000,
      "maxTypeCheckTime": 300000,
      "maxBundleSize": 500000,
      "maxMainBundleSize": 300000,
      "warnOnExceeded": true
    }
  }
}
```

**构建预算检查脚本** `scripts/check-build-budget.js`:

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 读取构建输出
const buildJsonPath = path.join(__dirname, '../.next/build-manifest.json');
const outputPath = path.join(process.cwd(), 'build-budget-report.json');

const BUDGETS = {
  maxBuildTime: 600000,     // 10 分钟
  maxTypeCheckTime: 300000, // 5 分钟
  maxBundleSize: 500000,    // 500KB
  maxMainBundleSize: 300000 // 300KB
};

function checkBudgets() {
  const warnings = [];
  const errors = [];
  
  // 检查 bundle 大小
  if (fs.existsSync(buildJsonPath)) {
    const manifest = JSON.parse(fs.readFileSync(buildJsonPath));
    const totalSize = Object.values(manifest.pages)
      .flat()
      .reduce((sum, f) => sum + (f.size || 0), 0);
    
    if (totalSize > BUDGETS.maxBundleSize) {
      errors.push(`Bundle size ${totalSize} exceeds budget ${BUDGETS.maxBundleSize}`);
    }
  }
  
  // 输出报告
  const report = {
    timestamp: new Date().toISOString(),
    budgets: BUDGETS,
    warnings,
    errors,
    status: errors.length > 0 ? 'FAILED' : warnings.length > 0 ? 'WARNING' : 'PASSED'
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`Build budget report: ${outputPath}`);
  
  if (errors.length > 0) {
    console.error('Build budget FAILED:');
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }
  
  if (warnings.length > 0) {
    console.warn('Build budget warnings:');
    warnings.forEach(w => console.warn(`  - ${w}`));
  }
}

checkBudgets();
```

---

## 5. 告警规则设计

### 5.1 告警严重级别定义

| 级别 | 响应时间 | 通知渠道 | 示例 |
|------|----------|----------|------|
| **P0 Critical** | 立即 | Slack + Email + SMS | 服务宕机、100% 错误率 |
| **P1 High** | 15 分钟 | Slack + Email | 错误率 > 5%、P95 > 500ms |
| **P2 Warning** | 1 小时 | Slack | LCP > 4s、CLS > 0.25 |
| **P3 Info** | 24 小时 | Email | 性能退化趋势 |

### 5.2 性能告警规则（YAML）

```yaml
# ============================================
# 7zi Performance Budget & Alert Rules
# Version: 1.8.0
# ============================================

# ============================================
# 前端性能告警 (Web Vitals)
# ============================================

frontend_performance:
  # LCP - Largest Contentful Paint
  - name: "LCP Budget Exceeded (Critical)"
    type: "web_vital"
    metric: "lcp"
    threshold: 4000
    percentile: 75
    time_window: "1h"
    severity: "warning"
    channels: ["slack"]
    description: "Largest Contentful Paint 超过 4 秒"
    
  - name: "LCP Budget Exceeded (Needs Improvement)"
    type: "web_vital"
    metric: "lcp"
    threshold: 2500
    percentile: 75
    time_window: "1h"
    severity: "high"
    channels: ["slack", "email"]
    description: "Largest Contentful Paint 超过 2.5 秒（预算超标）"

  # CLS - Cumulative Layout Shift
  - name: "CLS Budget Exceeded (Critical)"
    type: "web_vital"
    metric: "cls"
    threshold: 0.25
    percentile: 75
    time_window: "1h"
    severity: "warning"
    channels: ["slack"]
    description: "Cumulative Layout Shift 超过 0.25"
    
  - name: "CLS Budget Exceeded (Needs Improvement)"
    type: "web_vital"
    metric: "cls"
    threshold: 0.1
    percentile: 75
    time_window: "1h"
    severity: "high"
    channels: ["slack", "email"]
    description: "Cumulative Layout Shift 超过 0.1（预算超标）"

  # FID - First Input Delay
  - name: "FID Budget Exceeded"
    type: "web_vital"
    metric: "fid"
    threshold: 300
    percentile: 75
    time_window: "1h"
    severity: "warning"
    channels: ["slack"]
    description: "First Input Delay 超过 300ms"

  # INP - Interaction to Next Paint
  - name: "INP Budget Exceeded"
    type: "web_vital"
    metric: "inp"
    threshold: 500
    percentile: 75
    time_window: "1h"
    severity: "warning"
    channels: ["slack"]
    description: "Interaction to Next Paint 超过 500ms"

# ============================================
# Bundle Size 告警
# ============================================

bundle_size:
  - name: "Main Bundle Size Exceeded"
    type: "bundle_size"
    metric: "main_js"
    threshold: 300000
    change_percent: 20
    severity: "high"
    channels: ["slack", "email"]
    description: "主 JavaScript Bundle 超过 300KB 或增长超过 20%"
    
  - name: "Total Bundle Size Exceeded"
    type: "bundle_size"
    metric: "total_js"
    threshold: 500000
    change_percent: 20
    severity: "warning"
    channels: ["slack"]
    description: "总 JavaScript Bundle 超过 500KB"

# ============================================
# API 性能告警
# ============================================

api_performance:
  - name: "API P95 Latency Exceeded"
    type: "api_latency"
    percentile: 95
    threshold: 500
    time_window: "15m"
    severity: "high"
    channels: ["slack", "email"]
    description: "API P95 响应时间超过 500ms"
    
  - name: "API P99 Latency Exceeded"
    type: "api_latency"
    percentile: 99
    threshold: 1000
    time_window: "15m"
    severity: "warning"
    channels: ["slack"]
    description: "API P99 响应时间超过 1000ms"
    
  - name: "API Error Rate High"
    type: "error_rate"
    threshold: 0.5
    time_window: "15m"
    severity: "high"
    channels: ["slack", "email"]
    description: "API 错误率超过 0.5%"
    
  - name: "API Timeout Rate High"
    type: "timeout_rate"
    threshold: 0.1
    time_window: "15m"
    severity: "critical"
    channels: ["slack", "email", "sms"]
    description: "API 超时率超过 0.1%"

# ============================================
# 构建性能告警
# ============================================

build_performance:
  - name: "Build Time Exceeded"
    type: "build_time"
    threshold: 600000
    environment: "production"
    severity: "high"
    channels: ["slack", "email"]
    description: "生产构建时间超过 10 分钟"
    
  - name: "Type Check Time Exceeded"
    type: "type_check_time"
    threshold: 300000
    severity: "warning"
    channels: ["slack"]
    description: "TypeScript 类型检查时间超过 5 分钟"
    
  - name: "Build Failed"
    type: "build_status"
    status: "failed"
    severity: "critical"
    channels: ["slack", "email", "sms"]
    description: "构建失败"

# ============================================
# 智能体任务性能告警
# ============================================

agent_performance:
  - name: "Agent Task Timeout"
    type: "task_duration"
    threshold: 300000
    percentile: 95
    time_window: "1h"
    severity: "warning"
    channels: ["slack"]
    description: "智能体任务执行时间超过 5 分钟 (P95)"
    
  - name: "Agent Task Failure Rate"
    type: "task_failure_rate"
    threshold: 0.1
    time_window: "1h"
    severity: "high"
    channels: ["slack", "email"]
    description: "智能体任务失败率超过 10%"
    
  - name: "Agent Collaboration Latency"
    type: "collab_duration"
    threshold: 60000
    time_window: "1h"
    severity: "warning"
    channels: ["slack"]
    description: "智能体间协作延迟超过 1 分钟"

# ============================================
# 资源使用告警
# ============================================

resources:
  - name: "Memory Usage High"
    type: "memory"
    threshold: 85
    time_window: "5m"
    severity: "warning"
    channels: ["slack"]
    description: "内存使用率超过 85%"
    
  - name: "CPU Usage High"
    type: "cpu"
    threshold: 90
    time_window: "5m"
    severity: "warning"
    channels: ["slack"]
    description: "CPU 使用率超过 90%"

# ============================================
# 通知渠道配置
# ============================================

notification_channels:
  slack:
    webhook_url: "${SLACK_WEBHOOK_URL}"
    channels:
      critical: "#alerts-critical"
      high: "#alerts-high"
      warning: "#alerts-warning"
      info: "#alerts-info"
      
  email:
    recipients:
      critical: ["admin@7zi.studio", "ops@7zi.studio"]
      high: ["admin@7zi.studio", "dev@7zi.studio"]
      warning: ["dev@7zi.studio"]
      info: ["dev@7zi.studio"]
      
  sms:
    provider: "twilio"
    recipients:
      critical: ["+86-xxx-xxxx-xxxx"]

# ============================================
# 告警抑制规则
# ============================================

suppression:
  maintenance_windows:
    - name: "Weekly Maintenance"
      start: "Sunday 02:00 UTC"
      duration: "2h"
      
  ignore_patterns:
    - "ResizeObserver loop limit exceeded"
    - "Network request failed"
    - "Script error"
    
  deployment_grace_period: "5m"
```

### 5.3 Sentry 告警配置示例

在 Sentry Dashboard 中创建告警规则时使用以下配置：

```
# 性能告警示例

## LCP 告警
- Event type: Transaction
- Filter: event.transaction:/api/* AND measurement: lcp > 4000
- Environment: production
- Time: 1 hour
- Action: Slack #alerts-warning

## API P95 延迟告警
- Event type: Transaction
- Filter: op:http.server AND p95:duration > 500ms
- Environment: production
- Time: 15 minutes
- Action: Slack #alerts-high + Email

## 错误率告警
- Event type: Error
- Filter: event.type:error AND count() > 5%
- Environment: production
- Time: 15 minutes
- Action: Slack #alerts-critical + Email + SMS
```

---

## 6. 实施路线图

### 6.1 第一阶段：基础设施（本周）

- [ ] 创建 `lighthouserc.json` 配置文件
- [ ] 在 CI/CD 中集成 Lighthouse CI
- [ ] 配置 Sentry 性能监控
- [ ] 创建构建预算检查脚本

### 6.2 第二阶段：告警规则（下周）

- [ ] 在 Sentry 中创建性能告警规则
- [ ] 配置通知渠道（Slack、Email）
- [ ] 测试告警触发和通知
- [ ] 验证告警抑制规则

### 6.3 第三阶段：自动化（两周）

- [ ] 集成构建预算检查到 CI/CD
- [ ] 设置性能趋势分析
- [ ] 创建性能报告仪表板
- [ ] 制定性能复盘机制

---

## 7. 附录

### 7.1 性能预算汇总表

| 类别 | 指标 | 预算阈值 | 严重级别 |
|------|------|----------|----------|
| **Bundle** | 主 JS | ≤ 300 KB | P1 |
| **Bundle** | 总 JS | ≤ 500 KB | P2 |
| **LCP** | P75 | ≤ 2.5s | P1 |
| **LCP** | P75 | ≤ 4.0s | P2 |
| **CLS** | P75 | ≤ 0.1 | P1 |
| **CLS** | P75 | ≤ 0.25 | P2 |
| **FID** | P75 | ≤ 100ms | P1 |
| **INP** | P75 | ≤ 200ms | P1 |
| **API** | P95 | ≤ 500ms | P1 |
| **API** | 错误率 | ≤ 0.5% | P1 |
| **构建** | 生产 | ≤ 10 分钟 | P1 |
| **构建** | 开发 | ≤ 60 秒 | P2 |

### 7.2 相关文档

- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Web Vitals](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)

### 7.3 更新日志

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.8.0 | 2026-04-02 | 初始版本 - 性能预算和告警系统方案 |

---

**文档状态**: 正式发布  
**下次评审**: 2026-04-09  
**负责人**: 咨询师（研究分析专家）
