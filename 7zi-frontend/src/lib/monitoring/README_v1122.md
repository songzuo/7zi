# Performance Monitoring System v1.12.2

完整的 Next.js 应用性能监控和告警系统 - 增强版。

## v1.12.2 新增功能 🎉

### ✅ 新增功能

#### 1. 增强版监控仪表板 (`EnhancedMonitoringDashboard`)

全新的增强版仪表板，提供更丰富的可视化界面：

- **实时监控标签页** - 实时显示性能指标和图表
- **告警配置标签页** - 图形化配置告警规则
- **历史数据标签页** - 查询和导出历史数据

#### 2. 轻量级性能图表组件 (`PerformanceChart`)

使用 SVG 绘制的轻量级图表组件，不依赖大型图表库：

- ✅ **零外部依赖** - 纯 SVG 实现，无 echarts/recharts 等大型库
- ✅ **响应式设计** - 自动适应容器宽度
- ✅ **交互式体验** - 鼠标悬停显示详细信息
- ✅ **阈值线** - 支持配置阈值线和阈值标签
- ✅ **面积图/折线图** - 可选择显示面积填充
- ✅ **网格线** - 可配置网格线显示

**使用示例:**

```tsx
import { PerformanceChart } from '@/components/monitoring'

const data = [
  { timestamp: Date.now() - 4000, value: 100 },
  { timestamp: Date.now() - 3000, value: 150 },
  { timestamp: Date.now() - 2000, value: 120 },
  { timestamp: Date.now() - 1000, value: 180 },
  { timestamp: Date.now(), value: 160 },
]

<PerformanceChart
  data={data}
  title="API Response Time"
  unit="ms"
  color="#3b82f6"
  threshold={5000}
  thresholdColor="#ef4444"
  thresholdLabel="5s Threshold"
/>
```

#### 3. 告警规则配置面板 (`AlarmConfigPanel`)

图形化配置告警规则和阈值：

- ✅ **多规则管理** - 支持添加、编辑、删除告警规则
- ✅ **阈值配置** - 配置每个指标的阈值
- ✅ **告警级别** - 支持 Low/Medium/High/Critical 四个级别
- ✅ **时间窗口** - 配置告警计算的时间窗口
- ✅ **启用/禁用** - 快速启用或禁用单个规则
- ✅ **最近告警** - 显示最近的告警事件

**支持的指标类型:**

- `errorRate` - 错误率阈值 (0-1)
- `responseTime` - 响应时间阈值 (ms)
- `operationDuration` - 操作时长阈值 (ms)

**使用示例:**

```tsx
import { AlarmConfigPanel } from '@/components/monitoring'

<AlarmConfigPanel />
```

#### 4. 历史数据查询面板 (`HistoryDataPanel`)

查询、分析和导出历史性能数据：

- ✅ **时间范围选择** - 15分钟到7天的灵活选择
- ✅ **指标类型过滤** - 按类型筛选数据
- ✅ **聚合统计** - 自动计算聚合指标
- ✅ **图表展示** - 多种图表类型可视化
- ✅ **数据导出** - 导出为 CSV 格式
- ✅ **原始数据表格** - 查看详细原始数据

**使用示例:**

```tsx
import { HistoryDataPanel } from '@/components/monitoring'

<HistoryDataPanel />
```

### ✅ 已有功能（保留）

#### 1. 基础性能监控

- **API 响应时间追踪** - 自动记录所有 API 请求的响应时间
- **错误率统计** - 实时计算 API 和操作的成功/失败率
- **用户操作延迟监控** - 追踪关键用户操作的执行时间
- **自定义指标** - 支持记录任何自定义性能指标

#### 2. 告警机制

- **错误率告警** - 当错误率超过阈值时自动告警
- **响应时间告警** - 当 API 平均响应时间超过阈值时告警
- **操作时间告警** - 当操作平均执行时间超过阈值时告警
- **告警级别** - Critical、High、Medium、Low

#### 3. 数据存储

- **内存存储** - 适合开发和测试，刷新后清空
- **LocalStorage 存储** - 适合长期监控，刷新后保留
- **可扩展接口** - 支持自定义存储后端

#### 4. 工具函数

- `monitoredFetch` - 包装 fetch 自动追踪
- `withPerformanceTracking` - 包装异步函数追踪
- `createPerformanceTracker` - 创建性能追踪器
- `trackReactError` - 追踪 React 错误边界错误
- `initBrowserTracking` - 初始化浏览器性能追踪

## 文件结构

```
src/
├── lib/monitoring/
│   ├── types.ts              # 类型定义
│   ├── config.ts             # 配置管理
│   ├── monitor.ts            # 核心监控类
│   ├── storage.ts            # 存储实现
│   ├── utils.ts              # 工具函数
│   ├── index.ts              # 模块入口
│   └── __tests__/
│       └── monitor.test.ts   # 测试文件
│
├── components/monitoring/
│   ├── index.ts                          # 组件导出
│   ├── PerformanceChart.tsx              # 轻量级图表组件 ⭐ 新增
│   ├── AlarmConfigPanel.tsx               # 告警配置面板 ⭐ 新增
│   ├── HistoryDataPanel.tsx              # 历史数据面板 ⭐ 新增
│   ├── EnhancedMonitoringDashboard.tsx    # 增强版仪表板 ⭐ 新增
│   └── __tests__/
│       ├── PerformanceChart.test.tsx     # 图表组件测试 ⭐ 新增
│       ├── AlarmConfigPanel.test.tsx      # 告警配置测试 ⭐ 新增
│       └── HistoryDataPanel.test.tsx     # 历史数据测试 ⭐ 新增
│
└── components/performance/
    ├── PerformanceDashboard.tsx           # Web Vitals 仪表板（保留）
    └── SmartPrefetch.tsx                  # 智能预取（保留）
```

## 快速开始

### 1. 使用增强版仪表板

```tsx
import { EnhancedMonitoringDashboard } from '@/components/monitoring'

export default function MonitoringPage() {
  return (
    <div>
      <EnhancedMonitoringDashboard />
    </div>
  )
}
```

### 2. 使用单独的组件

```tsx
import {
  PerformanceChart,
  AlarmConfigPanel,
  HistoryDataPanel,
} from '@/components/monitoring'

export default function CustomMonitoringPage() {
  return (
    <div className="space-y-6">
      {/* 实时图表 */}
      <PerformanceChart
        data={chartData}
        title="API Response Time"
        unit="ms"
        threshold={5000}
      />

      {/* 告警配置 */}
      <AlarmConfigPanel />

      {/* 历史数据 */}
      <HistoryDataPanel />
    </div>
  )
}
```

### 3. 监控 API 请求

```typescript
import { monitoredFetch } from '@/lib/monitoring'

const response = await monitoredFetch('/api/users', {
  method: 'GET',
  metadata: { operation: 'load_users' },
})
```

### 4. 监控异步操作

```typescript
import { withPerformanceTracking } from '@/lib/monitoring'

const result = await withPerformanceTracking('process_data', async () => {
  return await processData()
})
```

## 组件 Props 参考

### PerformanceChartProps

```typescript
interface PerformanceChartProps {
  data: ChartDataPoint[]        // 图表数据点
  title: string                 // 图表标题
  unit?: string                 // 数值单位
  color?: string               // 线条颜色
  height?: number              // 图表高度（默认 200）
  showGrid?: boolean           // 显示网格（默认 true）
  showArea?: boolean           // 显示面积（默认 true）
  minY?: number                // Y轴最小值
  maxY?: number                // Y轴最大值
  threshold?: number           // 阈值
  thresholdColor?: string     // 阈值线颜色
  thresholdLabel?: string      // 阈值标签
}
```

### AlarmRule

```typescript
interface AlarmRule {
  id: string                          // 规则 ID
  name: string                        // 规则名称
  metric: 'errorRate' | 'responseTime' | 'operationDuration'
  threshold: number                  // 阈值
  windowMs: number                    // 时间窗口
  enabled: boolean                    // 是否启用
  severity: 'low' | 'medium' | 'high' | 'critical'
  description?: string               // 描述
}
```

## 配置

监控会根据环境自动调整配置：

### 开发环境 (default)

- 采样率: 100%
- 错误率阈值: 10%
- 响应时间阈值: 5000ms
- 操作时间阈值: 10000ms

### 生产环境

- 采样率: 10%
- 错误率阈值: 2%
- 响应时间阈值: 1000ms
- 操作时间阈值: 2000ms

可在 `src/lib/monitoring/config.ts` 中自定义配置，或通过 `AlarmConfigPanel` 图形化配置。

## 测试

运行所有监控组件测试：

```bash
cd 7zi-frontend
npm test -- src/components/monitoring/__tests__/
```

运行特定组件测试：

```bash
npm test -- src/components/monitoring/__tests__/PerformanceChart.test.tsx
npm test -- src/components/monitoring/__tests__/AlarmConfigPanel.test.tsx
npm test -- src/components/monitoring/__tests__/HistoryDataPanel.test.tsx
```

## 性能影响

### 轻量级图表组件

- **包大小:** ~8KB (gzipped)
- **CPU 开销:** < 0.5% (渲染时)
- **内存开销:** 每个图表约 1-2KB
- **无外部依赖** - 纯 SVG 实现

### 监控系统

- CPU 开销: < 1%
- 内存开销: 每个指标约 200-500 字节
- 可通过采样率进一步降低

## 技术特性

### 不使用大型图表库

传统方案使用 echarts、recharts 等库：
- ❌ 包体积大 (100KB+ gzipped)
- ❌ 加载时间长
- ❌ 复杂度高

本方案使用纯 SVG：
- ✅ 包体积小 (~8KB)
- ✅ 加载快
- ✅ 简单可维护
- ✅ 完全可控

### TypeScript 严格模式

所有组件遵循 TypeScript 严格模式：
- 完整的类型定义
- 无 `any` 类型
- 严格的类型检查

## 迁移指南

从旧版仪表板升级到增强版：

### 1. 替换组件

```tsx
// 旧版
import { PerformanceDashboard } from '@/components/performance/PerformanceDashboard'

// 新版
import { EnhancedMonitoringDashboard } from '@/components/monitoring'
```

### 2. 保留旧版组件

如果需要保留 Web Vitals 仪表板：

```tsx
import { PerformanceDashboard } from '@/components/performance/PerformanceDashboard'
import { EnhancedMonitoringDashboard } from '@/components/monitoring'

// 可以同时使用
```

## 示例页面

访问以下页面查看所有功能的实际演示：

- `/monitoring` - 增强版监控仪表板
- `/monitoring-example` - 基础监控示例

## 文档

详细文档请参阅：

- [MONITORING_SETUP.md](../MONITORING_SETUP.md) - 监控系统设置指南
- [PERFORMANCE_DASHBOARD_GUIDE.md](../docs/PERFORMANCE_DASHBOARD_GUIDE.md) - 仪表板使用指南

## 技术栈

- TypeScript (严格模式)
- Next.js 16+
- React 19+
- Lucide React (图标)
- Vitest (测试)
- 纯 SVG 图表 (无外部图表库)

## 版本历史

### v1.12.2 (2026-04-04) - 增强版仪表板

**新增功能:**
- ✨ 增强版监控仪表板 (`EnhancedMonitoringDashboard`)
- ✨ 轻量级 SVG 图表组件 (`PerformanceChart`)
- ✨ 告警规则配置面板 (`AlarmConfigPanel`)
- ✨ 历史数据查询面板 (`HistoryDataPanel`)
- ✨ 完整的单元测试覆盖

**改进:**
- 📈 更丰富的数据可视化
- 🔧 图形化告警配置
- 📊 历史数据查询和导出
- ⚡ 零大型图表库依赖

### v1.12.1 (2026-04-02) - 基础监控

**初始版本:**
- ✨ 基础性能监控系统
- ✨ 简单仪表板组件
- ✨ 告警机制
- ✨ 数据存储

---

**最后更新:** 2026-04-04
**维护者:** 7zi Team
**许可证:** MIT
