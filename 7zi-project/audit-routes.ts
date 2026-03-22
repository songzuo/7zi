#!/usr/bin/env tsx

/**
 * Script to audit API routes for error handling, hardcoded secrets, and data validation
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const API_ROUTES_DIR = '/root/.openclaw/workspace/7zi-project/src/app/api';

interface RouteAudit {
  filePath: string;
  hasErrorHandling: boolean;
  hasTryCatch: boolean;
  hasHardcodedSecrets: boolean;
  secrets: string[];
  hasZodValidation: boolean;
  hasYupValidation: boolean;
  hasAnyValidation: boolean;
  errorHandlingMethods: string[];
  validationLibraries: string[];
  issues: string[];
}

// Patterns to detect
const API_KEY_PATTERNS = [
  /['"](sk-[a-zA-Z0-9]{32,})['"]/g,  // Stripe/OpenAI style keys
  /['"]([a-zA-Z0-9_-]{32,}api[a-zA-Z0-9_-]{0,})['"]/gi,
  /['"]([a-zA-Z0-9_-]{20,}secret[a-zA-Z0-9_-]{0,})['"]/gi,
  /['"]([a-zA-Z0-9_-]{40,}token[a-zA-Z0-9_-]{0,})['"]/gi,
];

const URL_WITH_CREDENTIALS = /['"]https?:\/\/[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+@/g;

const ERROR_HANDLING_PATTERNS = [
  { pattern: /catch\s*\(/, method: 'try-catch' },
  { pattern: /\.(catch|then)\s*\(/, method: 'promise-catch' },
  { pattern: /next\(\s*new\s+Error\(/, method: 'next-error' },
  { pattern: /throw\s+new\s+(ApiError|Error)\(/, method: 'throw-error' },
];

const VALIDATION_PATTERNS = [
  { pattern: /from\s+['"]zod['"]/, library: 'zod' },
  { pattern: /z\.\w+\(/, library: 'zod' },
  { pattern: /schema\.(parse|safeParse|validate)\(/, library: 'zod' },
  { pattern: /from\s+['"]yup['"]/, library: 'yup' },
  { pattern: /yup\.\w+\(/, library: 'yup' },
];

const ROUTE_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];

function getAllRouteFiles(dir: string): string[] {
  const files: string[] = [];
  const { execSync } = require('child_process');

  try {
    const result = execSync(`find ${dir} -name 'route.ts' -type f`, { encoding: 'utf-8' });
    return result.trim().split('\n').filter(f => f);
  } catch (e) {
    return [];
  }
}

function auditRoute(filePath: string): RouteAudit {
  const content = readFileSync(filePath, 'utf-8');
  const audit: RouteAudit = {
    filePath: filePath.replace('/root/.openclaw/workspace/7zi-project/', ''),
    hasErrorHandling: false,
    hasTryCatch: false,
    hasHardcodedSecrets: false,
    secrets: [],
    hasZodValidation: false,
    hasYupValidation: false,
    hasAnyValidation: false,
    errorHandlingMethods: [],
    validationLibraries: [],
    issues: [],
  };

  // Check for error handling
  for (const { pattern, method } of ERROR_HANDLING_PATTERNS) {
    if (pattern.test(content)) {
      audit.hasErrorHandling = true;
      if (!audit.errorHandlingMethods.includes(method)) {
        audit.errorHandlingMethods.push(method);
      }
    }
  }

  // Check for try-catch
  if (/try\s*\{[\s\S]*?\}\s*catch/.test(content)) {
    audit.hasTryCatch = true;
  }

  // Check for validation
  for (const { pattern, library } of VALIDATION_PATTERNS) {
    if (pattern.test(content)) {
      if (!audit.validationLibraries.includes(library)) {
        audit.validationLibraries.push(library);
      }
    }
  }

  audit.hasZodValidation = audit.validationLibraries.includes('zod');
  audit.hasYupValidation = audit.validationLibraries.includes('yup');
  audit.hasAnyValidation = audit.validationLibraries.length > 0;

  // Check for hardcoded secrets
  const allSecrets: string[] = [];

  // Check API key patterns
  for (const pattern of API_KEY_PATTERNS) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      allSecrets.push(`Potential API key: ${match[1].substring(0, 8)}...`);
    }
  }

  // Check URLs with credentials
  let urlMatch;
  while ((urlMatch = URL_WITH_CREDENTIALS.exec(content)) !== null) {
    allSecrets.push(`URL with credentials: ${urlMatch[0].substring(0, 20)}...`);
  }

  // Filter out obvious test/dummy values
  audit.secrets = allSecrets.filter(secret => {
    const lower = secret.toLowerCase();
    return !lower.includes('your_api_key') &&
           !lower.includes('your-secret') &&
           !lower.includes('test-key') &&
           !lower.includes('example');
  });

  audit.hasHardcodedSecrets = audit.secrets.length > 0;

  // Check for common issues
  // Issue: No error handling
  if (!audit.hasErrorHandling) {
    audit.issues.push('Missing error handling');
  }

  // Issue: No validation on POST/PUT/PATCH
  if (ROUTE_METHODS.some(m => content.includes(`${m}(async`)) &&
      content.includes('POST(') &&
      !audit.hasAnyValidation) {
    audit.issues.push('POST request without data validation');
  }

  // Issue: Hardcoded secrets
  if (audit.hasHardcodedSecrets) {
    audit.issues.push(`Contains ${audit.secrets.length} potentially hardcoded secret(s)`);
  }

  // Issue: Using console.log instead of proper logging
  if (/console\.log\(/.test(content) && !/logger\./.test(content)) {
    audit.issues.push('Using console.log instead of proper logger');
  }

  // Issue: Missing CSRF protection check
  if (content.includes('POST(') || content.includes('PUT(') || content.includes('DELETE(') || content.includes('PATCH(')) {
    if (!content.includes('validateCsrfToken') && !content.includes('csrf')) {
      audit.issues.push('State-changing method without CSRF token validation');
    }
  }

  return audit;
}

function main() {
  console.log('🔍 Auditing API Routes...\n');

  const routeFiles = getAllRouteFiles(API_ROUTES_DIR);
  console.log(`Found ${routeFiles.length} API routes\n`);

  const audits = routeFiles.map(file => auditRoute(file));

  // Sort by severity (most issues first)
  audits.sort((a, b) => b.issues.length - a.issues.length);

  // Print summary
  const withNoErrorHandling = audits.filter(a => !a.hasErrorHandling).length;
  const withNoValidation = audits.filter(a => !a.hasAnyValidation).length;
  const withHardcodedSecrets = audits.filter(a => a.hasHardcodedSecrets).length;
  const withIssues = audits.filter(a => a.issues.length > 0).length;

  console.log('📊 Summary:\n');
  console.log(`  Total routes: ${audits.length}`);
  console.log(`  Routes with error handling: ${audits.length - withNoErrorHandling} (${Math.round((audits.length - withNoErrorHandling) / audits.length * 100)}%)`);
  console.log(`  Routes with validation: ${audits.length - withNoValidation} (${Math.round((audits.length - withNoValidation) / audits.length * 100)}%)`);
  console.log(`  Routes with hardcoded secrets: ${withHardcodedSecrets}`);
  console.log(`  Routes with issues: ${withIssues}\n`);

  // Print routes with issues
  console.log('🔴 Routes with Issues:\n');

  audits.forEach(audit => {
    if (audit.issues.length > 0) {
      console.log(`\n${audit.filePath}`);
      console.log(`  Error Handling: ${audit.hasErrorHandling ? '✅' : '❌'} (${audit.errorHandlingMethods.join(', ') || 'none'})`);
      console.log(`  Validation: ${audit.hasAnyValidation ? '✅' : '❌'} (${audit.validationLibraries.join(', ') || 'none'})`);

      if (audit.secrets.length > 0) {
        console.log(`  ⚠️  Potentially Hardcoded Secrets:`);
        audit.secrets.forEach(secret => console.log(`    - ${secret}`));
      }

      console.log(`  Issues:`);
      audit.issues.forEach(issue => console.log(`    - ${issue}`));
    }
  });

  // Print routes with hardcoded secrets only (even if no other issues)
  console.log('\n\n🔐 Routes with Potentially Hardcoded Secrets:\n');

  const withSecretsOnly = audits.filter(a => a.hasHardcodedSecrets && a.issues.filter(i => i.includes('hardcoded')).length > 0);
  if (withSecretsOnly.length === 0) {
    console.log('✅ No hardcoded secrets detected!');
  } else {
    withSecretsOnly.forEach(audit => {
      console.log(`\n${audit.filePath}`);
      audit.secrets.forEach(secret => console.log(`  - ${secret}`));
    });
  }

  // Print routes without validation
  console.log('\n\n📋 Routes Without Data Validation (POST/PUT/PATCH):\n');

  const routesWithoutValidation = audits.filter(a => {
    const content = readFileSync(`/root/.openclaw/workspace/7zi-project/${a.filePath}`, 'utf-8');
    const hasStateChangingMethods = ['POST(', 'PUT(', 'PATCH('].some(m => content.includes(m));
    return hasStateChangingMethods && !a.hasAnyValidation;
  });

  if (routesWithoutValidation.length === 0) {
    console.log('✅ All state-changing routes have validation!');
  } else {
    routesWithoutValidation.forEach(audit => {
      console.log(`  ❌ ${audit.filePath}`);
    });
  }

  // Print routes without error handling
  console.log('\n\n🛡️  Routes Without Error Handling:\n');

  const routesWithoutErrorHandling = audits.filter(a => !a.hasErrorHandling);
  if (routesWithoutErrorHandling.length === 0) {
    console.log('✅ All routes have error handling!');
  } else {
    routesWithoutErrorHandling.forEach(audit => {
      console.log(`  ❌ ${audit.filePath}`);
    });
  }
}

main();
