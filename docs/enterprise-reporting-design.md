# 企业级报表系统技术方案

**版本**: 1.0  
**日期**: 2026-04-06  
**目标版本**: v1.13.0  
**优先级**: P1  
**状态**: 📋 技术方案设计完成  
**负责人**: 🎨 设计师 + 💰 财务 + 🏗️ 架构师  

---

## 📋 执行摘要

本文档为企业级报表系统提供完整的技术方案设计。该系统将基于现有审计日志分析服务和 WebSocket 实时协作基础设施，构建功能完整的企业级报表平台。

**核心技术决策**:

| 决策项 | 选型 | 理由 |
|--------|------|------|
| 图表库 | Recharts (现有) + ECharts (高级) | Recharts 已在使用，ECharts 提供更丰富企业特性 |
| 报表设计器 | @dnd-kit 拖拽引擎 | React 生态首选，与现有技术栈一致 |
| 实时数据 | WebSocket (现有基础设施) | 已有的 Socket.IO 协作系统可复用 |
| 数据缓存 | L1(内存) + L2(Redis) + L3(DB) | 已有 MultiLevelCache 可复用 |
| 导出格式 | PDF (PDFKit)、Excel (XLSX)、CSV | 现有 XLSX 包装器可复用 |
| 权限模型 | RBAC + 报表级权限 | 复用现有 RBAC 系统 |

**工作量估算**: 32 人天 (4-5 周)  
**实施周期**: Week 5-9 (并行于其他 v1.13.0 功能)

---

## 1. 现有系统分析

### 1.1 现有技术栈

| 组件 | 技术 | 位置 | 复用价值 |
|------|------|------|----------|
| 图表库 | Recharts ^3.8.0 | `src/components/analytics/` | ✅ 直接复用 |
| WebSocket | Socket.IO | `src/lib/websocket/` | ✅ 复用协作基础设施 |
| 数据缓存 | MultiLevelCache | `src/lib/cache/` | ✅ 复用缓存基础设施 |
| 数据导出 | XLSX (SheetJS) | `src/lib/export/` | ✅ 复用 XLSX 包装器 |
| 审计日志 | audit-log.ts | `src/lib/audit-log/` | ✅ 数据源直接复用 |
| 分析服务 | analytics-service.ts | `src/app/api/analytics/` | ✅ API 可复用 |
| 权限控制 | RBAC | `src/lib/auth/` | ✅ 复用权限系统 |
| 状态管理 | Zustand | `src/stores/` | ✅ 报表状态复用 |

### 1.2 现有组件分析

**Recharts 使用示例** (`src/components/analytics/AnalyticsChart.tsx`):
- 支持图表类型: Line, Area, Bar, Pie, Radar, Scatter
- 自定义 Tooltip 和 Legend
- 响应式布局 (ResponsiveContainer)

**RealTimeCharts 组件** (`src/components/analytics/RealTimeCharts.tsx`):
- 支持实时数据更新
- Web Vitals 指标展示
- 多种图表类型切换

### 1.3 现有 API 基础设施

**数据分析 API** (`src/app/api/analytics/`):
- `GET /api/analytics/metrics` - 指标数据
- `GET /api/analytics/export` - 数据导出

**报表生成 API** (`src/app/api/reports/`):
- `POST /api/reports/generate` - AI 报表生成
- `POST /api/reports/custom` - 自定义报表

**WebSocket 服务器** (`src/lib/websocket/server.ts`):
- Socket.IO 基础设施
- Room 管理器
- 权限管理器
- 消息存储

---

## 2. 系统架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端层 (Next.js 15)                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  报表设计器   │  │   报表查看    │  │     实时数据看板     │  │
│  │  (拖拽式)    │  │   (交互式)   │  │   (WebSocket)       │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                        组件层                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  图表组件    │  │   表格组件    │  │     筛选器组件       │  │
│  │  Recharts   │  │   DataGrid   │  │   MultiFilter       │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                      API 层 (Next.js Route Handlers)             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  /api/reports │  │ /api/report- │  │  /api/report-data   │  │
│  │  (CRUD)      │  │  templates   │  │  (查询/聚合)        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                      服务层                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ ReportEngine │  │ DataAggregator│  │  ExportService      │  │
│  │ 报表引擎     │  │  数据聚合器   │  │   导出服务           │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                      数据层                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   SQLite     │  │  Redis Cache  │  │   审计日志数据       │  │
│  │ (报表定义)   │  │  (查询缓存)   │  │   (analytics)       │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 模块职责

| 模块 | 职责 | 核心文件 |
|------|------|----------|
| `report-engine` | 报表渲染、布局计算、定时任务 | `src/lib/reports/engine.ts` |
| `data-aggregator` | 多数据源查询、聚合计算 | `src/lib/reports/data-aggregator.ts` |
| `export-service` | PDF/Excel/CSV/PNG 导出 | `src/lib/reports/export-service.ts` |
| `realtime-broker` | WebSocket 实时数据推送 | `src/lib/reports/realtime-broker.ts` |
| `designer-store` | 报表设计器状态管理 | `src/stores/report-designer.ts` |
| `viewer-store` | 报表查看器状态管理 | `src/stores/report-viewer.ts` |

---

## 3. 数据模型设计

### 3.1 报表定义模型

```typescript
// src/lib/reports/types/report.ts

/**
 * 报表定义
 */
export interface ReportDefinition {
  id: string
  name: string
  description?: string
  version: number
  status: ReportStatus
  
  // 布局配置
  layout: ReportLayout
  
  // 数据配置
  dataSource: DataSourceConfig
  refreshInterval?: number // 秒，0 表示不自动刷新
  
  // 权限配置
  permissions: ReportPermissions
  
  // 元数据
  createdBy: string
  createdAt: Date
  updatedAt: Date
  tags?: string[]
}

export type ReportStatus = 'draft' | 'published' | 'archived'

/**
 * 报表布局
 */
export interface ReportLayout {
  width: number // 像素
  height?: number // 可选，高度自适应
  columns: number // 网格列数，默认 12
  gap: number // 组件间距
  components: ReportComponent[]
}

/**
 * 报表组件
 */
export interface ReportComponent {
  id: string
  type: ComponentType
  title?: string
  
  // 位置 (基于网格)
  grid: {
    x: number // 列起始
    y: number // 行起始
    w: number // 宽度 (列数)
    h: number // 高度 (行数)
  }
  
  // 数据绑定
  dataBinding: DataBindingConfig
  
  // 图表配置 (仅图表组件)
  chartConfig?: ChartConfig
  
  // 样式覆盖
  style?: ComponentStyleOverrides
  
  // 交互配置
  interactions?: ComponentInteractionConfig
}

export type ComponentType = 
  | 'chart'      // 图表
  | 'table'      // 数据表格
  | 'metric'     // 指标卡
  | 'text'       // 文本
  | 'image'      // 图片
  | 'divider'    // 分隔线
  | 'filter'     // 筛选器

/**
 * 数据源配置
 */
export interface DataSourceConfig {
  type: 'audit_logs' | 'metrics' | 'custom' | 'api'
  query?: DataQueryConfig
  apiEndpoint?: string
  transform?: DataTransformConfig
}

/**
 * 数据查询配置
 */
export interface DataQueryConfig {
  // 时间范围
  timeRange: TimeRange | { start: string; end: string }
  
  // 维度
  dimensions?: string[]
  
  // 指标
  metrics: string[]
  
  // 过滤条件
  filters?: FilterCondition[]
  
  // 排序
  orderBy?: { field: string; direction: 'asc' | 'desc' }[]
  
  // 分页
  limit?: number
  offset?: number
}

/**
 * 图表配置
 */
export interface ChartConfig {
  type: ChartType
  colors?: string[]
  
  // 坐标轴配置
  xAxis?: AxisConfig
  yAxis?: AxisConfig
  
  // 系列配置
  series?: SeriesConfig[]
  
  // 标题和图例
  legend?: LegendConfig
  
  // 提示框
  tooltip?: TooltipConfig
  
  // 其他选项
  options?: Record<string, unknown>
}

export type ChartType = 
  | 'line'      // 折线图
  | 'area'      // 面积图
  | 'bar'       // 柱状图
  | 'stackedBar' // 堆叠柱状图
  | 'pie'       // 饼图
  | 'donut'     // 环形图
  | 'scatter'   // 散点图
  | 'heatmap'   // 热力图
  | 'radar'     // 雷达图
  | 'gauge'     // 仪表盘
  | 'funnel'    // 漏斗图
  | 'treemap'   // 树图
  | 'gantt'     // 甘特图

/**
 * 权限配置
 */
export interface ReportPermissions {
  owner: string // 用户 ID
  access: 'private' | 'organization' | 'public'
  allowedUsers?: string[]
  allowedRoles?: string[]
  allowedOrganizations?: string[]
}
```

### 3.2 图表配置模型

```typescript
// src/lib/reports/types/chart.ts

export interface AxisConfig {
  show?: boolean
  label?: string
  min?: number
  max?: number
  tickCount?: number
  format?: string | ((value: number) => string)
}

export interface SeriesConfig {
  field: string
  label?: string
  color?: string
  type?: 'line' | 'bar' | 'area' | 'scatter'
  yAxisIndex?: number // 多轴支持
}

export interface LegendConfig {
  show?: boolean
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export interface TooltipConfig {
  show?: boolean
  format?: string | ((value: unknown) => string)
}
```

### 3.3 数据库 Schema

```sql
-- 报表定义表
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft',
  
  -- JSON 存储复杂配置
  layout TEXT NOT NULL, -- ReportLayout JSON
  data_source TEXT NOT NULL, -- DataSourceConfig JSON
  permissions TEXT NOT NULL, -- ReportPermissions JSON
  
  -- 标签
  tags TEXT, -- JSON array
  
  -- 审计字段
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- 软删除
  deleted_at DATETIME
);

-- 报表版本历史
CREATE TABLE report_versions (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  layout TEXT NOT NULL,
  data_source TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (report_id) REFERENCES reports(id)
);

-- 报表模板
CREATE TABLE report_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  thumbnail TEXT, -- URL 或 base64
  layout TEXT NOT NULL,
  data_source TEXT NOT NULL,
  
  -- 是否系统内置
  is_system INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 报表分享
CREATE TABLE report_shares (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  access_level TEXT DEFAULT 'view', -- view | edit
  expires_at DATETIME,
  
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (report_id) REFERENCES reports(id)
);

-- 索引
CREATE INDEX idx_reports_created_by ON reports(created_by);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_tags ON reports(tags);
CREATE INDEX idx_report_versions_report_id ON report_versions(report_id);
CREATE INDEX idx_report_shares_token ON report_shares(token);
```

---

## 4. API 设计

### 4.1 报表 CRUD API

```
/api/reports                    # 报表列表 (GET)
/api/reports                    # 创建报表 (POST)
/api/reports/[id]               # 获取/更新/删除报表 (GET/PUT/DELETE)
/api/reports/[id]/publish       # 发布报表 (POST)
/api/reports/[id]/duplicate     # 复制报表 (POST)
/api/reports/[id]/versions      # 版本历史 (GET)
/api/reports/[id]/restore/[v]   # 恢复版本 (POST)
```

### 4.2 报表数据 API

```
/api/report-data                # 查询报表数据 (POST)
/api/report-data/export         # 导出报表数据 (POST)
/api/report-data/realtime       # WebSocket 升级端点
```

### 4.3 报表模板 API

```
/api/report-templates           # 模板列表 (GET)
/api/report-templates/[id]      # 获取模板 (GET)
```

### 4.4 API 详细设计

#### 4.4.1 获取报表

```
GET /api/reports/[id]
```

**Response**:
```json
{
  "id": "rpt_xxxxx",
  "name": "月度销售报表",
  "description": "展示月度销售数据",
  "version": 3,
  "status": "published",
  "layout": {
    "width": 1920,
    "columns": 12,
    "gap": 16,
    "components": [...]
  },
  "dataSource": {...},
  "permissions": {...},
  "createdBy": "user_xxxxx",
  "createdAt": "2026-04-01T00:00:00Z",
  "updatedAt": "2026-04-05T00:00:00Z",
  "tags": ["sales", "monthly"]
}
```

#### 4.4.2 查询报表数据

```
POST /api/report-data
```

**Request**:
```json
{
  "reportId": "rpt_xxxxx",
  "timeRange": {
    "start": "2026-03-01",
    "end": "2026-03-31"
  },
  "filters": [
    { "field": "category", "operator": "eq", "value": "sales" }
  ],
  "refresh": true
}
```

**Response**:
```json
{
  "data": [...],
  "metadata": {
    "total": 1000,
    "aggregations": {...},
    "executionTime": 45
  },
  "timestamp": "2026-04-06T00:00:00Z"
}
```

#### 4.4.3 导出报表

```
POST /api/report-data/export
```

**Request**:
```json
{
  "reportId": "rpt_xxxxx",
  "format": "pdf",
  "options": {
    "pageSize": "A4",
    "orientation": "landscape",
    "includeRawData": true
  }
}
```

---

## 5. 前端组件架构

### 5.1 组件结构

```
src/
├── components/
│   └── reports/
│       ├── ReportDesigner.tsx        # 报表设计器主组件
│       ├── ReportViewer.tsx           # 报表查看器
│       ├── ReportDashboard.tsx        # 报表仪表盘
│       │
│       ├── designer/
│       │   ├── DesignerCanvas.tsx     # 设计画布
│       │   ├── ComponentPalette.tsx   # 组件面板
│       │   ├── PropertyPanel.tsx      # 属性面板
│       │   ├── LayerPanel.tsx         # 图层面板
│       │   └── Toolbar.tsx            # 设计工具栏
│       │
│       ├── charts/
│       │   ├── ChartRenderer.tsx      # 图表渲染器
│       │   ├── LineChart.tsx          # 折线图
│       │   ├── BarChart.tsx           # 柱状图
│       │   ├── PieChart.tsx           # 饼图
│       │   ├── GaugeChart.tsx        # 仪表盘
│       │   └── ...
│       │
│       ├── widgets/
│       │   ├── MetricCard.tsx         # 指标卡
│       │   ├── DataTable.tsx          # 数据表格
│       │   ├── FilterBar.tsx          # 筛选栏
│       │   └── TextBlock.tsx          # 文本块
│       │
│       └── shared/
│           ├── DataProvider.tsx       # 数据提供器
│           ├── ExportButton.tsx       # 导出按钮
│           └── ShareDialog.tsx        # 分享对话框
│
├── stores/
│   ├── report-designer.ts             # 设计器状态
│   ├── report-viewer.ts               # 查看器状态
│   └── report-list.ts                 # 报表列表状态
│
├── hooks/
│   ├── useReportData.ts               # 报表数据获取
│   ├── useRealtimeData.ts             # 实时数据订阅
│   └── useReportExport.ts             # 导出功能
│
└── lib/
    └── reports/
        ├── engine.ts                  # 报表引擎
        ├── data-aggregator.ts         # 数据聚合
        ├── export-service.ts          # 导出服务
        └── types/
            ├── report.ts
            ├── chart.ts
            └── data-source.ts
```

### 5.2 报表设计器

基于 @dnd-kit 实现拖拽式报表设计：

```typescript
// 设计器状态 (Zustand)
interface ReportDesignerState {
  // 当前报表
  report: ReportDefinition | null
  
  // 选择状态
  selectedComponentId: string | null
  
  // 操作历史 (撤销/重做)
  history: ReportSnapshot[]
  historyIndex: number
  
  // UI 状态
  isSaving: boolean
  isDirty: boolean
  
  // 方法
  addComponent: (type: ComponentType, position: GridPosition) => void
  updateComponent: (id: string, updates: Partial<ReportComponent>) => void
  deleteComponent: (id: string) => void
  moveComponent: (id: string, newPosition: GridPosition) => void
  selectComponent: (id: string | null) => void
  undo: () => void
  redo: () => void
  save: () => Promise<void>
}
```

### 5.3 图表组件

复用现有 Recharts 组件，扩展更多图表类型：

```typescript
// ChartRenderer - 统一图表渲染入口
interface ChartRendererProps {
  config: ChartConfig
  data: Record<string, unknown>[]
  width?: number | string
  height?: number
}

function ChartRenderer({ config, data, width = '100%', height = 300 }: ChartRendererProps) {
  const ChartComponent = chartTypeToComponent[config.type]
  
  return (
    <ResponsiveContainer width={width} height={height}>
      <ChartComponent data={data} config={config} />
    </ResponsiveContainer>
  )
}
```

### 5.4 实时数据集成

复用现有 WebSocket 基础设施实现实时数据更新：

```typescript
// useRealtimeData hook
function useRealtimeData(reportId: string, refreshInterval: number) {
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [isConnected, setIsConnected] = useState(false)
  
  useEffect(() => {
    // 复用现有 WebSocket 基础设施
    const socket = getSocket()
    
    // 订阅报表数据更新
    socket.emit('subscribe:report', { reportId })
    
    socket.on(`report:data:${reportId}`, (newData) => {
      setData(newData)
    })
    
    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))
    
    // 定时刷新 (如果 WebSocket 不可用)
    const interval = setInterval(() => {
      fetchReportData(reportId)
    }, refreshInterval * 1000)
    
    return () => {
      socket.emit('unsubscribe:report', { reportId })
      clearInterval(interval)
    }
  }, [reportId, refreshInterval])
  
  return { data, isConnected }
}
```

---

## 6. WebSocket 实时数据

### 6.1 事件设计

```typescript
// 客户端 → 服务器
interface ClientEvents {
  'report:subscribe': { reportId: string }
  'report:unsubscribe': { reportId: string }
  'report:refresh': { reportId: string }
}

// 服务器 → 客户端
interface ServerEvents {
  'report:data': { reportId: string; data: unknown[]; timestamp: string }
  'report:error': { reportId: string; error: string }
  'report:heartbeat': { timestamp: string }
}
```

### 6.2 集成点

复用 `src/lib/websocket/server.ts` 的 RoomManager 实现按报表 ID 隔离订阅：

```typescript
// 在 WebSocket server 中添加报表房间
function setupReportHandlers(io: SocketIOServer) {
  const reportNamespace = io.of('/reports')
  
  reportNamespace.on('connection', (socket) => {
    const reportId = socket.handshake.query.reportId as string
    
    // 加入报表房间
    socket.join(`report:${reportId}`)
    
    socket.on('report:subscribe', ({ reportId }) => {
      socket.join(`report:${reportId}`)
    })
    
    socket.on('report:unsubscribe', ({ reportId }) => {
      socket.leave(`report:${reportId}`)
    })
  })
}
```

---

## 7. 导出功能

### 7.1 导出格式

| 格式 | 库 | 状态 |
|------|-----|------|
| CSV | 原生实现 | ✅ 现有 |
| Excel (.xlsx) | XLSX (SheetJS) | ✅ 现有 (via xlsx-wrapper) |
| PDF | PDFKit | 🔄 需实现 |
| PNG | html2canvas | 🔄 需实现 |
| JSON | 原生实现 | ✅ 现有 |

### 7.2 PDF 导出

```typescript
// src/lib/reports/export/pdf-exporter.ts
import PDFDocument from 'pdfkit'

export async function exportToPDF(
  report: ReportDefinition,
  data: Record<string, unknown>[],
  options: PDFExportOptions = {}
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: options.pageSize || 'A4',
      layout: options.orientation || 'portrait',
      margins: { top: 40, bottom: 40, left: 40, right: 40 }
    })
    
    const chunks: Buffer[] = []
    doc.on('data', chunk => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    
    // 标题
    doc.fontSize(24).text(report.name, { align: 'center' })
    doc.moveDown()
    
    // 图表渲染 (需要先转为图片)
    for (const component of report.layout.components) {
      if (component.type === 'chart') {
        const chartImage = await renderChartToImage(component, data)
        doc.image(chartImage, { fit: [500, 300], align: 'center' })
        doc.moveDown()
      }
    }
    
    // 页脚
    doc.fontSize(10)
      .fillColor('#666666')
      .text(
        `Generated at ${new Date().toISOString()}`,
        0,
        doc.page.height - 40,
        { align: 'center' }
      )
    
    doc.end()
  })
}
```

### 7.3 图表图片导出

```typescript
// src/lib/reports/export/chart-image-exporter.ts
import html2canvas from 'html2canvas'

export async function renderChartToImage(
  component: ReportComponent,
  data: Record<string, unknown>[]
): Promise<Buffer> {
  const container = document.createElement('div')
  container.style.width = '600px'
  container.style.height = '400px'
  document.body.appendChild(container)
  
  // 渲染图表到临时容器
  const chartElement = renderChart(component, data)
  container.appendChild(chartElement)
  
  const canvas = await html2canvas(container, {
    backgroundColor: '#ffffff',
    scale: 2
  })
  
  document.body.removeChild(container)
  
  return canvas.toBuffer('image/png')
}
```

---

## 8. 性能优化

### 8.1 缓存策略

复用现有 MultiLevelCache 三级缓存：

```typescript
// 报表数据缓存
const reportDataCache = new MultiLevelCache({
  name: 'report-data',
  levels: [
    new LRUCache({ maxSize: 1000, ttl: 60 * 1000 }), // L1: 1分钟
    new RedisCache({ ttl: 5 * 60 * 1000 }),           // L2: 5分钟
    new DBQueryCache({ ttl: 60 * 60 * 1000 })         // L3: 1小时
  ],
  keyGenerator: (reportId, filters) => 
    `report:${reportId}:${hash(filters)}`
})
```

### 8.2 数据查询优化

- 预计算常用聚合指标
- 物化视图用于高频报表
- 查询结果压缩传输 (gzip)

### 8.3 前端优化

- 图表懒加载 (dynamic import)
- 虚拟滚动 (react-window) 用于大数据表格
- 骨架屏占位
- 请求去重和防抖

---

## 9. 实施计划

### 9.1 阶段划分

| 阶段 | 周 | 内容 | 工作量 |
|------|-----|------|--------|
| **阶段 1: 基础框架** | Week 5 | 目录结构、类型定义、数据库迁移、基础 API | 8 人天 |
| **阶段 2: 核心组件** | Week 6 | 图表组件、表格组件、指标卡、筛选器 | 8 人天 |
| **阶段 3: 设计器** | Week 7 | 拖拽设计器、属性面板、布局引擎 | 8 人天 |
| **阶段 4: 实时 & 导出** | Week 8 | WebSocket 集成、PDF/PNG 导出 | 5 人天 |
| **阶段 5: 完善 & 测试** | Week 9 | 模板系统、权限控制、单元测试、集成测试 | 3 人天 |

### 9.2 目录结构

```
src/
├── app/
│   └── api/
│       ├── reports/
│       │   ├── route.ts                    # 列表
│       │   └── [id]/
│       │       ├── route.ts                # CRUD
│       │       ├── publish/route.ts
│       │       ├── duplicate/route.ts
│       │       └── versions/route.ts
│       ├── report-data/
│       │   ├── route.ts                    # 数据查询
│       │   └── export/route.ts             # 导出
│       └── report-templates/
│           └── route.ts                    # 模板
│
├── components/
│   └── reports/
│       ├── ReportDesigner.tsx
│       ├── ReportViewer.tsx
│       ├── ReportDashboard.tsx
│       ├── designer/
│       ├── charts/
│       ├── widgets/
│       └── shared/
│
├── lib/
│   └── reports/
│       ├── engine.ts
│       ├── data-aggregator.ts
│       ├── export-service.ts
│       ├── realtime-broker.ts
│       └── types/
│
├── stores/
│   ├── report-designer.ts
│   └── report-viewer.ts
│
└── hooks/
    ├── useReportData.ts
    ├── useRealtimeData.ts
    └── useReportExport.ts
```

---

## 10. 验收标准

| 功能 | 验收条件 |
|------|----------|
| 基础图表组件 | 支持 10+ 图表类型，渲染正确 |
| 报表查看页面 | 支持筛选、分页、交互 |
| 实时数据看板 | WebSocket 更新延迟 <1s |
| 数据聚合服务 | 支持多维度聚合，响应 <500ms |
| 图表导出 PNG | 导出清晰度 2x |
| PDF 导出 | 页眉页脚、图表完整 |
| 报表权限控制 | RBAC 集成，访问控制正确 |
| 拖拽式设计器 | 组件拖放流畅，属性编辑响应 |
| 报表模板 | 预置 5+ 模板，创建成功率 >99% |

---

**文档版本**: v1.0  
**最后更新**: 2026-04-06  
**维护者**: 🏗️ 架构师  
