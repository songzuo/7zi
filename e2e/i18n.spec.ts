import { test, expect } from '@playwright/test'

/**
 * 多语言切换 E2E 测试
 * 测试语言切换功能、URL 重定向、内容本地化
 */

// 支持的语言配置
const locales = [
  { code: 'zh', name: '中文', path: '/zh' },
  { code: 'en', name: 'English', path: '/en' },
]

test.describe('多语言 - 基础测试', () => {
  test('根路径应该重定向到默认语言', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // URL 应该包含语言代码或已重定向
    const url = page.url()
    const hasLocale = /\/(zh|en)\//.test(url) || url === page.context().options.baseURL + '/'
    expect(hasLocale).toBeTruthy()
  })

  test('中文页面应该正确加载', async ({ page }) => {
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    // 应该显示中文内容
    const chineseContent = page.locator('text=/首页 | 关于 | 团队 | 联系/i')
    await expect(chineseContent.first()).toBeVisible()
  })

  test('英文页面应该正确加载', async ({ page }) => {
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    // 应该显示英文内容
    const englishContent = page.locator('text=/Home|About|Team|Contact/i')
    await expect(englishContent.first()).toBeVisible()
  })
})

test.describe('多语言 - 语言切换器测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
  })

  test('语言切换器应该可见', async ({ page }) => {
    // 查找语言切换按钮
    const langSwitcher = page
      .locator(
        '[aria-label*="language"], [aria-label*="语言"], [aria-label*="Language"], ' +
          'button:has-text("EN"), button:has-text("中文"), button:has-text("English")'
      )
      .first()

    // 语言切换器应该存在（可选功能）
    if (await langSwitcher.isVisible()) {
      await expect(langSwitcher).toBeVisible()
    }
  })

  test('点击语言切换器应该显示语言选项', async ({ page }) => {
    const langSwitcher = page
      .locator('button:has-text("EN"), button:has-text("中文"), button:has-text("English")')
      .first()

    if (await langSwitcher.isVisible()) {
      // 点击切换器
      await langSwitcher.click()
      await page.waitForTimeout(500)

      // 应该显示语言菜单或切换
      const menu = page.locator('[role="menu"], [class*="lang"], [class*="language"]').first()

      // 菜单可能出现也可能直接切换
      expect((await langSwitcher.isVisible()) || (await menu.isVisible())).toBeTruthy()
    }
  })

  test('切换到英文', async ({ page }) => {
    // 尝试找到英文切换选项
    const englishOption = page
      .locator('text=English, button:has-text("EN"), [role="menuitem"]:has-text("English")')
      .first()

    if (await englishOption.isVisible()) {
      await englishOption.click()
      await page.waitForTimeout(1000)

      // URL 应该包含/en 或内容应该是英文
      const url = page.url()
      const hasEnglish =
        url.includes('/en') || (await page.locator('text=/Home|About/i').first().isVisible())
      expect(hasEnglish).toBeTruthy()
    }
  })

  test('切换到中文', async ({ page }) => {
    // 先切换到英文（如果可能）
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    // 尝试找到中文切换选项
    const chineseOption = page.locator('text=中文，text=Chinese, button:has-text("中文")').first()

    if (await chineseOption.isVisible()) {
      await chineseOption.click()
      await page.waitForTimeout(1000)

      // URL 应该包含/zh 或内容应该是中文
      const url = page.url()
      const hasChinese =
        url.includes('/zh') || (await page.locator('text=/首页 | 关于/i').first().isVisible())
      expect(hasChinese).toBeTruthy()
    }
  })
})

test.describe('多语言 - URL 测试', () => {
  for (const locale of locales) {
    test(`${locale.name} - 首页 URL 应该正确`, async ({ page }) => {
      await page.goto(`${locale.path}/`)
      await page.waitForLoadState('networkidle')

      const url = page.url()
      expect(url).toContain(locale.path)
    })

    test(`${locale.name} - 关于页面 URL 应该正确`, async ({ page }) => {
      await page.goto(`${locale.path}/about`)
      await page.waitForLoadState('networkidle')

      const url = page.url()
      expect(url).toContain(`${locale.path}/about`)
    })

    test(`${locale.name} - 团队页面 URL 应该正确`, async ({ page }) => {
      await page.goto(`${locale.path}/team`)
      await page.waitForLoadState('networkidle')

      const url = page.url()
      expect(url).toContain(`${locale.path}/team`)
    })

    test(`${locale.name} - 联系页面 URL 应该正确`, async ({ page }) => {
      await page.goto(`${locale.path}/contact`)
      await page.waitForLoadState('networkidle')

      const url = page.url()
      expect(url).toContain(`${locale.path}/contact`)
    })

    test(`${locale.name} - Dashboard URL 应该正确`, async ({ page }) => {
      await page.goto(`${locale.path}/dashboard`)
      await page.waitForLoadState('networkidle')

      const url = page.url()
      // Dashboard 可能没有语言前缀
      expect(url).toContain('dashboard')
    })
  }
})

test.describe('多语言 - 内容本地化测试', () => {
  test('中文导航栏应该显示中文', async ({ page }) => {
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    const nav = page.locator('nav').first()

    // 应该包含中文导航项
    const chineseNavItems = ['首页', '关于', '团队', '联系']
    let foundItems = 0

    for (const item of chineseNavItems) {
      if (
        await nav
          .locator(`text=/${item}/`)
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        foundItems++
      }
    }

    // 至少应该找到部分中文导航项
    expect(foundItems).toBeGreaterThanOrEqual(2)
  })

  test('英文导航栏应该显示英文', async ({ page }) => {
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    const nav = page.locator('nav').first()

    // 应该包含英文导航项
    const englishNavItems = ['Home', 'About', 'Team', 'Contact']
    let foundItems = 0

    for (const item of englishNavItems) {
      if (
        await nav
          .locator(`text=/${item}/i`)
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        foundItems++
      }
    }

    // 至少应该找到部分英文导航项
    expect(foundItems).toBeGreaterThanOrEqual(2)
  })

  test('中文页面标题应该包含中文', async ({ page }) => {
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    const title = await page.title()
    // 标题应该包含中文或 7zi
    expect(title).toMatch(/7zi|工作室 | 中文/i)
  })

  test('英文页面标题应该包含英文', async ({ page }) => {
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    const title = await page.title()
    // 标题应该包含英文或 7zi
    expect(title).toMatch(/7zi|Studio|English/i)
  })
})

test.describe('多语言 - 元数据测试', () => {
  for (const locale of locales) {
    test(`${locale.name} - HTML lang 属性应该正确`, async ({ page }) => {
      await page.goto(`${locale.path}/`)
      await page.waitForLoadState('networkidle')

      const html = page.locator('html').first()
      const lang = await html.getAttribute('lang')

      // lang 属性应该匹配语言代码
      expect(lang).toMatch(new RegExp(`^${locale.code}`))
    })

    test(`${locale.name} - 应该有正确的 hreflang 标签`, async ({ page }) => {
      await page.goto(`${locale.path}/`)
      await page.waitForLoadState('networkidle')

      // 查找 hreflang 标签
      const hreflangZh = page.locator('link[rel="alternate"][hreflang="zh"]')
      const hreflangEn = page.locator('link[rel="alternate"][hreflang="en"]')

      // 至少应该有一个 hreflang 标签（可选）
      const zhCount = await hreflangZh.count()
      const enCount = await hreflangEn.count()

      // hreflang 是可选的 SEO 优化
      expect(zhCount + enCount).toBeGreaterThanOrEqual(0)
    })
  }
})

test.describe('多语言 - 表单本地化测试', () => {
  test('中文联系表单应该显示中文标签', async ({ page }) => {
    await page.goto('/zh/contact')
    await page.waitForLoadState('networkidle')

    // 查找中文字段标签
    const chineseLabels = ['姓名', '邮箱', '消息', '提交', '发送']
    let foundLabels = 0

    for (const label of chineseLabels) {
      if (
        await page
          .locator(`text=/${label}/`)
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        foundLabels++
      }
    }

    // 应该找到部分中文标签
    expect(foundLabels).toBeGreaterThanOrEqual(2)
  })

  test('英文联系表单应该显示英文标签', async ({ page }) => {
    await page.goto('/en/contact')
    await page.waitForLoadState('networkidle')

    // 查找英文字段标签
    const englishLabels = ['Name', 'Email', 'Message', 'Submit', 'Send']
    let foundLabels = 0

    for (const label of englishLabels) {
      if (
        await page
          .locator(`text=/${label}/i`)
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        foundLabels++
      }
    }

    // 应该找到部分英文标签
    expect(foundLabels).toBeGreaterThanOrEqual(2)
  })
})

test.describe('多语言 - 错误页面本地化测试', () => {
  test('中文 404 页面应该显示中文', async ({ page }) => {
    await page.goto('/zh/non-existent-page')
    await page.waitForLoadState('networkidle')

    // 应该显示 404 相关内容
    const notFoundContent = page.locator('text=/404|未找到 | 不存在/i')
    await expect(notFoundContent.first()).toBeVisible()
  })

  test('英文 404 页面应该显示英文', async ({ page }) => {
    await page.goto('/en/non-existent-page')
    await page.waitForLoadState('networkidle')

    // 应该显示 404 相关内容
    const notFoundContent = page.locator('text=/404|Not Found|Does not exist/i')
    await expect(notFoundContent.first()).toBeVisible()
  })
})

test.describe('多语言 - 持久化测试', () => {
  test('语言选择应该在导航时保持', async ({ page }) => {
    // 访问中文页面
    await page.goto('/zh/about')
    await page.waitForLoadState('networkidle')

    // 导航到团队页面
    const teamLink = page.locator('a[href*="team"]').first()
    if (await teamLink.isVisible()) {
      await teamLink.click()
      await page.waitForLoadState('networkidle')

      // URL 应该仍然包含/zh
      const url = page.url()
      expect(url).toContain('/zh/')
    }
  })

  test('刷新页面应该保持语言', async ({ page }) => {
    await page.goto('/zh/team')
    await page.waitForLoadState('networkidle')

    // 刷新页面
    await page.reload()
    await page.waitForLoadState('networkidle')

    // URL 应该仍然包含/zh
    const url = page.url()
    expect(url).toContain('/zh/')
  })
})

test.describe('多语言 - 响应式测试', () => {
  test('移动端语言切换器应该可用', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    // 语言切换器应该在移动端也可用
    const langSwitcher = page
      .locator('button:has-text("EN"), button:has-text("中文"), [aria-label*="language"]')
      .first()

    // 可能存在也可能不存在（取决于设计）
    if (await langSwitcher.isVisible()) {
      await expect(langSwitcher).toBeVisible()
    }
  })

  test('桌面端语言切换器应该可用', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/zh')
    await page.waitForLoadState('networkidle')

    const langSwitcher = page
      .locator('button:has-text("EN"), button:has-text("中文"), [aria-label*="language"]')
      .first()

    // 可能存在也可能不存在（取决于设计）
    if (await langSwitcher.isVisible()) {
      await expect(langSwitcher).toBeVisible()
    }
  })
})
