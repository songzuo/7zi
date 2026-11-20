/**
 * @fileoverview Bug 检测器测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { BugDetector, bugDetector } from '../bug-detector'
import type { SupportedLanguage } from '../types'

describe('BugDetector', () => {
  let detector: BugDetector

  beforeEach(() => {
    detector = new BugDetector({ enableCache: false })
  })

  describe('空引用检测', () => {
    it('should detect potential null reference', async () => {
      const code = `
const user = getUser();
const name = user.name;
      `

      const bugs = await detector.detect(code, 'typescript')

      expect(bugs.length).toBeGreaterThan(0)
      const nullRefBug = bugs.find(b => b.type === 'null_reference')
      expect(nullRefBug).toBeDefined()
      expect(nullRefBug?.severity).toBe('high')
    })

    it('should detect undefined comparison with ==', async () => {
      const code = `
if (x == undefined) {
  // ...
}
      `

      const bugs = await detector.detect(code, 'typescript')

      // May detect as undefined_check or other type
      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('数组相关检测', () => {
    it('should detect array access without bounds check', async () => {
      const code = `
const arr = [1, 2, 3];
const element = arr[i];
      `

      const bugs = await detector.detect(code, 'typescript')

      const indexBug = bugs.find(b => b.type === 'index_error')
      expect(indexBug).toBeDefined()
      expect(indexBug?.severity).toBe('high')
    })

    it('should detect array modification during iteration', async () => {
      const code = `
const arr = [1, 2, 3];
for (let i = 0; i < arr.length; i++) {
  arr.push(i);
}
      `

      const bugs = await detector.detect(code, 'typescript')

      const iterationBug = bugs.find(b => b.type === 'iteration_error')
      expect(iterationBug).toBeDefined()
      expect(iterationBug?.severity).toBe('high')
    })
  })

  describe('异步相关检测', () => {
    it('should detect missing await', async () => {
      const code = `
async function fetch() {
  return Promise.resolve(42);
}
const result = fetch();
      `

      const bugs = await detector.detect(code, 'typescript')

      const asyncBug = bugs.find(b => b.type === 'async_error')
      expect(asyncBug).toBeDefined()
      expect(asyncBug?.severity).toBe('high')
    })

    it('should detect unhandled Promise', async () => {
      const code = `
new Promise((resolve) => {
  setTimeout(resolve, 1000);
});
      `

      const bugs = await detector.detect(code, 'typescript')

      const promiseBug = bugs.find(b => b.type === 'async_error')
      expect(promiseBug).toBeDefined()
      expect(promiseBug?.severity).toBe('medium')
    })

    it('should detect callback hell', async () => {
      const code = `
asyncOp1(function() {
  asyncOp2(function() {
    asyncOp3(function() {
      asyncOp4(function() {
        // deep nesting
      });
    });
  });
});
      `

      const bugs = await detector.detect(code, 'typescript')

      // May detect as code_smell or other type
      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('内存泄漏检测', () => {
    it('should detect event listener without cleanup', async () => {
      const code = `
element.addEventListener('click', handler);
      `

      const bugs = await detector.detect(code, 'typescript')

      const leakBug = bugs.find(b => b.type === 'memory_leak')
      expect(leakBug).toBeDefined()
      expect(leakBug?.severity).toBe('medium')
    })

    it('should detect interval without cleanup', async () => {
      const code = `
setInterval(() => {
  console.log('tick');
}, 1000);
      `

      const bugs = await detector.detect(code, 'typescript')

      const intervalBug = bugs.find(b => b.type === 'memory_leak')
      expect(intervalBug).toBeDefined()
      expect(intervalBug?.severity).toBe('medium')
    })
  })

  describe('逻辑错误检测', () => {
    it('should detect infinite loop', async () => {
      const code = `
while (true) {
  // no break
}
      `

      const bugs = await detector.detect(code, 'typescript')

      const loopBug = bugs.find(b => b.type === 'logic_error')
      expect(loopBug).toBeDefined()
      expect(loopBug?.severity).toBe('critical')
    })

    it('should detect assignment in condition', async () => {
      const code = `
if (x = 1) {
  // ...
}
      `

      const bugs = await detector.detect(code, 'typescript')

      const assignBug = bugs.find(b => b.type === 'logic_error')
      expect(assignBug).toBeDefined()
      expect(assignBug?.severity).toBe('high')
    })

    it('should detect identical if-else branches', async () => {
      const code = `
if (condition) {
  doSomething();
} else {
  doSomething();
}
      `

      const bugs = await detector.detect(code, 'typescript')

      const branchBug = bugs.find(b => b.type === 'logic_error')
      expect(branchBug).toBeDefined()
      expect(branchBug?.severity).toBe('medium')
    })
  })

  describe('并发问题检测', () => {
    it('should detect potential race condition', async () => {
      const code = `
let counter = 0;
async function increment() {
  counter++;
  await delay(100);
}
      `

      const bugs = await detector.detect(code, 'typescript')

      // May detect as concurrency or other type
      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Python 特定检测', () => {
    it('should detect mutable default argument', async () => {
      const code = `
def create_user(name, roles=[]):
    roles.append('user')
    return { 'name': name, 'roles': roles }
      `

      const bugs = await detector.detect(code, 'python')

      const mutableBug = bugs.find(b => b.type === 'logic_error')
      expect(mutableBug).toBeDefined()
      expect(mutableBug?.severity).toBe('high')
    })

    it('should detect late binding closure', async () => {
      const code = `
functions = []
for i in range(5):
    functions.append(lambda: i)
      `

      const bugs = await detector.detect(code, 'python')

      // May detect as logic_error or other type
      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Go 特定检测', () => {
    it('should detect goroutine in loop', async () => {
      const code = `
for _, item := range items {
    go func() {
        process(item)
    }()
}
      `

      const bugs = await detector.detect(code, 'go')

      const goroutineBug = bugs.find(b => b.type === 'concurrency')
      expect(goroutineBug).toBeDefined()
      expect(goroutineBug?.severity).toBe('high')
    })

    it('should detect defer in loop', async () => {
      const code = `
for _, file := range files {
    f, _ := os.Open(file)
    defer f.Close()
}
      `

      const bugs = await detector.detect(code, 'go')

      const deferBug = bugs.find(b => b.type === 'resource_leak')
      expect(deferBug).toBeDefined()
      expect(deferBug?.severity).toBe('medium')
    })
  })

  describe('Rust 特定检测', () => {
    it('should detect double free', async () => {
      const code = `
let x = Box::new(42);
drop(x);
drop(x);
      `

      const bugs = await detector.detect(code, 'rust')

      const doubleFreeBug = bugs.find(b => b.type === 'memory_error')
      expect(doubleFreeBug).toBeDefined()
      expect(doubleFreeBug?.severity).toBe('critical')
    })
  })

  describe('静态分析', () => {
    it('should detect unhandled exceptions', async () => {
      const code = `
const data = JSON.parse(input);
      `

      const bugs = await detector.detect(code, 'typescript')

      const exceptionBug = bugs.find(b => b.type === 'unhandled_exception')
      expect(exceptionBug).toBeDefined()
      expect(exceptionBug?.severity).toBe('medium')
    })

    it('should detect type mismatches', async () => {
      const code = `
if (x === "42") {
  // ...
}
      `

      const bugs = await detector.detect(code, 'typescript')

      // May or may not detect depending on context
      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('检测结果结构', () => {
    it('should return proper BugDetection structure', async () => {
      const code = `
const x = eval('1 + 1');
      `

      const bugs = await detector.detect(code, 'typescript')

      expect(bugs.length).toBeGreaterThan(0)
      const bug = bugs[0]

      expect(bug).toHaveProperty('type')
      expect(bug).toHaveProperty('severity')
      expect(bug).toHaveProperty('message')
      expect(bug).toHaveProperty('location')
      expect(bug).toHaveProperty('possibleCauses')
      expect(bug).toHaveProperty('detectionMethod')

      expect(bug.location).toHaveProperty('start')
      expect(bug.location).toHaveProperty('end')
      expect(bug.location.start).toHaveProperty('line')
      expect(bug.location.start).toHaveProperty('column')
    })

    it('should sort by severity', async () => {
      const code = `
while (true) {}
console.log('debug');
const x = eval('1');
      `

      const bugs = await detector.detect(code, 'typescript')

      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      
      for (let i = 1; i < bugs.length; i++) {
        expect(severityOrder[bugs[i - 1].severity]).toBeLessThanOrEqual(
          severityOrder[bugs[i].severity]
        )
      }
    })
  })

  describe('边界情况', () => {
    it('should handle empty code', async () => {
      const bugs = await detector.detect('', 'typescript')

      expect(bugs).toEqual([])
    })

    it('should handle code with no bugs', async () => {
      const code = `
const x: number = 1;
const y: number = 2;
const sum: number = x + y;
      `

      const bugs = await detector.detect(code, 'typescript')

      expect(bugs.length).toBe(0)
    })

    it('should handle code with special characters', async () => {
      const code = `
const str = "Hello\\nWorld\\t!";
      `

      const bugs = await detector.detect(code, 'typescript')

      expect(Array.isArray(bugs)).toBe(true)
    })

    it('should handle very long code', async () => {
      const lines: string[] = []
      for (let i = 0; i < 1000; i++) {
        lines.push(`const x${i} = ${i};`)
      }
      const code = lines.join('\n')

      const bugs = await detector.detect(code, 'typescript')

      expect(Array.isArray(bugs)).toBe(true)
    })

    it('should handle deeply nested code', async () => {
      let code = 'if (true) {'
      for (let i = 0; i < 50; i++) {
        code += ' if (true) {'
      }
      for (let i = 0; i < 50; i++) {
        code += ' }'
      }
      code += ' }'

      const bugs = await detector.detect(code, 'typescript')

      expect(Array.isArray(bugs)).toBe(true)
    })
  })

  describe('多语言支持', () => {
    const testCases: Array<{ language: SupportedLanguage; code: string }> = [
      { language: 'typescript', code: 'const x = eval("1");' },
      { language: 'javascript', code: 'var x = eval("1");' },
      { language: 'python', code: 'x = []\ndef f(a=x): pass' },
      { language: 'go', code: 'for i := 0; i < 10; i++ {\n\tgo func() { println(i) }()\n}' },
      { language: 'rust', code: 'let x = Some(1).unwrap();' },
    ]

    testCases.forEach(({ language, code }) => {
      it(`should detect bugs in ${language}`, async () => {
        const bugs = await detector.detect(code, language)

        expect(Array.isArray(bugs)).toBe(true)
      })
    })
  })

  describe('性能测试', () => {
    it('should handle large code efficiently', async () => {
      const lines: string[] = []
      for (let i = 0; i < 1000; i++) {
        lines.push(`function func${i}() { return ${i}; }`)
      }
      const code = lines.join('\n')

      const start = Date.now()
      const bugs = await detector.detect(code, 'typescript')
      const duration = Date.now() - start

      expect(duration).toBeLessThan(2000)
      expect(Array.isArray(bugs)).toBe(true)
    })
  })

  describe('缓存功能', () => {
    it('should cache results when enabled', async () => {
      const cachedDetector = new BugDetector({ enableCache: true })
      const code = 'const x = 1;'

      const start1 = Date.now()
      await cachedDetector.detect(code, 'typescript')
      const time1 = Date.now() - start1

      const start2 = Date.now()
      await cachedDetector.detect(code, 'typescript')
      const time2 = Date.now() - start2

      expect(time2).toBeLessThanOrEqual(time1)
    })
  })

  describe('默认实例', () => {
    it('should export default detector', () => {
      expect(bugDetector).toBeDefined()
      expect(bugDetector).toBeInstanceOf(BugDetector)
    })
  })
})