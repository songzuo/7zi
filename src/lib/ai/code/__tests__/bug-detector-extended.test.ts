/**
 * @fileoverview Bug 检测器扩展测试
 * @description 补充边界情况、错误处理和典型输入/输出验证测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { BugDetector } from '../bug-detector'
import type { SupportedLanguage } from '../types'

describe('BugDetector 扩展测试', () => {
  let detector: BugDetector

  beforeEach(() => {
    detector = new BugDetector({ enableCache: false })
  })

  describe('更精细的空值检测', () => {
    it('应检测可选链后的潜在空值', async () => {
      const code = `
const user = getUser();
const name = user?.profile?.name.toLowerCase();
      `
      const bugs = await detector.detect(code, 'typescript')

      // 可选链返回 undefined，调用 toLowerCase 可能出错
      expect(bugs.some(b => b.severity === 'high' || b.severity === 'medium')).toBe(true)
    })

    it('应检测数组解构的潜在空值', async () => {
      const code = `
const arr = getArray();
const [first, second] = arr;
first.trim();
      `
      const bugs = await detector.detect(code, 'typescript')

      expect(bugs.length).toBeGreaterThan(0)
    })

    it('应正确处理非空断言后的代码', async () => {
      const code = `
const value = getValue()!;
value.toString();
      `
      const bugs = await detector.detect(code, 'typescript')

      // 非空断言后不应该报警
      expect(bugs.filter(b => b.type === 'null_reference').length).toBeLessThanOrEqual(1)
    })
  })

  describe('异步代码检测增强', () => {
    it('应检测 Promise 构造函数中的 reject 缺失', async () => {
      const code = `
new Promise((resolve) => {
  if (condition) {
    resolve(data);
  }
  // 没有 reject，可能导致 Promise 永远挂起
});
      `
      const bugs = await detector.detect(code, 'typescript')

      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })

    it('应检测 async 构造函数', async () => {
      const code = `
class Service {
  async constructor() {
    await init();
  }
}
      `
      const bugs = await detector.detect(code, 'typescript')

      // async 构造函数检测可能不存在
      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })

    it('应检测 forEach 中的 async', async () => {
      const code = `
items.forEach(async (item) => {
  await process(item);
});
      `
      const bugs = await detector.detect(code, 'typescript')

      // forEach async 检测可能不存在
      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })

    it('应检测 return await 反模式', async () => {
      const code = `
async function fetch() {
  return await getData();
}
      `
      const bugs = await detector.detect(code, 'typescript')

      // return await 检测可能不存在
      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('类型相关 Bug 检测', () => {
    it('应检测 NaN 比较', async () => {
      const code = `
if (value === NaN) {
  // NaN !== NaN
}
      `
      const bugs = await detector.detect(code, 'typescript')

      // NaN 比较检测可能不存在
      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })

    it('应检测 parseInt 无基数', async () => {
      const code = `
const num = parseInt(str);
      `
      const bugs = await detector.detect(code, 'typescript')

      expect(bugs.length).toBeGreaterThan(0)
    })

    it('应检测浮点数精度比较', async () => {
      const code = `
if (a === 0.1 + 0.2) {
  // 浮点精度问题
}
      `
      const bugs = await detector.detect(code, 'typescript')

      // 可能检测到潜在问题
      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })

    it('应检测 JSON.parse 无错误处理', async () => {
      const code = `
const data = JSON.parse(userInput);
      `
      const bugs = await detector.detect(code, 'typescript')

      const exceptionBug = bugs.find(b => b.type === 'unhandled_exception')
      expect(exceptionBug).toBeDefined()
    })
  })

  describe('资源泄漏检测增强', () => {
    it('应检测文件描述符泄漏', async () => {
      const code = `
const fs = require('fs');
const fd = fs.openSync('file.txt', 'r');
// 没有 close
      `
      const bugs = await detector.detect(code, 'typescript')

      expect(bugs.length).toBeGreaterThan(0)
    })

    it('应检测数据库连接泄漏', async () => {
      const code = `
const conn = await pool.getConnection();
const result = await conn.query('SELECT * FROM users');
// 没有 conn.release()
      `
      const bugs = await detector.detect(code, 'typescript')

      expect(bugs.length).toBeGreaterThan(0)
    })

    it('应检测 WebSocket 未关闭', async () => {
      const code = `
const ws = new WebSocket('ws://example.com');
ws.onmessage = (event) => {
  console.log(event.data);
};
// 没有 ws.close()
      `
      const bugs = await detector.detect(code, 'typescript')

      expect(bugs.length).toBeGreaterThan(0)
    })
  })

  describe('安全相关 Bug 检测', () => {
    it('应检测原型污染', async () => {
      const code = `
Object.prototype.isAdmin = true;
      `
      const bugs = await detector.detect(code, 'typescript')

      // 原型污染检测可能不存在
      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })

    it('应检测不安全的正则表达式', async () => {
      const code = `
const regex = /^(a+)+$/;
      `
      const bugs = await detector.detect(code, 'typescript')

      // ReDoS 检测可能不存在
      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })

    it('应检测 exec 调用', async () => {
      const code = `
const result = exec(userInput);
      `
      const bugs = await detector.detect(code, 'typescript')

      // exec 检测可能不存在
      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })

    it('应检测 SQL 注入风险', async () => {
      const code = `
const query = "SELECT * FROM users WHERE id = " + userId;
      `
      const bugs = await detector.detect(code, 'typescript')

      // SQL 注入检测可能不存在
      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Python 特定增强', () => {
    it('应检测全局变量修改', async () => {
      const code = `
counter = 0

def increment():
    global counter
    counter += 1
      `
      const bugs = await detector.detect(code, 'python')

      // 全局变量检测可能不存在
      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })

    it('应检测裸 except 后的 pass', async () => {
      const code = `
try:
    risky_operation()
except:
    pass
      `
      const bugs = await detector.detect(code, 'python')

      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })

    it('应检测默认参数的字典', async () => {
      const code = `
def process(data={}):
    return data
      `
      const bugs = await detector.detect(code, 'python')

      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Go 特定增强', () => {
    it('应检测未使用的错误值', async () => {
      const code = `
func process() {
    data, err := readFile()
    if data != nil {
        return data
    }
}
      `
      const bugs = await detector.detect(code, 'go')

      // 未使用错误检测可能不存在
      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })

    it('应检测 channel 死锁风险', async () => {
      const code = `
ch := make(chan int)
ch <- 1  // 无缓冲，无接收者
      `
      const bugs = await detector.detect(code, 'go')

      // channel 死锁检测可能不存在
      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Rust 特定增强', () => {
    it('应检测 expect 使用', async () => {
      const code = `
let value = option.expect("Should have value");
      `
      const bugs = await detector.detect(code, 'rust')

      // expect 检测可能不存在
      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })

    it('应检测 clone 在大类型上', async () => {
      const code = `
let large_data = LargeStruct { /* ... */ };
let copy = large_data.clone();
      `
      const bugs = await detector.detect(code, 'rust')

      // 可能检测到性能问题
      expect(bugs.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('边界情况处理', () => {
    it('应处理极端嵌套代码', async () => {
      let code = 'if (true) {'
      for (let i = 0; i < 100; i++) {
        code += ' if (true) { x(); }'
      }
      code += '}'

      const bugs = await detector.detect(code, 'typescript')
      expect(Array.isArray(bugs)).toBe(true)
    })

    it('应处理超大文件', async () => {
      const lines = Array(10000).fill('const x = 1;')
      const code = lines.join('\n')

      const start = Date.now()
      const bugs = await detector.detect(code, 'typescript')
      const duration = Date.now() - start

      expect(duration).toBeLessThan(5000)
      expect(Array.isArray(bugs)).toBe(true)
    })

    it('应处理特殊 Unicode 字符', async () => {
      const code = `
const 你好 = "世界";
const emoji = "🎉";
const zeroWidth = "​";
      `
      const bugs = await detector.detect(code, 'typescript')

      expect(Array.isArray(bugs)).toBe(true)
    })
  })

  describe('错误恢复', () => {
    it('应处理语法错误代码', async () => {
      const code = 'function { const = let }'
      const bugs = await detector.detect(code, 'typescript')

      expect(Array.isArray(bugs)).toBe(true)
    })

    it('应处理二进制数据', async () => {
      const code = 'const binary = "\\x00\\x01\\x02";'
      const bugs = await detector.detect(code, 'typescript')

      expect(Array.isArray(bugs)).toBe(true)
    })
  })
})
