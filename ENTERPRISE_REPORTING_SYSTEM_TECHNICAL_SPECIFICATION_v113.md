# 企业级报表系统技术规格文档 v1.13.0

**版本**: 1.0  
**日期**: 2026-04-06  
**目标版本**: v1.13.0  
**优先级**: P1  
**状态**: 📋 规划中 (待启动)  
**负责人**: 🎨 设计师 + 💰 财务 + 🏗️ 架构师  

---

## 📋 执行摘要

本文档为企业级报表系统提供完整的技术规格说明，基于现有审计日志系统 (v1.10.0) 的分析结果，制定详细的技术方案和实施计划。

**核心决策**:
1. **图表库**: Apache ECharts (功能最全面，企业级首选)
2. **架构模式**: 微前端 + 模块化报表引擎
3. **数据源**: 优先集成现有审计日志分析服务 + 多数据源扩展
4. **缓存策略**: L1(内存) + L2(Redis) + L3(数据库) 三级缓存
5. **设计器**: 基于 @dnd-kit 实现拖拽式报表设计器

**实现周期**: 4-5 周 (6-8 周细化)  
**工作量**: 约 32 人天  

---

## 1. 现有系统分析

### 1.1 审计日志系统现状

**核心组件** (`src/lib/audit-log/`):

| 组件 | 文件 | 功能 | 状态 |
|------|------|------|------|
| 核心服务 | `audit-log.ts` | 审计日志主服务 | ✅ 完整 |
| 事件构建器 | `event-builder.ts` | 事件构建器 | ✅ 完整 |
| 查询服务 | `query-service.ts` | 审计日志查询 | ✅ 完整 |
| 分析服务 | `analytics-service.ts` | 统计分析、聚合、趋势 | ✅ 完整 |
| 合规服务 | `compliance-service.ts` | 合规报告生成 | ✅ 完整 |
| 导出服务 | `export-service.ts` | JSON/CSV/XLSX导出 | ⚠️ XLSX仅占位 |
| 存储服务 | `storage/` | 多存储后端支持 | ✅ 完整 |
| 敏感数据 | `sensitive-data-handler.ts` | 数据脱敏 | ✅ 完整 |
| 签名服务 | `signature-handler.ts` | 完整性签名 | ✅ 完整 |

### 1.2 现有分析能力

**Analytics Service 提供的功能**:

```typescript
// 统计分析
aggregate(options: AuditAggregationOptions): Promise<AuditAggregationResult>

// 趋势分析
getTrends(timeRange: TimeRange, interval: 'hour' | 'day' | 'week'): Promise<AuditTrendResult>

// 用户活动统计
getUserActivityStats(userId: string): Promise<UserActivityStats>

// 资源访问统计
getResourceAccessStats(resourceType: string): Promise<ResourceAccessStats>
```

**支持的数据维度**:

| 维度 | 字段 | 说明 |
|------|------|------|
| 用户维度 | userId, username, organizationId | 按用户/组织统计 |
| 时间维度 | hour, day, week, month | 时间序列分析 |
| 操作维度 | action, category, level, severity | 操作类型统计 |
| 资源维度 | resource_type, resource_id | 资源访问分析 |
| 状态维度 | status | 成功率/失败率分析 |

### 1.3 现有导出服务分析

**当前实现** (`export-service.ts`):

```typescript
// 支持格式
type AuditExportFormat = 'json' | 'csv' | 'xlsx'

// 导出能力
- JSON: ✅ 完整实现，支持 gzip 压缩
- CSV: ✅ 完整实现，支持 gzip 压缩  
- XLSX: ⚠️ 仅占位实现 (fallback to CSV)
```

**脱敏处理**:

```typescript
// 邮箱脱敏: user@example.com → u***r@example.com
// 敏感字段: password/token/secret/apiKey/privateKey → ***

private sanitizeEvents(events: AuditEvent[]): AuditEvent[]
```

### 1.4 现有数据模型

**审计事件结构**:

```typescript
interface AuditEvent {
  id: string
  timestamp: Date
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical'
  category: 'user' | 'system' | 'business' | 'security' | 'compliance' | 'data' | 'admin'
  action: AuditActionType
  status: 'success' | 'failure' | 'partial' | 'pending'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  details?: Record<string, unknown>
  user?: AuditUserContext
  request?: AuditRequestContext
  resource?: AuditResource
  changes?: AuditChangeDetail[]
  correlationId?: string
  parentId?: string
  tags?: string[]
  metadata?: Record<string, unknown>
  signature?: string
}
```

### 1.5 现有系统能力总结

| 能力 | 现有状态 | 企业报表需求 | Gap |
|------|---------|------------|-----|
| 数据采集 | ✅ 完善 | 需要扩展到其他数据源 | 需支持多数据源 |
| 数据存储 | ✅ SQLite | 扩展到时序数据 | 需时序数据库 |
| 数据查询 | ✅ 完善 | 需要更快的响应 | 需缓存优化 |
| 数据分析 | ✅ 聚合/趋势 | 需要更多分析模型 | 需预测/异常检测 |
| 数据可视化 | ❌ 无 | 企业级图表 | 需全新建设 |
| 报表设计 | ❌ 无 | 拖拽式设计器 | 需全新建设 |
| 实时数据 | ⚠️ WebSocket基础 | 实时仪表盘 | 需增强 |
| 导出功能 | ⚠️ CSV/JSON/XLSX占位 | PDF/图片完整实现 | 需完善 |
| 报表分享 | ❌ 无 | 分享/权限控制 | 需全新建设 |
| 权限控制 | ⚠️ 基础 | 行列级权限 | 需增强 |

---

## 2. 功能需求规格

### 2.1 核心功能列表

#### P0 功能 (必须实现)

| 功能ID | 功能名称 | 功能描述 | 优先级 |
|--------|---------|---------|--------|
| RPT-001 | 基础图表组件 | 提供 10+ 种 ECharts 图表封装 | P0 |
| RPT-002 | 报表查看页面 | 报表展示、交互、筛选 | P0 |
| RPT-003 | 实时数据看板 | WebSocket 实时数据更新 | P0 |
| RPT-004 | 数据聚合服务 | 多维度数据聚合计算 | P0 |
| RPT-005 | 图表导出 | PNG/SVG 图片导出 | P0 |
| RPT-006 | PDF 导出 | 报表 PDF 格式导出 | P0 |
| RPT-007 | 报表权限控制 | 基于角色的报表访问控制 | P0 |

#### P1 功能 (计划实现)

| 功能ID | 功能名称 | 功能描述 | 优先级 |
|--------|---------|---------|--------|
| RPT-101 | 拖拽式报表设计器 | 可视化拖拽构建报表 | P1 |
| RPT-102 | 报表模板市场 | 预设模板快速创建 | P1 |
| RPT-103 | 报表分享 | 公开/私有链接分享 | P1 |
| RPT-104 | 指标卡组件 | KPI 指标展示组件 | P1 |
| RPT-105 | 表格组件 | 数据表格展示组件 | P1 |
| RPT-106 | 数据筛选器 | 多维度数据筛选组件 | P1 |

#### P2 功能 (后续迭代)

| 功能ID | 功能名称 | 功能描述 | 优先级 |
|--------|---------|---------|--------|
| RPT-201 | 报表版本历史 | 报表版本管理/回滚 | P2 |
| RPT-202 | 自定义图表类型 | 扩展自定义图表 | P2 |
| RPT-203 | 邮件订阅报表 | 定时邮件推送报表 | P2 |
| RPT-204 | 告警规则 | 指标阈值告警触发 | P2 |

### 2.2 图表类型清单

| 图表ID | 图表名称 | ECharts 类型 | 用途 |
|--------|---------|-------------|------|
| CHT-001 | 柱状图 | bar | 分类对比 |
| CHT-002 | 堆叠柱状图 | bar (stacked) | 构成分析 |
| CHT-003 | 折线图 | line | 趋势变化 |
| CHT-004 | 面积图 | line (area) | 趋势+总量 |
| CHT-005 | 饼图 | pie | 占比分析 |
| CHT-006 | 环形图 | pie (roseType) | 多重占比 |
| CHT-007 | 散点图 | scatter | 关联分析 |
| CHT-008 | 热力图 | heatmap | 密度分布 |
| CHT-009 | 雷达图 | radar | 多维指标 |
| CHT-010 | 漏斗图 | funnel | 转化分析 |
| CHT-011 | 甘特图 | custom (gantt) | 项目进度 |
| CHT-012 | 仪表盘 | gauge | KPI 达成 |
| CHT-013 | 树图 | tree | 层级结构 |
| CHT-014 | 日历图 | calendar | 时间分布 |

### 2.3 数据源支持

| 数据源类型 | 支持状态 | 数据源ID | 说明 |
|-----------|---------|----------|------|
| 审计日志 | ✅ 现有 | `audit_logs` | 复用 analytics-service |
| 任务执行 | 🔄 待接入 | `task_executions` | 工作流任务数据 |
| Agent 状态 | 🔄 待接入 | `agent_status` | Agent 监控数据 |
| 用户活动 | 🔄 待接入 | `user_activities` | 用户行为数据 |
| 性能指标 | 🔄 待接入 | `performance_metrics` | 系统性能数据 |
| 静态数据 | ✅ 支持 | `static` | JSON/CSV 静态数据 |

---

## 3. 技术架构设计

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Enterprise Reporting System                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      Report Designer Layer                        │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │    │
│  │  │ Component   │  │ Canvas      │  │ Properties              │ │    │
│  │  │ Panel       │  │ (DnD)       │  │ Editor                   │ │    │
│  │  │ (组件面板)   │  │ (拖放区域)  │  │ (属性编辑)               │ │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                      │
│                                    ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      Report Engine Layer                          │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │    │
│  │  │ Report      │  │ Widget       │  │ Layout                   │ │    │
│  │  │ Manager     │  │ Renderer     │  │ Engine                   │ │    │
│  │  │ (报表管理)   │  │ (组件渲染)   │  │ (布局引擎)               │ │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                      │
│                                    ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      Data Layer                                   │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │    │
│  │  │ Aggregation │  │ Cache        │  │ Data Source             │ │    │
│  │  │ Engine      │  │ Manager      │  │ Proxy                   │ │    │
│  │  │ (聚合引擎)   │  │ (缓存管理)   │  │ (数据源代理)             │ │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘ │    │
│  │                              │                                    │    │
│  │         ┌────────────────────┼────────────────────┐              │    │
│  │         ▼                    ▼                    ▼              │    │
│  │  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐      │    │
│  │  │ Audit Log   │      │ Redis       │      │ SQLite      │      │    │
│  │  │ Analytics   │      │ Cache       │      │ Database    │      │    │
│  │  └─────────────┘      └─────────────┘      └─────────────┘      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                      │
│                                    ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      Export Layer                                │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │    │
│  │  │ PDF Export  │  │ Image       │  │ Report Sharing          │ │    │
│  │  │ (PDF导出)    │  │ Export      │  │ (报表分享)               │ │    │
│  │  │             │  │ (图片导出)   │  │                         │ │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 目录结构设计

```
src/
├── lib/
│   └── reporting/                          # 报表引擎核心
│       ├── index.ts                        # 导出入口
│       ├── types.ts                        # 类型定义
│       │
│       ├── engine/                         # 报表引擎
│       │   ├── report-manager.ts           # 报表管理器
│       │   ├── widget-registry.ts          # 组件注册表
│       │   ├── layout-engine.ts             # 布局引擎
│       │   └── data-binder.ts              # 数据绑定器
│       │
│       ├── data/                           # 数据层
│       │   ├── aggregation-engine.ts        # 聚合引擎
│       │   ├── cache-manager.ts            # 缓存管理器
│       │   ├── data-source-proxy.ts         # 数据源代理
│       │   └── sources/
│       │       ├── audit-log-source.ts     # 审计日志数据源
│       │       ├── task-execution-source.ts # 任务执行数据源
│       │       └── static-source.ts         # 静态数据源
│       │
│       ├── designer/                       # 设计器
│       │   ├── report-designer.tsx         # 设计器主组件
│       │   ├── component-panel.tsx          # 组件面板
│       │   ├── canvas.tsx                   # 画布组件
│       │   ├── properties-panel.tsx         # 属性面板
│       │   └── drag-drop-context.tsx       # 拖拽上下文
│       │
│       └── export/                         # 导出服务
│           ├── pdf-exporter.ts             # PDF导出
│           ├── image-exporter.ts           # 图片导出
│           └── report-sharer.ts            # 报表分享
│
├── components/
│   └── reporting/                          # 报表组件
│       ├── charts/                         # 图表组件
│       │   ├── index.ts
│       │   ├── bar-chart.tsx
│       │   ├── line-chart.tsx
│       │   ├── pie-chart.tsx
│       │   ├── scatter-chart.tsx
│       │   ├── heat-map.tsx
│       │   ├── radar-chart.tsx
│       │   ├── funnel-chart.tsx
│       │   ├── gantt-chart.tsx
│       │   ├── gauge-chart.tsx
│       │   ├── tree-chart.tsx
│       │   ├── calendar-chart.tsx
│       │   └── types.ts
│       │
│       ├── widgets/                        # 组件部件
│       │   ├── index.ts
│       │   ├── metric-card.tsx             # 指标卡
│       │   ├── data-table.tsx              # 数据表格
│       │   ├── filter-panel.tsx            # 筛选面板
│       │   └── text-block.tsx              # 文本块
│       │
│       └── shared/                         # 共享组件
│           ├── chart-container.tsx         # 图表容器
│           ├── responsive-wrapper.tsx       # 响应式包装
│           └── theme-provider.tsx          # 主题提供者
│
├── app/
│   └── (dashboard)/
│       └── reports/                        # 报表页面
│           ├── page.tsx                    # 报表列表页
│           ├── [id]/
│           │   └── page.tsx                # 报表查看页
│           └── designer/
│               └── page.tsx                # 设计器页
│
└── api/
    └── reporting/                          # 报表 API
        ├── route.ts                       # 报表 CRUD
        ├── [id]/
        │   ├── route.ts                    # 单个报表操作
        │   ├── data/route.ts               # 报表数据获取
        │   └── export/route.ts             # 报表导出
        └── templates/
            └── route.ts                    # 模板 API
```

### 3.3 核心类型定义

```typescript
// ============================================================================
// 报表定义
// ============================================================================

/**
 * 报表定义
 */
interface Report {
  /** 报表ID */
  id: string
  /** 报表名称 */
  name: string
  /** 报表描述 */
  description?: string
  /** 版本号 */
  version: number
  /** 布局配置 */
  layout: ReportLayout
  /** 组件列表 */
  widgets: Widget[]
  /** 数据源配置 */
  dataSources: DataSourceConfig[]
  /** 报表设置 */
  settings: ReportSettings
  /** 权限配置 */
  permissions: ReportPermissions
  /** 创建者 */
  createdBy: string
  /** 创建时间 */
  createdAt: Date
  /** 更新时间 */
  updatedAt: Date
  /** 标签 */
  tags?: string[]
}

/**
 * 布局配置
 */
interface ReportLayout {
  /** 布局类型 */
  type: 'grid' | 'free' | 'tabs'
  /** 列数 (grid模式) */
  columns: number
  /** 组件间距 (px) */
  gap: number
  /** 边距 */
  padding?: number
  /** 背景色 */
  backgroundColor?: string
}

/**
 * 组件配置
 */
interface Widget {
  /** 组件ID */
  id: string
  /** 组件类型 */
  type: WidgetType
  /** 位置 */
  position: Position
  /** 尺寸 */
  size: Size
  /** 组件配置 */
  config: WidgetConfig
  /** 数据源ID */
  dataSourceId: string
  /** 查询参数 */
  queryParams?: QueryParams
  /** 样式覆盖 */
  style?: WidgetStyle
  /** 交互配置 */
  interactions?: InteractionConfig
}

/**
 * 组件类型
 */
type WidgetType =
  | 'chart.bar'
  | 'chart.line'
  | 'chart.pie'
  | 'chart.scatter'
  | 'chart.heatmap'
  | 'chart.radar'
  | 'chart.funnel'
  | 'chart.gantt'
  | 'chart.gauge'
  | 'chart.tree'
  | 'chart.calendar'
  | 'metric'
  | 'table'
  | 'filter'
  | 'text'

/**
 * 位置
 */
interface Position {
  /** X坐标 (列) */
  x: number
  /** Y坐标 (行) */
  y: number
}

/**
 * 尺寸
 */
interface Size {
  /** 宽度 (列) */
  w: number
  /** 高度 (行) */
  h: number
}

/**
 * 图表配置
 */
interface ChartConfig {
  /** 图表类型 */
  chartType: string
  /** ECharts 配置项 */
  echartsOptions?: Record<string, unknown>
  /** X轴配置 */
  xAxis?: AxisConfig
  /** Y轴配置 */
  yAxis?: AxisConfig[]
  /** 系列配置 */
  series?: SeriesConfig[]
  /** 图例配置 */
  legend?: LegendConfig
  /** 工具栏配置 */
  toolbox?: ToolboxConfig
  /** 提示框配置 */
  tooltip?: TooltipConfig
}

/**
 * 指标卡配置
 */
interface MetricConfig {
  /** 指标名称 */
  label: string
  /** 数值字段 */
  valueField: string
  /** 前缀 */
  prefix?: string
  /** 后缀 */
  suffix?: string
  /** 格式化类型 */
  format: 'number' | 'currency' | 'percent' | 'compact'
  /** 小数位数 */
  decimals?: number
  /** 趋势配置 */
  trend?: {
    enabled: boolean
    comparisonField?: string
    format: 'percent' | 'absolute'
  }
  /** 颜色配置 */
  colors?: {
    positive?: string
    negative?: string
    neutral?: string
  }
}

/**
 * 数据表格配置
 */
interface TableConfig {
  /** 列定义 */
  columns: TableColumn[]
  /** 分页配置 */
  pagination?: {
    enabled: boolean
    pageSize?: number
  }
  /** 排序配置 */
  sortable?: boolean
  /** 筛选配置 */
  filterable?: boolean
  /** 行高 */
  rowHeight?: 'compact' | 'normal' | 'comfortable'
}

/**
 * 数据源配置
 */
interface DataSourceConfig {
  /** 数据源ID */
  id: string
  /** 数据源类型 */
  type: DataSourceType
  /** 连接配置 */
  connection: DataSourceConnection
  /** 查询配置 */
  query?: QueryConfig
  /** 缓存配置 */
  cache?: CacheConfig
}

/**
 * 数据源类型
 */
type DataSourceType =
  | 'audit_logs'
  | 'task_executions'
  | 'agent_status'
  | 'user_activities'
  | 'performance_metrics'
  | 'static'
  | 'api'

/**
 * 查询配置
 */
interface QueryConfig {
  /** 查询类型 */
  type: 'aggregation' | 'time_series' | 'list' | 'detail'
  /** 指标/字段 */
  metrics: string[]
  /** 维度/分组 */
  dimensions?: string[]
  /** 过滤条件 */
  filters?: Filter[]
  /** 时间范围 */
  timeRange?: TimeRangeConfig
  /** 排序 */
  sort?: SortConfig[]
  /** 限制 */
  limit?: number
}

/**
 * 过滤条件
 */
interface Filter {
  /** 字段 */
  field: string
  /** 操作符 */
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'between'
  /** 值 */
  value: unknown
}

/**
 * 时间范围配置
 */
interface TimeRangeConfig {
  /** 类型 */
  type: 'fixed' | 'relative' | 'custom'
  /** 相对时间 (如: -7d, -1M) */
  relative?: string
  /** 固定时间范围 */
  range?: {
    start: string
    end: string
  }
}

/**
 * 缓存配置
 */
interface CacheConfig {
  /** 是否启用 */
  enabled: boolean
  /** TTL (秒) */
  ttl: number
  /** 缓存级别 */
  level: 'memory' | 'redis' | 'both'
}

/**
 * 报表设置
 */
interface ReportSettings {
  /** 刷新间隔 (秒) */
  refreshInterval?: number
  /** 是否启用实时 */
  realTime?: boolean
  /** 主题 */
  theme: 'light' | 'dark' | 'auto'
  /** 语言 */
  locale: string
  /** 默认时间范围 */
  defaultTimeRange?: TimeRangeConfig
}

/**
 * 权限配置
 */
interface ReportPermissions {
  /** 所有者 */
  owner: string
  /** 可查看者 */
  viewers: string[]
  /** 可编辑者 */
  editors: string[]
  /** 公开访问 */
  isPublic: boolean
  /** 分享链接设置 */
  shareSettings?: {
    enabled: boolean
    requireAuth: boolean
    expiresAt?: Date
  }
}

// ============================================================================
// 组件配置联合类型
// ============================================================================

type WidgetConfig = ChartConfig | MetricConfig | TableConfig | FilterConfig | TextConfig

interface FilterConfig {
  filterType: 'dropdown' | 'date_range' | 'search' | 'radio'
  placeholder?: string
  options?: Array<{ label: string; value: string }>
}

interface TextConfig {
  content: string
  align: 'left' | 'center' | 'right'
  fontSize?: number
  fontWeight?: 'normal' | 'bold'
  color?: string
}
```

### 3.4 数据聚合 API 设计

```typescript
// ============================================================================
// 数据聚合引擎 API
// ============================================================================

/**
 * 聚合查询请求
 */
interface AggregationRequest {
  /** 数据源ID */
  dataSourceId: string
  /** 查询类型 */
  queryType: 'aggregation' | 'time_series' | 'top_n' | 'comparison'
  /** 指标 */
  metrics: Array<{
    field: string
    aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'count_distinct'
    alias?: string
  }>
  /** 维度 (用于分组) */
  dimensions?: string[]
  /** 过滤条件 */
  filters?: Filter[]
  /** 时间范围 */
  timeRange?: TimeRangeConfig
  /** 时间粒度 (时间序列查询时) */
  granularity?: 'minute' | 'hour' | 'day' | 'week' | 'month'
  /** 排序 */
  sort?: Array<{ field: string; order: 'asc' | 'desc' }>
  /** 限制 */
  limit?: number
}

/**
 * 聚合查询响应
 */
interface AggregationResponse {
  /** 数据 */
  data: Record<string, unknown>[]
  /** 总数 */
  total: number
  /** 查询耗时 (ms) */
  duration: number
  /** 缓存命中 */
  cached: boolean
  /** 时间范围 */
  timeRange?: TimeRangeConfig
}

/**
 * 时间序列查询响应
 */
interface TimeSeriesResponse {
  /** 数据点 */
  points: Array<{
    timestamp: Date
    values: Record<string, number>
  }>
  /** 粒度 */
  granularity: string
  /** 查询耗时 */
  duration: number
}

/**
 * 审计日志专用聚合 (扩展现有 analytics-service)
 */
interface AuditLogAggregation extends AggregationRequest {
  // 审计日志特有字段
  categories?: AuditEventCategory[]
  actions?: AuditActionType[]
  levels?: AuditLogLevel[]
  severities?: AuditSeverity[]
  userIds?: string[]
  resourceTypes?: string[]
  includeTrend?: boolean
}
```

---

## 4. 组件规格

### 4.1 图表组件接口

```typescript
// ============================================================================
// 基础图表组件接口
// ============================================================================

interface BaseChartProps {
  // 数据
  data: ChartDataItem[]
  
  // 维度映射
  xAxis?: string | AxisConfig
  yAxis?: string | AxisConfig | AxisConfig[]
  
  // 图表类型
  type: ChartType
  
  // 交互
  interactive?: boolean
  onClick?: (params: ChartClickParams) => void
  onHover?: (params: ChartHoverParams) => void
  
  // 样式
  theme?: 'light' | 'dark' | 'auto'
  height?: number | string
  width?: number | string
  
  // 动画
  animation?: boolean | AnimationConfig
  
  // ECharts 原始配置 (用于高级定制)
  echartsOptions?: Record<string, unknown>
}

interface ChartDataItem {
  [key: string]: unknown
}

interface AxisConfig {
  field: string
  label?: string
  type?: 'category' | 'value' | 'time'
  position?: 'bottom' | 'top' | 'left' | 'right'
  format?: string
  min?: number | 'auto'
  max?: number | 'auto'
}

// ============================================================================
// 柱状图组件
// ============================================================================

interface BarChartProps extends BaseChartProps {
  type: 'bar'
  /** 堆叠配置 */
  stacked?: boolean
  /** 柱状方向 */
  direction?: 'vertical' | 'horizontal'
  /** 圆角 */
  barRadius?: number | [number, number, number, number]
}

/**
 * 使用示例
 */
function ExampleBarChart() {
  const data = [
    { month: '1月', sales: 1200, profit: 400 },
    { month: '2月', sales: 1800, profit: 600 },
    { month: '3月', sales: 1500, profit: 500 },
  ]
  
  return (
    <BarChart
      data={data}
      xAxis="month"
      yAxis={[
        { field: 'sales', label: '销售额' },
        { field: 'profit', label: '利润' },
      ]}
      type="bar"
      height={300}
      theme="auto"
    />
  )
}

// ============================================================================
// 折线图组件
// ============================================================================

interface LineChartProps extends BaseChartProps {
  type: 'line'
  /** 面积图配置 */
  area?: boolean | { style?: 'solid' | 'gradient' }
  /** 平滑曲线 */
  smooth?: boolean
  /** 阶梯图 */
  step?: boolean | 'start' | 'middle' | 'end'
  /** 标记点 */
  markers?: boolean
}

// ============================================================================
// 饼图组件
// ============================================================================

interface PieChartProps extends BaseChartProps {
  type: 'pie'
  /** 饼图半径 */
  radius?: number | [number, number]
  /** 玫瑰图类型 */
  roseType?: 'radius' | 'area' | boolean
  /** 标签位置 */
  labelPosition?: 'outside' | 'inside' | 'center'
  /** 选中效果 */
  selectedMode?: boolean
}

// ============================================================================
// 热力图组件
// ============================================================================

interface HeatMapProps extends BaseChartProps {
  type: 'heatmap'
  /** X轴类别 */
  xCategories?: string[]
  /** Y轴类别 */
  yCategories?: string[]
  /** 最小值 */
  min?: number
  /** 最大值 */
  max?: number
  /** 颜色范围 */
  colorRange?: [string, string, string]
}
```

### 4.2 指标卡组件

```typescript
// ============================================================================
// 指标卡组件
// ============================================================================

interface MetricCardProps {
  /** 指标值 */
  value: number | string
  /** 指标标签 */
  label: string
  /** 趋势值 (可选) */
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
    comparisonValue?: number
  }
  /** 前缀 */
  prefix?: string
  /** 后缀 */
  suffix?: string
  /** 格式化 */
  format?: 'number' | 'currency' | 'percent' | 'compact'
  /** 小数位数 */
  decimals?: number
  /** 图标 */
  icon?: React.ReactNode
  /** 颜色 */
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
  /** 加载状态 */
  loading?: boolean
}

/**
 * 使用示例
 */
function ExampleMetrics() {
  return (
    <div className="grid grid-cols-4 gap-4">
      <MetricCard
        label="总销售额"
        value={1234567}
        format="currency"
        decimals={2}
        prefix="¥"
        trend={{ value: 12.5, direction: 'up' }}
      />
      
      <MetricCard
        label="活跃用户"
        value={8562}
        format="compact"
        suffix="人"
        trend={{ value: -3.2, direction: 'down' }}
      />
      
      <MetricCard
        label="转化率"
        value={0.0425}
        format="percent"
        decimals={2}
        trend={{ value: 0.8, direction: 'up' }}
      />
      
      <MetricCard
        label="平均响应时间"
        value={245}
        suffix="ms"
        color="warning"
      />
    </div>
  )
}
```

### 4.3 数据表格组件

```typescript
// ============================================================================
// 数据表格组件
// ============================================================================

interface DataTableProps {
  /** 数据 */
  data: Record<string, unknown>[]
  /** 列定义 */
  columns: TableColumn[]
  /** 加载状态 */
  loading?: boolean
  /** 空状态 */
  emptyText?: string
  /** 分页 */
  pagination?: {
    current: number
    pageSize: number
    total: number
    onChange: (page: number, pageSize: number) => void
  }
  /** 行选择 */
  selectable?: boolean
  /** 已选行 */
  selectedRows?: string[]
  /** 选择变化回调 */
  onSelectionChange?: (selectedRowKeys: string[]) => void
  /** 排序变化回调 */
  onSortChange?: (field: string, order: 'asc' | 'desc') => void
  /** 筛选变化回调 */
  onFilterChange?: (filters: Record<string, unknown>) => void
}

interface TableColumn {
  /** 数据字段 */
  dataIndex: string
  /** 列标题 */
  title: string
  /** 列宽 */
  width?: number | string
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right'
  /** 可排序 */
  sortable?: boolean
  /** 可筛选 */
  filterable?: boolean
  /** 筛选类型 */
  filterType?: 'search' | 'select' | 'date_range'
  /** 筛选选项 */
  filterOptions?: Array<{ label: string; value: unknown }>
  /** 自定义渲染 */
  render?: (value: unknown, record: Record<string, unknown>, index: number) => React.ReactNode
}
```

---

## 5. 缓存策略设计

### 5.1 多级缓存架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      Client (Browser)                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  L1: React Context / Zustand (Memory Cache)              │  │
│  │  - 当前页面报表数据                                       │  │
│  │  - TTL: Session Level                                    │  │
│  │  - Max Size: 50 entries                                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (HTTP Request with Cache-Control)
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js API Route                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  L2: Server-Side LRU Cache                               │  │
│  │  - 热数据缓存                                             │  │
│  │  - TTL: 1-5 minutes                                      │  │
│  │  - Max Size: 1000 entries                               │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (Redis GET/SET)
┌─────────────────────────────────────────────────────────────────┐
│                      Redis Cache                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  L3: Redis (Distributed Cache)                           │  │
│  │  - 报表定义缓存                                           │  │
│  │  - 聚合结果缓存                                           │  │
│  │  - TTL: 5-30 minutes                                     │  │
│  │  - Key Pattern: reporting:{type}:{id}:{hash}              │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (SQL Query)
┌─────────────────────────────────────────────────────────────────┐
│                    SQLite Database                               │
│  - 报表定义 (report_definitions)                                │
│  - 报表版本 (report_versions)                                   │
│  - 报表数据缓存 (report_data_cache)                            │
│  - 聚合历史 (aggregation_history)                              │
└─────────────────────────────────────────────────────────────────┘