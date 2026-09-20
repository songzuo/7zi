# AI 报表生成系统 (v1.10.0)

自然语言驱动的数据分析报表生成组件。

## 功能特性

### 🎯 自然语言查询
- 支持中文自然语言描述报表需求
- 智能意图识别（聚合/对比/趋势/分布/排名）
- 时间范围自动解析
- 过滤条件提取

### 📊 图表渲染
- 折线图 (Line Chart)
- 柱状图 (Bar Chart)
- 饼图 (Pie Chart)
- 散点图 (Scatter Chart)
- 面积图 (Area Chart)
- 数据表格 (Data Table)
- 自动图表类型推荐

### 📥 报表导出
- CSV 格式
- Excel 格式
- PDF 格式
- JSON 格式

### 🔄 SQL 生成
- 自然语言转 SQL
- SQL 语法验证
- SQL 格式化显示
- 查询解释

## 使用方法

### 基本使用

```tsx
import { AIReportGenerator } from '@/components/ai-report'

function MyPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <AIReportGenerator 
        dataSource="sales_db"
        onSave={(config) => console.log('Saved:', config)}
      />
    </div>
  )
}
```

### 简化版

```tsx
import { AIRaportSimple } from '@/components/ai-report'

function QuickReport() {
  return <AIRaportSimple />
}
```

### 使用模板

```tsx
import { AIReportGenerator, ReportTemplate } from '@/components/ai-report'

const templates: ReportTemplate[] = [
  {
    id: '1',
    name: '销售日报',
    description: '每日销售统计',
    category: 'sales',
    template: '今日销售总额',
    defaultTimeRange: 'today',
    defaultChartType: 'bar',
    icon: '💰'
  }
]

function SalesReport() {
  return <AIReportGenerator templates={templates} />
}
```

## 组件结构

```
src/components/ai-report/
├── index.ts                  # 模块入口
├── types.ts                  # 类型定义
├── AIReportGenerator.tsx     # 主组件
├── QueryParser.tsx           # 查询解析器
├── SQLGenerator.tsx          # SQL 生成器
├── hooks/
│   └── index.ts              # 自定义 Hooks
├── charts/
│   └── ChartRenderer.tsx     # 图表渲染
├── export/
│   └── ReportExporter.tsx    # 导出功能
└── __tests__/
    └── ai-report.test.tsx    # 测试用例
```

## API 参考

### AIReportGenerator Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| dataSource | string | 'default' | 数据源名称 |
| templates | ReportTemplate[] | [] | 报表模板列表 |
| onSave | (config) => void | - | 保存回调 |
| onExport | (options) => void | - | 导出回调 |
| className | string | '' | 自定义样式 |

### QueryIntent 查询意图

```ts
type QueryIntent = 
  | 'aggregation'  // 聚合查询
  | 'comparison'   // 对比查询
  | 'trend'        // 趋势查询
  | 'distribution' // 分布查询
  | 'ranking'      // 排名查询
  | 'unknown'      // 未知意图
```

### ChartType 图表类型

```ts
type ChartType = 
  | 'line'     // 折线图
  | 'bar'      // 柱状图
  | 'pie'      // 饼图
  | 'scatter'  // 散点图
  | 'heatmap'  // 热力图
  | 'area'     // 面积图
  | 'table'    // 数据表格
```

## 查询示例

| 自然语言查询 | 解析意图 | 推荐图表 |
|-------------|---------|---------|
| 本月销售总额 | aggregation | bar |
| 用户增长趋势 | trend | line |
| 各产品销售占比 | distribution | pie |
| 销售额对比 | comparison | bar |
| 前10名客户 | ranking | bar |

## 待实现功能

- [ ] 集成实际数据库连接
- [ ] 支持更多图表类型（热力图、雷达图等）
- [ ] 报表分享功能
- [ ] 定时报表生成
- [ ] 多数据源支持
- [ ] 复杂查询构建器

## 技术栈

- React 18+
- TypeScript
- TailwindCSS
- Vitest (测试)