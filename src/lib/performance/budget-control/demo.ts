/**
 * Quick demonstration of Budget Control Module
 * This file demonstrates the core functionality
 */

import { budgetChecker } from './budget-checker';
import { budgetConfig } from './budget-config';
import { BudgetLinter, generateSampleBudgetConfig, generateSampleMetricsData } from './budget-linter';
import { DEFAULT_THRESHOLDS } from './budget-config';

async function demoBudgetChecker() {
  console.log('\n🔍 ===============================================');
  console.log('📊 Budget Checker Demo');
  console.log('===============================================\n');

  // Check budget for a page
  const result = await budgetChecker.checkBudget('/', {
    LCP: 2400,  // Within budget (2500 * 1.1 = 2750)
    FID: 95,    // Within budget (100 * 1.15 = 115)
    CLS: 0.08,  // Within budget (0.1 * 1.2 = 0.12)
  });

  console.log('✅ Page: /');
  console.log(`   Status: ${result.passed ? 'PASS' : 'FAIL'}`);
  console.log(`   Violations: ${result.violations.length}`);
  console.log();

  // Check budget for page with violation
  const result2 = await budgetChecker.checkBudget('/dashboard', {
    LCP: 4000, // Exceeds budget (3000 * 1.15 = 3450)
    TBT: 280,  // Within budget (300 * 1.2 = 360)
  });

  console.log('⚠️  Page: /dashboard');
  console.log(`   Status: ${result2.passed ? 'PASS' : 'FAIL'}`);
  console.log(`   Violations: ${result2.violations.length}`);

  if (result2.violations.length > 0) {
    console.log('   Details:');
    for (const violation of result2.violations) {
      console.log(`     - ${violation.metric}: ${violation.actual.toFixed(0)}ms (budget: ${violation.budget}ms, ${violation.percentOver.toFixed(1)}% over) [${violation.severity}]`);
    }
  }
  console.log();
}

async function demoBudgetConfig() {
  console.log('🔍 ===============================================');
  console.log('⚙️  Budget Config Demo');
  console.log('===============================================\n');

  // Load budget for a specific page
  const budget = await budgetConfig.getBudgetForPath('/');

  console.log('📄 Page: /');
  console.log(`   Timings: ${budget?.timings.length} metrics`);
  console.log('   Metrics:');
  for (const timing of budget?.timings || []) {
    const threshold = timing.budget * (1 + timing.tolerance);
    console.log(`     - ${timing.metric}: ${timing.budget}${timing.metric === 'CLS' ? '' : 'ms'} (threshold: ${threshold.toFixed(1)}${timing.metric === 'CLS' ? '' : 'ms'})`);
  }
  console.log();

  // Show default thresholds
  console.log('🎯 Default Thresholds:');
  console.log(`   LCP: ${DEFAULT_THRESHOLDS.LCP.budget}ms (${DEFAULT_THRESHOLDS.LCP.tolerance * 100}% tolerance)`);
  console.log(`   FID: ${DEFAULT_THRESHOLDS.FID.budget}ms (${DEFAULT_THRESHOLDS.FID.tolerance * 100}% tolerance)`);
  console.log(`   CLS: ${DEFAULT_THRESHOLDS.CLS.budget} (${DEFAULT_THRESHOLDS.CLS.tolerance * 100}% tolerance)`);
  console.log();
}

async function demoBudgetLinter() {
  console.log('🔍 ===============================================');
  console.log('🧹 Budget Linter Demo');
  console.log('===============================================\n');

  // Generate sample data
  const budgetConfig = generateSampleBudgetConfig();
  const metricsData = generateSampleMetricsData();

  // Run linter
  const linter = new BudgetLinter({
    budgetConfig,
    metricsData,
    outputFormat: 'console',
    quiet: false,
  });

  const result = await linter.lint();

  console.log('📊 Linter Results:');
  console.log(`   Total Pages: ${result.pages.length}`);
  console.log(`   Passed: ${result.summary.passed}`);
  console.log(`   Failed: ${result.summary.failed}`);
  console.log(`   Warnings: ${result.summary.warnings}`);
  console.log(`   Critical: ${result.summary.critical}`);
  console.log(`   Pass Rate: ${result.summary.passRate.toFixed(1)}%`);
  console.log();
}

async function main() {
  try {
    await demoBudgetChecker();
    await demoBudgetConfig();
    await demoBudgetLinter();

    console.log('🎉 ===============================================');
    console.log('✅ Demo completed successfully!');
    console.log('===============================================\n');
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run demo if this file is executed directly
if (require.main === module) {
  main();
}

export { demoBudgetChecker, demoBudgetConfig, demoBudgetLinter };
