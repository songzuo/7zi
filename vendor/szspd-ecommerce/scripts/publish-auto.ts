#!/usr/bin/env pnpm tsx
/**
 * 7zi Auto-Publisher - 完全自动化版本
 * 检测 main 分支 push → 自动 bump 版本 → 发布 → 自动 push
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'

const PROJECT_DIR = '/root/7zi-project/7zi-frontend'
const API_BASE = 'https://7zi.me/api'
const API_TOKEN = process.env.ZI_TOKEN || ''

interface PackageJson {
  version: string
  name: string
}

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`)
}

function run(cmd: string): string {
  log(`执行: ${cmd}`)
  return execSync(cmd, { cwd: PROJECT_DIR, encoding: 'utf-8' }).trim()
}

function getCurrentVersion(): string {
  const pkg = JSON.parse(readFileSync(join(PROJECT_DIR, 'package.json'), 'utf-8')) as PackageJson
  return pkg.version
}

function setVersion(version: string) {
  const pkgPath = join(PROJECT_DIR, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as PackageJson
  pkg.version = version
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  log(`版本已更新: ${version}`)
}

function getLastTag(): string | null {
  try {
    const tag = run('git describe --tags --abbrev=0')
    return tag.replace(/^v/, '') || null
  } catch {
    return null
  }
}

function getCommitMessage(): string {
  return run('git log -1 --format="%s"')
}

function getCommitsSinceLastTag(): string {
  try {
    return run('git log --since="$(git describe --tags --abbrev=0)^" --oneline')
  } catch {
    return run('git log --oneline -10')
  }
}

function bumpVersion(current: string, type: 'major' | 'minor' | 'patch'): string {
  const [major, minor, patch] = current.split('.').map(Number)
  switch (type) {
    case 'major': return `${major + 1}.0.0`
    case 'minor': return `${major}.${minor + 1}.0`
    case 'patch': return `${major}.${minor}.${patch + 1}`
  }
}

function determineVersionType(commits: string): 'major' | 'minor' | 'patch' {
  const lower = commits.toLowerCase()
  if (lower.includes('breaking') || lower.includes('breaking change')) return 'major'
  if (lower.includes('feat') || lower.includes('feature')) return 'minor'
  return 'patch'
}

async function publishTo7zi(version: string): Promise<boolean> {
  log(`🚀 开始发布 v${version}`)
  
  // 构建
  run('pnpm build')
  
  // 打包
  const tarballPath = join(PROJECT_DIR, `7zi-frontend-${version}.tgz`)
  run(`tar -czf ${tarballPath} -C ${PROJECT_DIR} .next`)
  
  // Hash
  const tarballContent = readFileSync(tarballPath)
  const hash = createHash('sha256').update(tarballContent).digest('hex')
  
  // 上传
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
      log(`✅ 7zi 发布成功: v${version}`)
      return true
    } else {
      log(`❌ 7zi 发布失败: ${res.status}`)
      return false
    }
  } catch (e) {
    log(`❌ 7zi 发布异常: ${e}`)
    return false
  }
}

function gitCommitAndPush(version: string) {
  const tag = `v${version}`
  
  // 添加更改
  run('git add package.json')
  
  // Commit
  run(`git commit -m "release: v${version}"`)
  
  // Tag
  run(`git tag -a ${tag} -m "Release v${version}"`)
  
  // Push
  run('git push origin main')
  run('git push --tags')
  
  log(`✅ Git push 完成: ${tag}`)
}

async function main() {
  log('🔍 检查发布条件...')
  
  // 检查是否有未提交的更改
  const status = run('git status --porcelain')
  if (status) {
    log(`⚠️  有未提交更改，跳过:\n${status}`)
    return { skipped: true, reason: 'uncommitted' }
  }
  
  // 检查是否在 main 分支
  const branch = run('git rev-parse --abbrev-ref HEAD')
  if (branch !== 'main') {
    log(`⚠️  不在 main 分支 (当前: ${branch})，跳过`)
    return { skipped: true, reason: 'not-main' }
  }
  
  // 获取当前版本和 commits
  const currentVersion = getCurrentVersion()
  const lastTag = getLastTag()
  const commits = getCommitsSinceLastTag()
  const lastCommitMsg = getCommitMessage()
  
  log(`版本: ${currentVersion}, 上次标签: ${lastTag || '无'}`)
  log(`最新 commit: ${lastCommitMsg}`)
  
  // 如果版本号已经手动改了，直接发布
  if (lastTag && currentVersion !== lastTag) {
    log(`检测到手动版本更新: ${lastTag} → ${currentVersion}`)
  } else {
    // 自动 bump 版本
    const type = determineVersionType(commits)
    const newVersion = bumpVersion(currentVersion, type)
    setVersion(newVersion)
    log(`自动版本升级 (${type}): ${currentVersion} → ${newVersion}`)
  }
  
  const newVersion = getCurrentVersion()
  
  // 运行测试
  log('🧪 运行测试...')
  try {
    run('pnpm test:run')
    log('✅ 测试通过')
  } catch {
    log('❌ 测试失败，撤销版本更改')
    run('git checkout package.json')
    return { skipped: true, reason: 'test-failed' }
  }
  
  // 发布到 7zi
  const published = await publishTo7zi(newVersion)
  if (!published) {
    run('git checkout package.json')
    return { skipped: true, reason: 'publish-failed' }
  }
  
  // Git push
  gitCommitAndPush(newVersion)
  
  return { success: true, version: newVersion }
}

main().then(console.log).catch(console.error)
