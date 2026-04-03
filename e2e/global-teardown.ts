/**
 * @fileoverview E2E 测试全局清理
 * @description 在所有测试运行后执行的清理工作
 */

import { FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test global teardown...')

  const fs = await import('fs')
  const path = await import('path')

  // 清理临时文件
  const testResultsDir = path.join(process.cwd(), 'test-results')
  const tempFiles = ['admin-auth.json']

  for (const file of tempFiles) {
    const filePath = path.join(testResultsDir, file)
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath)
        console.log(`🗑️ Removed temp file: ${file}`)
      } catch (e) {
        console.warn(`⚠️ Failed to remove temp file: ${file}`, e)
      }
    }
  }

  // 生成测试报告
  console.log('📊 Generating test report...')
  try {
    const { execSync } = await import('child_process')
    execSync('node scripts/generate-test-report.js', {
      cwd: process.cwd(),
      stdio: 'inherit',
    })
  } catch (e) {
    console.warn('⚠️ Failed to generate test report:', e)
  }

  // 清理测试数据（如果需要）
  console.log('🧽 Cleaning up test data...')
  // 这里可以添加清理数据库测试数据的逻辑

  console.log('✅ Global teardown completed!')
}

export default globalTeardown
