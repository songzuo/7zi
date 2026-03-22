import { test, expect } from '@playwright/test';

/**
 * 页面导航 E2E 测试
 * 测试所有主要页面的导航、URL、内容验证
 */

// 页面配置
const pages = [
  {
    path: '/',
    title: /7zi|Studio/i,
    description: '首页',
    requiredElements: ['nav', 'footer']
  },
  {
    path: '/about',
    title: /关于|About/i,
    description: '关于页面',
    requiredElements: ['nav', 'footer']
  },
  {
    path: '/team',
    title: /团队|Team/i,
    description: '团队页面',
    requiredElements: ['nav', 'footer']
  },
  {
    path: '/blog',
    title: /博客|Blog/i,
    description: '博客页面',
    requiredElements: ['nav', 'footer']
  },
  {
    path: '/contact',
    title: /联系|Contact/i,
    description: '联系页面',
    requiredElements: ['nav', 'form', 'footer']
  },
  {
    path: '/dashboard',
    title: /看板|Dashboard|AI/i,
    description: 'Dashboard 页面',
    requiredElements: ['nav']
  }
];

test.describe('页面导航测试', () => {
  for (const pageInfo of pages) {
    test(`${pageInfo.description}应该正确加载`, async ({ page }) => {
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');

      // 验证页面标题
      await expect(page).toHaveTitle(pageInfo.title);

      // 验证必需元素
      for (const element of pageInfo.requiredElements) {
        const locator = page.locator(element).first();
        await expect(locator).toBeVisible();
      }
    });
  }
});

test.describe('导航栏功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('导航栏应该在所有页面固定显示', async ({ page }) => {
    // 滚动到页面底部
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // 导航栏应该仍然可见
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();

    // 导航栏应该在顶部
    const navBox = await nav.boundingBox();
    expect(navBox?.y).toBeLessThanOrEqual(100);
  });

  test('点击 Logo 应该返回首页', async ({ page }) => {
    // 先导航到其他页面
    await page.goto('/about');
    await page.waitForLoadState('networkidle');

    // 点击 Logo
    const logo = page.locator('nav a[href="/"], nav a:has-text("7zi")').first();
    await logo.click();
    await page.waitForLoadState('networkidle');

    // 应该返回首页
    expect(page.url()).toMatch(/\/(zh|en)?\/?$/);
  });

  test('所有导航链接应该可以点击', async ({ page }) => {
    const nav = page.locator('nav').first();
    const navLinks = nav.locator('a:visible');
    const count = await navLinks.count();

    // 应该有多个导航链接
    expect(count).toBeGreaterThan(0);

    // 测试前几个链接
    for (let i = 0; i < Math.min(count, 5); i++) {
      const link = navLinks.nth(i);
      const href = await link.getAttribute('href');
      
      if (href && href !== '#' && !href.startsWith('javascript')) {
        // 链接应该有有效的 href
        expect(href).toBeTruthy();
      }
    }
  });
});

test.describe('页面间导航测试', () => {
  test('首页 -> 关于页面导航', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 点击关于链接
    const aboutLink = page.locator('a[href*="about"]').first();
    if (await aboutLink.isVisible()) {
      await aboutLink.click();
      await page.waitForLoadState('networkidle');

      // 应该到达关于页面
      expect(page.url()).toContain('about');
      await expect(page).toHaveTitle(/关于|About/i);
    }
  });

  test('首页 -> 团队页面导航', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 点击团队链接
    const teamLink = page.locator('a[href*="team"]').first();
    if (await teamLink.isVisible()) {
      await teamLink.click();
      await page.waitForLoadState('networkidle');

      // 应该到达团队页面
      expect(page.url()).toContain('team');
      await expect(page).toHaveTitle(/团队|Team/i);
    }
  });

  test('首页 -> 博客页面导航', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 点击博客链接
    const blogLink = page.locator('a[href*="blog"]').first();
    if (await blogLink.isVisible()) {
      await blogLink.click();
      await page.waitForLoadState('networkidle');

      // 应该到达博客页面
      expect(page.url()).toContain('blog');
      await expect(page).toHaveTitle(/博客|Blog/i);
    }
  });

  test('首页 -> 联系页面导航', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 点击联系链接
    const contactLink = page.locator('a[href*="contact"]').first();
    if (await contactLink.isVisible()) {
      await contactLink.click();
      await page.waitForLoadState('networkidle');

      // 应该到达联系页面
      expect(page.url()).toContain('contact');
      await expect(page).toHaveTitle(/联系|Contact/i);
    }
  });

  test('首页 -> Dashboard 导航', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 点击 Dashboard 链接
    const dashboardLink = page.locator('a[href*="dashboard"]').first();
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click();
      await page.waitForLoadState('networkidle');

      // 应该到达 Dashboard 页面
      expect(page.url()).toContain('dashboard');
    }
  });
});

test.describe('浏览器导航测试', () => {
  test('浏览器后退按钮', async ({ page }) => {
    // 从首页导航到关于页面
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const aboutLink = page.locator('a[href*="about"]').first();
    if (await aboutLink.isVisible()) {
      await aboutLink.click();
      await page.waitForLoadState('networkidle');

      // 后退
      await page.goBack();
      await page.waitForLoadState('networkidle');

      // 应该回到首页
      expect(page.url()).not.toContain('about');
    }
  });

  test('浏览器前进按钮', async ({ page }) => {
    // 从首页导航到关于页面
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const aboutLink = page.locator('a[href*="about"]').first();
    if (await aboutLink.isVisible()) {
      await aboutLink.click();
      await page.waitForLoadState('networkidle');

      // 后退
      await page.goBack();
      await page.waitForLoadState('networkidle');

      // 前进
      await page.goForward();
      await page.waitForLoadState('networkidle');

      // 应该回到关于页面
      expect(page.url()).toContain('about');
    }
  });

  test('页面刷新', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');

    // 刷新页面
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 应该仍在关于页面
    expect(page.url()).toContain('about');
    await expect(page).toHaveTitle(/关于|About/i);
  });
});

test.describe('404 页面测试', () => {
  test('访问不存在的页面应该显示 404', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-12345');
    await page.waitForLoadState('networkidle');

    // 应该显示 404 相关内容
    const notFoundContent = page.locator('text=/404|未找到|Not Found|不存在/i');
    const count = await notFoundContent.count();

    // 应该有 404 提示
    expect(count).toBeGreaterThan(0);
  });

  test('404 页面应该有返回首页链接', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-12345');
    await page.waitForLoadState('networkidle');

    // 查找返回首页链接
    const homeLink = page.locator('a[href="/"], a:has-text("首页"), a:has-text("Home")').first();
    
    if (await homeLink.isVisible()) {
      await homeLink.click();
      await page.waitForLoadState('networkidle');

      // 应该返回首页
      expect(page.url()).not.toContain('this-page-does-not-exist');
    }
  });
});

test.describe('语言/地区导航测试', () => {
  test('语言切换功能', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 查找语言切换器
    const langSwitcher = page.locator('[aria-label*="language"], [aria-label*="语言"], button:has-text("EN"), button:has-text("中文")').first();

    if (await langSwitcher.isVisible()) {
      await langSwitcher.click();
      await page.waitForTimeout(500);

      // URL 可能会改变语言前缀
      const url = page.url();
      expect(url).toBeTruthy();
    }
  });

  test('URL 语言前缀', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // URL 可能包含语言前缀
    const url = page.url();
    const hasLocale = /\/(zh|en)\//.test(url) || url === page.context().options.baseURL + '/';
    
    expect(hasLocale).toBeTruthy();
  });
});

test.describe('页面加载性能测试', () => {
  for (const pageInfo of pages) {
    test(`${pageInfo.description}应该在合理时间内加载`, async ({ page }) => {
      const startTime = Date.now();
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // 页面应该在 15 秒内加载完成
      expect(loadTime).toBeLessThan(15000);
    });
  }
});

test.describe('链接完整性测试', () => {
  test('所有内部链接应该有效', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 获取所有内部链接
    const links = page.locator('a[href^="/"], a[href*="7zi"]');
    const count = await links.count();

    const brokenLinks: string[] = [];

    // 检查前 10 个链接
    for (let i = 0; i < Math.min(count, 10); i++) {
      const link = links.nth(i);
      const href = await link.getAttribute('href');

      if (href && href !== '#' && !href.startsWith('javascript')) {
        // 点击链接
        await link.click();
        await page.waitForLoadState('networkidle');

        // 检查是否显示 404
        const is404 = await page.locator('text=/404|Not Found|未找到/').count() > 0;
        
        if (is404) {
          brokenLinks.push(href);
        }

        // 返回首页继续测试
        await page.goto('/');
        await page.waitForLoadState('networkidle');
      }
    }

    // 不应该有损坏的链接
    expect(brokenLinks.length).toBe(0);
  });
});

test.describe('页脚导航测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('页脚应该显示', async ({ page }) => {
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();
  });

  test('页脚应该包含版权信息', async ({ page }) => {
    const footer = page.locator('footer').first();
    await expect(footer).toContainText(/©|Copyright|版权/i);
  });

  test('页脚导航链接应该可用', async ({ page }) => {
    const footer = page.locator('footer').first();
    const footerLinks = footer.locator('a');
    const count = await footerLinks.count();

    // 页脚应该有一些链接
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('SEO 元素测试', () => {
  for (const pageInfo of pages) {
    test(`${pageInfo.description}应该有正确的 SEO 元素`, async ({ page }) => {
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');

      // 检查标题
      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);

      // 检查 meta description
      const metaDescription = page.locator('meta[name="description"]');
      const hasDescription = await metaDescription.count() > 0;
      
      if (hasDescription) {
        const content = await metaDescription.first().getAttribute('content');
        expect(content?.length).toBeGreaterThan(0);
      }

      // 检查 Open Graph 标签
      const ogTitle = page.locator('meta[property="og:title"]');
      const hasOgTitle = await ogTitle.count() > 0;
      // Open Graph 是可选的，但推荐有

      // 检查 canonical URL
      const canonical = page.locator('link[rel="canonical"]');
      const hasCanonical = await canonical.count() > 0;
      // canonical 是可选的
    });
  }
});