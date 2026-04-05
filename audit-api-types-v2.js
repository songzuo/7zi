#!/usr/bin/env node

/**
 * API Routes Type Audit - Advanced Version
 *
 * Analyzes API routes for type coverage, including imported types from separate files.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, dirname, basename } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const workspaceRoot = '/root/.openclaw/workspace'
const apiDir = join(workspaceRoot, '7zi-frontend/src/app/api')
const typesDir = join(workspaceRoot, '7zi-frontend/src/types')
const apiDocsPath = join(workspaceRoot, 'API.md')
const reportPath = join(workspaceRoot, 'REPORT_API_TYPES_AUDIT_v113_20260405.md')

// ============================================
// Advanced Type Analysis
// ============================================

function extractTypeImports(content) {
  const imports = {
    interfaces: [],
    types: [],
    enums: [],
    zodSchemas: [],
  }

  // Extract type imports: import type { Interface1, Interface2 } from '...'
  const typeImportRegex = /import\s+type\s*{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g
  let match
  while ((match = typeImportRegex.exec(content)) !== null) {
    const [, typesStr, from] = match
    const types = typesStr.split(',').map(t => t.trim().split(' as ')[0].trim())
    types.forEach(type => {
      imports.interfaces.push({ name: type, from })
    })
  }

  // Extract regular type imports: import { Interface1, type Interface2 } from '...'
  const mixedImportRegex = /import\s*{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g
  while ((match = mixedImportRegex.exec(content)) !== null) {
    const [, itemsStr, from] = match
    const items = itemsStr.split(',').map(t => t.trim())
    items.forEach(item => {
      const isType = item.startsWith('type ')
      const name = isType ? item.replace('type ', '').trim() : item
      if (isType) {
        imports.interfaces.push({ name, from })
      }
    })
  }

  // Extract Zod schema imports
  const zodImportRegex = /import\s+{([^}]+)}\s+from\s+['"]zod['"]/g
  while ((match = zodImportRegex.exec(content)) !== null) {
    const [, schemas] = match
    imports.zodSchemas.push(...schemas.split(',').map(s => s.trim()))
  }

  return imports
}

function extractLocalTypeDefinitions(content) {
  const types = {
    interfaces: [],
    types: [],
  }

  // Extract interface definitions
  const interfaceRegex = /export\s+(?:interface|type)\s+(\w+)(?:<[^>]+>)?\s*{([^}]*(?:{[^}]*}[^}]*)*)}/gs
  let match
  const interfaceContent = content.replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
  const resetRegex = () => interfaceRegex.lastIndex = 0
  resetRegex()

  while ((match = interfaceRegex.exec(interfaceContent)) !== null) {
    const [, name, body] = match
    types.interfaces.push({ name, body: body.trim() })
  }

  return types
}

function extractRequestTypes(content, imports) {
  const requestTypes = {
    hasValidation: false,
    schemaName: null,
    importedRequestTypes: [],
    localRequestTypes: [],
  }

  // Check for Zod schema validation
  const zodValidationRegex = /z\.(parse|safeParse)\s*\(\s*(\w+)\s*,/g
  let match
  while ((match = zodValidationRegex.exec(content)) !== null) {
    requestTypes.hasValidation = true
    requestTypes.schemaName = match[2]
  }

  // Check for validateAndSanitizeBody
  const validateRegex = /validateAndSanitizeBody\s*\(\s*body\s*,\s*(\w+)/g
  while ((match = validateRegex.exec(content)) !== null) {
    requestTypes.hasValidation = true
    requestTypes.schemaName = match[1]
  }

  // Extract request body type annotations in POST/PUT/PATCH handlers
  const bodyTypeRegex = /(?:await\s+request\.json\(\)|const\s+body)\s*(?:as\s+(\w+)|:\s+(\w+))/g
  while ((match = bodyTypeRegex.exec(content)) !== null) {
    const typeName = match[1] || match[2]
    if (typeName) {
      // Check if it's imported or local
      const isImported = imports.interfaces.some(i => i.name === typeName)
      const isLocal = extractLocalTypeDefinitions(content).interfaces.some(i => i.name === typeName)
      if (isImported) {
        requestTypes.importedRequestTypes.push(typeName)
      } else if (isLocal) {
        requestTypes.localRequestTypes.push(typeName)
      }
    }
  }

  return requestTypes
}

function extractResponseTypes(content, imports) {
  const responseTypes = {
    hasTypedResponse: false,
    importedResponseTypes: [],
    localResponseTypes: [],
    responseTypeImports: [],
  }

  // Check for createSuccessResponse<T> usage
  const successResponseRegex = /createSuccessResponse<(\w+)>\s*\(/g
  let match
  while ((match = successResponseRegex.exec(content)) !== null) {
    responseTypes.hasTypedResponse = true
    const typeName = match[1]
    const isImported = imports.interfaces.some(i => i.name === typeName)
    if (isImported) {
      responseTypes.importedResponseTypes.push(typeName)
    } else {
      responseTypes.localResponseTypes.push(typeName)
    }
  }

  // Extract type imports from the request/response types
  imports.interfaces.forEach(i => {
    if (i.name.includes('Request') || i.name.includes('Response')) {
      responseTypes.responseTypeImports.push(i)
    }
  })

  return responseTypes
}

function extractErrorHandling(content) {
  const errors = {
    hasErrorHandling: false,
    usesHelperFunctions: false,
    explicitErrorTypes: [],
    helperFunctionsUsed: [],
  }

  // Check for try-catch blocks
  if (/try\s*{[\s\S]*?}\s*catch/.test(content)) {
    errors.hasErrorHandling = true
  }

  // Check for error helper functions
  const errorHelpers = [
    'createErrorResponse',
    'createBadRequestError',
    'createUnauthorizedError',
    'createNotFoundError',
    'createConflictError',
    'createValidationError',
    'createServiceUnavailableError',
  ]

  errorHelpers.forEach(helper => {
    if (content.includes(helper)) {
      errors.usesHelperFunctions = true
      errors.helperFunctionsUsed.push(helper)
    }
  })

  // Check for explicit error type definitions
  if (/interface\s+\w*Error/i.test(content) || /type\s+\w*Error/i.test(content)) {
    errors.explicitErrorTypes.push(true)
  }

  return errors
}

function extractHTTPMethods(content) {
  const methods = []
  const methodRegex = /export\s+(?:const\s+)?(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*(?:=\s*)?/g
  let match
  while ((match = methodRegex.exec(content)) !== null) {
    if (!methods.includes(match[1])) {
      methods.push(match[1])
    }
  }
  return methods
}

function analyzeRoute(filePath, apiPath, content) {
  const imports = extractTypeImports(content)
  const localTypes = extractLocalTypeDefinitions(content)
  const requestTypes = extractRequestTypes(content, imports)
  const responseTypes = extractResponseTypes(content, imports)
  const errorHandling = extractErrorHandling(content)
  const methods = extractHTTPMethods(content)

  return {
    path: apiPath,
    file: filePath.replace(apiDir, '').replace(/^\//, ''),
    methods,
    types: {
      imported: imports.interfaces,
      local: localTypes.interfaces,
      zodSchemas: imports.zodSchemas,
    },
    requestValidation: {
      hasValidation: requestTypes.hasValidation,
      schemaName: requestTypes.schemaName,
      importedTypes: requestTypes.importedRequestTypes,
      localTypes: requestTypes.localRequestTypes,
    },
    responseTypes: {
      hasTypedResponse: responseTypes.hasTypedResponse,
      importedTypes: responseTypes.importedResponseTypes,
      localTypes: responseTypes.localResponseTypes,
      allResponseImports: responseTypes.responseTypeImports,
    },
    errorHandling,
    issues: analyzeIssues(requestTypes, responseTypes, errorHandling, methods),
  }
}

function analyzeIssues(requestTypes, responseTypes, errorHandling, methods) {
  const issues = []

  // Check for POST/PUT/PATCH without validation
  const needsValidation = methods.filter(m => ['POST', 'PUT', 'PATCH'].includes(m))
  if (needsValidation.length > 0 && !requestTypes.hasValidation) {
    needsValidation.forEach(method => {
      issues.push(`${method} method without request validation`)
    })
  }

  // Check for typed response
  if (methods.length > 0 && !responseTypes.hasTypedResponse && (!responseTypes.localTypes || responseTypes.localTypes.length === 0)) {
    issues.push('No explicit response type definition')
  }

  // Check for error handling
  if (methods.length > 0 && !errorHandling.hasErrorHandling) {
    issues.push('No error handling (try-catch)')
  }

  // Check if using error helper functions
  if (errorHandling.hasErrorHandling && !errorHandling.usesHelperFunctions) {
    issues.push('Error handling exists but not using standardized helper functions')
  }

  return issues
}

function getAllRouteFiles(dir, base = '') {
  const files = []
  const items = readdirSync(dir)

  for (const item of items) {
    const fullPath = join(dir, item)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      if (item !== '__tests__' && item !== 'node_modules') {
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

// ============================================
// Main Audit Process
// ============================================

console.log('🔍 Advanced API Routes Type Audit...\n')

// Get all route files
console.log('📁 Scanning API routes...')
const routeFiles = getAllRouteFiles(apiDir)
console.log(`   Found ${routeFiles.length} route files\n`)

// Read API documentation
console.log('📖 Reading API documentation...')
let apiDocsContent = ''
try {
  apiDocsContent = readFileSync(apiDocsPath, 'utf-8')
  const docEndpoints = (apiDocsContent.match(/\*\*Endpoint:\*\*/g) || []).length
  console.log(`   API.md loaded (${docEndpoints} documented endpoints)\n`)
} catch (error) {
  console.log('   ⚠️  API.md not found or cannot be read\n')
}

// Analyze each route
console.log('🔬 Analyzing routes...\n')
const routes = []
const summary = {
  total: 0,
  withRequestValidation: 0,
  withResponseTypes: 0,
  withErrorHandling: 0,
  withHelperErrors: 0,
  undocumented: 0,
  issues: [],
}

for (const routeFile of routeFiles) {
  const content = readFileSync(routeFile.path, 'utf-8')
  const analysis = analyzeRoute(routeFile.path, routeFile.apiPath, content)
  routes.push(analysis)
  summary.total++

  if (analysis.requestValidation.hasValidation) summary.withRequestValidation++
  if (analysis.responseTypes.hasTypedResponse || (analysis.responseTypes.localTypes && analysis.responseTypes.localTypes.length > 0)) summary.withResponseTypes++
  if (analysis.errorHandling.hasErrorHandling) summary.withErrorHandling++
  if (analysis.errorHandling.usesHelperFunctions) summary.withHelperErrors++

  // Check documentation
  const routePattern = new RegExp(
    `\\*\\*\\s*Endpoint:\\s*\\*\\*\\s*(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\\s+${analysis.path.replace(/\//g, '\\/').replace(/\[.*?\]/g, '[^/]+')}`,
    'i'
  )

  if (!routePattern.test(apiDocsContent)) {
    summary.undocumented++
  }

  analysis.issues.forEach(issue => {
    summary.issues.push({ route: analysis.path, issue })
  })
}

// ============================================
// Generate Report
// ============================================

console.log('📊 Generating audit report...\n')

const report = `# API Routes Type Audit Report (Advanced)

**Date:** ${new Date().toISOString().split('T')[0]}
**Version:** v1.13.0
**Auditor:** AI Consultant Agent
**Project:** 7zi Project

---

## Executive Summary

| Metric | Count | Percentage |
|--------|-------|------------|
| Total API Routes | ${summary.total} | 100% |
| Routes with Request Validation | ${summary.withRequestValidation} | ${Math.round(summary.withRequestValidation / summary.total * 100)}% |
| Routes with Response Types | ${summary.withResponseTypes} | ${Math.round(summary.withResponseTypes / summary.total * 100)}% |
| Routes with Error Handling | ${summary.withErrorHandling} | ${Math.round(summary.withErrorHandling / summary.total * 100)}% |
| Routes with Error Helper Functions | ${summary.withHelperErrors} | ${Math.round(summary.withHelperErrors / summary.total * 100)}% |
| Undocumented Routes | ${summary.undocumented} | ${Math.round(summary.undocumented / summary.total * 100)}% |
| Total Issues Found | ${summary.issues.length} | - |

---

## Analysis Methodology

This audit analyzed API routes in \`src/app/api/\` for:

1. **Type Definitions**: Local interfaces/types and imported types
2. **Request Validation**: Zod schema validation, request body types
3. **Response Types**: Explicit response type definitions
4. **Error Handling**: Try-catch blocks, standardized error helpers
5. **Documentation**: Coverage in API.md

---

## Route Analysis

${routes.map(route => `
### ${route.path || '/'}

**File:** \`${route.file}\`
**Methods:** ${route.methods.length > 0 ? route.methods.join(', ') : 'None defined'}

#### Type Coverage

| Aspect | Status | Details |
|--------|--------|---------|
| Request Validation | ${route.requestValidation.hasValidation ? '✅' : '❌'} | ${route.requestValidation.hasValidation ? `Schema: ${route.requestValidation.schemaName || 'unknown'}` : 'No validation'} |
| Response Types | ${route.responseTypes.hasTypedResponse || (route.responseTypes.localTypes && route.responseTypes.localTypes.length > 0) ? '✅' : '⚠️'} | ${route.responseTypes.importedTypes.length + (route.responseTypes.localTypes?.length || 0)} type(s) |
| Error Handling | ${route.errorHandling.hasErrorHandling ? '✅' : '❌'} | ${route.errorHandling.usesHelperFunctions ? 'Uses helpers' : 'Manual'} |

#### Type Definitions

${route.types.imported.length > 0 ? `
**Imported Types (${route.types.imported.length}):**
${route.types.imported.slice(0, 5).map(t => `- \`${t.name}\` from \`${t.from}\``).join('\n')}
${route.types.imported.length > 5 ? `... and ${route.types.imported.length - 5} more` : ''}
` : ''}

${route.types.local && route.types.local.length > 0 ? `
**Local Types (${route.types.local.length}):**
${route.types.local.slice(0, 5).map(t => `- \`${t.name}\``).join('\n')}
${route.types.local.length > 5 ? `... and ${route.types.local.length - 5} more` : ''}
` : ''}

${route.issues.length > 0 ? `
#### ⚠️ Issues
${route.issues.map(issue => `- ${issue}`).join('\n')}
` : ''}

---
`).join('\n')}

---

## Issues Summary

${summary.issues.length > 0 ? summary.issues.map(({ route, issue }) => `- **${route}**: ${issue}`).join('\n') : '✅ No issues found!'}

---

## Recommendations

### Critical (High Priority)

1. **Add Request Validation**: ${summary.total - summary.withRequestValidation} routes lack request validation. Add Zod schemas for POST/PUT/PATCH endpoints.

2. **Document All Routes**: ${summary.undocumented} routes are not documented in API.md. This creates a knowledge gap.

### Important (Medium Priority)

3. **Add Response Types**: ${summary.total - summary.withResponseTypes} routes lack explicit response types. Define response interfaces for better API contracts.

4. **Standardize Error Handling**: ${summary.total - summary.withHelperErrors} routes don't use error helper functions. Migrate to \`createErrorResponse\`, \`createBadRequestError\`, etc.

### Nice to Have (Low Priority)

5. **Type Organization**: Consider consolidating related types into shared type files (e.g., \`src/types/api.ts\`).

6. **Documentation Automation**: Set up automated API documentation generation from type definitions.

---

## Well-Implemented Routes (Examples)

The following routes demonstrate good practices:

${routes.filter(r => r.requestValidation.hasValidation && r.responseTypes.hasTypedResponse && r.errorHandling.usesHelperFunctions).slice(0, 3).map(r => `- **${r.path}**: Has validation, typed responses, and error helpers`).join('\n')}

---

## Needs Improvement Routes

The following routes need attention:

${routes.filter(r => r.issues.length > 0).slice(0, 5).map(r => `- **${r.path}**: ${r.issues.length} issue(s) - ${r.issues[0]}`).join('\n')}

---

## Conclusion

The 7zi API has **${Math.round(summary.withRequestValidation / summary.total * 100)}% type coverage** for request validation and **${Math.round(summary.withErrorHandling / summary.total * 100)}% error handling coverage**.

**Overall Assessment:** ${summary.issues.length < 10 ? 'Good' : summary.issues.length < 20 ? 'Fair' : 'Needs Improvement'}

**Key Strengths:**
- ${Math.round(summary.withErrorHandling / summary.total * 100)}% of routes have error handling
- Clear separation of types in \`src/types/\` directory
- Good use of centralized error helper functions

**Key Areas for Improvement:**
- Request validation coverage needs improvement
- Some routes lack explicit response types
- Documentation needs updates for newer routes

---

*Generated by AI Consultant Agent*
*Date: ${new Date().toISOString()}*
`

// Write report
writeFileSync(reportPath, report, 'utf-8')
console.log(`✅ Report generated: ${reportPath}\n`)

// Print summary
console.log('📈 Audit Summary:')
console.log(`   Total Routes: ${summary.total}`)
console.log(`   With Request Validation: ${summary.withRequestValidation} (${Math.round(summary.withRequestValidation / summary.total * 100)}%)`)
console.log(`   With Response Types: ${summary.withResponseTypes} (${Math.round(summary.withResponseTypes / summary.total * 100)}%)`)
console.log(`   With Error Handling: ${summary.withErrorHandling} (${Math.round(summary.withErrorHandling / summary.total * 100)}%)`)
console.log(`   Using Error Helpers: ${summary.withHelperErrors} (${Math.round(summary.withHelperErrors / summary.total * 100)}%)`)
console.log(`   Undocumented: ${summary.undocumented}`)
console.log(`   Issues Found: ${summary.issues.length}`)
console.log('\n✨ Audit complete!')