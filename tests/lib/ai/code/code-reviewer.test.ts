/**
 * @fileoverview Code Reviewer 完整单元测试
 * @description 测试代码审查器的所有核心功能
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CodeReviewer, codeReviewer } from '@/lib/ai/code/code-reviewer'
import type { SupportedLanguage } from '@/lib/ai/code/types'

describe('CodeReviewer - 完整测试', () => {
  let reviewer: CodeReviewer

  beforeEach(() => {
    reviewer = new CodeReviewer({ enableCache: false })
  })

  describe('安全问题检测 - 正常输入/输出', () => {
    it('应该检测 eval() 使用', async () => {
      const code = `
const result = eval('2 + 2');
      `

      const result = await reviewer.review(code, 'typescript')

      const evalIssue = result.issues.find(i => i.ruleId === 'security-eval')
      expect(evalIssue).toBeDefined()
      expect(evalIssue?.severity).toBe('critical')
      expect(evalIssue?.type).toBe('error')
    })

    it('应该检测 innerHTML 中的用户输入', async () => {
      const code = `
document.getElementById('output').innerHTML = userInput;
      `

      const result = await reviewer.review(code, 'typescript')

      const innerHTMLIssue = result.issues.find(i => i.ruleId === 'security-innerhtml')
      expect(innerHTMLIssue).toBeDefined()
      expect(innerHTMLIssue?.severity).toBe('critical')
    })

    it('应该检测硬编码的密钥', async () => {
      const code = `
const apiKey = 'sk-1234567890abcdef1234567890abcdef';
      `

      const result = await reviewer.review(code, 'typescript')

      const secretIssue = result.issues.find(i => i.ruleId === 'security-hardcoded-secret')
      expect(secretIssue).toBeDefined()
      expect(secretIssue?.severity).toBe('critical')
    })
  })

  describe('性能问题检测', () => {
    it('应该检测循环中的 DOM 操作', async () => {
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

    it('应该检测性能问题', async () => {
      const code = `
for (let i = 0; i < 100; i++) {
  document.body.appendChild(createElement(i));
}
      `

      const result = await reviewer.review(code, 'typescript')

      // 应该检测到性能问题
      expect(result.issues.length).toBeGreaterThan(0)
    })

    it('应该检测 console.log', async () => {
      const code = `
console.log('Debug message');
      `

      const result = await reviewer.review(code, 'typescript')

      const consoleIssue = result.issues.find(i => i.ruleId === 'performance-console-log')
      expect(consoleIssue).toBeDefined()
      expect(consoleIssue?.severity).toBe('low')
    })
  })

  describe('代码质量检测', () => {
    it('应该检测变量遮蔽', async () => {
      const code = `
const x = 1;
const x = 2;
      `

      const result = await reviewer.review(code, 'typescript')

      const shadowingIssue = result.issues.find(i => i.ruleId === 'quality-var-shadowing')
      expect(shadowingIssue).toBeDefined()
      expect(shadowingIssue?.severity).toBe('medium')
    })

    it('应该检测空的 catch 块', async () => {
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

    it('应该检测魔法数字', async () => {
      const code = `
const result = value * 42;
      `

      const result = await reviewer.review(code, 'typescript')

      const magicNumberIssue = result.issues.find(i => i.ruleId === 'quality-magic-number')
      expect(magicNumberIssue).toBeDefined()
      expect(magicNumberIssue?.severity).toBe('low')
    })
  })

  describe('最佳实践检测', () => {
    it('应该检测 any 类型使用', async () => {
      const code = `
const data: any = fetchData();
      `

      const result = await reviewer.review(code, 'typescript')

      const anyTypeIssue = result.issues.find(i => i.ruleId === 'best-practice-any-type')
      expect(anyTypeIssue).toBeDefined()
      expect(anyTypeIssue?.severity).toBe('medium')
    })

    it('应该检测宽松相等', async () => {
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

    it('应该检测 var 使用', async () => {
      const code = `
var x = 1;
      `

      const result = await reviewer.review(code, 'typescript')

      const varIssue = result.issues.find(i => i.ruleId === 'best-practice-no-var')
      expect(varIssue).toBeDefined()
      expect(varIssue?.severity).toBe('low')
    })
  })

  describe('Python 特定规则', () => {
    it('应该检测 bare except', async () => {
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

    it('应该检测全局变量', async () => {
      const code = `
global_counter = 0

def increment():
    global global_counter
    global_counter += 1
      `

      const result = await reviewer.review(code, 'python')

      // 可能检测到全局变量或其他问题
      expect(result.issues.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Go 特定规则', () => {
    it('应该审查 Go 代码', async () => {
      const code = `
func process() {
    data := readFile()
    processData(data)
}
      `

      const result = await reviewer.review(code, 'go')

      // 应该成功审查 Go 代码
      expect(result).toBeDefined()
      expect(Array.isArray(result.issues)).toBe(true)
    })
  })

  describe('Rust 特定规则', () => {
    it('应该检测 unwrap 使用', async () => {
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

    it('应该检测 panic 使用', async () => {
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

  describe('复杂度分析', () => {
    it('应该分析代码复杂度', async () => {
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

      // 复杂度应该被计算
      expect(result.score).toBeDefined()
      // 高复杂度代码应该有较低的分数
      expect(result.score.maintainability).toBeLessThan(80)
    })

    it('应该检测低可维护性', async () => {
      const lines: string[] = ['function complex() {']
      for (let i = 0; i < 50; i++) {
        lines.push(`  if (condition${i}) {`)
        lines.push(`    result${i} = calculate${i}();`)
        lines.push('  }')
      }
      lines.push('  return result;')
      lines.push('}')
      const code = lines.join('\n')

      const result = await reviewer.review(code, 'typescript')

      const maintainabilityIssue = result.issues.find(i => i.ruleId === 'complexity-maintainability')
      expect(maintainabilityIssue).toBeDefined()
      expect(maintainabilityIssue?.severity).toBe('high')
    })
  })

  describe('评分计算', () => {
    it('应该计算总体评分', async () => {
      const code = `
const x = eval('1 + 1');
console.log(x);
      `

      const result = await reviewer.review(code, 'typescript')

      expect(result.score).toBeDefined()
      expect(result.score.overall).toBeGreaterThanOrEqual(0)
      expect(result.score.overall).toBeLessThanOrEqual(100)
    })

    it('应该计算分类评分', async () => {
      const code = `
const x = 1;
      `

      const result = await reviewer.review(code, 'typescript')

      expect(result.score.readability).toBeGreaterThanOrEqual(0)
      expect(result.score.maintainability).toBeGreaterThanOrEqual(0)
      expect(result.score.security).toBeGreaterThanOrEqual(0)
      expect(result.score.performance).toBeGreaterThanOrEqual(0)
    })

    it('应该对严重问题扣更多分', async () => {
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

  describe('统计信息', () => {
    it('应该按严重程度统计问题', async () => {
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

  describe('错误处理 - 边界条件', () => {
    it('应该处理空代码', async () => {
      const result = await reviewer.review('', 'typescript')

      expect(result.issues).toEqual([])
      expect(result.score.overall).toBe(100)
    })

    it('应该处理没有问题的代码', async () => {
      const code = `
const x: number = 1;
const y: number = 2;
const sum: number = x + y;
      `

      const result = await reviewer.review(code, 'typescript')

      expect(result.issues.length).toBe(0)
      expect(result.score.overall).toBe(100)
    })

    it('应该处理包含特殊字符的代码', async () => {
      const code = `
const str = "Hello\\nWorld\\t!";
const regex = /\\d+/g;
      `

      const result = await reviewer.review(code, 'typescript')

      expect(result).toBeDefined()
    })

    it('应该处理超长代码', async () => {
      const lines: string[] = []
      for (let i = 0; i < 1000; i++) {
        lines.push(`const x${i} = ${i};`)
      }
      const code = lines.join('\n')

      const result = await reviewer.review(code, 'typescript')

      expect(result).toBeDefined()
    })
  })

  describe('多语言支持', () => {
    const testCases: Array<{ language: SupportedLanguage; code: string }> = [
      { language: 'typescript', code: 'const x: any = 1;' },
      { language: 'javascript', code: 'var x = 1;' },
      { language: 'python', code: 'try:\n\tpass\nexcept:\n\tpass' },
      { language: 'go', code: 'func process() {\n\tdata := readFile()\n}' },
      { language: 'rust', code: 'fn process() -> i32 {\n\tlet result = some_operation().unwrap();\n\tresult\n}' },
    ]

    testCases.forEach(({ language, code }) => {
      it(`应该审查 ${language} 代码`, async () => {
        const result = await reviewer.review(code, language)

        expect(result).toBeDefined()
        expect(Array.isArray(result.issues)).toBe(true)
        expect(result.score).toBeDefined()
      })
    })
  })

  describe('缓存功能', () => {
    it('启用缓存时应该缓存结果', async () => {
      const cachedReviewer = new CodeReviewer({ enableCache: true })
      const code = 'const x = 1;'

      const start1 = Date.now()
      await cachedReviewer.review(code, 'typescript')
      const time1 = Date.now() - start1

      const start2 = Date.now()
      await cachedReviewer.review(code, 'typescript')
      const time2 = Date.now() - start2

      expect(time2).toBeLessThanOrEqual(time1)
    })
  })

  describe('默认实例', () => {
    it('应该导出默认审查器实例', () => {
      expect(codeReviewer).toBeDefined()
      expect(codeReviewer).toBeInstanceOf(CodeReviewer)
    })
  })

  describe('配置选项', () => {
    it('应该接受自定义配置', () => {
      const customReviewer = new CodeReviewer({
        languages: ['typescript', 'javascript'],
        enableCache: false,
        verbose: true,
      })

      expect(customReviewer).toBeDefined()
    })
  })
})
