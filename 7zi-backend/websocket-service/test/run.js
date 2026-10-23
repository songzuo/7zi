#!/usr/bin/env node
/**
 * Test Runner for WebSocket Service
 *
 * Runs unit tests first, then integration tests (which start the server).
 * Integration tests run on port 3003 to avoid conflict with a running instance.
 *
 * 用法（从任意目录均可执行）：
 *   node websocket-service/test/run.js
 *   node 7zi-backend/websocket-service/test/run.js
 *
 * 退出码：
 *   0  - 全部通过
 *   1  - 单测失败
 *   2  - 集成测试失败
 *   3  - 单测与集成测试均失败
 */

'use strict'

const { spawn } = require('child_process')
const path = require('path')

// 测试文件绝对路径：基于 __dirname 解析，避免从仓库根目录或其他 cwd
// 运行时出现 MODULE_NOT_FOUND。
const TEST_DIR = __dirname
const UNIT_TEST = path.join(TEST_DIR, 'unit.test.js')
const JWT_TEST = path.join(TEST_DIR, 'jwt-secret.test.js')
const INTEGRATION_TEST = path.join(TEST_DIR, 'integration.test.js')

// 单个测试进程的最长运行时间，超时后强制结束，避免 runner 永久挂起。
const TEST_TIMEOUT_MS = 60_000

/**
 * 解析 node:test 的 TAP 输出，抽取失败的测试名。
 * 优先返回带缩进的子测试名（更具体），没有时回退到套件级失败名。
 * @param {string} output
 * @returns {string[]}
 */
function parseFailedTests(output) {
  const nested = []
  const top = []
  for (const line of output.split('\n')) {
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
    const m2 = /^\s*(?:✗|✘|FAIL)\s+(.+)$/.exec(line)
    if (m2) {
      const name = m2[1].trim()
      if (!nested.includes(name)) nested.push(name)
    }
  }
  return nested.length > 0 ? nested : top
}

/**
 * 运行单个测试文件。
 * @returns {Promise<{code:number, signal:string|null, timedOut:boolean, failed:string[]}>}
 */
function runNodeTest(file, label) {
  return new Promise((resolve) => {
    console.log('\n' + '─'.repeat(60))
    console.log(' ' + label)
    console.log('─'.repeat(60))

    let buffer = ''
    const child = spawn(process.execPath, [file], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: { ...process.env },
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
      console.error(`\n⏱ ${label} 超时（${TEST_TIMEOUT_MS / 1000}s），强制终止`)
      child.kill('SIGKILL')
    }, TEST_TIMEOUT_MS)

    child.on('error', (err) => {
      clearTimeout(timer)
      console.error('Failed to spawn ' + file + ':', err.message)
      resolve({ code: 1, signal: null, timedOut: false, failed: [] })
    })

    child.on('close', (code, signal) => {
      clearTimeout(timer)
      if (timedOut) {
        resolve({ code: 1, signal, timedOut: true, failed: parseFailedTests(buffer) })
      } else {
        // 被信号杀死时 code 为 null，按失败处理
        resolve({
          code: code === null ? 1 : code,
          signal,
          timedOut: false,
          failed: parseFailedTests(buffer),
        })
      }
    })
  })
}

/**
 * 打印失败清单。
 */
function printFailures(label, result) {
  console.log('\n   失败详情 — ' + label + ':')
  if (result.timedOut) {
    console.log(`     · 测试超时未结束（> ${TEST_TIMEOUT_MS / 1000}s）`)
  }
  if (!result.failed || result.failed.length === 0) {
    console.log('     · 未能解析到具体测试名（详见上方输出）')
  } else {
    for (const name of result.failed) {
      console.log('     ✗ ' + name)
    }
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║       WebSocket Service — Test Suite                     ║')
  console.log('╚══════════════════════════════════════════════════════════╝')

  // Unit tests
  const unit = await runNodeTest(UNIT_TEST, 'Unit Tests (RoomManager)')
  const unitFailed = unit.code !== 0

  const jwt = await runNodeTest(JWT_TEST, 'Unit Tests (jwt-secret)')
  const jwtFailed = jwt.code !== 0

  // Integration tests (server will start on port 3003)
  const integration = await runNodeTest(INTEGRATION_TEST, 'Integration Tests')
  const integrationFailed = integration.code !== 0

  console.log('\n' + '─'.repeat(60))
  console.log(' Final Results')
  console.log('─'.repeat(60))
  console.log(` Unit tests (RoomManager) : ${unitFailed ? 'FAILED (exit ' + unit.code + ')' : 'PASSED'}`)
  console.log(` Unit tests (jwt-secret)  : ${jwtFailed ? 'FAILED (exit ' + jwt.code + ')' : 'PASSED'}`)
  console.log(` Integration tests        : ${integrationFailed ? 'FAILED (exit ' + integration.code + ')' : 'PASSED'}`)

  if (unitFailed) {
    console.log(`❌ Unit tests failed (exit ${unit.code})`)
    printFailures('Unit Tests (RoomManager)', unit)
  }
  if (jwtFailed) {
    console.log(`❌ jwt-secret unit tests failed (exit ${jwt.code})`)
    printFailures('Unit Tests (jwt-secret)', jwt)
  }
  if (integrationFailed) {
    console.log(`❌ Integration tests failed (exit ${integration.code})`)
    printFailures('Integration Tests', integration)
  }

  const allFailed = unitFailed && jwtFailed && integrationFailed
  const anyFailed = unitFailed || jwtFailed || integrationFailed

  if (!anyFailed) {
    console.log('✅ All tests passed')
    process.exit(0)
  }

  // 显式退出，确保 runner 不会因残留句柄而挂起
  process.exit(allFailed ? 3 : 1)
}

main().catch((err) => {
  console.error('Test runner error:', err)
  process.exit(1)
})
