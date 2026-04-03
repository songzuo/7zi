/**
 * @fileoverview v1.9.1 任务执行和状态更新 E2E 测试
 * @description 测试任务执行、状态更新、错误处理等功能
 */

import { test, expect } from '@playwright/test'

test.describe('v1.9.1 任务执行和状态更新', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test_admin@example.com')
    await page.fill('input[name="password"]', 'test_password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('EX-001: 手动触发任务执行', async ({ page }) => {
    // 创建一个简单的工作流
    await page.goto('/workflows')
    await page.click('button:has-text("创建工作流")')
    await page.click('text=空白工作流')

    // 添加触发器节点
    await page.click('[data-testid="add-node-button"]')
    await page.click('text=手动触发')
    await page.click('[data-testid="save-node-button"]')

    // 添加动作节点
    await page.click('[data-testid="add-node-button"]')
    await page.click('text=日志输出')
    await page.click('[data-testid="save-node-button"]')

    // 保存工作流
    await page.fill('input[name="workflow-name"]', '手动触发测试')
    await page.click('button:has-text("保存")')

    // 手动触发执行
    await page.click('[data-testid="execute-button"]')

    // 验证执行状态
    await expect(page.locator('[data-testid="execution-status"]')).toBeVisible()
    await expect(page.locator('[data-testid="execution-status"]')).toHaveText(/运行中|completed/i)

    // 等待执行完成
    await expect(page.locator('[data-testid="execution-status"]')).toHaveText(/completed|成功/i, {
      timeout: 30000,
    })
  })

  test('EX-002: 定时任务执行', async ({ page }) => {
    // 创建定时任务
    await page.goto('/workflows')
    await page.click('button:has-text("创建工作流")')
    await page.click('text=空白工作流')

    // 添加定时触发器
    await page.click('[data-testid="add-node-button"]')
    await page.click('text=定时触发')

    // 配置定时规则
    await page.fill('input[name="cron-expression"]', '0 9 * * *') // 每天9点
    await page.click('[data-testid="save-node-button"]')

    // 保存工作流
    await page.fill('input[name="workflow-name"]', '定时任务测试')
    await page.click('button:has-text("保存")')

    // 查看执行计划
    await page.click('[data-testid="schedule-info-button"]')

    // 验证下次执行时间显示
    await expect(page.locator('[data-testid="next-execution-time"]')).toBeVisible()

    // 验证定时状态
    await expect(page.locator('[data-testid="schedule-status"]')).toHaveText(/已启用|active/i)
  })

  test('EX-003: 实时状态更新', async ({ page, context }) => {
    // 创建工作流
    await page.goto('/workflows')
    await page.click('button:has-text("创建工作流")')
    await page.click('text=空白工作流')

    await page.click('[data-testid="add-node-button"]')
    await page.click('text=手动触发')
    await page.fill('input[name="workflow-name"]', '实时状态测试')
    await page.click('button:has-text("保存")')

    // 打开执行页面
    const executionPage = await context.newPage()
    await executionPage.goto('/executions')

    // 在原页面触发执行
    await page.click('[data-testid="execute-button"]')

    // 验证实时状态更新
    await expect(executionPage.locator('[data-testid="execution-item"]:first-child')).toBeVisible({
      timeout: 5000,
    })

    // 验证状态变化
    const statusLocator = executionPage.locator('[data-testid="execution-status"]:first-child')

    // 等待状态变为运行中
    await expect(statusLocator).toHaveText(/运行中|running/i, { timeout: 3000 })

    // 等待状态变为完成
    await expect(statusLocator).toHaveText(/完成|completed/i, { timeout: 30000 })

    await executionPage.close()
  })

  test('EX-004: 执行日志查看', async ({ page }) => {
    // 创建并执行工作流
    await page.goto('/workflows')
    await page.click('button:has-text("创建工作流")')
    await page.click('text=空白工作流')

    await page.click('[data-testid="add-node-button"]')
    await page.click('text=手动触发')
    await page.fill('input[name="workflow-name"]', '日志测试')
    await page.click('button:has-text("保存")')

    // 执行
    await page.click('[data-testid="execute-button"]')

    // 等待执行完成
    await expect(page.locator('[data-testid="execution-status"]')).toHaveText(/completed|成功/i, {
      timeout: 30000,
    })

    // 查看日志
    await page.click('[data-testid="view-logs-button"]')

    // 验证日志面板
    await expect(page.locator('[data-testid="execution-logs"]')).toBeVisible()

    // 验证日志内容
    await expect(page.locator('[data-testid="log-entry"]')).toHaveCount({ gte: 1 })

    // 验证日志级别过滤
    await page.click('button:has-text("INFO")')
    await expect(page.locator('[data-testid="log-entry"][data-level="INFO"]')).toHaveCount({ gte: 1 })
  })

  test('EX-005: 任务暂停/恢复', async ({ page }) => {
    // 创建长时间运行的工作流
    await page.goto('/workflows')
    await page.click('button:has-text("创建工作流")')
    await page.click('text=空白工作流')

    // 添加延时节点
    await page.click('[data-testid="add-node-button"]')
    await page.click('text=延时')
    await page.fill('input[name="delay-seconds"]', '60')
    await page.click('[data-testid="save-node-button"]')

    await page.fill('input[name="workflow-name"]', '暂停恢复测试')
    await page.click('button:has-text("保存")')

    // 执行
    await page.click('[data-testid="execute-button"]')

    // 等待运行中状态
    await expect(page.locator('[data-testid="execution-status"]')).toHaveText(/运行中|running/i)

    // 暂停
    await page.click('[data-testid="pause-button"]')

    // 验证暂停状态
    await expect(page.locator('[data-testid="execution-status"]')).toHaveText(/已暂停|paused/i, {
      timeout: 5000,
    })

    // 恢复
    await page.click('[data-testid="resume-button"]')

    // 验证恢复运行
    await expect(page.locator('[data-testid="execution-status"]')).toHaveText(/运行中|running/i, {
      timeout: 5000,
    })

    // 取消执行（避免等待60秒）
    await page.click('[data-testid="cancel-button"]')
  })

  test('EX-006: 任务取消', async ({ page }) => {
    await page.goto('/workflows')
    await page.click('button:has-text("创建工作流")')
    await page.click('text=空白工作流')

    // 添加延时
    await page.click('[data-testid="add-node-button"]')
    await page.click('text=延时')
    await page.fill('input[name="delay-seconds"]', '120')
    await page.click('[data-testid="save-node-button"]')

    await page.fill('input[name="workflow-name"]', '取消测试')
    await page.click('button:has-text("保存")')

    // 执行
    await page.click('[data-testid="execute-button"]')
    await expect(page.locator('[data-testid="execution-status"]')).toHaveText(/运行中|running/i)

    // 取消
    await page.click('[data-testid="cancel-button"]')

    // 确认取消
    await page.click('button:has-text("确认取消")')

    // 验证已取消
    await expect(page.locator('[data-testid="execution-status"]')).toHaveText(/已取消|cancelled/i, {
      timeout: 5000,
    })
  })

  test('EX-007: 错误处理和重试', async ({ page }) => {
    await page.goto('/workflows')
    await page.click('button:has-text("创建工作流")')
    await page.click('text=空白工作流')

    // 添加会失败的节点（模拟错误）
    await page.click('[data-testid="add-node-button"]')
    await page.click('text=HTTP请求')
    await page.fill('input[name="url"]', 'https://invalid-test-url-12345.com')
    await page.click('[data-testid="save-node-button"]')

    await page.fill('input[name="workflow-name"]', '错误处理测试')
    await page.click('button:has-text("保存")')

    // 执行
    await page.click('[data-testid="execute-button"]')

    // 等待失败
    await expect(page.locator('[data-testid="execution-status"]')).toHaveText(/失败|failed/i, {
      timeout: 30000,
    })

    // 验证错误信息
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()

    // 验证重试按钮
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()

    // 点击重试
    await page.click('[data-testid="retry-button"]')

    // 验证重新执行
    await expect(page.locator('[data-testid="execution-status"]')).toHaveText(/运行中|running/i, {
      timeout: 5000,
    })
  })

  test('EX-008: 并发执行多个任务', async ({ page }) => {
    // 创建多个工作流
    for (let i = 1; i <= 3; i++) {
      await page.goto('/workflows')
      await page.click('button:has-text("创建工作流")')
      await page.click('text=空白工作流')

      await page.click('[data-testid="add-node-button"]')
      await page.click('text=手动触发')
      await page.fill('input[name="workflow-name"]', `并发测试${i}`)
      await page.click('button:has-text("保存")')
    }

    // 查看工作流列表
    await page.goto('/workflows')

    // 选择所有工作流
    for (let i = 1; i <= 3; i++) {
      await page.check(`input[value="并发测试${i}"]`)
    }

    // 批量执行
    await page.click('button:has-text("批量执行")')

    // 导航到执行页面
    await page.goto('/executions')

    // 验证多个任务并发运行
    const runningCount = await page.locator('[data-testid="execution-status"]:has-text("运行中")').count()
    expect(runningCount).toBeGreaterThanOrEqual(2)
  })

  test('EX-009: 执行历史查询', async ({ page }) => {
    // 创建并执行工作流
    await page.goto('/workflows')
    await page.click('button:has-text("创建工作流")')
    await page.click('text=空白工作流')

    await page.click('[data-testid="add-node-button"]')
    await page.click('text=手动触发')
    await page.fill('input[name="workflow-name"]', '历史测试')
    await page.click('button:has-text("保存")')

    await page.click('[data-testid="execute-button"]')
    await expect(page.locator('[data-testid="execution-status"]')).toHaveText(/completed|成功/i, {
      timeout: 30000,
    })

    // 查看执行历史
    await page.goto('/executions')

    // 搜索
    await page.fill('input[name="search"]', '历史测试')
    await page.click('button:has-text("搜索")')

    // 验证历史记录
    await expect(page.locator('text=历史测试')).toBeVisible()

    // 查看详情
    await page.click('text=历史测试')
    await expect(page.locator('[data-testid="execution-detail"]')).toBeVisible()

    // 验证时间、状态等信息
    await expect(page.locator('[data-testid="execution-time"]')).toBeVisible()
    await expect(page.locator('[data-testid="execution-duration"]')).toBeVisible()
  })
})