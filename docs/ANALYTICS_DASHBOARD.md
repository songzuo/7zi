# 7zi Project - 仪表盘数据分析功能

## 📊 项目概述

完整的仪表盘数据分析功能，为 7zi AI 团队管理平台提供实时数据可视化、KPI 监控、数据筛选和导出功能。

## ✨ 功能特性

### 1. 数据分析模型和 API

#### 数据模型 (`src/lib/types/analytics.ts`)
- `AnalyticsMetrics` - 核心指标集合
  - `AgentMetrics` - AI 代理指标（总数、活跃、空闲、离线、工作时长、完成任务、Token使用、按提供商分类）
  - `UserMetrics` - 用户指标（总数、今日活跃、本周活跃、新用户、留存率、平均会话时长）
  - `TaskMetrics` - 任务指标（总数、完成、进行中、待处理、取消、完成率、平均完成时间、按优先级/类型分类）
  - `RevenueMetrics` - 收入指标（总数、月/周/日、增长率、按来源分类、转化率）
  - `PerformanceMetrics` - 性能指标（CPU/内存使用、响应时间、正常运行时间、错误率、吞吐量、缓存命中率）

#### API 端点
- `GET /api/analytics/metrics` - 获取分析指标（支持查询参数）
- `POST /api/analytics/metrics` - 使用自定义过滤器获取指标
- `GET /api/analytics/export` - 获取导出选项
- `POST /api/analytics/export` - 导出数据（CSV/Excel/JSON）

### 2. 数据可视化图表

#### Chart.js 版本 (`AnalyticsChartChartJS`)
支持 6 种图表类型：
- **折线图** (Line) - 趋势分析
- **面积图** (Area) - 堆叠趋势
- **柱状图** (Bar) - 分类对比
- **饼图** (Pie) - 占比分析
- **环形图** (Donut) - 占比分析（中心可显示）
- **雷达图** (Radar) - 多维对比

**特性：**
- 响应式设计
- 暗色模式支持
- 自定义 Tooltip 和 Legend
- 平滑动画
- 交互式图表

#### Recharts 版本 (`AnalyticsChart`)
作为 Chart.js 的替代方案，提供相同的功能集。

### 3. KPI 卡片组件 (`MetricCard` / `StatsCard`)

**功能：**
- 显示关键业务指标
- 趋势指示器（增长/下降/稳定）
- 多种格式支持：
  - `number` - 数字格式化（千分位）
  - `currency` - 货币格式化
  - `percentage` - 百分比
  - `bytes` - 字节单位（B/KB/MB/GB/TB）
  - `duration` - 时长格式化（小时/分钟/秒）
- 加载状态
- 点击回调
- 多种尺寸（sm/md/lg）
- 多种颜色主题（blue/green/purple/orange/pink/cyan/red）

### 4. 实时数据更新机制

**实现方式：**
- 自动刷新（可配置间隔，默认 30 秒）
- 手动刷新按钮
- WebSocket 支持（预留）
- 最后更新时间显示
- 加载状态管理

**特性：**
- 可开启/关闭自动刷新
- 防抖处理
- 错误重试机制
- 后台数据获取

### 5. 数据筛选和日期范围选择

#### DateRangePicker (`DateRangePicker`)
**预设时间范围：**
- 今天 (Today)
- 最近 7 天 (Last 7 Days)
- 最近 30 天 (Last 30 Days)
- 最近 90 天 (Last 90 Days)
- 最近 365 天 (Last 365 Days)
- 自定义 (Custom) - 支持日期选择器

#### FilterPanel (`FilterPanel`)
**可筛选维度：**
- 任务状态（已完成、进行中、待处理、已取消）
- 任务优先级（高、中、低）
- 任务类型（分析、实现、测试、设计）
- AI 提供商（MiniMax、Self-Claude、火山引擎、百炼）
- 指标选择（活跃代理、活跃用户、任务、Token使用、收入、错误）

**特性：**
- 折叠/展开面板
- 复选框选择
- 一键清除全部
- 实时应用筛选

### 6. 测试用例

#### 单元测试 (`src/components/analytics/__tests__/analytics.test.tsx`)
- `MetricCard` - 测试各种格式、趋势、颜色、尺寸
- `DateRangePicker` - 测试时间范围选择、自定义日期、中英文
- `FilterPanel` - 测试筛选功能、展开/折叠、清除
- `AnalyticsChart` - 测试图表类型、导出
- `AnalyticsChartChartJS` - 测试 Chart.js 版本

#### API 集成测试 (`src/app/api/analytics/__tests__/api.test.ts`)
- `/api/analytics/metrics` - GET/POST 端点测试
- `/api/analytics/export` - 导出功能测试（CSV/XLSX/JSON）
- 数据验证测试
- 错误处理测试

#### 集成测试 (`src/components/analytics/__tests__/integration.test.tsx`)
- 完整仪表盘功能测试
- 实时更新测试
- 导出功能测试
- 响应式设计测试

## 📦 组件架构

```
src/
├── app/
│   ├── [locale]/
│   │   ├── analytics/
│   │   │   ├── page.tsx                 # 分析页面
│   │   │   └── test/
│   │   │       └── page.tsx             # 测试页面
│   │   └── dashboard/
│   │       ├── DashboardClient.tsx      # 仪表盘客户端
│   │       ├── loading.tsx
│   │       └── error.tsx
│   └── api/
│       └── analytics/
│           ├── metrics/
│           │   └── route.ts            # 指标 API
│           ├── export/
│           │   └── route.ts            # 导出 API
│           └── __tests__/
│               └── api.test.ts          # API 测试
├── components/
│   ├── analytics/
│   │   ├── AnalyticsDashboard.tsx      # 主仪表盘组件
│   │   ├── AnalyticsChart.tsx          # Recharts 图表
│   │   ├── AnalyticsChartChartJS.tsx   # Chart.js 图表
│   │   ├── MetricCard.tsx              # 指标卡片
│   │   ├── StatsCard.tsx               # 统计卡片（复用）
│   │   ├── DateRangePicker.tsx         # 日期范围选择器
│   │   ├── FilterPanel.tsx             # 筛选面板
│   │   ├── index.ts                    # 组件导出
│   │   └── __tests__/
│   │       ├── analytics.test.tsx       # 单元测试
│   │       └── integration.test.tsx    # 集成测试
│   └── dashboard/
│       ├── ActivityChart.tsx           # 活动图表
│       ├── RevenueChart.tsx            # 收入图表
│       └── StatsCard.tsx               # 统计卡片
├── lib/
│   └── types/
│       ├── analytics/
│       │   └── index.ts                # 类型导出
│       └── analytics.ts                # 核心类型定义
```

## 🎨 使用示例

### 基础使用

```tsx
import { AnalyticsDashboard } from '@/components/analytics';

export default function AnalyticsPage() {
  return <AnalyticsDashboard locale="en" />;
}
```

### 自定义配置

```tsx
import { AnalyticsDashboard } from '@/components/analytics';

export default function CustomAnalyticsPage() {
  return (
    <AnalyticsDashboard
      locale="zh"
      defaultTimeRange="month"
      refreshInterval={60000}
      className="custom-dashboard"
    />
  );
}
```

### 使用单个组件

```tsx
import { MetricCard, DateRangePicker, FilterPanel, AnalyticsChartChartJS } from '@/components/analytics';
import { Activity } from 'lucide-react';

export default function CustomDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [filters, setFilters] = useState<AnalyticsFilters>({ timeRange });

  return (
    <div className="space-y-6">
      {/* KPI 卡片 */}
      <MetricCard
        statistic={{
          label: 'Active Users',
          value: 1234,
          format: 'number',
          change: { value: 12.5, period: 'last week', type: 'increase' }
        }}
        icon={Activity}
        color="blue"
      />

      {/* 日期范围选择器 */}
      <DateRangePicker
        selectedRange={timeRange}
        onChange={setTimeRange}
        locale="en"
      />

      {/* 筛选面板 */}
      <FilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        locale="en"
      />

      {/* 图表 */}
      <AnalyticsChartChartJS
        config={{
          type: 'line',
          title: 'Activity Overview',
          data: timeSeriesData,
          metrics: ['agents', 'users'],
          height: 350
        }}
      />
    </div>
  );
}
```

## 🧪 运行测试

```bash
# 运行所有测试
npm test

# 运行单元测试
npm test src/components/analytics/__tests__/analytics.test.tsx

# 运行集成测试
npm test src/components/analytics/__tests__/integration.test.tsx

# 运行 API 测试
npm test src/app/api/analytics/__tests__/api.test.ts

# 监视模式
npm test -- --watch

# 覆盖率报告
npm test -- --coverage
```

## 🚀 部署注意事项

### 环境变量
```env
# 可选：GitHub API 用于真实数据
NEXT_PUBLIC_GITHUB_OWNER=your-github-username
NEXT_PUBLIC_GITHUB_REPO=your-repo-name
NEXT_PUBLIC_GITHUB_TOKEN=your-personal-access-token

# 数据库连接（如需持久化数据）
DATABASE_URL=your-database-url
```

### 性能优化
1. **服务端渲染** - 数据在服务端获取，客户端只负责展示
2. **缓存策略** - API 响应缓存 60 秒，陈旧时重新验证
3. **懒加载** - 图表组件按需加载
4. **防抖** - 用户交互事件防抖处理
5. **数据分页** - 大数据集分页加载

### 监控建议
- 使用 Sentry 收集错误
- 使用 Vercel Analytics 监控性能
- 设置 Updown.io 或类似服务监控 API 健康状态

## 📈 扩展建议

### 短期扩展
1. **实时 WebSocket** - 推送实时数据更新
2. **更多图表类型** - 热力图、散点图、漏斗图
3. **数据对比** - 支持多时间段对比
4. **自定义布局** - 拖拽式仪表盘布局编辑器

### 长期扩展
1. **机器学习预测** - 基于历史数据预测趋势
2. **告警系统** - KPI 阈值告警（邮件/短信/Webhook）
3. **多租户支持** - 支持多组织数据分析
4. **数据源插件** - 支持多种外部数据源集成

## 📚 API 参考

### AnalyticsMetrics

```typescript
interface AnalyticsMetrics {
  agents: AgentMetrics;
  users: UserMetrics;
  tasks: TaskMetrics;
  revenue: RevenueMetrics;
  performance: PerformanceMetrics;
}
```

### TimeRange

```typescript
type TimeRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
```

### ExportFormat

```typescript
type ExportFormat = 'csv' | 'xlsx' | 'json' | 'pdf';
```

### ChartType

```typescript
type ChartType = 'line' | 'area' | 'bar' | 'pie' | 'donut' | 'radar' | 'scatter' | 'heatmap';
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 LICENSE 文件了解详情

## 🙏 致谢

- [Chart.js](https://www.chartjs.org/) - 图表库
- [Recharts](https://recharts.org/) - React 图表库
- [Lucide Icons](https://lucide.dev/) - 图标库
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [Next.js](https://nextjs.org/) - React 框架

---

**最后更新**: 2026-03-21

**版本**: 1.0.0

**维护者**: 7zi Studio Team
