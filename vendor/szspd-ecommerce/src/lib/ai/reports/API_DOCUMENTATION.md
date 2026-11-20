# 自然语言报表生成器 API 文档

> 版本: 1.10.0  
> 创建时间: 2025-04-03

## 概述

自然语言报表生成器是一个 AI 驱动的报表生成系统，能够将结构化数据转换为自然语言报表，支持多种报表类型、语言和语气风格。

## 核心功能

- **报表模板引擎**: 预定义报表模板，支持变量插值、条件渲染和循环
- **数据聚合器**: 从数据库聚合关键指标，支持缓存优化
- **自然语言生成器**: 将结构化数据转换为自然语言，支持多种语气风格
- **洞察自动提取**: 自动识别数据中的关键洞察和建议

---

## API 端点

### 1. 生成报表

**POST** `/api/reports/generate`

生成指定类型的报表。

#### 请求体

```typescript
{
  // 模板 ID 或模板类型（二选一）
  templateId?: string
  templateType?: ReportTemplateType

  // 时间范围（必填）
  timeRange: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
  
  // 自定义时间范围（timeRange 为 'custom' 时必填）
  customRange?: {
    start: string  // ISO 8601 格式
    end: string    // ISO 8601 格式
  }

  // 语言和语气
  language?: 'zh-CN' | 'en-US' | 'zh-TW' | 'ja-JP'
  tone?: 'formal' | 'concise' | 'detailed' | 'casual' | 'technical'

  // 自定义变量
  variables?: Record<string, unknown>

  // 过滤条件
  filters?: Record<string, unknown>

  // 选项
  options?: {
    includeCharts?: boolean      // 是否包含图表数据
    includeRawData?: boolean     // 是否包含原始数据
    includeInsights?: boolean    // 是否包含洞察
    maxSections?: number         // 最大章节数
  }
}
```

#### 响应

```typescript
{
  success: true
  data: {
    report: {
      id: string
      templateType: ReportTemplateType
      title: string
      summary: string
      sections: ReportSectionOutput[]
      insights: ReportInsight[]
      metadata: {
        generatedAt: string
        timeRange: { start: string; end: string }
        language: ReportLanguage
        tone: ReportTone
        dataPoints: number
        generationTimeMs: number
      }
      rawData?: AggregatedData
    }
    timestamp: string
  }
}
```

#### 示例

**请求: 项目进度报表**

```bash
curl -X POST https://your-domain.com/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{
    "templateType": "project_progress",
    "timeRange": "week",
    "language": "zh-CN",
    "tone": "formal",
    "variables": {
      "projectName": "OpenClaw 升级项目"
    }
  }'
```

**请求: 自定义时间范围**

```bash
curl -X POST https://your-domain.com/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{
    "templateType": "revenue_analysis",
    "timeRange": "custom",
    "customRange": {
      "start": "2025-01-01T00:00:00Z",
      "end": "2025-01-31T23:59:59Z"
    }
  }'
```

---

### 2. 获取支持的选项

**GET** `/api/reports/generate`

获取支持的报表类型、模板列表和选项。

#### 响应

```typescript
{
  success: true
  data: {
    supportedTypes: ReportTemplateType[]
    templates: Array<{
      id: string
      type: ReportTemplateType
      name: string
      description: string
      supportedLanguages: ReportLanguage[]
      supportedTones: ReportTone[]
    }>
    options: {
      timeRanges: string[]
      languages: string[]
      tones: string[]
    }
  }
}
```

---

### 3. 获取模板列表

**GET** `/api/reports/templates`

获取所有可用的报表模板。

#### 查询参数

- `type`: 按模板类型过滤
- `language`: 按支持的语言过滤

#### 响应

```typescript
{
  success: true
  data: {
    templates: Array<{
      id: string
      type: ReportTemplateType
      name: string
      description: string
      version: string
      supportedLanguages: ReportLanguage[]
      supportedTones: ReportTone[]
      variables: ReportTemplateVariable[]
      metadata: {
        author?: string
        createdAt: string
        updatedAt: string
        tags?: string[]
      }
    }>
    total: number
    timestamp: string
  }
}
```

#### 示例

```bash
# 获取所有模板
curl https://your-domain.com/api/reports/templates

# 获取特定类型的模板
curl https://your-domain.com/api/reports/templates?type=project_progress

# 获取支持英文的模板
curl https://your-domain.com/api/reports/templates?language=en-US
```

---

### 4. 生成自定义报表

**POST** `/api/reports/custom`

生成完全自定义的报表。

#### 请求体

```typescript
{
  // 标题（必填）
  title: string

  // 描述
  description?: string

  // 章节（必填）
  sections: Array<{
    title: string
    dataSource: string
    metrics: string[]
  }>

  // 时间范围（必填）
  timeRange: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
  
  // 自定义时间范围
  customRange?: {
    start: string
    end: string
  }

  // 过滤条件
  filters?: Record<string, unknown>

  // 语言和语气
  language?: 'zh-CN' | 'en-US' | 'zh-TW' | 'ja-JP'
  tone?: 'formal' | 'concise' | 'detailed' | 'casual' | 'technical'
}
```

#### 示例

```bash
curl -X POST https://your-domain.com/api/reports/custom \
  -H "Content-Type: application/json" \
  -d '{
    "title": "自定义性能报表",
    "description": "系统性能和资源使用情况",
    "sections": [
      {
        "title": "响应时间",
        "dataSource": "performance",
        "metrics": ["avgResponseTime", "p95ResponseTime", "p99ResponseTime"]
      },
      {
        "title": "资源使用",
        "dataSource": "resources",
        "metrics": ["cpuUsage", "memoryUsage", "diskUsage"]
      }
    ],
    "timeRange": "month",
    "language": "zh-CN",
    "tone": "technical"
  }'
```

---

## 报表类型

### 1. 项目进度报表 (`project_progress`)

展示项目整体进度、里程碑完成情况和风险项。

**关键指标:**
- 整体进度百分比
- 已完成任务数
- 新增任务数
- 里程碑状态
- 风险项统计

### 2. 团队绩效报表 (`team_performance`)

展示团队成员的工作效率、任务完成情况和协作指标。

**关键指标:**
- 任务完成率
- 平均响应时间
- 协作指数
- 客户满意度
- 成员贡献度

### 3. 任务分析报表 (`task_analysis`)

展示任务分布、完成趋势和瓶颈分析。

**关键指标:**
- 总任务数
- 完成率
- 平均完成时间
- 优先级分布
- 瓶颈识别

### 4. 智能体活动报表 (`agent_activity`)

展示智能体的工作情况、资源消耗和协作模式。

**关键指标:**
- 活跃智能体数
- Token 消耗
- 平均响应时间
- 成功率
- 按提供商统计

### 5. 收入分析报表 (`revenue_analysis`)

展示收入来源、增长趋势和预测分析。

**关键指标:**
- 总收入
- 增长率
- ARPU
- 付费转化率
- 收入来源分布

### 6. 用户参与度报表 (`user_engagement`)

展示用户活跃度、留存率和参与行为分析。

**关键指标:**
- 总用户数
- 活跃用户数
- 留存率
- 平均会话时长
- DAU/MAU 比例

---

## 语气风格

| 风格 | 描述 | 适用场景 |
|------|------|----------|
| `formal` | 正式、专业 | 管理层汇报、正式文档 |
| `concise` | 简洁、精炼 | 快速查看、仪表板 |
| `detailed` | 详细、全面 | 深度分析、技术文档 |
| `casual` | 轻松、友好 | 团队内部、日常沟通 |
| `technical` | 技术性、专业 | 技术团队、开发文档 |

---

## 多语言支持

| 语言代码 | 语言名称 |
|----------|----------|
| `zh-CN` | 简体中文 |
| `en-US` | 美式英语 |
| `zh-TW` | 繁体中文 |
| `ja-JP` | 日语 |

---

## 缓存机制

报表生成器使用多层缓存优化性能：

1. **数据聚合缓存**: 聚合结果缓存 5 分钟
2. **模板缓存**: 模板解析结果缓存
3. **HTTP 缓存**: 响应头支持 CDN 缓存

### 清除缓存

```typescript
// 通过 API 客户端
generator.clearCache()

// 获取缓存统计
const stats = generator.getCacheStats()
```

---

## 错误处理

所有 API 返回标准错误格式：

```typescript
{
  success: false
  error: {
    message: string
    code?: string
    details?: unknown
  }
}
```

### 常见错误码

| 状态码 | 描述 |
|--------|------|
| 400 | 请求参数无效 |
| 404 | 模板不存在 |
| 500 | 服务器内部错误 |

---

## 使用示例

### JavaScript/TypeScript

```typescript
import { reportGenerator, ReportTemplateType } from '@/lib/ai/reports'

// 生成项目进度报表
const report = await reportGenerator.generate({
  templateType: ReportTemplateType.PROJECT_PROGRESS,
  timeRange: 'week',
  language: 'zh-CN',
  tone: 'formal',
  options: {
    includeInsights: true,
    includeCharts: true,
  },
})

console.log(report.title)
console.log(report.summary)
console.log(report.sections)
```

### React 组件

```tsx
import { useState, useEffect } from 'react'
import { ReportTemplateType } from '@/lib/ai/reports/types'

function ReportViewer() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateType: ReportTemplateType.TEAM_PERFORMANCE,
        timeRange: 'month',
      }),
    })
      .then(res => res.json())
      .then(data => {
        setReport(data.data.report)
        setLoading(false)
      })
  }, [])

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <h1>{report.title}</h1>
      <p>{report.summary}</p>
      {report.sections.map(section => (
        <section key={section.id}>
          <h2>{section.title}</h2>
          <div>{section.content}</div>
        </section>
      ))}
    </div>
  )
}
```

---

## 最佳实践

1. **选择合适的时间范围**: 根据报表用途选择 `week`、`month` 或 `quarter`
2. **使用缓存**: 重复请求相同数据时利用缓存机制
3. **控制章节数**: 大型报表使用 `maxSections` 限制章节数
4. **自定义变量**: 使用 `variables` 自定义报表内容
5. **异步生成**: 大型报表建议异步生成并轮询结果

---

## 更新日志

### v1.10.0 (2025-04-03)

- ✨ 初始版本发布
- ✨ 支持 6 种预定义报表类型
- ✨ 支持中英日多语言
- ✨ 支持 5 种语气风格
- ✨ 自动洞察提取
- ✨ 缓存机制优化

---

## 联系方式

如有问题或建议，请联系开发团队。