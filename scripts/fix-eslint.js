#!/usr/bin/env node

/**
 * ESLint Fixer - Batch fix common ESLint issues
 */

const fs = require('fs')
const path = require('path')

// Patterns to fix
const patterns = [
  // Remove unused variables
  {
    name: 'unused-assigned-vars',
    test: line => /^(const|let|var)\s+\w+\s*=/.test(line),
    // This needs context, skip for now
  },
  // Replace unused catch err with _err
  {
    name: 'unused-catch-err',
    test: line => /catch\s*\(\s*err\s*\)/.test(line) || /catch\s*\(\s*error\s*\)/.test(line),
    replace: line => {
      if (line.includes('(err)')) return line.replace('(err)', '(_err)')
      if (line.includes('(err ')) return line.replace('(err ', '(_err ')
      if (line.includes('(error)')) return line.replace('(error)', '(_error)')
      if (line.includes('(error ')) return line.replace('(error ', '(_error ')
      return line
    },
  },
]

console.log('ESLint 自动修复脚本')
console.log('='.repeat(60))

// Function to process a file
function processFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  文件不存在: ${filePath}`)
      return false
    }

    let content = fs.readFileSync(filePath, 'utf8')
    const lines = content.split('\n')
    let modified = false

    // Apply patterns line by line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const originalLine = line

      // Check for unused catch err
      if (/catch\s*\(\s*err\s*\)/.test(line) || /catch\s*\(\s*error\s*\)/.test(line)) {
        // Only replace if the err variable is not used in the catch block
        let j = i + 1
        let hasErrUsage = false
        let indent = 0
        let braceCount = 0
        let startedBlock = false

        while (j < lines.length) {
          const nextLine = lines[j]

          // Check for opening brace
          if (nextLine.includes('{')) {
            startedBlock = true
            braceCount += (nextLine.match(/{/g) || []).length
          }
          if (nextLine.includes('}')) {
            braceCount -= (nextLine.match(/}/g) || []).length
            if (startedBlock && braceCount <= 0) {
              break
            }
          }

          // Check if err is used (excluding console.log and comments)
          if (!nextLine.trim().startsWith('//') && !nextLine.trim().startsWith('*')) {
            // Check for err. usage or err as parameter
            if (
              (/\berr\b/.test(nextLine) || /\berror\b/.test(nextLine)) &&
              !/\bconsole\.log\(err\b/.test(nextLine) &&
              !/\bconsole\.log\(error\b/.test(nextLine) &&
              !/throw err/.test(nextLine) &&
              !/throw error/.test(nextLine)
            ) {
              hasErrUsage = true
            }
          }

          j++

          // Limit check scope
          if (j > i + 20) break
        }

        if (!hasErrUsage) {
          if (line.includes('(err)')) {
            lines[i] = line.replace('(err)', '(_err)')
            modified = true
            console.log(`✏️  修复 ${filePath}:${i + 1} - catch (err) -> catch (_err)`)
          } else if (line.includes('(error)')) {
            lines[i] = line.replace('(error)', '(_error)')
            modified = true
            console.log(`✏️  修复 ${filePath}:${i + 1} - catch (error) -> catch (_error)`)
          }
        }
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, lines.join('\n'), 'utf8')
      console.log(`✅ 已修改: ${filePath}`)
      return true
    }

    return false
  } catch (error) {
    console.error(`❌ 处理 ${filePath} 时出错:`, error.message)
    return false
  }
}

// Main function
function main() {
  const eslintOutput = fs.readFileSync('eslint_output.txt', 'utf8')
  const files = new Set()

  // Extract unique file paths from eslint output
  eslintOutput.split('\n').forEach(line => {
    const match = line.match(/^([^:]+):/)
    if (match) {
      files.add(match[1])
    }
  })

  console.log(`找到 ${files.size} 个需要检查的文件`)
  console.log('')

  let fixed = 0
  files.forEach(file => {
    if (processFile(file)) {
      fixed++
    }
  })

  console.log('')
  console.log('='.repeat(60))
  console.log(`完成! 修复了 ${fixed} 个文件`)
}

// Run
if (require.main === module) {
  main()
}

module.exports = { processFile }
