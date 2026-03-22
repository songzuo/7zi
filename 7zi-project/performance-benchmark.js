#!/usr/bin/env node
/**
 * Performance Benchmark Script
 * Tests and measures various performance metrics for the 7zi application
 */

const http = require('http');
const { performance } = require('perf_hooks');

const BASE_URL = 'http://localhost:3000';
const RESULTS = {
  timestamp: new Date().toISOString(),
  pageLoad: { fcp: 0, lcp: 0, ttfb: 0 },
  apiResponse: {},
  dbQueries: { avg: 0, p95: 0, samples: [] },
  search: { avg: 0, p95: 0, samples: [] },
  navigation: { avg: 0, p95: 0, samples: [] },
  errors: [],
};

/**
 * Measure HTTP request time
 */
async function measureRequest(url, options = {}) {
  return new Promise((resolve) => {
    const startTime = performance.now();

    const req = http.get(`${BASE_URL}${url}`, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const endTime = performance.now();
        resolve({
          url,
          statusCode: res.statusCode,
          time: endTime - startTime,
          success: res.statusCode >= 200 && res.statusCode < 300,
          dataSize: data.length,
        });
      });
    });

    req.on('error', (error) => {
      const endTime = performance.now();
      resolve({
        url,
        statusCode: 0,
        time: endTime - startTime,
        success: false,
        error: error.message,
      });
    });

    req.setTimeout(30000, () => {
      req.destroy();
      const endTime = performance.now();
      resolve({
        url,
        statusCode: 0,
        time: endTime - startTime,
        success: false,
        error: 'Timeout',
      });
    });
  });
}

/**
 * Run multiple samples and calculate statistics
 */
async function runSamples(url, samples = 10, options = {}) {
  const times = [];

  for (let i = 0; i < samples; i++) {
    const result = await measureRequest(url, options);
    if (result.success) {
      times.push(result.time);
    } else {
      RESULTS.errors.push(`Failed to request ${url}: ${result.error || 'Unknown error'}`);
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  if (times.length === 0) {
    return { avg: 0, p95: 0, min: 0, max: 0, count: 0 };
  }

  const sorted = times.sort((a, b) => a - b);
  const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
  const p95Index = Math.floor(times.length * 0.95);
  const p95 = sorted[p95Index] || sorted[times.length - 1];

  return {
    avg: Math.round(avg * 10) / 10,
    p95: Math.round(p95 * 10) / 10,
    min: Math.round(sorted[0] * 10) / 10,
    max: Math.round(sorted[times.length - 1] * 10) / 10,
    count: times.length,
    samples: times,
  };
}

/**
 * Test API endpoints
 */
async function testAPIEndpoints() {
  console.log('\n🔍 Testing API endpoints...');

  // Test /api/health
  console.log('  Testing /api/health...');
  const healthResult = await runSamples('/api/health', 10);
  RESULTS.apiResponse.health = healthResult;

  // Test /api/stream/health
  console.log('  Testing /api/stream/health...');
  const streamHealthResult = await runSamples('/api/stream/health', 5); // SSE endpoint, fewer samples
  RESULTS.apiResponse.streamHealth = streamHealthResult;

  // Test /api/backup (GET)
  console.log('  Testing /api/backup...');
  const backupResult = await runSamples('/api/backup', 5);
  RESULTS.apiResponse.backup = backupResult;

  // Test /api/status
  console.log('  Testing /api/status...');
  const statusResult = await runSamples('/api/status', 10);
  RESULTS.apiResponse.status = statusResult;

  // Test /api/database/health
  console.log('  Testing /api/database/health...');
  const dbHealthResult = await runSamples('/api/database/health', 10);
  RESULTS.apiResponse.databaseHealth = dbHealthResult;

  console.log('  ✅ API endpoint testing complete');
}

/**
 * Test page load times (simulated)
 */
async function testPageLoad() {
  console.log('\n📄 Testing page load times...');

  // Test home page
  console.log('  Testing home page...');
  const homeResult = await measureRequest('/');

  if (homeResult.success) {
    // Simulated metrics based on TTFB (Time to First Byte)
    RESULTS.pageLoad.ttfb = Math.round(homeResult.time * 10) / 10;
    // FCP is typically 1-2x TTFB
    RESULTS.pageLoad.fcp = Math.round(homeResult.time * 1.5 * 10) / 10;
    // LCP is typically 2-4x TTFB
    RESULTS.pageLoad.lcp = Math.round(homeResult.time * 2.5 * 10) / 10;
  } else {
    RESULTS.errors.push(`Failed to load home page: ${homeResult.error || 'Unknown error'}`);
  }

  console.log('  ✅ Page load testing complete');
}

/**
 * Test search functionality
 */
async function testSearch() {
  console.log('\n🔎 Testing search functionality...');

  // Search queries to test
  const searchQueries = [
    '/api/github/issues?state=open',
    '/api/github/commits',
  ];

  const allSamples = [];

  for (const query of searchQueries) {
    console.log(`  Testing ${query}...`);
    const result = await runSamples(query, 5);
    if (result && result.samples && result.samples.length > 0) {
      allSamples.push(...result.samples);
    }
  }

  if (allSamples.length > 0) {
    const sorted = allSamples.sort((a, b) => a - b);
    const avg = allSamples.reduce((sum, t) => sum + t, 0) / allSamples.length;
    const p95Index = Math.floor(allSamples.length * 0.95);
    const p95 = sorted[p95Index] || sorted[allSamples.length - 1];

    RESULTS.search = {
      avg: Math.round(avg * 10) / 10,
      p95: Math.round(p95 * 10) / 10,
      min: Math.round(sorted[0] * 10) / 10,
      max: Math.round(sorted[allSamples.length - 1] * 10) / 10,
      count: allSamples.length,
      samples: allSamples,
    };
  }

  console.log('  ✅ Search testing complete');
}

/**
 * Test database query performance
 */
async function testDatabaseQueries() {
  console.log('\n💾 Testing database query performance...');

  const dbEndpoints = [
    '/api/database/health',
  ];

  const allSamples = [];

  for (const endpoint of dbEndpoints) {
    console.log(`  Testing ${endpoint}...`);
    const result = await runSamples(endpoint, 15);
    if (result && result.samples && result.samples.length > 0) {
      allSamples.push(...result.samples);
    }
  }

  if (allSamples.length > 0) {
    const sorted = allSamples.sort((a, b) => a - b);
    const avg = allSamples.reduce((sum, t) => sum + t, 0) / allSamples.length;
    const p95Index = Math.floor(allSamples.length * 0.95);
    const p95 = sorted[p95Index] || sorted[allSamples.length - 1];

    RESULTS.dbQueries = {
      avg: Math.round(avg * 10) / 10,
      p95: Math.round(p95 * 10) / 10,
      min: Math.round(sorted[0] * 10) / 10,
      max: Math.round(sorted[allSamples.length - 1] * 10) / 10,
      count: allSamples.length,
      samples: allSamples,
    };
  }

  console.log('  ✅ Database query testing complete');
}

/**
 * Test navigation switching
 */
async function testNavigation() {
  console.log('\n🧭 Testing navigation switching...');

  const pages = ['/', '/dashboard', '/projects', '/settings'];
  const allSamples = [];

  for (const page of pages) {
    console.log(`  Testing navigation to ${page}...`);
    const result = await runSamples(page, 5);
    if (result && result.samples && result.samples.length > 0) {
      allSamples.push(...result.samples);
    }
  }

  if (allSamples.length > 0) {
    const sorted = allSamples.sort((a, b) => a - b);
    const avg = allSamples.reduce((sum, t) => sum + t, 0) / allSamples.length;
    const p95Index = Math.floor(allSamples.length * 0.95);
    const p95 = sorted[p95Index] || sorted[allSamples.length - 1];

    RESULTS.navigation = {
      avg: Math.round(avg * 10) / 10,
      p95: Math.round(p95 * 10) / 10,
      min: Math.round(sorted[0] * 10) / 10,
      max: Math.round(sorted[allSamples.length - 1] * 10) / 10,
      count: allSamples.length,
      samples: allSamples,
    };
  }

  console.log('  ✅ Navigation testing complete');
}

/**
 * Print results
 */
function printResults() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 PERFORMANCE BENCHMARK RESULTS');
  console.log('='.repeat(60));

  console.log(`\nTimestamp: ${RESULTS.timestamp}`);

  console.log('\n📄 Page Load Metrics (simulated):');
  console.log(`  TTFB:    ${RESULTS.pageLoad.ttfb} ms`);
  console.log(`  FCP:     ${RESULTS.pageLoad.fcp} ms`);
  console.log(`  LCP:     ${RESULTS.pageLoad.lcp} ms`);

  console.log('\n🔌 API Response Times:');
  for (const [endpoint, stats] of Object.entries(RESULTS.apiResponse)) {
    if (stats.count > 0) {
      console.log(`  ${endpoint}:`);
      console.log(`    Avg:  ${stats.avg} ms`);
      console.log(`    P95:  ${stats.p95} ms`);
      console.log(`    Min:  ${stats.min} ms`);
      console.log(`    Max:  ${stats.max} ms`);
    }
  }

  console.log('\n💾 Database Query Performance:');
  if (RESULTS.dbQueries.count > 0) {
    console.log(`  Avg:  ${RESULTS.dbQueries.avg} ms`);
    console.log(`  P95:  ${RESULTS.dbQueries.p95} ms`);
    console.log(`  Min:  ${RESULTS.dbQueries.min} ms`);
    console.log(`  Max:  ${RESULTS.dbQueries.max} ms`);
    console.log(`  Samples: ${RESULTS.dbQueries.count}`);
  }

  console.log('\n🔎 Search Performance:');
  if (RESULTS.search.count > 0) {
    console.log(`  Avg:  ${RESULTS.search.avg} ms`);
    console.log(`  P95:  ${RESULTS.search.p95} ms`);
    console.log(`  Min:  ${RESULTS.search.min} ms`);
    console.log(`  Max:  ${RESULTS.search.max} ms`);
    console.log(`  Samples: ${RESULTS.search.count}`);
  }

  console.log('\n🧭 Navigation Performance:');
  if (RESULTS.navigation.count > 0) {
    console.log(`  Avg:  ${RESULTS.navigation.avg} ms`);
    console.log(`  P95:  ${RESULTS.navigation.p95} ms`);
    console.log(`  Min:  ${RESULTS.navigation.min} ms`);
    console.log(`  Max:  ${RESULTS.navigation.max} ms`);
    console.log(`  Samples: ${RESULTS.navigation.count}`);
  }

  if (RESULTS.errors.length > 0) {
    console.log('\n⚠️  Errors:');
    RESULTS.errors.forEach(error => console.log(`  - ${error}`));
  }

  console.log('\n' + '='.repeat(60));
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Performance Benchmark...');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Started at: ${new Date().toISOString()}`);

  try {
    await testPageLoad();
    await testAPIEndpoints();
    await testDatabaseQueries();
    await testSearch();
    await testNavigation();

    printResults();

    // Save results to JSON
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, 'performance-benchmark-results.json');

    fs.writeFileSync(outputPath, JSON.stringify(RESULTS, null, 2));
    console.log(`\n💾 Results saved to: ${outputPath}`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { measureRequest, runSamples };
