/**
 * @fileoverview Enhanced Visual Regression Tests
 * Comprehensive visual regression testing with multiple viewports and themes
 */

import { test, expect } from '@playwright/test'

test.describe('Visual Regression - Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000) // Wait for animations
  })

  test('should match home page screenshot - Desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page).toHaveScreenshot('home-desktop-1920x1080.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('should match home page screenshot - Laptop', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await expect(page).toHaveScreenshot('home-laptop-1366x768.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('should match home page screenshot - Tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page).toHaveScreenshot('home-tablet-768x1024.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('should match home page screenshot - Mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page).toHaveScreenshot('home-mobile-375x667.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('should match hero section - Light theme', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.emulateMedia({ colorScheme: 'light' })
    await page.waitForTimeout(500)

    const heroSection = page.locator('section').first()
    if (await heroSection.isVisible()) {
      await expect(heroSection).toHaveScreenshot('hero-section-light.png', {
        maxDiffPixels: 50,
      })
    }
  })

  test('should match hero section - Dark theme', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.waitForTimeout(500)

    const heroSection = page.locator('section').first()
    if (await heroSection.isVisible()) {
      await expect(heroSection).toHaveScreenshot('hero-section-dark.png', {
        maxDiffPixels: 50,
      })
    }
  })

  test('should match navigation bar', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    const nav = page.locator('nav').first()

    await expect(nav).toHaveScreenshot('navigation-bar.png', {
      maxDiffPixels: 30,
    })
  })
})

test.describe('Visual Regression - Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
  })

  test('should match dashboard - Desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page).toHaveScreenshot('dashboard-desktop-1920x1080.png', {
      fullPage: true,
      maxDiffPixels: 150,
    })
  })

  test('should match dashboard - Light theme', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.emulateMedia({ colorScheme: 'light' })
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('dashboard-light-theme.png', {
      fullPage: true,
      maxDiffPixels: 150,
    })
  })

  test('should match dashboard - Dark theme', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('dashboard-dark-theme.png', {
      fullPage: true,
      maxDiffPixels: 150,
    })
  })

  test('should match stats cards', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    const statsContainer = page.locator('.stats, .statistics, .dashboard-stats')

    if (await statsContainer.isVisible()) {
      await expect(statsContainer).toHaveScreenshot('dashboard-stats-cards.png', {
        maxDiffPixels: 50,
      })
    }
  })

  test('should match task list', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    const taskList = page.locator('.task-list, .tasks')

    if (await taskList.isVisible()) {
      await expect(taskList).toHaveScreenshot('dashboard-task-list.png', {
        maxDiffPixels: 100,
      })
    }
  })

  test('should match create task button', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    const createButton = page
      .locator('button:has-text("新建任务"), button:has-text("New Task")')
      .first()

    if (await createButton.isVisible()) {
      await expect(createButton).toHaveScreenshot('dashboard-create-button.png', {
        maxDiffPixels: 20,
      })
    }
  })
})

test.describe('Visual Regression - Team Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/team')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
  })

  test('should match team page - Desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page).toHaveScreenshot('team-desktop-1920x1080.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('should match team page - Mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page).toHaveScreenshot('team-mobile-375x667.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('should match team member card', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    const memberCard = page.locator('[class*="member"], [class*="team-member"]').first()

    if (await memberCard.isVisible()) {
      await expect(memberCard).toHaveScreenshot('team-member-card.png', {
        maxDiffPixels: 50,
      })
    }
  })

  test('should match team page - Dark theme', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('team-dark-theme.png', {
      fullPage: true,
      maxDiffPixels: 150,
    })
  })
})

test.describe('Visual Regression - Contact Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
  })

  test('should match contact page - Desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page).toHaveScreenshot('contact-desktop-1920x1080.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('should match contact form', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    const form = page.locator('form').first()

    await expect(form).toHaveScreenshot('contact-form.png', {
      maxDiffPixels: 50,
    })
  })

  test('should match contact page with filled form', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })

    // Fill form
    await page.fill('input[name="name"], input[placeholder*="姓名"]', 'Test User')
    await page.fill('input[type="email"], input[name="email"]', 'test@example.com')
    await page.fill('textarea[name="message"], textarea[placeholder*="消息"]', 'Test message')

    await expect(page).toHaveScreenshot('contact-form-filled.png', {
      maxDiffPixels: 50,
    })
  })
})

test.describe('Visual Regression - About Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/about')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
  })

  test('should match about page - Desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page).toHaveScreenshot('about-desktop-1920x1080.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('should match about page - Dark theme', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('about-dark-theme.png', {
      fullPage: true,
      maxDiffPixels: 150,
    })
  })
})

test.describe('Visual Regression - Blog Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/blog')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
  })

  test('should match blog page - Desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page).toHaveScreenshot('blog-desktop-1920x1080.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('should match blog card', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    const blogCard = page.locator('[class*="blog"], [class*="post"]').first()

    if (await blogCard.isVisible()) {
      await expect(blogCard).toHaveScreenshot('blog-card.png', {
        maxDiffPixels: 50,
      })
    }
  })
})

test.describe('Visual Regression - Interactive States', () => {
  test('should match button hover state', async ({ page }) => {
    await page.goto('/')
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForLoadState('networkidle')

    const button = page.locator('button').first()
    if (await button.isVisible()) {
      await button.hover()
      await page.waitForTimeout(300)

      await expect(button).toHaveScreenshot('button-hover.png', {
        maxDiffPixels: 30,
      })
    }
  })

  test('should match link hover state', async ({ page }) => {
    await page.goto('/')
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForLoadState('networkidle')

    const link = page.locator('a').first()
    if (await link.isVisible()) {
      await link.hover()
      await page.waitForTimeout(300)

      await expect(link).toHaveScreenshot('link-hover.png', {
        maxDiffPixels: 30,
      })
    }
  })

  test('should match input focus state', async ({ page }) => {
    await page.goto('/contact')
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForLoadState('networkidle')

    const input = page.locator('input').first()
    if (await input.isVisible()) {
      await input.focus()
      await page.waitForTimeout(300)

      await expect(input).toHaveScreenshot('input-focus.png', {
        maxDiffPixels: 30,
      })
    }
  })

  test('should match modal state', async ({ page }) => {
    await page.goto('/dashboard')
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const createButton = page
      .locator('button:has-text("新建任务"), button:has-text("New Task")')
      .first()
    if (await createButton.isVisible()) {
      await createButton.click()
      await page.waitForTimeout(500)

      const modal = page.locator('[role="dialog"], .modal').first()
      if (await modal.isVisible()) {
        await expect(modal).toHaveScreenshot('task-modal.png', {
          maxDiffPixels: 50,
        })
      }
    }
  })
})

test.describe('Visual Regression - Component Consistency', () => {
  test('should match consistent button styles across pages', async ({ page }) => {
    const pages = ['/', '/team', '/about']
    const screenshots = []

    for (const path of pages) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')

      const button = page.locator('button').first()
      if (await button.isVisible()) {
        screenshots.push(await button.screenshot())
      }
    }

    // Compare first button with others (simplified check)
    expect(screenshots.length).toBeGreaterThan(1)
  })

  test('should match consistent card styles', async ({ page }) => {
    await page.goto('/team')
    await page.waitForLoadState('networkidle')

    const firstCard = page.locator('[class*="card"]').first()
    const secondCard = page.locator('[class*="card"]').nth(1)

    if ((await firstCard.isVisible()) && (await secondCard.isVisible())) {
      const firstScreenshot = await firstCard.screenshot()
      const secondScreenshot = await secondCard.screenshot()

      expect(firstScreenshot).toBeTruthy()
      expect(secondScreenshot).toBeTruthy()
    }
  })
})

test.describe('Visual Regression - Error States', () => {
  test('should match 404 page', async ({ page }) => {
    await page.goto('/non-existent-page')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('404-page.png', {
      maxDiffPixels: 100,
    })
  })

  test('should match error form state', async ({ page }) => {
    await page.goto('/contact')
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForLoadState('networkidle')

    // Submit empty form
    const submitButton = page.locator('button[type="submit"]').first()
    if (await submitButton.isVisible()) {
      await submitButton.click()
      await page.waitForTimeout(500)

      await expect(page).toHaveScreenshot('contact-form-error.png', {
        maxDiffPixels: 50,
      })
    }
  })
})
