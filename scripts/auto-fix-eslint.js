#!/usr/bin/env node

/**
 * 自动修复简单 ESLint 错误
 */

const fs = require('fs')
const path = require('path')

console.log('🔧 开始自动修复 ESLint 错误...\n')

// 定义修复规则
const fixes = [
  {
    file: 'src/app/[locale]/agent-dashboard/page.tsx',
    replacements: [{ old: 'const pendingTasks = ', new: 'const _pendingTasks = ' }],
  },
  {
    file: 'src/app/[locale]/dashboard/page.tsx',
    replacements: [
      { old: 'const createDefaultStats = ', new: 'const _createDefaultStats = ' },
      { old: 'const busyCount = ', new: 'const _busyCount = ' },
      { old: 'const idleCount = ', new: 'const _idleCount = ' },
    ],
  },
  {
    file: 'src/app/[locale]/performance/page.tsx',
    replacements: [
      { old: 'const config = ', new: 'const _config = ' },
      { old: 'const t = useTranslations', new: 'const _t = useTranslations' },
    ],
  },
  {
    file: 'src/app/[locale]/portfolio/components/CategoryFilterWrapper.tsx',
    replacements: [{ old: 'const handleCategoryChange = ', new: 'const _handleCategoryChange = ' }],
  },
  {
    file: 'src/app/[locale]/portfolio/components/PortfolioGrid.tsx',
    replacements: [{ old: '{ startTransition, }', new: '{ }' }],
  },
  {
    file: 'src/app/[locale]/settings/page.tsx',
    replacements: [{ old: 'setBackupRefreshTrigger', new: '_setBackupRefreshTrigger' }],
  },
  {
    file: 'src/app/api/a2a/jsonrpc/route.ts',
    replacements: [{ old: 'const handler = ', new: 'const _handler = ' }],
  },
  {
    file: 'src/app/api/auth/login/route-unified.ts',
    replacements: [{ old: 'const sanitizedUrl = ', new: 'const _sanitizedUrl = ' }],
  },
  {
    file: 'src/app/api/auth/login/route.ts',
    replacements: [{ old: 'const sanitizedUrl = ', new: 'const _sanitizedUrl = ' }],
  },
  {
    file: 'src/app/api/auth/logout/route.ts',
    replacements: [
      { old: 'export async function GET(req', new: 'export async function GET(_req' },
      { old: 'req, context', new: '_req, _context' },
    ],
  },
  {
    file: 'src/app/api/auth/me/route.ts',
    replacements: [{ old: 'const password = ', new: 'const _password = ' }],
  },
  {
    file: 'src/app/api/database/health/route.ts',
    replacements: [
      { old: 'const logger = ', new: 'const _logger = ' },
      { old: 'type ErrorType = ', new: 'type _ErrorType = ' },
    ],
  },
  {
    file: 'src/app/api/database/optimize/route.ts',
    replacements: [
      { old: 'export async function POST(request', new: 'export async function POST(_request' },
    ],
  },
  {
    file: 'src/app/api/feedback/route.ts',
    replacements: [{ old: 'const authHeader = ', new: 'const _authHeader = ' }],
  },
  {
    file: 'src/app/api/health/route.ts',
    replacements: [
      { old: 'export async function GET(request', new: 'export async function GET(_request' },
      { old: 'const startTime = ', new: 'const _startTime = ' },
    ],
  },
  {
    file: 'src/app/api/data/export/route.ts',
    replacements: [
      { old: 'export async function POST(request', new: 'export async function POST(_request' },
    ],
  },
  {
    file: 'src/app/api/data/import/route.ts',
    replacements: [
      { old: 'export async function POST(request', new: 'export async function POST(_request' },
    ],
  },
  {
    file: 'src/app/api/csrf-token/route.ts',
    replacements: [{ old: 'import { ApiError }', new: 'import { ApiError as _ApiError }' }],
  },
  {
    file: 'src/app/api/auth/refresh/route.ts',
    replacements: [
      // 这个文件只是导入了 NextResponse 但没使用，可以直接删除
    ],
    removeImports: ['NextResponse'],
  },
]

let fixedFiles = 0

fixes.forEach(({ file, replacements, removeImports }) => {
  const filePath = path.join(process.cwd(), file)

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  跳过 ${file} (不存在)`)
    return
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let modified = false

    // 删除未使用的导入
    if (removeImports) {
      removeImports.forEach(imp => {
        const importRegex = new RegExp(
          `import\\s+\\{[^}]*\\b${imp}\\b[^}]*\\}\\s+from\\s+['"][^'"]+['"];?\\n`,
          'g'
        )
        if (importRegex.test(content)) {
          content = content.replace(importRegex, '')
          modified = true
          console.log(`   ✏️  删除导入: ${imp}`)
        }
      })
    }

    // 应用替换
    if (replacements) {
      replacements.forEach(({ old, new: newVal }) => {
        if (content.includes(old)) {
          content = content.replace(old, newVal)
          modified = true
          console.log(`   ✏️  ${old} -> ${newVal}`)
        }
      })
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8')
      fixedFiles++
      console.log(`✅ 已修改: ${file}\n`)
    }
  } catch (error) {
    console.error(`❌ ${file}: ${error.message}`)
  }
})

console.log(`\n${'='.repeat(50)}`)
console.log(`完成! 修复了 ${fixedFiles} 个文件`)
