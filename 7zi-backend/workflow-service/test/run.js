#!/usr/bin/env node
/**
 * Test Runner for Workflow Service
 *
 * Runs engine unit tests first, then HTTP integration tests.
 * Integration tests start the server on port 3004 to avoid conflicts.
 */

'use strict'

const { spawn } = require('child_process')

function runNodeTest(file, label) {
  return new Promise((resolve) => {
    console.log('\n' + '-'.repeat(60))
    console.log(' ' + label)
    console.log('-'.repeat(60))
    const child = spawn('node', [file], {
      stdio: 'inherit',
      env: { ...process.env },
    })
    child.on('close', (code) => {
      resolve(code)
    })
  })
}

async function main() {
  console.log('+'.repeat(60))
  console.log('       Workflow Service - Test Suite                     ')
  console.log('+'.repeat(60))

  // Engine unit tests
  const engineCode = await runNodeTest('test/engine.test.js', 'Engine Unit Tests (WorkflowEngine)')

  // HTTP integration tests (server on port 3004)
  const httpCode = await runNodeTest('test/http.test.js', 'HTTP Integration Tests')

  console.log('\n' + '-'.repeat(60))
  console.log(' Final Results')
  console.log('-'.repeat(60))

  if (engineCode === 0 && httpCode === 0) {
    console.log('ALL TESTS PASSED')
    process.exit(0)
  } else {
    if (engineCode !== 0) console.log('X Engine unit tests failed (exit ' + engineCode + ')')
    if (httpCode !== 0) console.log('X HTTP integration tests failed (exit ' + httpCode + ')')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Test runner error:', err)
  process.exit(1)
})
