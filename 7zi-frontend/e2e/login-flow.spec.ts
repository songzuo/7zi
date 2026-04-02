/**
 * E2E Test: Login Flow
 *
 * 测试登录流程的完整功能:
 * - 表单显示和验证
 * - 成功登录
 * - 登录失败处理
 * - 会话持久化
 * - 登出功能
 */

import { test, expect } from './fixtures/test.fixtures'
import { LoginPage } from './fixtures/types'
import { checkToast, clearStorage, setAuthToken, getTimestamp } from './helpers/test-helpers'

test.describe('登录流程', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    await clearStorage(page)
    await loginPage.goto()
  })

  test('应该显示登录表单', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/登录|Login/)

    // 验证表单字段
    await expect(loginPage.usernameInput).toBeVisible()
    await expect(loginPage.passwordInput).toBeVisible()
    await expect(loginPage.submitButton).toBeVisible()

    // 验证初始状态
    await expect(loginPage.submitButton).toBeDisabled()
  })

  test('应该启用登录按钮当表单填写完整', async ({ page }) => {
    await loginPage.usernameInput.fill('test@example.com')
    await expect(loginPage.submitButton).toBeDisabled()

    await loginPage.passwordInput.fill('Test123456!')
    await expect(loginPage.submitButton).toBeEnabled()
  })

  test('应该验证用户名格式', async ({ page }) => {
    // 空用户名
    await loginPage.usernameInput.fill('')
    await loginPage.passwordInput.fill('Test123456!')
    await loginPage.submitButton.click()

    // 检查错误提示
    const error = loginPage.usernameInput.locator('xpath=..').getByText(/必填|required/i)
    await expect(error).toBeVisible()
  })

  test('应该验证密码强度', async ({ page }) => {
    await loginPage.usernameInput.fill('test@example.com')

    // 简单密码 - 应该显示警告
    await loginPage.passwordInput.fill('123456')
    await expect(loginPage.passwordInput).toHaveAttribute('aria-invalid', 'true')

    // 强密码 - 应该通过验证
    await loginPage.passwordInput.fill('Test123456!')
    await expect(loginPage.passwordInput).toHaveAttribute('aria-invalid', 'false')
  })

  test('应该成功登录并跳转', async ({ page, user }) => {
    await loginPage.login(user.email, user.password)

    // 等待跳转
    await expect(page).toHaveURL(/\/dashboard|\/home/)

    // 验证成功提示
    await checkToast(page, /登录成功|login successful/i)

    // 验证会话存储
    const token = await page.evaluate(() => localStorage.getItem('auth_token'))
    expect(token).toBeTruthy()
  })

  test('应该显示错误信息当凭证无效', async ({ page }) => {
    await loginPage.login('invalid@example.com', 'WrongPassword123!')

    // 应该显示错误
    await loginPage.expectError(/用户名或密码错误|invalid credentials/i)

    // 不应该跳转
    await expect(page).toHaveURL(/\/login/)
  })

  test('应该显示错误信息当用户不存在', async ({ page }) => {
    await loginPage.login('nonexistent@example.com', 'Test123456!')

    await loginPage.expectError(/用户不存在|user not found/i)
  })

  test('应该显示加载状态', async ({ page, user }) => {
    // Mock API 延迟
    await page.route('**/api/auth/login', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.continue()
    })

    await loginPage.login(user.email, user.password)

    // 验证加载状态
    await expect(loginPage.submitButton).toHaveAttribute('data-loading', 'true')
    await expect(loginPage.submitButton).toContainText(/登录中|logging in/i)
  })

  test('应该支持记住我功能', async ({ page, user }) => {
    // 勾选"记住我"
    await page.getByLabel(/记住我|remember me/i).check()
    await loginPage.login(user.email, user.password)

    // 验证持久化 token
    const rememberToken = await page.evaluate(() => localStorage.getItem('remember_token'))
    expect(rememberToken).toBeTruthy()
  })

  test('应该成功登出', async ({ authenticatedPage }) => {
    // 找到登出按钮
    const logoutButton = authenticatedPage.getByRole('button', { name: /登出|logout/i })
    await logoutButton.click()

    // 确认登出
    await authenticatedPage.getByRole('button', { name: /确认|confirm/i }).click()

    // 验证跳转到登录页
    await expect(authenticatedPage).toHaveURL(/\/login/)

    // 验证会话已清除
    const token = await authenticatedPage.evaluate(() => localStorage.getItem('auth_token'))
    expect(token).toBeNull()
  })

  test('应该在 token 过期时自动登出', async ({ page }) => {
    // 设置过期的 token
    await setAuthToken(page, 'expired_token_' + Date.now())

    // Mock API 响应为 401
    await page.route('**/api/**', async route => {
      await route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'Token expired' }),
      })
    })

    // 访问需要认证的页面
    await page.goto('/dashboard')

    // 应该跳转到登录页并显示错误
    await expect(page).toHaveURL(/\/login/)
    await checkToast(page, /会话已过期|session expired/i)
  })

  test('应该处理网络错误', async ({ page, user }) => {
    // Mock 网络错误
    await page.route('**/api/auth/login', async route => {
      await route.abort('failed')
    })

    await loginPage.login(user.email, user.password)

    // 应该显示网络错误提示
    await loginPage.expectError(/网络连接失败|network error/i)
  })

  test('应该支持回车键提交表单', async ({ page, user }) => {
    await loginPage.usernameInput.fill(user.email)
    await loginPage.passwordInput.fill(user.password)

    // 在密码框按回车
    await loginPage.passwordInput.press('Enter')

    // 应该提交表单
    await expect(page).toHaveURL(/\/dashboard|\/home/)
  })

  test('应该显示密码可见性切换', async ({ page }) => {
    const toggleButton = loginPage.passwordInput.locator('xpath=..').getByRole('button')

    // 初始状态: 密码隐藏
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password')

    // 点击显示密码
    await toggleButton.click()
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'text')

    // 再次点击隐藏密码
    await toggleButton.click()
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password')
  })

  test('应该限制登录尝试次数', async ({ page }) => {
    const maxAttempts = 5

    // 尝试多次失败登录
    for (let i = 0; i < maxAttempts + 1; i++) {
      await loginPage.login('invalid@example.com', 'WrongPassword!')
      await page.waitForTimeout(100)
    }

    // 应该显示账号锁定提示
    await loginPage.expectError(/账号已锁定|account locked/i)

    // 登录按钮应该被禁用
    await expect(loginPage.submitButton).toBeDisabled()
  })
})

test.describe('会话持久化', () => {
  test('应该在新标签页保持登录状态', async ({ page, context, authenticatedPage }) => {
    // 在已认证的标签页中
    await authenticatedPage.goto('/dashboard')

    // 打开新标签页
    const newPage = await context.newPage()
    await newPage.goto('/dashboard')

    // 验证新标签页已认证
    await expect(newPage).toHaveURL(/\/dashboard/)

    const token = await newPage.evaluate(() => localStorage.getItem('auth_token'))
    expect(token).toBeTruthy()
  })

  test('应该处理跨设备登录', async ({ page }) => {
    // 这需要在真实环境中测试
    // 这里只记录测试场景

    test.skip(true, '需要真实环境测试')
  })
})

test.describe('可访问性', () => {
  test('登录表单应该符合可访问性标准', async ({ page }) => {
    await page.goto('/login')

    // 检查表单字段有标签
    await expect(page.getByLabel(/用户名|邮箱/)).toBeVisible()
    await expect(page.getByLabel('密码', { exact: true })).toBeVisible()

    // 检查密码切换按钮有 aria-label
    const toggleButton = page.getByRole('button', { name: /显示密码|hide password/i })
    await expect(toggleButton).toBeVisible()

    // 检查错误信息对屏幕阅读器可访问
    await expect(page.getByRole('alert')).toBeVisible()
  })

  test('应该支持键盘导航', async ({ page, user }) => {
    await page.goto('/login')

    // Tab 键导航
    await page.keyboard.press('Tab')
    await expect(page.getByLabel(/用户名|邮箱/)).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.getByLabel('密码', { exact: true })).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: /登录|Login/ })).toBeFocused()
  })
})
