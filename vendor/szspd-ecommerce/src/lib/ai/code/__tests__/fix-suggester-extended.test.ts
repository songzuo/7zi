/**
 * @fileoverview 修复建议生成器扩展测试
 * @description 补充边界情况、错误处理和典型输入/输出验证测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { FixSuggester } from '../fix-suggester'
import type { SupportedLanguage, CodeRange } from '../types'

describe('FixSuggester 扩展测试', () => {
  let suggester: FixSuggester

  beforeEach(() => {
    suggester = new FixSuggester({ enableCache: false })
  })

  describe('空值处理修复增强', () => {
    it('应为链式属性访问生成可选链修复', async () => {
      const code = `
const city = user.profile.address.city;
      `
      const issues = [
        {
          type: 'null_reference',
          message: 'Potential null reference in chain',
          location: {
            start: { line: 2, column: 1 },
            end: { line: 2, column: 35 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'typescript')

      expect(fixes.length).toBeGreaterThan(0)
      const chainedFix = fixes.find(f => f.changes[0]?.newCode?.includes('?.'))
      expect(chainedFix).toBeDefined()
    })

    it('应为数组访问生成安全检查修复', async () => {
      const code = `
const firstItem = arr[0];
      `
      const issues = [
        {
          type: 'index_error',
          message: 'Array access without bounds check',
          location: {
            start: { line: 2, column: 1 },
            end: { line: 2, column: 25 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'typescript')

      expect(fixes.length).toBeGreaterThan(0)
    })

    it('应为解构赋值生成默认值修复', async () => {
      const code = `
const { name, age } = user;
      `
      const issues = [
        {
          type: 'null_reference',
          message: 'Potential null reference',
          location: {
            start: { line: 2, column: 1 },
            end: { line: 2, column: 26 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'typescript')

      expect(fixes.length).toBeGreaterThan(0)
    })
  })

  describe('异步代码修复增强', () => {
    it('应为 Promise 链生成 async/await 转换修复', async () => {
      const code = `
fetchData()
  .then(data => processData(data))
  .then(result => saveResult(result))
  .catch(error => console.error(error));
      `
      const issues = [
        {
          type: 'code_smell',
          message: 'Promise chain can be simplified',
          location: {
            start: { line: 2, column: 1 },
            end: { line: 5, column: 40 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'typescript')

      expect(fixes.length).toBeGreaterThan(0)
    })

    it('应为并行 await 生成 Promise.all 修复', async () => {
      const code = `
const user = await fetchUser();
const posts = await fetchPosts();
const comments = await fetchComments();
      `
      const issues = [
        {
          type: 'performance',
          message: 'Sequential awaits can be parallelized',
          location: {
            start: { line: 2, column: 1 },
            end: { line: 4, column: 37 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'typescript')

      expect(fixes.length).toBeGreaterThan(0)
    })

    it('应为未处理的 Promise rejection 生成修复', async () => {
      const code = `
async function fetch() {
  const response = await fetch(url);
  return response.json();
}
      `
      const issues = [
        {
          type: 'unhandled_exception',
          message: 'Unhandled exception',
          location: {
            start: { line: 3, column: 3 },
            end: { line: 3, column: 35 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'typescript')

      expect(fixes.length).toBeGreaterThan(0)
    })
  })

  describe('类型相关修复增强', () => {
    it('应为 any 类型生成更具体的类型修复', async () => {
      const code = `
const data: any = fetchData();
      `
      const issues = [
        {
          type: 'type_error',
          message: 'Avoid any type',
          location: {
            start: { line: 2, column: 1 },
            end: { line: 2, column: 28 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'typescript')

      expect(fixes.length).toBeGreaterThan(0)
    })

    it('应为类型断言生成更安全的类型守卫修复', async () => {
      const code = `
const element = document.getElementById('myId') as HTMLInputElement;
      `
      const issues = [
        {
          type: 'type_error',
          message: 'Unsafe type assertion',
          location: {
            start: { line: 2, column: 1 },
            end: { line: 2, column: 60 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'typescript')

      expect(fixes.length).toBeGreaterThan(0)
    })
  })

  describe('资源清理修复增强', () => {
    it('应为多个事件监听器生成清理修复', async () => {
      const code = `
element.addEventListener('click', handleClick);
element.addEventListener('mouseover', handleHover);
element.addEventListener('mouseout', handleOut);
      `
      const issues = [
        {
          type: 'event_listener_leak',
          message: 'Event listener leak',
          location: {
            start: { line: 2, column: 1 },
            end: { line: 4, column: 45 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'typescript')

      expect(fixes.length).toBeGreaterThan(0)
    })

    it('应为定时器生成 useEffect 清理修复', async () => {
      const code = `
function Component() {
  const timer = setTimeout(() => {}, 1000);
  return <div />;
}
      `
      const issues = [
        {
          type: 'interval_leak',
          message: 'Timer without cleanup',
          location: {
            start: { line: 3, column: 3 },
            end: { line: 3, column: 38 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'typescript')

      expect(fixes.length).toBeGreaterThan(0)
    })
  })

  describe('逻辑错误修复增强', () => {
    it('应为条件中的赋值生成比较修复', async () => {
      const code = `
if (status = 'active') {
  enableFeature();
}
      `
      const issues = [
        {
          type: 'assignment_in_condition',
          message: 'Assignment in condition',
          location: {
            start: { line: 2, column: 1 },
            end: { line: 2, column: 25 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'typescript')

      expect(fixes.length).toBeGreaterThan(0)
      const assignmentFix = fixes.find(f => 
        f.changes[0]?.newCode?.includes('===') || 
        f.changes[0]?.newCode?.includes('==')
      )
      expect(assignmentFix).toBeDefined()
    })

    it('应为重复的条件分支生成合并修复', async () => {
      const code = `
if (type === 'A') {
  processA();
} else if (type === 'B') {
  processA();
} else {
  processA();
}
      `
      const issues = [
        {
          type: 'logic_error',
          message: 'Identical branches',
          location: {
            start: { line: 2, column: 1 },
            end: { line: 8, column: 2 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'typescript')

      expect(fixes.length).toBeGreaterThan(0)
    })
  })

  describe('Python 特定修复', () => {
    it('应为可变默认参数生成 None 默认修复', async () => {
      const code = `
def append_item(item, items=[]):
    items.append(item)
    return items
      `
      const issues = [
        {
          type: 'python_mutable_default',
          message: 'Mutable default argument',
          location: {
            start: { line: 2, column: 1 },
            end: { line: 2, column: 30 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'python')

      expect(fixes.length).toBeGreaterThan(0)
      const mutableFix = fixes.find(f => 
        f.changes[0]?.newCode?.includes('None')
      )
      expect(mutableFix).toBeDefined()
    })

    it('应为裸 except 生成具体异常修复', async () => {
      const code = `
try:
    risky_operation()
except:
    pass
      `
      const issues = [
        {
          type: 'bare_except',
          message: 'Bare except catches all exceptions',
          location: {
            start: { line: 4, column: 1 },
            end: { line: 5, column: 9 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'python')

      expect(fixes.length).toBeGreaterThan(0)
    })
  })

  describe('Go 特定修复', () => {
    it('应为 goroutine 循环变量生成传参修复', async () => {
      const code = `
for _, item := range items {
    go func() {
        process(item)
    }()
}
      `
      const issues = [
        {
          type: 'go_goroutine_loop',
          message: 'Goroutine captures loop variable',
          location: {
            start: { line: 2, column: 1 },
            end: { line: 5, column: 4 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'go')

      expect(fixes.length).toBeGreaterThan(0)
    })

    it('应为未检查的错误生成错误处理修复', async () => {
      const code = `
func process() {
    data, err := readFile()
    processData(data)
}
      `
      const issues = [
        {
          type: 'go_error_check',
          message: 'Error not checked',
          location: {
            start: { line: 3, column: 5 },
            end: { line: 3, column: 26 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'go')

      expect(fixes.length).toBeGreaterThan(0)
    })
  })

  describe('Rust 特定修复', () => {
    it('应为 unwrap 生成 match 处理修复', async () => {
      const code = `
let value = some_option.unwrap();
      `
      const issues = [
        {
          type: 'rust_unwrap',
          message: 'Unwrap without error handling',
          location: {
            start: { line: 2, column: 1 },
            end: { line: 2, column: 32 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'rust')

      expect(fixes.length).toBeGreaterThan(0)
    })

    it('应为 panic 生成 Result 返回修复', async () => {
      const code = `
fn divide(a: i32, b: i32) -> i32 {
    if b == 0 {
        panic!("Division by zero");
    }
    a / b
}
      `
      const issues = [
        {
          type: 'rust_panic',
          message: 'Panic in function',
          location: {
            start: { line: 4, column: 9 },
            end: { line: 4, column: 33 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'rust')

      expect(fixes.length).toBeGreaterThan(0)
    })
  })

  describe('Diff 生成增强', () => {
    it('应生成多行变更的正确 diff', () => {
      const originalCode = `function test() {
  return 1;
}`
      const changes = [
        {
          filePath: 'test.ts',
          range: { start: { line: 1, column: 1 }, end: { line: 3, column: 1 } },
          oldCode: 'function test() {\n  return 1;\n}',
          newCode: 'function test(): number {\n  return 1;\n}',
          reason: 'Add return type',
        },
      ]

      const diff = suggester.generateDiff('test.ts', originalCode, changes)

      expect(diff.diff).toContain('---')
      expect(diff.diff).toContain('+++')
      expect(diff.stats.changes).toBe(1)
    })

    it('应计算正确的 diff 统计', () => {
      const originalCode = `const a = 1;
const b = 2;
const c = 3;`
      const changes = [
        {
          filePath: 'test.ts',
          range: { start: { line: 2, column: 1 }, end: { line: 2, column: 13 } },
          oldCode: 'const b = 2;',
          newCode: 'const b = 20;',
          reason: 'Update value',
        },
      ]

      const diff = suggester.generateDiff('test.ts', originalCode, changes)

      expect(diff.stats.additions).toBeGreaterThan(0)
      expect(diff.stats.deletions).toBeGreaterThan(0)
    })
  })

  describe('边界情况', () => {
    it('应处理无效的位置范围', async () => {
      const code = 'const x = 1;'
      const issues = [
        {
          type: 'test_issue',
          message: 'Test',
          location: {
            start: { line: 100, column: 100 },
            end: { line: 200, column: 200 },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'typescript')

      expect(fixes.length).toBeGreaterThan(0)
    })

    it('应处理空代码', async () => {
      const issues = [
        {
          type: 'test_issue',
          message: 'Test',
          location: {
            start: { line: 1, column: 1 },
            end: { line: 1, column: 1 },
          },
        },
      ]

      const fixes = await suggester.suggest('', issues, 'typescript')

      expect(Array.isArray(fixes)).toBe(true)
    })

    it('应处理超长代码行', async () => {
      const code = 'const x = "' + 'a'.repeat(10000) + '";'
      const issues = [
        {
          type: 'test_issue',
          message: 'Test',
          location: {
            start: { line: 1, column: 1 },
            end: { line: 1, column: code.length },
          },
        },
      ]

      const fixes = await suggester.suggest(code, issues, 'typescript')

      expect(Array.isArray(fixes)).toBe(true)
    })

    it('应处理大量问题', async () => {
      const code = 'const x = 1;'
      const issues = Array(100).fill(null).map((_, i) => ({
        type: 'test_issue',
        message: `Issue ${i}`,
        location: {
          start: { line: 1, column: 1 },
          end: { line: 1, column: 12 },
        },
      }))

      const start = Date.now()
      const fixes = await suggester.suggest(code, issues, 'typescript')
      const duration = Date.now() - start

      expect(duration).toBeLessThan(2000)
      expect(Array.isArray(fixes)).toBe(true)
    })
  })

  describe('多语言支持验证', () => {
    const languages: SupportedLanguage[] = ['typescript', 'javascript', 'python', 'go', 'rust']

    for (const language of languages) {
      it(`应为 ${language} 生成有效建议`, async () => {
        const code = 'const x = 1;'
        const issues = [
          {
            type: 'null_reference',
            message: 'Test issue',
            location: {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 12 },
            },
          },
        ]

        const fixes = await suggester.suggest(code, issues, language)

        expect(Array.isArray(fixes)).toBe(true)
        if (fixes.length > 0) {
          expect(fixes[0]).toHaveProperty('id')
          expect(fixes[0]).toHaveProperty('description')
          expect(fixes[0]).toHaveProperty('changes')
          expect(fixes[0]).toHaveProperty('riskLevel')
          expect(fixes[0]).toHaveProperty('estimatedSuccessRate')
        }
      })
    }
  })
})
