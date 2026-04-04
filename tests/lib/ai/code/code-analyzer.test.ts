/**
 * @fileoverview Code Analyzer 完整单元测试
 * @description 测试代码分析器的所有核心功能
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CodeAnalyzer, codeAnalyzer } from '@/lib/ai/code/code-analyzer'
import type { SupportedLanguage } from '@/lib/ai/code/types'

describe('CodeAnalyzer - 完整测试', () => {
  let analyzer: CodeAnalyzer

  beforeEach(() => {
    analyzer = new CodeAnalyzer({ enableCache: false })
  })

  describe('基础功能 - 正常输入/输出', () => {
    it('应该正确分析 TypeScript 代码', async () => {
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

    it('应该正确分析 JavaScript 代码', async () => {
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

    it('应该正确分析 Python 代码', async () => {
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

    it('应该正确分析 Go 代码', async () => {
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

    it('应该正确分析 Rust 代码', async () => {
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

  describe('复杂度计算 - 正常输入/输出', () => {
    it('应该正确计算圈复杂度 - 基础', async () => {
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

    it('应该正确计算圈复杂度 - 循环', async () => {
      const code = `
function process(items) {
  let result = 0;
  for (let i = 0; i < items.length; i++) {
    if (items[i] > 0) {
      result += items[i];
    }
  }
  return result;
}
      `

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.complexity.cyclomatic).toBeGreaterThanOrEqual(3)
    })

    it('应该正确计算认知复杂度', async () => {
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

    it('应该正确计算可维护性指数', async () => {
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

  describe('统计信息计算', () => {
    it('应该正确计算代码行数', async () => {
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
    })

    it('应该正确计算函数数量', async () => {
      const code = `
function func1() {}
function func2() {}
const func3 = () => {}
async function func4() {}
      `

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.stats.functions).toBeGreaterThan(0)
    })

    it('应该正确计算类数量', async () => {
      const code = `
class MyClass {}
interface MyInterface {}
type MyType = {}
      `

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.stats.classes).toBeGreaterThan(0)
    })
  })

  describe('依赖提取', () => {
    it('应该正确提取导入', async () => {
      const code = `
import { useState } from 'react';
import axios from 'axios';
import './styles.css';
      `

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.imports).toContain('react')
      expect(result.imports).toContain('axios')
    })

    it('应该过滤标准库依赖', async () => {
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

    it('应该正确处理 scoped packages', async () => {
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
    it('应该正确转换 offset 到位置', () => {
      const code = 'line1\nline2\nline3'
      const position = analyzer.getPositionFromOffset(code, 7)

      expect(position.line).toBe(2)
      expect(position.column).toBe(2)
    })

    it('应该正确转换位置到 offset', () => {
      const code = 'line1\nline2\nline3'
      const offset = analyzer.getOffsetFromPosition(code, { line: 2, column: 2 })

      expect(offset).toBe(7)
    })

    it('应该正确提取范围内的代码', () => {
      const code = 'line1\nline2\nline3\nline4'
      const range = {
        start: { line: 2, column: 1 },
        end: { line: 3, column: 4 },
      }

      const extracted = analyzer.getCodeInRange(code, range)

      expect(extracted).toContain('line2')
    })
  })

  describe('错误处理 - 边界条件', () => {
    it('应该处理空代码', async () => {
      const result = await analyzer.analyze('', 'typescript')

      expect(result.language).toBe('typescript')
      expect(result.stats.linesOfCode).toBe(0)
      expect(result.stats.functions).toBe(0)
    })

    it('应该处理只有注释的代码', async () => {
      const code = `
// This is a comment
/* Multi-line
   comment */
      `

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.stats.linesOfCode).toBe(0)
      expect(result.stats.commentLines).toBeGreaterThan(0)
    })

    it('应该处理包含特殊字符的代码', async () => {
      const code = `
const str = "Hello\\nWorld\\t!";
const regex = /\\d+/g;
const template = \`Value: \${x}\`;
      `

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.language).toBe('typescript')
    })

    it('应该处理超长行', async () => {
      const longLine = 'a'.repeat(10000)
      const code = `const x = "${longLine}";`

      const result = await analyzer.analyze(code, 'typescript')

      expect(result.stats.linesOfCode).toBe(1)
    })

    it('应该处理深度嵌套代码', async () => {
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

  describe('多语言支持', () => {
    const testCases: Array<{ language: SupportedLanguage; code: string; expectedFunctions: number }> = [
      { language: 'typescript', code: 'function add(a: number, b: number): number { return a + b; }', expectedFunctions: 1 },
      { language: 'javascript', code: 'function add(a, b) { return a + b; }', expectedFunctions: 1 },
      { language: 'python', code: 'def add(a, b):\n    return a + b', expectedFunctions: 1 },
      { language: 'go', code: 'func add(a int, b int) int {\n    return a + b\n}', expectedFunctions: 1 },
      { language: 'rust', code: 'fn add(a: i32, b: i32) -> i32 {\n    a + b\n}', expectedFunctions: 1 },
    ]

    testCases.forEach(({ language, code, expectedFunctions }) => {
      it(`应该支持 ${language}`, async () => {
        const result = await analyzer.analyze(code, language)

        expect(result.language).toBe(language)
        expect(result.stats.functions).toBeGreaterThanOrEqual(expectedFunctions)
      })
    })
  })

  describe('缓存功能', () => {
    it('启用缓存时应该缓存结果', async () => {
      const cachedAnalyzer = new CodeAnalyzer({ enableCache: true })
      const code = 'const x = 1;'

      const start1 = Date.now()
      await cachedAnalyzer.analyze(code, 'typescript')
      const time1 = Date.now() - start1

      const start2 = Date.now()
      await cachedAnalyzer.analyze(code, 'typescript')
      const time2 = Date.now() - start2

      expect(time2).toBeLessThanOrEqual(time1)
    })

    it('禁用缓存时不应该缓存结果', async () => {
      const uncachedAnalyzer = new CodeAnalyzer({ enableCache: false })
      const code = 'const x = 1;'

      const result1 = await uncachedAnalyzer.analyze(code, 'typescript')
      const result2 = await uncachedAnalyzer.analyze(code, 'typescript')

      expect(result1).toEqual(result2)
    })
  })

  describe('默认实例', () => {
    it('应该导出默认分析器实例', () => {
      expect(codeAnalyzer).toBeDefined()
      expect(codeAnalyzer).toBeInstanceOf(CodeAnalyzer)
    })
  })

  describe('配置选项', () => {
    it('应该接受自定义配置', () => {
      const customAnalyzer = new CodeAnalyzer({
        languages: ['typescript', 'javascript'],
        enableCache: false,
        verbose: true,
      })

      expect(customAnalyzer).toBeDefined()
    })
  })
})
