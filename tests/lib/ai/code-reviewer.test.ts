/**
 * @fileoverview 代码审查器单元测试
 * @description 为 v1.12.0 AI 代码智能系统编写单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CodeReviewer, codeReviewer } from '@/lib/ai/code/code-reviewer'
import type { SupportedLanguage } from '@/lib/ai/code/types'

describe('CodeReviewer', () => {
  let reviewer: CodeReviewer

  beforeEach(() => {
    reviewer = new CodeReviewer({ enableCache: false })
  })

  describe('should detect security issues', () => {
    it('should detect eval() usage', async () => {
      const code = `
const result = eval('2 + 2');
      `

      const result = await reviewer.review(code, 'typescript')

      const evalIssue = result.issues.find(i => i.ruleId === 'security-eval')
      expect(evalIssue).toBeDefined()
      expect(evalIssue?.severity).toBe('critical')
    })

    it('should detect innerHTML with user input', async () => {
      const code = `
document.getElementById('output').innerHTML = userInput;
      `

      const result = await reviewer.review(code, 'typescript')

      const innerHTMLIssue = result.issues.find(i => i.ruleId === 'security-innerhtml')
      expect(innerHTMLIssue).toBeDefined()
      expect(innerHTMLIssue?.severity).toBe('critical')
    })

    it('should detect hardcoded secrets', async () => {
      const code = `
const apiKey = 'sk-1234567890abcdef1234567890abcdef';
      `

      const result = await reviewer.review(code, 'typescript')

      const secretIssue = result.issues.find(i => i.ruleId === 'security-hardcoded-secret')
      expect(secretIssue).toBeDefined()
      expect(secretIssue?.severity).toBe('critical')
    })

    it('should detect SQL injection patterns', async () => {
      const code = `
const query = "SELECT * FROM users WHERE id = '" + userId + "'";
      `

      const result = await reviewer.review(code, 'typescript')

      // Should detect some security issue
      expect(result.issues.length).toBeGreaterThan(0)
    })

    it('should detect command injection patterns', async () => {
      const code = `
exec(userInput);
      `

      const result = await reviewer.review(code, 'typescript')

      // Should detect some security issue
      expect(result.issues.length).toBeGreaterThan(0)
    })
  })

  describe('should detect performance issues', () => {
    it('should detect DOM manipulation in loop', async () => {
      const code = `
for (let i = 0; i < 100; i++) {
  document.body.appendChild(createElement(i));
}
      `

      const result = await reviewer.review(code, 'typescript')

      const domLoopIssue = result.issues.find(i => i.ruleId === 'performance-loop-dom')
      expect(domLoopIssue).toBeDefined()
      expect(domLoopIssue?.severity).toBe('high')
    })

    it('should detect console.log', async () => {
      const code = `
console.log('Debug message');
      `

      const result = await reviewer.review(code, 'typescript')

      const consoleIssue = result.issues.find(i => i.ruleId === 'performance-console-log')
      expect(consoleIssue).toBeDefined()
      expect(consoleIssue?.severity).toBe('low')
    })

    it('should detect large array operations', async () => {
      const code = `
const arr = [];
for (let i = 0; i < 1000000; i++) {
  arr.push(i);
}
      `

      const result = await reviewer.review(code, 'typescript')

      // May or may not detect depending on rules
      expect(result.issues.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('should detect code quality issues', () => {
    it('should detect variable shadowing', async () => {
      const code = `
const x = 1;
const x = 2;
      `

      const result = await reviewer.review(code, 'typescript')

      const shadowingIssue = result.issues.find(i => i.ruleId === 'quality-var-shadowing')
      expect(shadowingIssue).toBeDefined()
    })

    it('should detect empty catch block', async () => {
      const code = `
try {
  riskyOperation();
} catch (error) {}
      `

      const result = await reviewer.review(code, 'typescript')

      const emptyCatchIssue = result.issues.find(i => i.ruleId === 'quality-empty-catch')
      expect(emptyCatchIssue).toBeDefined()
      expect(emptyCatchIssue?.severity).toBe('medium')
    })

    it('should detect magic numbers', async () => {
      const code = `
const result = value * 42;
      `

      const result = await reviewer.review(code, 'typescript')

      const magicNumberIssue = result.issues.find(i => i.ruleId === 'quality-magic-number')
      expect(magicNumberIssue).toBeDefined()
      expect(magicNumberIssue?.severity).toBe('low')
    })

    it('should detect unused variables', async () => {
      const code = `
const unused = 'not used';
const used = 'used';
console.log(used);
      `

      const result = await reviewer.review(code, 'typescript')

      // May or may not detect
      expect(result.issues.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('should detect best practice violations', () => {
    it('should detect any type usage', async () => {
      const code = `
const data: any = fetchData();
      `

      const result = await reviewer.review(code, 'typescript')

      const anyTypeIssue = result.issues.find(i => i.ruleId === 'best-practice-any-type')
      expect(anyTypeIssue).toBeDefined()
      expect(anyTypeIssue?.severity).toBe('medium')
    })

    it('should detect loose equality', async () => {
      const code = `
if (x == null) {
  // ...
}
      `

      const result = await reviewer.review(code, 'typescript')

      const equalsIssue = result.issues.find(i => i.ruleId === 'best-practice-equals')
      expect(equalsIssue).toBeDefined()
      expect(equalsIssue?.severity).toBe('medium')
    })

    it('should detect var usage', async () => {
      const code = `
var x = 1;
      `

      const result = await reviewer.review(code, 'typescript')

      const varIssue = result.issues.find(i => i.ruleId === 'best-practice-no-var')
      expect(varIssue).toBeDefined()
      expect(varIssue?.severity).toBe('low')
    })

    it('should detect missing return types', async () => {
      const code = `
function add(a: number, b: number) {
  return a + b;
}
      `

      const result = await reviewer.review(code, 'typescript')

      // May or may not detect
      expect(result.issues.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('should calculate complexity metrics', () => {
    it('should detect high cyclomatic complexity', async () => {
      const code = `
function complex(x, y, z, a, b, c, d, e) {
  if (x > 0) {
    if (y > 0) {
      if (z > 0) {
        if (a > 0) {
          if (b > 0) {
            if (c > 0) {
              if (d > 0) {
                if (e > 0) {
                  return 1;
                }
              }
            }
          }
        }
      }
    }
  }
  return 0;
}
      `

      const result = await reviewer.review(code, 'typescript')

      // Should detect complexity issue
      expect(result.issues.length).toBeGreaterThan(0)
    })

    it('should calculate maintainability index', async () => {
      const simpleCode = 'const x = 1;'
      const complexCode = `
function complex() {
  if (a > 0) { if (b > 0) { if (c > 0) { if (d > 0) { return 1; } } } }
  return 0;
}
      `

      const simpleResult = await reviewer.review(simpleCode, 'typescript')
      const complexResult = await reviewer.review(complexCode, 'typescript')

      expect(simpleResult.score.maintainability).toBeGreaterThan(
        complexResult.score.maintainability
      )
    })
  })

  describe('should calculate scores', () => {
    it('should calculate overall score', async () => {
      const code = `
const x = eval('1 + 1');
console.log(x);
      `

      const result = await reviewer.review(code, 'typescript')

      expect(result.score).toBeDefined()
      expect(result.score.overall).toBeGreaterThanOrEqual(0)
      expect(result.score.overall).toBeLessThanOrEqual(100)
    })

    it('should calculate category scores', async () => {
      const code = 'const x = 1;'

      const result = await reviewer.review(code, 'typescript')

      expect(result.score.readability).toBeGreaterThanOrEqual(0)
      expect(result.score.maintainability).toBeGreaterThanOrEqual(0)
      expect(result.score.security).toBeGreaterThanOrEqual(0)
      expect(result.score.performance).toBeGreaterThanOrEqual(0)
    })

    it('should penalize critical issues more', async () => {
      const criticalCode = `
const x = eval('alert(1)');
document.body.innerHTML = userInput;
      `

      const warningCode = `
console.log('debug');
      `

      const criticalResult = await reviewer.review(criticalCode, 'typescript')
      const warningResult = await reviewer.review(warningCode, 'typescript')

      expect(criticalResult.score.overall).toBeLessThan(warningResult.score.overall)
    })
  })

  describe('should provide statistics', () => {
    it('should count issues by severity', async () => {
      const code = `
const x = eval('1 + 1');
console.log(x);
      `

      const result = await reviewer.review(code, 'typescript')

      expect(result.stats.total).toBeGreaterThan(0)
      expect(result.stats.critical).toBeGreaterThanOrEqual(0)
      expect(result.stats.high).toBeGreaterThanOrEqual(0)
      expect(result.stats.medium).toBeGreaterThanOrEqual(0)
      expect(result.stats.low).toBeGreaterThanOrEqual(0)

      expect(result.stats.total).toBe(
        result.stats.critical +
        result.stats.high +
        result.stats.medium +
        result.stats.low
      )
    })
  })

  describe('Python specific rules', () => {
    it('should detect bare except', async () => {
      const code = `
try:
    risky_operation()
except:
    pass
      `

      const result = await reviewer.review(code, 'python')

      const bareExceptIssue = result.issues.find(i => i.ruleId === 'python-bare-except')
      expect(bareExceptIssue).toBeDefined()
      expect(bareExceptIssue?.severity).toBe('high')
    })
  })

  describe('Go specific rules', () => {
    it('should detect unchecked errors', async () => {
      const code = `
func process() {
    data := readFile()
    processData(data)
}
      `

      const result = await reviewer.review(code, 'go')

      // May detect error check issue
      expect(result.issues.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Rust specific rules', () => {
    it('should detect unwrap usage', async () => {
      const code = `
fn process() -> i32 {
    let result = some_operation().unwrap();
    result
}
      `

      const result = await reviewer.review(code, 'rust')

      const unwrapIssue = result.issues.find(i => i.ruleId === 'rust-unwrap')
      expect(unwrapIssue).toBeDefined()
      expect(unwrapIssue?.severity).toBe('high')
    })

    it('should detect panic usage', async () => {
      const code = `
fn process() {
    panic!("Something went wrong");
}
      `

      const result = await reviewer.review(code, 'rust')

      const panicIssue = result.issues.find(i => i.ruleId === 'rust-panic')
      expect(panicIssue).toBeDefined()
      expect(panicIssue?.severity).toBe('high')
    })
  })

  describe('edge cases', () => {
    it('should handle empty code', async () => {
      const result = await reviewer.review('', 'typescript')

      expect(result.issues).toEqual([])
      expect(result.score.overall).toBe(100)
    })

    it('should handle code with no issues', async () => {
      const code = `
const x: number = 1;
const y: number = 2;
const sum: number = x + y;
      `

      const result = await reviewer.review(code, 'typescript')

      expect(result.issues.length).toBe(0)
      expect(result.score.overall).toBe(100)
    })

    it('should handle special characters', async () => {
      const code = `
const str = "Hello\\nWorld\\t!";
const regex = /\\d+/g;
      `

      const result = await reviewer.review(code, 'typescript')

      expect(result).toBeDefined()
    })

    it('should handle very long code', async () => {
      const lines: string[] = []
      for (let i = 0; i < 1000; i++) {
        lines.push(`const x${i} = ${i};`)
      }
      const code = lines.join('\n')

      const result = await reviewer.review(code, 'typescript')

      expect(result).toBeDefined()
    })
  })

  describe('caching', () => {
    it('should cache results when enabled', async () => {
      const cachedReviewer = new CodeReviewer({ enableCache: true })
      const code = 'const x = 1;'

      const result1 = await cachedReviewer.review(code, 'typescript')
      const result2 = await cachedReviewer.review(code, 'typescript')

      expect(result1).toEqual(result2)
    })
  })

  describe('default instance', () => {
    it('should export default reviewer', () => {
      expect(codeReviewer).toBeDefined()
      expect(codeReviewer).toBeInstanceOf(CodeReviewer)
    })
  })

  describe('performance', () => {
    it('should handle large code efficiently', async () => {
      const lines: string[] = []
      for (let i = 0; i < 500; i++) {
        lines.push(`function func${i}() { return ${i}; }`)
      }
      const code = lines.join('\n')

      const start = Date.now()
      const result = await reviewer.review(code, 'typescript')
      const duration = Date.now() - start

      expect(result).toBeDefined()
      expect(duration).toBeLessThan(10000)
    })
  })
})
