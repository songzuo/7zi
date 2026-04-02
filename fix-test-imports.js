#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const PROJECT_DIR = '/root/.openclaw/workspace/7zi-project'

function getLintWarningsForFile(filePath) {
  try {
    const relPath = path.relative(PROJECT_DIR, filePath)
    const output = execSync(`npx eslint "${relPath}"`, {
      cwd: PROJECT_DIR,
      encoding: 'utf8',
      timeout: 30000,
    })

    const lines = output.split('\n')
    const warnings = []

    for (const line of lines) {
      if (!line.includes('no-unused-vars')) continue

      const match = line.match(
        /(\d+):(\d+)\s+\w+\s+['"]([^'"]+)['"]\s+is\s+defined\s+but\s+never\s+used/
      )
      if (match) {
        warnings.push({
          lineNum: parseInt(match[1]),
          colNum: parseInt(match[2]),
          varName: match[3],
        })
      }
    }

    return warnings
  } catch (error) {
    return []
  }
}

function fixTestFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let modified = false

    // Fix common unused test imports
    const unusedPatterns = [
      {
        pattern: /import\s*\{\s*render\s*\}\s*from\s*['"]@testing-library\/react['"];?\s*\n/g,
        replacement: '',
      },
      {
        pattern: /import\s*\{\s*screen\s*\}\s*from\s*['"]@testing-library\/react['"];?\s*\n/g,
        replacement: '',
      },
      {
        pattern: /import\s*\{\s*waitFor\s*\}\s*from\s*['"]@testing-library\/react['"];?\s*\n/g,
        replacement: '',
      },
      {
        pattern: /import\s*\{\s*fireEvent\s*\}\s*from\s*['"]@testing-library\/react['"];?\s*\n/g,
        replacement: '',
      },
      {
        pattern:
          /import\s*\{\s*userEvent\s*\}\s*from\s*['"]@testing-library\/user-event['"];?\s*\n/g,
        replacement: '',
      },
      { pattern: /import\s*\{\s*vi\s*\}\s*from\s*['"]vitest['"];?\s*\n/g, replacement: '' },
    ]

    for (const { pattern, replacement } of unusedPatterns) {
      const newContent = content.replace(pattern, replacement)
      if (newContent !== content) {
        content = newContent
        modified = true
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8')
    }

    return modified
  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`)
    return false
  }
}

function main() {
  console.log('🔧 Fixing test files...\n')

  const testDirs = [
    path.join(PROJECT_DIR, 'src/test'),
    path.join(PROJECT_DIR, 'src/lib/__tests__'),
    path.join(PROJECT_DIR, 'src/components/__tests__'),
    path.join(PROJECT_DIR, 'src/app/**/__tests__'),
  ]

  const testFiles = []
  for (const dir of testDirs) {
    if (!fs.existsSync(dir)) continue
    const files = execSync(
      `find "${dir}" -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.spec.tsx"`,
      {
        encoding: 'utf8',
        timeout: 30000,
      }
    )
      .split('\n')
      .filter(f => f)
    testFiles.push(...files)
  }

  console.log(`Found ${testFiles.length} test files\n`)

  let fixedCount = 0
  for (const file of testFiles) {
    const relPath = path.relative(PROJECT_DIR, file)
    console.log(`Processing: ${relPath}`)

    if (fixTestFile(file)) {
      console.log(`  ✓ Fixed`)
      fixedCount++
    }
  }

  console.log(`\n✅ Fixed ${fixedCount} test files`)
}

main()
