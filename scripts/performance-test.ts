#!/usr/bin/env tsx
/**
 * Performance Test Script for 7zi API
 * 
 * Tests API endpoints and measures response times
 * Run with: npx tsx scripts/performance-test.ts
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  duration: number;
  success: boolean;
  error?: string;
}

interface TestSummary {
  totalTests: number;
  passed: number;
  failed: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  results: TestResult[];
}

/**
 * Make an HTTP request and measure response time
 */
async function testEndpoint(
  endpoint: string,
  method: string = 'GET',
  body?: unknown,
  headers?: Record<string, string>
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const duration = Date.now() - startTime;

    return {
      endpoint,
      method,
      status: response.status,
      duration,
      success: response.ok || response.status < 500,
    };
  } catch (error) {
    return {
      endpoint,
      method,
      status: 0,
      duration: Date.now() - startTime,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Calculate percentile
 */
function calculatePercentile(sorted: number[], percentile: number): number {
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Run performance tests
 */
async function runTests(iterations: number = 3): Promise<TestSummary> {
  const results: TestResult[] = [];

  // Define test endpoints
  const testCases = [
    // Health checks
    { endpoint: '/api/health', method: 'GET' },
    { endpoint: '/api/health/ready', method: 'GET' },
    { endpoint: '/api/health/live', method: 'GET' },
    { endpoint: '/api/health/detailed', method: 'GET' },
    
    // Status
    { endpoint: '/api/status', method: 'GET' },
    { endpoint: '/api/status?performance=true', method: 'GET' },
    
    // Performance metrics
    { endpoint: '/api/performance', method: 'GET' },
    { endpoint: '/api/performance?detail=full', method: 'GET' },
    { endpoint: '/api/performance?detail=endpoints', method: 'GET' },
    { endpoint: '/api/performance?detail=system', method: 'GET' },
    
    // Tasks API
    { endpoint: '/api/tasks', method: 'GET' },
    { endpoint: '/api/tasks?status=pending', method: 'GET' },
    
    // Projects API
    { endpoint: '/api/projects', method: 'GET' },
    
    // Knowledge API
    { endpoint: '/api/knowledge/nodes', method: 'GET' },
    { endpoint: '/api/knowledge/lattice', method: 'GET' },
    
    // Auth API
    { endpoint: '/api/auth?action=csrf', method: 'GET' },
    
    // Logs API
    { endpoint: '/api/logs?limit=10', method: 'GET' },
    
    // Notifications API
    { endpoint: '/api/notifications', method: 'GET' },
  ];

  console.log(`\n🚀 Running performance tests against ${BASE_URL}`);
  console.log(`📊 Testing ${testCases.length} endpoints, ${iterations} iterations each\n`);

  for (let i = 0; i < iterations; i++) {
    console.log(`\n📍 Iteration ${i + 1}/${iterations}`);
    
    for (const testCase of testCases) {
      const result = await testEndpoint(testCase.endpoint, testCase.method);
      results.push(result);
      
      const statusIcon = result.success ? '✅' : '❌';
      const statusText = result.error ? result.error : `${result.status}`;
      console.log(`  ${statusIcon} ${result.method.padEnd(6)} ${result.endpoint.padEnd(40)} ${result.duration.toString().padStart(4)}ms  (${statusText})`);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Calculate summary
  const durations = results.map(r => r.duration).sort((a, b) => a - b);
  const passed = results.filter(r => r.success).length;
  
  const summary: TestSummary = {
    totalTests: results.length,
    passed,
    failed: results.length - passed,
    avgResponseTime: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
    minResponseTime: durations[0] || 0,
    maxResponseTime: durations[durations.length - 1] || 0,
    p95ResponseTime: calculatePercentile(durations, 95),
    results,
  };

  return summary;
}

/**
 * Print test summary
 */
function printSummary(summary: TestSummary): void {
  console.log('\n' + '='.repeat(60));
  console.log('📈 PERFORMANCE TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests:      ${summary.totalTests}`);
  console.log(`Passed:           ${summary.passed} (${((summary.passed / summary.totalTests) * 100).toFixed(1)}%)`);
  console.log(`Failed:           ${summary.failed}`);
  console.log('─'.repeat(60));
  console.log(`Avg Response:     ${summary.avgResponseTime}ms`);
  console.log(`Min Response:     ${summary.minResponseTime}ms`);
  console.log(`Max Response:     ${summary.maxResponseTime}ms`);
  console.log(`P95 Response:     ${summary.p95ResponseTime}ms`);
  console.log('='.repeat(60));

  // Group by endpoint
  const endpointStats = new Map<string, { count: number; totalTime: number; errors: number }>();
  
  for (const result of summary.results) {
    const key = `${result.method} ${result.endpoint}`;
    const stats = endpointStats.get(key) || { count: 0, totalTime: 0, errors: 0 };
    stats.count++;
    stats.totalTime += result.duration;
    if (!result.success) stats.errors++;
    endpointStats.set(key, stats);
  }

  console.log('\n📊 ENDPOINT STATISTICS:');
  console.log('─'.repeat(60));
  
  const sortedEndpoints = Array.from(endpointStats.entries())
    .sort((a, b) => (b[1].totalTime / b[1].count) - (a[1].totalTime / a[1].count));

  for (const [endpoint, stats] of sortedEndpoints) {
    const avgTime = Math.round(stats.totalTime / stats.count);
    const errorRate = ((stats.errors / stats.count) * 100).toFixed(0);
    const errorText = stats.errors > 0 ? ` ⚠️ ${errorRate}% errors` : '';
    console.log(`  ${endpoint.padEnd(45)} ${avgTime.toString().padStart(4)}ms${errorText}`);
  }

  // Performance thresholds
  console.log('\n🎯 PERFORMANCE THRESHOLDS:');
  console.log('─'.repeat(60));
  
  const slowEndpoints = sortedEndpoints.filter(([_, stats]) => stats.totalTime / stats.count > 500);
  const fastEndpoints = sortedEndpoints.filter(([_, stats]) => stats.totalTime / stats.count < 100);
  
  if (slowEndpoints.length > 0) {
    console.log('⚠️  Slow endpoints (>500ms):');
    slowEndpoints.forEach(([endpoint, stats]) => {
      console.log(`   ${endpoint}: ${Math.round(stats.totalTime / stats.count)}ms`);
    });
  } else {
    console.log('✅ No slow endpoints detected (all <500ms)');
  }

  if (fastEndpoints.length > 0) {
    console.log(`\n🚀 Fast endpoints (<100ms): ${fastEndpoints.length}`);
  }

  console.log('\n');
}

/**
 * Stress test a specific endpoint
 */
async function stressTest(endpoint: string, requests: number = 100): Promise<void> {
  console.log(`\n🔥 Stress testing ${endpoint} with ${requests} requests...\n`);

  const results: number[] = [];
  const startTime = Date.now();

  for (let i = 0; i < requests; i++) {
    const result = await testEndpoint(endpoint);
    results.push(result.duration);
    
    if ((i + 1) % 10 === 0) {
      console.log(`  Progress: ${i + 1}/${requests}`);
    }
  }

  const totalTime = Date.now() - startTime;
  const avgTime = Math.round(results.reduce((a, b) => a + b, 0) / results.length);
  const sorted = results.sort((a, b) => a - b);

  console.log('\n📊 Stress Test Results:');
  console.log('─'.repeat(40));
  console.log(`Total Requests:   ${requests}`);
  console.log(`Total Time:       ${totalTime}ms`);
  console.log(`Requests/sec:     ${Math.round((requests / totalTime) * 1000)}`);
  console.log(`Avg Response:     ${avgTime}ms`);
  console.log(`Min Response:     ${sorted[0]}ms`);
  console.log(`Max Response:     ${sorted[sorted.length - 1]}ms`);
  console.log(`P50 Response:     ${calculatePercentile(sorted, 50)}ms`);
  console.log(`P95 Response:     ${calculatePercentile(sorted, 95)}ms`);
  console.log(`P99 Response:     ${calculatePercentile(sorted, 99)}ms`);
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const iterations = parseInt(args.find(a => a.startsWith('--iterations='))?.split('=')[1] || '3', 10);
  const stressEndpoint = args.find(a => a.startsWith('--stress='));
  const stressCount = parseInt(args.find(a => a.startsWith('--count='))?.split('=')[1] || '100', 10);

  // Check if server is running
  try {
    await fetch(`${BASE_URL}/api/health`);
  } catch {
    console.error(`\n❌ Cannot connect to server at ${BASE_URL}`);
    console.error('Make sure the development server is running: npm run dev\n');
    process.exit(1);
  }

  // Run stress test if requested
  if (stressEndpoint) {
    const endpoint = stressEndpoint.split('=')[1];
    await stressTest(endpoint, stressCount);
    return;
  }

  // Run regular performance tests
  const summary = await runTests(iterations);
  printSummary(summary);

  // Fetch and display performance metrics from API
  console.log('📈 Fetching server performance metrics...\n');
  
  try {
    const perfResponse = await fetch(`${BASE_URL}/api/performance?detail=summary`);
    if (perfResponse.ok) {
      const perfData = await perfResponse.json();
      console.log('Server Performance Metrics:');
      console.log('─'.repeat(40));
      console.log(JSON.stringify(perfData, null, 2));
    }
  } catch (error) {
    console.log('Could not fetch performance metrics');
  }

  // Exit with error code if any tests failed
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch(console.error);
