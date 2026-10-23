#!/usr/bin/env node
/**
 * Test Runner for Workflow Service
 *
 * Runs engine unit tests first, then HTTP integration tests.
 * Integration tests start the server on an ephemeral free port (3004 by
 * default, override with WORKFLOW_TEST_PORT) to avoid conflicts.
 *
 * 用法（从任意目录均可执行）：
 *   node workflow-service/test/run.js
 *   node 7zi-backend/workflow-service/test/run.js
 *
 * 退出码：
 *   0  - 全部通过
 *   1  - 引擎单测失败
 *   2  - HTTP 集成测试失败
 *   3  - 引擎单测与 HTTP 集成测试均失败
 *   4  - runner 自身异常（无法 spawn 子进程等）
 */

'use strict'

const { spawn } = require('child_process')
const net = require('net')
const path = require('path')

// 测试文件绝对路径：基于 __dirname 解析，避免从仓库根目录或其他 cwd
// 运行时出现 MODULE_NOT_FOUND。
const TEST_DIR = __dirname
const ENGINE_TEST = path.join(TEST_DIR, 'engine.test.js')
const HTTP_TEST = path.join(TEST_DIR, 'http.test.js')

// 单个子测试的硬超时：即使某个测试内部挂死也不会让整个 runner 无限等待。
const SUBTEST_TIMEOUT_MS = 120 * 1000

/**
 * 解析 node:test 的 TAP 输出，抽取失败的测试名。
 * node:test 的 TAP 输出中，套件级失败在第 0 列，具体失败子测试带缩进。
 * 优先返回带缩进的子测试名（更具体），没有时回退到套件级失败名。
 * @param {string} output
 * @returns {string[]}
 */
function parseFailedTests(output) {
  const nested = []
  const top = []
  for (const line of output.split('\n')) {
    // TAP: "not ok 23 - some test name"（可带缩进表示嵌套层级）
    const m = /^(\s*)not ok\s+\d+\s+-\s+(.+)$/.exec(line)
    if (m) {
      const name = m[2].trim()
      if (m[1].length > 0) {
        if (!nested.includes(name)) nested.push(name)
      } else if (!top.includes(name)) {
        top.push(name)
      }
      continue
    }
    // 兼容非 TAP 输出格式：✗ / ✘ / FAIL
    const m2 = /^\s*(?:✗|✘|FAIL)\s+(.+)$/.exec(line)
    if (m2) {
      const name = m2[1].trim()
      if (!nested.includes(name)) nested.push(name)
    }
  }
  return nested.length > 0 ? nested : top
}

/**
 * 运行单个测试文件。stdout/stderr 同时继承到终端并缓冲，便于汇总失败清单。
 * @returns {Promise<{code:number, timedOut:boolean, failed:string[]}>}
 */
function runNodeTest(file, label, env = {}) {
  return new Promise((resolve) => {
    console.log('\n' + '-'.repeat(60))
    console.log(' ' + label)
    console.log('-'.repeat(60))

    let buffer = ''
    const child = spawn(process.execPath, [file], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
      cwd: TEST_DIR,
    })

    const capture = (chunk) => {
      buffer += chunk.toString()
      process.stdout.write(chunk)
    }
    child.stdout.on('data', capture)
    child.stderr.on('data', capture)

    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      console.error('\n[TIMEOUT] ' + label + ' 超过 ' + SUBTEST_TIMEOUT_MS / 1000 + 's 未结束，强制终止')
      child.kill('SIGKILL')
    }, SUBTEST_TIMEOUT_MS)
    if (typeof timer.unref === 'function') timer.unref()

    child.on('error', (err) => {
      clearTimeout(timer)
      console.error('Failed to spawn ' + file + ':', err.message)
      resolve({ code: 1, timedOut, failed: [] })
    })

    child.on('close', (code, signal) => {
      clearTimeout(timer)
      if (signal) console.error('[SIGNAL] ' + label + ' 被信号 ' + signal + ' 终止')
      // 被信号杀死时 code 为 null，按失败处理（退出码 1）
      resolve({
        code: code === null ? 1 : code,
        timedOut,
        failed: parseFailedTests(buffer),
      })
    })
  })
}

/**
 * 找一个当前空闲的本地端口，避免 EADDRINUSE。
 * @returns {Promise<number>}
 */
function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.unref()
    srv.on('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
  })
}

/**
 * 打印失败清单。
 */
function printFailures(label, result) {
  console.log('\n   失败详情 — ' + label + ':')
  if (result.timedOut) {
    console.log('     · 测试超时未结束（> ' + SUBTEST_TIMEOUT_MS / 1000 + 's）')
  }
  if (result.failed.length === 0) {
    console.log('     · 未能解析到具体测试名（详见上方输出）')
  } else {
    for (const name of result.failed) {
      console.log('     ✗ ' + name)
    }
  }
}

async function main() {
  console.log('+'.repeat(60))
  console.log('       Workflow Service - Test Suite                     ')
  console.log('+'.repeat(60))

  // Engine unit tests
  const engine = await runNodeTest(ENGINE_TEST, 'Engine Unit Tests (WorkflowEngine)')
  const engineFailed = engine.code !== 0

  // HTTP integration tests（使用空闲端口，避免与在跑实例冲突）
  const port = process.env.WORKFLOW_TEST_PORT
    ? parseInt(process.env.WORKFLOW_TEST_PORT, 10)
    : await findFreePort()
  const http = await runNodeTest(HTTP_TEST, 'HTTP Integration Tests (port ' + port + ')', {
    WORKFLOW_TEST_PORT: String(port),
    PORT: String(port),
  })
  const httpFailed = http.code !== 0

  console.log('\n' + '-'.repeat(60))
  console.log(' Final Results')
  console.log('-'.repeat(60))
  console.log(' Engine unit tests : ' + (engineFailed ? 'FAILED (exit ' + engine.code + ')' : 'PASSED'))
  console.log(' HTTP integration  : ' + (httpFailed ? 'FAILED (exit ' + http.code + ')' : 'PASSED'))

  if (engineFailed) {
    console.log('X Engine unit tests failed (exit ' + engine.code + ')')
    printFailures('Engine Unit Tests', engine)
  }
  if (httpFailed) {
    console.log('X HTTP integration tests failed (exit ' + http.code + ')')
    printFailures('HTTP Integration Tests', http)
  }

  if (!engineFailed && !httpFailed) {
    console.log('ALL TESTS PASSED')
    process.exit(0)
  }

  // 区分失败来源：引擎失败与 HTTP 失败使用不同退出码，便于 CI 定位
  process.exit(engineFailed && httpFailed ? 3 : engineFailed ? 1 : 2)
}

main().catch((err) => {
  console.error('Test runner error:', err)
  process.exit(4)
})
