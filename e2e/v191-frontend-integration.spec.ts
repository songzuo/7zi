/**
 * @fileoverview v1.9.1 前端集成测试
 * @description 测试组件交互、状态管理、路由跳转等
 */

import { test, expect } from '@playwright/test'

test.describe('v1.9.1 前端集成测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test_admin@example.com')
    await page.fill('input[name="password"]', 'test_password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test.describe('CI-001: 工作流画布交互', () => {
    test('拖拽节点', async ({ page }) => {
      await page.goto('/workflows')
      await page.click('button:has-text("创建工作流")')
      await page.click('text=空白工作流')

      // 添加节点
      await page.click('[data-testid="add-node-button"]')
      await page.click('text=触发器节点')

      // 获取节点初始位置
      const node = page.locator('[data-testid="workflow-node"]')
      const initialBox = await node.boundingBox()

      // 拖拽节点
      await node.dragTo(page.locator('[data-testid="workflow-canvas"]'), {
        targetPosition: { x: 500, y: 300 },
      })

      // 验证位置改变
      const finalBox = await node.boundingBox()
      expect(initialBox?.x).not.toBe(finalBox?.x)
      expect(initialBox?.y).not.toBe(finalBox?.y)
    })

    test('缩放画布', async ({ page }) => {
      await page.goto('/workflows')
      await page.click('button:has-text("创建工作流")')
      await page.click('text=空白工作流')

      const canvas = page.locator('[data-testid="workflow-canvas"]')

      // 放大
      await page.click('[data-testid="zoom-in-button"]')
      await page.waitForTimeout(500)

      // 验证缩放
      const transform = await canvas.evaluate((el) => {
        return window.getComputedStyle(el).transform
      })
      expect(transform).not.toBe('none')

      // 缩小
      await page.click('[data-testid="zoom-out-button"]')
      await page.waitForTimeout(500)

      // 重置
      await page.click('[data-testid="zoom-reset-button"]')
    })

    test('平移画布', async ({ page }) => {
      await page.goto('/workflows')
      await page.click('button:has-text("创建工作流")')
      await page.click('text=空白工作流')

      const canvas = page.locator('[data-testid="workflow-canvas"]')

      // 按住空格键拖拽平移
      await canvas.hover()
      await page.keyboard.down('Space')
      await page.mouse.down()
      await page.mouse.move(100, 100)
      await page.mouse.up()
      await page.keyboard.up('Space')

      // 验证画布位置改变
      const transform = await canvas.evaluate((el) => {
        return window.getComputedStyle(el).transform
      })
      expect(transform).not.toBe('none')
    })
  })

  test.describe('CI-002: 节点配置表单', () => {
    test('表单验证', async ({ page }) => {
      await page.goto('/workflows')
      await page.click('button:has-text("创建工作流")')
      await page.click('text=空白工作流')

      // 添加节点
      await page.click('[data-testid="add-node-button"]')
      await page.click('text=触发器节点')

      // 双击打开配置
      await page.dblclick('[data-testid="workflow-node"]')

      // 尝试提交空表单
      await page.click('button:has-text("保存")')

      // 验证显示验证错误
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible()
    })

    test('表单提交', async ({ page }) => {
      await page.goto('/workflows')
      await page.click('button:has-text("创建工作流")')
      await page.click('text=空白工作流')

      await page.click('[data-testid="add-node-button"]')
      await page.click('text=触发器节点')
      await page.dblclick('[data-testid="workflow-node"]')

      // 填写表单
      await page.fill('input[name="node-name"]', '测试节点')
      await page.fill('textarea[name="node-description"]', '测试描述')
      await page.selectOption('select[name="trigger-type"]', 'manual')

      // 提交
      await page.click('button:has-text("保存")')

      // 验证保存成功
      await expect(page.locator('[data-testid="toast-success"]')).toBeVisible()

      // 验证节点名称更新
      await expect(page.locator('[data-testid="node-name"]')).toHaveText('测试节点')
    })

    test('表单取消', async ({ page }) => {
      await page.goto('/workflows')
      await page.click('button:has-text("创建工作流")')
      await page.click('text=空白工作流')

      await page.click('[data-testid="add-node-button"]')
      await page.click('text=触发器节点')
      await page.dblclick('[data-testid="workflow-node"]')

      // 填写表单
      await page.fill('input[name="node-name"]', '测试节点')

      // 取消
      await page.click('button:has-text("取消")')

      // 验证对话框关闭
      await expect(page.locator('[data-testid="node-config-dialog"]')).not.toBeVisible()

      // 验证节点名称未改变
      await expect(page.locator('[data-testid="node-name"]')).not.toHaveText('测试节点')
    })
  })

  test.describe('CI-003: 对话式创建交互', () => {
    test('输入和发送', async ({ page }) => {
      await page.goto('/workflows')
      await page.click('[data-testid="quick-task-button"]')

      // 输入
      await page.fill('[data-testid="chat-input"]', '测试输入')

      // 验证发送按钮启用
      await expect(page.locator('[data-testid="send-button"]')).toBeEnabled()

      // 发送
      await page.click('[data-testid="send-button"]')

      // 验证消息出现在聊天中
      await expect(page.locator('[data-testid="chat-message"]:has-text("测试输入")')).toBeVisible()
    })

    test('预览显示', async ({ page }) => {
      await page.goto('/workflows')
      await page.click('[data-testid="quick-task-button"]')

      await page.fill('[data-testid="chat-input"]', '每天早上9点发送邮件')
      await page.click('[data-testid="send-button"]')

      // 验证预览面板显示
      await expect(page.locator('[data-testid="task-preview"]')).toBeVisible({ timeout: 10000 })

      // 验证预览内容
      await expect(page.locator('[data-testid="workflow-name"]')).toBeVisible()
      await expect(page.locator('[data-testid="intent-badge"]')).toBeVisible()
    })

    test('创建和取消', async ({ page }) => {
      await page.goto('/workflows')
      await page.click('[data-testid="quick-task-button"]')

      await page.fill('[data-testid="chat-input"]', '测试任务')
      await page.click('[data-testid="send-button"]')

      await expect(page.locator('[data-testid="task-preview"]')).toBeVisible({ timeout: 10000 })

      // 取消
      await page.click('[data-testid="cancel-button"]')

      // 验证对话框关闭
      await expect(page.locator('[data-testid="task-creation-chat"]')).not.toBeVisible()
    })
  })

  test.describe('CI-004: 任务列表筛选', () => {
    test('筛选功能', async ({ page }) => {
      await page.goto('/executions')

      // 按状态筛选
      await page.selectOption('select[name="status-filter"]', 'completed')

      // 验证筛选结果
      const items = await page.locator('[data-testid="execution-item"]').all()
      for (const item of items) {
        const status = await item.locator('[data-testid="execution-status"]').textContent()
        expect(status).toMatch(/完成|completed/i)
      }
    })

    test('排序功能', async ({ page }) => {
      await page.goto('/executions')

      // 按时间排序
      await page.click('button:has-text("时间")')

      // 获取所有时间
      const times = await page.locator('[data-testid="execution-time"]').allTextContents()

      // 验证排序（降序）
      for (let i = 0; i < times.length - 1; i++) {
        expect(new Date(times[i]).getTime()).toBeGreaterThanOrEqual(new Date(times[i + 1]).getTime())
      }
    })

    test('分页功能', async ({ page }) => {
      await page.goto('/executions')

      // 验证分页控件
      await expect(page.locator('[data-testid="pagination"]')).toBeVisible()

      // 点击下一页
      await page.click('button:has-text("下一页")')

      // 验证页面变化
      await page.waitForTimeout(500)
      const currentPage = await page.locator('[data-testid="current-page"]').textContent()
      expect(currentPage).not.toBe('1')
    })
  })

  test.describe('CI-005: 实时通知交互', () => {
    test('通知弹出', async ({ page }) => {
      await page.goto('/dashboard')

      // 触发一个通知（通过 API 或其他方式）
      await page.evaluate(() => {
        // @ts-ignore
        window.dispatchEvent(new CustomEvent('notification', {
          detail: { type: 'success', message: '测试通知' },
        }))
      })

      // 验证通知弹出
      await expect(page.locator('[data-testid="notification"]')).toBeVisible({ timeout: 5000 })
    })

    test('通知关闭', async ({ page }) => {
      await page.goto('/dashboard')

      await page.evaluate(() => {
        // @ts-ignore
        window.dispatchEvent(new CustomEvent('notification', {
          detail: { type: 'success', message: '测试通知' },
        }))
      })

      await expect(page.locator('[data-testid="notification"]')).toBeVisible({ timeout: 5000 })

      // 关闭通知
      await page.click('[data-testid="close-notification"]')

      // 验证通知消失
      await expect(page.locator('[data-testid="notification"]')).not.toBeVisible()
    })

    test('通知跳转', async ({ page }) => {
      await page.goto('/dashboard')

      await page.evaluate(() => {
        // @ts-ignore
        window.dispatchEvent(new CustomEvent('notification', {
          detail: {
            type: 'success',
            message: '测试通知',
            action: { label: '查看', url: '/workflows' },
          },
        }))
      })

      await expect(page.locator('[data-testid="notification"]')).toBeVisible({ timeout: 5000 })

      // 点击操作按钮
      await page.click('[data-testid="notification-action"]')

      // 验证跳转
      await page.waitForURL('/workflows')
    })
  })

  test.describe('SM-001: 全局状态同步', () => {
    test('用户状态同步', async ({ page, context }) => {
      // 打开两个标签页
      const page2 = await context.newPage()
      await page2.goto('/dashboard')

      // 在第一个页面修改用户信息
      await page.goto('/settings/profile')
      await page.fill('input[name="display-name"]', '新名称')
      await page.click('button:has-text("保存")')

      // 验证第二个页面同步更新
      await page2.reload()
      await expect(page2.locator('text=新名称')).toBeVisible()

      await page2.close()
    })

    test('主题状态同步', async ({ page, context }) => {
      const page2 = await context.newPage()
      await page2.goto('/dashboard')

      // 切换主题
      await page.click('[data-testid="theme-toggle"]')

      // 验证第二个页面同步
      await page2.reload()
      const isDark = await page2.locator('html').getAttribute('class')
      expect(isDark).toContain('dark')

      await page2.close()
    })
  })

  test.describe('RT-001: 页面导航', () => {
    test('页面间导航', async ({ page }) => {
      await page.goto('/dashboard')

      // 导航到工作流
      await page.click('text=工作流')
      await page.waitForURL('/workflows')

      // 导航到执行
      await page.click('text=执行')
      await page.waitForURL('/executions')

      // 导航到设置
      await page.click('text=设置')
      await page.waitForURL('/settings')
    })

    test('深度链接', async ({ page }) => {
      // 直接访问深层 URL
      await page.goto('/workflows/test-workflow-id')

      // 验证页面正常加载
      await expect(page.locator('[data-testid="workflow-editor"]')).toBeVisible()
    })

    test('浏览器历史', async ({ page }) => {
      await page.goto('/dashboard')
      await page.click('text=工作流')
      await page.waitForURL('/workflows')

      // 后退
      await page.goBack()
      await page.waitForURL('/dashboard')

      // 前进
      await page.goForward()
      await page.waitForURL('/workflows')
    })
  })

  test.describe('RT-004: 权限重定向', () => {
    test('未登录重定向', async ({ page }) => {
      // 直接访问需要登录的页面
      await page.goto('/workflows')

      // 验证重定向到登录页
      await page.waitForURL('/login')
    })

    test('权限不足重定向', async ({ page }) => {
      // 以普通用户登录
      await page.goto('/login')
      await page.fill('input[name="email"]', 'test_user@example.com')
      await page.fill('input[name="password"]', 'test_password')
      await page.click('button[type="submit"]')

      // 尝试访问管理员页面
      await page.goto('/admin/users')

      // 验证重定向或显示权限不足
      const url = page.url()
      const hasPermissionError = (await page.locator('text=权限不足').count()) > 0

      expect(url.includes('/dashboard') || hasPermissionError).toBeTruthy()
    })
  })
})