#!/usr/bin/env node
/**
 * Test script for /api/health/detailed endpoint security
 * Verifies authentication requirements and error response formats
 */

const http = require('http')

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const ENDPOINT = '/api/health/detailed'

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function logTest(testName) {
  console.log('\n' + '='.repeat(60))
  log(`🧪 Test: ${testName}`, colors.blue)
  console.log('='.repeat(60))
}

function logResult(passed, details) {
  if (passed) {
    log(`✅ PASS: ${details}`, colors.green)
  } else {
    log(`❌ FAIL: ${details}`, colors.red)
  }
}

/**
 * Make HTTP request to endpoint
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, res => {
      let body = ''
      res.on('data', chunk => (body += chunk))
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body)
          resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed })
        } catch (e) {
          resolve({ statusCode: res.statusCode, headers: res.headers, body: body })
        }
      })
    })

    req.on('error', reject)
    if (options.body) {
      req.write(options.body)
    }
    req.end()
  })
}

/**
 * Test 1: Unauthenticated access should return 401
 */
async function testUnauthenticatedAccess() {
  logTest('Unauthenticated Access (No Token)')

  try {
    const response = await makeRequest(`${BASE_URL}${ENDPOINT}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    log(`Status Code: ${response.statusCode}`)
    log(`Response Body:`, JSON.stringify(response.body, null, 2))

    const checks = []

    // Check status code
    const hasCorrectStatus = response.statusCode === 401
    logResult(hasCorrectStatus, `Status code is 401 (got ${response.statusCode})`)
    checks.push(hasCorrectStatus)

    // Check error format
    const hasSuccessFalse = response.body.success === false
    logResult(hasSuccessFalse, `Response has "success: false"`)
    checks.push(hasSuccessFalse)

    const hasErrorField = response.body.error !== undefined
    logResult(hasErrorField, `Response has "error" field`)
    checks.push(hasErrorField)

    const hasErrorType = response.body.error?.type !== undefined
    logResult(hasErrorType, `Error has "type" field`)
    checks.push(hasErrorType)

    const hasErrorTimestamp = response.body.error?.timestamp !== undefined
    logResult(hasErrorTimestamp, `Error has "timestamp" field`)
    checks.push(hasErrorTimestamp)

    return checks.every(c => c)
  } catch (error) {
    logResult(false, `Request failed: ${error.message}`)
    return false
  }
}

/**
 * Test 2: Invalid token should return 401
 */
async function testInvalidToken() {
  logTest('Invalid Token')

  try {
    const response = await makeRequest(`${BASE_URL}${ENDPOINT}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid-token-12345',
      },
    })

    log(`Status Code: ${response.statusCode}`)
    log(`Response Body:`, JSON.stringify(response.body, null, 2))

    const checks = []

    // Check status code
    const hasCorrectStatus = response.statusCode === 401
    logResult(hasCorrectStatus, `Status code is 401 (got ${response.statusCode})`)
    checks.push(hasCorrectStatus)

    // Check error format
    const hasSuccessFalse = response.body.success === false
    logResult(hasSuccessFalse, `Response has "success: false"`)
    checks.push(hasSuccessFalse)

    return checks.every(c => c)
  } catch (error) {
    logResult(false, `Request failed: ${error.message}`)
    return false
  }
}

/**
 * Test 3: Malformed Authorization header should return 401
 */
async function testMalformedHeader() {
  logTest('Malformed Authorization Header')

  try {
    const response = await makeRequest(`${BASE_URL}${ENDPOINT}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic invalid-format',
      },
    })

    log(`Status Code: ${response.statusCode}`)
    log(`Response Body:`, JSON.stringify(response.body, null, 2))

    const checks = []

    // Check status code
    const hasCorrectStatus = response.statusCode === 401
    logResult(hasCorrectStatus, `Status code is 401 (got ${response.statusCode})`)
    checks.push(hasCorrectStatus)

    return checks.every(c => c)
  } catch (error) {
    logResult(false, `Request failed: ${error.message}`)
    return false
  }
}

/**
 * Test 4: Missing Authorization header should return 401
 */
async function testMissingHeader() {
  logTest('Missing Authorization Header')

  try {
    const response = await makeRequest(`${BASE_URL}${ENDPOINT}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    log(`Status Code: ${response.statusCode}`)
    log(`Response Body:`, JSON.stringify(response.body, null, 2))

    const checks = []

    // Check status code
    const hasCorrectStatus = response.statusCode === 401
    logResult(hasCorrectStatus, `Status code is 401 (got ${response.statusCode})`)
    checks.push(hasCorrectStatus)

    return checks.every(c => c)
  } catch (error) {
    logResult(false, `Request failed: ${error.message}`)
    return false
  }
}

/**
 * Main test runner
 */
async function runTests() {
  log('\n' + '█'.repeat(60))
  log('  Security Test Suite for /api/health/detailed', colors.yellow)
  log('█'.repeat(60))

  const results = {
    'Unauthenticated Access': await testUnauthenticatedAccess(),
    'Invalid Token': await testInvalidToken(),
    'Malformed Header': await testMalformedHeader(),
    'Missing Header': await testMissingHeader(),
  }

  // Summary
  console.log('\n' + '█'.repeat(60))
  log('  Test Summary', colors.yellow)
  console.log('█'.repeat(60))

  const totalTests = Object.keys(results).length
  const passedTests = Object.values(results).filter(r => r).length

  for (const [name, passed] of Object.entries(results)) {
    logResult(passed, name)
  }

  console.log('\n' + '─'.repeat(60))
  log(
    `Total: ${passedTests}/${totalTests} tests passed`,
    passedTests === totalTests ? colors.green : colors.red
  )
  console.log('─'.repeat(60) + '\n')

  process.exit(passedTests === totalTests ? 0 : 1)
}

// Run tests
runTests().catch(error => {
  log(`Fatal error: ${error.message}`, colors.red)
  console.error(error)
  process.exit(1)
})
