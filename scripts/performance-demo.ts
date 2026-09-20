/**
 * Performance Monitoring Demo Script
 * Demonstrates the performance monitoring capabilities
 */

async function main() {
  console.log('=== Performance Monitoring Demo ===\n')

  // 1. Test API performance endpoint
  console.log('1. Testing API Performance Report...')
  try {
    const reportResponse = await fetch('http://localhost:3000/api/performance/report')
    if (reportResponse.ok) {
      const report = await reportResponse.json()
      console.log('✅ Performance report endpoint is working')
      console.log(`   Status: ${report.summary.status}`)
      console.log(`   Score: ${report.summary.overallScore}/100`)
      console.log(`   Issues: ${report.summary.issues}`)
      console.log(`   Recommendations: ${report.summary.recommendations}\n`)
    } else {
      console.log('⚠️  Performance report endpoint returned non-200 status')
      console.log(`   Status: ${reportResponse.status}\n`)
    }
  } catch (error) {
    console.log('❌ Could not connect to performance report endpoint')
    console.log('   Make sure the development server is running on port 3000\n')
  }

  // 2. Check API metrics summary
  console.log('2. API Performance Metrics:')
  console.log('   The system tracks:')
  console.log('   • Response time for each API endpoint')
  console.log('   • Success/failure rates')
  console.log('   • Slow request detection (>1s)')
  console.log('   • Per-endpoint aggregation\n')

  // 3. Check database metrics summary
  console.log('3. Database Performance Metrics:')
  console.log('   The system tracks:')
  console.log('   • Query execution time')
  console.log('   • Slow query detection (>100ms)')
  console.log('   • Query error tracking')
  console.log('   • Operation type aggregation\n')

  // 4. Show configuration options
  console.log('4. Configuration:')
  console.log('   Environment Variables:')
  console.log('   • ENABLE_DB_PERFORMANCE_LOGGING=true - Enable DB performance logging')
  console.log('   • NODE_ENV=development - Automatic logging in dev mode\n')

  // 5. Show available endpoints
  console.log('5. Available Endpoints:')
  console.log('   • GET  /api/performance/report - Get performance report')
  console.log('   • POST /api/performance/clear  - Clear all metrics\n')

  // 6. Show usage examples
  console.log('6. Usage Examples:')
  console.log('   Get basic report:')
  console.log('   curl http://localhost:3000/api/performance/report\n')
  console.log('   Get detailed report:')
  console.log('   curl http://localhost:3000/api/performance/report?detailed=true\n')
  console.log('   Get report with custom time window:')
  console.log('   curl http://localhost:3000/api/performance/report?minutes=10\n')
  console.log('   Clear metrics:')
  console.log('   curl -X POST http://localhost:3000/api/performance/clear\n')

  // 7. Show features
  console.log('7. Key Features:')
  console.log('   ✅ Automatic API response time tracking')
  console.log('   ✅ Database query performance logging')
  console.log('   ✅ Slow request/query detection')
  console.log('   ✅ Performance scoring system (0-100)')
  console.log('   ✅ Health status (healthy/warning/critical)')
  console.log('   ✅ Performance insights and recommendations')
  console.log('   ✅ Integration with Sentry')
  console.log('   ✅ Console logging in development\n')

  console.log('=== Demo Complete ===')
  console.log('\nFor more information, see:')
  console.log('• docs/PERFORMANCE_MONITORING.md')
  console.log('• src/lib/middleware/api-performance.ts')
  console.log('• src/lib/middleware/db-performance.ts')
  console.log('• src/app/api/performance/report/route.ts\n')
}

// Run the demo
main().catch(console.error)
