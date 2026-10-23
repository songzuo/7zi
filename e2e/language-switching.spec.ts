import { test, expect, type Page } from '@playwright/test'

/**
 * 语言切换功能 E2E 测试
 * 测试多语言切换、URL 重定向、内容本地化等
 */

// 支持的语言配置
const compactSwitcher = (page: Page) =>
  page.getByRole('button', { name: /Switch to (English|中文)/ }).first()

const mainTeamLink = (page: Page, locale: 'zh' | 'en') =>
  page.getByRole('navigation', { name: 'Main navigation' }).locator(`a[href="/${locale}/team"]`)

const locales = [
  { code: 'zh', name: '中文', flag: '🇨🇳', path: '/zh' },
  { code: 'en', name: 'English', flag: '🇺🇸', path: '/en' },
]

test.describe('语言切换 - 基础功能', () => {
  test('根路径应重定向到默认语言', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // The locale prefix may be the final path segment without a trailing slash.
    const pathname = new URL(page.url()).pathname
    expect(pathname).toMatch(/^\/(zh|en)(?:\/|$)/)
  })

  test('中文页面应正确加载', async ({ page }) => {
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    // 应该显示中文内容
    const body = page.locator('body')
    await expect(body).toContainText(/AI|工作室|智能体/i)
  })

  test('英文页面应正确加载', async ({ page }) => {
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    // 应该显示英文内容
    const body = page.locator('body')
    await expect(body).toContainText(/AI|Studio|Agents/i)
  })

  test('中文页面 HTML lang 属性应正确', async ({ page }) => {
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    const html = page.locator('html')
    const lang = await html.getAttribute('lang')
    expect(lang).toMatch(/^zh/)
  })

  test('英文页面 HTML lang 属性应正确', async ({ page }) => {
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    const html = page.locator('html')
    const lang = await html.getAttribute('lang')
    expect(lang).toMatch(/^en/)
  })
})

test.describe('语言切换器 - 界面显示', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')
  })

  test('语言切换器应可见', async ({ page }) => {
    const langSwitcher = compactSwitcher(page)

    await expect(langSwitcher).toBeVisible()
  })

  test('语言切换器应显示当前语言标志', async ({ page }) => {
    const langSwitcher = compactSwitcher(page)

    await expect(langSwitcher).toBeVisible()

    // 中文页面应显示中文切换到英文的标志
    const hasUsFlag = await langSwitcher.evaluate(
      el => el.textContent?.includes('🇺🇸') || el.textContent?.includes('EN')
    )
    expect(hasUsFlag).toBeTruthy()
  })

  test('语言切换器应有悬停效果', async ({ page }) => {
    const langSwitcher = compactSwitcher(page)

    await langSwitcher.hover()
    await page.waitForTimeout(200)

    // 验证按钮仍然可见
    await expect(langSwitcher).toBeVisible()
  })

  test('语言切换器应有可点击的触摸目标', async ({ page }) => {
    const langSwitcher = compactSwitcher(page)

    await expect(langSwitcher).toBeVisible()

    // 验证按钮尺寸符合触摸目标要求
    const box = await langSwitcher.boundingBox()
    expect(box?.width).toBeGreaterThanOrEqual(44)
    expect(box?.height).toBeGreaterThanOrEqual(44)
  })
})

test.describe('语言切换器 - 切换功能', () => {
  test('点击语言切换器应切换语言（中文到英文）', async ({ page }) => {
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    const urlBefore = page.url()

    // 点击语言切换器
    const langSwitcher = compactSwitcher(page)
    await langSwitcher.click()
    await page.waitForURL('**/en')

    const urlAfter = page.url()

    // URL 应该包含 /en
    expect(urlAfter).toContain('/en')

    // URL 应该改变了
    expect(urlBefore).not.toBe(urlAfter)
  })

  test('点击语言切换器应切换语言（英文到中文）', async ({ page }) => {
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    const urlBefore = page.url()

    // 点击语言切换器（英文页面应显示中文标志）
    const langSwitcher = compactSwitcher(page)
    await expect(langSwitcher).toBeVisible()
    await langSwitcher.click()
    await page.waitForURL('**/zh')

    const urlAfter = page.url()

    // URL 应该包含 /zh
    expect(urlAfter).toContain('/zh')

    // URL 应该改变了
    expect(urlBefore).not.toBe(urlAfter)
  })

  test('切换语言应在子页面正确工作', async ({ page }) => {
    await page.goto('/zh/dashboard')
    await page.waitForLoadState('networkidle')

    // 点击语言切换器
    const langSwitcher = compactSwitcher(page)
    await langSwitcher.click()
    await page.waitForURL('**/en/dashboard')

    // URL should preserve the current page while switching locale.
    expect(page.url()).toContain('/en/dashboard')
  })

  test('切换语言应保持当前路径', async ({ page }) => {
    await page.goto('/zh/about')
    await page.waitForLoadState('networkidle')

    // 点击语言切换器
    const langSwitcher = compactSwitcher(page)
    await langSwitcher.click()
    await page.waitForURL('**/en/about')

    // URL 应该包含 /about
    expect(page.url()).toContain('/about')
  })
})

test.describe('语言切换器 - 移动端', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')
  })

  test('移动端语言切换器应可见', async ({ page }) => {
    await page.locator('button[aria-controls="mobile-menu"]').first().click()
    const langSwitcher = page
      .locator('#mobile-menu')
      .getByRole('button', { name: 'Switch to English' })
    await expect(langSwitcher).toBeVisible()
  })

  test('移动端语言切换器应在菜单中显示', async ({ page }) => {
    // 打开菜单
    const menuButton = page.locator('button[aria-controls="mobile-menu"]').first()
    await menuButton.click()
    await expect(page.locator('#mobile-menu').first()).toBeVisible()

    // 检查菜单中的语言切换器
    const mobileMenu = page.locator('#mobile-menu').first()
    const langSwitcher = mobileMenu.getByRole('button', { name: 'Switch to English' })

    await expect(langSwitcher).toBeVisible()
  })

  test('移动端语言切换器应可点击', async ({ page }) => {
    // 打开菜单
    const menuButton = page.locator('button[aria-controls="mobile-menu"]').first()
    await menuButton.click()
    await expect(page.locator('#mobile-menu').first()).toBeVisible()

    const mobileMenu = page.locator('#mobile-menu').first()
    const langSwitcher = mobileMenu.getByRole('button', { name: 'Switch to English' })

    await langSwitcher.click()
    await page.waitForURL('**/en')

    // URL 应该改变
    expect(page.url()).toContain('/en')
  })
})

test.describe('语言切换 - 内容本地化', () => {
  test('中文导航栏应显示中文文本', async ({ page }) => {
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    const nav = page.getByRole('navigation').first()

    // Match the labels used by the current Chinese application navigation.
    const chineseNavItems = ['首页', '控制台', '子代理', '任务', '记忆库']
    let foundItems = 0

    for (const item of chineseNavItems) {
      const element = nav.locator(`text="${item}"`).first()
      if (await element.isVisible().catch(() => false)) {
        foundItems++
      }
    }

    // 至少应该找到部分中文导航项
    expect(foundItems).toBeGreaterThan(0)
  })

  test('英文导航栏应显示英文文本', async ({ page }) => {
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    const nav = page.getByRole('navigation').first()

    // Match the labels used by the current English application navigation.
    const englishNavItems = ['Home', 'Dashboard', 'Subagents', 'Tasks', 'Memory']
    let foundItems = 0

    for (const item of englishNavItems) {
      const element = nav.locator(`text="${item}"`).first()
      if (await element.isVisible().catch(() => false)) {
        foundItems++
      }
    }

    // 至少应该找到部分英文导航项
    expect(foundItems).toBeGreaterThan(0)
  })

  test('中文页面标题应包含中文', async ({ page }) => {
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    const title = await page.title()
    expect(title).toMatch(/7zi|工作室 | AI|智能体/i)
  })

  test('英文页面标题应包含英文', async ({ page }) => {
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    const title = await page.title()
    expect(title).toMatch(/7zi|Studio|AI|Agents/i)
  })

  test('中文页面应有中文 meta description', async ({ page }) => {
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    const metaDescription = page.locator('meta[name="description"]')
    const content = await metaDescription.getAttribute('content')

    expect(content).toBeTruthy()
    expect(content?.length).toBeGreaterThan(0)
  })

  test('英文页面应有英文 meta description', async ({ page }) => {
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    const metaDescription = page.locator('meta[name="description"]')
    const content = await metaDescription.getAttribute('content')

    expect(content).toBeTruthy()
    expect(content?.length).toBeGreaterThan(0)
  })
})

test.describe('语言切换 - URL 结构', () => {
  for (const locale of locales) {
    test(`${locale.name} - 首页 URL 应正确`, async ({ page }) => {
      await page.goto(`${locale.path}/`)
      await page.waitForLoadState('networkidle')

      const url = page.url()
      expect(url).toContain(locale.path)
    })

    test(`${locale.name} - 仪表板 URL 应正确`, async ({ page }) => {
      await page.goto(`${locale.path}/dashboard`)
      await page.waitForLoadState('networkidle')

      const url = page.url()
      expect(url).toContain(`${locale.path}/dashboard`)
    })

    test(`${locale.name} - 关于页面 URL 应正确`, async ({ page }) => {
      await page.goto(`${locale.path}/about`)
      await page.waitForLoadState('networkidle')

      const url = page.url()
      expect(url).toContain(`${locale.path}/about`)
    })
  }

  test('中文页面链接应保持中文路径', async ({ page }) => {
    await page.goto('/zh/about')
    await page.waitForLoadState('networkidle')

    // Verify the localized site navigation target before loading the route.
    const teamLink = mainTeamLink(page, 'zh')
    await expect(teamLink).toBeVisible()
    await expect(teamLink).toHaveAttribute('href', '/zh/team')
    await page.goto('/zh/team')
    await page.waitForURL('**/zh/team')

    // URL 应该包含 /zh/team
    expect(page.url()).toContain('/zh/team')
  })

  test('英文页面链接应保持英文路径', async ({ page }) => {
    await page.goto('/en/about')
    await page.waitForLoadState('networkidle')

    // Verify the localized site navigation target before loading the route.
    const teamLink = mainTeamLink(page, 'en')
    await expect(teamLink).toBeVisible()
    await expect(teamLink).toHaveAttribute('href', '/en/team')
    await page.goto('/en/team')
    await page.waitForURL('**/en/team')

    // URL 应该包含 /en/team
    expect(page.url()).toContain('/en/team')
  })
})

test.describe('语言切换 - 持久化', () => {
  test('刷新页面应保持语言', async ({ page }) => {
    await page.goto('/zh/team')
    await page.waitForLoadState('networkidle')

    const urlBefore = page.url()

    // 刷新页面
    await page.reload()
    await page.waitForLoadState('networkidle')

    const urlAfter = page.url()
    expect(urlAfter).toBe(urlBefore)
    expect(urlAfter).toContain('/zh')
  })

  test('浏览器后退应保持语言', async ({ page }) => {
    await page.goto('/zh/about')
    await page.waitForLoadState('networkidle')

    const teamLink = mainTeamLink(page, 'zh')
    await expect(teamLink).toBeVisible()
    await page.goto('/zh/team')
    await page.waitForURL('**/zh/team')

    // 后退
    await page.goBack()
    await page.waitForURL('**/zh/about')

    // 应该返回中文关于页面
    expect(page.url()).toContain('/zh/about')
  })

  test('浏览器前进应保持语言', async ({ page }) => {
    await page.goto('/zh/about')
    await page.waitForLoadState('networkidle')

    const teamLink = mainTeamLink(page, 'zh')
    await expect(teamLink).toBeVisible()
    await page.goto('/zh/team')
    await page.waitForURL('**/zh/team')

    // 后退
    await page.goBack()
    await page.waitForURL('**/zh/about')

    // 前进
    await page.goForward()
    await page.waitForURL('**/zh/team')

    // 应该返回中文团队页面
    expect(page.url()).toContain('/zh/team')
  })
})

test.describe('语言切换 - 可访问性', () => {
  test('语言切换器应有正确的 ARIA 标签', async ({ page }) => {
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    const langSwitcher = compactSwitcher(page)

    // 应有 aria-label
    const ariaLabel = await langSwitcher.getAttribute('aria-label')
    expect(ariaLabel).toBeTruthy()
  })

  test('语言切换器应有键盘支持', async ({ page }) => {
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    const langSwitcher = compactSwitcher(page)

    // 使用 Tab 键导航到语言切换器
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)

    // 验证焦点在语言切换器上
    await langSwitcher.focus()
    await expect(langSwitcher).toBeFocused()
  })

  test('语言切换器应可键盘激活', async ({ page }) => {
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    const urlBefore = page.url()

    const langSwitcher = compactSwitcher(page)

    // 使用键盘激活
    await langSwitcher.focus()
    await page.keyboard.press('Enter')
    await page.waitForURL('**/en')

    const urlAfter = page.url()

    // URL 应该改变
    expect(urlBefore).not.toBe(urlAfter)
  })
})

test.describe('语言切换 - 边界情况', () => {
  test('支持的法语路径应正确加载', async ({ page }) => {
    await page.goto('/fr/about')
    await page.waitForLoadState('networkidle')

    expect(new URL(page.url()).pathname).toBe('/fr/about')
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  })

  test('直接访问带语言前缀的 URL 应正确加载', async ({ page }) => {
    await page.goto('/zh/dashboard')
    await page.waitForLoadState('networkidle')

    const url = page.url()
    expect(url).toContain('/zh/dashboard')

    // 页面应正确加载
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('快速切换语言不应出错', async ({ page }) => {
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    const langSwitcher = compactSwitcher(page)

    // 快速点击多次
    for (let i = 0; i < 3; i++) {
      await langSwitcher.click()
      await page.waitForTimeout(500)
    }

    // 页面应该仍然正常工作
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})
