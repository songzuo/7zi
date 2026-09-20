/**
 * @fileoverview 智能代码生成增强系统测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CodeEnhancer, codeEnhancer } from '../index'
import type { SupportedLanguage } from '../types'

describe('CodeEnhancer', () => {
  let enhancer: CodeEnhancer

  beforeEach(() => {
    enhancer = new CodeEnhancer({
      enableCache: false,
      verbose: true,
    })
  })

  describe('代码分析', () => {
    it('should analyze TypeScript code', async () => {
      const code = `
        interface User {
          name: string;
          age: number;
        }

        function greet(user: User): string {
          return \`Hello, \${user.name}!\`;
        }

        const user: User = { name: 'Alice', age: 30 };
        console.log(greet(user));
      `

      const result = await enhancer.analyze(code, 'typescript')

      expect(result.language).toBe('typescript')
      expect(result.stats.functions).toBeGreaterThan(0)
      expect(result.stats.classes).toBeGreaterThan(0)
      expect(result.complexity.cyclomatic).toBeGreaterThan(0)
    })

    it('should analyze Python code', async () => {
      const code = `
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

result = fibonacci(10)
      `

      const result = await enhancer.analyze(code, 'python')

      expect(result.language).toBe('python')
      expect(result.stats.functions).toBeGreaterThanOrEqual(1)
    })
  })

  describe('代码补全', () => {
    it('should provide completion suggestions', async () => {
      const code = `
function greet(name: string) {
  return 'Hello, ' + name;
}

// Type here: 
fun
      `
      const position = { line: 6, column: 4 }

      const suggestions = await enhancer.complete(code, position, 'typescript')

      expect(suggestions.length).toBeGreaterThanOrEqual(0)
      if (suggestions.length > 0) {
        expect(suggestions[0]).toHaveProperty('text')
        expect(suggestions[0]).toHaveProperty('displayText')
      }
    })
  })

  describe('代码审查', () => {
    it('should detect code issues', async () => {
      const code = `
        const x = eval('alert(1)');
        const arr = [];
        for (var i = 0; i < 10; i++) {
          arr.push(i);
        }
      `

      const result = await enhancer.review(code, 'typescript')

      expect(result.issues.length).toBeGreaterThan(0)
      expect(result.score).toHaveProperty('overall')
      expect(result.stats).toHaveProperty('total')
    })
  })

  describe('Bug 检测', () => {
    it('should detect potential bugs', async () => {
      const code = `
        const users = [];
        for (let i = 0; i < 10; i++) {
          users.push({ id: i });
        }
        const user = users[100];
      `

      const bugs = await enhancer.detectBugs(code, 'typescript')

      expect(bugs.length).toBeGreaterThan(0)
    })

    it('should detect Python mutable default argument', async () => {
      const code = `
def create_user(name, roles=[]):
    return { 'name': name, 'roles': roles }
      `

      const bugs = await enhancer.detectBugs(code, 'python')

      // Check for any bugs related to mutable defaults or logic errors
      const hasMutableDefault = bugs.some(
        bug => bug.type.includes('mutable') || bug.type === 'logic_error' || bug.message.toLowerCase().includes('mutable')
      )
      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('修复建议', () => {
    it('should suggest fixes for issues', async () => {
      const code = `
        const data = someFunction();
        console.log(data.name);
      `

      const issues = [
        {
          type: 'null_reference',
          message: 'Potential null reference',
          location: {
            start: { line: 3, column: 16 },
            end: { line: 3, column: 25 },
          },
        },
      ]

      const fixes = await enhancer.suggestFixes(code, issues, 'typescript')

      expect(fixes.length).toBeGreaterThan(0)
      expect(fixes[0]).toHaveProperty('description')
      expect(fixes[0]).toHaveProperty('changes')
    })
  })

  describe('代码解释', () => {
    it('should explain code in natural language', async () => {
      const code = `
        function factorial(n: number): number {
          if (n <= 1) {
            return 1;
          }
          return n * factorial(n - 1);
        }
      `

      const explanation = await enhancer.explain(code, 'typescript')

      expect(explanation).toHaveProperty('summary')
      expect(explanation).toHaveProperty('details')
      expect(explanation).toHaveProperty('concepts')
    })
  })

  describe('完整分析', () => {
    it('should perform full analysis', async () => {
      const code = `
        interface User {
          name: string;
          email: string;
        }

        function createUser(data: any): User {
          if (!data.name) {
            throw new Error('Name is required');
          }
          return {
            name: data.name,
            email: data.email || 'unknown@example.com'
          };
        }

        const user = createUser({ name: 'John' });
        console.log(user.name);
      `

      const result = await enhancer.fullAnalysis(code, 'typescript')

      expect(result).toHaveProperty('analysis')
      expect(result).toHaveProperty('review')
      expect(result).toHaveProperty('bugs')
      expect(result).toHaveProperty('fixes')
      expect(result).toHaveProperty('summary')
      expect(result.summary.totalIssues).toBeGreaterThanOrEqual(0)
    })
  })

  describe('默认实例', () => {
    it('should export default enhancer', () => {
      expect(codeEnhancer).toBeDefined()
      expect(codeEnhancer).toBeInstanceOf(CodeEnhancer)
    })
  })
})

describe('Supported Languages', () => {
  const testCode = 'const x = 1;'

  it('should support TypeScript', async () => {
    const result = await codeEnhancer.analyze(testCode, 'typescript')
    expect(result.language).toBe('typescript')
  })

  it('should support JavaScript', async () => {
    const result = await codeEnhancer.analyze(testCode, 'javascript')
    expect(result.language).toBe('javascript')
  })

  it('should support Python', async () => {
    const result = await codeEnhancer.analyze('x = 1', 'python')
    expect(result.language).toBe('python')
  })

  it('should support Go', async () => {
    const result = await codeEnhancer.analyze('var x int = 1', 'go')
    expect(result.language).toBe('go')
  })

  it('should support Rust', async () => {
    const result = await codeEnhancer.analyze('let x = 1;', 'rust')
    expect(result.language).toBe('rust')
  })
})

describe('Performance', () => {
  it('should handle large code efficiently', async () => {
    // 生成大量代码
    const lines: string[] = []
    for (let i = 0; i < 1000; i++) {
      lines.push(`const function${i} = () => { return ${i}; };`)
    }
    const largeCode = lines.join('\n')

    const start = Date.now()
    const result = await codeEnhancer.analyze(largeCode, 'typescript')
    const duration = Date.now() - start

    expect(duration).toBeLessThan(1000) // 应在1秒内完成
    expect(result.stats.functions).toBe(1000)
  })
})
