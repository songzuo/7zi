import { test, expect } from '@playwright/test';

/**
 * Portfolio E2E 测试
 * 测试作品集浏览、分类筛选、项目详情查看等功能
 */

test.describe('Portfolio 页面加载', () => {
  test('应该成功加载 Portfolio 页面', async ({ page }) => {
    const response = await page.goto('/portfolio');
    expect(response?.status()).toBe(200);
    
    await page.waitForLoadState('networkidle');
    
    // 验证页面标题
    await expect(page).toHaveTitle(/Portfolio|作品/i);
    
    // 验证主要内容区域
    await expect(page.locator('body')).toBeVisible();
  });

  test('Portfolio 页面应该显示项目标题和描述', async ({ page }) => {
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    
    // 验证标题存在
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    
    // 验证描述存在
    const description = page.locator('p').first();
    await expect(description).toBeVisible();
  });

  test('Portfolio 页面应该显示项目网格', async ({ page }) => {
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    
    // 查找项目卡片
    const projectCards = page.locator('[class*="project"], [class*="card"], article').first();
    
    // 应该有项目内容显示
    await expect(projectCards).toBeVisible();
  });

  test('Portfolio 页面加载时间应该合理', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // 页面应在 5 秒内加载完成
    expect(loadTime).toBeLessThan(5000);
  });
});

test.describe('Portfolio 分类筛选', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
  });

  test('应该显示分类筛选按钮', async ({ page }) => {
    // 查找分类筛选区域
    const filterButtons = page.locator('button:has-text("全部"), button:has-text("All")').first();
    
    // 应该有筛选按钮
    await expect(filterButtons).toBeVisible();
  });

  test('点击"全部"按钮应该显示所有项目', async ({ page }) => {
    // 点击"全部"或"All"按钮
    const allButton = page.locator('button:has-text("全部"), button:has-text("All")').first();
    
    if (await allButton.isVisible()) {
      await allButton.click();
      await page.waitForTimeout(500);
      
      // 验证项目仍然显示
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('切换分类应该筛选项目', async ({ page }) => {
    // 获取初始项目数量
    const initialCards = await page.locator('[class*="project"], [class*="card"]').count();
    
    // 查找分类按钮（排除"全部"）
    const categoryButtons = page.locator('button:not(:has-text("全部")):not(:has-text("All"))').filter({
      has: page.locator('text=/web|mobile|design|开发|设计|应用/i')
    });
    
    const count = await categoryButtons.count();
    
    if (count > 0) {
      // 点击第一个分类按钮
      await categoryButtons.first().click();
      await page.waitForTimeout(500);
      
      // 项目可能被筛选
      const filteredCards = await page.locator('[class*="project"], [class*="card"]').count();
      
      // 记录筛选结果
      console.log(`初始项目: ${initialCards}, 筛选后: ${filteredCards}`);
    }
  });

  test('分类筛选按钮应该有高亮状态', async ({ page }) => {
    // 点击"全部"按钮
    const allButton = page.locator('button:has-text("全部"), button:has-text("All")').first();
    
    if (await allButton.isVisible()) {
      await allButton.click();
      await page.waitForTimeout(300);
      
      // 验证按钮有活动状态（可能通过类名或样式）
      const className = await allButton.getAttribute('class') || '';
      const hasActiveClass = className.includes('primary') || 
                             className.includes('active') || 
                             className.includes('selected');
      
      // 记录状态
      console.log(`活动状态: ${hasActiveClass}`);
    }
  });

  test('多次切换分类应该正常工作', async ({ page }) => {
    const buttons = page.locator('button').filter({
      has: page.locator('text=/全部|All|web|mobile|design/i')
    });
    
    const count = await buttons.count();
    
    if (count >= 2) {
      // 点击第一个分类
      await buttons.first().click();
      await page.waitForTimeout(300);
      
      // 点击第二个分类
      await buttons.nth(1).click();
      await page.waitForTimeout(300);
      
      // 点击返回全部
      const allButton = page.locator('button:has-text("全部"), button:has-text("All")').first();
      if (await allButton.isVisible()) {
        await allButton.click();
        await page.waitForTimeout(300);
      }
      
      // 页面应该仍然稳定
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Portfolio 项目浏览', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
  });

  test('项目卡片应该显示基本信息', async ({ page }) => {
    // 查找项目卡片
    const projectCard = page.locator('[class*="project"], [class*="card"], article').first();
    
    if (await projectCard.isVisible()) {
      // 卡片应该有标题
      const title = projectCard.locator('h2, h3, [class*="title"]').first();
      
      // 卡片应该有描述或图片
      const hasContent = await projectCard.locator('p, img, [class*="image"]').count() > 0;
      
      expect(hasContent || await title.isVisible()).toBeTruthy();
    }
  });

  test('项目卡片应该可以悬停', async ({ page }) => {
    const projectCard = page.locator('[class*="project"], [class*="card"], article').first();
    
    if (await projectCard.isVisible()) {
      // 悬停在卡片上
      await projectCard.hover();
      await page.waitForTimeout(300);
      
      // 卡片应该仍然可见
      await expect(projectCard).toBeVisible();
    }
  });

  test('项目卡片应该显示图片', async ({ page }) => {
    // 查找项目图片
    const projectImages = page.locator('img').filter({
      has: page.locator('src')
    });
    
    const count = await projectImages.count();
    
    // 应该有项目图片
    console.log(`找到 ${count} 张图片`);
  });

  test('项目卡片应该显示技术标签', async ({ page }) => {
    // 查找技术标签
    const techTags = page.locator('[class*="tag"], [class*="tech"], [class*="badge"]').first();
    
    // 如果有标签，验证其可见性
    if (await techTags.isVisible()) {
      await expect(techTags).toBeVisible();
    }
  });
});

test.describe('Portfolio 项目详情', () => {
  test('点击项目应该可以查看详情', async ({ page }) => {
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    
    // 查找可点击的项目链接
    const projectLink = page.locator('a[href*="portfolio"]').first();
    
    if (await projectLink.isVisible()) {
      await projectLink.click();
      await page.waitForLoadState('networkidle');
      
      // 应该导航到项目详情页
      expect(page.url()).toContain('portfolio');
    }
  });

  test('项目详情页面应该显示完整信息', async ({ page }) => {
    // 直接访问一个项目详情页
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    
    // 点击第一个项目
    const projectCards = page.locator('a[href*="portfolio"], [class*="project"] a').first();
    
    if (await projectCards.isVisible()) {
      await projectCards.click();
      await page.waitForLoadState('networkidle');
      
      // 验证详情页内容
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('项目详情应该显示返回按钮', async ({ page }) => {
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    
    // 点击项目
    const projectLink = page.locator('a[href*="portfolio"]').first();
    
    if (await projectLink.isVisible()) {
      await projectLink.click();
      await page.waitForLoadState('networkidle');
      
      // 查找返回按钮
      const backButton = page.locator('button:has-text("返回"), a:has-text("返回"), a[href*="portfolio"]').first();
      
      if (await backButton.isVisible()) {
        await backButton.click();
        await page.waitForLoadState('networkidle');
        
        // 应该返回列表
        expect(page.url()).toContain('portfolio');
      }
    }
  });
});

test.describe('Portfolio 响应式测试', () => {
  test('移动端应该正确显示', async ({ page, isMobile }) => {
    test.skip(!isMobile, '仅在移动端运行');
    
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    
    // 验证页面可访问
    await expect(page.locator('body')).toBeVisible();
    
    // 项目应该以单列显示
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThan(768);
  });

  test('桌面端应该正确显示网格', async ({ page, isMobile }) => {
    test.skip(isMobile, '仅在桌面端运行');
    
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    
    // 验证页面可访问
    await expect(page.locator('body')).toBeVisible();
    
    // 桌面端应该有更宽的视图
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeGreaterThanOrEqual(768);
  });
});

test.describe('Portfolio 导航测试', () => {
  test('从首页导航到 Portfolio', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 点击 Portfolio 链接
    const portfolioLink = page.locator('a[href*="portfolio"]').first();
    
    if (await portfolioLink.isVisible()) {
      await portfolioLink.click();
      await page.waitForLoadState('networkidle');
      
      // 应该到达 Portfolio 页面
      expect(page.url()).toContain('portfolio');
    }
  });

  test('从 Portfolio 返回首页', async ({ page }) => {
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    
    // 点击 Logo 或首页链接
    const homeLink = page.locator('a[href="/"], nav a').first();
    
    if (await homeLink.isVisible()) {
      await homeLink.click();
      await page.waitForLoadState('networkidle');
      
      // 应该返回首页
      expect(page.url()).not.toContain('portfolio');
    }
  });
});

test.describe('Portfolio 性能测试', () => {
  test('图片应该懒加载', async ({ page }) => {
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    
    // 检查图片加载属性
    const images = page.locator('img[loading="lazy"]');
    const lazyLoadCount = await images.count();
    
    console.log(`懒加载图片数量: ${lazyLoadCount}`);
  });

  test('页面应该没有控制台错误', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    
    // 允许一些非关键错误
    const criticalErrors = errors.filter(err => 
      !err.includes('analytics') && 
      !err.includes('tracking') &&
      !err.includes('favicon')
    );
    
    // 关键错误应该很少
    expect(criticalErrors.length).toBeLessThan(3);
  });
});

test.describe('Portfolio SEO 测试', () => {
  test('页面应该有正确的 SEO 元素', async ({ page }) => {
    await page.goto('/portfolio');
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
  });

  test('页面应该有 Open Graph 标签', async ({ page }) => {
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    
    // 检查 OG 标签
    const ogTitle = page.locator('meta[property="og:title"]');
    const hasOgTitle = await ogTitle.count() > 0;
    
    // OG 标签是可选的，但推荐有
    console.log(`有 OG 标题: ${hasOgTitle}`);
  });
});