#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const PROJECT_DIR = '/root/.openclaw/workspace/7zi-project'

// Common unused imports in test files
const UNUSED_IMPORT_PATTERNS = [
  { regex: /import\s*\{\s*render\s*\}\s*from\s*['"]@testing-library\/react['"]/, name: 'render' },
  { regex: /import\s*\{\s*screen\s*\}\s*from\s*['"]@testing-library\/react['"]/, name: 'screen' },
  { regex: /import\s*\{\s*waitFor\s*\}\s*from\s*['"]@testing-library\/react['"]/, name: 'waitFor' },
  {
    regex: /import\s*\{\s*fireEvent\s*\}\s*from\s*['"]@testing-library\/react['"]/,
    name: 'fireEvent',
  },
  {
    regex: /import\s*\{\s*userEvent\s*\}\s*from\s*['"]@testing-library\/user-event['"]/,
    name: 'userEvent',
  },
  { regex: /import\s*\{\s*vi\s*\}\s*from\s*['"]vitest['"]/, name: 'vi' },
  { regex: /import\s*\{\s*afterEach\s*\}\s*from\s*['"]vitest['"]/, name: 'afterEach' },
  { regex: /import\s*\{\s*beforeEach\s*\}\s*from\s*['"]vitest['"]/, name: 'beforeEach' },
  { regex: /import\s*\{\s*logger\s*\}\s*from\s*['"]@\/lib\/logger['"]/, name: 'logger' },
  { regex: /import\s*\{\s*NextResponse\s*\}\s*from\s*['"]next\/server['"]/, name: 'NextResponse' },
]

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let modified = false

    for (const pattern of UNUSED_IMPORT_PATTERNS) {
      // Find the import
      const importRegex = new RegExp(pattern.regex.source + ';?\\s*\\n', 'g')
      const match = importRegex.exec(content)

      if (match) {
        // Check if the imported name is actually used
        const afterImport = content.substring(match.index + match[0].length)
        const usageRegex = new RegExp(`\\b${pattern.name}\\b`, 'g')
        const usages = afterImport.match(usageRegex) || []

        if (usages.length === 0) {
          // Remove the import
          content = content.substring(0, match.index) + afterImport
          modified = true
          console.log(
            `    - Removed unused '${pattern.name}' from ${path.relative(PROJECT_DIR, filePath)}`
          )
        }
      }
    }

    // Handle cleanup of empty import lines
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n')

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8')
    }

    return modified
  } catch (error) {
    console.error(`    Error processing ${path.relative(PROJECT_DIR, filePath)}:`, error.message)
    return false
  }
}

function findFiles(dir, extensions = ['.ts', '.tsx']) {
  const files = []
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        files.push(...findFiles(path.join(dir, entry.name), extensions))
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(path.join(dir, entry.name))
      }
    }
  } catch (error) {
    // Ignore directories that don't exist
  }

  return files
}

function main() {
  console.log('🔧 Fixing unused imports in src/lib and src/components...\n')

  const libFiles = findFiles(path.join(PROJECT_DIR, 'src/lib'))
  const componentFiles = findFiles(path.join(PROJECT_DIR, 'src/components'))

  const allFiles = [...libFiles, ...componentFiles]
  console.log(`Found ${allFiles.length} files\n`)

  let fixedCount = 0
  for (const file of allFiles) {
    if (fixFile(file)) {
      fixedCount++
    }
  }

  console.log(`\n✅ Fixed ${fixedCount} files`)
}

main()
