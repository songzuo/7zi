#!/usr/bin/env node

/**
 * PWA Validation Script
 *
 * Validates PWA implementation according to best practices
 */

const fs = require('fs').promises
const path = require('path')

const PROJECT_DIR = path.resolve(__dirname, '..')
const PUBLIC_DIR = path.join(PROJECT_DIR, 'public')

const VALIDATION_RULES = {
  manifest: {
    required: true,
    path: path.join(PUBLIC_DIR, 'manifest.json'),
    checks: [
      {
        name: 'Manifest exists',
        type: 'file_exists',
      },
      {
        name: 'Valid JSON',
        type: 'valid_json',
      },
      {
        name: 'Has required fields',
        type: 'has_fields',
        fields: [
          'name',
          'short_name',
          'start_url',
          'display',
          'background_color',
          'theme_color',
          'icons',
        ],
      },
      {
        name: 'Has icons',
        type: 'has_icons',
      },
    ],
  },

  serviceWorker: {
    required: true,
    path: path.join(PUBLIC_DIR, 'sw.js'),
    checks: [
      {
        name: 'Service Worker exists',
        type: 'file_exists',
      },
      {
        name: 'Has install event',
        type: 'has_content',
        content: "addEventListener('install'",
      },
      {
        name: 'Has activate event',
        type: 'has_content',
        content: "addEventListener('activate'",
      },
      {
        name: 'Has fetch event',
        type: 'has_content',
        content: "addEventListener('fetch'",
      },
    ],
  },

  icons: {
    required: true,
    path: PUBLIC_DIR,
    checks: [
      {
        name: 'Has favicon',
        type: 'file_exists',
        file: 'favicon.ico',
      },
      {
        name: 'Has apple-touch-icon',
        type: 'file_exists',
        file: 'apple-touch-icon.png',
      },
      {
        name: 'Has icon-192x192',
        type: 'file_exists',
        file: 'icon-192.png',
      },
      {
        name: 'Has icon-512x512',
        type: 'file_exists',
        file: 'icon-512.png',
      },
      {
        name: 'Has maskable icon',
        type: 'file_exists',
        file: 'maskable-icon-512.png',
      },
    ],
  },

  offline: {
    required: true,
    path: path.join(PROJECT_DIR, 'src/app/offline/page.tsx'),
    checks: [
      {
        name: 'Offline page exists',
        type: 'file_exists',
      },
    ],
  },

  components: {
    required: true,
    path: path.join(PROJECT_DIR, 'src/components'),
    checks: [
      {
        name: 'ServiceWorkerRegistration component',
        type: 'file_exists',
        file: 'ServiceWorkerRegistration.tsx',
      },
      {
        name: 'PWAInstallPrompt component',
        type: 'file_exists',
        file: 'PWAInstallPrompt.tsx',
      },
    ],
  },

  metaTags: {
    required: true,
    path: path.join(PROJECT_DIR, 'src/app/layout.tsx'),
    checks: [
      {
        name: 'Has theme-color meta',
        type: 'has_content',
        content: 'theme-color',
      },
      {
        name: 'Has apple-mobile-web-app-capable',
        type: 'has_content',
        content: 'apple-mobile-web-app-capable',
      },
      {
        name: 'Has manifest link',
        type: 'has_content',
        content: 'manifest',
      },
    ],
  },
}

async function checkFileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function checkValidJSON(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    JSON.parse(content)
    return true
  } catch {
    return false
  }
}

async function checkHasFields(filePath, fields) {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const json = JSON.parse(content)

    for (const field of fields) {
      if (!(field in json)) {
        return { success: false, missing: field }
      }
    }

    return { success: true }
  } catch {
    return { success: false }
  }
}

async function checkHasIcons(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const json = JSON.parse(content)

    if (!json.icons || !Array.isArray(json.icons) || json.icons.length === 0) {
      return { success: false, message: 'No icons defined' }
    }

    return { success: true, count: json.icons.length }
  } catch {
    return { success: false }
  }
}

async function checkHasContent(filePath, searchText) {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return content.includes(searchText)
  } catch {
    return false
  }
}

async function validateSection(sectionName, sectionConfig) {
  console.log(`\n📋 Validating ${sectionName}...`)
  const results = []

  for (const check of sectionConfig.checks) {
    let result = { name: check.name, success: false }

    try {
      switch (check.type) {
        case 'file_exists':
          const filePath = check.file
            ? path.join(sectionConfig.path, check.file)
            : sectionConfig.path
          result.success = await checkFileExists(filePath)
          break

        case 'valid_json':
          result.success = await checkValidJSON(sectionConfig.path)
          break

        case 'has_fields':
          const fieldsResult = await checkHasFields(sectionConfig.path, check.fields)
          result = { ...result, ...fieldsResult }
          break

        case 'has_icons':
          const iconsResult = await checkHasIcons(sectionConfig.path)
          result = { ...result, ...iconsResult }
          break

        case 'has_content':
          result.success = await checkHasContent(sectionConfig.path, check.content)
          break

        default:
          console.warn(`Unknown check type: ${check.type}`)
      }
    } catch (error) {
      result.success = false
      result.error = error.message
    }

    results.push(result)
  }

  return results
}

async function generateReport(results) {
  let totalChecks = 0
  let passedChecks = 0

  console.log('\n' + '='.repeat(60))
  console.log('📊 PWA VALIDATION REPORT')
  console.log('='.repeat(60))

  for (const [section, sectionResults] of Object.entries(results)) {
    const sectionPassed = sectionResults.filter(r => r.success).length
    const sectionTotal = sectionResults.length

    console.log(`\n${section.toUpperCase()}`)
    console.log('-'.repeat(60))

    for (const result of sectionResults) {
      totalChecks++
      if (result.success) {
        passedChecks++
        console.log(`✓ ${result.name}`)
      } else {
        console.log(`✗ ${result.name}`)
        if (result.missing) {
          console.log(`  Missing field: ${result.missing}`)
        }
        if (result.message) {
          console.log(`  ${result.message}`)
        }
        if (result.error) {
          console.log(`  Error: ${result.error}`)
        }
      }
    }

    console.log(`\nProgress: ${sectionPassed}/${sectionTotal} checks passed`)
  }

  console.log('\n' + '='.repeat(60))
  console.log(`TOTAL: ${passedChecks}/${totalChecks} checks passed`)
  console.log('='.repeat(60))

  if (passedChecks === totalChecks) {
    console.log('\n🎉 All PWA validation checks passed!')
    return true
  } else {
    console.log('\n⚠️  Some PWA validation checks failed.')
    console.log('Please review the report above and fix the issues.')
    return false
  }
}

async function checkBrowserSupport() {
  console.log('\n🌐 Browser PWA Support Information')
  console.log('-'.repeat(60))

  console.log('\nRequired features:')
  console.log('  • Service Workers: ✓')
  console.log('  • Web App Manifest: ✓')
  console.log('  • HTTPS: Required for production')

  console.log('\nSupported browsers:')
  console.log('  • Chrome/Edge: Full support')
  console.log('  • Firefox: Good support (some features limited)')
  console.log('  • Safari: Limited support (no install prompt)')
  console.log('  • Opera: Full support')

  console.log('\nTesting your PWA:')
  console.log('  1. Run: npm run dev')
  console.log('  2. Open DevTools (F12)')
  console.log('  3. Go to Application tab')
  console.log('  4. Check Service Workers and Manifest sections')
  console.log('  5. Test install prompt in Chrome/Edge')
}

async function main() {
  console.log('🔍 PWA Validation Script\n')
  console.log('Validating PWA implementation for 7zi Studio...\n')

  const results = {}

  for (const [sectionName, sectionConfig] of Object.entries(VALIDATION_RULES)) {
    results[sectionName] = await validateSection(sectionName, sectionConfig)
  }

  const success = await generateReport(results)

  await checkBrowserSupport()

  console.log('\n')

  process.exit(success ? 0 : 1)
}

main().catch(console.error)
