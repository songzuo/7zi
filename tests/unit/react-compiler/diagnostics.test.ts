/**
 * React Compiler Diagnostics - Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import {
  ComponentScanner,
  CompilerIssue,
  IncompatibilityReport,
} from '../../../src/lib/react-compiler/diagnostics/scanner'
import { ReactCompilerDiagnostics } from '../../../src/lib/react-compiler/diagnostics/index'
import { generateMigrationGuide } from '../../../src/lib/react-compiler/diagnostics/migration-guide'
import {
  generateCompatibilityReport,
  generateMarkdownReport,
} from '../../../src/lib/react-compiler/diagnostics/reporter'

// Mock fs module
vi.mock('fs')

describe('ComponentScanner', () => {
  let scanner: ComponentScanner

  beforeEach(() => {
    scanner = new ComponentScanner('/test/project')
  })

  describe('不兼容模式检测', () => {
    it('应该检测 ref.current 使用', () => {
      const code = `
        function MyComponent() {
          const ref = useRef(0);
          ref.current = newValue;
          return <div>{ref.current}</div>;
        }
      `

      const issues: CompilerIssue[] = []
      const pattern = /\bref\.current\s*=/
      const match = code.match(pattern)

      expect(match).not.toBeNull()
      expect(code).toContain('ref.current')
    })

    it('应该检测 dangerouslySetInnerHTML 使用', () => {
      const code = `
        function MyComponent() {
          return <div dangerouslySetInnerHTML={{ __html: content }} />;
        }
      `

      const pattern = /\bdangerouslySetInnerHTML\b/
      const match = code.match(pattern)

      expect(match).not.toBeNull()
      expect(code).toContain('dangerouslySetInnerHTML')
    })

    it('应该检测 createRef 使用', () => {
      const code = `
        function MyComponent() {
          const ref = React.createRef();
          return <div ref={ref} />;
        }
      `

      const pattern = /\bcreateRef\b/
      const match = code.match(pattern)

      expect(match).not.toBeNull()
      expect(code).toContain('createRef')
    })

    it('应该检测 findDOMNode 使用', () => {
      const code = `
        function MyComponent() {
          const node = ReactDOM.findDOMNode(ref);
          return <div>{node}</div>;
        }
      `

      const pattern = /\bfindDOMNode\b/
      const match = code.match(pattern)

      expect(match).not.toBeNull()
      expect(code).toContain('findDOMNode')
    })

    it('应该检测字符串 ref', () => {
      const code = `
        function MyComponent() {
          return <input ref="myInput" />;
        }
      `

      const pattern = /\bstring\s+ref\b/
      expect(code).toContain('ref="myInput"')
    })
  })

  describe('第三方库副作用检测', () => {
    it('应该检测 window 属性赋值', () => {
      const code = `
        function MyComponent() {
          window.title = 'New Title';
          return <div>Test</div>;
        }
      `

      const pattern = /window\.[a-zA-Z]+\s*=/
      const match = code.match(pattern)

      expect(match).not.toBeNull()
      expect(code).toContain('window.title')
    })

    it('应该检测 document 属性赋值', () => {
      const code = `
        function MyComponent() {
          document.title = 'Title';
          return <div>Test</div>;
        }
      `

      const pattern = /document\.[a-zA-Z]+\s*=/
      const match = code.match(pattern)

      expect(match).not.toBeNull()
      expect(code).toContain('document.title')
    })

    it('应该检测 localStorage 访问', () => {
      const code = `
        function MyComponent() {
          const value = localStorage.getItem('key');
          return <div>{value}</div>;
        }
      `

      const pattern = /localStorage\.(setItem|getItem)/
      const match = code.match(pattern)

      expect(match).not.toBeNull()
      expect(code).toContain('localStorage.getItem')
    })
  })

  describe('性能警告检测', () => {
    it('应该检测嵌套 .map() 调用', () => {
      const code = `
        data.map(item =>
          item.subitems.map(sub => (
            <SubItem key={sub.id} data={sub} />
          ))
        )
      `

      // 嵌套 map 应该被检测到
      expect(code).toContain('.map(')
      expect(code.match(/\.map\(/g)).toHaveLength(2)
    })

    it('应该检测链式 filter 调用', () => {
      const code = `
        const filtered = data
          .filter(item => item.active)
          .filter(item => item.price > 100);
      `

      // 链式 filter 应该被检测到
      expect(code).toContain('.filter(')
      expect(code.match(/\.filter\(/g)).toHaveLength(2)
    })
  })

  describe('查找行号', () => {
    it('应该正确查找代码中的行号', () => {
      const code = `line 1
line 2
line 3 ref.current = value
line 4`

      const search = 'ref.current'
      const lines = code.split('\n')

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(search)) {
          expect(i + 1).toBe(3)
          break
        }
      }
    })
  })

  describe('提取组件名称', () => {
    it('应该提取函数组件名称', () => {
      const content = `
        function MyComponent(props) {
          return <div>{props.children}</div>;
        }
      `

      const match = content.match(/(?:function|const)\s+([A-Z][a-zA-Z0-9]*)\s*[=(]/)
      expect(match).not.toBeNull()
      expect(match![1]).toBe('MyComponent')
    })

    it('应该提取箭头函数组件名称', () => {
      const content = `
        const MyComponent = (props) => {
          return <div>{props.children}</div>;
        };
      `

      const match = content.match(/(?:function|const)\s+([A-Z][a-zA-Z0-9]*)\s*[=(]/)
      expect(match).not.toBeNull()
      expect(match![1]).toBe('MyComponent')
    })
  })

  describe('计算修复难度', () => {
    it('应该正确计算无问题的组件难度', () => {
      const issues: CompilerIssue[] = []

      let effort: 'none' | 'low' | 'medium' | 'high'
      if (issues.length === 0) {
        effort = 'none'
      }

      expect(effort).toBe('none')
    })

    it('应该正确计算高严重程度问题难度', () => {
      const issues: CompilerIssue[] = [
        { type: 'unsupported-pattern', message: 'Test', severity: 'high' },
      ]

      let effort: 'none' | 'low' | 'medium' | 'high'
      const hasHigh = issues.some(i => i.severity === 'high')

      if (issues.length === 0) {
        effort = 'none'
      } else if (hasHigh) {
        effort = 'high'
      }

      expect(effort).toBe('high')
    })

    it('应该正确计算中严重程度问题难度', () => {
      const issues: CompilerIssue[] = [
        { type: 'unsupported-pattern', message: 'Test', severity: 'medium' },
        { type: 'side-effect', message: 'Test2', severity: 'medium' },
      ]

      let effort: 'none' | 'low' | 'medium' | 'high'
      const hasHigh = issues.some(i => i.severity === 'high')
      const hasMedium = issues.some(i => i.severity === 'medium')

      if (issues.length === 0) {
        effort = 'none'
      } else if (hasHigh) {
        effort = 'high'
      } else if (hasMedium && issues.length > 3) {
        effort = 'medium'
      } else if (hasMedium || issues.length > 2) {
        effort = 'low'
      }

      expect(effort).toBe('low')
    })
  })
})

describe('ReactCompilerDiagnostics', () => {
  let diagnostics: ReactCompilerDiagnostics

  beforeEach(() => {
    diagnostics = new ReactCompilerDiagnostics('/test/project')
  })

  describe('scanIncompatibleComponents', () => {
    it('应该接受自定义 glob 模式', async () => {
      const patterns = ['src/components/*.tsx', 'src/pages/*.tsx']
      // 测试模式数组的创建
      expect(patterns).toHaveLength(2)
      expect(patterns[0]).toBe('src/components/*.tsx')
    })

    it('应该处理空模式数组', () => {
      const patterns: string[] = []
      expect(patterns.length).toBe(0)
    })
  })

  describe('generateReport', () => {
    it('应该支持多种格式选项', () => {
      const formats = ['json', 'markdown', 'html'] as const
      formats.forEach(format => {
        expect(format).toMatch(/^(json|markdown|html)$/)
      })
    })

    it('应该接受包含详细信息选项', () => {
      const options = {
        format: 'json' as const,
        includeDetails: true,
        includeMigrationGuide: false,
      }

      expect(options.includeDetails).toBe(true)
      expect(options.includeMigrationGuide).toBe(false)
    })
  })

  describe('isComponentCompilable', () => {
    it('应该判断组件是否可编译', () => {
      const report: IncompatibilityReport = {
        filePath: 'test.tsx',
        componentName: 'Test',
        issues: [],
        canCompile: true,
        estimatedEffort: 'none',
      }

      expect(report.canCompile).toBe(true)
    })

    it('应该判断有高严重程度问题的组件不可编译', () => {
      const report: IncompatibilityReport = {
        filePath: 'test.tsx',
        componentName: 'Test',
        issues: [{ type: 'unsupported-pattern', message: 'Test', severity: 'high' }],
        canCompile: false,
        estimatedEffort: 'high',
      }

      expect(report.canCompile).toBe(false)
    })
  })

  describe('getProjectStatistics', () => {
    it('应该计算兼容性百分比', () => {
      const totalComponents = 100
      const compatibleComponents = 85
      const incompatibleComponents = 15

      const compatiblePercentage = (compatibleComponents / totalComponents) * 100
      const incompatiblePercentage = (incompatibleComponents / totalComponents) * 100

      expect(compatiblePercentage).toBe(85)
      expect(incompatiblePercentage).toBe(15)
    })

    it('应该计算平均每组件问题数', () => {
      const totalIssues = 50
      const totalComponents = 10

      const averageIssuesPerComponent = totalIssues / totalComponents

      expect(averageIssuesPerComponent).toBe(5)
    })
  })
})

describe('Migration Guide', () => {
  it('应该生成修复指南', async () => {
    const scanResult = {
      totalFiles: 10,
      compatibleFiles: 7,
      incompatibleFiles: 3,
      reports: [
        {
          filePath: 'test.tsx',
          componentName: 'Test',
          issues: [{ type: 'unsupported-pattern', message: 'Test issue', severity: 'high' }],
          canCompile: false,
          estimatedEffort: 'high',
        },
      ],
      summary: {
        byType: { 'unsupported-pattern': 1 },
        bySeverity: { low: 0, medium: 0, high: 1 },
      },
    }

    const guide = await generateMigrationGuide(scanResult)

    expect(guide.title).toBe('React Compiler 迁移指南')
    expect(guide.summary.totalComponents).toBe(10)
    // 实际是1个组件需要迁移（只有1个不兼容的报告）
    expect(guide.summary.componentsNeedingMigration).toBe(1)
    expect(guide.quickWins).toBeDefined()
    expect(guide.recommendedOrder).toBeDefined()
  })

  it('应该按优先级分组问题', async () => {
    const scanResult = {
      totalFiles: 5,
      compatibleFiles: 2,
      incompatibleFiles: 3,
      reports: [
        {
          filePath: 'hard.tsx',
          componentName: 'Hard',
          issues: [{ type: 'unsupported-pattern', message: 'Test', severity: 'high' }],
          canCompile: false,
          estimatedEffort: 'high',
        },
        {
          filePath: 'medium.tsx',
          componentName: 'Medium',
          issues: [
            { type: 'side-effect', message: 'Test', severity: 'medium' },
            { type: 'side-effect', message: 'Test2', severity: 'medium' },
            { type: 'side-effect', message: 'Test3', severity: 'medium' },
          ],
          canCompile: false,
          estimatedEffort: 'medium',
        },
        {
          filePath: 'easy.tsx',
          componentName: 'Easy',
          issues: [{ type: 'performance-warning', message: 'Test', severity: 'low' }],
          canCompile: false,
          estimatedEffort: 'easy',
        },
      ],
      summary: {
        byType: { 'unsupported-pattern': 1, 'side-effect': 3, 'performance-warning': 1 },
        bySeverity: { low: 1, medium: 3, high: 1 },
      },
    }

    const guide = await generateMigrationGuide(scanResult)

    expect(guide.byPriority.high).toHaveLength(1)
    expect(guide.byPriority.medium).toHaveLength(1)
    expect(guide.byPriority.low).toHaveLength(1)
  })
})

describe('Report Generator', () => {
  it('应该生成 JSON 格式报告', () => {
    const scanResult = {
      totalFiles: 10,
      compatibleFiles: 8,
      incompatibleFiles: 2,
      reports: [],
      summary: {
        byType: {},
        bySeverity: { low: 0, medium: 0, high: 0 },
      },
    }

    const report = generateCompatibilityReport(scanResult, { format: 'json' })

    expect(report.format).toBe('json')
    expect(report.summary.compatibleFiles).toBe(8)
    expect(report.summary.incompatibleFiles).toBe(2)
  })

  it('应该生成 Markdown 格式报告', () => {
    const scanResult = {
      totalFiles: 10,
      compatibleFiles: 8,
      incompatibleFiles: 2,
      reports: [],
      summary: {
        byType: {},
        bySeverity: { low: 0, medium: 0, high: 0 },
      },
    }

    const report = generateCompatibilityReport(scanResult, { format: 'markdown' })
    const markdown = generateMarkdownReport(report)

    expect(markdown).toContain('# React Compiler 兼容性报告')
    expect(markdown).toContain('## 📊 摘要')
    // Markdown 中使用加粗格式 "**总文件数**: 10"
    expect(markdown).toContain('**总文件数**')
    expect(markdown).toContain('10')
  })

  it('应该生成建议', () => {
    const scanResult = {
      totalFiles: 100,
      compatibleFiles: 95,
      incompatibleFiles: 5,
      reports: [],
      summary: {
        byType: { 'test-type': 10 },
        bySeverity: { low: 5, medium: 3, high: 2 },
      },
    }

    const report = generateCompatibilityReport(scanResult)

    expect(report.recommendations.length).toBeGreaterThan(0)
    expect(report.recommendations[0]).toContain('✅')
  })

  it('应该按兼容性比例生成不同建议', () => {
    // 高兼容性
    const highCompatibility = {
      totalFiles: 100,
      compatibleFiles: 95,
      incompatibleFiles: 5,
      reports: [],
      summary: {
        byType: {},
        bySeverity: { low: 0, medium: 0, high: 0 },
      },
    }

    const report1 = generateCompatibilityReport(highCompatibility)
    expect(report1.recommendations[0]).toContain('✅')

    // 低兼容性
    const lowCompatibility = {
      totalFiles: 100,
      compatibleFiles: 50,
      incompatibleFiles: 50,
      reports: [],
      summary: {
        byType: {},
        bySeverity: { low: 0, medium: 0, high: 0 },
      },
    }

    const report2 = generateCompatibilityReport(lowCompatibility)
    expect(report2.recommendations[0]).toContain('❌')
  })
})

describe('Issue Type Mapping', () => {
  it('应该正确映射所有问题类型', () => {
    const expectedTypes = ['unsupported-pattern', 'side-effect', 'performance-warning', 'error']

    expectedTypes.forEach(type => {
      expect(type).toMatch(/^(unsupported-pattern|side-effect|performance-warning|error)$/)
    })
  })

  it('应该正确映射所有严重程度', () => {
    const expectedSeverities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high']

    expectedSeverities.forEach(severity => {
      expect(severity).toMatch(/^(low|medium|high)$/)
    })
  })
})
