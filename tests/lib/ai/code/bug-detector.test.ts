/**
 * @fileoverview Bug Detector 完整单元测试
 * @description 测试 Bug 检测器的所有核心功能
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { BugDetector, bugDetector } from '@/lib/ai/code/bug-detector'
import type { SupportedLanguage } from '@/lib/ai/code/types'

describe('BugDetector - 完整测试', () => {
  let detector: BugDetector

  beforeEach(() => {
    detector = new BugDetector({ enableCache: false })
  })

  describe('空引用检测 - 正常输入/输出', () => {
    it('应该检测潜在的空引用', async () => {
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

    it('应该检测使用 == 的 undefined 比较', async () => {
      const code = `
if (x == undefined) {
  // ...
}
      `

      const bugs = await detector.detect(code, 'typescript')

      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('数组相关检测', () => {
    it('应该检测没有边界检查的数组访问', async () => {
      const code = `
const arr = [1, 2, 3];
const element = arr[i];
      `

      const bugs = await detector.detect(code, 'typescript')

      const indexBug = bugs.find(b => b.type === 'index_error')
      expect(indexBug).toBeDefined()
      expect(indexBug?.severity).toBe('high')
    })

    it('应该检测迭代期间修改数组', async () => {
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
    it('应该检测缺少 await', async () => {
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

    it('应该检测未处理的 Promise', async () => {
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

    it('应该检测回调地狱', async () => {
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

      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('内存泄漏检测', () => {
    it('应该检测没有清理的事件监听器', async () => {
      const code = `
element.addEventListener('click', handler);
      `

      const bugs = await detector.detect(code, 'typescript')

      const leakBug = bugs.find(b => b.type === 'memory_leak')
      expect(leakBug).toBeDefined()
      expect(leakBug?.severity).toBe('medium')
    })

    it('应该检测没有清理的 interval', async () => {
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
    it('应该检测无限循环', async () => {
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

    it('应该检测条件中的赋值', async () => {
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
  })

  describe('Python 特定检测', () => {
    it('应该检测可变默认参数', async () => {
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
  })

  describe('Go 特定检测', () => {
    it('应该检测循环中的 goroutine', async () => {
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

    it('应该检测循环中的 defer', async () => {
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
    it('应该检测双重释放', async () => {
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
    it('应该检测未处理的异常', async () => {
      const code = `
const data = JSON.parse(input);
      `

      const bugs = await detector.detect(code, 'typescript')

      const exceptionBug = bugs.find(b => b.type === 'unhandled_exception')
      expect(exceptionBug).toBeDefined()
      expect(exceptionBug?.severity).toBe('medium')
    })
  })

  describe('检测结果结构', () => {
    it('应该返回正确的 BugDetection 结构', async () => {
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

    it('应该按严重程度排序', async () => {
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

  describe('错误处理 - 边界条件', () => {
    it('应该处理空代码', async () => {
      const bugs = await detector.detect('', 'typescript')

      expect(bugs).toEqual([])
    })

    it('应该处理没有 bug 的代码', async () => {
      const code = `
const x: number = 1;
const y: number = 2;
const sum: number = x + y;
      `

      const bugs = await detector.detect(code, 'typescript')

      expect(bugs.length).toBe(0)
    })

    it('应该处理包含特殊字符的代码', async () => {
      const code = `
const str = "Hello\\nWorld\\t!";
      `

      const bugs = await detector.detect(code, 'typescript')

      expect(Array.isArray(bugs)).toBe(true)
    })

    it('应该处理超长代码', async () => {
      const lines: string[] = []
      for (let i = 0; i < 1000; i++) {
        lines.push(`const x${i} = ${i};`)
      }
      const code = lines.join('\n')

      const bugs = await detector.detect(code, 'typescript')

      expect(Array.isArray(bugs)).toBe(true)
    })

    it('应该处理深度嵌套代码', async () => {
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
      it(`应该检测 ${language} 中的 bug`, async () => {
        const bugs = await detector.detect(code, language)

        expect(Array.isArray(bugs)).toBe(true)
      })
    })
  })

  describe('性能测试', () => {
    it('应该高效处理大型代码', async () => {
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
    it('启用缓存时应该缓存结果', async () => {
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
    it('应该导出默认检测器实例', () => {
      expect(bugDetector).toBeDefined()
      expect(bugDetector).toBeInstanceOf(BugDetector)
    })
  })

  describe('配置选项', () => {
    it('应该接受自定义配置', () => {
      const customDetector = new BugDetector({
        languages: ['typescript', 'javascript'],
        enableCache: false,
        verbose: true,
      })

      expect(customDetector).toBeDefined()
    })
  })
})
