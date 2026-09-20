#!/usr/bin/env node

/**
 * Auth Module Verification Script
 * Verifies that the authentication module is properly set up
 */

const fs = require('fs')
const path = require('path')

const authDir = path.join(__dirname, '../src/lib/auth')
const apiAuthDir = path.join(__dirname, '../src/app/api/auth')

console.log('🔍 Verifying Authentication Module...\n')

// Check required files
const requiredFiles = [
  { path: path.join(authDir, 'types.ts'), description: 'Type definitions' },
  { path: path.join(authDir, 'repository.ts'), description: 'Database operations' },
  { path: path.join(authDir, 'service.ts'), description: 'Auth service' },
  { path: path.join(authDir, 'middleware.ts'), description: 'Auth middleware' },
  { path: path.join(authDir, 'index.ts'), description: 'Module exports' },
  { path: path.join(authDir, 'README.md'), description: 'Documentation' },
  { path: path.join(authDir, '__tests__/auth.test.ts'), description: 'Test suite' },
  { path: path.join(apiAuthDir, 'login/route.ts'), description: 'Login API' },
  { path: path.join(apiAuthDir, 'logout/route.ts'), description: 'Logout API' },
  { path: path.join(apiAuthDir, 'register/route.ts'), description: 'Register API' },
  { path: path.join(apiAuthDir, 'refresh/route.ts'), description: 'Refresh API' },
  { path: path.join(apiAuthDir, 'me/route.ts'), description: 'User info API' },
]

let allPresent = true
let totalSize = 0

console.log('📁 Checking required files:')
requiredFiles.forEach(({ path: filePath, description }) => {
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath)
    const size = (stats.size / 1024).toFixed(2)
    totalSize += stats.size
    console.log(`  ✅ ${description}: ${filePath} (${size} KB)`)
  } else {
    console.log(`  ❌ ${description}: ${filePath} (MISSING)`)
    allPresent = false
  }
})

console.log(`\n📊 Total size: ${(totalSize / 1024).toFixed(2)} KB\n`)

// Check TypeScript exports
console.log('📝 Checking module exports:')
const indexFile = path.join(authDir, 'index.ts')
if (fs.existsSync(indexFile)) {
  const content = fs.readFileSync(indexFile, 'utf8')
  const exports = content.match(/export \* from ['"]\.\/(.+)['"]/g) || []
  console.log(`  ✅ Found ${exports.length} export statements`)
  exports.forEach(exp => console.log(`     - ${exp}`))
} else {
  console.log('  ❌ Index file not found')
  allPresent = false
}

// Check API route structure
console.log('\n🌐 Checking API routes:')
const apiRoutes = [
  'login/route.ts',
  'logout/route.ts',
  'register/route.ts',
  'refresh/route.ts',
  'me/route.ts',
]

apiRoutes.forEach(route => {
  const routePath = path.join(apiAuthDir, route)
  if (fs.existsSync(routePath)) {
    console.log(`  ✅ POST /api/auth/${route.replace('/route.ts', '')}`)
  } else {
    console.log(`  ❌ Missing: ${route}`)
    allPresent = false
  }
})

// Check dependencies
console.log('\n📦 Checking dependencies:')
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'))
const requiredDeps = ['jose']
const devDeps = []

requiredDeps.forEach(dep => {
  if (packageJson.dependencies && packageJson.dependencies[dep]) {
    console.log(`  ✅ ${dep}: ${packageJson.dependencies[dep]}`)
  } else if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
    console.log(`  ✅ ${dep}: ${packageJson.devDependencies[dep]} (dev)`)
  } else {
    console.log(`  ❌ ${dep}: NOT FOUND`)
    allPresent = false
  }
})

// Summary
console.log('\n' + '='.repeat(50))
if (allPresent) {
  console.log('✅ All checks passed! Authentication module is ready.')
  console.log('\nNext steps:')
  console.log('1. Set JWT_SECRET in .env file')
  console.log('2. Run database migrations')
  console.log('3. Test the API endpoints')
  console.log('4. Read the documentation at src/lib/auth/README.md')
} else {
  console.log('❌ Some checks failed. Please review the output above.')
  console.log('\nMissing files or dependencies need to be resolved.')
}
console.log('='.repeat(50) + '\n')

process.exit(allPresent ? 0 : 1)
