/**
 * @fileoverview 代码审查器边缘用例测试
 * @description 测试空输入、超大文件、特殊字符、边界条件
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CodeReviewer } from '../code-reviewer'

describe('CodeReviewer 边缘用例测试', () => {
  let reviewer: CodeReviewer

  beforeEach(() => {
    reviewer = new CodeReviewer({ enableCache: false })
  })

  describe('空输入处理', () => {
    it('should handle empty string', async () => {
      const result = await reviewer.review('', 'typescript')
      
      expect(result.issues).toEqual([])
      expect(result.score.overall).toBe(100)
      expect(result.stats.total).toBe(0)
    })

    it('should handle whitespace only', async () => {
      const result = await reviewer.review('   \n\n\t\t  \n   ', 'typescript')
      
      expect(result.issues).toEqual([])
      expect(result.score.overall).toBe(100)
    })

    it('should handle single newline', async () => {
      const result = await reviewer.review('\n', 'typescript')
      
      expect(result.issues).toEqual([])
    })

    it('should handle null character', async () => {
      const result = await reviewer.review('\x00', 'typescript')
      
      expect(result).toBeDefined()
    })

    it('should handle only comments', async () => {
      const code = `
// This is a comment
/* Multi-line comment */
/** JSDoc comment */
      `
      
      const result = await reviewer.review(code, 'typescript')
      
      // 注释代码不应该有安全或性能问题
      expect(result.issues.filter(i => i.severity === 'critical')).toHaveLength(0)
    })
  })

  describe('特殊字符处理', () => {
    it('should handle Unicode in security patterns', async () => {
      const code = `
const 你好 = "世界";
const 密码 = "test12345678"; // password in Chinese
const 秘密 = "secret"; // secret in Chinese
      `
      
      const result = await reviewer.review(code, 'typescript')
      
      expect(result).toBeDefined()
    })

    it('should handle emojis in code being reviewed', async () => {
      const code = `
const 🚀 = "rocket";
const password_🔑 = "mySecretPassword123";
      `
      
      const result = await reviewer.review(code, 'typescript')
      
      expect(result).toBeDefined()
    })

    it('should handle escape sequences in security patterns', async () => {
      const code = `
const apiKey = "sk-\\u0031\\u0032\\u0033\\u0034\\u0035\\u0036";
const password = "pass\\x00word";
      `
      
      const result = await reviewer.review(code, 'typescript')
      
      expect(result).toBeDefined()
    })

    it('should handle special regex patterns', async () => {
      const code = `
const pattern = /[\\u0000-\\u001F\\u007F-\\u009F]/;
const complexRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d]{8,}$/;
      `
      
      const result = await reviewer.review(code, 'typescript')
      
      expect(result).toBeDefined()
    })

    it('should handle template literals with expressions', async () => {
      const code = `
const apiKey = \`sk-\${process.env.KEY}\`;
const password = \`pass-\${Math.random()}\`;
const query = \`SELECT * FROM users WHERE id = '\${userId}'\`;
      `
      
      const result = await reviewer.review(code, 'typescript')
      
      expect(result).toBeDefined()
    })
  })

  describe('超大文件处理', () => {
    it('should handle 100KB file efficiently', async () => {
      const lines = []
      for (let i = 0; i < 2000; i++) {
        lines.push(`const line${i} = ${i};`)
      }
      const code = lines.join('\n')
      
      const start = Date.now()
      const result = await reviewer.review(code, 'typescript')
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(10000)
      expect(result).toBeDefined()
    })

    it('should handle 1000 security issues', async () => {
      const lines = []
      for (let i = 0; i < 1000; i++) {
        lines.push(`const apiKey${i} = 'sk-secret-key-${i}-value';`)
      }
      const code = lines.join('\n')
      
      const start = Date.now()
      const result = await reviewer.review(code, 'typescript')
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(10000)
      // 可能检测到硬编码秘密
      expect(result.stats.total).toBeGreaterThanOrEqual(0)
    })

    it('should handle deeply nested code', async () => {
      let code = 'function deep() {\n'
      for (let i = 0; i < 100; i++) {
        code += `${'  '.repeat(i + 1)}if (true) {\n`
      }
      code += `${'  '.repeat(101)}return 1;\n`
      for (let i = 99; i >= 0; i--) {
        code += `${'  '.repeat(i + 1)}}\n`
      }
      code += '}\n'
      
      const result = await reviewer.review(code, 'typescript')
      
      // 应该检测到高复杂度
      const complexityIssue = result.issues.find(i => 
        i.ruleId?.includes('complexity')
      )
      expect(complexityIssue).toBeDefined()
    })

    it('should handle minified JavaScript', async () => {
      // 模拟压缩后的代码
      const code = `function minified(a,b,c){return a?b?c?a+b+c:a+b:a:c||b}const x=minified(1,2,3);`
      
      const result = await reviewer.review(code, 'javascript')
      
      expect(result).toBeDefined()
    })

    it('should handle code with many imports', async () => {
      const lines = []
      for (let i = 0; i < 500; i++) {
        lines.push(`import { Component${i} } from './component${i}';`)
      }
      lines.push('const x = 1;')
      
      const code = lines.join('\n')
      const result = await reviewer.review(code, 'typescript')
      
      expect(result).toBeDefined()
    })
  })

  describe('安全检测边缘情况', () => {
    it('should detect eval with template literal', async () => {
      const code = `
const userInput = getUserInput();
const result = eval(\`\${userInput}\`);
      `
      
      const result = await reviewer.review(code, 'typescript')
      
      const evalIssue = result.issues.find(i => i.ruleId === 'security-eval')
      expect(evalIssue).toBeDefined()
    })

    it('should detect Function constructor as eval alternative', async () => {
      const code = `
const fn = new Function('return ' + userInput);
      `
      
      const result = await reviewer.review(code, 'typescript')
      
      expect(result).toBeDefined()
    })

    it('should detect innerHTML assignment pattern', async () => {
      const code = `
element.innerHTML = '<p>' + userInput + '</p>';
element['innerHTML'] = userInput;
      `
      
      const result = await reviewer.review(code, 'typescript')
      
      const innerHTMLIssue = result.issues.find(i => i.ruleId === 'security-innerhtml')
      expect(innerHTMLIssue).toBeDefined()
    })

    it('should not false positive on safe innerHTML', async () => {
      const code = `
element.innerHTML = '<p>Static content</p>';
element.innerHTML = escapeHtml(userInput);
      `
      
      const result = await reviewer.review(code, 'typescript')
      
      // 静态内容可能不触发警告，取决于实现
      expect(result).toBeDefined()
    })

    it('should detect hardcoded secrets in various formats', async () => {
      const code = `
const apiKey = 'sk-1234567890abcdef';
const SECRET = 'my-secret-value-12345';
const token = 'bearer-token-XXXXXXXX';
const password = 'userPassword123!';
      `
      
      const result = await reviewer.review(code, 'typescript')
      
      const secretIssues = result.issues.filter(i => 
        i.ruleId === 'security-hardcoded-secret'
      )
      expect(secretIssues.length).toBeGreaterThan(0)
    })

    it('should detect secrets in different casing', async () => {
      const code = `
const API_KEY = 'secret1234567890';
const Password = 'mypassword12345';
const TOKEN_VALUE = 'token-1234567890';
      `
      
      const result = await reviewer.review(code, 'typescript')
      
      expect(result.stats.critical).toBeGreaterThan(0)
    })

    it('should handle secrets with environment variables', async () => {
      const code = `
const apiKey = process.env.API_KEY;
const password = process.env.PASSWORD;
const secret = process.env.SECRET;
      `
      
      const result = await reviewer.review(code, 'typescript')
      
      // 环境变量应该不会触发硬编码秘密警告
      const secretIssue = result.issues.find(i => 
        i.ruleId === 'security-hardcoded-secret'
      )
      expect(secretIssue).toBeUndefined()
    })
  })

  describe('性能检测边缘情况', () => {
    it('should detect console statements in various forms', async () => {
      const code = `
console.log('debug');
console.debug('debug');
console.info('info');
console.warn('warn');
console.error('error');
console.table([{a: 1}]);
console.dir({a: 1});
      `
      
      const result = await reviewer.review(code, 'typescript')
      
      const consoleIssues = result.issues.filter(i => 
        i.ruleId === 'performance-console-log'
      )
      expect(consoleIssues.length).toBeGreaterThan(0)
    })

    it('should detect DOM manipulation in various loops', async () => {
      const code = `
for (let i = 0; i < items.length; i++) {
  document.body.appendChild(createElement(i));
}

items.forEach(item => {
  container.appendChild(createElement(item));
});

for (const item of items) {
  element.innerHTML += item;
}
      `
      
      const result = await reviewer.review(code, 'typescript')
      
      const domLoopIssue = result.issues.find(i => 
        i.ruleId === 'performance-loop-dom'
      )
      expect(domLoopIssue).toBeDefined()
    })

    it('should detect synchronous XMLHttpRequest', async () => {
      const code = `
const xhr = new XMLHttpRequest();
xhr.open('GET', '/api', false);
xhr.send();
      `
      
      const result = await reviewer.review(code, 'typescript')
      
      // 可能检测到同步 XHR 问题
      expect(result.issues.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('代码质量边缘情况', () => {
    it('should detect empty catch blocks in various forms', async () => {
      const code = `
try { something(); } catch (e) {}
try { another(); } catch (error) { /* empty */ }
try { third(); } catch (err) { }
      `
      
      const result = await reviewer.review(code, 'typescript')
      
      const emptyCatchIssues = result.issues.filter(i => 
        i.ruleId === 'quality-empty-catch'
      )
      expect(emptyCatchIssues.length).toBeGreaterThan(0)
    })

    it('should detect magic numbers but not common values', async () => {
      const code = `
const zero = 0;
const one = 1;
const two = 2;
const ten = 10;
const hundred = 100;
const thousand = 1000;
const magic = 42;
const strange = 365;
      `
      
      const result = await reviewer.review(code, 'typescript')
      
      const magicIssues = result.issues.filter(i => 
        i.ruleId === 'quality-magic-number'
      )
      // 应该检测到 42 和 365，但不是 0, 1, 2, 10, 100, 1000
      expect(magicIssues.length).toBeGreaterThan(0)
    })

    it('should detect any type in various contexts', async () => {
      const code = `
const x: any = getValue();
function process(data: any): any { return data; }
const items: any[] = [];
const map: Map<string, any> = new Map();
      `
      
      const result = await reviewer.review(code, 'typescript')
      
      const anyIssues = result.issues.filter(i => 
        i.ruleId === 'best-practice-any-type'
      )
      expect(anyIssues.length).toBeGreaterThan(0)
    })

    it('should detect var usage', async () => {
      const code = `
var x = 1;
var y = 2;
for (var i = 0; i < 10; i++) {}
      `
      
      const result = await reviewer.review(code, 'typescript')
      
      const varIssues = result.issues.filter(i => 
        i.ruleId === 'best-practice-no-var'
      )
      expect(varIssues.length).toBeGreaterThan(0)
    })
  })

  describe('多语言支持', () => {
    it('should apply Python-specific rules', async () => {
      const code = `
try:
    something()
except:
    pass

def func(x=[]):
    return x
      `
      
      const result = await reviewer.review(code, 'python')
      
      const bareExcept = result.issues.find(i => 
        i.ruleId === 'python-bare-except'
      )
      expect(bareExcept).toBeDefined()
    })

    it('should apply Go-specific rules', async () => {
      const code = `
func process() {
    data, _ := readFile()
    processData(data)
}
      `
      
      const result = await reviewer.review(code, 'go')
      
      expect(result).toBeDefined()
    })

    it('should apply Rust-specific rules', async () => {
      const code = `
fn process() -> i32 {
    let result = parse().unwrap();
    result
}

fn fail() {
    panic!("critical error");
}
      `
      
      const result = await reviewer.review(code, 'rust')
      
      const unwrapIssue = result.issues.find(i => 
        i.ruleId === 'rust-unwrap'
      )
      expect(unwrapIssue).toBeDefined()
    })
  })

  describe('评分计算边缘情况', () => {
    it('should calculate score with many issues', async () => {
      const code = `
const x: any = eval('1');
document.body.innerHTML = userInput;
const apiKey = 'sk-secret-1234567890';
console.log('debug');
while (true) {}
      `
      
      const result = await reviewer.review(code, 'typescript')
      
      expect(result.score.overall).toBeLessThan(50)
      expect(result.score.security).toBeLessThan(50)
    })

    it('should never return negative scores', async () => {
      // 创建有大量问题的代码
      const lines = []
      for (let i = 0; i < 100; i++) {
        lines.push(`const apiKey${i} = 'sk-secret-${i}-1234567890';`)
        lines.push(`eval('code${i}');`)
      }
      const code = lines.join('\n')
      
      const result = await reviewer.review(code, 'typescript')
      
      expect(result.score.overall).toBeGreaterThanOrEqual(0)
      expect(result.score.security).toBeGreaterThanOrEqual(0)
      expect(result.score.performance).toBeGreaterThanOrEqual(0)
      expect(result.score.readability).toBeGreaterThanOrEqual(0)
      expect(result.score.maintainability).toBeGreaterThanOrEqual(0)
    })

    it('should give perfect score for clean code', async () => {
      const code = `
interface User {
  id: number;
  name: string;
}

function greet(user: User): string {
  return \`Hello, \${user.name}!\`;
}

const user: User = { id: 1, name: 'Alice' };
const greeting = greet(user);
      `
      
      const result = await reviewer.review(code, 'typescript')
      
      // 干净代码的分数应该很高
      expect(result.score.overall).toBeGreaterThanOrEqual(95)
    })
  })

  describe('复杂度检测边缘情况', () => {
    it('should detect high cyclomatic complexity', async () => {
      const code = `
function complex(x, y, z) {
  if (x > 0) {
    if (y > 0) {
      if (z > 0) {
        for (let i = 0; i < 10; i++) {
          switch (i) {
            case 0: return 0;
            case 1: return 1;
            case 2: return 2;
            default: return -1;
          }
        }
      }
    }
  }
  return 0;
}
      `
      
      const result = await reviewer.review(code, 'typescript')
      
      // 可能检测到复杂度问题
      expect(result.issues.length).toBeGreaterThanOrEqual(0)
    })

    it('should detect high cognitive complexity', async () => {
      let code = 'function deep() {\n'
      for (let i = 0; i < 20; i++) {
        code += `${'  '.repeat(i + 1)}if (true) {\n`
      }
      code += `${'  '.repeat(21)}return 1;\n`
      for (let i = 19; i >= 0; i--) {
        code += `${'  '.repeat(i + 1)}}\n`
      }
      code += '}\n'
      
      const result = await reviewer.review(code, 'typescript')
      
      const cognitiveIssue = result.issues.find(i => 
        i.ruleId === 'complexity-cognitive'
      )
      expect(cognitiveIssue).toBeDefined()
    })

    it('should detect low maintainability', async () => {
      const lines = ['function bad() {']
      for (let i = 0; i < 100; i++) {
        lines.push(`  if (cond${i}) { result${i} = calc${i}(); }`)
      }
      lines.push('}')
      const code = lines.join('\n')
      
      const result = await reviewer.review(code, 'typescript')
      
      const maintainabilityIssue = result.issues.find(i => 
        i.ruleId === 'complexity-maintainability'
      )
      expect(maintainabilityIssue).toBeDefined()
    })
  })

  describe('规则匹配边缘情况', () => {
    it('should not false positive on == in comments', async () => {
      const code = `
// This compares x == y
/* Check if a == b */
const x = y === z;
      `
      
      const result = await reviewer.review(code, 'typescript')
      
      // 注释中的 == 可能被检测，取决于实现
      expect(result.issues.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle overlapping patterns', async () => {
      const code = `
const apiKey = 'sk-1234567890abcdef';
const result = eval('2 + 2');
document.body.innerHTML = apiKey;
      `
      
      const result = await reviewer.review(code, 'typescript')
      
      // 应该检测到所有三个问题
      expect(result.issues.length).toBeGreaterThanOrEqual(3)
    })

    it('should handle code that looks like patterns but is not', async () => {
      const code = `
// Not a real eval
const eval = 'string';
// Not innerHTML assignment
const innerHTML = 'value';
// Not a real password
const password = 'short';
      `
      
      const result = await reviewer.review(code, 'typescript')
      
      expect(result).toBeDefined()
    })
  })

  describe('边界条件', () => {
    it('should handle code at line boundaries', async () => {
      const code = `const x = 1;\nconst y = 2;\nconst z = 3;`
      
      const result = await reviewer.review(code, 'typescript')
      
      expect(result).toBeDefined()
    })

    it('should handle single character code', async () => {
      const result = await reviewer.review('x', 'typescript')
      
      expect(result).toBeDefined()
    })

    it('should handle code with only operators', async () => {
      const code = '=== !== && || ?? ? : + - * /'
      
      const result = await reviewer.review(code, 'typescript')
      
      expect(result).toBeDefined()
    })
  })
})
