#!/usr/bin/env node
/**
 * Test Runner for WebSocket Service
 * 
 * Runs unit tests first, then integration tests (which start the server).
 * Integration tests run on port 3003 to avoid conflict with a running instance.
 */

'use strict'

const { spawn } = require('child_process')

function runNodeTest(file, label) {
  return new Promise((resolve) => {
    console.log(`\n${'─'.repeat(60)}`)
    console.log(` ${label}`)
    console.log(`${'─'.repeat(60)}`)
    const child = spawn('node', [file], {
      stdio: 'inherit',
    })
    child.on('close', (code) => {
      resolve(code)
    })
  })
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║       WebSocket Service — Test Suite                     ║')
  console.log('╚══════════════════════════════════════════════════════════╝')

  // Unit tests
  const unitCode = await runNodeTest('test/unit.test.js', 'Unit Tests (RoomManager)')
  const jwtCode = await runNodeTest('test/jwt-secret.test.js', 'Unit Tests (jwt-secret)')
  if (jwtCode !== 0) {
    console.log(`❌ jwt-secret unit tests failed (exit ${jwtCode})`)
    process.exit(1)
  }

  // Integration tests (server will start on port 3003)
  const intCode = await runNodeTest('test/integration.test.js', 'Integration Tests')

  console.log(`\n${'─'.repeat(60)}`)
  console.log(' Final Results')
  console.log(`${'─'.repeat(60)}`)

  if (unitCode === 0 && intCode === 0) {
    console.log('✅ All tests passed')
    process.exit(0)
  } else {
    if (unitCode !== 0) console.log(`❌ Unit tests failed (exit ${unitCode})`)
    if (intCode !== 0) console.log(`❌ Integration tests failed (exit ${intCode})`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Test runner error:', err)
  process.exit(1)
})
