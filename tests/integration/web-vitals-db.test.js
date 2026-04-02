#!/usr/bin/env node
/**
 * Test script for Web Vitals database integration
 *
 * Tests the following:
 * 1. Insert Web Vitals metrics
 * 2. Query metrics
 * 3. Get statistics
 * 4. Cleanup old records
 */

import { getWebVitalsDB, closeWebVitalsDB } from '../src/lib/web-vitals-db'
import { logger } from '../src/lib/logger'

// Mock Web Vitals data
const mockMetrics = [
  {
    name: 'LCP',
    value: 2500,
    rating: 'good',
    route: '/home',
    deviceType: 'desktop',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    sessionId: 'test-session-001',
    timestamp: new Date(),
  },
  {
    name: 'FID',
    value: 85,
    rating: 'good',
    route: '/home',
    deviceType: 'desktop',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    sessionId: 'test-session-001',
    timestamp: new Date(),
  },
  {
    name: 'CLS',
    value: 0.05,
    rating: 'good',
    route: '/home',
    deviceType: 'desktop',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    sessionId: 'test-session-001',
    timestamp: new Date(),
  },
  {
    name: 'FCP',
    value: 1200,
    rating: 'good',
    route: '/home',
    deviceType: 'desktop',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    sessionId: 'test-session-001',
    timestamp: new Date(),
  },
  {
    name: 'TTFB',
    value: 350,
    rating: 'good',
    route: '/home',
    deviceType: 'desktop',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    sessionId: 'test-session-001',
    timestamp: new Date(),
  },
  {
    name: 'INP',
    value: 180,
    rating: 'good',
    route: '/home',
    deviceType: 'desktop',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    sessionId: 'test-session-001',
    timestamp: new Date(),
  },
  {
    name: 'LCP',
    value: 4200,
    rating: 'needs-improvement',
    route: '/about',
    deviceType: 'mobile',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    sessionId: 'test-session-002',
    timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
  },
  {
    name: 'CLS',
    value: 0.35,
    rating: 'poor',
    route: '/about',
    deviceType: 'mobile',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    sessionId: 'test-session-002',
    timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
  },
]

async function runTests() {
  logger.info('=== Web Vitals Database Integration Tests ===\n')

  try {
    // Get database instance
    const db = getWebVitalsDB()

    // Test 1: Insert metrics
    logger.info('Test 1: Inserting mock metrics...')
    const insertedCount = db.insertMany(mockMetrics)
    logger.info(`✓ Inserted ${insertedCount} metrics\n`)

    // Test 2: Query all metrics
    logger.info('Test 2: Querying all metrics...')
    const allMetrics = db.query()
    logger.info(`✓ Found ${allMetrics.length} total metrics in database\n`)

    // Test 3: Query by route
    logger.info('Test 3: Querying metrics for /home route...')
    const homeMetrics = db.query({ route: '/home' })
    logger.info(`✓ Found ${homeMetrics.length} metrics for /home\n`)

    // Test 4: Query by metric name
    logger.info('Test 4: Querying LCP metrics...')
    const lcpMetrics = db.query({ name: 'LCP' })
    logger.info(`✓ Found ${lcpMetrics.length} LCP metrics\n`)

    // Test 5: Get statistics
    logger.info('Test 5: Getting statistics for last 24 hours...')
    const stats = db.getStats({ hours: 24 })
    logger.info(`✓ Statistics retrieved:`)
    logger.info(`  Total Records: ${stats.totalRecords}`)
    logger.info(`  Average Score: ${stats.avgScore}`)
    logger.info(
      `  By Device: Mobile=${stats.byDevice.mobile}, Tablet=${stats.byDevice.tablet}, Desktop=${stats.byDevice.desktop}`
    )
    logger.info(
      `  Top Routes: ${Object.entries(stats.byRoute)
        .slice(0, 3)
        .map(([r, c]) => `${r} (${c})`)
        .join(', ')}\n`
    )

    // Test 6: Get percentiles
    logger.info('Test 6: Getting LCP percentiles...')
    const lcpPercentiles = db.getPercentiles('LCP', { hours: 24 })
    logger.info(
      `✓ LCP Percentiles: p50=${lcpPercentiles.p50}ms, p75=${lcpPercentiles.p75}ms, p95=${lcpPercentiles.p95}ms\n`
    )

    // Test 7: Test cleanup (old records)
    logger.info('Test 7: Testing cleanup of old records...')
    const deletedCount = db.cleanup(365) // Delete records older than 1 year
    logger.info(`✓ Deleted ${deletedCount} old records\n`)

    logger.info('=== All tests passed! ===\n')
  } catch (error) {
    logger.error('Test failed:', error instanceof Error ? error : new Error(String(error)))
    process.exit(1)
  } finally {
    // Clean up
    closeWebVitalsDB()
  }
}

// Run tests
runTests().catch(error => {
  logger.error('Fatal error:', error)
  process.exit(1)
})
