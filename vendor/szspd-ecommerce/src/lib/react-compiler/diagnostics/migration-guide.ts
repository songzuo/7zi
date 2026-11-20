/**
 * React Compiler Diagnostics - Migration Guide
 *
 * 生成详细的迁移建议和修复指南
 */

import { ScanResult, IncompatibilityReport, CompilerIssue } from './scanner'

export interface MigrationStep {
  step: number
  description: string
  codeExample?: {
    before: string
    after: string
  }
  notes?: string[]
}

export interface ComponentMigration {
  filePath: string
  componentName?: string
  steps: MigrationStep[]
  estimatedTime: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface MigrationGuide {
  title: string
  summary: {
    totalComponents: number
    componentsNeedingMigration: number
    estimatedTotalTime: string
  }
  byPriority: {
    high: ComponentMigration[]
    medium: ComponentMigration[]
    low: ComponentMigration[]
  }
  commonIssues: {
    [key: string]: {
      count: number
      description: string
      fixGuide: string
    }
  }
  quickWins: string[]
  recommendedOrder: string[]
}

/**
 * 问题类型到修复指南的映射
 */
const ISSUE_FIX_GUIDES: Record<string, { description: string; fixGuide: string }> = {
  'ref.current': {
    description: '直接使用 ref.current 赋值',
    fixGuide: `
**问题**: React Compiler 不支持直接对 ref.current 赋值，因为编译器无法追踪 ref 的变化。

**解决方案**:
1. 使用 useState 代替 ref，让 React 追踪状态
2. 如果必须使用 ref，确保在 useEffect 中修改
3. 使用函数式更新确保最新值

**示例**:
\`\`\`typescript
// ❌ 不支持
const ref = useRef(0);
ref.current = newValue;

// ✅ 方案 1: 使用 useState
const [value, setValue] = useState(0);
setValue(newValue);

// ✅ 方案 2: 在 useEffect 中修改
useEffect(() => {
  ref.current = newValue;
}, [newValue]);
\`\`\`
`,
  },
  dangerouslySetInnerHTML: {
    description: '使用 dangerouslySetInnerHTML',
    fixGuide: `
**问题**: React Compiler 无法保证 HTML 内容的安全性。

**解决方案**:
1. 使用 DOMPurify 或类似库净化 HTML
2. 使用 React 的安全渲染方式

**示例**:
\`\`\`typescript
// ❌ 不支持
<div dangerouslySetInnerHTML={{ __html: htmlContent }} />

// ✅ 使用 DOMPurify
import DOMPurify from 'isomorphic-dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }} />

// ✅ 或使用安全的方式（如果可能）
<div>{renderSafeContent(content)}</div>
\`\`\`
`,
  },
  createRef: {
    description: '在函数组件中使用 createRef',
    fixGuide: `
**问题**: createRef 在函数组件中可能导致不必要的重新渲染。

**解决方案**:
1. 使用 useRef hook 代替 createRef

**示例**:
\`\`\`typescript
// ❌ 不推荐
function MyComponent() {
  const ref = React.createRef<HTMLDivElement>();
  // ...
}

// ✅ 使用 useRef
function MyComponent() {
  const ref = useRef<HTMLDivElement>(null);
  // ...
}
\`\`\`
`,
  },
  findDOMNode: {
    description: '使用 findDOMNode',
    fixGuide: `
**问题**: findDOMNode 已被废弃且不推荐使用。

**解决方案**:
1. 使用 ref 回调函数
2. 使用 useRef 和 ref 属性

**示例**:
\`\`\`typescript
// ❌ 已废弃
const node = ReactDOM.findDOMNode(ref);

// ✅ 使用 ref 回调
<div ref={node => {
  // 直接访问 DOM 节点
}} />

// ✅ 或使用 useRef
const ref = useRef<HTMLDivElement>(null);
// 访问 ref.current
\`\`\`
`,
  },
  'string-ref': {
    description: '使用字符串 ref',
    fixGuide: `
**问题**: 字符串 ref 已被废弃。

**解决方案**:
1. 使用 useRef hook
2. 使用 ref 回调函数

**示例**:
\`\`\`typescript
// ❌ 已废弃
<input ref="myInput" />

// ✅ 使用 useRef
const inputRef = useRef<HTMLInputElement>(null);
<input ref={inputRef} />

// ✅ 或使用 ref 回调
<input ref={ref => {
  this.inputRef = ref;
}} />
\`\`\`
`,
  },
  'window-assignment': {
    description: '直接赋值 window 属性',
    fixGuide: `
**问题**: 直接修改 window 可能导致副作用。

**解决方案**:
1. 在 useEffect 中操作
2. 清理副作用

**示例**:
\`\`\`typescript
// ❌ 不推荐
function MyComponent() {
  window.addEventListener('resize', handleResize);
  // ...
}

// ✅ 使用 useEffect
function MyComponent() {
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
}
\`\`\`
`,
  },
  'document-assignment': {
    description: '直接操作 document',
    fixGuide: `
**问题**: 直接操作 document 可能导致副作用。

**解决方案**:
1. 使用 React refs 和 effects
2. 使用 React 的 DOM 操作方式

**示例**:
\`\`\`typescript
// ❌ 不推荐
function MyComponent() {
  document.title = 'New Title';
  // ...
}

// ✅ 使用 useEffect
function MyComponent() {
  useEffect(() => {
    const originalTitle = document.title;
    document.title = 'New Title';
    return () => {
      document.title = originalTitle;
    };
  }, []);
}
\`\`\`
`,
  },
  localStorage: {
    description: '直接访问 localStorage',
    fixGuide: `
**问题**: 在渲染期间访问 localStorage 可能导致不一致。

**解决方案**:
1. 在 useEffect 中读取/写入
2. 使用 useState + useEffect 模式

**示例**:
\`\`\`typescript
// ❌ 不推荐
function MyComponent() {
  const value = localStorage.getItem('key');
  // ...
}

// ✅ 使用 useEffect
function MyComponent() {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('key');
  });

  useEffect(() => {
    localStorage.setItem('key', value);
  }, [value]);
}
\`\`\`
`,
  },
  'nested-map': {
    description: '嵌套 .map() 调用',
    fixGuide: `
**问题**: 嵌套的 map 可能导致性能问题。

**解决方案**:
1. 使用 useMemo 缓存结果
2. 展平数据结构
3. 提取子组件

**示例**:
\`\`\`typescript
// ❌ 性能问题
{data.map(item =>
  item.subitems.map(sub => (
    <SubItem key={sub.id} data={sub} />
  ))
)}

// ✅ 使用 useMemo
const memoizedSubItems = useMemo(() =>
  data.flatMap(item =>
    item.subitems.map(sub => ({ ...sub, parentId: item.id }))
  ),
  [data]
);

// ✅ 或提取子组件
function ParentItem({ item }: { item: Item }) {
  return (
    <>
      {item.subitems.map(sub => (
        <SubItem key={sub.id} data={sub} />
      ))}
    </>
  );
}
\`\`\`
`,
  },
  'effect-with-setState': {
    description: '空依赖数组中使用 setState',
    fixGuide: `
**问题**: 可能导致意外的重新渲染循环。

**解决方案**:
1. 检查依赖数组是否正确
2. 如果需要在空依赖数组中使用，确保有条件检查

**示例**:
\`\`\`typescript
// ❌ 可能有问题
useEffect(() => {
  setState(newValue);
}, []);

// ✅ 添加正确的依赖
useEffect(() => {
  setState(newValue);
}, [dependency]);

// ✅ 或添加条件检查
useEffect(() => {
  if (shouldUpdate) {
    setState(newValue);
  }
}, [shouldUpdate]);
\`\`\`
`,
  },
  'chained-filter': {
    description: '链式 filter 调用',
    fixGuide: `
**问题**: 多次 filter 可能导致性能问题。

**解决方案**:
1. 合并过滤条件
2. 使用单一 filter 传递多个条件

**示例**:
\`\`\`typescript
// ❌ 性能问题
const filtered = data
  .filter(item => item.active)
  .filter(item => item.price > 100)
  .filter(item => item.category === 'food');

// ✅ 合并过滤条件
const filtered = data.filter(item =>
  item.active &&
  item.price > 100 &&
  item.category === 'food'
);
\`\`\`
`,
  },
}

/**
 * 根据问题类型生成修复步骤
 */
function generateStepsForIssue(issue: CompilerIssue): MigrationStep {
  const fixGuide = ISSUE_FIX_GUIDES[issue.type] || {
    description: '未知问题类型',
    fixGuide: '请查阅 React Compiler 官方文档',
  }

  return {
    step: 1,
    description: `修复 ${issue.type} 问题`,
    notes: [`行号: ${issue.line || '未知'}`, `严重程度: ${issue.severity}`, issue.message],
  }
}

/**
 * 计算修复难度
 */
function calculateDifficulty(report: IncompatibilityReport): 'easy' | 'medium' | 'hard' {
  const highSeverityCount = report.issues.filter(i => i.severity === 'high').length
  const mediumSeverityCount = report.issues.filter(i => i.severity === 'medium').length

  if (highSeverityCount > 0) return 'hard'
  if (mediumSeverityCount > 2) return 'medium'
  if (report.issues.length > 5) return 'medium'
  return 'easy'
}

/**
 * 估算修复时间
 */
function estimateTime(report: IncompatibilityReport): string {
  const difficulty = calculateDifficulty(report)
  const issueCount = report.issues.length

  switch (difficulty) {
    case 'easy':
      return `${issueCount * 5} 分钟`
    case 'medium':
      return `${issueCount * 10} 分钟`
    case 'hard':
      return `${issueCount * 20} 分钟`
    default:
      return '未知'
  }
}

/**
 * 生成组件迁移指南
 */
function generateComponentMigration(report: IncompatibilityReport): ComponentMigration {
  const steps: MigrationStep[] = []

  // 按严重程度排序问题
  const sortedIssues = [...report.issues].sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })

  // 为每个问题生成修复步骤
  sortedIssues.forEach((issue, index) => {
    const step: MigrationStep = {
      step: index + 1,
      description: issue.message,
    }

    // 添加修复指南
    const fixGuide = ISSUE_FIX_GUIDES[issue.type]
    if (fixGuide) {
      step.notes = [`严重程度: ${issue.severity}`, fixGuide.description, fixGuide.fixGuide]
    }

    steps.push(step)
  })

  return {
    filePath: report.filePath,
    componentName: report.componentName,
    steps,
    estimatedTime: estimateTime(report),
    difficulty: calculateDifficulty(report),
  }
}

/**
 * 生成整体迁移指南
 */
export async function generateMigrationGuide(scanResult: ScanResult): Promise<MigrationGuide> {
  const componentsNeedingMigration = scanResult.reports.filter(r => !r.canCompile)
  const migrations: ComponentMigration[] = componentsNeedingMigration.map(
    generateComponentMigration
  )

  // 按优先级分组
  const byPriority = {
    high: migrations.filter(m => m.difficulty === 'hard'),
    medium: migrations.filter(m => m.difficulty === 'medium'),
    low: migrations.filter(m => m.difficulty === 'easy'),
  }

  // 统计常见问题
  const commonIssues: MigrationGuide['commonIssues'] = {}
  for (const report of componentsNeedingMigration) {
    for (const issue of report.issues) {
      if (!commonIssues[issue.type]) {
        commonIssues[issue.type] = {
          count: 0,
          description: issue.message,
          fixGuide: ISSUE_FIX_GUIDES[issue.type]?.fixGuide || '请查阅官方文档',
        }
      }
      commonIssues[issue.type].count++
    }
  }

  // 估算总时间
  let totalMinutes = 0
  migrations.forEach(m => {
    const time = m.estimatedTime
    const match = time.match(/(\d+)/)
    if (match) {
      totalMinutes += parseInt(match[1], 10)
    }
  })
  const estimatedTotalTime =
    totalMinutes < 60 ? `${totalMinutes} 分钟` : `${Math.round(totalMinutes / 60)} 小时`

  // 生成快速修复建议
  const quickWins: string[] = []
  const sortedCommonIssues = Object.entries(commonIssues)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)

  sortedCommonIssues.forEach(([type, info]) => {
    quickWins.push(`批量修复 "${type}" 问题 (${info.count} 处) - ${info.description}`)
  })

  // 推荐修复顺序
  const recommendedOrder: string[] = [
    '1. 修复所有 high 严重程度问题',
    '2. 处理 medium 严重程度问题',
    '3. 优化 low 严重程度的性能问题',
    '4. 添加必要的依赖项到 useEffect',
    '5. 测试所有修改后的组件',
  ]

  return {
    title: 'React Compiler 迁移指南',
    summary: {
      totalComponents: scanResult.totalFiles,
      componentsNeedingMigration: componentsNeedingMigration.length,
      estimatedTotalTime,
    },
    byPriority,
    commonIssues,
    quickWins,
    recommendedOrder,
  }
}
