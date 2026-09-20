#!/usr/bin/env node
/**
 * Performance Audit Script
 * Runs Lighthouse CI audit against the built application
 * 
 * Usage: node scripts/performance-audit.mjs [--url=<url>] [--ci] [--threshold=<score>]
 * 
 * @example
 *   node scripts/performance-audit.mjs --url=http://localhost:3000 --ci
 *   node scripts/performance-audit.mjs --url=https://7zi.com --threshold=80
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================
// Configuration
// ============================================

const DEFAULT_THRESHOLDS = {
  performance: 0.80,
  accessibility: 0.85,
  'best-practices': 0.85,
  seo: 0.85,
  pwa: 0.50,
  // Core Web Vitals
  'first-contentful-paint': 2000,
  'largest-contentful-paint': 2500,
  'cumulative-layout-shift': 0.1,
  'total-blocking-time': 300,
  'interactive': 4000,
};

const DEFAULT_URL = process.env.PERF_AUDIT_URL || 'http://localhost:3000';
const DEFAULT_BUDGET_PATH = join(__dirname, '..', 'lighthouserc.json');

// ============================================
// CLI Arguments
// ============================================

function parseArgs() {
  const args = {
    url: DEFAULT_URL,
    ci: false,
    threshold: null,
    budgetPath: DEFAULT_BUDGET_PATH,
    onlyCategories: null,
    skipCategories: null,
  };

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--url=')) {
      args.url = arg.slice(6);
    } else if (arg === '--ci') {
      args.ci = true;
    } else if (arg.startsWith('--threshold=')) {
      args.threshold = parseFloat(arg.slice(12));
    } else if (arg.startsWith('--budget=')) {
      args.budgetPath = arg.slice(9);
    } else if (arg.startsWith('--only=')) {
      args.onlyCategories = arg.slice(7).split(',');
    } else if (arg.startsWith('--skip=')) {
      args.skipCategories = arg.slice(7).split(',');
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp() {
  console.log(`
Performance Audit Script

Usage:
  node scripts/performance-audit.mjs [options]

Options:
  --url=<url>         Target URL to audit (default: http://localhost:3000)
  --ci                Run in CI mode (exit with proper codes)
  --threshold=<0-1>   Minimum score threshold for all categories
  --budget=<path>     Path to Lighthouse budget config
  --only=<cats>       Only run specific categories (comma-separated)
  --skip=<cats>       Skip specific categories (comma-separated)
  --help, -h          Show this help message

Environment Variables:
  PERF_AUDIT_URL      Default URL to audit

Examples:
  # Audit local dev server
  node scripts/performance-audit.mjs --url=http://localhost:3000

  # CI mode with 80% threshold
  node scripts/performance-audit.mjs --url=https://staging.7zi.com --ci --threshold=0.80

  # Run with custom budget
  node scripts/performance-audit.mjs --url=https://7zi.com --budget=./custom-budget.json

Exit Codes:
  0 - All audits passed
  1 - One or more audits failed
  2 - Error occurred
`);
}

// ============================================
// Lighthouse Testing
// ============================================

async function runLighthouse(url, options = {}) {
  try {
    // Dynamic import lighthouse
    const { chromium } = await import('playwright');
    
    // Check if Lighthouse is available
    let lighthouse;
    try {
      lighthouse = await import('lighthouse');
    } catch (e) {
      // Lighthouse not installed, use alternative method
      console.log('Lighthouse not installed, using basic performance checks...');
      return await runBasicPerformanceCheck(url, options);
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Navigate to warm up
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.close();

    // Run Lighthouse
    const port = page.browser()?.wsEndpoint()?.split(':')[2]?.replace('/', '') || 9222;
    
    const lighthouseConfig = {
      onlyCategories: options.onlyCategories || ['performance', 'accessibility', 'best-practices', 'seo'],
      onlyAudits: options.onlyAudits || [],
      skipAudits: options.skipAudits || [],
      extends: 'lighthouse:default',
    };

    const result = await lighthouse(url, {
      port,
      output: 'json',
      logLevel: options.ci ? 'error' : 'info',
      quiet: options.ci,
      ...lighthouseConfig,
    }, lighthouseConfig);

    await browser.close();

    return result;
  } catch (error) {
    console.error('Lighthouse error:', error.message);
    throw error;
  }
}

async function runBasicPerformanceCheck(url, options = {}) {
  // Fallback basic performance check using Playwright + basic metrics
  const { chromium } = await import('playwright');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const metrics = {
    timestamps: {},
    navigation: null,
  };

  // Listen for navigation
  page.on('domcontentloaded', () => {
    metrics.timestamps.domContentLoaded = Date.now();
  });

  page.on('load', () => {
    metrics.timestamps.load = Date.now();
  });

  try {
    // Navigate with full timing
    const startTime = Date.now();
    const response = await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    metrics.timestamps.response = Date.now();
    
    if (!response) {
      throw new Error('No response received');
    }

    // Get basic metrics
    const perfMetrics = await page.evaluate(() => {
      const timing = performance.timing;
      const nav = performance.getEntriesByType('navigation')[0];
      
      return {
        // Basic timing
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        load: timing.loadEventEnd - timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
        
        // Navigation timing
        ttfb: timing.responseStart - timing.requestStart,
        fcp: 0, // Will be set by onload
        
        // Resource counts
        resourceCount: performance.getEntriesByType('resource').length,
        
        // Memory (if available)
        memory: performance.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
        } : null,
      };
    });

    await page.waitForLoadState('load');
    metrics.timestamps.loadComplete = Date.now();

    // Get Core Web Vitals approximations
    const coreWebVitals = await page.evaluate(() => {
      const entries = performance.getEntriesByType('largest-contentful-paint') || [];
      const layoutShifts = performance.getEntriesByType('layout-shift') || [];
      
      // Calculate CLS (only count shifts without recent input)
      let cls = 0;
      layoutShifts.forEach(entry => {
        if (!entry.hadRecentInput) {
          cls += entry.value;
        }
      });

      return {
        lcp: entries.length > 0 ? entries[entries.length - 1].startTime : null,
        cls: cls,
        fid: null, // FID needs interaction
        inp: null, // INP needs interaction
      };
    });

    await browser.close();

    // Build result similar to Lighthouse
    return {
      lhr: {
        categories: {
          performance: {
            score: calculatePerformanceScore(perfMetrics, coreWebVitals),
          },
        },
        audits: {
          'first-contentful-paint': { numericValue: perfMetrics.firstPaint || 0 },
          'largest-contentful-paint': { numericValue: coreWebVitals.lcp || perfMetrics.load },
          'cumulative-layout-shift': { numericValue: coreWebVitals.cls || 0 },
          'total-blocking-time': { numericValue: 0 }, // Not available in basic check
          'interactive': { numericValue: perfMetrics.load },
          'speed-index': { numericValue: perfMetrics.load },
        },
        runWarnings: ['Basic performance check - install Lighthouse for full audit'],
      },
      report: null,
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

function calculatePerformanceScore(metrics, vitals) {
  // Simplified performance score calculation
  let score = 1.0;

  // FCP penalty (good: <1800ms, needs-improvement: <3000ms, poor: >3000ms)
  const fcp = metrics.firstPaint || metrics.load;
  if (fcp > 3000) score -= 0.3;
  else if (fcp > 1800) score -= 0.15;

  // LCP penalty (good: <2500ms, needs-improvement: <4000ms, poor: >4000ms)
  const lcp = vitals.lcp || fcp;
  if (lcp > 4000) score -= 0.25;
  else if (lcp > 2500) score -= 0.15;

  // CLS penalty
  const cls = vitals.cls || 0;
  if (cls > 0.25) score -= 0.25;
  else if (cls > 0.1) score -= 0.15;

  // TTFB penalty (good: <800ms, needs-improvement: <1800ms, poor: >1800ms)
  const ttfb = metrics.ttfb || 0;
  if (ttfb > 1800) score -= 0.2;
  else if (ttfb > 800) score -= 0.1;

  return Math.max(0, Math.min(1, score));
}

// ============================================
// Budget Loading
// ============================================

async function loadBudget(budgetPath) {
  try {
    const content = await readFile(budgetPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.log('No budget file found, using default thresholds');
    return { thresholds: DEFAULT_THRESHOLDS };
  }
}

// ============================================
// Result Processing
// ============================================

function processResults(result, options = {}) {
  const { lhr } = result;
  const categories = lhr.categories || {};
  const audits = lhr.audits || {};

  const output = {
    timestamp: new Date().toISOString(),
    url: options.url,
    categories: {},
    webVitals: {},
    passed: true,
    failures: [],
  };

  // Process categories
  for (const [name, category] of Object.entries(categories)) {
    const score = category.score || 0;
    const threshold = options.threshold || DEFAULT_THRESHOLDS[name] || 0.5;
    
    output.categories[name] = {
      score: Math.round(score * 100),
      rating: score >= 0.9 ? 'good' : score >= 0.5 ? 'needs-improvement' : 'poor',
      threshold,
      passed: score >= threshold,
    };

    if (score < threshold) {
      output.passed = false;
      output.failures.push({
        type: 'category',
        name,
        score: Math.round(score * 100),
        threshold: Math.round(threshold * 100),
      });
    }
  }

  // Process Core Web Vitals
  const vitalMappings = {
    'first-contentful-paint': 'FCP',
    'largest-contentful-paint': 'LCP',
    'cumulative-layout-shift': 'CLS',
    'total-blocking-time': 'TBT',
    'interactive': 'TTI',
    'speed-index': 'SI',
    'server-response-time': 'TTFB',
  };

  for (const [auditKey, vitalName] of Object.entries(vitalMappings)) {
    const audit = audits[auditKey];
    if (audit && audit.numericValue !== undefined) {
      output.webVitals[vitalName] = {
        value: Math.round(audit.numericValue),
        unit: vitalName === 'CLS' ? 'score' : 'ms',
      };

      // Check against thresholds
      const threshold = DEFAULT_THRESHOLDS[auditKey];
      if (threshold && audit.numericValue > threshold) {
        output.passed = false;
        output.failures.push({
          type: 'webvital',
          name: vitalName,
          value: Math.round(audit.numericValue),
          threshold,
        });
      }
    }
  }

  return output;
}

// ============================================
// Output
// ============================================

function printResults(results, options = {}) {
  const { categories, webVitals, passed, failures, url } = results;

  console.log('\n📊 Performance Audit Results');
  console.log('='.repeat(60));
  console.log(`Target: ${url}`);
  console.log(`Time: ${results.timestamp}`);
  console.log('');

  // Categories
  console.log('📈 Category Scores:');
  for (const [name, cat] of Object.entries(categories)) {
    const emoji = cat.passed ? '✅' : '❌';
    const rating = cat.rating === 'good' ? '🟢' : cat.rating === 'needs-improvement' ? '🟡' : '🔴';
    console.log(`  ${emoji} ${name}: ${cat.score}% (threshold: ${cat.threshold}%) ${rating}`);
  }

  console.log('');

  // Web Vitals
  console.log('⚡ Core Web Vitals:');
  for (const [name, vital] of Object.entries(webVitals)) {
    const unit = vital.unit === 'score' ? '' : 'ms';
    const threshold = DEFAULT_THRESHOLDS[name.toLowerCase().replace(' ', '-')];
    const passed = !threshold || vital.value <= threshold;
    const emoji = passed ? '✅' : '❌';
    console.log(`  ${emoji} ${name}: ${vital.value}${unit}`);
  }

  console.log('');

  // Summary
  if (passed) {
    console.log('✅ All performance checks passed!');
  } else {
    console.log(`❌ ${failures.length} performance check(s) failed:`);
    for (const failure of failures) {
      if (failure.type === 'category') {
        console.log(`  - Category "${failure.name}": ${failure.score}% (threshold: ${failure.threshold}%)`);
      } else {
        console.log(`  - ${failure.name}: ${failure.value}ms (threshold: ${failure.threshold}ms)`);
      }
    }
  }

  // Warnings
  if (result.report?.runWarnings?.length) {
    console.log('\n⚠️  Warnings:');
    for (const warning of result.report.runWarnings) {
      console.log(`  - ${warning}`);
    }
  }

  console.log('');
}

function printJSON(results) {
  console.log(JSON.stringify(results, null, 2));
}

// ============================================
// Main
// ============================================

async function main() {
  const args = parseArgs();
  const url = args.url;

  console.log(`🔍 Starting performance audit...`);
  console.log(`   Target: ${url}`);
  console.log(`   CI Mode: ${args.ci}`);
  if (args.threshold) {
    console.log(`   Threshold: ${args.threshold}`);
  }
  console.log('');

  try {
    // Start server if localhost
    let serverProcess = null;
    if (url.includes('localhost') && !url.includes(':')) {
      url = 'http://localhost:3000';
    }

    // Run Lighthouse
    console.log('Running Lighthouse audit...');
    const result = await runLighthouse(url, {
      ci: args.ci,
      onlyCategories: args.onlyCategories,
      skipCategories: args.skipCategories,
    });

    // Process results
    const results = processResults(result, {
      url,
      threshold: args.threshold,
    });

    // Output
    if (args.ci) {
      printJSON(results);
    } else {
      printResults(results, { url });
    }

    // Exit code
    if (!results.passed) {
      if (args.ci) {
        console.error('\n❌ Performance audit FAILED');
        process.exit(1);
      }
    } else {
      console.log('\n✅ Performance audit PASSED');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ Performance audit error:', error.message);
    if (args.ci) {
      process.exit(2);
    }
    process.exit(1);
  }
}

// Export for testing
export { runLighthouse, processResults, parseArgs };

main();
