/**
 * @fileoverview v1.9.1 多代理协作 E2E 测试
 * @description 测试代理注册、任务分配、状态同步等功能
 */

import { test, expect } from '@playwright/test'

test.describe('v1.9.1 多代理协作', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test_admin@example.com')
    await page.fill('input[name="password"]', 'test_password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('MA-001: 代理注册和发现', async ({ page }) => {
    // 导航到代理管理页面
    await page.goto('/agents')

    // 点击注册新代理
    await page.click('button:has-text("注册代理")')

    // 填写代理信息
    await page.fill('input[name="agent-name"]', '测试代理1')
    await page.fill('input[name="agent-type"]', 'executor')
    await page.fill('input[name="agent-endpoint"]', 'http://localhost:8080')
    await page.fill('input[name="agent-capabilities"]', '["task_execution", "data_processing"]')

    // 提交注册
    await page.click('button:has-text("注册")')

    // 验证注册成功
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible()

    // 验证代理出现在列表中
    await expect(page.locator('text=测试代理1')).toBeVisible()

    // 验证代理状态
    await expect(page.locator('[data-testid="agent-status"]')).toHaveText(/在线|online/i)
  })

  test('MA-002: 任务分配', async ({ page }) => {
    // 创建工作流
    await page.goto('/workflows')
    await page.click('button:has-text("创建工作流")')
    await page.click('text=空白工作流')

    // 添加需要代理执行的节点
    await page.click('[data-testid="add-node-button"]')
    await page.click('text=代理任务')

    // 配置代理任务
    await page.selectOption('select[name="agent-type"]', 'executor')
    await page.fill('textarea[name="task-payload"]', '{"action": "process_data"}')
    await page.click('[data-testid="save-node-button"]')

    // 保存工作流
    await page.fill('input[name="workflow-name"]', '代理任务测试')
    await page.click('button:has-text("保存")')

    // 执行工作流
    await page.click('[data-testid="execute-button"]')

    // 等待任务分配
    await expect(page.locator('[data-testid="task-assigned"]')).toBeVisible({ timeout: 10000 })

    // 验证分配的代理
    await expect(page.locator('[data-testid="assigned-agent"]')).toBeVisible()
  })

  test('MA-003: 代理状态同步', async ({ page, context }) => {
    // 打开代理监控页面
    const monitorPage = await context.newPage()
    await monitorPage.goto('/agents/monitor')

    // 在原页面修改代理状态
    await page.goto('/agents')
    await page.click('text=测试代理1')
    await page.click('button:has-text("下线")')

    // 验证监控页面实时更新
    await expect(monitorPage.locator('[data-testid="agent-status"]')).toHaveText(/离线|offline/i, {
      timeout: 5000,
    })

    // 重新上线
    await page.click('button:has-text("上线")')

    // 验证状态恢复
    await expect(monitorPage.locator('[data-testid="agent-status"]')).toHaveText(/在线|online/i, {
      timeout: 5000,
    })

    await monitorPage.close()
  })

  test('MA-004: 协作消息传递', async ({ page }) => {
    // 创建需要多代理协作的工作流
    await page.goto('/workflows')
    await page.click('button:has-text("创建工作流")')
    await page.click('text=空白工作流')

    // 添加第一个代理任务
    await page.click('[data-testid="add-node-button"]')
    await page.click('text=代理任务')
    await page.fill('input[name="node-name"]', '数据采集')
    await page.selectOption('select[name="agent-type"]', 'collector')
    await page.click('[data-testid="save-node-button"]')

    // 添加第二个代理任务
    await page.click('[data-testid="add-node-button"]')
    await page.click('text=代理任务')
    await page.fill('input[name="node-name"]', '数据处理')
    await page.selectOption('select[name="agent-type"]', 'processor')
    await page.click('[data-testid="save-node-button"]')

    // 连接节点
    const collectorNode = page.locator('[data-node-name="数据采集"]')
    const processorNode = page.locator('[data-node-name="数据处理"]')
    await collectorNode.dragTo(processorNode)

    // 保存并执行
    await page.fill('input[name="workflow-name"]', '协作测试')
    await page.click('button:has-text("保存")')
    await page.click('[data-testid="execute-button"]')

    // 等待执行完成
    await expect(page.locator('[data-testid="execution-status"]')).toHaveText(/completed|成功/i, {
      timeout: 30000,
    })

    // 查看消息日志
    await page.click('[data-testid="view-logs-button"]')

    // 验证代理间消息传递
    await expect(page.locator('[data-testid="agent-message"]')).toHaveCount({ gte: 1 })
  })

  test('MA-005: 结果聚合', async ({ page }) => {
    // 创建并行任务工作流
    await page.goto('/workflows')
    await page.click('button:has-text("创建工作流")')
    await page.click('text=空白工作流')

    // 添加多个并行代理任务
    for (let i = 1; i <= 3; i++) {
      await page.click('[data-testid="add-node-button"]')
      await page.click('text=代理任务')
      await page.fill('input[name="node-name"]', `任务${i}`)
      await page.click('[data-testid="save-node-button"]')
    }

    // 添加聚合节点
    await page.click('[data-testid="add-node-button"]')
    await page.click('text=结果聚合')
    await page.click('[data-testid="save-node-button"]')

    // 保存并执行
    await page.fill('input[name="workflow-name"]', '聚合测试')
    await page.click('button:has-text("保存")')
    await page.click('[data-testid="execute-button"]')

    // 等待执行完成
    await expect(page.locator('[data-testid="execution-status"]')).toHaveText(/completed|成功/i, {
      timeout: 30000,
    })

    // 查看聚合结果
    await page.click('[data-testid="view-results-button"]')

    // 验证结果包含所有任务输出
    await expect(page.locator('[data-testid="result-item"]')).toHaveCount(3)
  })

  test('MA-006: 负载均衡', async ({ page }) => {
    // 注册多个相同类型的代理
    for (let i = 1; i <= 3; i++) {
      await page.goto('/agents')
      await page.click('button:has-text("注册代理")')
      await page.fill('input[name="agent-name"]', `执行代理${i}`)
      await page.fill('input[name="agent-type"]', 'executor')
      await page.fill('input[name="agent-endpoint"]', `http://localhost:808${i}`)
      await page.click('button:has-text("注册")')
      await page.waitForTimeout(500)
    }

    // 创建多个任务
    for (let i = 1; i <= 6; i++) {
      await page.goto('/workflows')
      await page.click('button:has-text("创建工作流")')
      await page.click('text=空白工作流')

      await page.click('[data-testid="add-node-button"]')
      await page.click('text=代理任务')
      await page.fill('input[name="workflow-name"]', `负载测试${i}`)
      await page.click('button:has-text("保存")')
      await page.click('[data-testid="execute-button"]')
      await page.waitForTimeout(500)
    }

    // 查看代理负载
    await page.goto('/agents/monitor')

    // 验证负载分布
    const agentLoads = await page.locator('[data-testid="agent-load"]').allTextContents()
    const loads = agentLoads.map((l) => parseInt(l.replace('任务数:', '')))

    // 验证负载相对均衡（差异不超过2）
    const maxLoad = Math.max(...loads)
    const minLoad = Math.min(...loads)
    expect(maxLoad - minLoad).toBeLessThanOrEqual(2)
  })

  test('MA-007: 代理故障转移', async ({ page }) => {
    // 创建工作流
    await page.goto('/workflows')
    await page.click('button:has-text("创建工作流")')
    await page.click('text=空白工作流')

    await page.click('[data-testid="add-node-button"]')
    await page.click('text=代理任务')
    await page.fill('input[name="workflow-name"]', '故障转移测试')
    await page.click('button:has-text("保存")')

    // 执行
    await page.click('[data-testid="execute-button"]')

    // 模拟代理故障（下线）
    await page.goto('/agents')
    await page.click('text=执行代理1')
    await page.click('button:has-text("下线")')

    // 验证任务自动转移到其他代理
    await page.goto('/executions')
    await expect(page.locator('[data-testid="reassigned-agent"]')).toBeVisible({ timeout: 10000 })
  })

  test('MA-008: 代理性能监控', async ({ page }) => {
    // 执行多个任务
    for (let i = 1; i <= 5; i++) {
      await page.goto('/workflows')
      await page.click('button:has-text("创建工作流")')
      await page.click('text=空白工作流')

      await page.click('[data-testid="add-node-button"]')
      await page.click('text=代理任务')
      await page.fill('input[name="workflow-name"]', `性能测试${i}`)
      await page.click('button:has-text("保存")')
      await page.click('[data-testid="execute-button"]')
      await page.waitForTimeout(1000)
    }

    // 查看性能监控
    await page.goto('/agents/performance')

    // 验证性能指标
    await expect(page.locator('[data-testid="avg-response-time"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-rate"]')).toBeVisible()
    await expect(page.locator('[data-testid="throughput"]')).toBeVisible()

    // 验证图表
    await expect(page.locator('[data-testid="performance-chart"]')).toBeVisible()
  })
})