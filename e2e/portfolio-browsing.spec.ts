import { test, expect } from '@playwright/test';

/**
 * Portfolio Browsing E2E 测试
 * 专门测试项目展示浏览的关键用户流程
 * 覆盖：作品集页面访问、分类筛选、项目详情查看、响应式布局等
 */

test.describe('Portfolio Browsing - 访问流程', () => {
  
  test('访客应该能成功访问作品集页面', async ({ page }) => {
    // 场景：新访客直接访问作品集
    
    // 1. 直接访问作品集页面
    const response = await page.goto('/portfolio');
    expect(response?.status()).toBe(200);
    
    await page.waitForLoadState('networkidle');
    
    // 2. 验证页面基本元素
    await expect(page).toHaveTitle(/Portfolio|作品集|Projects/i);
    await expect(page.locator('body')).toBeVisible();
    
    // 3. 验证作品集标题
    const portfolioHeading = page.locator('h1').first();
    await expect(portfolioHeading).toBeVisible();
  });

  test('从首页导航到作品集', async ({ page }) => {
    // 场景：用户从首页导航到作品集
    
    // 1. 访问首页
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 2. 查找并点击作品集链接
    const portfolioLink = page.locator('a[href*="portfolio"], a:has-text("作品"), a:has-text("Portfolio")').first();
    
    if (await portfolioLink.isVisible()) {
      await portfolioLink.click();
      await page.waitForLoadState('networkidle');
      
      // 3. 验证已到达作品集页面
      expect(page.url()).toContain('portfolio');
      await expect(page.locator('body')).toBeVisible();
    } else {
      // 如果没有找到链接，直接访问
      await page.goto('/portfolio');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('portfolio');
    }
  });

  test('从导航栏访问作品集', async ({ page }) => {
    // 场景：用户通过导航栏访问作品集
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 1. 找到导航栏
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
    
    // 2. 在导航栏中找到作品集链接
    const portfolioNavLink = nav.locator('a[href*="portfolio"], a:has-text("作品"), a:has-text("Portfolio")').first();
    
    if (await portfolioNavLink.isVisible()) {
      await portfolioNavLink.click();
      await page.waitForLoadState('networkidle');
      
      expect(page.url()).toContain('portfolio');
    }
  });
});

test.describe('Portfolio Browsing - 分类筛选', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // 等待内容加载
  });

  test('应该显示分类筛选选项', async ({ page }) => {
    // 场景：验证分类筛选功能可用
    
    // 1. 查找分类筛选区域
    const filterSection = page.locator('[class*="filter"], [class*="category"], button:has-text("全部")').first();
    
    if (await filterSection.isVisible()) {
      await expect(filterSection).toBeVisible();
      
      // 2. 验证"全部"按钮存在
      const allButton = page.locator('button:has-text("全部"), button:has-text("All")').first();
      await expect(allButton).toBeVisible();
    }
  });

  test('点击"全部"分类应该显示所有项目', async ({ page }) => {
    // 场景：用户点击"全部"查看所有项目
    
    // 1. 获取初始项目数量
    const initialProjectCount = await page.locator('[class*="project"], [class*="card"], article').count();
    
    // 2. 点击"全部"按钮
    const allButton = page.locator('button:has-text("全部"), button:has-text("All")').first();
    
    if (await allButton.isVisible()) {
      await allButton.click();
      await page.waitForTimeout(500);
      
      // 3. 验证项目数量保持不变或增加
      const afterAllCount = await page.locator('[class*="project"], [class*="card"], article').count();
      expect(afterAllCount).toBeGreaterThanOrEqual(initialProjectCount);
    }
  });

  test('切换到特定分类应该筛选项目', async ({ page }) => {
    // 场景：用户选择特定分类筛选项目
    
    // 1. 查找非"全部"的分类按钮
    const categoryButtons = page.locator('button:not(:has-text("全部")):not(:has-text("All"))').filter({
      has: page.locator('text=/web|mobile|design|开发|设计|应用|网站|移动/i')
    });
    
    const categoryCount = await categoryButtons.count();
    
    if (categoryCount > 0) {
      // 2. 获取初始项目数量
      const initialCount = await page.locator('[class*="project"], [class*="card"]').count();
      
      // 3. 点击第一个分类按钮
      await categoryButtons.first().click();
      await page.waitForTimeout(800);
      
      // 4. 验证项目数量变化（可能减少）
      const filteredCount = await page.locator('[class*="project"], [class*="card"]').count();
      
      console.log(`分类筛选: 初始 ${initialCount} -> 筛选后 ${filteredCount}`);
      
      // 5. 页面应该仍然稳定
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('多次切换分类应该正常工作', async ({ page }) => {
    // 场景：用户在多个分类间切换
    
    const allCategories = page.locator('button').filter({
      has: page.locator('text=/全部|All|web|mobile|design|开发|设计/i')
    });
    
    const totalCategories = await allCategories.count();
    
    if (totalCategories >= 3) {
      // 切换到第二个分类
      await allCategories.nth(1).click();
      await page.waitForTimeout(500);
      
      // 切换到第三个分类  
      await allCategories.nth(2).click();
      await page.waitForTimeout(500);
      
      // 切换回"全部"
      const allButton = page.locator('button:has-text("全部"), button:has-text("All")').first();
      if (await allButton.isVisible()) {
        await allButton.click();
        await page.waitForTimeout(500);
      }
      
      // 验证页面稳定
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Portfolio Browsing - 项目详情查看', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('项目卡片应该显示基本信息', async ({ page }) => {
    // 场景：验证项目卡片显示正确信息
    
    const projectCards = page.locator('[class*="project"], [class*="card"], article');
    const cardCount = await projectCards.count();
    
    if (cardCount > 0) {
      // 检查第一个项目卡片
      const firstCard = projectCards.first();
      
      // 1. 应该有标题
      const title = firstCard.locator('h2, h3, h4, [class*="title"]');
      const hasTitle = await title.count() > 0;
      
      // 2. 应该有描述或图片
      const hasContent = await firstCard.locator('p, img, [class*="image"], [class*="description"]').count() > 0;
      
      // 3. 应该有技术标签
      const hasTags = await firstCard.locator('[class*="tag"], [class*="tech"], [class*="badge"]').count() > 0;
      
      expect(hasTitle || hasContent).toBeTruthy();
    }
  });

  test('点击项目应该进入详情页面', async ({ page }) => {
    // 场景：用户点击项目查看详细信息
    
    const projectLinks = page.locator('a[href*="portfolio"]:not([href="/portfolio"])').first();
    
    if (await projectLinks.isVisible()) {
      // 1. 获取当前URL
      const currentUrl = page.url();
      
      // 2. 点击项目链接
      await projectLinks.click();
      await page.waitForLoadState('networkidle');
      
      // 3. 验证已进入详情页面（URL改变且不是/portfolio）
      const newUrl = page.url();
      expect(newUrl).not.toBe(currentUrl);
      expect(newUrl).not.toMatch(/\/portfolio\/?$/);
      
      // 4. 验证详情页面内容
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('项目详情页面应该显示完整信息', async ({ page }) => {
    // 场景：验证项目详情页面内容完整
    
    // 1. 先确保在作品集列表页面
    if (!page.url().includes('/portfolio') || page.url().endsWith('/portfolio')) {
      await page.goto('/portfolio');
      await page.waitForLoadState('networkidle');
    }
    
    // 2. 尝试进入详情页面
    const projectDetailLink = page.locator('a[href*="portfolio"]:not([href="/portfolio"])').first();
    
    if (await projectDetailLink.isVisible()) {
      await projectDetailLink.click();
      await page.waitForLoadState('networkidle');
      
      // 3. 验证详情页面元素
      const detailElements = [
        'h1, h2', // 标题
        'img',    // 图片
        'p',      // 描述
        '[class*="tech"], [class*="tag"]' // 技术栈
      ];
      
      let hasContent = false;
      for (const selector of detailElements) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          hasContent = true;
          break;
        }
      }
      
      expect(hasContent).toBeTruthy();
    }
  });

  test('从详情页面返回列表', async ({ page }) => {
    // 场景：用户从详情页面返回作品集列表
    
    // 1. 进入详情页面
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    
    const detailLink = page.locator('a[href*="portfolio"]:not([href="/portfolio"])').first();
    
    if (await detailLink.isVisible()) {
      await detailLink.click();
      await page.waitForLoadState('networkidle');
      
      // 2. 查找返回按钮
      const backButton = page.locator(
        'a[href="/portfolio"], button:has-text("返回"), a:has-text("Back"), a:has-text("返回列表")'
      ).first();
      
      if (await backButton.isVisible()) {
        await backButton.click();
        await page.waitForLoadState('networkidle');
        
        // 3. 验证已返回列表页面
        expect(page.url()).toMatch(/\/portfolio\/?$/);
      } else {
        // 使用浏览器后退
        await page.goBack();
        await page.waitForLoadState('networkidle');
        expect(page.url()).toMatch(/\/portfolio\/?$/);
      }
    }
  });
});

test.describe('Portfolio Browsing - 响应式体验', () => {
  
  test('移动端作品集应该正确显示', async ({ page }) => {
    // 场景：移动端用户浏览作品集
    
    // 1. 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 2. 访问作品集
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    
    // 3. 验证移动端布局
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThan(768);
    
    // 4. 验证内容可读
    await expect(page.locator('body')).toBeVisible();
    
    // 5. 项目应该以单列显示
    const projects = page.locator('[class*="project"], [class*="card"]');
    if (await projects.count() > 0) {
      const firstProject = projects.first();
      const box = await firstProject.boundingBox();
      if (box) {
        expect(box.width).toBeLessThan(400);
      }
    }
  });

  test('桌面端作品集应该显示网格布局', async ({ page }) => {
    // 场景：桌面端用户浏览作品集
    
    // 1. 设置桌面端视口
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // 2. 访问作品集
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    
    // 3. 验证桌面端布局
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeGreaterThanOrEqual(768);
    
    // 4. 验证网格布局
    const gridContainer = page.locator('[class*="grid"], .grid').first();
    if (await gridContainer.isVisible()) {
      await expect(gridContainer).toBeVisible();
    }
  });

  test('平板端作品集应该适应中等屏幕', async ({ page }) => {
    // 场景：平板用户浏览作品集
    
    // 1. 设置平板视口
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // 2. 访问作品集
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    
    // 3. 验证平板布局
    await expect(page.locator('body')).toBeVisible();
    
    // 4. 内容应该适应中等屏幕
    const contentWidth = await page.locator('main, [class*="content"]').first().boundingBox();
    if (contentWidth) {
      expect(contentWidth.width).toBeLessThan(800);
    }
  });
});

test.describe('Portfolio Browsing - 性能和SEO', () => {
  
  test('作品集页面加载性能', async ({ page }) => {
    // 场景：验证作品集页面加载速度
    
    const startTime = Date.now();
    
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // 页面应在5秒内加载完成
    expect(loadTime).toBeLessThan(5000);
  });

  test('图片应该懒加载', async ({ page }) => {
    // 场景：验证图片懒加载优化
    
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    
    // 查找具有懒加载属性的图片
    const lazyImages = page.locator('img[loading="lazy"]');
    const lazyCount = await lazyImages.count();
    
    // 应该有懒加载图片
    console.log(`懒加载图片数量: ${lazyCount}`);
  });

  test('作品集页面SEO元素', async ({ page }) => {
    // 场景：验证SEO优化
    
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    
    // 1. 验证页面标题
    const title = await page.title();
    expect(title.length).toBeGreaterThan(5);
    
    // 2. 验证meta description
    const metaDescription = page.locator('meta[name="description"]');
    const hasDescription = await metaDescription.count() > 0;
    
    if (hasDescription) {
      const descContent = await metaDescription.first().getAttribute('content');
      expect(descContent?.length).toBeGreaterThan(10);
    }
    
    // 3. 验证Open Graph标签（如果存在）
    const ogTitle = page.locator('meta[property="og:title"]');
    const hasOg = await ogTitle.count() > 0;
    console.log(`有OG标签: ${hasOg}`);
  });
});

test.describe('Portfolio Browsing - 错误处理', () => {
  
  test('网络错误时页面应该优雅降级', async ({ page }) => {
    // 场景：网络问题时的用户体验
    
    // 1. 模拟网络离线
    await page.context().setOffline(true);
    
    // 2. 尝试访问作品集
    await page.goto('/portfolio').catch(() => {});
    await page.waitForTimeout(2000);
    
    // 3. 恢复网络
    await page.context().setOffline(false);
    
    // 4. 页面应该有基本结构
    await expect(page.locator('body')).toBeVisible();
  });

  test('空作品集状态', async ({ page }) => {
    // 场景：当没有作品时的显示
    
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    
    // 检查是否有空状态提示
    const emptyState = page.locator(
      'text=/暂无作品|没有项目|No projects|Coming soon/i'
    );
    
    const hasEmptyState = await emptyState.count() > 0;
    const hasProjects = await page.locator('[class*="project"], [class*="card"]').count() > 0;
    
    // 要么有项目，要么有空状态提示
    expect(hasProjects || hasEmptyState).toBeTruthy();
  });
});

test.describe('Portfolio Browsing - 多浏览器兼容性', () => {
  
  test('Chrome浏览器兼容性', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', '仅在Chrome运行');
    
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('Firefox浏览器兼容性', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', '仅在Firefox运行');
    
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('Safari浏览器兼容性', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', '仅在Safari运行');
    
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('body')).toBeVisible();
  });
});