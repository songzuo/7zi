#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const API_DIR = '/root/.openclaw/workspace/src/app/api';
const DOCS_DIR = '/root/.openclaw/workspace/docs/api';

// Extract documented endpoints from markdown files
function parseDocumentation() {
  const endpoints = new Set();

  if (!fs.existsSync(DOCS_DIR)) {
    return endpoints;
  }

  const docFiles = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.md'));

  for (const docFile of docFiles) {
    const content = fs.readFileSync(path.join(DOCS_DIR, docFile), 'utf-8');

    // Match endpoint patterns like `POST /api/auth/login`
    const endpointPattern = /(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+\/api\/[^\s`]+/gi;
    const matches = content.match(endpointPattern);

    if (matches) {
      matches.forEach(m => {
        // Normalize: uppercase method, lowercase path
        const normalized = m.replace(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+/i, (match, method) => {
          return method.toUpperCase() + ' ';
        }).toLowerCase();
        endpoints.add(normalized);
      });
    }
  }

  return endpoints;
}

// Parse route files to get actual endpoints
function parseRoutes() {
  const endpoints = new Set();

  function findRouteFiles(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(dir, file.name);

      if (file.isDirectory()) {
        findRouteFiles(fullPath);
      } else if (file.name === 'route.ts' || file.name === 'route.tsx') {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const relativePath = path.relative(API_DIR, fullPath).replace(/\/route\.tsx?$/, '');

        // Convert to URL path (replace [id] with placeholder)
        const urlPath = relativePath.replace(/\[([^\]]+)\]/g, ':$1');

        // Extract methods
        const methods = [];
        const methodPatterns = [
          'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'
        ];

        for (const method of methodPatterns) {
          const pattern = new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\s*\\(`, 'g');
          if (pattern.test(content)) {
            endpoints.add(`${method.toLowerCase()} /api/${urlPath}`);
          }
        }
      }
    }
  }

  findRouteFiles(API_DIR);
  return endpoints;
}

// Compare documentation vs implementation
function compareDocsAndImpl() {
  const documented = parseDocumentation();
  const implemented = parseRoutes();

  const undocumented = [...implemented].filter(e => !documented.has(e));
  const unimplemented = [...documented].filter(e => !implemented.has(e));

  console.log('='.repeat(80));
  console.log('DOCUMENTATION VS IMPLEMENTATION COMPARISON');
  console.log('='.repeat(80));
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('');

  console.log('SUMMARY');
  console.log('-'.repeat(80));
  console.log(`Documented Endpoints: ${documented.size}`);
  console.log(`Implemented Endpoints: ${implemented.size}`);
  console.log(`Undocumented (in code but not docs): ${undocumented.length}`);
  console.log(`Unimplemented (in docs but not code): ${unimplemented.length}`);
  console.log('');

  // Category breakdown
  console.log('UNDOCUMENTED ENDPOINTS (in code but not in docs)');
  console.log('-'.repeat(80));
  if (undocumented.length === 0) {
    console.log('  All endpoints are documented! ✓');
  } else {
    const byCategory = {};
    undocumented.forEach(e => {
      const category = e.split('/')[2] || 'root';
      if (!byCategory[category]) byCategory[category] = [];
      byCategory[category].push(e);
    });

    Object.keys(byCategory).sort().forEach(cat => {
      console.log(`\n  ${cat.toUpperCase()} (${byCategory[cat].length} endpoints):`);
      byCategory[cat].forEach(e => {
        console.log(`    - ${e}`);
      });
    });
  }
  console.log('');

  console.log('UNIMPLEMENTED ENDPOINTS (in docs but not in code)');
  console.log('-'.repeat(80));
  if (unimplemented.length === 0) {
    console.log('  All documented endpoints are implemented! ✓');
  } else {
    unimplemented.forEach(e => {
      console.log(`  - ${e}`);
    });
  }
  console.log('');

  console.log('='.repeat(80));
  console.log('COMPARISON COMPLETE');
  console.log('='.repeat(80));
}

compareDocsAndImpl();