'use strict'

/**
 * Integration-ish test for the JWT_SECRET production guard.
 *
 * Spawns the real server entry point in a child process with
 * NODE_ENV=production and no JWT_SECRET, and asserts it terminates with a
 * non-zero exit code.
 *
 * The server is started on port 0 (random / ephemeral) - it must die before
 * binding anyway, so no production port can ever be touched.
 */

const path = require('path')
const { spawn } = require('child_process')

const SERVER_ENTRY = path.join(__dirname, '..', '..', '..', 'server', 'websocket-server.js')

function runServer(env, timeoutMs = 10000) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, [SERVER_ENTRY], {
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        NODE_ENV: env.NODE_ENV,
        PORT: env.PORT || '0',
        ...(env.JWT_SECRET ? { JWT_SECRET: env.JWT_SECRET } : {}),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let settled = false

    child.stdout.on('data', d => {
      stdout += d.toString()
    })
    child.stderr.on('data', d => {
      stderr += d.toString()
    })

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        child.kill('SIGKILL')
        resolve({ code: null, signal: 'SIGKILL', stdout, stderr, timedOut: true })
      }
    }, timeoutMs)

    child.on('close', (code, signal) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({ code, signal, stdout, stderr, timedOut: false })
    })
  })
}

describe('production guard: JWT_SECRET required', () => {
  jest.setTimeout(20000)

  test('exits with a non-zero code when JWT_SECRET is missing in production', async () => {
    const result = await runServer({ NODE_ENV: 'production', PORT: '0' })

    expect(result.timedOut).toBe(false)
    expect(result.code).not.toBe(0)
    expect(result.code).toBe(1)
    expect(result.stderr).toMatch(/\[FATAL\] JWT_SECRET environment variable is required in production/)
    // Must not have started listening
    expect(result.stdout).not.toMatch(/WebSocket Server Started/)
  })

  test('starts normally in production when a strong JWT_SECRET is provided', async () => {
    const result = await runServer({
      NODE_ENV: 'production',
      PORT: '0',
      JWT_SECRET: 'p'.repeat(64),
    })

    // The server keeps running -> we terminate it via the timeout path.
    expect(result.timedOut).toBe(true)
    expect(result.stdout).toMatch(/WebSocket Server Started/)
    expect(result.stderr).not.toMatch(/\[FATAL\]/)
  })
})
