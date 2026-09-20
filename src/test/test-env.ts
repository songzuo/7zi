/**
 * Test Environment Setup
 * Configures test-specific environment variables and mocks
 */

// Set test environment (use type assertion to bypass readonly check)
const _processEnv = process.env as Record<string, string | undefined>
_processEnv.NODE_ENV = 'test'

// Load test environment variables
import path from 'path'
import fs from 'fs'

const envTestPath = path.resolve(process.cwd(), '.env.test')

if (fs.existsSync(envTestPath)) {
  const envContent = fs.readFileSync(envTestPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && !key.startsWith('#')) {
      const value = valueParts.join('=')
      _processEnv[key] = value
    }
  })
}

// Override critical environment variables for testing
_processEnv.DATABASE_PATH = _processEnv.DATABASE_PATH || '/tmp/test-7zi.db'
_processEnv.JWT_SECRET = _processEnv.JWT_SECRET || 'test-jwt-secret-key'
_processEnv.NEXTAUTH_SECRET = _processEnv.NEXTAUTH_SECRET || 'test-nextauth-secret'
_processEnv.LOG_LEVEL = _processEnv.LOG_LEVEL || 'error' // Reduce noise in tests

// Disable Sentry in tests
_processEnv.NEXT_PUBLIC_SENTRY_DSN = ''
_processEnv.SENTRY_DSN = ''

// Set test URLs
_processEnv.NEXT_PUBLIC_APP_URL = _processEnv.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
_processEnv.NEXTAUTH_URL = _processEnv.NEXTAUTH_URL || 'http://localhost:3000'

// Configure test-specific timeouts
;(globalThis as { TEST_TIMEOUT?: number; HOOK_TIMEOUT?: number }).TEST_TIMEOUT = 10000
;(globalThis as { TEST_TIMEOUT?: number; HOOK_TIMEOUT?: number }).HOOK_TIMEOUT = 10000

// Export test utilities
export const TEST_CONFIG = {
  apiUrl: _processEnv.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  testDbPath: _processEnv.DATABASE_PATH || '/tmp/test-7zi.db',
  jwtSecret: _processEnv.JWT_SECRET || 'test-jwt-secret-key',
  timeout: {
    short: 1000,
    medium: 5000,
    long: 10000,
  },
}

// Setup global test utilities before tests run
beforeAll(() => {
  // Test environment initialized
})

afterAll(() => {
  // Test environment cleaned up
})
