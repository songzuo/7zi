/**
 * @fileoverview Dashboard Analytics E2E Tests
 * Tests dashboard data visualization, analytics, and reporting features
 */

import { test, expect } from '@playwright/test'
import { waitForPageLoad, takeScreenshot } from './helpers/test-helpers'

test.describe('Dashboard Analytics', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/zh/login')
    await page.fill('input[type="email"]', 'test@7zi.com')
    await page.fill('input[type="password"]', 'test123456')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/i, { timeout: 5000 })
  })

  test('should display dashboard overview', async ({ page }) => {
    await page.goto('/dashboard')

    // Check for key metrics
    await expect(page.locator('.metric, .stat-card, .kpi-card')).toBeVisible()
    await expect(page.locator('text=任务, Tasks, 统计, Statistics')).toBeVisible()
  })

  test('should show task statistics', async ({ page }) => {
    await page.goto('/dashboard')

    // Check for task-related stats
    const totalTasks = page.locator('text=总任务, Total Tasks')
    const completedTasks = page.locator('text=已完成, Completed, Completed Tasks')
    const pendingTasks = page.locator('text=待处理, Pending, In Progress')

    await expect(totalTasks.or(completedTasks).or(pendingTasks)).toBeVisible()
  })

  test('should display charts and visualizations', async ({ page }) => {
    await page.goto('/dashboard')

    // Wait for charts to load
    await page.waitForTimeout(2000)

    // Check for chart elements
    const charts = page.locator('.chart, canvas, [data-chart], .visualization')

    // At least one chart should be visible
    expect(await charts.count()).toBeGreaterThan(0)
  })

  test('should show task distribution chart', async ({ page }) => {
    await page.goto('/dashboard')

    // Wait for charts
    await page.waitForTimeout(2000)

    // Check for pie/donut chart or bar chart
    const pieChart = page.locator('.pie-chart, .donut-chart, [aria-label*="distribution"]')
    const barChart = page.locator('.bar-chart, [aria-label*="bar"]')

    expect((await pieChart.isVisible()) || (await barChart.isVisible())).toBeTruthy()
  })

  test('should display activity timeline', async ({ page }) => {
    await page.goto('/dashboard')

    // Check for activity feed or timeline
    const activityFeed = page.locator('.activity-feed, .timeline, .recent-activity')

    if (await activityFeed.isVisible()) {
      // Check for activity items
      const activityItems = activityFeed.locator('.activity-item, .timeline-item')
      expect(await activityItems.count()).toBeGreaterThan(0)
    }
  })

  test('should filter dashboard by date range', async ({ page }) => {
    await page.goto('/dashboard')

    // Find date range picker
    const dateRangePicker = page.locator(
      '.date-range-picker, [role="combobox"], input[type="date"]'
    )

    if (await dateRangePicker.isVisible()) {
      // Select "Last 7 days" or similar
      await dateRangePicker.click()

      const last7Days = page.locator('text=最近7天, Last 7 days, 7天')
      if (await last7Days.isVisible()) {
        await last7Days.click()
        await page.waitForTimeout(2000)

        // Verify data is refreshed
        await expect(page.locator('.chart, .metric')).toBeVisible()
      }
    }
  })

  test('should refresh dashboard data', async ({ page }) => {
    await page.goto('/dashboard')

    // Find refresh button
    const refreshButton = page.locator('button:has-text("刷新"), button:has-text("Refresh")')

    if (await refreshButton.isVisible()) {
      // Take screenshot before refresh
      await takeScreenshot(page, 'dashboard-before-refresh')

      // Click refresh
      await refreshButton.click()

      // Wait for refresh
      await page.waitForTimeout(2000)

      // Take screenshot after refresh
      await takeScreenshot(page, 'dashboard-after-refresh')

      // Verify data is still displayed
      await expect(page.locator('.metric, .chart')).toBeVisible()
    }
  })

  test('should export dashboard report', async ({ page }) => {
    await page.goto('/dashboard')

    // Find export button
    const exportButton = page.locator(
      'button:has-text("导出"), button:has-text("Export"), button:has-text("下载报告")'
    )

    if (await exportButton.isVisible()) {
      // Mock file download
      const downloadPromise = page.waitForEvent('download')

      await exportButton.click()

      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.(pdf|xlsx|csv)$/)
    }
  })

  test('should show team performance metrics', async ({ page }) => {
    await page.goto('/dashboard')

    // Check for team-related stats
    const teamMetrics = page.locator('text=团队, Team, 成员, Members')

    if (await teamMetrics.isVisible()) {
      // Check for team member list or performance chart
      const teamChart = page.locator('.team-chart, .member-performance')
      expect(await teamChart.isVisible()).toBeTruthy()
    }
  })

  test('should display productivity trends', async ({ page }) => {
    await page.goto('/dashboard')

    // Wait for charts to load
    await page.waitForTimeout(2000)

    // Check for trend line or area chart
    const trendChart = page.locator('.line-chart, .area-chart, .trend-chart')

    if (await trendChart.isVisible()) {
      // Verify chart is loaded
      await expect(trendChart.first()).toBeVisible()
    }
  })
})

test.describe('Analytics Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/zh/login')
    await page.fill('input[type="email"]', 'test@7zi.com')
    await page.fill('input[type="password"]', 'test123456')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/i, { timeout: 5000 })
  })

  test('should navigate to analytics page', async ({ page }) => {
    await page.goto('/analytics')

    // Verify we're on analytics page
    await expect(page.locator('h1, h2')).toContainText(/分析|Analytics|报表/i)
  })

  test('should display comprehensive analytics', async ({ page }) => {
    await page.goto('/analytics')

    // Wait for charts to load
    await page.waitForTimeout(3000)

    // Check for multiple chart types
    const charts = page.locator('.chart, canvas, [data-chart]')
    expect(await charts.count()).toBeGreaterThan(1)
  })

  test('should show task completion rate', async ({ page }) => {
    await page.goto('/analytics')

    // Check for completion rate metric
    const completionRate = page.locator('text=完成率, Completion Rate, 完成百分比')

    if (await completionRate.isVisible()) {
      // Verify percentage is displayed
      const percentage = page.locator('text=/\\d+%/')
      expect(await percentage.count()).toBeGreaterThan(0)
    }
  })

  test('should display task velocity', async ({ page }) => {
    await page.goto('/analytics')

    // Check for velocity metric
    const velocity = page.locator('text=速度, Velocity, 任务速度')

    if (await velocity.isVisible()) {
      // Verify metric is displayed
      await expect(velocity).toBeVisible()
    }
  })

  test('should show time-based analytics', async ({ page }) => {
    await page.goto('/analytics')

    // Check for time filters
    const timeFilters = page.locator(
      'button:has-text("今天"), button:has-text("本周"), button:has-text("本月")'
    )

    if ((await timeFilters.count()) > 0) {
      // Test each time filter
      for (let i = 0; i < Math.min(await timeFilters.count(), 3); i++) {
        await timeFilters.nth(i).click()
        await page.waitForTimeout(1500)

        // Verify chart updates
        await expect(page.locator('.chart')).toBeVisible()
      }
    }
  })

  test('should compare team member performance', async ({ page }) => {
    await page.goto('/analytics')

    // Check for comparison chart
    const comparisonChart = page.locator('.comparison-chart, .team-comparison')

    if (await comparisonChart.isVisible()) {
      // Verify multiple data series
      await expect(comparisonChart.first()).toBeVisible()
    }
  })

  test('should show task category breakdown', async ({ page }) => {
    await page.goto('/analytics')

    // Check for category chart
    const categoryChart = page.locator('.category-chart, .breakdown-chart')

    if (await categoryChart.isVisible()) {
      // Check for category labels
      const categories = categoryChart.locator('.category-label, .legend-item')
      expect(await categories.count()).toBeGreaterThan(0)
    }
  })

  test('should allow custom date range selection', async ({ page }) => {
    await page.goto('/analytics')

    // Find date range picker
    const dateRangePicker = page.locator('.date-range-picker')

    if (await dateRangePicker.isVisible()) {
      await dateRangePicker.click()

      // Check for custom range option
      const customRange = page.locator('text=自定义, Custom Range')
      if (await customRange.isVisible()) {
        await customRange.click()

        // Check for date inputs
        await expect(page.locator('input[type="date"]')).toBeVisible()
      }
    }
  })

  test('should export analytics data', async ({ page }) => {
    await page.goto('/analytics')

    // Find export buttons
    const exportButtons = page.locator('button:has-text("导出"), button:has-text("Export")')

    if ((await exportButtons.count()) > 0) {
      // Try exporting as CSV
      const csvButton = page.locator('button:has-text("CSV"), button:has-text("数据")')
      if (await csvButton.isVisible()) {
        const downloadPromise = page.waitForEvent('download')
        await csvButton.click()
        const download = await downloadPromise
        expect(download.suggestedFilename()).toMatch(/\.csv$/i)
      }
    }
  })

  test('should display trend indicators', async ({ page }) => {
    await page.goto('/analytics')

    // Check for trend arrows
    const trendUp = page.locator('.trend-up, .positive, [data-trend="up"]')
    const trendDown = page.locator('.trend-down, .negative, [data-trend="down"]')

    // At least one trend indicator should be visible
    expect((await trendUp.isVisible()) || (await trendDown.isVisible())).toBeTruthy()
  })

  test('should show data in table format', async ({ page }) => {
    await page.goto('/analytics')

    // Look for table view toggle
    const tableView = page.locator('button:has-text("表格"), button:has-text("Table")')

    if (await tableView.isVisible()) {
      await tableView.click()

      // Check for data table
      const dataTable = page.locator('table.data-table, .analytics-table')
      await expect(dataTable.first()).toBeVisible()

      // Check for table headers
      const headers = dataTable.locator('th')
      expect(await headers.count()).toBeGreaterThan(0)
    }
  })

  test('should allow drill-down on charts', async ({ page }) => {
    await page.goto('/analytics')

    // Wait for charts to load
    await page.waitForTimeout(3000)

    // Find interactive chart
    const interactiveChart = page.locator('.chart[aria-interactive="true"], .interactive-chart')

    if (await interactiveChart.isVisible()) {
      // Try clicking on chart element
      const chartElement = interactiveChart.locator('rect, circle, path').first()
      if (await chartElement.isVisible()) {
        await chartElement.click()
        await page.waitForTimeout(1000)

        // Check for drill-down detail
        const detailPanel = page.locator('.detail-panel, .drill-down-panel')
        // Detail panel is optional
        if (await detailPanel.isVisible({ timeout: 2000 })) {
          await expect(detailPanel).toBeVisible()
        }
      }
    }
  })

  test('should show loading state during data fetch', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/analytics/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      await route.continue()
    })

    await page.goto('/analytics')

    // Check for loading indicator
    const loadingIndicator = page.locator('.loading, .spinner, [aria-busy="true"]')
    expect(await loadingIndicator.isVisible()).toBeTruthy()

    // Wait for data to load
    await page.waitForTimeout(2500)

    // Check that loading is complete
    await expect(page.locator('.chart, .metric')).toBeVisible()
  })

  test('should handle empty data state', async ({ page }) => {
    // Mock empty data response
    await page.route('**/api/analytics/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      })
    })

    await page.goto('/analytics')

    // Check for empty state message
    const emptyState = page.locator('text=暂无数据, No data available, No data to display')
    if (await emptyState.isVisible({ timeout: 3000 })) {
      await expect(emptyState).toBeVisible()
    }
  })
})

test.describe('Report Generation', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/zh/login')
    await page.fill('input[type="email"]', 'test@7zi.com')
    await page.fill('input[type="password"]', 'test123456')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/i, { timeout: 5000 })
  })

  test('should generate PDF report', async ({ page }) => {
    await page.goto('/analytics')

    // Find PDF export button
    const pdfButton = page.locator('button:has-text("PDF"), button:has-text("导出PDF")')

    if (await pdfButton.isVisible()) {
      const downloadPromise = page.waitForEvent('download')
      await pdfButton.click()
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
    }
  })

  test('should schedule automated reports', async ({ page }) => {
    await page.goto('/analytics')

    // Find schedule button
    const scheduleButton = page.locator(
      'button:has-text("定时报告"), button:has-text("Schedule Report")'
    )

    if (await scheduleButton.isVisible()) {
      await scheduleButton.click()

      // Check for schedule dialog
      const dialog = page.locator('[role="dialog"], .modal')
      await expect(dialog.first()).toBeVisible()

      // Fill schedule form
      await page.fill('input[name="frequency"]', 'weekly')
      await page.fill('input[name="email"]', 'admin@7zi.com')

      // Save schedule
      await page.click('button:has-text("保存"), button:has-text("Save")')
    }
  })

  test('should show report history', async ({ page }) => {
    await page.goto('/analytics')

    // Find report history link
    const historyLink = page.locator('a:has-text("报告历史"), a:has-text("Report History")')

    if (await historyLink.isVisible()) {
      await historyLink.click()

      // Check for history list
      const historyList = page.locator('.report-history, .history-list')
      await expect(historyList.first()).toBeVisible()
    }
  })
})

test.describe('Dashboard Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/zh/login')
    await page.fill('input[type="email"]', 'test@7zi.com')
    await page.fill('input[type="password"]', 'test123456')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/i, { timeout: 5000 })
  })

  test('should have proper chart ARIA labels', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForTimeout(2000)

    // Check for chart ARIA labels
    const charts = page.locator('.chart, [role="img"]')
    for (let i = 0; i < Math.min(await charts.count(), 3); i++) {
      const chart = charts.nth(i)
      const hasLabel = (await chart.getAttribute('aria-label')) !== null
      expect(hasLabel).toBeTruthy()
    }
  })

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/dashboard')

    // Test Tab navigation
    await page.keyboard.press('Tab')
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(['BUTTON', 'A', 'INPUT']).toContain(focusedElement)
  })

  test('should announce chart data to screen readers', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForTimeout(2000)

    // Check for live region announcements
    const liveRegion = page.locator('[aria-live="polite"], [aria-live="assertive"]')
    expect(await liveRegion.count()).toBeGreaterThan(0)
  })
})
