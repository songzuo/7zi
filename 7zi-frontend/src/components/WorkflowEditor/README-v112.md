# Workflow 模板系统 v1.12.2

> 让用户快速创建工作流的预设模板系统

## 概述

模板系统提供预设的工作流模板，用户可以从模板快速创建工作流，无需从头开始设计。

## 特性

- ✅ 5 个预设模板
- ✅ 类型安全的 TypeScript 实现
- ✅ 可视化模板选择器
- ✅ 模板筛选和搜索
- ✅ React Hooks 支持
- ✅ 编程式 API

## 预设模板

| ID | 名称 | 类别 | 难度 | 节点数 | 描述 |
|---|---|---|---|---|---|
| `blank` | 空白模板 | basic | beginner | 2 | 最简单的工作流模板，包含开始和结束节点 |
| `ai-chat` | AI 对话模板 | ai | beginner | 3 | 包含 AI Agent 节点的简单对话工作流 |
| `data-processing` | 数据处理模板 | data | intermediate | 4 | 经典的数据处理流程：输入、转换、输出 |
| `conditional` | 条件分支模板 | logic | intermediate | 5 | 基于条件的分支逻辑工作流 |
| `loop` | 循环处理模板 | advanced | advanced | 4 | 遍历数组并对每个元素进行处理 |

## 使用方法

### 方法 1: 使用模板选择器组件

```tsx
import { TemplateSelectorDialog } from '@/components/WorkflowEditor'

function MyComponent() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleSelectTemplate = (templateId: string) => {
    console.log('用户选择了模板:', templateId)
    // 创建工作流...
  }

  return (
    <>
      <button onClick={() => setIsDialogOpen(true)}>
        从模板创建
      </button>

      <TemplateSelectorDialog
        isOpen={isDialogOpen}
        onSelectTemplate={handleSelectTemplate}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  )
}
```

### 方法 2: 使用 Hooks

```tsx
import { useWorkflowTemplates } from '@/components/WorkflowEditor'

function MyComponent() {
  const {
    templates,           // 所有模板
    selectedTemplate,    // 当前选中的模板
    createWorkflow,      // 创建工作流函数
    isCreating,          // 是否正在创建
    error,               // 错误信息
  } = useWorkflowTemplates()

  const handleSelect = (templateId: string) => {
    selectTemplate(templateId)
  }

  const handleCreate = () => {
    const workflow = createWorkflow('我的工作流')
    if (workflow) {
      // 使用创建的工作流
    }
  }

  return (
    <div>
      {templates.map(template => (
        <div key={template.id} onClick={() => handleSelect(template.id)}>
          {template.name}
        </div>
      ))}

      {selectedTemplate && (
        <button onClick={handleCreate} disabled={isCreating}>
          创建工作流
        </button>
      )}
    </div>
  )
}
```

### 方法 3: 使用编程式 API

```tsx
import {
  listTemplates,
  getTemplate,
  createFromTemplate,
} from '@/components/WorkflowEditor'

// 列出所有模板
const templates = listTemplates()

// 获取特定模板
const template = getTemplate('ai-chat')

// 从模板创建工作流
const workflow = createFromTemplate(
  'ai-chat',
  '我的 AI 对话工作流',
  '使用 AI 进行对话处理'
)

console.log('创建的工作流:', workflow)
```

## API 参考

### 模板函数

```typescript
// 列出所有模板
function listTemplates(): WorkflowTemplate[]

// 根据类别筛选
function listTemplatesByCategory(category: 'basic' | 'ai' | 'data' | 'logic' | 'advanced'): WorkflowTemplate[]

// 根据难度筛选
function listTemplatesByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): WorkflowTemplate[]

// 根据标签搜索
function searchTemplatesByTag(tag: string): WorkflowTemplate[]

// 获取特定模板
function getTemplate(id: string): WorkflowTemplate | undefined

// 从模板创建工作流
function createFromTemplate(templateId: string, name: string, description?: string): WorkflowDefinition | null

// 验证模板
function validateTemplate(template: WorkflowTemplate): boolean

// 获取模板统计
function getTemplateStats(): { total: number, byCategory: Record<string, number>, byDifficulty: Record<string, number> }
```

### React Hooks

```typescript
// 模板列表
const { templates, stats, loading, error, refetch } = useTemplateList()

// 模板筛选
const {
  filteredTemplates,
  category,
  setCategory,
  difficulty,
  setDifficulty,
  search,
  setSearch,
  clearFilters,
} = useTemplateFilter()

// 模板详情
const { template, loading, error, isValid } = useTemplate(templateId)

// 创建工作流
const {
  createFromTemplate,
  lastCreated,
  isLoading,
  error,
} = useCreateFromTemplate()

// 模板选择
const {
  isOpen,
  selectedTemplate,
  openSelector,
  closeSelector,
  selectTemplate,
} = useTemplateSelector()

// 完整流程
const {
  templates,
  selectedTemplate,
  createdWorkflow,
  createWorkflow,
  isCreating,
  error,
} = useWorkflowTemplates()
```

### 类型定义

```typescript
interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: 'basic' | 'ai' | 'data' | 'logic' | 'advanced'
  icon: string
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedNodes: number
  workflow: Omit<WorkflowDefinition, 'id' | 'name' | 'description'>
  preview?: {
    thumbnail?: string
    features: string[]
  }
}
```

## 文件结构

```
WorkflowEditor/
├── templates.ts              # 模板定义和 API
├── TemplateSelector.tsx      # 模板选择器 UI 组件
├── templateHooks.ts          # React Hooks
├── examples-v112.tsx         # 使用示例
└── README-v112.md            # 本文档
```

## 集成指南

### 1. 在编辑器中添加"从模板创建"按钮

```tsx
// WorkflowEditor.tsx
import { TemplateSelectorDialog, createFromTemplate } from './index'

export function WorkflowEditor() {
  const [showTemplates, setShowTemplates] = useState(false)
  const { setNodes, setEdges } = useReactFlow()

  const handleSelectTemplate = (templateId: string) => {
    const workflow = createFromTemplate(templateId, '新工作流')
    if (workflow) {
      setNodes(workflow.nodes)
      setEdges(workflow.edges)
    }
  }

  return (
    <div>
      <button onClick={() => setShowTemplates(true)}>
        从模板创建
      </button>

      <TemplateSelectorDialog
        isOpen={showTemplates}
        onSelectTemplate={handleSelectTemplate}
        onClose={() => setShowTemplates(false)}
      />

      {/* 编辑器其他内容 */}
    </div>
  )
}
```

### 2. 添加到工具栏

```tsx
// Toolbar.tsx
export function Toolbar() {
  const [showTemplates, setShowTemplates] = useState(false)

  return (
    <div className="toolbar">
      <button onClick={() => setShowTemplates(true)}>
        📄 从模板创建
      </button>

      <TemplateSelectorDialog
        isOpen={showTemplates}
        onSelectTemplate={handleSelectTemplate}
        onClose={() => setShowTemplates(false)}
      />
    </div>
  )
}
```

## 自定义模板

要添加自定义模板，可以扩展 `templates.ts` 文件：

```typescript
// 添加新模板
const myCustomTemplate: WorkflowTemplate = {
  id: 'my-custom',
  name: '自定义模板',
  description: '我的自定义工作流模板',
  category: 'custom',
  icon: '🎨',
  tags: ['自定义', '示例'],
  difficulty: 'intermediate',
  estimatedNodes: 3,
  workflow: {
    nodes: [
      { id: 'start', type: 'start', label: '开始', config: {} },
      { id: 'custom', type: 'agent', label: '自定义节点', config: {} },
      { id: 'end', type: 'end', label: '结束', config: {} },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'custom' },
      { id: 'e2', source: 'custom', target: 'end' },
    ],
  },
}

// 添加到 PRESET_TEMPLATES 数组
PRESET_TEMPLATES.push(myCustomTemplate)
```

## 测试

```bash
# 运行类型检查
npm run type-check

# 运行测试
npm test -- --grep "template"
```

## 更新日志

### v1.12.2 (2026-04-04)

- ✨ 新增模板系统
- ✨ 5 个预设模板
- ✨ 模板选择器 UI 组件
- ✨ React Hooks 支持
- ✨ 编程式 API

## 相关文档

- [WorkflowEditor README](./README.md)
- [v1.9.1 更新说明](./README.v110.md)
- [类型定义](./types.ts)
