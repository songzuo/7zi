#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const API_DIR = '/root/.openclaw/workspace/src/app/api';
const DOCS_DIR = '/root/.openclaw/workspace/docs/api';

// Find all route files
function findRouteFiles(dir, routes = []) {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      findRouteFiles(fullPath, routes);
    } else if (file.name === 'route.ts' || file.name === 'route.tsx') {
      routes.push(fullPath);
    }
  }

  return routes;
}

// Parse route file to extract HTTP methods and types
function parseRouteFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(API_DIR, filePath).replace(/\/route\.tsx?$/, '');

  // Extract HTTP methods
  const methods = [];
  const methodPatterns = [
    { name: 'GET', pattern: /export\s+(?:async\s+)?function\s+GET\s*\(/g },
    { name: 'POST', pattern: /export\s+(?:async\s+)?function\s+POST\s*\(/g },
    { name: 'PUT', pattern: /export\s+(?:async\s+)?function\s+PUT\s*\(/g },
    { name: 'PATCH', pattern: /export\s+(?:async\s+)?function\s+PATCH\s*\(/g },
    { name: 'DELETE', pattern: /export\s+(?:async\s+)?function\s+DELETE\s*\(/g },
    { name: 'OPTIONS', pattern: /export\s+(?:async\s+)?function\s+OPTIONS\s*\(/g },
    { name: 'HEAD', pattern: /export\s+(?:async\s+)?function\s+HEAD\s*\(/g },
  ];

  for (const { name, pattern } of methodPatterns) {
    if (pattern.test(content)) {
      methods.push(name);
    }
  }

  // Check for type issues
  const typeIssues = [];
  const anyPattern = /:\s*any\b/g;
  const anyMatches = content.match(anyPattern);
  if (anyMatches) {
    typeIssues.push(`Found ${anyMatches.length} 'any' type(s)`);
  }

  // Check for missing return types
  const functionPattern = /export\s+(?:async\s+)?function\s+\w+\s*\([^)]*\)(?!\s*:\s*\w)/g;
  const missingReturnTypes = content.match(functionPattern);
  if (missingReturnTypes) {
    typeIssues.push(`${missingReturnTypes.length} function(s) missing return type`);
  }

  // Extract request/response types if present
  const requestTypeMatch = content.match(/interface\s+\w*Request\s*{([^}]+)}/s);
  const responseTypeMatch = content.match(/interface\s+\w*Response\s*{([^}]+)}/s);

  return {
    path: relativePath,
    fullPath: filePath,
    methods,
    typeIssues,
    hasRequestTypes: !!requestTypeMatch,
    hasResponseTypes: !!responseTypeMatch,
    contentLength: content.length,
  };
}

// Main audit
console.log('='.repeat(80));
console.log('API ROUTES AUDIT REPORT');
console.log('='.repeat(80));
console.log(`Date: ${new Date().toISOString()}`);
console.log(`API Directory: ${API_DIR}`);
console.log(`Docs Directory: ${DOCS_DIR}`);
console.log('');

const routeFiles = findRouteFiles(API_DIR);
console.log(`Found ${routeFiles.length} route files\n`);

const routes = routeFiles.map(parseRouteFile);

// Summary statistics
console.log('SUMMARY STATISTICS');
console.log('-'.repeat(80));
const totalMethods = routes.reduce((sum, r) => sum + r.methods.length, 0);
const routesWithTypes = routes.filter(r => r.hasRequestTypes || r.hasResponseTypes).length;
const routesWithTypeIssues = routes.filter(r => r.typeIssues.length > 0).length;

console.log(`Total Routes: ${routes.length}`);
console.log(`Total HTTP Methods: ${totalMethods}`);
console.log(`Routes with Type Definitions: ${routesWithTypes} (${((routesWithTypes/routes.length)*100).toFixed(1)}%)`);
console.log(`Routes with Type Issues: ${routesWithTypeIssues} (${((routesWithTypeIssues/routes.length)*100).toFixed(1)}%)`);
console.log('');

// Method distribution
console.log('HTTP METHOD DISTRIBUTION');
console.log('-'.repeat(80));
const methodCounts = {};
routes.forEach(r => {
  r.methods.forEach(m => {
    methodCounts[m] = (methodCounts[m] || 0) + 1;
  });
});
Object.entries(methodCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([method, count]) => {
    console.log(`  ${method.padEnd(10)} ${count} routes`);
  });
console.log('');

// Routes by category
console.log('ROUTES BY CATEGORY');
console.log('-'.repeat(80));
const categories = {};
routes.forEach(r => {
  const category = r.path.split('/')[0];
  categories[category] = (categories[category] || 0) + 1;
});
Object.entries(categories)
  .sort((a, b) => b[1] - a[1])
  .forEach(([category, count]) => {
    console.log(`  ${category.padEnd(20)} ${count} route(s)`);
  });
console.log('');

// Routes with type issues
console.log('ROUTES WITH TYPE ISSUES');
console.log('-'.repeat(80));
const problematicRoutes = routes.filter(r => r.typeIssues.length > 0);
if (problematicRoutes.length === 0) {
  console.log('  No type issues found!');
} else {
  problematicRoutes.forEach(r => {
    console.log(`  ${r.path}`);
    r.typeIssues.forEach(issue => {
      console.log(`    - ${issue}`);
    });
  });
}
console.log('');

// Routes without type definitions
console.log('ROUTES WITHOUT TYPE DEFINITIONS');
console.log('-'.repeat(80));
const untypedRoutes = routes.filter(r => !r.hasRequestTypes && !r.hasResponseTypes);
if (untypedRoutes.length === 0) {
  console.log('  All routes have type definitions!');
} else {
  untypedRoutes.forEach(r => {
    console.log(`  ${r.path}`);
  });
}
console.log('');

// Detailed route list
console.log('DETAILED ROUTE LIST');
console.log('-'.repeat(80));
routes.forEach(r => {
  const methodsStr = r.methods.length > 0 ? r.methods.join(', ') : 'NO METHODS';
  const typeStatus = r.hasRequestTypes || r.hasResponseTypes ? '✓' : '✗';
  console.log(`  [${typeStatus}] ${r.path.padEnd(50)} ${methodsStr}`);
});
console.log('');

// Check documentation
console.log('DOCUMENTATION FILES');
console.log('-'.repeat(80));
if (fs.existsSync(DOCS_DIR)) {
  const docFiles = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.md'));
  console.log(`Found ${docFiles.length} documentation files:`);
  docFiles.forEach(f => {
    const stats = fs.statSync(path.join(DOCS_DIR, f));
    console.log(`  ${f} (${stats.size} bytes)`);
  });
} else {
  console.log('  Documentation directory not found!');
}
console.log('');

console.log('='.repeat(80));
console.log('AUDIT COMPLETE');
console.log('='.repeat(80));