/**
 * @fileoverview v1.9.1 工作流创建和编辑 E2E 测试
 * @description 测试工作流的创建、编辑、保存等核心功能
 */

import { test, expect } from '@playwright/test'

test.describe('v1.9.1 工作流创建和编辑', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test_admin@example.com')
    await page.fill('input[name="password"]', 'test_password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('WF-001: 创建空白工作流', async ({ page }) => {
    // 导航到工作流页面
    await page.click('text=工作流')
    await page.waitForURL('/workflows')

    // 点击创建按钮
    await page.click('button:has-text("创建工作流")')

    // 选择空白模板
    await page.click('text=空白工作流')

    // 验证工作流编辑器打开
    await expect(page.locator('[data-testid="workflow-editor"]')).toBeVisible()

    // 验证初始状态
    await expect(page.locator('[data-testid="workflow-canvas"]')).toBeVisible()
    await expect(page.locator('[data-testid="node-count"]')).toHaveText('0')
  })

  test('WF-002: 从模板创建工作流', async ({ page }) => {
    await page.goto('/workflows')
    await page.click('button:has-text("创建工作流")')

    // 选择通知模板
    await page.click('text=通知模板')

    // 验证模板节点已加载
    await expect(page.locator('[data-testid="workflow-node"]')).toHaveCount(3)

    // 验证节点类型
    await expect(page.locator('[data-node-type="trigger"]')).toBeVisible()
    await expect(page.locator('[data-node-type="action"]')).toBeVisible()
    await expect(page.locator('[data-node-type="notification"]')).toBeVisible()
  })

  test('WF-003: 编辑工作流节点', async ({ page }) => {
    // 创建工作流
    await page.goto('/workflows')
    await page.click('button:has-text("创建工作流")')
    await page.click('text=空白工作流')

    // 添加节点
    await page.click('[data-testid="add-node-button"]')
    await page.click('text=通知节点')

    // 双击节点打开配置
    await page.dblclick('[data-testid="workflow-node"]')

    // 编辑节点配置
    await page.fill('input[name="node-name"]', '测试通知节点')
    await page.fill('textarea[name="node-description"]', '这是一个测试通知')
    await page.selectOption('select[name="notification-type"]', 'email')

    // 保存配置
    await page.click('button:has-text("保存")')

    // 验证配置已保存
    await expect(page.locator('[data-testid="node-name"]')).toHaveText('测试通知节点')
  })

  test('WF-004: 添加和删除节点', async ({ page }) => {
    await page.goto('/workflows')
    await page.click('button:has-text("创建工作流")')
    await page.click('text=空白工作流')

    // 添加多个节点
    await page.click('[data-testid="add-node-button"]')
    await page.click('text=触发器节点')

    await page.click('[data-testid="add-node-button"]')
    await page.click('text=动作节点')

    await page.click('[data-testid="add-node-button"]')
    await page.click('text=通知节点')

    // 验证节点数量
    await expect(page.locator('[data-testid="workflow-node"]')).toHaveCount(3)

    // 删除一个节点
    await page.click('[data-testid="workflow-node"]:first-child')
    await page.click('[data-testid="delete-node-button"]')

    // 确认删除
    await page.click('button:has-text("确认")')

    // 验证节点数量减少
    await expect(page.locator('[data-testid="workflow-node"]')).toHaveCount(2)
  })

  test('WF-005: 连接节点', async ({ page }) => {
    await page.goto('/workflows')
    await page.click('button:has-text("创建工作流")')
    await page.click('text=空白工作流')

    // 添加两个节点
    await page.click('[data-testid="add-node-button"]')
    await page.click('text=触发器节点')

    await page.click('[data-testid="add-node-button"]')
    await page.click('text=动作节点')

    // 连接节点
    const sourceNode = page.locator('[data-node-type="trigger"]')
    const targetNode = page.locator('[data-node-type="action"]')

    await sourceNode.dragTo(targetNode)

    // 验证连接已创建
    await expect(page.locator('[data-testid="workflow-edge"]')).toHaveCount(1)
  })

  test('WF-006: 保存工作流', async ({ page }) => {
    await page.goto('/workflows')
    await page.click('button:has-text("创建工作流")')
    await page.click('text=空白工作流')

    // 添加节点
    await page.click('[data-testid="add-node-button"]')
    await page.click('text=触发器节点')

    // 填写工作流信息
    await page.fill('input[name="workflow-name"]', '测试工作流')
    await page.fill('textarea[name="workflow-description"]', '这是一个测试工作流')

    // 保存工作流
    await page.click('button:has-text("保存")')

    // 验证保存成功提示
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible()
    await expect(page.locator('[data-testid="toast-success"]')).toHaveText(/保存成功/)

    // 验证工作流出现在列表中
    await page.goto('/workflows')
    await expect(page.locator('text=测试工作流')).toBeVisible()
  })

  test('WF-007: 导入导出工作流', async ({ page }) => {
    // 创建工作流
    await page.goto('/workflows')
    await page.click('button:has-text("创建工作流")')
    await page.click('text=空白工作流')

    await page.fill('input[name="workflow-name"]', '导出测试工作流')
    await page.click('[data-testid="add-node-button"]')
    await page.click('text=触发器节点')
    await page.click('button:has-text("保存")')

    // 导出工作流
    await page.click('[data-testid="export-button"]')
    await page.click('text=JSON')

    // 验证下载
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("下载")')
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/workflow.*\.json/)

    // 导入工作流
    await page.goto('/workflows')
    await page.click('button:has-text("导入工作流")')

    // 上传文件
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(download.path())

    // 验证导入成功
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible()
    await expect(page.locator('text=导出测试工作流')).toBeVisible()
  })

  test('WF-008: 工作流版本管理', async ({ page }) => {
    // 创建工作流
    await page.goto('/workflows')
    await page.click('button:has-text("创建工作流")')
    await page.click('text=空白工作流')

    await page.fill('input[name="workflow-name"]', '版本测试工作流')
    await page.click('button:has-text("保存")')

    // 修改工作流
    await page.click('[data-testid="add-node-button"]')
    await page.click('text=触发器节点')
    await page.click('button:has-text("保存")')

    // 查看版本历史
    await page.click('[data-testid="version-history-button"]')

    // 验证版本列表
    await expect(page.locator('[data-testid="version-item"]')).toHaveCount(2)

    // 恢复到第一个版本
    await page.locator('[data-testid="version-item"]:first-child').click()
    await page.click('button:has-text("恢复此版本")')

    // 验证恢复成功
    await expect(page.locator('[data-testid="workflow-node"]')).toHaveCount(0)
  })
})