/**
 * @fileoverview Analytics Page Object
 * Encapsulates analytics and dashboard analytics page interactions and locators
 */

import { Page, Locator, expect } from '@playwright/test';

export class AnalyticsPage {
  readonly page: Page;
  readonly url: string = '/analytics';

  // Locators
  readonly charts: Locator;
  readonly metrics: Locator;
  readonly dateRangePicker: Locator;
  readonly timeFilters: Locator;
  readonly exportButtons: {
    pdf: Locator;
    csv: Locator;
    xlsx: Locator;
  };
  readonly refreshButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators
    this.charts = page.locator('.chart, canvas, [data-chart]');
    this.metrics = page.locator('.metric, .stat-card, .kpi-card');
    this.dateRangePicker = page.locator('.date-range-picker, [role="combobox"]');
    this.timeFilters = page.locator('.time-filters button, .filter-tabs button');
    this.exportButtons = {
      pdf: page.locator('button:has-text("PDF"), button:has-text("导出PDF")'),
      csv: page.locator('button:has-text("CSV"), button:has-text("导出CSV")'),
      xlsx: page.locator('button:has-text("Excel"), button:has-text("导出Excel")'),
    };
    this.refreshButton = page.locator('button:has-text("刷新"), button:has-text("Refresh")');
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url);
    await this.waitForLoad();
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await expect(this.metrics.first()).toBeVisible();
  }

  async waitForCharts(): Promise<void> {
    await this.page.waitForTimeout(3000); // Wait for charts to render
    await expect(this.charts.first()).toBeVisible();
  }

  async getChartCount(): Promise<number> {
    await this.waitForCharts();
    return await this.charts.count();
  }

  async getMetricCount(): Promise<number> {
    return await this.metrics.count();
  }

  async getMetricValue(metricName: string): Promise<string | null> {
    const metric = this.metrics.filter({ hasText: metricName }).first();
    if (await metric.isVisible()) {
      const valueElement = metric.locator('.metric-value, .stat-value, .value');
      return await valueElement.textContent();
    }
    return null;
  }

  async selectTimeFilter(filterText: string): Promise<void> {
    const filterButton = this.timeFilters.filter({ hasText: filterText }).first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await this.page.waitForTimeout(1500); // Wait for data to update
    }
  }

  async selectDateRange(range: 'today' | 'week' | 'month' | 'custom'): Promise<void> {
    await this.dateRangePicker.click();
    await this.page.waitForTimeout(500);

    const rangeButton = this.page.locator(`button:has-text("${range === 'today' ? '今天' : range === 'week' ? '本周' : range === 'month' ? '本月' : '自定义'}")`);
    if (await rangeButton.isVisible()) {
      await rangeButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async refresh(): Promise<void> {
    if (await this.refreshButton.isVisible()) {
      await this.refreshButton.click();
      await this.page.waitForTimeout(2000);
    }
  }

  async exportAsPDF(): Promise<void> {
    if (await this.exportButtons.pdf.isVisible()) {
      await this.exportButtons.pdf.click();
    }
  }

  async exportAsCSV(): Promise<void> {
    if (await this.exportButtons.csv.isVisible()) {
      await this.exportButtons.csv.click();
    }
  }

  async exportAsExcel(): Promise<void> {
    if (await this.exportButtons.xlsx.isVisible()) {
      await this.exportButtons.xlsx.click();
    }
  }

  async clickChart(index: number): Promise<void> {
    await this.waitForCharts();
    const chart = this.charts.nth(index);
    if (await chart.isVisible()) {
      await chart.click();
      await this.page.waitForTimeout(500);
    }
  }

  async getChartTitle(index: number): Promise<string | null> {
    const chart = this.charts.nth(index);
    if (await chart.isVisible()) {
      const title = chart.locator('.chart-title, h3, h4');
      return await title.textContent();
    }
    return null;
  }

  async getTrend(metricName: string): Promise<'up' | 'down' | 'neutral' | null> {
    const metric = this.metrics.filter({ hasText: metricName }).first();
    if (await metric.isVisible()) {
      const trendUp = metric.locator('.trend-up, .positive, [data-trend="up"]');
      const trendDown = metric.locator('.trend-down, .negative, [data-trend="down"]');

      if (await trendUp.isVisible()) return 'up';
      if (await trendDown.isVisible()) return 'down';
      return 'neutral';
    }
    return null;
  }

  async searchAnalytics(query: string): Promise<void> {
    const searchInput = this.page.locator('input[placeholder*="搜索"], input[name="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill(query);
      await this.page.waitForTimeout(1000);
    }
  }

  async isOnAnalyticsPage(): Promise<boolean> {
    const url = this.page.url();
    return url.includes('/analytics') || url.includes('/reports');
  }

  async hasChartData(): Promise<boolean> {
    await this.waitForCharts();
    return await this.charts.count() > 0;
  }

  async switchToTableView(): Promise<void> {
    const tableViewButton = this.page.locator('button:has-text("表格"), button:has-text("Table")');
    if (await tableViewButton.isVisible()) {
      await tableViewButton.click();
    }
  }

  async switchToChartView(): Promise<void> {
    const chartViewButton = this.page.locator('button:has-text("图表"), button:has-text("Chart")');
    if (await chartViewButton.isVisible()) {
      await chartViewButton.click();
    }
  }

  async scheduleReport(): Promise<void> {
    const scheduleButton = this.page.locator('button:has-text("定时报告"), button:has-text("Schedule Report")');
    if (await scheduleButton.isVisible()) {
      await scheduleButton.click();
      await expect(this.page.locator('[role="dialog"], .modal')).toBeVisible();
    }
  }

  async viewReportHistory(): Promise<void> {
    const historyLink = this.page.locator('a:has-text("报告历史"), a:has-text("Report History")');
    if (await historyLink.isVisible()) {
      await historyLink.click();
    }
  }

  async getCompletionRate(): Promise<number | null> {
    const completionRate = this.page.locator('text=完成率, Completion Rate');
    if (await completionRate.isVisible()) {
      const metric = completionRate.locator('..');
      const valueText = await metric.locator('.metric-value, .value').textContent();
      const match = valueText?.match(/(\d+)%/);
      return match ? parseInt(match[1]) : null;
    }
    return null;
  }

  async getTaskVelocity(): Promise<number | null> {
    const velocity = this.page.locator('text=速度, Velocity');
    if (await velocity.isVisible()) {
      const metric = velocity.locator('..');
      const valueText = await metric.locator('.metric-value, .value').textContent();
      const match = valueText?.match(/(\d+)/);
      return match ? parseInt(match[1]) : null;
    }
    return null;
  }
}
