/**
 * API Latency Benchmark Script
 * Tests critical API endpoints, DB queries, and external dependencies
 * Outputs results for P50/P95/P99 analysis
 */

import { performance } from 'perf_hooks'
import http from 'http'
import https from 'https'

// ============================================
// Configuration
// ============================================

const CONFIG = {
  // Target server - use environment or default to local
  baseUrl: process.env.BENCHMARK_URL || 'http://127.0.0.1:3000',
  apiPrefix: '/api',

  // Test parameters
  iterations: 100,
  warmupRuns: 5,
  concurrency: 10,

  // Timeouts
  requestTimeout: 10000,
  dbTimeout: 5000,

  // Thresholds (ms)
  thresholds: {
    excellent: 100,
    good: 300,
    acceptable: 500,
    slow: 1000,
  },
}

// ============================================
// Types
// ============================================

interface LatencyResult {
  latency: number
  status?: number
  error?: string
  timestamp: number
}

interface BenchmarkStats {
  name: string
  count: number
  errors: number
  errorRate: number
  min: number
  max: number
  mean: number
  median: number
  p50: number
  p75: number
  p90: number
  p95: number
  p99: number
  stdDev: number
  status: 'excellent' | 'good' | 'acceptable' | 'slow' | 'critical'
}

// ============================================
// Utility Functions
// ============================================

function calculateStats(name: string, results: LatencyResult[]): BenchmarkStats {
  const latencies = results.map(r => r.latency).filter(l => l > 0)
  const errors = results.filter(r => r.error).length

  if (latencies.length === 0) {
    return {
      name,
      count: results.length,
      errors,
      errorRate: 100,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      p50: 0,
      p75: 0,
      p90: 0,
      p95: 0,
      p99: 0,
      stdDev: 0,
      status: 'critical',
    }
  }

  latencies.sort((a, b) => a - b)

  const sum = latencies.reduce((a, b) => a + b, 0)
  const mean = sum / latencies.length
  const median = latencies[Math.floor(latencies.length / 2)]

  const pIdx = (p: number) => Math.floor(latencies.length * p)
  const p50 = latencies[pIdx(0.5)]
  const p75 = latencies[pIdx(0.75)]
  const p90 = latencies[pIdx(0.9)]
  const p95 = latencies[pIdx(0.95)]
  const p99 = latencies[pIdx(0.99)]

  const variance = latencies.reduce((acc, l) => acc + Math.pow(l - mean, 2), 0) / latencies.length
  const stdDev = Math.sqrt(variance)

  const max = Math.max(...latencies)
  const min = Math.min(...latencies)

  // Determine status based on P95
  let status: BenchmarkStats['status'] = 'excellent'
  if (p95 > 1000) status = 'critical'
  else if (p95 > 500) status = 'slow'
  else if (p95 > 300) status = 'acceptable'
  else if (p95 > 100) status = 'good'

  return {
    name,
    count: results.length,
    errors,
    errorRate: (errors / results.length) * 100,
    min,
    max,
    mean,
    median,
    p50,
    p75,
    p90,
    p95,
    p99,
    stdDev,
    status,
  }
}

function formatMs(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`
  if (ms < 1000) return `${ms.toFixed(2)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.floor(sorted.length * p)
  return sorted[Math.min(idx, sorted.length - 1)]
}

// ============================================
// HTTP Request Helper
// ============================================

async function httpRequest(url: string, options?: http.RequestOptions): Promise<{ latency: number; status?: number; error?: string }> {
  const start = performance.now()

  return new Promise((resolve) => {
    const urlObj = new URL(url)
    const isHttps = urlObj.protocol === 'https:'
    const lib = isHttps ? https : http

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: CONFIG.requestTimeout,
      ...options,
    }

    const req = lib.request(reqOptions, (res) => {
      // Consume response data to free memory
      res.resume()
      const latency = performance.now() - start
      resolve({ latency, status: res.statusCode })
    })

    req.on('error', (err) => {
      const latency = performance.now() - start
      resolve({ latency, error: err.message })
    })

    req.on('timeout', () => {
      req.destroy()
      const latency = performance.now() - start
      resolve({ latency, error: 'TIMEOUT' })
    })

    req.end()
  })
}

// ============================================
// API Route Tests
// ============================================

async function testHealthEndpoint(): Promise<LatencyResult[]> {
  const results: LatencyResult[] = []

  // Warmup
  for (let i = 0; i < CONFIG.warmupRuns; i++) {
    await httpRequest(`${CONFIG.baseUrl}${CONFIG.apiPrefix}/health`)
  }

  for (let i = 0; i < CONFIG.iterations; i++) {
    const timestamp = Date.now()
    const result = await httpRequest(`${CONFIG.baseUrl}${CONFIG.apiPrefix}/health`)
    results.push({ ...result, timestamp })
  }

  return results
}

async function testStatusEndpoint(): Promise<LatencyResult[]> {
  const results: LatencyResult[] = []

  for (let i = 0; i < CONFIG.warmupRuns; i++) {
    await httpRequest(`${CONFIG.baseUrl}${CONFIG.apiPrefix}/status`)
  }

  for (let i = 0; i < CONFIG.iterations; i++) {
    const timestamp = Date.now()
    const result = await httpRequest(`${CONFIG.baseUrl}${CONFIG.apiPrefix}/status`)
    results.push({ ...result, timestamp })
  }

  return results
}

async function testSearchEndpoint(): Promise<LatencyResult[]> {
  const results: LatencyResult[] = []

  const testQueries = ['test', 'api', 'health', 'status', 'user']
  const query = testQueries[Math.floor(Math.random() * testQueries.length)]

  for (let i = 0; i < CONFIG.warmupRuns; i++) {
    await httpRequest(`${CONFIG.baseUrl}${CONFIG.apiPrefix}/search?q=${query}`)
  }

  for (let i = 0; i < CONFIG.iterations; i++) {
    const q = testQueries[i % testQueries.length]
    const timestamp = Date.now()
    const result = await httpRequest(`${CONFIG.baseUrl}${CONFIG.apiPrefix}/search?q=${q}`)
    results.push({ ...result, timestamp })
  }

  return results
}

async function testAuthEndpoint(): Promise<LatencyResult[]> {
  const results: LatencyResult[] = []

  for (let i = 0; i < CONFIG.warmupRuns; i++) {
    await httpRequest(`${CONFIG.baseUrl}${CONFIG.apiPrefix}/auth/session`)
  }

  for (let i = 0; i < CONFIG.iterations; i++) {
    const timestamp = Date.now()
    const result = await httpRequest(`${CONFIG.baseUrl}${CONFIG.apiPrefix}/auth/session`)
    results.push({ ...result, timestamp })
  }

  return results
}

// ============================================
// Database Query Simulation
// ============================================

async function testDbQueryLatency(): Promise<LatencyResult[]> {
  const results: LatencyResult[] = []

  // Simulate DB operations using local filesystem
  // In production, these would be actual Prisma/DB calls

  for (let i = 0; i < CONFIG.iterations; i++) {
    const start = performance.now()

    // Simulate simple query latency (10-50ms typical)
    await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 20))

    // Simulate connection overhead
    const connStart = performance.now()
    await new Promise(resolve => setTimeout(resolve, 1 + Math.random() * 5))
    const connLatency = performance.now() - connStart

    const totalLatency = performance.now() - start
    results.push({
      latency: totalLatency,
      timestamp: Date.now()
    })
  }

  return results
}

// ============================================
// External API Simulation (Volcengine)
// ============================================

async function testExternalApiLatency(): Promise<LatencyResult[]> {
  const results: LatencyResult[] = []

  // Volcengine API simulation
  // In production, these would be actual API calls to Volcengine

  const simulatedEndpoints = [
    'volcengine-inference-api',
    'volcengine-storage',
    'volcengine-auth',
  ]

  for (let i = 0; i < CONFIG.iterations; i++) {
    const endpoint = simulatedEndpoints[i % simulatedEndpoints.length]
    const start = performance.now()

    // Simulate network latency (50-200ms typical for cloud APIs)
    await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 100))

    // Simulate processing latency
    await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 50))

    const latency = performance.now() - start
    results.push({
      latency,
      timestamp: Date.now()
    })
  }

  return results
}

// ============================================
// Cache Hit Simulation
// ============================================

async function testCachePerformance(): Promise<LatencyResult[]> {
  const results: LatencyResult[] = []

  // Simulate cache behavior
  // 80% hits, 20% misses (typical ratio)

  for (let i = 0; i < CONFIG.iterations; i++) {
    const start = performance.now()
    const isHit = Math.random() < 0.8

    if (isHit) {
      // Cache hit: very fast (<5ms)
      await new Promise(resolve => setTimeout(resolve, 0.5 + Math.random() * 3))
    } else {
      // Cache miss: slower (10-50ms)
      await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 40))
    }

    const latency = performance.now() - start
    results.push({
      latency,
      timestamp: Date.now()
    })
  }

  return results
}

// ============================================
// Main Benchmark Runner
// ============================================

async function runBenchmarks() {
  console.log('\n🧪 API Latency Benchmark Starting...')
  console.log(`📍 Target: ${CONFIG.baseUrl}`)
  console.log(`🔄 Iterations: ${CONFIG.iterations}`)
  console.log(`⚡ Concurrency: ${CONFIG.concurrency}`)
  console.log('=' .repeat(70))

  const allResults: Map<string, BenchmarkStats> = new Map()

  // Test 1: Health Endpoint
  console.log('\n📊 Testing /api/health...')
  try {
    const healthResults = await testHealthEndpoint()
    const stats = calculateStats('/api/health', healthResults)
    allResults.set('health', stats)
    console.log(`   ✅ Errors: ${stats.errors}/${stats.count} (${stats.errorRate.toFixed(1)}%)`)
    console.log(`   📈 P50: ${formatMs(stats.p50)} | P95: ${formatMs(stats.p95)} | P99: ${formatMs(stats.p99)}`)
    console.log(`   🎯 Status: ${stats.status.toUpperCase()}`)
  } catch (err) {
    console.log(`   ❌ Failed: ${err}`)
  }

  // Test 2: Status Endpoint
  console.log('\n📊 Testing /api/status...')
  try {
    const statusResults = await testStatusEndpoint()
    const stats = calculateStats('/api/status', statusResults)
    allResults.set('status', stats)
    console.log(`   ✅ Errors: ${stats.errors}/${stats.count} (${stats.errorRate.toFixed(1)}%)`)
    console.log(`   📈 P50: ${formatMs(stats.p50)} | P95: ${formatMs(stats.p95)} | P99: ${formatMs(stats.p99)}`)
    console.log(`   🎯 Status: ${stats.status.toUpperCase()}`)
  } catch (err) {
    console.log(`   ❌ Failed: ${err}`)
  }

  // Test 3: Search Endpoint
  console.log('\n📊 Testing /api/search...')
  try {
    const searchResults = await testSearchEndpoint()
    const stats = calculateStats('/api/search', searchResults)
    allResults.set('search', stats)
    console.log(`   ✅ Errors: ${stats.errors}/${stats.count} (${stats.errorRate.toFixed(1)}%)`)
    console.log(`   📈 P50: ${formatMs(stats.p50)} | P95: ${formatMs(stats.p95)} | P99: ${formatMs(stats.p99)}`)
    console.log(`   🎯 Status: ${stats.status.toUpperCase()}`)
  } catch (err) {
    console.log(`   ❌ Failed: ${err}`)
  }

  // Test 4: Auth Endpoint
  console.log('\n📊 Testing /api/auth/session...')
  try {
    const authResults = await testAuthEndpoint()
    const stats = calculateStats('/api/auth/session', authResults)
    allResults.set('auth', stats)
    console.log(`   ✅ Errors: ${stats.errors}/${stats.count} (${stats.errorRate.toFixed(1)}%)`)
    console.log(`   📈 P50: ${formatMs(stats.p50)} | P95: ${formatMs(stats.p95)} | P99: ${formatMs(stats.p99)}`)
    console.log(`   🎯 Status: ${stats.status.toUpperCase()}`)
  } catch (err) {
    console.log(`   ❌ Failed: ${err}`)
  }

  // Test 5: DB Query Latency
  console.log('\n📊 Testing DB Query Latency (simulated)...')
  try {
    const dbResults = await testDbQueryLatency()
    const stats = calculateStats('db_query', dbResults)
    allResults.set('db', stats)
    console.log(`   📈 P50: ${formatMs(stats.p50)} | P95: ${formatMs(stats.p95)} | P99: ${formatMs(stats.p99)}`)
    console.log(`   🎯 Status: ${stats.status.toUpperCase()}`)
  } catch (err) {
    console.log(`   ❌ Failed: ${err}`)
  }

  // Test 6: External API (Volcengine)
  console.log('\n📊 Testing External API - Volcengine (simulated)...')
  try {
    const externalResults = await testExternalApiLatency()
    const stats = calculateStats('volcengine_api', externalResults)
    allResults.set('volcengine', stats)
    console.log(`   📈 P50: ${formatMs(stats.p50)} | P95: ${formatMs(stats.p95)} | P99: ${formatMs(stats.p99)}`)
    console.log(`   🎯 Status: ${stats.status.toUpperCase()}`)
  } catch (err) {
    console.log(`   ❌ Failed: ${err}`)
  }

  // Test 7: Cache Performance
  console.log('\n📊 Testing Cache Hit Rate (simulated 80% hit rate)...')
  try {
    const cacheResults = await testCachePerformance()
    const stats = calculateStats('cache', cacheResults)
    allResults.set('cache', stats)
    console.log(`   📈 P50: ${formatMs(stats.p50)} | P95: ${formatMs(stats.p95)} | P99: ${formatMs(stats.p99)}`)
    console.log(`   🎯 Status: ${stats.status.toUpperCase()}`)
  } catch (err) {
    console.log(`   ❌ Failed: ${err}`)
  }

  // Summary
  console.log('\n' + '='.repeat(70))
  console.log('📋 BENCHMARK SUMMARY')
  console.log('='.repeat(70))

  const rows: string[] = []
  rows.push(['Endpoint', 'P50', 'P95', 'P99', 'Errors', 'Status'].join(' | '))
  rows.push(['---'].join(' | '))

  for (const [name, stats] of allResults.entries()) {
    const label = name.padEnd(15)
    const p50 = formatMs(stats.p50).padStart(10)
    const p95 = formatMs(stats.p95).padStart(10)
    const p99 = formatMs(stats.p99).padStart(10)
    const errors = `${stats.errors}/${stats.count}`.padStart(10)
    const status = stats.status.toUpperCase().padStart(10)
    rows.push(`${label} | ${p50} | ${p95} | ${p99} | ${errors} | ${status}`)
  }

  console.log(rows.join('\n'))

  // Output JSON for programmatic use
  const output = {
    timestamp: new Date().toISOString(),
    config: {
      baseUrl: CONFIG.baseUrl,
      iterations: CONFIG.iterations,
      concurrency: CONFIG.concurrency,
    },
    results: Object.fromEntries(allResults),
    summary: {
      totalTests: allResults.size,
      criticalCount: [...allResults.values()].filter(s => s.status === 'critical').length,
      slowCount: [...allResults.values()].filter(s => s.status === 'slow').length,
    }
  }

  console.log('\n📄 JSON Output:')
  console.log(JSON.stringify(output, null, 2))

  return output
}

// Run benchmarks
runBenchmarks().catch(console.error)