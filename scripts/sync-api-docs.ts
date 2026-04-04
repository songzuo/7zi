#!/usr/bin/env ts-node
/**
 * API 路由文档同步脚本
 * 扫描 src/app/api/ 目录下的所有路由文件,生成详细的 API 端点列表
 */

import * as fs from 'fs'
import * as path from 'path'

interface APIEndpoint {
  path: string
  methods: string[]
  hasOpenAPI: boolean
  hasJSDoc: boolean
  lineCount: number
  file: string
}

const API_DIR = './src/app/api'
const output: APIEndpoint[] = []

function scanDirectory(dir: string, basePath: string = '/api') {
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      // 跳过测试目录
      if (entry.name === '__tests__' || entry.name.startsWith('.')) {
        continue
      }
      scanDirectory(fullPath, `${basePath}/${entry.name}`)
    } else if (entry.name === 'route.ts' || entry.name === 'route.tsx') {
      const content = fs.readFileSync(fullPath, 'utf-8')
      const lines = content.split('\n').length

      // 检测 HTTP 方法
      const methods: string[] = []
      if (content.includes('export async function GET')) methods.push('GET')
      if (content.includes('export async function POST')) methods.push('POST')
      if (content.includes('export async function PUT')) methods.push('PUT')
      if (content.includes('export async function PATCH')) methods.push('PATCH')
      if (content.includes('export async function DELETE')) methods.push('DELETE')
      if (content.includes('export async function HEAD')) methods.push('HEAD')
      if (content.includes('export async function OPTIONS')) methods.push('OPTIONS')

      // 检测 OpenAPI 注释
      const hasOpenAPI = content.includes('@openapi') || content.includes('@swagger')

      // 检测 JSDoc 注释
      const hasJSDoc = content.includes('/**') && content.includes('* @')

      output.push({
        path: basePath,
        methods,
        hasOpenAPI,
        hasJSDoc,
        lineCount: lines,
        file: fullPath,
      })
    }
  }
}

// 扫描 API 目录
console.log('扫描 API 路由...')
scanDirectory(API_DIR)

// 按路径排序
output.sort((a, b) => a.path.localeCompare(b.path))

// 生成报告
const report = `# API 路由文档同步报告

**生成时间**: ${new Date().toISOString()}
**扫描目录**: ${API_DIR}
**路由总数**: ${output.length}

## 📊 统计信息

| 指标 | 数量 |
|------|------|
| **总路由数** | ${output.length} |
| **有 OpenAPI 注释** | ${output.filter(e => e.hasOpenAPI).length} |
| **有 JSDoc 注释** | ${output.filter(e => e.hasJSDoc).length} |
| **无任何文档** | ${output.filter(e => !e.hasOpenAPI && !e.hasJSDoc).length} |

### HTTP 方法统计

| 方法 | 数量 |
|------|------|
| GET | ${output.filter(e => e.methods.includes('GET')).length} |
| POST | ${output.filter(e => e.methods.includes('POST')).length} |
| PUT | ${output.filter(e => e.methods.includes('PUT')).length} |
| PATCH | ${output.filter(e => e.methods.includes('PATCH')).length} |
| DELETE | ${output.filter(e => e.methods.includes('DELETE')).length} |
| HEAD | ${output.filter(e => e.methods.includes('HEAD')).length} |
| OPTIONS | ${output.filter(e => e.methods.includes('OPTIONS')).length} |

## 📋 完整 API 端点列表

${output
  .map(
    e => `### ${e.path}

- **方法**: ${e.methods.join(', ') || '未知'}
- **文件**: \`${e.file}\`
- **代码行数**: ${e.lineCount}
- **OpenAPI**: ${e.hasOpenAPI ? '✅' : '❌'}
- **JSDoc**: ${e.hasJSDoc ? '✅' : '❌'}
`
  )
  .join('\n')}

## 🔍 需要改进的路由

### 缺少文档注释的路由 (${output.filter(e => !e.hasOpenAPI && !e.hasJSDoc).length}个)

${output
  .filter(e => !e.hasOpenAPI && !e.hasJSDoc)
  .map(e => `- ${e.path} (${e.methods.join(', ')})`)
  .join('\n')}

### 缺少 OpenAPI 注释的路由 (${output.filter(e => !e.hasOpenAPI).length}个)

${output
  .filter(e => !e.hasOpenAPI)
  .map(e => `- ${e.path} (${e.methods.join(', ')})`)
  .join('\n')}

## 📂 按模块分类

${(() => {
  const modules: Record<string, APIEndpoint[]> = {}
  output.forEach(e => {
    const parts = e.path.split('/')
    const module = parts[2] || 'root'
    if (!modules[module]) modules[module] = []
    modules[module].push(e)
  })

  return Object.entries(modules)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(
      ([module, endpoints]) => `### /${module} (${endpoints.length} 个端点)

${endpoints.map(e => `- ${e.methods.join(', ')} ${e.path}`).join('\n')}`
    )
    .join('\n\n')
})()}

---

**建议**:
1. 为所有缺少文档的路由添加 JSDoc 注释
2. 为核心 API 添加完整的 OpenAPI 规范
3. 统一使用 TypeScript 类型定义
4. 定期运行此脚本检查文档完整性
`

// 输出报告
console.log(report)
console.log('\n报告已生成!')

// 同时输出 JSON 格式
const jsonOutput = {
  generated: new Date().toISOString(),
  totalEndpoints: output.length,
  stats: {
    withOpenAPI: output.filter(e => e.hasOpenAPI).length,
    withJSDoc: output.filter(e => e.hasJSDoc).length,
    withoutDocs: output.filter(e => !e.hasOpenAPI && !e.hasJSDoc).length,
  },
  methods: {
    GET: output.filter(e => e.methods.includes('GET')).length,
    POST: output.filter(e => e.methods.includes('POST')).length,
    PUT: output.filter(e => e.methods.includes('PUT')).length,
    PATCH: output.filter(e => e.methods.includes('PATCH')).length,
    DELETE: output.filter(e => e.methods.includes('DELETE')).length,
    HEAD: output.filter(e => e.methods.includes('HEAD')).length,
    OPTIONS: output.filter(e => e.methods.includes('OPTIONS')).length,
  },
  endpoints: output,
}

console.log('\nJSON 格式:')
console.log(JSON.stringify(jsonOutput, null, 2))
