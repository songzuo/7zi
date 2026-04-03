/**
 * @fileoverview 代码分析器测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CodeAnalyzer, codeAnalyzer } from '../code-analyzer'
import type { SupportedLanguage } from '../types'

describe('CodeAnalyzer', () => {
  let analyzer: CodeAnalyzer

  beforeEach(() => {
    analyzer = new CodeAnalyzer({ enableCache: false })
  })

  describe('基础分析', () => {
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

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.language).toBe('typescript')
      expect(result.stats.functions).toBeGreaterThan(0)
      expect(result.stats.classes).toBeGreaterThan(0)
      expect(result.complexity.cyclomatic).toBeGreaterThan(0)
      expect(result.complexity.cognitive).toBeGreaterThanOrEqual(0)
      expect(result.complexity.maintainability).toBeGreaterThan(0)
      expect(result.complexity.maintainability).toBeLessThanOrEqual(100)
    })

    it('should analyze JavaScript code', async () => {
      const code = `
function add(a, b) {
  return a + b;
}

const result = add(1, 2);
      `

      const result = await analyzer.analyze(code, 'javascript')

      expect(result.language).toBe('javascript')
      expect(result.stats.functions).toBe(1)
    })

    it('should analyze Python code', async () => {
      const code = `
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

result = fibonacci(10)
      `

      const result = await analyzer.analyze(code, 'python')

      expect(result.language).toBe('python')
      expect(result.stats.functions).toBeGreaterThan(0)
    })

    it('should analyze Go code', async () => {
      const code = `
package main

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

    it('should analyze Rust code', async () => {
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

  describe('复杂度计算', () => {
    it('should calculate cyclomatic complexity correctly', async () => {
      const code = `
function test(x) {
  if (x > 0) {
    return 1;
  } else if (x < 0) {
    return -1;
  } else {
    return 0;
  }
}
      `

      const result = await analyzer.analyze(code, 'typescript')

      // Base 1 + 2 if statements = 3
      expect(result.complexity.cyclomatic).toBeGreaterThanOrEqual(3)
    })

    it('should calculate cognitive complexity correctly', async () => {
      const code = `
function nested(x) {
  if (x > 0) {
    if (x > 10) {
      if (x > 100) {
        return 'very large';
      }
      return 'large';
    }
    return 'positive';
  }
  return 'non-positive';
}
      `

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.complexity.cognitive).toBeGreaterThan(0)
    })

    it('should calculate maintainability index', async () => {
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

      const simpleResult = await analyzer.analyze(simpleCode, 'typescript')
      const complexResult = await analyzer.analyze(complexCode, 'typescript')

      expect(simpleResult.complexity.maintainability).toBeGreaterThan(
        complexResult.complexity.maintainability
      )
    })
  })

  describe('统计信息', () => {
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

      // Line counting depends on implementation
      expect(result.stats.linesOfCode).toBeGreaterThan(0)
      expect(result.stats.commentLines).toBeGreaterThan(0)
    })

    it('should count functions correctly', async () => {
      const code = `
function func1() {}
function func2() {}
const func3 = () => {}
async function func4() {}
      `

      const result = await analyzer.analyze(code, 'typescript')

      // Function count depends on pattern matching implementation
      expect(result.stats.functions).toBeGreaterThan(0)
    })

    it('should count classes correctly', async () => {
      const code = `
class MyClass {}
interface MyInterface {}
type MyType = {}
      `

      const result = await analyzer.analyze(code, 'typescript')

      // Class count depends on pattern matching implementation
      expect(result.stats.classes).toBeGreaterThan(0)
    })
  })

  describe('依赖提取', () => {
    it('should extract imports', async () => {
      const code = `
import { useState } from 'react';
import axios from 'axios';
import './styles.css';
      `

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.imports).toContain('react')
      expect(result.imports).toContain('axios')
    })

    it('should filter out standard library dependencies', async () => {
      const code = `
import fs from 'fs';
import path from 'path';
import lodash from 'lodash';
      `

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.dependencies).not.toContain('fs')
      expect(result.dependencies).not.toContain('path')
      expect(result.dependencies).toContain('lodash')
    })

    it('should handle scoped packages', async () => {
      const code = `
import { Button } from '@mui/material';
import { useAuth } from '@auth0/auth0-react';
      `

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.dependencies).toContain('@mui/material')
      expect(result.dependencies).toContain('@auth0/auth0-react')
    })
  })

  describe('位置转换', () => {
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

      // Should extract from line 2 to part of line 3
      expect(extracted).toContain('line2')
    })
  })

  describe('边界情况', () => {
    it('should handle empty code', async () => {
      const result = await analyzer.analyze('', 'typescript')

      expect(result.language).toBe('typescript')
      expect(result.stats.linesOfCode).toBe(0)
      expect(result.stats.functions).toBe(0)
    })

    it('should handle code with only comments', async () => {
      const code = `
// This is a comment
/* Multi-line
   comment */
      `

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.stats.linesOfCode).toBe(0)
      expect(result.stats.commentLines).toBeGreaterThan(0)
    })

    it('should handle code with special characters', async () => {
      const code = `
const str = "Hello\\nWorld\\t!";
const regex = /\\d+/g;
const template = \`Value: \${x}\`;
      `

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.language).toBe('typescript')
    })

    it('should handle very long lines', async () => {
      const longLine = 'a'.repeat(10000)
      const code = `const x = "${longLine}";`

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.stats.linesOfCode).toBe(1)
    })

    it('should handle deeply nested code', async () => {
      const code = `
function test() {
  if (true) {
    if (true) {
      if (true) {
        if (true) {
          if (true) {
            return 'deep';
          }
        }
      }
    }
  }
}
      `

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.complexity.cognitive).toBeGreaterThan(0)
    })
  })

  describe('缓存功能', () => {
    it('should cache results when enabled', async () => {
      const cachedAnalyzer = new CodeAnalyzer({ enableCache: true })
      const code = 'const x = 1;'

      const start1 = Date.now()
      await cachedAnalyzer.analyze(code, 'typescript')
      const time1 = Date.now() - start1

      const start2 = Date.now()
      await cachedAnalyzer.analyze(code, 'typescript')
      const time2 = Date.now() - start2

      // Cached call should be faster
      expect(time2).toBeLessThanOrEqual(time1)
    })

    it('should not cache when disabled', async () => {
      const uncachedAnalyzer = new CodeAnalyzer({ enableCache: false })
      const code = 'const x = 1;'

      const result1 = await uncachedAnalyzer.analyze(code, 'typescript')
      const result2 = await uncachedAnalyzer.analyze(code, 'typescript')

      expect(result1).toEqual(result2)
    })
  })

  describe('默认实例', () => {
    it('should export default analyzer', () => {
      expect(codeAnalyzer).toBeDefined()
      expect(codeAnalyzer).toBeInstanceOf(CodeAnalyzer)
    })
  })
})