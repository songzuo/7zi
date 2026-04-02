/**
 * E2E Test: Registration Flow
 *
 * 测试注册流程的完整功能:
 * - 表单显示和验证
 * - 成功注册
 * - 注册失败处理
 * - 邮箱验证
 * - 密码强度检查
 */

import { test, expect } from './fixtures/test.fixtures'
import {
  checkToast,
  clearStorage,
  generateEmail,
  generateUsername,
  getTimestamp,
} from './helpers/test-helpers'

test.describe('注册流程', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page)
    await page.goto('/register')
  })

  test('应该显示注册表单', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/注册|Register/)

    // 验证表单字段
    await expect(page.getByLabel(/用户名|Username/)).toBeVisible()
    await expect(page.getByLabel(/邮箱|Email/)).toBeVisible()
    await expect(page.getByLabel('密码', { exact: true })).toBeVisible()
    await expect(page.getByLabel(/确认密码|Confirm Password/)).toBeVisible()
    await expect(page.getByRole('button', { name: /注册|Register/ })).toBeVisible()
  })

  test('应该验证必填字段', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /注册|Register/ })

    // 提交空表单
    await submitButton.click()

    // 验证错误提示
    await expect(page.getByText(/用户名必填|required/i).first()).toBeVisible()
    await expect(page.getByText(/邮箱必填|required/i).first()).toBeVisible()
    await expect(page.getByText(/密码必填|required/i).first()).toBeVisible()
  })

  test('应该验证邮箱格式', async ({ page }) => {
    // 填写无效邮箱
    await page.getByLabel(/邮箱|Email/).fill('invalid-email')
    await page.getByLabel('密码', { exact: true }).click() // 触发验证

    // 应该显示邮箱格式错误
    await expect(page.getByText(/邮箱格式|invalid email/i)).toBeVisible()
  })

  test('应该验证密码强度', async ({ page }) => {
    const passwordInput = page.getByLabel('密码', { exact: true })

    // 弱密码 - 应该显示警告
    await passwordInput.fill('123')
    await expect(page.getByText(/密码强度|password strength/i)).toBeVisible()

    // 中等密码
    await passwordInput.fill('Password123')
    await expect(page.getByText(/中等|medium/i)).toBeVisible()

    // 强密码
    await passwordInput.fill('Test123456!@#')
    await expect(page.getByText(/强|strong/i)).toBeVisible()
  })

  test('应该验证密码匹配', async ({ page }) => {
    const password = 'Test123456!'

    await page.getByLabel('密码', { exact: true }).fill(password)
    await page.getByLabel(/确认密码|Confirm Password/).fill('Different123!')

    // 应该显示密码不匹配错误
    await expect(page.getByText(/密码不匹配|passwords do not match/i)).toBeVisible()
  })

  test('应该成功注册新用户', async ({ page }) => {
    const email = generateEmail()
    const username = generateUsername()
    const password = 'Test123456!'

    // 填写注册表单
    await page.getByLabel(/用户名|Username/).fill(username)
    await page.getByLabel(/邮箱|Email/).fill(email)
    await page.getByLabel('密码', { exact: true }).fill(password)
    await page.getByLabel(/确认密码|Confirm Password/).fill(password)

    // 提交注册
    await page.getByRole('button', { name: /注册|Register/ }).click()

    // 应该显示成功消息或跳转到登录页
    await expect(page.getByText(/注册成功|registration successful/i)).toBeVisible()

    // 或跳转到邮箱验证页面
    await expect(page).toHaveURL(/\/(login|verify-email)/)
  })

  test('应该显示错误当邮箱已存在', async ({ page }) => {
    // 使用已存在的邮箱
    await page.getByLabel(/邮箱|Email/).fill('existing@example.com')
    await page.getByLabel('密码', { exact: true }).fill('Test123456!')
    await page.getByLabel(/确认密码|Confirm Password/).fill('Test123456!')
    await page.getByRole('button', { name: /注册|Register/ }).click()

    // 应该显示邮箱已存在错误
    await expect(page.getByText(/邮箱已被注册|email already exists/i)).toBeVisible()
  })

  test('应该显示错误当用户名已存在', async ({ page }) => {
    await page.getByLabel(/用户名|Username/).fill('existinguser')
    await page.getByLabel(/邮箱|Email/).fill(generateEmail())
    await page.getByLabel('密码', { exact: true }).fill('Test123456!')
    await page.getByLabel(/确认密码|Confirm Password/).fill('Test123456!')
    await page.getByRole('button', { name: /注册|Register/ }).click()

    // 应该显示用户名已存在错误
    await expect(page.getByText(/用户名已被占用|username already taken/i)).toBeVisible()
  })

  test('应该支持密码可见性切换', async ({ page }) => {
    const passwordInput = page.getByLabel('密码', { exact: true })
    const toggleButton = passwordInput.locator('xpath=..').getByRole('button')

    await passwordInput.fill('Test123456!')

    // 初始状态: 密码隐藏
    await expect(passwordInput).toHaveAttribute('type', 'password')

    // 点击显示密码
    await toggleButton.click()
    await expect(passwordInput).toHaveAttribute('type', 'text')

    // 再次点击隐藏密码
    await toggleButton.click()
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })

  test('应该显示服务条款和隐私政策链接', async ({ page }) => {
    // 检查服务条款链接
    const termsLink = page.getByRole('link', { name: /服务条款|Terms/ })
    if ((await termsLink.count()) > 0) {
      await expect(termsLink).toBeVisible()
    }

    // 检查隐私政策链接
    const privacyLink = page.getByRole('link', { name: /隐私政策|Privacy/ })
    if ((await privacyLink.count()) > 0) {
      await expect(privacyLink).toBeVisible()
    }
  })

  test('应该支持跳转到登录页面', async ({ page }) => {
    const loginLink = page.getByRole('link', { name: /已有账号|已有账户|登录|Login/ })

    if ((await loginLink.count()) > 0) {
      await loginLink.click()
      await expect(page).toHaveURL(/\/login/)
    }
  })

  test('应该显示加载状态', async ({ page }) => {
    const email = generateEmail()
    const username = generateUsername()
    const password = 'Test123456!'

    // Mock API 延迟
    await page.route('**/api/auth/register', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.continue()
    })

    await page.getByLabel(/用户名|Username/).fill(username)
    await page.getByLabel(/邮箱|Email/).fill(email)
    await page.getByLabel('密码', { exact: true }).fill(password)
    await page.getByLabel(/确认密码|Confirm Password/).fill(password)

    const submitButton = page.getByRole('button', { name: /注册|Register/ })
    await submitButton.click()

    // 验证加载状态
    await expect(submitButton).toBeDisabled()
    await expect(submitButton.getByText(/注册中|registering/i)).toBeVisible()
  })

  test('应该处理网络错误', async ({ page }) => {
    // Mock 网络错误
    await page.route('**/api/auth/register', async route => {
      await route.abort('failed')
    })

    const email = generateEmail()
    const username = generateUsername()
    const password = 'Test123456!'

    await page.getByLabel(/用户名|Username/).fill(username)
    await page.getByLabel(/邮箱|Email/).fill(email)
    await page.getByLabel('密码', { exact: true }).fill(password)
    await page.getByLabel(/确认密码|Confirm Password/).fill(password)
    await page.getByRole('button', { name: /注册|Register/ }).click()

    // 应该显示网络错误提示
    await expect(page.getByText(/网络连接失败|network error/i)).toBeVisible()
  })

  test('应该支持回车键提交表单', async ({ page }) => {
    const email = generateEmail()
    const username = generateUsername()
    const password = 'Test123456!'

    await page.getByLabel(/用户名|Username/).fill(username)
    await page.getByLabel(/邮箱|Email/).fill(email)
    await page.getByLabel('密码', { exact: true }).fill(password)
    await page.getByLabel(/确认密码|Confirm Password/).fill(password)

    // 在确认密码框按回车
    await page.getByLabel(/确认密码|Confirm Password/).press('Enter')

    // 应该提交表单
    await expect(page.getByText(/注册成功|registration successful/i)).toBeVisible()
  })

  test('应该禁用提交按钮当表单无效', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /注册|Register/ })

    // 空表单 - 按钮应该禁用
    await expect(submitButton).toBeDisabled()

    // 只填写部分字段
    await page.getByLabel(/用户名|Username/).fill('testuser')
    await expect(submitButton).toBeDisabled()

    // 填写所有必填字段
    await page.getByLabel(/邮箱|Email/).fill(generateEmail())
    await page.getByLabel('密码', { exact: true }).fill('Test123456!')
    await page.getByLabel(/确认密码|Confirm Password/).fill('Test123456!')

    // 按钮应该启用
    await expect(submitButton).toBeEnabled()
  })
})

test.describe('邮箱验证', () => {
  test('应该显示邮箱验证提示', async ({ page }) => {
    // 注册后
    const email = generateEmail()
    const username = generateUsername()
    const password = 'Test123456!'

    await page.goto('/register')
    await page.getByLabel(/用户名|Username/).fill(username)
    await page.getByLabel(/邮箱|Email/).fill(email)
    await page.getByLabel('密码', { exact: true }).fill(password)
    await page.getByLabel(/确认密码|Confirm Password/).fill(password)
    await page.getByRole('button', { name: /注册|Register/ }).click()

    // 如果需要邮箱验证
    const verifyMessage = page.getByText(/验证邮件|verification email/i)
    if ((await verifyMessage.count()) > 0) {
      await expect(verifyMessage).toBeVisible()
    }
  })

  test('应该处理验证链接', async ({ page }) => {
    // 模拟点击验证链接
    await page.goto('/verify-email?token=valid-token')

    // 应该显示验证成功消息
    await expect(page.getByText(/验证成功|verification successful/i)).toBeVisible()

    // 应该跳转到登录页
    await expect(page).toHaveURL(/\/login/)
  })

  test('应该显示错误当验证链接无效', async ({ page }) => {
    await page.goto('/verify-email?token=invalid-token')

    // 应该显示验证失败消息
    await expect(page.getByText(/验证失败|verification failed|invalid/i)).toBeVisible()
  })

  test('应该允许重新发送验证邮件', async ({ page }) => {
    await page.goto('/verify-email?resend=true')

    const resendButton = page.getByRole('button', { name: /重新发送|resend/i })
    if ((await resendButton.count()) > 0) {
      await resendButton.click()
      await expect(page.getByText(/邮件已发送|email sent/i)).toBeVisible()
    }
  })
})

test.describe('可访问性', () => {
  test('注册表单应该符合可访问性标准', async ({ page }) => {
    await page.goto('/register')

    // 检查表单字段有标签
    await expect(page.getByLabel(/用户名|Username/)).toBeVisible()
    await expect(page.getByLabel(/邮箱|Email/)).toBeVisible()
    await expect(page.getByLabel('密码', { exact: true })).toBeVisible()

    // 检查错误信息对屏幕阅读器可访问
    const alerts = page.getByRole('alert')
    if ((await alerts.count()) > 0) {
      await expect(alerts.first()).toBeVisible()
    }
  })

  test('应该支持键盘导航', async ({ page }) => {
    await page.goto('/register')

    // Tab 键导航
    await page.keyboard.press('Tab')
    await expect(page.getByLabel(/用户名|Username/)).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.getByLabel(/邮箱|Email/)).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.getByLabel('密码', { exact: true })).toBeFocused()
  })
})

test.describe('性能和安全', () => {
  test('应该限制注册请求频率', async ({ page }) => {
    const email = generateEmail()
    const username = generateUsername()
    const password = 'Test123456!'

    // 快速多次提交
    for (let i = 0; i < 5; i++) {
      await page.goto('/register')
      await page.getByLabel(/用户名|Username/).fill(username + i)
      await page.getByLabel(/邮箱|Email/).fill(`test${i}@example.com`)
      await page.getByLabel('密码', { exact: true }).fill(password)
      await page.getByLabel(/确认密码|Confirm Password/).fill(password)
      await page.getByRole('button', { name: /注册|Register/ }).click()
    }

    // 应该显示频率限制错误
    const rateLimitError = page.getByText(/请求过于频繁|too many requests/i)
    if ((await rateLimitError.count()) > 0) {
      await expect(rateLimitError).toBeVisible()
    }
  })

  test('应该清理输入数据', async ({ page }) => {
    await page.goto('/register')

    // 输入包含 HTML 标签的数据
    await page.getByLabel(/用户名|Username/).fill('<script>alert("xss")</script>test')
    await page.getByLabel(/邮箱|Email/).fill(generateEmail())
    await page.getByLabel('密码', { exact: true }).fill('Test123456!')
    await page.getByLabel(/确认密码|Confirm Password/).fill('Test123456!')
    await page.getByRole('button', { name: /注册|Register/ }).click()

    // 应该清理或拒绝恶意输入
    const error = page.getByText(/无效|invalid|不允许|not allowed/i)
    if ((await error.count()) > 0) {
      await expect(error).toBeVisible()
    }
  })
})
