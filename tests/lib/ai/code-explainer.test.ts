/**
 * @fileoverview 代码解释器单元测试
 * @description 为 v1.12.0 AI 代码智能系统编写单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CodeExplainer, codeExplainer } from '@/lib/ai/code/code-explainer'
import type { SupportedLanguage } from '@/lib/ai/code/types'

describe('CodeExplainer', () => {
  let explainer: CodeExplainer

  beforeEach(() => {
    explainer = new CodeExplainer({ enableCache: false })
  })

  describe('should explain code in multiple languages', () => {
    it('should explain TypeScript code', async () => {
      const code = `
interface User {
  name: string;
  age: number;
}

function greet(user: User): string {
  return \`Hello, \${user.name}!\`;
}
      `

      const result = await explainer.explain(code, 'typescript')

      expect(result).toHaveProperty('summary')
      expect(result).toHaveProperty('details')
      expect(result).toHaveProperty('concepts')
      expect(result).toHaveProperty('snippetExplanations')
      expect(result).toHaveProperty('complexity')

      expect(result.summary).toContain('TypeScript')
      expect(result.concepts.length).toBeGreaterThan(0)
    })

    it('should explain JavaScript code', async () => {
      const code = `
function add(a, b) {
  return a + b;
}

const result = add(1, 2);
      `

      const result = await explainer.explain(code, 'javascript')

      expect(result.summary).toContain('JavaScript')
      expect(result.details.length).toBeGreaterThan(0)
    })

    it('should explain Python code', async () => {
      const code = `
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
      `

      const result = await explainer.explain(code, 'python')

      expect(result.summary).toContain('Python')
      expect(result.concepts).toContain('fibonacci')
    })

    it('should explain Go code', async () => {
      const code = `
func add(a int, b int) int {
    return a + b
}
      `

      const result = await explainer.explain(code, 'go')

      expect(result.summary).toContain('Go')
      expect(result.concepts).toContain('add')
    })

    it('should explain Rust code', async () => {
      const code = `
fn add(a: i32, b: i32) -> i32 {
    a + b
}
      `

      const result = await explainer.explain(code, 'rust')

      expect(result.summary).toContain('Rust')
      expect(result.concepts).toContain('add')
    })
  })

  describe('should generate comprehensive summaries', () => {
    it('should include language information', async () => {
      const code = 'const x = 1;'

      const result = await explainer.explain(code, 'typescript')

      expect(result.summary).toContain('TypeScript')
    })

    it('should include complexity assessment', async () => {
      const simpleCode = 'const x = 1;'
      const complexCode = `
function complex(a, b, c, d, e) {
  if (a > 0) {
    if (b > 0) {
      if (c > 0) {
        if (d > 0) {
          if (e > 0) {
            return a + b + c + d + e;
          }
        }
      }
    }
  }
  return 0;
}
      `

      const simpleResult = await explainer.explain(simpleCode, 'typescript')
      const complexResult = await explainer.explain(complexCode, 'typescript')

      expect(simpleResult.summary).toContain('复杂度')
      expect(complexResult.summary).toContain('复杂度')
    })
  })

  describe('should extract concepts', () => {
    it('should extract TypeScript concepts', async () => {
      const code = `
interface User {
  name: string;
}

type Role = 'admin' | 'user';

enum Status {
  Active,
  Inactive
}

class Service {}
      `

      const result = await explainer.explain(code, 'typescript')

      expect(result.concepts).toContain('User')
      expect(result.concepts).toContain('Role')
      expect(result.concepts).toContain('Status')
      expect(result.concepts).toContain('Service')
    })

    it('should extract Python concepts', async () => {
      const code = `
class User:
    pass

def process():
    pass
      `

      const result = await explainer.explain(code, 'python')

      expect(result.concepts).toContain('User')
      expect(result.concepts).toContain('process')
    })
  })

  describe('should analyze complexity', () => {
    it('should analyze time complexity', async () => {
      const code = `
function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
      `

      const result = await explainer.explain(code, 'typescript')

      expect(result.complexity).toHaveProperty('time')
      expect(result.complexity.time).toMatch(/O\(/)
    })

    it('should analyze space complexity', async () => {
      const code = `
function processData(data: number[]): number[] {
  return data.map(x => x * 2);
}
      `

      const result = await explainer.explain(code, 'typescript')

      expect(result.complexity).toHaveProperty('space')
      expect(result.complexity.space).toMatch(/O\(/)
    })
  })

  describe('should handle edge cases', () => {
    it('should handle empty code', async () => {
      const result = await explainer.explain('', 'typescript')

      expect(result.summary).toContain('TypeScript')
      expect(result.concepts.length).toBe(0)
    })

    it('should handle code with only comments', async () => {
      const code = `
// This is a comment
/* Multi-line comment */
      `

      const result = await explainer.explain(code, 'typescript')

      expect(result).toBeDefined()
    })

    it('should handle special characters', async () => {
      const code = `
const str = "Hello\\nWorld\\t!";
const regex = /\\d+/g;
      `

      const result = await explainer.explain(code, 'typescript')

      expect(result).toBeDefined()
    })

    it('should handle very long code', async () => {
      const lines: string[] = []
      for (let i = 0; i < 1000; i++) {
        lines.push(`const x${i} = ${i};`)
      }
      const code = lines.join('\n')

      const result = await explainer.explain(code, 'typescript')

      expect(result).toBeDefined()
    })
  })

  describe('caching', () => {
    it('should cache results when enabled', async () => {
      const cachedExplainer = new CodeExplainer({ enableCache: true })
      const code = 'const x = 1;'

      const result1 = await cachedExplainer.explain(code, 'typescript')
      const result2 = await cachedExplainer.explain(code, 'typescript')

      expect(result1).toEqual(result2)
    })
  })

  describe('default instance', () => {
    it('should export default explainer', () => {
      expect(codeExplainer).toBeDefined()
      expect(codeExplainer).toBeInstanceOf(CodeExplainer)
    })
  })
})
