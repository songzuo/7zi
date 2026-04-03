/**
 * @fileoverview E2E 测试全局设置
 * @description 在所有测试运行前执行的初始化工作
 */

import { FullConfig } from '@playwright/test'
import { chromium, Browser } from 'playwright'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test global setup...')

  // 获取基础 URL
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000'
  console.log(`📍 Base URL: ${baseURL}`)

  // 创建测试数据目录
  const fs = await import('fs')
  const path = await import('path')

  const testResultsDir = path.join(process.cwd(), 'test-results')
  const reportsDir = path.join(testResultsDir, 'reports')

  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true })
  }
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true })
  }

  // 检查服务器是否可用
  console.log('🔍 Checking if server is available...')
  let serverAvailable = false
  let attempts = 0
  const maxAttempts = 30

  while (!serverAvailable && attempts < maxAttempts) {
    try {
      const response = await fetch(baseURL, { method: 'HEAD' })
      if (response.ok) {
        serverAvailable = true
        console.log('✅ Server is available!')
      }
    } catch (e) {
      attempts++
      console.log(`⏳ Waiting for server... (${attempts}/${maxAttempts})`)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  if (!serverAvailable) {
    console.error('❌ Server is not available after 30 seconds')
    throw new Error('Server is not available')
  }

  // 设置测试用户（如果需要）
  console.log('👤 Setting up test users...')
  try {
    const browser = await chromium.launch()
    const context = await browser.newContext()
    const page = await context.newPage()

    // 登录测试用户
    await page.goto(`${baseURL}/login`)
    await page.fill('input[name="email"]', 'test_admin@example.com')
    await page.fill('input[name="password"]', 'test_password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard', { timeout: 10000 })

    // 保存认证状态
    await context.storageState({ path: path.join(testResultsDir, 'admin-auth.json') })

    await browser.close()
    console.log('✅ Test users set up successfully!')
  } catch (e) {
    console.warn('⚠️ Failed to set up test users:', e)
    // 不阻止测试运行
  }

  // 写入环境信息
  const envInfo = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    timestamp: new Date().toISOString(),
    baseURL,
  }

  fs.writeFileSync(
    path.join(testResultsDir, 'environment.json'),
    JSON.stringify(envInfo, null, 2)
  )

  console.log('✅ Global setup completed!')
}

export default globalSetup
