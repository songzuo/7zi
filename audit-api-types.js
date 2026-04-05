#!/usr/bin/env node

/**
 * API Routes Type Audit Script
 *
 * Analyzes all API routes in src/app/api/ for:
 * - Request parameter type definitions
 * - Response data type definitions
 * - Error handling types
 * - Documentation completeness
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join, dirname, basename } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const workspaceRoot = '/root/.openclaw/workspace'
const apiDir = join(workspaceRoot, '7zi-frontend/src/app/api')
const apiDocsPath = join(workspaceRoot, 'API.md')
const reportPath = join(workspaceRoot, 'REPORT_API_TYPES_AUDIT_v113_20260405.md')

// ============================================
// Type Analysis Results
// ============================================
const auditResults = {
  totalRoutes: 0,
  routesWithTypes: 0,
  routesWithoutTypes: 0,
  routesWithErrors: 0,
  undocumentedRoutes: [],
  typeIssues: [],
  documentationIssues: [],
  routes: [],
}

// ============================================
// Helper Functions
// ============================================

function getAllRouteFiles(dir, base = '') {
  const files = []
  const items = readdirSync(dir)

  for (const item of items) {
    const fullPath = join(dir, item)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      // Skip __tests__ directories
      if (item !== '__tests__') {
        files.push(...getAllRouteFiles(fullPath, join(base, item)))
      }
    } else if (item === 'route.ts' || item === 'route.tsx') {
      files.push({
        path: fullPath,
        relativePath: join(base, item),
        apiPath: '/' + base.replace(/\\/g, '/').replace(/\/route$/, ''),
      })
    }
  }

  return files
}

function extractTypeDefinitions(content) {
  const types = {
    interfaces: [],
    types: [],
    zodSchemas: [],
    requestTypes: [],
    responseTypes: [],
    errorTypes: [],
  }

  // Extract TypeScript interfaces
  const interfaceRegex = /export\s+(?:interface|type)\s+(\w+)(?:<[^>]+>)?\s*{([^}]+)}/g
  let match
  while ((match = interfaceRegex.exec(content)) !== null) {
    const [, name, body] = match
    types.interfaces.push({ name, body: body.trim() })
  }

  // Extract Zod schemas
  const zodRegex = /(?:const|export)\s+(\w+)\s*=\s*z\.(?:object|string|number|boolean|array|enum|record|union|intersection|lazy|discriminatedUnion|passthrough|strict|partial|required|pick|omit|extend|merge|refine|transform|default|optional|nullable|readonly|array|tuple|map|set|date|boolean|number|string|email|url|uuid|cuid|jwt|ip|base64|nan|safe|safeInteger|finite|positive|negative|nonnegative|nonpositive|int|float|multipleOf|lt|lte|gt|gte|length|min|max|email|url|uuid|cuid|jwt|ip|base64|nan|safe|safeInteger|finite|positive|negative|nonnegative|nonpositive|int|float|multipleOf|lt|lte|gt|gte|length|min|max|email|url|uuid|cuid|jwt|ip|base64|nan|safe|safeInteger|finite|positive|negative|nonnegative|nonpositive|int|float|multipleOf|lt|lte|gt|gte|length|min|max)\s*\([^)]*\)/g
  while ((match = zodRegex.exec(content)) !== null) {
    const [, name] = match
    types.zodSchemas.push(name)
  }

  // Extract request body types (from validation schemas)
  const requestTypeRegex = /(?:validateAndSanitizeBody|z\.parse|schema\.parse)\s*\([^,]+,\s*(\w+)\s*(?:,\s*['"](\w+)['"])?/g
  while ((match = requestTypeRegex.exec(content)) !== null) {
    const [, schemaName, sanitizationType] = match
    types.requestTypes.push({ schema: schemaName, sanitization: sanitizationType })
  }

  // Extract response types (from createSuccessResponse, NextResponse.json)
  const responseTypeRegex = /(?:createSuccessResponse|NextResponse\.json)\s*\(\s*{([^}]+)}/g
  while ((match = responseTypeRegex.exec(content)) !== null) {
    const [, body] = match
    types.responseTypes.push({ body: body.trim() })
  }

  // Extract error types (from createErrorResponse, createBadRequestError, etc.)
  const errorTypeRegex = /(?:createErrorResponse|createBadRequestError|createUnauthorizedError|createNotFoundError|createConflictError|createValidationError)\s*\([^)]*\)/g
  while ((match = errorTypeRegex.exec(content)) !== null) {
    types.errorTypes.push(match[0])
  }

  return types
}

function analyzeRoute(routeFile) {
  const content = readFileSync(routeFile.path, 'utf-8')
  const types = extractTypeDefinitions(content)

  const analysis = {
    path: routeFile.apiPath,
    file: routeFile.relativePath,
    methods: [],
    hasTypes: types.interfaces.length > 0 || types.types.length > 0 || types.zodSchemas.length > 0,
    hasRequestTypes: types.requestTypes.length > 0,
    hasResponseTypes: types.responseTypes.length > 0,
    hasErrorTypes: types.errorTypes.length > 0,
    types: types,
    issues: [],
  }

  // Extract HTTP methods
  const methodRegex = /export\s+(?:const\s+)?(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*(?:=\s*)?/g
  let match
  while ((match = methodRegex.exec(content)) !== null) {
    analysis.methods.push(match[1])
  }

  // Check for type issues
  if (!analysis.hasTypes && analysis.methods.length > 0) {
    analysis.issues.push('No type definitions found')
  }

  if (!analysis.hasRequestTypes && analysis.methods.includes('POST')) {
    analysis.issues.push('POST method without request type validation')
  }

  if (!analysis.hasRequestTypes && analysis.methods.includes('PUT')) {
    analysis.issues.push('PUT method without request type validation')
  }

  if (!analysis.hasRequestTypes && analysis.methods.includes('PATCH')) {
    analysis.issues.push('PATCH method without request type validation')
  }

  if (!analysis.hasErrorTypes && analysis.methods.length > 0) {
    analysis.issues.push('No error handling types found')
  }

  return analysis
}

function checkDocumentation(routeAnalysis, apiDocsContent) {
  const issues = []

  // Check if route is documented
  const routePath = routeAnalysis.path.replace(/\/$/, '') || '/'
  const routePattern = new RegExp(
    `\\*\\*\\s*Endpoint:\\s*\\*\\*\\s*['"]?${routePath.replace(/\//g, '\\/')}['"]?`,
    'i'
  )

  if (!routePattern.test(apiDocsContent)) {
    issues.push('Route not documented in API.md')
  }

  // Check if methods are documented
  for (const method of routeAnalysis.methods) {
    const methodPattern = new RegExp(
      `\\*\\*\\s*Endpoint:\\s*\\*\\*\\s*${method}\\s+${routePath.replace(/\//g, '\\/')}`,
      'i'
    )
    if (!methodPattern.test(apiDocsContent)) {
      issues.push(`${method} method not documented`)
    }
  }

  return issues
}

// ============================================
// Main Audit Process
// ============================================

console.log('🔍 Starting API Routes Type Audit...\n')

// Get all route files
console.log('📁 Scanning API routes...')
const routeFiles = getAllRouteFiles(apiDir)
console.log(`   Found ${routeFiles.length} route files\n`)

// Read API documentation
console.log('📖 Reading API documentation...')
let apiDocsContent = ''
try {
  apiDocsContent = readFileSync(apiDocsPath, 'utf-8')
  console.log('   API.md loaded successfully\n')
} catch (error) {
  console.log('   ⚠️  API.md not found or cannot be read\n')
}

// Analyze each route
console.log('🔬 Analyzing routes...\n')
for (const routeFile of routeFiles) {
  const analysis = analyzeRoute(routeFile)

  auditResults.totalRoutes++
  auditResults.routes.push(analysis)

  if (analysis.hasTypes) {
    auditResults.routesWithTypes++
  } else {
    auditResults.routesWithoutTypes++
  }

  if (analysis.hasErrorTypes) {
    auditResults.routesWithErrors++
  }

  if (analysis.issues.length > 0) {
    auditResults.typeIssues.push(...analysis.issues.map(issue => ({
      route: analysis.path,
      issue,
    })))
  }

  // Check documentation
  const docIssues = checkDocumentation(analysis, apiDocsContent)
  if (docIssues.length > 0) {
    auditResults.documentationIssues.push(...docIssues.map(issue => ({
      route: analysis.path,
      issue,
    })))
    auditResults.undocumentedRoutes.push(analysis.path)
  }
}

// ============================================
// Generate Report
// ============================================

console.log('📊 Generating audit report...\n')

const report = `# API Routes Type Audit Report

**Date:** ${new Date().toISOString()}
**Version:** v1.13
**Auditor:** AI Consultant Agent
**Workspace:** ${workspaceRoot}

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Total Routes | ${auditResults.totalRoutes} |
| Routes with Type Definitions | ${auditResults.routesWithTypes} (${Math.round(auditResults.routesWithTypes / auditResults.totalRoutes * 100)}%) |
| Routes without Type Definitions | ${auditResults.routesWithoutTypes} (${Math.round(auditResults.routesWithoutTypes / auditResults.totalRoutes * 100)}%) |
| Routes with Error Handling | ${auditResults.routesWithErrors} (${Math.round(auditResults.routesWithErrors / auditResults.totalRoutes * 100)}%) |
| Undocumented Routes | ${auditResults.undocumentedRoutes.length} |
| Type Issues Found | ${auditResults.typeIssues.length} |
| Documentation Issues | ${auditResults.documentationIssues.length} |

---

## Detailed Route Analysis

${auditResults.routes.map(route => `
### ${route.path}

**File:** \`${route.file}\`
**Methods:** ${route.methods.join(', ') || 'None'}
**Has Types:** ${route.hasTypes ? '✅' : '❌'}
**Has Request Types:** ${route.hasRequestTypes ? '✅' : '❌'}
**Has Response Types:** ${route.hasResponseTypes ? '✅' : '❌'}
**Has Error Types:** ${route.hasErrorTypes ? '✅' : '❌'}

${route.issues.length > 0 ? `
**Issues:**
${route.issues.map(issue => `- ${issue}`).join('\n')}
` : ''}

${route.types.interfaces.length > 0 ? `
**Interfaces:**
${route.types.interfaces.map(i => `- \`${i.name}\``).join('\n')}
` : ''}

${route.types.zodSchemas.length > 0 ? `
**Zod Schemas:**
${route.types.zodSchemas.map(s => `- \`${s}\``).join('\n')}
` : ''}
`).join('\n---\n')}

---

## Type Issues Summary

${auditResults.typeIssues.length > 0 ? auditResults.typeIssues.map(({ route, issue }) => `- **${route}**: ${issue}`).join('\n') : 'No type issues found.'}

---

## Documentation Issues Summary

${auditResults.documentationIssues.length > 0 ? auditResults.documentationIssues.map(({ route, issue }) => `- **${route}**: ${issue}`).join('\n') : 'No documentation issues found.'}

---

## Undocumented Routes

${auditResults.undocumentedRoutes.length > 0 ? auditResults.undocumentedRoutes.map(route => `- ${route}`).join('\n') : 'All routes are documented.'}

---

## Recommendations

### High Priority

1. **Add Type Definitions**: ${auditResults.routesWithoutTypes} routes lack type definitions. Consider adding TypeScript interfaces or Zod schemas for better type safety.

2. **Improve Error Handling**: ${auditResults.totalRoutes - auditResults.routesWithErrors} routes don't have explicit error handling types. Use \`createErrorResponse\`, \`createBadRequestError\`, etc.

3. **Document Missing Routes**: ${auditResults.undocumentedRoutes.length} routes are not documented in API.md. Add documentation for these endpoints.

### Medium Priority

1. **Request Validation**: Add Zod schema validation for POST, PUT, and PATCH endpoints.

2. **Response Types**: Define explicit response types for better API contract enforcement.

3. **Error Type Consistency**: Standardize error response formats across all endpoints.

### Low Priority

1. **Type Export**: Consider exporting reusable types to a shared types directory.

2. **Documentation Automation**: Set up automated API documentation generation from type definitions.

---

## Conclusion

The API routes are ${auditResults.routesWithTypes / auditResults.totalRoutes > 0.8 ? 'well-typed' : 'partially typed'} with ${Math.round(auditResults.routesWithTypes / auditResults.totalRoutes * 100)}% having type definitions. ${auditResults.undocumentedRoutes.length > 0 ? 'Some routes need documentation updates.' : 'Documentation is comprehensive.'}

Overall, the API is ${auditResults.typeIssues.length === 0 && auditResults.documentationIssues.length === 0 ? 'in excellent shape' : 'in good shape with room for improvement'}.
`

// Write report
writeFileSync(reportPath, report, 'utf-8')
console.log(`✅ Report generated: ${reportPath}\n`)

// Print summary
console.log('📈 Audit Summary:')
console.log(`   Total Routes: ${auditResults.totalRoutes}`)
console.log(`   With Types: ${auditResults.routesWithTypes} (${Math.round(auditResults.routesWithTypes / auditResults.totalRoutes * 100)}%)`)
console.log(`   Without Types: ${auditResults.routesWithoutTypes}`)
console.log(`   With Error Handling: ${auditResults.routesWithErrors}`)
console.log(`   Undocumented: ${auditResults.undocumentedRoutes.length}`)
console.log(`   Type Issues: ${auditResults.typeIssues.length}`)
console.log(`   Documentation Issues: ${auditResults.documentationIssues.length}`)
console.log('\n✨ Audit complete!')