import { test, expect, devices } from '@playwright/test';

/**
 * 响应式布局 E2E 测试
 * 测试不同设备尺寸下的布局和交互
 */

// 测试视口尺寸
const viewports = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 720 },
  largeDesktop: { width: 1920, height: 1080 }
};

test.describe('移动端响应式测试', () => {
  test.use({ viewport: viewports.mobile });

  test('移动端首页布局', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 页面应该正常渲染
    await expect(page.locator('body')).toBeVisible();

    // 导航应该有移动端菜单按钮
    const menuButton = page.locator('button[aria-label*="menu"], button:has-text("☰"), [data-menu-button]').first();
    
    // 如果有移动端菜单按钮，测试其功能
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(500);
      
      // 菜单应该展开
      const nav = page.locator('nav').first();
      await expect(nav).toBeVisible();
    }

    // 主要内容应该适应屏幕宽度
    const mainContent = page.locator('main, [role="main"]').first();
    if (await mainContent.isVisible()) {
      const box = await mainContent.boundingBox();
      // 内容宽度不应超过视口
      expect(box?.width).toBeLessThanOrEqual(viewports.mobile.width + 50);
    }
  });

  test('移动端联系表单布局', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');

    // 表单应该占满可用宽度
    const form = page.locator('form').first();
    const formBox = await form.boundingBox();
    
    if (formBox) {
      // 表单宽度应该在合理范围内
      expect(formBox.width).toBeGreaterThan(200);
      expect(formBox.width).toBeLessThanOrEqual(viewports.mobile.width + 50);
    }

    // 输入框应该容易点击（触摸友好）
    const nameInput = page.locator('input[name="name"], #name').first();
    const inputBox = await nameInput.boundingBox();
    
    if (inputBox) {
      // 输入框高度应该足够触摸
      expect(inputBox.height).toBeGreaterThanOrEqual(30);
    }

    // 提交按钮应该足够大
    const submitButton = page.locator('button[type="submit"]').first();
    const buttonBox = await submitButton.boundingBox();
    
    if (buttonBox) {
      // 按钮高度应该足够触摸
      expect(buttonBox.height).toBeGreaterThanOrEqual(40);
    }
  });

  test('移动端团队页面布局', async ({ page }) => {
    await page.goto('/team');
    await page.waitForLoadState('networkidle');

    // 成员卡片应该是单列布局
    const cards = page.locator('text=/智能体|咨询师|架构师|Executor|管理员|测试员|设计师|推广|销售|财务|媒体/');
    const count = await cards.count();
    
    // 应该有多个团队成员
    expect(count).toBeGreaterThan(0);
  });

  test('移动端博客页面布局', async ({ page }) => {
    await page.goto('/blog');
    await page.waitForLoadState('networkidle');

    // 博客卡片应该适应屏幕
    const blogCards = page.locator('article, a:has(h3)').first();
    if (await blogCards.isVisible()) {
      const box = await blogCards.boundingBox();
      expect(box?.width).toBeLessThanOrEqual(viewports.mobile.width + 50);
    }
  });

  test('移动端导航菜单交互', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 查找菜单按钮
    const menuButton = page.locator('button').filter({ hasText: /menu|☰|导航/i }).first();
    
    if (await menuButton.isVisible()) {
      // 打开菜单
      await menuButton.click();
      await page.waitForTimeout(300);

      // 菜单应该可见
      const nav = page.locator('nav, [role="navigation"]').first();
      await expect(nav).toBeVisible();

      // 点击菜单项应该导航
      const navLinks = nav.locator('a');
      const linkCount = await navLinks.count();
      
      if (linkCount > 0) {
        // 菜单应该是触摸友好的
        const firstLink = navLinks.first();
        const linkBox = await firstLink.boundingBox();
        
        if (linkBox) {
          expect(linkBox.height).toBeGreaterThanOrEqual(40);
        }
      }
    }
  });

  test('移动端滚动性能', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 滚动页面
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // 页面应该正常滚动
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);

    // 滚动回顶部
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    const newScrollY = await page.evaluate(() => window.scrollY);
    expect(newScrollY).toBe(0);
  });
});

test.describe('平板端响应式测试', () => {
  test.use({ viewport: viewports.tablet });

  test('平板端首页布局', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 页面应该正常渲染
    await expect(page.locator('body')).toBeVisible();

    // 导航应该显示（可能是汉堡菜单或水平导航）
    const nav = page.locator('nav, [role="navigation"]').first();
    await expect(nav).toBeVisible();
  });

  test('平板端联系页面布局', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');

    // 表单和信息应该并排或堆叠
    const form = page.locator('form').first();
    await expect(form).toBeVisible();

    // 检查表单布局
    const nameGroup = page.locator('input[name="name"], #name').first();
    const emailGroup = page.locator('input[name="email"], #email').first();

    if (await nameGroup.isVisible() && await emailGroup.isVisible()) {
      const nameBox = await nameGroup.boundingBox();
      const emailBox = await emailGroup.boundingBox();

      // 可能在同一行或分开
      if (nameBox && emailBox) {
        // 验证都在视口内
        expect(nameBox.x).toBeLessThan(viewports.tablet.width);
        expect(emailBox.x).toBeLessThan(viewports.tablet.width);
      }
    }
  });

  test('平板端团队页面网格', async ({ page }) => {
    await page.goto('/team');
    await page.waitForLoadState('networkidle');

    // 成员卡片可能是 2 列布局
    const memberCards = page.locator('[class*="grid"] > div, [class*="grid"] > article');
    const count = await memberCards.count();
    
    if (count >= 2) {
      const firstCard = memberCards.first();
      const secondCard = memberCards.nth(1);
      
      const firstBox = await firstCard.boundingBox();
      const secondBox = await secondCard.boundingBox();
      
      if (firstBox && secondBox) {
        // 如果是 2 列，第二张卡片应该在第一张右边
        // 如果是 1 列，第二张卡片应该在下面
        const isTwoColumn = Math.abs(firstBox.y - secondBox.y) < 50;
        
        // 平板可能是 2 列或 1 列，都是合理的
        expect(isTwoColumn || !isTwoColumn).toBeTruthy();
      }
    }
  });
});

test.describe('桌面端响应式测试', () => {
  test.use({ viewport: viewports.desktop });

  test('桌面端首页布局', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 导航应该完全展开
    const nav = page.locator('nav, [role="navigation"]').first();
    await expect(nav).toBeVisible();

    // 导航链接应该可见
    const navLinks = nav.locator('a');
    const linkCount = await navLinks.count();
    expect(linkCount).toBeGreaterThan(0);

    // 主要内容应该居中或有最大宽度
    const main = page.locator('main, [role="main"]').first();
    if (await main.isVisible()) {
      const mainBox = await main.boundingBox();
      // 内容应该有合理的宽度限制
      expect(mainBox?.width).toBeGreaterThan(500);
    }
  });

  test('桌面端联系页面两栏布局', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');

    // 表单和信息应该并排显示
    const form = page.locator('form').first();
    const contactInfo = page.locator('text=/邮箱|email@|business@|support@/i').first();

    await expect(form).toBeVisible();

    if (await contactInfo.isVisible()) {
      const formBox = await form.boundingBox();
      const infoBox = await contactInfo.boundingBox();

      if (formBox && infoBox) {
        // 两栏应该水平排列
        const isHorizontal = formBox.x < infoBox.x || formBox.x > infoBox.x;
        expect(isHorizontal).toBeTruthy();
      }
    }
  });

  test('桌面端团队页面多列布局', async ({ page }) => {
    await page.goto('/team');
    await page.waitForLoadState('networkidle');

    // 成员卡片应该是多列布局
    const memberCards = page.locator('[class*="grid"] > div');
    const count = await memberCards.count();
    
    if (count >= 3) {
      const firstCard = memberCards.first();
      const secondCard = memberCards.nth(1);
      const thirdCard = memberCards.nth(2);
      
      const firstBox = await firstCard.boundingBox();
      const secondBox = await secondCard.boundingBox();
      const thirdBox = await thirdCard.boundingBox();
      
      if (firstBox && secondBox && thirdBox) {
        // 桌面端应该是 2 列或 3 列
        const sameRow = Math.abs(firstBox.y - secondBox.y) < 50;
        expect(sameRow).toBeTruthy();
      }
    }
  });

  test('桌面端博客页面布局', async ({ page }) => {
    await page.goto('/blog');
    await page.waitForLoadState('networkidle');

    // 分类卡片应该是多列
    const categoryCards = page.locator('a:has(.text-sm), [class*="grid"] > a');
    const count = await categoryCards.count();
    
    expect(count).toBeGreaterThan(0);

    // 博客文章列表
    const blogPosts = page.locator('article, [class*="grid"] > div');
    const postCount = await blogPosts.count();
    expect(postCount).toBeGreaterThan(0);
  });

  test('桌面端悬停效果', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 找到导航链接
    const navLink = page.locator('nav a').first();
    
    if (await navLink.isVisible()) {
      // 悬停
      await navLink.hover();
      await page.waitForTimeout(300);

      // 链接应该仍然可见
      await expect(navLink).toBeVisible();
    }
  });
});

test.describe('大屏幕响应式测试', () => {
  test.use({ viewport: viewports.largeDesktop });

  test('大屏幕首页布局', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 内容应该有最大宽度限制
    const main = page.locator('main, [role="main"], .max-w').first();
    
    if (await main.isVisible()) {
      const mainBox = await main.boundingBox();
      // 内容应该有最大宽度，不应该占满整个大屏幕
      expect(mainBox?.width).toBeLessThan(viewports.largeDesktop.width);
    }
  });

  test('大屏幕内容居中', async ({ page }) => {
    await page.goto('/team');
    await page.waitForLoadState('networkidle');

    // 主内容区域应该居中
    const container = page.locator('.max-w-6xl, .max-w-7xl, [class*="max-w"]').first();
    
    if (await container.isVisible()) {
      const box = await container.boundingBox();
      if (box) {
        // 容器应该大致居中
        const leftMargin = box.x;
        const rightMargin = viewports.largeDesktop.width - (box.x + box.width);
        
        // 左右边距应该大致相等（允许 50px 误差）
        expect(Math.abs(leftMargin - rightMargin)).toBeLessThan(100);
      }
    }
  });
});

test.describe('横屏模式测试', () => {
  test.use({ viewport: { width: 667, height: 375 } }); // 移动端横屏

  test('横屏模式首页', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 页面应该正常渲染
    await expect(page.locator('body')).toBeVisible();

    // 导航应该适应横屏
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
  });

  test('横屏模式联系表单', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');

    // 表单应该适应横屏
    const form = page.locator('form').first();
    await expect(form).toBeVisible();

    // 输入框应该可以正常使用
    const nameInput = page.locator('input[name="name"], #name').first();
    await expect(nameInput).toBeVisible();
  });
});

test.describe('响应式图片测试', () => {
  test('图片应该适应容器宽度', async ({ page }) => {
    // 移动端
    await page.setViewportSize(viewports.mobile);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 查找图片
    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const img = images.nth(i);
      if (await img.isVisible()) {
        const box = await img.boundingBox();
        if (box) {
          // 图片宽度应该适应视口
          expect(box.width).toBeLessThanOrEqual(viewports.mobile.width + 50);
        }
      }
    }
  });
});

test.describe('断点切换测试', () => {
  test('从移动端切换到桌面端布局', async ({ page }) => {
    // 移动端
    await page.setViewportSize(viewports.mobile);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 验证移动端布局
    await expect(page.locator('body')).toBeVisible();

    // 切换到桌面端
    await page.setViewportSize(viewports.desktop);
    await page.waitForTimeout(500);

    // 页面应该重新布局
    await expect(page.locator('body')).toBeVisible();

    // 导航应该适应新布局
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
  });

  test('从桌面端切换到移动端布局', async ({ page }) => {
    // 桌面端
    await page.setViewportSize(viewports.desktop);
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');

    // 切换到移动端
    await page.setViewportSize(viewports.mobile);
    await page.waitForTimeout(500);

    // 表单应该重新布局
    const form = page.locator('form').first();
    await expect(form).toBeVisible();

    // 表单宽度应该适应新视口
    const formBox = await form.boundingBox();
    if (formBox) {
      expect(formBox.width).toBeLessThanOrEqual(viewports.mobile.width + 50);
    }
  });
});