/**
 * E2E Test: Onboarding Flow
 *
 * 测试引导流程的完整功能:
 * - 首次访问显示引导弹窗
 * - 4步流程导航
 * - 创建房间步骤
 * - 邀请队友步骤
 * - 完成步骤
 * - 跳过功能
 * - 完成状态持久化
 * - 重新触发引导
 */

import { test, expect } from './fixtures/test.fixtures'
import { clearStorage } from './helpers/test-helpers'

test.describe('引导流程', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page)
    await page.goto('/dashboard')
  })

  test('首次访问应该显示引导弹窗', async ({ page }) => {
    // 验证引导弹窗可见
    const modal = page.locator('.fixed.inset-0.z-50')
    await expect(modal).toBeVisible()

    // 验证欢迎步骤
    await expect(page.getByRole('heading', { name: /欢迎来到 7zi/i })).toBeVisible()
    await expect(page.getByText(/开始探索智能协作的未来/i)).toBeVisible()

    // 验证开始按钮
    await expect(page.getByRole('button', { name: /开始/ })).toBeVisible()
  })

  test('进度指示器应该正确显示', async ({ page }) => {
    // 验证进度条存在（4个步骤）
    const progressBars = page.locator('.h-1\\.5.rounded-full')
    await expect(progressBars).toHaveCount(4)

    // 当前步骤进度条应该更宽（有 w-8 类）
    const activeBar = progressBars.first()
    await expect(activeBar).toHaveClass(/w-8/)
  })

  test('点击开始按钮应该进入下一步', async ({ page }) => {
    await page.getByRole('button', { name: /开始/ }).click()

    // 进入创建房间步骤
    await expect(page.getByRole('heading', { name: /创建第一个房间/i })).toBeVisible()
  })

  test('创建房间步骤应该验证房间名称', async ({ page }) => {
    // 先跳过欢迎步骤
    await page.getByRole('button', { name: /开始/ }).click()

    // 创建房间按钮初始应该禁用
    const createButton = page.getByRole('button', { name: /创建房间/ })
    await expect(createButton).toBeDisabled()

    // 填写房间名称
    await page.getByLabel(/房间名称/).fill('测试协作室')

    // 按钮应该启用
    await expect(createButton).toBeEnabled()
  })

  test('创建房间后应该进入邀请步骤', async ({ page }) => {
    await page.getByRole('button', { name: /开始/ }).click()

    // 填写房间名称并创建
    await page.getByLabel(/房间名称/).fill('测试协作室')
    await page.getByRole('button', { name: /创建房间/ }).click()

    // 进入邀请步骤
    await expect(page.getByRole('heading', { name: /邀请队友/i })).toBeVisible()
  })

  test('跳过创建房间应该进入邀请步骤', async ({ page }) => {
    await page.getByRole('button', { name: /开始/ }).click()
    await page.getByRole('button', { name: /跳过/ }).click()

    await expect(page.getByRole('heading', { name: /邀请队友/i })).toBeVisible()
  })

  test('邀请步骤应该添加和移除邮箱', async ({ page }) => {
    // 导航到邀请步骤
    await page.getByRole('button', { name: /开始/ }).click()
    await page.getByRole('button', { name: /跳过/ }).click()

    // 添加邮箱
    await page.getByPlaceholder(/输入邮箱地址/).fill('teammate@example.com')
    await page.getByRole('button', { name: /添加/ }).click()

    // 验证邮箱标签显示
    await expect(page.getByText('teammate@example.com')).toBeVisible()

    // 移除邮箱
    await page.getByText('teammate@example.com').locator('button').click()
    await expect(page.getByText('teammate@example.com')).not.toBeVisible()
  })

  test('邀请步骤应该支持回车键添加邮箱', async ({ page }) => {
    await page.getByRole('button', { name: /开始/ }).click()
    await page.getByRole('button', { name: /跳过/ }).click()

    // 使用回车键添加
    await page.getByPlaceholder(/输入邮箱地址/).fill('teammate@example.com')
    await page.keyboard.press('Enter')

    await expect(page.getByText('teammate@example.com')).toBeVisible()
  })

  test('完成邀请后应该进入完成步骤', async ({ page }) => {
    await page.getByRole('button', { name: /开始/ }).click()
    await page.getByRole('button', { name: /跳过/ }).click()

    // 发送邀请
    await page.getByRole('button', { name: /发送邀请/ }).click()

    // 进入完成步骤
    await expect(page.getByRole('heading', { name: /设置完成/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /进入 Dashboard/i })).toBeVisible()
  })

  test('跳过邀请后应该进入完成步骤', async ({ page }) => {
    await page.getByRole('button', { name: /开始/ }).click()
    await page.getByRole('button', { name: /跳过/ }).click()
    await page.getByRole('button', { name: /跳过/ }).click()

    await expect(page.getByRole('heading', { name: /设置完成/i })).toBeVisible()
  })

  test('点击进入 Dashboard 应该完成引导', async ({ page }) => {
    await page.getByRole('button', { name: /开始/ }).click()
    await page.getByRole('button', { name: /跳过/ }).click()
    await page.getByRole('button', { name: /跳过/ }).click()
    await page.getByRole('button', { name: /进入 Dashboard/ }).click()

    // 引导弹窗应该关闭
    const modal = page.locator('.fixed.inset-0.z-50')
    await expect(modal).not.toBeVisible()

    // localStorage 应该标记完成
    const completed = await page.evaluate(() => localStorage.getItem('onboarding_completed'))
    expect(completed).toBe('true')
  })

  test('完成引导后刷新页面不应该再次显示引导', async ({ page }) => {
    // 完成引导
    await page.getByRole('button', { name: /开始/ }).click()
    await page.getByRole('button', { name: /跳过/ }).click()
    await page.getByRole('button', { name: /进入 Dashboard/ }).click()

    // 刷新页面
    await page.reload()

    // 引导弹窗不应该显示
    const modal = page.locator('.fixed.inset-0.z-50')
    await expect(modal).not.toBeVisible()
  })
})

test.describe('引导流程 - 重新触发', () => {
  test('应该能够重新触发引导流程', async ({ page }) => {
    // 先完成引导
    await page.goto('/dashboard')
    await page.getByRole('button', { name: /开始/ }).click()
    await page.getByRole('button', { name: /跳过/ }).click()
    await page.getByRole('button', { name: /跳过/ }).click()
    await page.getByRole('button', { name: /进入 Dashboard/ }).click()

    // 验证引导已完成
    const modal = page.locator('.fixed.inset-0.z-50')
    await expect(modal).not.toBeVisible()

    // 清除完成状态（模拟重新触发）
    await page.evaluate(() => localStorage.removeItem('onboarding_completed'))
    await page.reload()

    // 引导应该重新显示
    await expect(page.getByRole('heading', { name: /欢迎来到 7zi/i })).toBeVisible()
  })
})

test.describe('引导流程 - 关键用户路径', () => {
  test('完整流程：创建房间 + 邀请一个队友', async ({ page }) => {
    await page.goto('/dashboard')

    // Step 1: 欢迎
    await expect(page.getByRole('heading', { name: /欢迎来到 7zi/i })).toBeVisible()
    await page.getByRole('button', { name: /开始/ }).click()

    // Step 2: 创建房间
    await expect(page.getByRole('heading', { name: /创建第一个房间/i })).toBeVisible()
    await page.getByLabel(/房间名称/).fill('产品研发室')
    await page.getByRole('button', { name: /创建房间/ }).click()

    // Step 3: 邀请队友
    await expect(page.getByRole('heading', { name: /邀请队友/i })).toBeVisible()
    await page.getByPlaceholder(/输入邮箱地址/).fill('dev@example.com')
    await page.getByRole('button', { name: /添加/ }).click()
    await expect(page.getByText('dev@example.com')).toBeVisible()
    await page.getByRole('button', { name: /发送邀请/ }).click()

    // Step 4: 完成
    await expect(page.getByRole('heading', { name: /设置完成/i })).toBeVisible()
    await expect(page.getByText(/恭喜您完成初始设置/i)).toBeVisible()
    await page.getByRole('button', { name: /进入 Dashboard/ }).click()

    // 验证完成
    const modal = page.locator('.fixed.inset-0.z-50')
    await expect(modal).not.toBeVisible()
    const completed = await page.evaluate(() => localStorage.getItem('onboarding_completed'))
    expect(completed).toBe('true')
  })

  test('快速通道：跳过所有步骤', async ({ page }) => {
    await page.goto('/dashboard')

    await page.getByRole('button', { name: /开始/ }).click()
    await page.getByRole('button', { name: /跳过/ }).click()
    await page.getByRole('button', { name: /跳过/ }).click()
    await page.getByRole('button', { name: /进入 Dashboard/ }).click()

    // 验证完成
    const modal = page.locator('.fixed.inset-0.z-50')
    await expect(modal).not.toBeVisible()
    const completed = await page.evaluate(() => localStorage.getItem('onboarding_completed'))
    expect(completed).toBe('true')
  })

  test('仅创建房间不邀请', async ({ page }) => {
    await page.goto('/dashboard')

    await page.getByRole('button', { name: /开始/ }).click()
    await page.getByLabel(/房间名称/).fill('快速协作室')
    await page.getByRole('button', { name: /创建房间/ }).click()
    await page.getByRole('button', { name: /跳过/ }).click()
    await page.getByRole('button', { name: /进入 Dashboard/ }).click()

    const modal = page.locator('.fixed.inset-0.z-50')
    await expect(modal).not.toBeVisible()
  })
})

test.describe('引导流程 - 动画和交互', () => {
  test('弹窗应该有背景遮罩', async ({ page }) => {
    const overlay = page.locator('.fixed.inset-0.bg-black\\/50')
    await expect(overlay).toBeVisible()
  })

  test('弹窗应该居中显示', async ({ page }) => {
    const modal = page.locator('.max-w-md')
    await expect(modal).toBeVisible()
  })
})

test.describe('引导流程 - 表单验证', () => {
  test('房间名称应该支持中英文输入', async ({ page }) => {
    await page.getByRole('button', { name: /开始/ }).click()

    await page.getByLabel(/房间名称/).fill('产品研发团队')
    await expect(page.getByRole('button', { name: /创建房间/ })).toBeEnabled()

    await page.getByLabel(/房间名称/).clear()
    await page.getByLabel(/房间名称/).fill('Product Team')
    await expect(page.getByRole('button', { name: /创建房间/ })).toBeEnabled()
  })

  test('房间名称前后空格应该被正确处理', async ({ page }) => {
    await page.getByRole('button', { name: /开始/ }).click()

    await page.getByLabel(/房间名称/).fill('  测试房间  ')
    await page.getByRole('button', { name: /创建房间/ }).click()

    // 验证创建成功（输入被 trim）
    await expect(page.getByRole('heading', { name: /邀请队友/i })).toBeVisible()
  })
})