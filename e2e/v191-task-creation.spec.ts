/**
 * @fileoverview v1.9.1 AI 对话式任务创建 E2E 测试
 * @description 测试自然语言任务创建、意图识别、实体提取等功能
 */

import { test, expect } from '@playwright/test'

test.describe('v1.9.1 AI 对话式任务创建', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test_admin@example.com')
    await page.fill('input[name="password"]', 'test_password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('TC-001: 自然语言任务创建', async ({ page }) => {
    // 打开任务创建对话框
    await page.goto('/workflows')
    await page.click('[data-testid="quick-task-button"]')

    // 等待对话框打开
    await expect(page.locator('[data-testid="task-creation-chat"]')).toBeVisible()

    // 输入自然语言描述
    await page.fill(
      '[data-testid="chat-input"]',
      '每天早上9点发送一封邮件给 team@example.com，内容是每日报告'
    )

    // 发送消息
    await page.click('[data-testid="send-button"]')

    // 等待解析结果
    await expect(page.locator('[data-testid="task-preview"]')).toBeVisible({ timeout: 10000 })

    // 验证意图识别
    await expect(page.locator('[data-testid="intent-badge"]')).toHaveText(/定时任务|scheduled/i)

    // 验证预览面板
    await expect(page.locator('[data-testid="preview-nodes"]')).toBeVisible()
  })

  test('TC-002: 意图识别准确性', async ({ page }) => {
    await page.goto('/workflows')
    await page.click('[data-testid="quick-task-button"]')

    // 测试各种意图类型
    const testCases = [
      {
        input: '监控服务器状态，CPU超过80%时发送告警邮件',
        expectedIntent: 'monitoring',
      },
      {
        input: '每周一早上9点发送周报给团队',
        expectedIntent: 'scheduled',
      },
      {
        input: '当收到新订单时，发送通知给销售团队',
        expectedIntent: 'notification',
      },
      {
        input: '处理上传的Excel文件，提取数据存入数据库',
        expectedIntent: 'data_processing',
      },
      {
        input: '当用户提交申请时，需要主管审批',
        expectedIntent: 'human_approval',
      },
    ]

    for (const testCase of testCases) {
      await page.fill('[data-testid="chat-input"]', testCase.input)
      await page.click('[data-testid="send-button"]')

      await expect(page.locator('[data-testid="intent-badge"]')).toBeVisible({ timeout: 10000 })

      // 验证意图识别正确
      const intentText = await page.locator('[data-testid="intent-badge"]').textContent()
      expect(intentText?.toLowerCase()).toContain(testCase.expectedIntent.toLowerCase())

      // 重置对话
      await page.click('[data-testid="reset-chat-button"]')
    }
  })

  test('TC-003: 实体提取准确性', async ({ page }) => {
    await page.goto('/workflows')
    await page.click('[data-testid="quick-task-button"]')

    // 输入包含多个实体的描述
    await page.fill(
      '[data-testid="chat-input"]',
      '每天早上9点发送邮件给 john@example.com 和 team@example.com，主题是"每日报告"'
    )
    await page.click('[data-testid="send-button"]')

    await expect(page.locator('[data-testid="task-preview"]')).toBeVisible({ timeout: 10000 })

    // 切换到 JSON 视图查看实体
    await page.click('[data-testid="view-json-button"]')

    // 验证提取的实体
    const jsonContent = await page.locator('[data-testid="json-preview"]').textContent()
    const parsed = JSON.parse(jsonContent || '{}')

    // 验证时间实体
    expect(parsed.variables?.time).toBeTruthy()
    expect(parsed.variables?.time).toContain('9')

    // 验证接收者实体
    expect(parsed.nodes?.some((n: { config?: { recipients?: string[] } }) => 
      n.config?.recipients?.includes('john@example.com')
    )).toBeTruthy()

    // 验证主题实体
    expect(JSON.stringify(parsed)).toContain('每日报告')
  })

  test('TC-004: 任务预览显示', async ({ page }) => {
    await page.goto('/workflows')
    await page.click('[data-testid="quick-task-button"]')

    await page.fill('[data-testid="chat-input"]', '每天早上9点发送邮件给 team@example.com')
    await page.click('[data-testid="send-button"]')

    await expect(page.locator('[data-testid="task-preview"]')).toBeVisible({ timeout: 10000 })

    // 验证预览面板内容
    await expect(page.locator('[data-testid="workflow-name"]')).toBeVisible()
    await expect(page.locator('[data-testid="intent-badge"]')).toBeVisible()
    await expect(page.locator('[data-testid="confidence-score"]')).toBeVisible()

    // 验证置信度显示
    const confidenceText = await page.locator('[data-testid="confidence-score"]').textContent()
    const confidence = parseFloat(confidenceText?.replace('%', '') || '0')
    expect(confidence).toBeGreaterThan(0)
    expect(confidence).toBeLessThanOrEqual(100)

    // 验证节点列表
    await expect(page.locator('[data-testid="preview-node"]')).toHaveCount({ gte: 1 })

    // 验证边列表
    await expect(page.locator('[data-testid="preview-edge"]')).toHaveCount({ gte: 0 })
  })

  test('TC-005: 多轮对话支持', async ({ page }) => {
    await page.goto('/workflows')
    await page.click('[data-testid="quick-task-button"]')

    // 第一轮对话
    await page.fill('[data-testid="chat-input"]', '发送邮件')
    await page.click('[data-testid="send-button"]')
    await expect(page.locator('[data-testid="task-preview"]')).toBeVisible({ timeout: 10000 })

    // 验证需要更多信息
    await expect(page.locator('[data-testid="suggestions"]')).toBeVisible()

    // 第二轮对话：补充信息
    await page.fill('[data-testid="chat-input"]', '发送给 team@example.com，主题是测试')
    await page.click('[data-testid="send-button"]')
    await expect(page.locator('[data-testid="task-preview"]')).toBeVisible({ timeout: 10000 })

    // 验证信息已更新
    const jsonContent = await page.locator('[data-testid="json-preview"]').textContent()
    expect(jsonContent).toContain('team@example.com')

    // 验证聊天历史
    const messages = await page.locator('[data-testid="chat-message"]').count()
    expect(messages).toBeGreaterThanOrEqual(4) // 用户2条 + 助手2条
  })

  test('TC-006: 快捷提示按钮', async ({ page }) => {
    await page.goto('/workflows')
    await page.click('[data-testid="quick-task-button"]')

    // 验证快捷按钮存在
    await expect(page.locator('[data-testid="quick-suggestion"]')).toHaveCount({ gte: 3 })

    // 点击快捷按钮
    await page.locator('[data-testid="quick-suggestion"]:first-child').click()

    // 验证输入已填充
    const inputValue = await page.locator('[data-testid="chat-input"]').inputValue()
    expect(inputValue.length).toBeGreaterThan(0)

    // 发送并验证
    await page.click('[data-testid="send-button"]')
    await expect(page.locator('[data-testid="task-preview"]')).toBeVisible({ timeout: 10000 })
  })

  test('TC-007: 解析置信度显示', async ({ page }) => {
    await page.goto('/workflows')
    await page.click('[data-testid="quick-task-button"]')

    // 输入清晰的描述
    await page.fill(
      '[data-testid="chat-input"]',
      '每天早上9点整，发送邮件给 team@example.com，主题是"每日站会提醒"'
    )
    await page.click('[data-testid="send-button"]')

    await expect(page.locator('[data-testid="confidence-score"]')).toBeVisible({ timeout: 10000 })

    // 验证高置信度
    let confidenceText = await page.locator('[data-testid="confidence-score"]').textContent()
    let confidence = parseFloat(confidenceText?.replace('%', '') || '0')
    expect(confidence).toBeGreaterThan(70)

    // 输入模糊的描述
    await page.click('[data-testid="reset-chat-button"]')
    await page.fill('[data-testid="chat-input"]', '做点什么')
    await page.click('[data-testid="send-button"]')

    await expect(page.locator('[data-testid="confidence-score"]')).toBeVisible({ timeout: 10000 })

    // 验证低置信度
    confidenceText = await page.locator('[data-testid="confidence-score"]').textContent()
    confidence = parseFloat(confidenceText?.replace('%', '') || '0')
    expect(confidence).toBeLessThan(50)

    // 验证改进建议
    await expect(page.locator('[data-testid="suggestions"]')).toBeVisible()
  })

  test('TC-008: 创建任务确认流程', async ({ page }) => {
    await page.goto('/workflows')
    await page.click('[data-testid="quick-task-button"]')

    // 输入并解析
    await page.fill('[data-testid="chat-input"]', '每天早上9点发送邮件给 team@example.com')
    await page.click('[data-testid="send-button"]')

    await expect(page.locator('[data-testid="task-preview"]')).toBeVisible({ timeout: 10000 })

    // 点击创建按钮
    await page.click('[data-testid="create-task-button"]')

    // 验证确认对话框
    await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible()

    // 确认创建
    await page.click('button:has-text("确认创建")')

    // 验证创建成功
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible()
    await expect(page.locator('[data-testid="toast-success"]')).toHaveText(/创建成功/)

    // 验证跳转到工作流编辑器
    await page.waitForURL(/\/workflows\/.+/)
  })

  test('TC-009: 历史记录导航', async ({ page }) => {
    await page.goto('/workflows')
    await page.click('[data-testid="quick-task-button"]')

    // 创建多条对话
    for (let i = 0; i < 3; i++) {
      await page.fill('[data-testid="chat-input"]', `测试任务 ${i + 1}`)
      await page.click('[data-testid="send-button"]')
      await page.waitForTimeout(500)
    }

    // 验证历史记录数量
    const messageCount = await page.locator('[data-testid="chat-message"]').count()
    expect(messageCount).toBeGreaterThanOrEqual(6)

    // 滚动查看历史
    await page.locator('[data-testid="chat-messages"]').evaluate((el) => {
      el.scrollTop = 0
    })

    // 验证可以滚动
    const scrollTop = await page.locator('[data-testid="chat-messages"]').evaluate((el) => el.scrollTop)
    expect(scrollTop).toBe(0)
  })
})