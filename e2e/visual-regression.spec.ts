import { test, expect } from '@playwright/test'

/**
 * 视觉回归测试
 * 测试关键页面的视觉一致性
 */

test.describe('视觉回归测试 - 首页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // 等待动画完成
    await page.waitForTimeout(1000)
  })

  test('首页 - 桌面端截图', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page).toHaveScreenshot('home-desktop.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('首页 - 移动端截图', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page).toHaveScreenshot('home-mobile.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('首页 - 平板端截图', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page).toHaveScreenshot('home-tablet.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('首页 - 导航栏截图', async ({ page }) => {
    const nav = page.locator('nav').first()
    await expect(nav).toHaveScreenshot('home-nav.png', {
      maxDiffPixels: 50,
    })
  })

  test('首页 - 英雄区域截图', async ({ page }) => {
    const hero = page.locator('section').first()
    if (await hero.isVisible()) {
      await expect(hero).toHaveScreenshot('home-hero.png', {
        maxDiffPixels: 100,
      })
    }
  })
})

test.describe('视觉回归测试 - 团队页面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/zh/team')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
  })

  test('团队页面 - 桌面端截图', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page).toHaveScreenshot('team-desktop.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('团队页面 - 移动端截图', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page).toHaveScreenshot('team-mobile.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('团队页面 - 成员卡片截图', async ({ page }) => {
    const memberCard = page.locator('[class*="member"], [class*="team-member"]').first()
    if (await memberCard.isVisible()) {
      await expect(memberCard).toHaveScreenshot('team-member-card.png', {
        maxDiffPixels: 50,
      })
    }
  })
})

test.describe('视觉回归测试 - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
  })

  test('Dashboard - 桌面端截图', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page).toHaveScreenshot('dashboard-desktop.png', {
      fullPage: true,
      maxDiffPixels: 150,
    })
  })

  test('Dashboard - 统计卡片截图', async ({ page }) => {
    const statCards = page.locator('[class*="stat"], [class*="metric"]').first()
    if (await statCards.isVisible()) {
      await expect(statCards).toHaveScreenshot('dashboard-stats.png', {
        maxDiffPixels: 50,
      })
    }
  })
})

test.describe('视觉回归测试 - 联系页面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/zh/contact')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
  })

  test('联系页面 - 桌面端截图', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page).toHaveScreenshot('contact-desktop.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('联系页面 - 表单截图', async ({ page }) => {
    const form = page.locator('form').first()
    await expect(form).toHaveScreenshot('contact-form.png', {
      maxDiffPixels: 50,
    })
  })
})

test.describe('视觉回归测试 - 关于页面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/zh/about')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
  })

  test('关于页面 - 桌面端截图', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page).toHaveScreenshot('about-desktop.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })
})

test.describe('视觉回归测试 - 博客页面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/zh/blog')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
  })

  test('博客页面 - 桌面端截图', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page).toHaveScreenshot('blog-desktop.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })
})

test.describe('视觉回归测试 - 深色模式', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
  })

  test('深色模式 - 首页截图', async ({ page }) => {
    // 切换到深色模式
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.waitForTimeout(500)

    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page).toHaveScreenshot('home-dark-mode.png', {
      fullPage: true,
      maxDiffPixels: 150,
    })
  })

  test('深色模式 - Dashboard 截图', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    await page.emulateMedia({ colorScheme: 'dark' })
    await page.waitForTimeout(500)

    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page).toHaveScreenshot('dashboard-dark-mode.png', {
      fullPage: true,
      maxDiffPixels: 150,
    })
  })
})
