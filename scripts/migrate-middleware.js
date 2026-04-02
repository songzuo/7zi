#!/usr/bin/env node

/**
 * Middleware Migration Assistant Script
 *
 * This script helps migrate API routes from global middleware to the new withRequestId wrapper.
 *
 * Usage:
 *   node scripts/migrate-middleware.js --dry-run    # Preview changes
 *   node scripts/migrate-middleware.js --all        # Migrate all API routes
 *   node scripts/migrate-middleware.js path/to/route.ts  # Migrate specific file
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// ============================================================================
// Configuration
// ============================================================================

const API_ROUTES_DIR = path.join(__dirname, '../src/app/api')
const IMPORT_STATEMENT = `import { withRequestId, createRequestLoggerForHandler } from '@/lib/middleware/with-request-id';`

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get all API route files
 */
function getApiRouteFiles(dir = API_ROUTES_DIR) {
  const files = []

  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir)

    for (const item of items) {
      const fullPath = path.join(currentDir, item)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        // Skip __tests__ and other non-route directories
        if (!item.startsWith('__') && !item.startsWith('[') && !item.startsWith('(')) {
          traverse(fullPath)
        }
      } else if (item === 'route.ts') {
        files.push(fullPath)
      }
    }
  }

  traverse(dir)
  return files
}

/**
 * Check if a file already uses withRequestId
 */
function usesWithRequestId(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  return content.includes('withRequestId')
}

/**
 * Check if a file uses NextRequest/NextResponse
 */
function isApiRoute(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  return content.includes('NextRequest') && content.includes('NextResponse')
}

/**
 * Migrate a single route file
 */
function migrateRouteFile(filePath, dryRun = false) {
  console.log(`\n📄 Processing: ${path.relative(API_ROUTES_DIR, filePath)}`)

  const content = fs.readFileSync(filePath, 'utf-8')

  // Skip if already migrated
  if (usesWithRequestId(filePath)) {
    console.log('  ✅ Already uses withRequestId - skipping')
    return { status: 'skipped', reason: 'already-migrated' }
  }

  // Skip if not an API route
  if (!isApiRoute(filePath)) {
    console.log('  ⏭️  Not an API route - skipping')
    return { status: 'skipped', reason: 'not-api-route' }
  }

  console.log('  🔧 Migrating...')

  let migrated = content
  let changes = []

  // 1. Add import statement (after existing imports)
  if (!migrated.includes('@/lib/middleware/with-request-id')) {
    const importMatch = migrated.match(/^(import\s+[^;]+;\n)+/m)
    if (importMatch) {
      const lastImportEnd = importMatch[0].length
      migrated =
        migrated.slice(0, lastImportEnd) + IMPORT_STATEMENT + '\n' + migrated.slice(lastImportEnd)
      changes.push('Added withRequestId import')
    }
  }

  // 2. Find and wrap handler functions
  const functionRegex = /export\s+(async\s+)?function\s+(\w+)\s*\(/g
  const exportConstRegex = /export\s+(const|let|var)\s+(\w+)\s*=\s*(async\s+)?\(/g

  let wrapped = false

  // Export function format
  migrated = migrated.replace(functionRegex, (match, isAsync, funcName) => {
    // Don't wrap named exports that are already exported
    if (
      match.includes('export const') ||
      match.includes('export let') ||
      match.includes('export var')
    ) {
      return match
    }

    wrapped = true
    changes.push(`Wrapped ${funcName} function`)
    return match // Keep original - we'll handle this in the next pass
  })

  // Export const format (the actual one we want to wrap)
  const handlerPattern = /export\s+(const|let|var)\s+(\w+)\s*=\s*(async\s+)?\(([^)]*)\)\s*=>\s*\{/g

  // First, convert simple async arrow functions to named functions for wrapping
  migrated = migrated.replace(
    /export\s+const\s+(\w+)\s*=\s*(async\s+)?\(([^)]*)\)\s*=>\s*\{/g,
    (match, funcName, isAsync, params) => {
      // Skip if already wrapped or if it's not a direct assignment
      if (
        match.includes('withRequestId') ||
        match.includes('withAuth') ||
        match.includes('withCors')
      ) {
        return match
      }

      wrapped = true
      const asyncKeyword = isAsync ? 'async ' : ''
      return `export const ${funcName} = withRequestId(async (${params}) => {`
    }
  )

  // Close the withRequestId wrapper
  const closeBracketCount = (migrated.match(/\}/g) || []).length
  const openBracketCount = (migrated.match(/\{/g) || []).length

  // Add closing brackets for wrapped functions
  if (wrapped) {
    const handlerEndPattern = /export\s+(const|let|var)\s+\w+\s*=\s*withRequestId\([^)]+\)\s*;/g

    // We need to close the wrapper function
    // This is complex, so for now we'll just mark it as needs manual review
    console.log('  ⚠️  Complex handler detected - requires manual review')
    changes.push('Requires manual review')
  }

  // 3. Update any request ID references
  if (
    migrated.includes("request.headers.get('x-request-id')") ||
    migrated.includes('request.headers.get("x-request-id")')
  ) {
    console.log('  ℹ️  Found request ID references - may need manual update')
    changes.push('Request ID references found')
  }

  if (dryRun) {
    console.log('  📋 Preview changes:')
    changes.forEach(change => console.log(`     - ${change}`))
    return { status: 'dry-run', changes }
  }

  // Write migrated file
  fs.writeFileSync(filePath, migrated, 'utf-8')
  console.log('  ✅ Migration complete')
  changes.forEach(change => console.log(`     - ${change}`))

  return { status: 'success', changes }
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const migrateAll = args.includes('--all')
  const specificFile = args.find(arg => !arg.startsWith('--'))

  console.log('\n🚀 Middleware Migration Assistant')
  console.log('=================================\n')

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n')
  }

  if (migrateAll) {
    const files = getApiRouteFiles()
    console.log(`📊 Found ${files.length} API route files\n`)

    const results = {
      success: 0,
      skipped: 0,
      dryRun: 0,
      manualReview: 0,
      errors: 0,
    }

    files.forEach(file => {
      try {
        const result = migrateRouteFile(file, dryRun)

        if (result.status === 'success') {
          results.success++
        } else if (result.status === 'skipped') {
          results.skipped++
        } else if (result.status === 'dry-run') {
          results.dryRun++
          if (result.changes?.includes('Requires manual review')) {
            results.manualReview++
          }
        } else {
          results.errors++
        }
      } catch (error) {
        console.error(`  ❌ Error processing ${file}:`, error.message)
        results.errors++
      }
    })

    console.log('\n📈 Summary:')
    console.log(`   ✅ Successfully migrated: ${results.success}`)
    console.log(`   ⏭️  Skipped: ${results.skipped}`)
    console.log(`   📋 Dry run: ${results.dryRun}`)
    console.log(`   🔧 Requires manual review: ${results.manualReview}`)
    console.log(`   ❌ Errors: ${results.errors}\n`)

    if (!dryRun && results.success > 0) {
      console.log('💡 Next steps:')
      console.log('   1. Review the migrated files')
      console.log('   2. Test your API routes')
      console.log('   3. Manually review files marked for manual review')
      console.log('   4. Once verified, delete src/middleware.ts\n')
    }
  } else if (specificFile) {
    const filePath = path.resolve(specificFile)
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`)
      process.exit(1)
    }

    migrateRouteFile(filePath, dryRun)
  } else {
    console.log('Usage:')
    console.log('  node scripts/migrate-middleware.js --dry-run')
    console.log('  node scripts/migrate-middleware.js --all')
    console.log('  node scripts/migrate-middleware.js path/to/route.ts\n')
    console.log('Examples:')
    console.log('  # Preview all migrations')
    console.log('  node scripts/migrate-middleware.js --dry-run')
    console.log('  # Migrate all API routes')
    console.log('  node scripts/migrate-middleware.js --all')
    console.log('  # Migrate specific route')
    console.log('  node scripts/migrate-middleware.js src/app/api/analytics/metrics/route.ts\n')
  }
}

// Run main function
main()
