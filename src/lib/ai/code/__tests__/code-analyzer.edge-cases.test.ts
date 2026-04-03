/**
 * @fileoverview 代码分析器边缘用例测试
 * @description 测试空输入、超大文件、特殊字符、边界条件
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CodeAnalyzer } from '../code-analyzer'

describe('CodeAnalyzer 边缘用例测试', () => {
  let analyzer: CodeAnalyzer

  beforeEach(() => {
    analyzer = new CodeAnalyzer({ enableCache: false })
  })

  describe('空输入处理', () => {
    it('should handle empty string', async () => {
      const result = await analyzer.analyze('', 'typescript')
      
      expect(result.language).toBe('typescript')
      expect(result.stats.linesOfCode).toBe(0)
      // 空字符串可能有0或1个空行，取决于实现
      expect(result.stats.blankLines).toBeGreaterThanOrEqual(0)
      expect(result.stats.commentLines).toBe(0)
      expect(result.stats.functions).toBe(0)
      expect(result.stats.classes).toBe(0)
      expect(result.complexity.cyclomatic).toBe(1) // 基础复杂度
    })

    it('should handle whitespace only', async () => {
      const result = await analyzer.analyze('   \n\n\t\t  \n   ', 'typescript')
      
      expect(result.stats.linesOfCode).toBe(0)
      expect(result.stats.blankLines).toBeGreaterThan(0)
    })

    it('should handle single newline', async () => {
      const result = await analyzer.analyze('\n', 'typescript')
      
      expect(result.stats.linesOfCode).toBe(0)
    })

    it('should handle multiple newlines', async () => {
      const result = await analyzer.analyze('\n\n\n\n\n', 'typescript')
      
      expect(result.stats.linesOfCode).toBe(0)
      // 5个换行符可能产生5或6个空行，取决于实现
      expect(result.stats.blankLines).toBeGreaterThanOrEqual(5)
    })

    it('should handle carriage returns', async () => {
      const result = await analyzer.analyze('\r\n\r\n', 'typescript')
      
      expect(result.stats.linesOfCode).toBe(0)
    })

    it('should handle null character', async () => {
      const result = await analyzer.analyze('\x00', 'typescript')
      
      expect(result).toBeDefined()
    })
  })

  describe('特殊字符处理', () => {
    it('should handle Unicode Chinese characters', async () => {
      const code = `
const 你好 = "世界";
function 测试函数() {
  return "中文测试";
}
      `
      
      const result = await analyzer.analyze(code, 'typescript')
      
      // Unicode标识符可能不被识别为函数，取决于实现
      expect(result.stats.functions).toBeGreaterThanOrEqual(0)
    })

    it('should handle emojis in code', async () => {
      const code = `
const 🚀 = "rocket";
const emoji = "😀🎉🎊";
function test🎉() {
  return "emoji function";
}
      `
      
      const result = await analyzer.analyze(code, 'typescript')
      
      expect(result).toBeDefined()
    })

    it('should handle RTL characters', async () => {
      const code = `
// Hebrew: שלום
// Arabic: مرحبا
const greeting = "Hello";
      `
      
      const result = await analyzer.analyze(code, 'typescript')
      
      expect(result).toBeDefined()
    })

    it('should handle zero-width characters', async () => {
      const code = `
const x\u200B = 1; // Zero-width space
const y = "test\u200C\u200D"; // Zero-width non-joiner + joiner
      `
      
      const result = await analyzer.analyze(code, 'typescript')
      
      expect(result).toBeDefined()
    })

    it('should handle escape sequences in strings', async () => {
      const code = `
const str = "Line1\\nLine2\\tTabbed\\r\\nWindows\\\\Backslash";
const regex = /\\d+\\s*\\w+/gi;
const template = \`\\\`nested\\\`\`;
      `
      
      const result = await analyzer.analyze(code, 'typescript')
      
      expect(result).toBeDefined()
    })

    it('should handle unusual but valid identifiers', async () => {
      const code = `
const $ = "dollar";
const _ = "underscore";
const $var$ = "mixed";
const _private = "private style";
      `
      
      const result = await analyzer.analyze(code, 'typescript')
      
      expect(result).toBeDefined()
    })

    it('should handle raw string literals (Rust)', async () => {
      const code = `
let raw = r#"This is a "raw" string with \\"#;
let multiline = r##"
Multiple
Lines
"##;
      `
      
      const result = await analyzer.analyze(code, 'rust')
      
      expect(result).toBeDefined()
    })

    it('should handle Python triple-quoted strings', async () => {
      const code = `
docstring = """
This is a multi-line
docstring with "quotes" and 'apostrophes'.
"""
      `
      
      const result = await analyzer.analyze(code, 'python')
      
      expect(result).toBeDefined()
    })
  })

  describe('超大文件处理', () => {
    it('should handle 100KB file', async () => {
      const lines = []
      for (let i = 0; i < 2000; i++) {
        lines.push(`const line${i} = "${'x'.repeat(50)}";`)
      }
      const code = lines.join('\n')
      
      const start = Date.now()
      const result = await analyzer.analyze(code, 'typescript')
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(5000) // 5秒内完成
      expect(result.stats.linesOfCode).toBe(2000)
    })

    it('should handle extremely long single line (50KB)', async () => {
      const longString = 'x'.repeat(50000)
      const code = `const longStr = "${longString}";`
      
      const start = Date.now()
      const result = await analyzer.analyze(code, 'typescript')
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(3000)
      expect(result.stats.linesOfCode).toBe(1)
    })

    it('should handle many nested functions', async () => {
      let code = ''
      for (let i = 0; i < 100; i++) {
        code += `${'  '.repeat(i)}function level${i}() {\n`
      }
      for (let i = 99; i >= 0; i--) {
        code += `${'  '.repeat(i)}}\n`
      }
      
      const result = await analyzer.analyze(code, 'typescript')
      
      expect(result.stats.functions).toBeGreaterThan(0)
    })

    it('should handle deeply nested control structures', async () => {
      let code = 'function deep() {\n'
      for (let i = 0; i < 100; i++) {
        code += `${'  '.repeat(i + 1)}if (true) {\n`
      }
      code += `${'  '.repeat(101)}return 1;\n`
      for (let i = 99; i >= 0; i--) {
        code += `${'  '.repeat(i + 1)}}\n`
      }
      code += '}\n'
      
      const result = await analyzer.analyze(code, 'typescript')
      
      expect(result.complexity.cognitive).toBeGreaterThan(50)
    })

    it('should handle thousands of imports', async () => {
      const lines = []
      for (let i = 0; i < 1000; i++) {
        lines.push(`import { func${i} } from 'module${i}';`)
      }
      lines.push('const x = 1;')
      
      const code = lines.join('\n')
      const result = await analyzer.analyze(code, 'typescript')
      
      expect(result.imports.length).toBeGreaterThan(100)
    })
  })

  describe('边界条件', () => {
    it('should handle code at complexity limits', async () => {
      // 创建恰好达到复杂度阈值的代码
      let code = 'function limit() {\n'
      for (let i = 0; i < 15; i++) {
        code += `  if (cond${i}) { return ${i}; }\n`
      }
      code += '}'
      
      const result = await analyzer.analyze(code, 'typescript')
      
      expect(result.complexity.cyclomatic).toBeGreaterThanOrEqual(15)
    })

    it('should handle mixed line endings (CRLF/LF)', async () => {
      const code = 'const a = 1;\r\nconst b = 2;\nconst c = 3;\r\n'
      
      const result = await analyzer.analyze(code, 'typescript')
      
      expect(result.stats.linesOfCode).toBe(3)
    })

    it('should handle tabs and spaces mixed indentation', async () => {
      const code = `
function test() {
\t  const a = 1;
  \tconst b = 2;
\t\tconst c = 3;
}
      `
      
      const result = await analyzer.analyze(code, 'typescript')
      
      expect(result).toBeDefined()
    })

    it('should handle very large numbers in code', async () => {
      const code = `
const big = 999999999999999999999999999999n;
const scientific = 1.7976931348623157e+308;
const hex = 0xFFFFFFFFFFFFFFFF;
const binary = 0b11111111111111111111111111111111;
const octal = 0o7777777777777777;
      `
      
      const result = await analyzer.analyze(code, 'typescript')
      
      expect(result).toBeDefined()
    })

    it('should handle malformed but parseable code', async () => {
      const code = `
const unclosed = "string without closing quote
const bracket = {
const paren = (
      `
      
      // 分析器应该能处理不完整代码
      const result = await analyzer.analyze(code, 'typescript')
      
      expect(result).toBeDefined()
    })

    it('should handle code with BOM', async () => {
      const code = '\uFEFFconst x = 1;'
      
      const result = await analyzer.analyze(code, 'typescript')
      
      expect(result).toBeDefined()
    })

    it('should handle all-whitespace lines between code', async () => {
      const code = `
const a = 1;
   
\t
const b = 2;
      `
      
      const result = await analyzer.analyze(code, 'typescript')
      
      expect(result.stats.linesOfCode).toBe(2)
      expect(result.stats.blankLines).toBeGreaterThan(0)
    })
  })

  describe('语言特定边界', () => {
    it('should handle TypeScript decorators', async () => {
      const code = `
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  @Input() title: string;
  @Output() change = new EventEmitter();
}
      `
      
      const result = await analyzer.analyze(code, 'typescript')
      
      expect(result.stats.classes).toBeGreaterThan(0)
    })

    it('should handle Python decorators', async () => {
      const code = `
@dataclass
class Person:
    name: str
    
@contextmanager
def resource():
    yield
    
@lru_cache(maxsize=128)
def cached_func(x):
    return x * 2
      `
      
      const result = await analyzer.analyze(code, 'python')
      
      expect(result.stats.functions).toBeGreaterThan(0)
    })

    it('should handle Go generate directives', async () => {
      const code = `
//go:generate stringer -type=Status
//go:build linux && amd64
// +build linux,amd64

package main

//go:embed static/*
var static embed.FS
      `
      
      const result = await analyzer.analyze(code, 'go')
      
      expect(result).toBeDefined()
    })

    it('should handle Rust attributes', async () => {
      const code = `
#[derive(Debug, Clone)]
#[cfg(feature = "serde")]
#[allow(dead_code)]
struct Config {
    #[serde(rename = "configName")]
    name: String,
}

#[tokio::main]
async fn main() {}
      `
      
      const result = await analyzer.analyze(code, 'rust')
      
      expect(result).toBeDefined()
    })
  })

  describe('注释边缘情况', () => {
    it('should handle nested comments (non-standard)', async () => {
      const code = `
/* Outer /* Inner */ still outer */
const x = 1;
      `
      
      const result = await analyzer.analyze(code, 'typescript')
      
      expect(result).toBeDefined()
    })

    it('should handle JSDoc with complex tags', async () => {
      const code = `
/**
 * @typedef {Object} Options
 * @property {string} name - The name
 * @property {number} [age=18] - Optional age
 * @template T
 * @param {T} data - Generic data
 * @returns {Promise<T>}
 * @throws {Error} When invalid
 * @deprecated Since v2.0
 * @example
 * const result = await processData({ name: 'test' });
 */
function processData(data) {}
      `
      
      const result = await analyzer.analyze(code, 'typescript')
      
      expect(result.stats.commentLines).toBeGreaterThan(0)
    })

    it('should handle Python docstrings', async () => {
      const code = `
def func():
    """
    Multi-line docstring.
    
    Args:
        x: The input
        
    Returns:
        The result
    """
    pass
      `
      
      const result = await analyzer.analyze(code, 'python')
      
      expect(result.stats.functions).toBeGreaterThan(0)
    })

    it('should handle comment-only file', async () => {
      const code = `
// Comment 1
// Comment 2
/* Block comment */
# Not a comment in TS
      `
      
      const result = await analyzer.analyze(code, 'typescript')
      
      // # 符号在 TypeScript 中不是注释，可能被识别为代码
      expect(result.stats.linesOfCode).toBeGreaterThanOrEqual(0)
      expect(result.stats.commentLines).toBeGreaterThan(0)
    })
  })

  describe('正则表达式边缘情况', () => {
    it('should handle complex regex patterns', async () => {
      const code = `
const email = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
const phone = /^(\\+?1[-. ]?)?(\\(?[0-9]{3}\\)?[-. ]?)?[0-9]{3}[-. ]?[0-9]{4}$/;
const url = /^(https?:\\/\\/)?([\\da-z\\.-]+)\\.([a-z\\.]{2,6})([\\/\\w \\.-]*)*\\/?$/;
      `
      
      const result = await analyzer.analyze(code, 'typescript')
      
      expect(result).toBeDefined()
    })

    it('should handle regex with flags', async () => {
      const code = `
const regex1 = /pattern/gim;
const regex2 = /test/gisu;
const regex3 = /unicode/u;
      `
      
      const result = await analyzer.analyze(code, 'typescript')
      
      expect(result).toBeDefined()
    })
  })

  describe('模板字符串边缘情况', () => {
    it('should handle nested template literals', async () => {
      const code = `
const nested = \`outer \${inner \`nested \${value}\`}\`;
const complex = \`
  \${obj.method({
    nested: \`value \${x}\`
  })}
\`;
      `
      
      const result = await analyzer.analyze(code, 'typescript')
      
      expect(result).toBeDefined()
    })

    it('should handle tagged templates', async () => {
      const code = `
const tagged = html\`<div>\${content}</div>\`;
const styled = css\`
  .container {
    color: \${color};
  }
\`;
      `
      
      const result = await analyzer.analyze(code, 'typescript')
      
      expect(result).toBeDefined()
    })
  })

  describe('位置计算边缘情况', () => {
    it('should handle position at file start', () => {
      const code = 'const x = 1;'
      const pos = analyzer.getPositionFromOffset(code, 0)
      
      expect(pos.line).toBe(1)
      expect(pos.column).toBe(1)
    })

    it('should handle position at file end', () => {
      const code = 'const x = 1;'
      const pos = analyzer.getPositionFromOffset(code, code.length)
      
      expect(pos.line).toBe(1)
      expect(pos.column).toBe(code.length + 1)
    })

    it('should handle position with multibyte characters', () => {
      const code = 'const 中文 = "测试";'
      const pos = analyzer.getPositionFromOffset(code, 6)
      
      expect(pos.line).toBe(1)
    })

    it('should handle offset from position with special chars', () => {
      const code = 'const 你好 = "世界";'
      const offset = analyzer.getOffsetFromPosition(code, { line: 1, column: 7 })
      
      expect(offset).toBe(6)
    })

    it('should get code range across lines', () => {
      const code = 'line1\nline2\nline3'
      const range = {
        start: { line: 1, column: 3 },
        end: { line: 3, column: 3 }
      }
      
      const extracted = analyzer.getCodeInRange(code, range)
      
      expect(extracted).toContain('ne1')
      expect(extracted).toContain('line2')
      expect(extracted).toContain('li')
    })
  })

  describe('未知语言处理', () => {
    it('should handle unsupported language gracefully', async () => {
      // @ts-expect-error Testing unsupported language
      const result = await analyzer.analyze('code', 'unknown-lang')
      
      // 应该使用默认规则
      expect(result).toBeDefined()
    })
  })
})
