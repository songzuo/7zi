# Performance Report - Core Web Vitals Tracking

**Project:** 7zi-frontend  
**Version:** 1.14.0  
**Generated:** 2026-04-25  
**Author:** 测试员 (子代理)  
**Focus:** Core Web Vitals 追踪能力审查与报告

---

## Executive Summary

7zi-frontend 项目已实现**完整的性能监控系统**，支持 Core Web Vitals (LCP, FID/INP, CLS) 追踪。项目已集成 `web-vitals` v5.2.0 库，并在多处初始化了 Web Vitals 采集。

### 现有能力评估

| 功能 | 状态 | 说明 |
|------|------|------|
| Core Web Vitals 收集 | ✅ 已实现 | LCP, CLS, INP, FCP, TTFB |
| 自定义指标追踪 | ✅ 已实现 | 内存、网络、API、WebSocket |
| 性能预算管理 | ✅ 已实现 | 基于阈值的告警系统 |
| 异常检测 | ✅ 已实现 | Z-Score、Isolation Forest |
| 根因分析 | ✅ 已实现 | DB/API/渲染分析 |
| 实时仪表板 | ✅ 已实现 | 2 种 Dashboard 组件 |
| 性能报告生成 | ✅ 已实现 | MetricsReportGenerator |

---

## 1. 现有性能监控架构

### 1.1 库依赖

```
web-vitals@5.2.0        - Core Web Vitals 采集
@ducanh2912/next-pwa   - PWA + Service Worker
workbox-window@7.4.0    - SW 窗口管理
```

已在 `next.config.ts` 中优化 `web-vitals` 为独立 chunk (优先级 80)，最小化主线程阻塞。

### 1.2 初始化链路

```
Root Layout (app/layout.tsx)
  └── <MonitoringProvider>
        └── useEffect (延迟 1 秒)
              ├── initBrowserTracking()    → /lib/monitoring
              ├── initWebVitalsMonitoring() → /lib/performance
              └── initCustomMetricsTracking() → /lib/performance
```

### 1.3 Web Vitals 采集点 (双重实现)

**路径 1:** `src/lib/performance/web-vitals.ts` (WebVitalsMonitor 类)
- 导出 `initWebVitalsMonitoring()` 函数
- 追踪 LCP, CLS, INP, FCP, TTFB
- 与 `monitor.trackCustomMetric()` 集成
- 提供评分计算 (`calculateWebVitalsScore`)

**路径 2:** `src/lib/monitoring/client/index.ts` (轻量 SDK)
- 导出 `initClientMonitoring()` 函数
- 追踪同上指标
- 支持 `sendBeacon` 上报到自定义 endpoint
- 支持 Sentry 集成

两个路径**同时激活**，存在数据重复的可能性，建议后续统一。

---

## 2. Core Web Vitals 追踪详情

### 2.1 指标阈值配置

| 指标 | 名称 | Good 阈值 | Poor 阈值 | 单位 |
|------|------|-----------|-----------|------|
| LCP | 最大内容绘制 | ≤2500 | >4000 | ms |
| CLS | 累积布局偏移 | ≤0.1 | >0.25 | score |
| INP | 交互到下帧绘制 | ≤200 | >500 | ms |
| FID | 首次输入延迟* | ≤100 | >300 | ms |
| FCP | 首次内容绘制 | ≤1800 | >3000 | ms |
| TTFB | 首字节时间 | ≤800 | >1800 | ms |

*注：INP 已取代 FID 作为 Core Web Vital

### 2.2 告警配置

```typescript
// budget-manager.ts 默认告警阈值
PerformanceBudget = {
  webVitals: {
    LCP: { threshold: 2500, weight: 1.0 },
    CLS: { threshold: 0.1,  weight: 1.0 },
    INP: { threshold: 200,  weight: 1.0 },
  },
  customMetrics: {
    pageLoadTime: { threshold: 3000, weight: 1.0 },
    apiAverageResponseTime: { threshold: 1000, weight: 1.0 },
    apiErrorRate: { threshold: 0.05, weight: 1.0 },  // 5%
    memoryUsagePercent: { threshold: 85, weight: 1.0 },
    wsLatency: { threshold: 100, weight: 1.0 },
  }
}
```

### 2.3 性能预算检查器 (BudgetChecker)

位于 `src/lib/performance/budget-control/budget-checker.ts`

- 基于路径的预算配置 (如 `/`, `/dashboard`)
- 容差机制 (tolerance)
- 三级严重性: minor / major / critical
- 页面级别得分计算 (0-100)

---

## 3. 关键页面集成

### 3.1 性能监控演示页面

**路径:** `/performance-monitoring`

```tsx
// src/app/performance-monitoring/page.tsx
const monitoringState = usePerformanceMonitoring({
  enableWebVitals: true,
  enableCustomMetrics: true,
  enableBudget: true,
})
```

使用 `usePerformanceMonitoring` hook 初始化，挂在 `PerformanceDashboard` 组件展示实时数据。

### 3.2 根布局初始化

```tsx
// src/app/layout.tsx
<MonitoringProvider
  sampleRate={undefined}  // 默认 100% 采样
>
  {children}
</MonitoringProvider>
```

延迟 1 秒初始化，优先保证首屏渲染。

### 3.3 性能 Hook 使用位置

| Hook | 位置 | 用途 |
|------|------|------|
| `usePerformanceMonitoring` | performance-monitoring/page.tsx | 全量初始化 |
| `usePerformanceMetrics` | - | 定时获取指标 |
| `useCustomMetrics` | - | 手动记录 API/错误 |
| `useWebSocketPerformance` | - | WebSocket 延迟追踪 |
| `usePerformanceSummary` | - | 综合报告生成 |

---

## 4. 性能组件清单

### 4.1 组件目录

```
src/components/performance/
├── PerformanceDashboard.tsx   - 性能仪表板 (Web Vitals + 预算)
├── SmartPrefetch.tsx          - 智能预加载组件
├── LazyLoadImage.tsx          - 懒加载图片 (减少 CLS)
└── index.ts                   - 导出入口

src/features/monitoring/components/
├── PerformanceDashboard.tsx    - 基础监控仪表板
├── SimplePerformanceDashboard.tsx
└── EnhancedPerformanceDashboard.tsx  - 增强版 (含告警)

src/app/performance-monitoring/
└── page.tsx                   - 演示页面
```

### 4.2 仪表板功能对比

| 功能 | PerformanceDashboard | EnhancedPerformanceDashboard |
|------|---------------------|------------------------------|
| Web Vitals 实时值 | ✅ | ✅ |
| 自定义指标 | ✅ | ✅ |
| 性能预算状态 | ✅ | ✅ |
| 告警列表 | ✅ | ✅ |
| 异常检测 | ❌ | ❌ |
| 根因分析 | ❌ | ❌ |
| 历史趋势 | ❌ | ❌ |

---

## 5. 指标上报机制

### 5.1 本地存储

- **MemoryStorage**: 默认，进程级
- **LocalStorage**: 可配置，跨会话持久化

### 5.2 上报方式

1. **sendBeacon** (优先): 非阻塞，页面卸载时仍可发送
2. **fetch with keepalive**: 后备方案
3. **Sentry** (可选): 集成错误追踪

### 5.3 采样率

- **开发环境**: 100% (sampleRate = 1.0)
- **生产环境**: 可配置降低 (如 0.1)

---

## 6. 指标聚合与分析

### 6.1 MetricsCollector

收集:
- `SystemMetrics` - CPU、内存使用率
- `ResponseTimeMetrics` - P50/P90/P99 延迟
- `ErrorRateMetrics` - 错误率趋势
- `ThroughputMetrics` - QPS/RPS

### 6.2 MetricsAggregator

- 时间窗口聚合 (5min, 15min, 1h, 24h)
- 百分位数计算
- 异常值标记

### 6.3 MetricsReportGenerator

生成:
- 健康检查报告 (`generateHealthCheck`)
- 自定义时间范围报告
- 阈值违规报告

---

## 7. 异常检测与根因分析

### 7.1 异常检测算法

| 算法 | 位置 | 用途 |
|------|------|------|
| Z-Score | `anomaly-detection/algorithms/z-score.ts` | 单指标异常检测 |
| Isolation Forest | `anomaly-detection/algorithms/isolation-forest.ts` | 多指标异常检测 |

### 7.2 过滤器链

```
CompositeFilter
├── CooldownFilter        - 冷却期去重
├── ConfidenceFilter      - 置信度过滤
├── SeasonalFilter        - 季节性调整
├── SystemLoadFilter      - 系统负载调整
└── TrendFilter          - 趋势调整
```

### 7.3 根因分析模块

| 追踪器 | 追踪内容 |
|--------|-----------|
| DatabaseTracker | SQL 查询时间、慢查询 |
| APITracker | API 响应时间、错误率 |
| RenderingMetrics | 渲染阻塞、FPS |

---

## 8. 性能预算检查结果示例

```typescript
// 检查首页预算
const result = budgetChecker.checkBudget('/', {
  LCP: 2100,
  CLS: 0.08,
  INP: 120,
  TTFB: 450,
  FCP: 1200,
})

// 返回
{
  passed: true,           // 预算通过
  score: 100,             // 满分
  violations: [],
  checkedAt: 1745592060000
}
```

---

## 9. 已知问题与优化建议

### 9.1 双重 Web Vitals 初始化

`src/lib/performance/web-vitals.ts` 和 `src/lib/monitoring/client/index.ts` 同时注册 `onLCP/onCLS/onINP/onFCP/onTTFB` 回调。

**建议:** 统一到单一来源，避免重复上报。

### 9.2 Dashboard 缺少异常/根因展示

`EnhancedPerformanceDashboard` 显示 Web Vitals 但不显示异常检测结果和根因分析。

**建议:** 添加异常检测面板，集成 `rootCauseAnalyzer.getRootCauses()`。

### 9.3 缺少前端性能报告导出

目前无 JSON/Markdown 格式的性能报告导出功能。

**建议:** 添加 `/api/performance/report` 路由，生成并下载性能报告。

### 9.4 FID 已废弃

代码中仍有 FID 相关配置 (budget-control/types.ts)，但实际已用 INP 替代。

**建议:** 移除 FID 相关代码，统一使用 INP。

---

## 10. 性能测试验证命令

```bash
# 构建检查
cd /root/.openclaw/workspace/7zi-frontend
pnpm build

# 类型检查
pnpm typecheck

# 单元测试
pnpm test -- --run src/lib/performance/__tests__

# E2E 测试 (需启动服务)
pnpm dev &
sleep 5
pnpm test:e2e -- --grep "performance"

# Web Vitals 手动验证 (浏览器 DevTools)
# 1. 打开 Chrome DevTools
# 2. 导航到 Performance 标签
# 3. 记录 LCP, CLS, INP 值
# 4. 对比 dashboard 显示值
```

---

## 11. 依赖版本清单

| 包名 | 版本 | 用途 |
|------|------|------|
| web-vitals | 5.2.0 | Core Web Vitals |
| @ducanh2912/next-pwa | 10.2.9 | PWA 缓存 |
| workbox-window | 7.4.0 | SW 管理 |
| next | 16.2.4 | 框架 |
| react | 19.2.5 | UI 库 |
| zustand | 5.0.12 | 状态管理 |

---

## 12. 文件结构总结

```
src/
├── app/
│   ├── layout.tsx                    # 全局监控初始化入口
│   ├── providers/
│   │   └── MonitoringProvider.tsx    # 延迟初始化监控
│   ├── performance-monitoring/
│   │   └── page.tsx                 # 性能演示页
│   └── api/performance/
│       ├── stats/route.ts            # 统计 API
│       ├── alerts/route.ts           # 告警 API
│       ├── queries/route.ts          # 查询 API
│       └── cache/route.ts            # 缓存 API
├── lib/
│   ├── performance/                  # 核心监控库
│   │   ├── index.ts                  # 统一导出
│   │   ├── web-vitals.ts            # Web Vitals 采集
│   │   ├── custom-metrics.ts        # 自定义指标
│   │   ├── budget-manager.ts        # 预算+告警
│   │   ├── budget-control/          # 高级预算检查
│   │   ├── metrics-collector.ts     # 指标采集
│   │   ├── metrics-aggregator.ts   # 指标聚合
│   │   ├── metrics-report.ts        # 报告生成
│   │   ├── anomaly-detection/       # 异常检测
│   │   └── root-cause-analysis/     # 根因分析
│   └── monitoring/
│       ├── client/
│       │   ├── index.ts             # 轻量 SDK
│       │   ├── types.ts
│       │   └── usePerformanceMonitor.ts
│       └── ...
├── components/
│   └── performance/                  # UI 组件
│       ├── PerformanceDashboard.tsx
│       ├── SmartPrefetch.tsx
│       └── LazyLoadImage.tsx
├── features/
│   └── monitoring/
│       ├── components/
│       │   ├── PerformanceDashboard.tsx
│       │   ├── SimplePerformanceDashboard.tsx
│       │   └── EnhancedPerformanceDashboard.tsx
│       └── lib/monitor.ts
└── hooks/
    └── usePerformanceMonitoring.ts   # React Hook
```

---

## 结论

✅ **7zi-frontend 已具备完整的 Core Web Vitals 追踪能力**

核心指标 (LCP, CLS, INP) 采集正常，与监控、告警、预算系统完整集成。建议关注双重初始化问题，并增强 Dashboard 的异常/根因展示能力。

---

*Report generated by 测试员 subagent on 2026-04-25*