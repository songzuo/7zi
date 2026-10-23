#!/usr/bin/env node
/**
 * Smoke Test Script for WebSocket Service
 * 
 * Usage:
 *   node smoke.js [url]
 *   node smoke.js ws://localhost:3002
 *   node smoke.js http://localhost:3002
 *
 * Performs:
 *   1. HTTP health check
 *   2. Establish a WebSocket connection
 *   3. Join a room and verify events
 *   4. Clean disconnect
 */

'use strict'

const { io } = require('socket.io-client')

const DEFAULT_URL = process.argv[2] || 'http://localhost:3002'

// Normalize URL
function normalizeUrl(url) {
  if (url.startsWith('ws')) return url
  if (url.startsWith('http')) return url
  return `http://${url}`
}

function green(msg) { console.log('\x1b[32m✓\x1b[0m', msg) }
function red(msg)   { console.log('\x1b[31m✗\x1b[0m', msg) }

async function httpHealthCheck(baseUrl) {
  process.stdout.write(`Health check: ${baseUrl}/health ... `)
  try {
    const res = await fetch(`${baseUrl}/health`)
    if (res.status !== 200) {
      red(`HTTP ${res.status}`)
      return false
    }
    const body = await res.json()
    if (body.status !== 'ok') {
      red(`status=${body.status}`)
      return false
    }
    green(`ok (rooms=${body.rooms}, connections=${body.connections})`)
    return true
  } catch (err) {
    red(err.message)
    return false
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function runSmoke(baseUrl) {
  console.log('\n=== WebSocket Service Smoke Test ===')
  console.log(`Target: ${baseUrl}\n`)

  let passed = 0
  let failed = 0

  // 1. HTTP Health Check
  process.stdout.write('[1/5] HTTP Health Check: ')
  const healthOk = await httpHealthCheck(baseUrl)
  if (healthOk) passed++; else failed++

  // 2. Connect
  process.stdout.write('[2/5] WebSocket Connection (demo mode): ')
  const socket = io(baseUrl, {
    transports: ['websocket'],
    reconnectionDelay: 0,
    timeout: 5000,
    auth: { userId: 'smoke-test-user', userName: 'SmokeTestUser' },
  })

  let connected = false
  let authenticated = false

  await new Promise((resolve) => {
    socket.on('connect', () => {
      connected = true
    })
    socket.on('auth:authenticated', (data) => {
      authenticated = true
      green(`connected, userId=${data.userId}`)
      passed++
      resolve()
    })
    socket.on('connect_error', (err) => {
      red(`connect_error: ${err.message}`)
      failed++
      resolve()
    })
    // Timeout
    setTimeout(() => {
      if (!connected) {
        red('connection timeout (5s)')
        failed++
        resolve()
      }
    }, 6000)
  })

  if (!connected || !authenticated) {
    socket.close()
    console.log('\n❌ Smoke test aborted: could not connect\n')
    process.exit(1)
  }

  // 3. Join Room
  process.stdout.write('[3/5] Join Room (room:join → room:joined): ')
  await new Promise((resolve) => {
    socket.emit('room:join', {
      roomId: 'smoke-test-room',
      type: 'document',
      documentId: 'smoke-doc-1',
      name: 'Smoke Test Room',
    })
    socket.once('room:joined', (data) => {
      if (data.roomId === 'smoke-test-room' && data.users.length === 1) {
        green(`joined room, users=${data.users.length}`)
        passed++
      } else {
        red(`unexpected data: ${JSON.stringify(data)}`)
        failed++
      }
      resolve()
    })
    socket.once('system:error', (err) => {
      red(`system:error: ${err.message}`)
      failed++
      resolve()
    })
    setTimeout(() => {
      red('timeout waiting for room:joined')
      failed++
      resolve()
    }, 5000)
  })

  // 4. Broadcast cursor move
  process.stdout.write('[4/5] Broadcast Cursor Move: ')
  await new Promise((resolve) => {
    socket.emit('cursor:move', {
      roomId: 'smoke-test-room',
      position: 100,
      selection: null,
    })
    // This is a fire-and-forget event; we just verify it doesn't throw
    setTimeout(() => {
      green('cursor:move sent without error')
      passed++
      resolve()
    }, 500)
  })

  // 5. Leave Room
  process.stdout.write('[5/5] Leave Room (room:leave → room:left): ')
  await new Promise((resolve) => {
    socket.emit('room:leave', { roomId: 'smoke-test-room' })
    socket.once('room:left', (data) => {
      if (data.roomId === 'smoke-test-room') {
        green('left room cleanly')
        passed++
      } else {
        red(`unexpected data: ${JSON.stringify(data)}`)
        failed++
      }
      resolve()
    })
    socket.once('system:error', (err) => {
      red(`system:error: ${err.message}`)
      failed++
      resolve()
    })
    setTimeout(() => {
      red('timeout waiting for room:left')
      failed++
      resolve()
    }, 5000)
  })

  // Cleanup
  await sleep(200)
  socket.close()

  // Summary
  console.log(`\n=== Summary ===`)
  console.log(`Passed: ${passed}/5`)
  console.log(`Failed: ${failed}/5`)

  if (failed === 0) {
    green('All checks passed!')
    console.log('')
    process.exit(0)
  } else {
    red(`${failed} check(s) failed`)
    console.log('')
    process.exit(1)
  }
}

runSmoke(normalizeUrl(DEFAULT_URL)).catch((err) => {
  console.error('Smoke test error:', err.message)
  process.exit(1)
})
