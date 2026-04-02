#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const PROJECT_DIR = '/root/.openclaw/workspace/7zi-project'

// Files with specific known issues to fix
const SPECIFIC_FIXES = [
  {
    file: 'src/lib/data-import-export.ts',
    fixes: [{ removeImport: 'exportData' }, { removeImport: 'importData' }],
  },
]

function fixFile(filePath, fixes) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let modified = false

    for (const fix of fixes) {
      if (fix.removeImport) {
        const importName = fix.removeImport

        // Find and remove the import
        const importRegex = new RegExp(`import\\s+\\{([^}]*)\\}\\s*from\\s+['"].*['"];?`, 'g')
        let match

        while ((match = importRegex.exec(content)) !== null) {
          const imports = match[1].split(',').map(s => s.trim())
          const index = imports.indexOf(importName)

          if (index !== -1) {
            // Check if it's actually used in the file (excluding the import itself)
            const beforeImport = content.substring(0, match.index)
            const afterImport = content.substring(match.index + match[0].length)
            const usageRegex = new RegExp(`\\b${importName}\\b`, 'g')

            const beforeUsages = (beforeImport.match(usageRegex) || []).length
            const afterUsages = (afterImport.match(usageRegex) || []).length

            // If not used in the content after the import, remove it
            if (afterUsages === 0) {
              imports.splice(index, 1)

              if (imports.length === 0) {
                // No imports left, remove the entire import line
                const lines = content.split('\n')
                for (let i = 0; i < lines.length; i++) {
                  if (lines[i].includes(match[0].trim())) {
                    lines.splice(i, 1)
                    content = lines.join('\n')
                    break
                  }
                }
              } else {
                // Update the import statement
                const newImports = imports.join(', ')
                content = content.replace(match[0], match[0].replace(match[1], newImports))
              }

              modified = true
              console.log(
                `  Removed unused import '${importName}' from ${path.relative(PROJECT_DIR, filePath)}`
              )
              break
            }
          }
        }
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8')
    }

    return modified
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message)
    return false
  }
}

function main() {
  console.log('Applying specific fixes...\n')

  let fixedCount = 0
  for (const fix of SPECIFIC_FIXES) {
    const filePath = path.join(PROJECT_DIR, fix.file)
    if (fs.existsSync(filePath)) {
      console.log(`Processing ${fix.file}`)
      if (fixFile(filePath, fix.fixes)) {
        fixedCount++
      }
    } else {
      console.log(`  File not found: ${fix.file}`)
    }
  }

  console.log(`\n\nFixed ${fixedCount} files`)
}

main()
