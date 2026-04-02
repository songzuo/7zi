#!/usr/bin/env node

/**
 * 批量修复 ESLint 错误的脚本
 */

const fs = require('fs')
const path = require('path')

console.log('🔧 批量修复 ESLint 错误...\n')

// 修复模式列表
const fixPatterns = [
  {
    name: 'unused-catch-err',
    description: '修复未使用的 catch (err) -> catch (_err)',
    pattern: /catch\s*\(\s*(err|error)\s*\)/g,
    replacement: 'catch (_$1)',
  },
]

// 需要修复的文件清单（从 eslint_output.txt 提取的关键文件）
const filesToFix = [
  'src/app/[locale]/agent-dashboard/page.tsx',
  'src/app/[locale]/dashboard/page.tsx',
  'src/app/[locale]/performance/page.tsx',
  'src/app/[locale]/portfolio/components/CategoryFilterWrapper.tsx',
  'src/app/[locale]/portfolio/components/PortfolioGrid.tsx',
  'src/app/[locale]/react-compiler-verify/page.tsx',
  'src/app/[locale]/scheduler/SchedulerClient.tsx',
  'src/app/[locale]/settings/page.tsx',
  'src/app/[locale]/tasks/page.tsx',
  'src/app/api/a2a/jsonrpc/route.ts',
  'src/app/api/auth/login/route-unified.ts',
  'src/app/api/auth/login/route.ts',
  'src/app/api/auth/logout/route.ts',
  'src/app/api/auth/me/route.ts',
  'src/app/api/auth/refresh/route.ts',
  'src/app/api/auth/register/route.ts',
  'src/app/api/csrf-token/route.ts',
  'src/app/api/data/export/route.ts',
  'src/app/api/data/import/route.ts',
  'src/app/api/database/health/route.ts',
  'src/app/api/database/optimize/route.ts',
  'src/app/api/feedback/route.ts',
  'src/app/api/health/route.ts',
  'src/app/api/multimodal/audio/route.ts',
  'src/lib/hooks/useWebVitals.ts',
  'src/lib/prefetch/hooks/use-prefetch.ts',
]

let totalFixed = 0
let totalFiles = 0

filesToFix.forEach(file => {
  const filePath = path.join(process.cwd(), file)

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  跳过: ${file} (不存在)`)
    return
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let originalContent = content
    let fileFixed = 0

    // 应用所有修复模式
    fixPatterns.forEach(({ name, pattern, replacement }) => {
      const matches = content.match(pattern)
      if (matches) {
        content = content.replace(pattern, replacement)
        fileFixed += matches.length
      }
    })

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8')
      totalFiles++
      totalFixed += fileFixed
      console.log(`✅ ${file} (修复 ${fileFixed} 处)`)
    }
  } catch (error) {
    console.error(`❌ ${file}: ${error.message}`)
  }
})

console.log(`\n${'='.repeat(60)}`)
console.log(`完成! 修复了 ${totalFiles} 个文件，共 ${totalFixed} 处错误`)
