#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const PROJECT_DIR = '/root/.openclaw/workspace/7zi-project'

// Get all unused variable warnings
function getUnusedVarWarnings() {
  try {
    const output = execSync('npx eslint . --format=unix', {
      cwd: PROJECT_DIR,
      encoding: 'utf8',
      timeout: 120000,
    })

    const lines = output.split('\n').filter(line => line.includes('no-unused-vars'))
    const warnings = []

    for (const line of lines) {
      // Parse: /path/to/file.ts:line:column: error message
      const match = line.match(/^(.+?):(\d+):(\d+):\s+(.+)$/)
      if (match) {
        const [_, filePath, lineNum, colNum, message] = match
        // Extract variable name from message
        const varMatch = message.match(
          /'([^']+)'\s+is\s+(defined\s+but\s+never\s+used|assigned\s+a\s+value\s+but\s+never\s+used)/
        )
        if (varMatch) {
          warnings.push({
            filePath: path.resolve(PROJECT_DIR, filePath),
            lineNum: parseInt(lineNum),
            colNum: parseInt(colNum),
            message,
            varName: varMatch[1],
          })
        }
      }
    }

    return warnings
  } catch (error) {
    console.error('Error getting lint warnings:', error.message)
    return []
  }
}

// Group warnings by file
function groupByFile(warnings) {
  const grouped = {}
  for (const warning of warnings) {
    if (!grouped[warning.filePath]) {
      grouped[warning.filePath] = []
    }
    grouped[warning.filePath].push(warning)
  }
  return grouped
}

// Fix a file by removing unused imports or variables
function fixFile(filePath, warnings) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let modified = false
    const lines = content.split('\n')
    const sortedWarnings = [...warnings].sort((a, b) => b.lineNum - a.lineNum)

    for (const warning of sortedWarnings) {
      const lineIdx = warning.lineNum - 1
      if (lineIdx < 0 || lineIdx >= lines.length) continue

      const line = lines[lineIdx]

      // Check if it's an import statement
      const importMatch = line.match(/^(import\s+.*\b)\b(\w+)\b(.*)$/)
      if (importMatch) {
        const [fullMatch, importPrefix, varName, importSuffix] = importMatch
        if (varName === warning.varName) {
          // Check if it's the only import or one of many
          if (importMatch[2] === warning.varName) {
            // It's an import
            const bracesMatch = importPrefix.match(/import\s+\{([^}]*)\}\s+from/)
            if (bracesMatch) {
              // Named imports
              const imports = bracesMatch[1].split(',').map(s => s.trim())
              const newImports = imports.filter(imp => imp !== varName)

              if (newImports.length === 0) {
                // No imports left, remove the entire line
                lines.splice(lineIdx, 1)
                // Check if next line is empty and remove it too
                if (lineIdx < lines.length && lines[lineIdx].trim() === '') {
                  lines.splice(lineIdx, 1)
                }
              } else {
                // Update the import statement
                const newImportLine = line.replace(
                  bracesMatch[0],
                  `import { ${newImports.join(', ')} } from`
                )
                lines[lineIdx] = newImportLine
              }
              modified = true
              console.log(
                `  Fixed: Removed unused import '${varName}' from ${path.relative(PROJECT_DIR, filePath)}`
              )
            }
          }
        }
      } else {
        // Not an import - check if it's a variable declaration
        const varDeclMatch = line.match(/^\s*(?:const|let|var)\s+(\w+)\s*[:=]/)
        if (varDeclMatch && varDeclMatch[1] === warning.varName) {
          // Rename with underscore prefix
          lines[lineIdx] = line.replace(
            new RegExp(`\\b${varDeclMatch[1]}\\b`),
            `_${varDeclMatch[1]}`
          )
          modified = true
          console.log(
            `  Fixed: Renamed unused variable '${varDeclMatch[1]}' to '_${varDeclMatch[1]}' in ${path.relative(PROJECT_DIR, filePath)}`
          )
        }
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, lines.join('\n'), 'utf8')
    }

    return modified
  } catch (error) {
    console.error(`Error fixing file ${filePath}:`, error.message)
    return false
  }
}

async function main() {
  console.log('Getting unused variable warnings...')
  const warnings = getUnusedVarWarnings()
  console.log(`Found ${warnings.length} unused variable warnings\n`)

  const grouped = groupByFile(warnings)
  console.log(`Issues in ${Object.keys(grouped).length} files\n`)

  let totalFixed = 0
  for (const [filePath, fileWarnings] of Object.entries(grouped)) {
    console.log(
      `\nProcessing ${path.relative(PROJECT_DIR, filePath)} (${fileWarnings.length} issues)`
    )
    const fixed = fixFile(filePath, fileWarnings)
    if (fixed) {
      totalFixed += fileWarnings.length
    }
  }

  console.log(`\n\nTotal warnings fixed: ${totalFixed}`)
}

main().catch(console.error)
