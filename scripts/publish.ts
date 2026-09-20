#!/usr/bin/env pnpm tsx
/**
 * 7zi Auto-Publisher
 * 自动检测版本变化 → 构建 → 发布到 7zi → 打标签
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, basename } from 'path'
import { createHash } from 'crypto'

const PROJECT_DIR = '/root/7zi-project/7zi-frontend'
const API_BASE = 'https://7zi.me/api'

// 7zi API token (从环境变量或配置文件读取)
const API_TOKEN = process.env.ZI_TOKEN || ''

interface PackageJson {
  version: string
  name: string
  scripts?: Record<string, string>
}

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`)
}

function run(cmd: string, cwd: string = PROJECT_DIR): string {
  log(`执行: ${cmd}`)
  return execSync(cmd, { cwd, encoding: 'utf-8' }).trim()
}

function getCurrentVersion(): string {
  const pkg = JSON.parse(readFileSync(join(PROJECT_DIR, 'package.json'), 'utf-8')) as PackageJson
  return pkg.version
}

function getLastTag(): string | null {
  try {
    return run('git describe --tags --abbrev=0').replace(/^v/, '') || null
  } catch {
    return null
  }
}

function getCurrentCommit(): string {
  return run('git rev-parse HEAD').substring(0, 7)
}

async function getRemoteVersion(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/packages/7zi-frontend/latest`)
    if (res.ok) {
      const data = await res.json()
      return data.version
    }
  } catch {}
  return null
}

async function publishTo7zi(version: string): Promise<boolean> {
  log(`开始发布 v${version} 到 7zi...`)
  
  // 构建项目
  run('pnpm build')
  
  // 创建发布包
  const distDir = join(PROJECT_DIR, '.next')
  const tarballPath = join(PROJECT_DIR, `7zi-frontend-${version}.tgz`)
  
  // 打包 .next 目录
  run(`tar -czf ${tarballPath} -C ${PROJECT_DIR} .next`)
  
  // 计算 hash
  const tarballContent = readFileSync(tarballPath)
  const hash = createHash('sha256').update(tarballContent).digest('hex')
  
  // 上传到 7zi
  const formData = new FormData()
  formData.append('version', version)
  formData.append('platform', 'web')
  formData.append('sha256', hash)
  formData.append('bundle', new Blob([tarballContent]), `7zi-frontend-${version}.tgz`)
  
  try {
    const res = await fetch(`${API_BASE}/packages/7zi-frontend/publish`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_TOKEN}` },
      body: formData
    })
    
    if (res.ok) {
      log(`✅ 发布成功: v${version}`)
      return true
    } else {
      const err = await res.text()
      log(`❌ 发布失败: ${res.status} - ${err}`)
      return false
    }
  } catch (e) {
    log(`❌ 发布失败: ${e}`)
    return false
  }
}

function createGitTag(version: string): boolean {
  try {
    const tag = `v${version}`
    run(`git tag -a ${tag} -m "Release v${version}"`)
    run('git push --tags')
    log(`✅ 标签创建成功: ${tag}`)
    return true
  } catch (e) {
    log(`❌ 标签创建失败: ${e}`)
    return false
  }
}

async function main() {
  log('🚀 7zi Auto-Publisher 启动')
  
  // 检查 git 状态
  const status = run('git status --porcelain')
  if (status) {
    log(`⚠️  有未提交的更改，跳过发布:\n${status}`)
    return
  }
  
  const currentVersion = getCurrentVersion()
  const lastTag = getLastTag()
  const currentCommit = getCurrentCommit()
  
  log(`当前版本: ${currentVersion}, 上次标签: ${lastTag || '无'}, Commit: ${currentCommit}`)
  
  // 检查版本是否变化
  if (currentVersion === lastTag) {
    log('版本无变化，跳过发布')
    return
  }
  
  log(`检测到新版本: ${lastTag || '无'} → ${currentVersion}`)
  
  // 运行测试
  log('运行测试...')
  try {
    run('pnpm test:run')
    log('✅ 测试通过')
  } catch {
    log('❌ 测试失败，跳过发布')
    return
  }
  
  // 发布
  const published = await publishTo7zi(currentVersion)
  if (!published) return
  
  // 打标签
  createGitTag(currentVersion)
  
  log(`🎉 发布完成!`)
}

// 允许手动触发
main().catch(console.error)
