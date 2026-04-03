/**
 * @fileoverview 代码分析器单元测试
 * @description 为 v1.12.0 AI 代码智能系统编写单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CodeAnalyzer, codeAnalyzer } from '@/lib/ai/code/code-analyzer'
import type { SupportedLanguage } from '@/lib/ai/code/types'

describe('CodeAnalyzer', () => {
  let analyzer: CodeAnalyzer

  beforeEach(() => {
    analyzer = new CodeAnalyzer({ enableCache: false })
  })

  describe('should analyze TypeScript code complexity', () => {
    it('should calculate cyclomatic complexity for simple code', async () => {
      const code = `
function add(a: number, b: number): number {
  return a + b;
}
      `

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.complexity.cyclomatic).toBe(1) // Base complexity
    })

    it('should calculate higher cyclomatic complexity for conditional code', async () => {
      const code = `
function process(value: number): number {
  if (value > 0) {
    return value * 2;
  } else if (value < 0) {
    return value * 3;
  } else {
    return 0;
  }
}
      `

      const result = await analyzer.analyze(code, 'typescript')

      // Base 1 + 2 if statements = 3+
      expect(result.complexity.cyclomatic).toBeGreaterThanOrEqual(3)
    })

    it('should calculate cognitive complexity', async () => {
      const code = `
function nested(x: number): number {
  if (x > 0) {
    if (x > 10) {
      if (x > 100) {
        return x * 2;
      }
      return x;
    }
    return 0;
  }
  return -1;
}
      `

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.complexity.cognitive).toBeGreaterThan(0)
    })

    it('should calculate maintainability index', async () => {
      const code = `
function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
      `

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.complexity.maintainability).toBeGreaterThan(0)
      expect(result.complexity.maintainability).toBeLessThanOrEqual(100)
    })
  })

  describe('should extract imports and exports', () => {
    it('should extract named imports', async () => {
      const code = `
import { useState, useEffect } from 'react';
import axios from 'axios';
      `

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.imports).toContain('react')
      expect(result.imports).toContain('axios')
    })

    it('should extract default imports', async () => {
      const code = `
import Component from './Component';
import { helper } from './utils';
      `

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.imports.length).toBeGreaterThan(0)
    })

    it('should extract exports', async () => {
      const code = `
export function helper(): void {}
export const value = 42;
export class Service {}
      `

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.exports).toContain('helper')
      expect(result.exports.length).toBeGreaterThan(0)
    })

    it('should extract dependencies correctly', async () => {
      const code = `
import fs from 'fs';
import path from 'path';
import lodash from 'lodash';
import { Button } from '@mui/material';
import './styles.css';
      `

      const result = await analyzer.analyze(code, 'typescript')

      // Should filter out built-in modules
      expect(result.dependencies).not.toContain('fs')
      expect(result.dependencies).not.toContain('path')
      // Should include external packages
      expect(result.dependencies).toContain('lodash')
      expect(result.dependencies).toContain('@mui/material')
      // Should not include relative imports
      expect(result.dependencies).not.toContain('./styles.css')
    })
  })

  describe('should calculate cyclomatic complexity', () => {
    it('should count decision points correctly', async () => {
      const code = `
function test(x: number): number {
  let result = 0;
  if (x > 0) {
    result += 1;
  }
  if (x < 10) {
    result += 2;
  }
  for (let i = 0; i < 5; i++) {
    result += i;
  }
  return result;
}
      `

      const result = await analyzer.analyze(code, 'typescript')

      // Base 1 + 2 ifs + 1 for = 4
      expect(result.complexity.cyclomatic).toBeGreaterThanOrEqual(4)
    })

    it('should handle switch statements', async () => {
      const code = `
function getType(value: string): string {
  switch (value) {
    case 'a':
      return 'alpha';
    case 'b':
      return 'beta';
    case 'c':
      return 'gamma';
    default:
      return 'unknown';
  }
}
      `

      const result = await analyzer.analyze(code, 'typescript')

      // Base 1 + switch + cases
      expect(result.complexity.cyclomatic).toBeGreaterThan(1)
    })

    it('should handle ternary operators', async () => {
      const code = `
const result = condition ? value1 : value2;
      `

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.complexity.cyclomatic).toBeGreaterThan(0)
    })
  })

  describe('should handle malformed code gracefully', () => {
    it('should handle empty code', async () => {
      const result = await analyzer.analyze('', 'typescript')

      expect(result.language).toBe('typescript')
      expect(result.stats.linesOfCode).toBe(0)
      expect(result.stats.functions).toBe(0)
      expect(result.stats.classes).toBe(0)
    })

    it('should handle code with only comments', async () => {
      const code = `
// This is a comment
/* Multi-line
   comment */
// Another comment
      `

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.stats.linesOfCode).toBe(0)
      expect(result.stats.commentLines).toBeGreaterThan(0)
    })

    it('should handle syntax errors without crashing', async () => {
      const code = `
function broken( {
  missing closing paren
      `

      const result = await analyzer.analyze(code, 'typescript')

      expect(result).toBeDefined()
      expect(result.language).toBe('typescript')
    })

    it('should handle very long lines', async () => {
      const longLine = 'a'.repeat(10000)
      const code = `const x = "${longLine}";`

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.stats.linesOfCode).toBe(1)
    })

    it('should handle special characters', async () => {
      const code = `
const str = "Hello\\nWorld\\t!";
const regex = /\\d+/g;
const template = \`Value: \${x}\`;
      `

      const result = await analyzer.analyze(code, 'typescript')

      expect(result).toBeDefined()
      expect(result.stats.linesOfCode).toBeGreaterThan(0)
    })
  })

  describe('should support multiple languages', () => {
    it('should analyze JavaScript', async () => {
      const code = 'function add(a, b) { return a + b; }'

      const result = await analyzer.analyze(code, 'javascript')

      expect(result.language).toBe('javascript')
      expect(result.stats.functions).toBe(1)
    })

    it('should analyze Python', async () => {
      const code = `
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
      `

      const result = await analyzer.analyze(code, 'python')

      expect(result.language).toBe('python')
      expect(result.stats.functions).toBeGreaterThan(0)
    })

    it('should analyze Go', async () => {
      const code = `
func add(a int, b int) int {
    return a + b
}

func main() {
    result := add(1, 2)
    println(result)
}
      `

      const result = await analyzer.analyze(code, 'go')

      expect(result.language).toBe('go')
      expect(result.stats.functions).toBe(2)
    })

    it('should analyze Rust', async () => {
      const code = `
fn add(a: i32, b: i32) -> i32 {
    a + b
}

fn main() {
    let result = add(1, 2);
    println!("{}", result);
}
      `

      const result = await analyzer.analyze(code, 'rust')

      expect(result.language).toBe('rust')
      expect(result.stats.functions).toBe(2)
    })
  })

  describe('should count functions and classes', () => {
    it('should count standard functions', async () => {
      const code = `
function func1() {}
function func2() {}
const func3 = () => {}
async function func4() {}
      `

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.stats.functions).toBeGreaterThan(0)
    })

    it('should count classes', async () => {
      const code = `
class MyClass {}
interface MyInterface {}
type MyType = {}
      `

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.stats.classes).toBeGreaterThan(0)
    })

    it('should count lines correctly', async () => {
      const code = `
// Line 1
// Line 2
function test() {
  return 1;
}
// Line 5
      `

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.stats.linesOfCode).toBeGreaterThan(0)
      expect(result.stats.commentLines).toBeGreaterThan(0)
      expect(result.stats.blankLines).toBeGreaterThanOrEqual(0)
    })
  })

  describe('position conversion utilities', () => {
    it('should convert offset to position', () => {
      const code = 'line1\nline2\nline3'
      const position = analyzer.getPositionFromOffset(code, 7)

      expect(position.line).toBe(2)
      expect(position.column).toBe(2)
    })

    it('should convert position to offset', () => {
      const code = 'line1\nline2\nline3'
      const offset = analyzer.getOffsetFromPosition(code, { line: 2, column: 2 })

      expect(offset).toBe(7)
    })

    it('should get code in range', () => {
      const code = 'line1\nline2\nline3\nline4'
      const range = {
        start: { line: 2, column: 1 },
        end: { line: 3, column: 4 },
      }

      const extracted = analyzer.getCodeInRange(code, range)

      expect(extracted).toContain('line2')
    })
  })

  describe('caching', () => {
    it('should cache results when enabled', async () => {
      const cachedAnalyzer = new CodeAnalyzer({ enableCache: true })
      const code = 'const x = 1;'

      const result1 = await cachedAnalyzer.analyze(code, 'typescript')
      const result2 = await cachedAnalyzer.analyze(code, 'typescript')

      expect(result1).toEqual(result2)
    })

    it('should not cache when disabled', async () => {
      const uncachedAnalyzer = new CodeAnalyzer({ enableCache: false })
      const code = 'const x = 1;'

      const result1 = await uncachedAnalyzer.analyze(code, 'typescript')
      const result2 = await uncachedAnalyzer.analyze(code, 'typescript')

      expect(result1).toEqual(result2)
    })
  })

  describe('default instance', () => {
    it('should export default analyzer', () => {
      expect(codeAnalyzer).toBeDefined()
      expect(codeAnalyzer).toBeInstanceOf(CodeAnalyzer)
    })
  })

  describe('performance', () => {
    it('should handle large code efficiently', async () => {
      const lines: string[] = []
      for (let i = 0; i < 1000; i++) {
        lines.push(`function func${i}() { return ${i}; }`)
      }
      const code = lines.join('\n')

      const start = Date.now()
      const result = await analyzer.analyze(code, 'typescript')
      const duration = Date.now() - start

      expect(result).toBeDefined()
      expect(duration).toBeLessThan(5000)
    })
  })
})
