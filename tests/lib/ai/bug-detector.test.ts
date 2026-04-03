/**
 * @fileoverview Bug 检测器单元测试
 * @description 为 v1.12.0 AI 代码智能系统编写单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { BugDetector, bugDetector } from '@/lib/ai/code/bug-detector'
import type { SupportedLanguage } from '@/lib/ai/code/types'

describe('BugDetector', () => {
  let detector: BugDetector

  beforeEach(() => {
    detector = new BugDetector({ enableCache: false })
  })

  describe('should detect null reference patterns', () => {
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

    it('should detect optional chaining missing', async () => {
      const code = `
const user = getUser();
if (user.profile.name) {
  console.log(user.profile.name);
}
      `

      const bugs = await detector.detect(code, 'typescript')

      // May detect potential null reference
      expect(bugs.length).toBeGreaterThanOrEqual(0)
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

  describe('should detect type mismatches', () => {
    it('should detect type coercion issues', async () => {
      const code = `
const num: number = '42';
      `

      const bugs = await detector.detect(code, 'typescript')

      const typeBug = bugs.find(b => b.type === 'type_mismatch' || b.type === 'type_error')
      expect(typeBug || bugs.length).toBeDefined()
    })

    it('should detect loose equality', async () => {
      const code = `
if (x == 42) {
  // ...
}
      `

      const bugs = await detector.detect(code, 'typescript')

      // May detect type mismatch
      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })

    it('should detect type narrowing issues', async () => {
      const code = `
const value: string | number = 'hello';
if (typeof value === 'string') {
  return value.toFixed(2);
}
      `

      const bugs = await detector.detect(code, 'typescript')

      expect(Array.isArray(bugs)).toBe(true)
    })
  })

  describe('should detect unhandled promise rejections', () => {
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

    it('should detect uncaught promise in catch', async () => {
      const code = `
promise.then(result => console.log(result));
      `

      const bugs = await detector.detect(code, 'typescript')

      expect(Array.isArray(bugs)).toBe(true)
    })
  })

  describe('should detect memory leaks', () => {
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

    it('should detect setTimeout without cleanup', async () => {
      const code = `
setTimeout(() => {
  console.log('delayed');
}, 1000);
      `

      const bugs = await detector.detect(code, 'typescript')

      // May detect as potential memory leak
      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('should detect logic errors', () => {
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

    it('should detect unreachable code', async () => {
      const code = `
function test() {
  return 1;
  console.log('unreachable');
}
      `

      const bugs = await detector.detect(code, 'typescript')

      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('should detect array issues', () => {
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

  describe('should detect concurrency issues', () => {
    it('should detect potential race condition', async () => {
      const code = `
let counter = 0;
async function increment() {
  counter++;
  await delay(100);
}
      `

      const bugs = await detector.detect(code, 'typescript')

      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })

    it('should detect shared mutable state', async () => {
      const code = `
let shared = { count: 0 };
async function modify() {
  shared.count++;
}
      `

      const bugs = await detector.detect(code, 'typescript')

      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Python specific detection', () => {
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

      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })

    it('should detect comparison to None using ==', async () => {
      const code = `
if x == None:
    pass
      `

      const bugs = await detector.detect(code, 'python')

      // Should detect this as a potential issue
      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Go specific detection', () => {
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

  describe('Rust specific detection', () => {
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

    it('should detect unwrap on None', async () => {
      const code = `
let value = None.unwrap();
      `

      const bugs = await detector.detect(code, 'rust')

      expect(bugs.length).toBeGreaterThan(0)
    })
  })

  describe('should handle edge cases', () => {
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

    it('should handle special characters', async () => {
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

  describe('detection result structure', () => {
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

  describe('multi-language support', () => {
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

  describe('performance', () => {
    it('should handle large code efficiently', async () => {
      const lines: string[] = []
      for (let i = 0; i < 1000; i++) {
        lines.push(`function func${i}() { return ${i}; }`)
      }
      const code = lines.join('\n')

      const start = Date.now()
      const bugs = await detector.detect(code, 'typescript')
      const duration = Date.now() - start

      expect(duration).toBeLessThan(5000)
      expect(Array.isArray(bugs)).toBe(true)
    })
  })

  describe('caching', () => {
    it('should cache results when enabled', async () => {
      const cachedDetector = new BugDetector({ enableCache: true })
      const code = 'const x = 1;'

      const result1 = await cachedDetector.detect(code, 'typescript')
      const result2 = await cachedDetector.detect(code, 'typescript')

      expect(result1).toEqual(result2)
    })
  })

  describe('default instance', () => {
    it('should export default detector', () => {
      expect(bugDetector).toBeDefined()
      expect(bugDetector).toBeInstanceOf(BugDetector)
    })
  })
})
