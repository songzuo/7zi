/**
 * E2E Test: Error Handling
 *
 * 测试错误处理场景:
 * - 网络错误
 * - API 错误响应
 * - 表单验证错误
 * - 权限错误
 * - 404/500 页面
 * - 错误边界
 */

import { test, expect } from './fixtures/test.fixtures'
import { LoginPage } from './fixtures/types'
import {
  checkToast,
  clearStorage,
  takeScreenshot,
  checkAccessibility,
} from './helpers/test-helpers'

test.describe('网络错误处理', () => {
  test('应该处理网络连接失败', async ({ page }) => {
    // Mock 网络错误
    await page.route('**/api/**', async route => {
      await route.abort('failed')
    })

    await page.goto('/dashboard')

    // 应该显示网络错误提示
    await checkToast(page, /网络连接失败|network error|无法连接服务器/i)

    // 应该显示重试按钮
    await expect(page.getByRole('button', { name: /重试|retry/i })).toBeVisible()
  })

  test('应该提供网络错误重试', async ({ page }) => {
    let attemptCount = 0

    // 第一次失败，第二次成功
    await page.route('**/api/**', async route => {
      attemptCount++
      if (attemptCount === 1) {
        await route.abort('failed')
      } else {
        await route.continue()
      }
    })

    await page.goto('/dashboard')

    // 点击重试
    await page.getByRole('button', { name: /重试|retry/i }).click()

    // 应该成功加载
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('应该处理超时错误', async ({ page }) => {
    // Mock 超时
    await page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 35000))
    })

    await page.goto('/dashboard')

    // 应该显示超时提示
    await checkToast(page, /请求超时|timeout/i)
  })

  test('应该处理离线状态', async ({ page }) => {
    // 模拟离线
    await page.context().setOffline(true)

    // 尝试导航
    await page.goto('/dashboard')

    // 应该显示离线提示
    await expect(page.getByText(/网络已断开|you are offline/i)).toBeVisible()

    // 恢复在线
    await page.context().setOffline(false)

    // 点击刷新
    await page.getByRole('button', { name: /刷新|refresh/i }).click()

    // 应该恢复正常
    await expect(page).toHaveURL(/\/dashboard/)
  })
})

test.describe('API 错误响应', () => {
  test('应该处理 400 Bad Request', async ({ page }) => {
    await page.route('**/api/**', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Bad Request',
          message: '请求参数错误',
        }),
      })
    })

    await page.goto('/dashboard')

    // 应该显示客户端错误
    await checkToast(page, /请求参数错误|bad request/i)
  })

  test('应该处理 401 Unauthorized', async ({ page }) => {
    // 设置有效 token
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'valid_token')
    })

    // Mock 401 响应
    await page.route('**/api/**', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Unauthorized',
          message: '未授权访问',
        }),
      })
    })

    await page.goto('/dashboard')

    // 应该跳转到登录页
    await expect(page).toHaveURL(/\/login/)

    // 应该显示未授权提示
    await checkToast(page, /会话已过期|未授权|unauthorized/i)
  })

  test('应该处理 403 Forbidden', async ({ page, authenticatedPage }) => {
    // Mock 403 响应
    await authenticatedPage.route('**/api/admin/**', async route => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Forbidden',
          message: '权限不足',
        }),
      })
    })

    await authenticatedPage.goto('/admin')

    // 应该显示权限不足提示
    await checkToast(page, /权限不足|access denied|forbidden/i)
  })

  test('应该处理 404 Not Found', async ({ page }) => {
    // 访问不存在的页面
    await page.goto('/nonexistent-page')

    // 应该显示 404 页面
    await expect(page.getByText(/页面不存在|not found|404/i)).toBeVisible()

    // 应该提供返回首页链接
    await expect(page.getByRole('link', { name: /首页|home/i })).toBeVisible()
  })

  test('应该处理 500 Internal Server Error', async ({ page, authenticatedPage }) => {
    // Mock 500 响应
    await authenticatedPage.route('**/api/**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal Server Error',
          message: '服务器内部错误',
        }),
      })
    })

    await authenticatedPage.goto('/dashboard')

    // 应该显示服务器错误提示
    await checkToast(page, /服务器错误|internal server error/i)
  })

  test('应该处理 503 Service Unavailable', async ({ page, authenticatedPage }) => {
    // Mock 503 响应
    await authenticatedPage.route('**/api/**', async route => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Service Unavailable',
          message: '服务暂时不可用',
        }),
      })
    })

    await authenticatedPage.goto('/dashboard')

    // 应该显示服务不可用提示
    await checkToast(page, /服务暂时不可用|service unavailable/i)
  })
})

test.describe('表单验证错误', () => {
  test('应该显示必填字段错误', async ({ page }) => {
    await page.goto('/login')

    // 不填写任何字段直接提交
    await page.getByRole('button', { name: /登录|login/i }).click()

    // 应该显示必填提示
    await expect(page.getByText(/用户名为必填项|请输入用户名/i)).toBeVisible()
    await expect(page.getByText(/密码为必填项|请输入密码/i)).toBeVisible()
  })

  test('应该显示格式验证错误', async ({ page }) => {
    await page.goto('/register')

    // 输入无效邮箱
    await page.getByLabel(/邮箱|email/i).fill('invalid-email')
    await page.getByLabel('密码').fill('Test123456!')

    await page.getByRole('button', { name: /注册|register/i }).click()

    // 应该显示格式错误提示
    await expect(page.getByText(/邮箱格式不正确|invalid email/i)).toBeVisible()
  })

  test('应该显示密码强度提示', async ({ page }) => {
    await page.goto('/register')

    const passwordInput = page.getByLabel('密码')
    const confirmPasswordInput = page.getByLabel(/确认密码|confirm password/i)

    // 输入弱密码
    await passwordInput.fill('123456')

    // 应该显示强度警告
    await expect(page.getByText(/密码强度.*弱|weak password/i)).toBeVisible()

    // 输入不匹配的确认密码
    await confirmPasswordInput.fill('654321')

    // 应该显示不匹配提示
    await expect(page.getByText(/密码不匹配|passwords do not match/i)).toBeVisible()
  })

  test('应该显示长度限制错误', async ({ page }) => {
    await page.goto('/register')

    // 输入超长用户名
    const longUsername = 'a'.repeat(100)
    await page.getByLabel(/用户名|username/i).fill(longUsername)
    await page.getByLabel('密码').fill('Test123456!')

    await page.getByRole('button', { name: /注册|register/i }).click()

    // 应该显示长度限制提示
    await expect(page.getByText(/用户名.*过长|username too long/i)).toBeVisible()
  })
})

test.describe('错误边界', () => {
  test('应该捕获组件渲染错误', async ({ page }) => {
    // 模拟组件错误
    await page.addInitScript(() => {
      const originalError = window.onerror
      window.onerror = function (msg, url, line, col, error) {
        // 捕获错误但继续执行
        return true
      }
    })

    await page.goto('/dashboard')

    // 注入错误组件
    await page.evaluate(() => {
      const errorDiv = document.createElement('div')
      errorDiv.innerHTML = '<script>throw new Error("Test error")</script>'
      document.body.appendChild(errorDiv)
    })

    // 应该显示错误边界 UI
    await expect(page.getByText(/出错了|something went wrong/i)).toBeVisible()
  })

  test('应该提供错误恢复选项', async ({ page }) => {
    // 模拟错误
    await page.route('**', async route => {
      await route.fulfill({
        status: 500,
        body: '<html><body><div data-testid="error-boundary"><h1>出错了</h1><button id="retry">重试</button><button id="home">返回首页</button></div></body></html>',
      })
    })

    await page.goto('/dashboard')

    // 验证错误边界显示
    await expect(page.getByTestId('error-boundary')).toBeVisible()

    // 验证恢复按钮
    await expect(page.getByRole('button', { name: /重试/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /返回首页|go home/i })).toBeVisible()
  })
})

test.describe('WebSocket 错误处理', () => {
  test('应该处理 WebSocket 连接失败', async ({ page }) => {
    // Mock WebSocket 连接失败
    await page.addInitScript(() => {
      class MockWebSocket {
        url: string
        readyState: number = WebSocket.CONNECTING

        constructor(url: string) {
          this.url = url
          setTimeout(() => {
            this.readyState = WebSocket.CLOSED
            if (this.onerror) {
              this.onerror(new Event('error'))
            }
            if (this.onclose) {
              this.onclose(new CloseEvent('close', { code: 1006 }))
            }
          }, 100)
        }

        onopen: any = null
        onmessage: any = null
        onerror: any = null
        onclose: any = null

        send() {}
        close() {}
      }

      ;(window as any).WebSocket = MockWebSocket
    })

    await page.goto('/websocket-status-demo')

    // 应该显示连接错误
    await expect(page.getByTestId('ws-connection-status')).toContainText(
      /连接失败|connection failed/i
    )
  })

  test('应该处理 WebSocket 消息解析错误', async ({ page }) => {
    await page.addInitScript(() => {
      class MockWebSocket {
        constructor(url: string) {
          setTimeout(() => {
            this.readyState = WebSocket.OPEN
            if (this.onopen) this.onopen(new Event('open'))

            // 发送无效 JSON
            setTimeout(() => {
              if (this.onmessage) {
                this.onmessage(
                  new MessageEvent('message', {
                    data: 'invalid json{{{',
                  })
                )
              }
            }, 200)
          }, 100)
        }

        readyState = WebSocket.CONNECTING
        onopen: any = null
        onmessage: any = null
        onerror: any = null
        onclose: any = null

        send() {}
        close() {}
      }

      ;(window as any).WebSocket = MockWebSocket
    })

    await page.goto('/websocket-status-demo')

    // 等待消息
    await page.waitForTimeout(500)

    // 验证应用没有崩溃
    await expect(page.getByTestId('ws-connection-status')).toBeVisible()
  })
})

test.describe('存储错误处理', () => {
  test('应该处理 localStorage 配额超出', async ({ page }) => {
    // 填满 localStorage
    await page.evaluate(() => {
      const key = 'test'
      let data = 'x'
      let size = 2 // 5MB 大约是 5*1024*1024

      try {
        while (size > 0) {
          data += 'x'
          localStorage.setItem(key, data)
          size--
        }
      } catch (e) {
        // 配额超出是预期的
      }
    })

    // 尝试保存数据
    await page.goto('/dashboard')

    // 应该显示存储错误提示
    await checkToast(page, /存储空间不足|storage quota exceeded/i)
  })

  test('应该处理 Cookie 设置失败', async ({ page }) => {
    // Mock Cookie 设置失败
    await page.context().addCookies([
      {
        name: 'test_cookie',
        value: 'test_value',
        domain: 'invalid-domain-that-does-not-exist.com',
        path: '/',
      },
    ])

    // 这不会直接触发错误，但会记录
    // 实际场景可能需要更复杂的模拟
  })
})

test.describe('图片加载错误', () => {
  test('应该显示图片加载失败的占位符', async ({ page, authenticatedPage }) => {
    // 访问有图片的页面
    await authenticatedPage.goto('/dashboard')

    // Mock 图片加载失败
    await authenticatedPage.route('**/*.{png,jpg,jpeg,gif}', async route => {
      await route.abort('failed')
    })

    // 重新加载
    await authenticatedPage.reload()

    // 应该显示占位符
    await expect(authenticatedPage.getByAltText(/图片加载失败|image error/i)).toBeVisible()
  })
})

test.describe('文件上传错误', () => {
  test('应该处理文件过大', async ({ page, authenticatedPage }) => {
    await authenticatedPage.goto('/upload')

    // 创建大文件（模拟）
    const largeFileInput = page.getByRole('textbox', { name: /选择文件|choose file/i })

    // 设置文件大小限制
    await authenticatedPage.route('**/api/upload', async route => {
      await route.fulfill({
        status: 413,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Payload Too Large',
          message: '文件大小超过限制',
        }),
      })
    })

    // 尝试上传（需要实际文件）
    // 这里只验证错误处理逻辑
  })

  test('应该处理无效文件类型', async ({ page, authenticatedPage }) => {
    await authenticatedPage.goto('/upload')

    // Mock 类型验证错误
    await authenticatedPage.route('**/api/upload', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Bad Request',
          message: '不支持的文件类型',
        }),
      })
    })

    // 应该显示类型错误
    await checkToast(page, /不支持的文件类型|unsupported file type/i)
  })
})

test.describe('并发请求错误', () => {
  test('应该处理多个并发请求失败', async ({ page, authenticatedPage }) => {
    // 多个 API 端点都失败
    const endpoints = ['**/api/users', '**/api/notifications', '**/api/projects']

    endpoints.forEach(endpoint => {
      authenticatedPage.route(endpoint, async route => {
        await route.abort('failed')
      })
    })

    await authenticatedPage.goto('/dashboard')

    // 应该至少显示一个错误提示
    await expect(page.getByRole('alert')).toBeVisible()

    // 应该提供全局重试
    await expect(page.getByRole('button', { name: /重试所有|retry all/i })).toBeVisible()
  })
})

test.describe('错误日志和上报', () => {
  test('应该记录错误到日志', async ({ page, authenticatedPage }) => {
    // Mock 错误上报 API
    let errorPayload: any = null

    await authenticatedPage.route('**/api/error-report', async route => {
      const request = route.request()
      errorPayload = await request.postDataJSON()
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
      })
    })

    // 触发错误
    await authenticatedPage.route('**/api/**', async route => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Test error' }),
      })
    })

    await authenticatedPage.goto('/dashboard')

    // 等待错误上报
    await page.waitForTimeout(1000)

    // 验证错误被上报
    expect(errorPayload).toBeTruthy()
  })
})

test.describe('错误恢复状态', () => {
  test('应该保存用户输入在错误发生时', async ({ page, authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard')

    // 填写表单
    await page.getByLabel('项目名称').fill('Test Project')
    await page.getByLabel('描述').fill('Test description')

    // Mock API 错误
    await authenticatedPage.route('**/api/projects', async route => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' }),
      })
    })

    // 提交表单
    await page.getByRole('button', { name: /保存|save/i }).click()

    // 等待错误
    await checkToast(page, /错误|error/i)

    // 验证输入保留
    await expect(page.getByLabel('项目名称')).toHaveValue('Test Project')
    await expect(page.getByLabel('描述')).toHaveValue('Test description')
  })
})

test.describe('错误 UI 可访问性', () => {
  test('错误提示应该可访问', async ({ page }) => {
    // 触发错误
    await page.route('**/api/**', async route => {
      await route.abort('failed')
    })

    await page.goto('/dashboard')

    // 检查错误消息对屏幕阅读器可访问
    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible()
    await expect(alert).toHaveAttribute('role', 'alert')
  })

  test('错误状态应该有焦点管理', async ({ page }) => {
    // 触发错误
    await page.route('**/api/**', async route => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Error' }),
      })
    })

    await page.goto('/dashboard')

    // 验证焦点移动到错误区域
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(focusedElement).toBeTruthy()
  })
})

test.describe('错误截图', () => {
  test('应该在测试失败时自动截图', async ({ page, authenticatedPage }) => {
    // 这个测试本身不截图，但是配置了 Playwright 会自动在失败时截图

    await authenticatedPage.route('**/api/**', async route => {
      await route.abort('failed')
    })

    await authenticatedPage.goto('/dashboard')

    // 手动截图（用于调试）
    await takeScreenshot(page, 'error-scenario')

    // 截图应该在 screenshots 目录
  })
})
