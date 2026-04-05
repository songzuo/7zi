# Dashboard Feature

数据可视化仪表板功能模块，用于展示工作流执行统计、用户活动、性能指标等实时数据。

## 功能特性

- 📊 **实时数据展示** - 支持工作流、用户活动、性能、系统等多维度指标
- 📈 **多种图表类型** - 折线图、柱状图、面积图
- ⏱️ **时间范围选择** - 1小时、6小时、24小时、7天、30天
- 🔄 **自动刷新** - 可配置的自动刷新间隔
- 📱 **响应式布局** - 适配桌面、平板、移动设备
- 🎨 **美观的 UI** - 支持深色模式
- 🧪 **完整测试** - 单元测试和集成测试

## 目录结构

```
src/features/dashboard/
├── components/           # React 组件
│   ├── Dashboard.tsx    # 主仪表板组件
│   ├── StatCard.tsx     # 统计卡片组件
│   ├── MetricChart.tsx  # 指标图表组件
│   └── TimeRangeSelector.tsx  # 时间范围选择器
├── services/            # API 服务
│   └── dashboard-api.ts # 仪表板 API 服务
├── types/               # TypeScript 类型定义
│   └── dashboard.ts     # 仪表板类型定义
├── utils/               # 工具函数
│   └── format.ts        # 格式化工具函数
└── __tests__/           # 测试文件
    ├── Dashboard.test.tsx
    ├── dashboard-api.test.ts
    └── format.test.ts
```

## 快速开始

### 1. 安装依赖

```bash
npm install recharts date-fns
```

### 2. 配置环境变量

在 `.env.local` 中添加：

```env
NEXT_PUBLIC_MONITORING_API_URL=http://localhost:8080
NEXT_PUBLIC_MONITORING_API_KEY=your-api-key
```

### 3. 使用仪表板

```tsx
import { Dashboard } from '@/features/dashboard/components/Dashboard';

export default function DashboardPage() {
  return <Dashboard />;
}
```

## 组件使用

### Dashboard

主仪表板组件，展示所有统计卡片和图表。

```tsx
import { Dashboard } from '@/features/dashboard/components/Dashboard';

<Dashboard />
```

### StatCard

统计卡片组件，显示单个指标的当前值和趋势。

```tsx
import { StatCard } from '@/features/dashboard/components/StatCard';

<StatCard
  title="活跃用户数"
  value={1234}
  unit="users"
  change={12.5}
  changeType="increase"
  trend={[{ timestamp: 1234567890, value: 1000 }, ...]}
  category="user"
/>
```

### MetricChart

指标图表组件，支持折线图、柱状图、面积图。

```tsx
import { MetricChart } from '@/features/dashboard/components/MetricChart';

<MetricChart
  data={aggregatedData}
  metricDefinition={metricDef}
  config={{
    metricName: 'system.cpu_usage',
    chartType: 'line',
    aggregation: 'avg',
    height: 300,
    width: 6,
  }}
/>
```

### TimeRangeSelector

时间范围选择器组件。

```tsx
import { TimeRangeSelector } from '@/features/dashboard/components/TimeRangeSelector';

<TimeRangeSelector
  value="24h"
  onChange={(timeRange) => console.log(timeRange)}
/>
```

## API 服务

### DashboardApiService

仪表板 API 服务类，提供数据查询接口。

```typescript
import { dashboardApi } from '@/features/dashboard/services/dashboard-api';

// 获取聚合指标数据
const data = await dashboardApi.getAggregatedMetrics(
  'system.cpu_usage',
  '24h'
);

// 获取工作流统计
const stats = await dashboardApi.getWorkflowStats('24h');

// 获取用户活动统计
const userStats = await dashboardApi.getUserActivityStats('24h');

// 获取性能统计
const perfStats = await dashboardApi.getPerformanceStats('24h');

// 获取系统统计
const sysStats = await dashboardApi.getSystemStats('24h');
```

## 数据模型

### 指标定义

```typescript
interface MetricDefinition {
  name: string;           // 指标名称
  displayName: string;    // 显示名称
  type: 'gauge' | 'counter' | 'histogram';  // 指标类型
  unit: string;           // 单位
  category: MetricCategory;  // 分类
  description: string;    // 描述
  aggregation: string;    // 聚合方式
}
```

### 预定义指标

- **系统指标**: CPU 使用率、内存使用率、磁盘使用率、网络流量
- **应用指标**: 响应时间、吞吐量、错误率
- **业务指标**: 订单数、收入
- **工作流指标**: 执行总数、成功数、失败数、平均时长
- **用户活动指标**: 活跃用户数、新用户数、会话数
- **性能指标**: P50/P90/P99 延迟

### 时间范围

```typescript
type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d' | 'custom';
```

## 工具函数

### formatNumber

格式化数字。

```typescript
formatNumber(1234.5678); // "1,234.57"
formatNumber(1234567, { compact: true }); // "1M"
```

### formatBytes

格式化字节数。

```typescript
formatBytes(1024); // "1.00 KB"
formatBytes(1024 * 1024); // "1.00 MB"
```

### formatDuration

格式化持续时间。

```typescript
formatDuration(90); // "1m 30s"
formatDuration(3660); // "1h 1m"
```

### calculateChangeRate

计算变化率。

```typescript
const result = calculateChangeRate(150, 100);
// { value: 50, type: 'increase' }
```

## 自定义配置

### 修改仪表板配置

编辑 `src/features/dashboard/types/dashboard.ts` 中的 `DEFAULT_DASHBOARD`：

```typescript
export const DEFAULT_DASHBOARD: DashboardConfig = {
  id: 'default',
  name: '默认仪表板',
  description: '系统概览仪表板',
  metrics: [...],
  timeRange: '24h',
  refreshInterval: 60,
  layout: {
    stats: [...],
    charts: [...],
  },
};
```

### 添加新指标

1. 在 `METRIC_DEFINITIONS` 中添加指标定义：

```typescript
'custom.metric_name': {
  name: 'custom.metric_name',
  displayName: '自定义指标',
  type: 'gauge',
  unit: '%',
  category: 'business',
  description: '自定义指标描述',
  aggregation: 'avg',
},
```

2. 在仪表板配置中引用该指标。

## 测试

运行测试：

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test dashboard-api.test.ts

# 运行测试并生成覆盖率报告
npm run test:coverage
```

## 样式定制

仪表板使用 Tailwind CSS，可以通过修改组件中的 className 来自定义样式。

### 深色模式

仪表板自动支持深色模式，使用 `dark:` 前缀的类名。

```tsx
<div className="bg-white dark:bg-gray-800">
  <h1 className="text-gray-900 dark:text-white">
    标题
  </h1>
</div>
```

## 性能优化

- 使用 `useMemo` 缓存计算结果
- 使用 `useCallback` 缓存回调函数
- 图表数据按需加载
- 自动刷新可配置

## 浏览器支持

- Chrome (最新版)
- Firefox (最新版)
- Safari (最新版)
- Edge (最新版)

## 许可证

MIT