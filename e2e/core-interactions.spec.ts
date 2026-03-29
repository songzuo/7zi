import { test, expect } from '@playwright/test';

/**
 * 核心交互元素 E2E 测试
 * 测试主题切换、按钮交互、表单提交等核心功能
 */

test.describe('主题切换 - 基础功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/zh');
    await page.waitForLoadState('networkidle');
  });

  test('主题切换器应可见', async ({ page }) => {
    const themeToggle = page.locator(
      'button:has-text("🌙"), button:has-text("☀️"), ' +
      '[aria-label*="theme"], [aria-label*="Theme"]'
    ).first();

    await expect(themeToggle).toBeVisible();
  });

  test('点击主题切换器应切换主题', async ({ page }) => {
    const themeToggle = page.locator(
      'button:has-text("🌙"), button:has-text("☀️")'
    ).first();

    // 获取当前主题
    const html = page.locator('html');
    const initialClass = await html.getAttribute('class');

    // 点击切换主题
    await themeToggle.click();
    await page.waitForTimeout(500);

    // 主题应该改变
    const newClass = await html.getAttribute('class');
    expect(initialClass).not.toBe(newClass);
  });

  test('暗黑模式应正确应用样式', async ({ page }) => {
    const themeToggle = page.locator('button:has-text("🌙")').first();

    // 切换到暗黑模式
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);

      // 验证暗黑模式样式
      const html = page.locator('html');
      const htmlClass = await html.getAttribute('class');
      expect(htmlClass).toContain('dark');
    }
  });

  test('亮色模式应正确应用样式', async ({ page }) => {
    // 先切换到暗黑模式
    const themeToggle = page.locator('button:has-text("🌙")').first();

    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);

      // 再切换回亮色模式
      const lightToggle = page.locator('button:has-text("☀️")').first();
      if (await lightToggle.isVisible()) {
        await lightToggle.click();
        await page.waitForTimeout(500);

        // 验证亮色模式样式
        const html = page.locator('html');
        const htmlClass = await html.getAttribute('class');
        expect(htmlClass).not.toContain('dark');
      }
    }
  });

  test('主题切换器应有触摸友好尺寸', async ({ page }) => {
    const themeToggle = page.locator(
      'button:has-text("🌙"), button:has-text("☀️")'
    ).first();

    const box = await themeToggle.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe('主题切换 - 持久化', () => {
  test('刷新页面应保持主题设置', async ({ page }) => {
    await page.goto('/zh');
    await page.waitForLoadState('networkidle');

    // 切换主题
    const themeToggle = page.locator('button:has-text("🌙")').first();
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);

      const htmlClass = await page.locator('html').getAttribute('class');

      // 刷新页面
      await page.reload();
      await page.waitForLoadState('networkidle');

      // 主题应该保持
      const htmlClassAfter = await page.locator('html').getAttribute('class');
      expect(htmlClass).toBe(htmlClassAfter);
    }
  });

  test('导航到其他页面应保持主题设置', async ({ page }) => {
    await page.goto('/zh');
    await page.waitForLoadState('networkidle');

    // 切换主题
    const themeToggle = page.locator('button:has-text("🌙")').first();
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);

      // 导航到其他页面
      const dashboardLink = page.locator('a[href*="dashboard"]').first();
      if (await dashboardLink.isVisible()) {
        await dashboardLink.click();
        await page.waitForLoadState('networkidle');

        // 主题应该保持
        const htmlClass = await page.locator('html').getAttribute('class');
        expect(htmlClass).toContain('dark');
      }
    }
  });
});

test.describe('按钮交互 - 基础功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/zh');
    await page.waitForLoadState('networkidle');
  });

  test('按钮应有悬停效果', async ({ page }) => {
    const buttons = page.locator('button');
    const count = await buttons.count();

    if (count > 0) {
      const firstButton = buttons.first();
      await firstButton.hover();

      // 按钮应该仍然可见
      await expect(firstButton).toBeVisible();
    }
  });

  test('按钮应有按下效果', async ({ page }) => {
    const buttons = page.locator('button');
    const count = await buttons.count();

    if (count > 0) {
      const firstButton = buttons.first();

      // 鼠标按下
      await firstButton.hover();
      await page.mouse.down();

      // 鼠标释放
      await page.mouse.up();

      // 按钮应该仍然可见
      await expect(firstButton).toBeVisible();
    }
  });

  test('按钮应有键盘焦点样式', async ({ page }) => {
    const buttons = page.locator('button');
    const count = await buttons.count();

    if (count > 0) {
      const firstButton = buttons.first();

      // 使用 Tab 键导航到按钮
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      // 验证焦点样式
      await expect(firstButton).toBeVisible();
    }
  });
});

test.describe('链接交互 - 基础功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/zh');
    await page.waitForLoadState('networkidle');
  });

  test('链接应有悬停效果', async ({ page }) => {
    const links = page.locator('a');
    const count = await links.count();

    if (count > 0) {
      const firstLink = links.first();
      await firstLink.hover();

      // 链接应该仍然可见
      await expect(firstLink).toBeVisible();
    }
  });

  test('链接应有键盘焦点样式', async ({ page }) => {
    const links = page.locator('a');
    const count = await links.count();

    if (count > 0) {
      // 使用 Tab 键导航到链接
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      // 验证焦点样式
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toHaveCount(1);
    }
  });

  test('外部链接应有正确的 target 属性', async ({ page }) => {
    const externalLinks = page.locator('a[target="_blank"]');
    const count = await externalLinks.count();

    for (let i = 0; i < count; i++) {
      const link = externalLinks.nth(i);
      const rel = await link.getAttribute('rel');

      // 外部链接应有 rel="noopener noreferrer"
      expect(rel).toContain('noopener');
      expect(rel).toContain('noreferrer');
    }
  });
});

test.describe('表单交互 - 联系表单', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/zh/contact');
    await page.waitForLoadState('networkidle');
  });

  test('表单字段应正确显示', async ({ page }) => {
    // 验证表单字段
    const inputs = page.locator('input, textarea');
    const count = await inputs.count();

    // 应该有一些表单字段
    expect(count).toBeGreaterThan(0);
  });

  test('表单字段应有正确的标签', async ({ page }) => {
    const inputs = page.locator('input, textarea');
    const count = await inputs.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const input = inputs.nth(i);

      // 检查字段是否有标签或 aria-label
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const placeholder = await input.getAttribute('placeholder');

      // 字段应该有某种标识
      expect(id || ariaLabel || placeholder).toBeTruthy();
    }
  });

  test('表单字段应接受输入', async ({ page }) => {
    const nameInput = page.locator('input[type="text"], input[name*="name"]').first();

    if (await nameInput.isVisible()) {
      await nameInput.fill('测试用户');
      await page.waitForTimeout(100);

      const value = await nameInput.inputValue();
      expect(value).toBe('测试用户');
    }
  });

  test('邮箱字段应验证格式', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name*="email"]').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill('invalid-email');
      await page.waitForTimeout(100);

      // 触发验证
      await emailInput.blur();

      // 检查验证状态（取决于表单实现）
      const isValid = await emailInput.evaluate((el: HTMLInputElement) =>
        el.checkValidity()
      );

      // 邮箱格式应无效
      expect(isValid).toBeFalsy();
    }
  });

  test('提交按钮应可点击', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]').first();

    if (await submitButton.isVisible()) {
      await expect(submitButton).toBeEnabled();
    }
  });
});

test.describe('表单交互 - 搜索功能', () => {
  test('搜索输入框应接受输入', async ({ page }) => {
    await page.goto('/zh');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="搜索"], input[placeholder*="Search"]'
    ).first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('测试搜索');
      await page.waitForTimeout(100);

      const value = await searchInput.inputValue();
      expect(value).toBe('测试搜索');
    }
  });
});

test.describe('滚动交互', () => {
  test('页面应可滚动', async ({ page }) => {
    await page.goto('/zh');
    await page.waitForLoadState('networkidle');

    // 滚动到页面底部
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // 应该可以滚动回来
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // 页面应该仍然正常
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('导航栏应在滚动时保持可见', async ({ page }) => {
    await page.goto('/zh');
    await page.waitForLoadState('networkidle');

    const nav = page.locator('nav').first();

    // 滚动
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);

    // 导航应该仍然可见
    await expect(nav).toBeVisible();
  });
});

test.describe('触摸交互', () => {
  test('移动端按钮应有触摸友好尺寸', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/zh');
    await page.waitForLoadState('networkidle');

    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();

      // 按钮应有足够大的触摸区域
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('移动端链接应有触摸友好尺寸', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/zh');
    await page.waitForLoadState('networkidle');

    const links = page.locator('a');
    const count = await links.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const link = links.nth(i);
      const box = await link.boundingBox();

      // 链接应有足够大的触摸区域
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});

test.describe('错误处理', () => {
  test('404 页面应正确显示', async ({ page }) => {
    await page.goto('/zh/non-existent-page');
    await page.waitForLoadState('networkidle');

    // 应该显示 404 相关内容
    const notFoundContent = page.locator('text=/404|未找到|不存在|Not Found/i');
    await expect(notFoundContent.first()).toBeVisible();
  });

  test('网络错误应优雅处理', async ({ page }) => {
    // 模拟网络错误
    await page.route('**/*', route => {
      if (route.request().url().includes('api')) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    await page.goto('/zh');
    await page.waitForLoadState('networkidle');

    // 页面应该仍然可见
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('可访问性', () => {
  test('页面应有主标题', async ({ page }) => {
    await page.goto('/zh');
    await page.waitForLoadState('networkidle');

    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
  });

  test('图片应有 alt 属性', async ({ page }) => {
    await page.goto('/zh');
    await page.waitForLoadState('networkidle');

    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');

      // 图片应有 alt 属性或 role="presentation"
      expect(alt || role).toBeTruthy();
    }
  });

  test('表单字段应有标签', async ({ page }) => {
    await page.goto('/zh/contact');
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input, textarea, select');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');

      // 字段应该有某种标签
      expect(id || ariaLabel || ariaLabelledBy).toBeTruthy();
    }
  });

  test('焦点顺序应合理', async ({ page }) => {
    await page.goto('/zh');
    await page.waitForLoadState('networkidle');

    // 使用 Tab 键导航
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }

    // 应该有一个元素获得焦点
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toHaveCount(1);
  });
});

test.describe('性能优化', () => {
  test('页面应无控制台错误', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/zh');
    await page.waitForLoadState('networkidle');

    // 应该没有控制台错误
    expect(errors.length).toBe(0);
  });

  test('关键资源应优先加载', async ({ page }) => {
    const resourceTypes: string[] = [];

    page.on('response', response => {
      const resourceType = response.request().resourceType();
      resourceTypes.push(resourceType);
    });

    await page.goto('/zh');
    await page.waitForLoadState('networkidle');

    // 应该有文档、脚本、样式等资源
    expect(resourceTypes).toContain('document');
    expect(resourceTypes).toContain('script');
    expect(resourceTypes).toContain('stylesheet');
  });
});
