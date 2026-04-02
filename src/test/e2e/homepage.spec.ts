import { test, expect } from '@playwright/test'

/**
 * 首页加载和渲染 E2E 测试
 * 测试首页的完整加载、渲染和关键元素显示
 */

test.describe('首页 - 加载和渲染', () => {
  test('根路径应重定向到默认语言', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 验证 URL 包含语言前缀或已正确重定向
    const url = page.url()
    const hasLocale = /\/(zh|en)\//.test(url)
    expect(hasLocale).toBeTruthy()
  })

  test('中文首页应正确加载', async ({ page }) => {
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    // 验证页面标题
    await expect(page).toHaveTitle(/7zi|首页|工作室/)

    // 验证页面已渲染
    await expect(page.locator('body')).toBeVisible()
  })

  test('英文首页应正确加载', async ({ page }) => {
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    // 验证页面标题
    await expect(page).toHaveTitle(/7zi|Home|Studio/)

    // 验证页面已渲染
    await expect(page.locator('body')).toBeVisible()
  })

  test('首页应包含导航栏', async ({ page }) => {
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    // 验证导航栏可见
    const nav = page.locator('nav').first()
    await expect(nav).toBeVisible()

    // 验证导航栏包含 logo
    const logo = nav.locator('a').first()
    await expect(logo).toBeVisible()

    // 验证导航栏包含主要链接
    const homeLink = nav.locator('a[href="/"], a[href*="/zh/"]').first()
    await expect(homeLink).toBeVisible()
  })

  test('首页应包含语言切换器', async ({ page }) => {
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    // 查找语言切换器
    const langSwitcher = page
      .locator(
        'button:has-text("🇺🇸"), button:has-text("EN"), ' +
          '[aria-label*="language"], [aria-label*="Language"]'
      )
      .first()

    // 语言切换器应该可见
    await expect(langSwitcher).toBeVisible()
  })

  test('首页应包含主题切换器', async ({ page }) => {
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    // 查找主题切换器
    const themeToggle = page
      .locator(
        'button:has-text("🌙"), button:has-text("☀️"), ' +
          '[aria-label*="theme"], [aria-label*="Theme"], ' +
          '[data-testid="theme-toggle"]'
      )
      .first()

    // 主题切换器应该可见
    await expect(themeToggle).toBeVisible()
  })

  test('首页应在合理时间内加载完成', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime

    // 页面应在 10 秒内加载完成
    expect(loadTime).toBeLessThan(10000)
  })

  test('首页应包含主要内容区域', async ({ page }) => {
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    // 验证页面包含可见内容
    const mainContent = page.locator('main, [role="main"], .main-content, body').first()
    await expect(mainContent).toBeVisible()

    // 验证内容包含关键词
    await expect(page.locator('body')).toContainText(/AI|工作室|Studio|智能体/i)
  })

  test('首页应包含页脚', async ({ page }) => {
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    // 查找页脚元素
    const footer = page.locator('footer, [role="contentinfo"]').first()
    await expect(footer).toBeVisible()
  })

  test('首页应响应式适配移动端', async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    // 导航栏应在移动端仍然可见
    const nav = page.locator('nav').first()
    await expect(nav).toBeVisible()

    // 应有移动端菜单按钮
    const menuButton = page.locator('button[aria-label*="menu"], button:has-text("☰")').first()
    await expect(menuButton).toBeVisible()
  })

  test('首页应响应式适配桌面端', async ({ page }) => {
    // 设置桌面端视口
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    // 导航栏应可见
    const nav = page.locator('nav').first()
    await expect(nav).toBeVisible()

    // 应该有桌面导航链接
    const desktopLinks = nav.locator('a')
    const count = await desktopLinks.count()
    expect(count).toBeGreaterThan(0)
  })

  test('首页应无控制台错误', async ({ page }) => {
    const errors: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    // 应该没有控制台错误
    expect(errors.length).toBe(0)
  })

  test('首页应支持键盘导航', async ({ page }) => {
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    // 测试 Tab 键导航
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)

    // 验证焦点在某个可聚焦元素上
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toHaveCount(1)
  })
})

test.describe('首页 - 性能优化', () => {
  test('首页应优化的图片加载', async ({ page }) => {
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    // 检查图片是否加载
    const images = page.locator('img')
    const count = await images.count()

    if (count > 0) {
      // 验证图片有 alt 属性
      for (let i = 0; i < Math.min(count, 10); i++) {
        const img = images.nth(i)
        const alt = await img.getAttribute('alt')
        // alt 属性应该存在
        expect(alt).toBeTruthy()
      }
    }
  })

  test('首页应优化的字体加载', async ({ page }) => {
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    // 验证文本内容可见
    const textContent = page.locator('body')
    await expect(textContent).toBeVisible()
  })
})

test.describe('首页 - SEO 元数据', () => {
  test('中文首页应有正确的 meta 标签', async ({ page }) => {
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    // 验证 meta description
    const description = page.locator('meta[name="description"]')
    await expect(description).toHaveCount(1)

    const content = await description.getAttribute('content')
    expect(content).toBeTruthy()
    expect(content?.length).toBeGreaterThan(0)
  })

  test('英文首页应有正确的 meta 标签', async ({ page }) => {
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    // 验证 meta description
    const description = page.locator('meta[name="description"]')
    await expect(description).toHaveCount(1)

    const content = await description.getAttribute('content')
    expect(content).toBeTruthy()
    expect(content?.length).toBeGreaterThan(0)
  })

  test('首页应有正确的 canonical URL', async ({ page }) => {
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    // 验证 canonical 链接
    const canonical = page.locator('link[rel="canonical"]')
    await expect(canonical).toHaveCount(1)
  })

  test('首页 HTML lang 属性应正确', async ({ page }) => {
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    // 验证 HTML lang 属性
    const html = page.locator('html')
    const lang = await html.getAttribute('lang')
    expect(lang).toMatch(/^zh/)
  })
})
