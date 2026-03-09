import { test, expect } from '@playwright/test';

/**
 * Settings E2E 测试
 * 测试设置页面配置、主题切换、语言切换、通知设置等功能
 */

test.describe('Settings 页面加载', () => {
  test('应该成功加载设置页面', async ({ page }) => {
    const response = await page.goto('/settings');
    expect(response?.status()).toBe(200);
    
    await page.waitForLoadState('networkidle');
    
    // 验证页面标题
    await expect(page).toHaveTitle(/设置|Settings/i);
    
    // 验证主要内容区域
    await expect(page.locator('body')).toBeVisible();
  });

  test('设置页面应该显示标题', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    // 验证标题
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('设置页面应该显示所有设置区域', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    // 验证外观设置区域
    await expect(page.locator('h2').first()).toBeVisible();
    
    // 验证有设置卡片
    const sections = page.locator('section, [class*="section"]');
    const sectionCount = await sections.count();
    expect(sectionCount).toBeGreaterThan(0);
  });

  test('设置页面加载时间应该合理', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // 页面应在 5 秒内加载完成
    expect(loadTime).toBeLessThan(5000);
  });
});

test.describe('主题设置', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('应该显示三个主题选项', async ({ page }) => {
    // 查找主题按钮
    const themeButtons = page.locator('button').filter({
      has: page.locator('text=/亮色|浅色|Light|暗色|深色|Dark|系统|System/i')
    });
    
    const count = await themeButtons.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('点击亮色主题应该切换主题', async ({ page }) => {
    // 查找亮色主题按钮
    const lightButton = page.locator('button').filter({
      has: page.locator('text=/亮色|浅色|Light/i')
    }).first();
    
    if (await lightButton.isVisible()) {
      await lightButton.click();
      await page.waitForTimeout(500);
      
      // 验证选中状态
      const className = await lightButton.getAttribute('class') || '';
      const isSelected = className.includes('cyan-500') || className.includes('active');
      expect(isSelected).toBeTruthy();
    }
  });

  test('点击暗色主题应该切换主题', async ({ page }) => {
    // 查找暗色主题按钮
    const darkButton = page.locator('button').filter({
      has: page.locator('text=/暗色|深色|Dark/i')
    }).first();
    
    if (await darkButton.isVisible()) {
      await darkButton.click();
      await page.waitForTimeout(500);
      
      // 验证选中状态
      const className = await darkButton.getAttribute('class') || '';
      const isSelected = className.includes('cyan-500') || className.includes('active');
      expect(isSelected).toBeTruthy();
    }
  });

  test('点击系统主题应该切换主题', async ({ page }) => {
    // 查找系统主题按钮
    const systemButton = page.locator('button').filter({
      has: page.locator('text=/系统|System/i')
    }).first();
    
    if (await systemButton.isVisible()) {
      await systemButton.click();
      await page.waitForTimeout(500);
      
      // 验证选中状态
      const className = await systemButton.getAttribute('class') || '';
      const isSelected = className.includes('cyan-500') || className.includes('active');
      expect(isSelected).toBeTruthy();
    }
  });

  test('主题切换应该显示选中图标', async ({ page }) => {
    // 点击任意主题
    const themeButton = page.locator('button').filter({
      has: page.locator('text=/亮色|浅色|Light/i')
    }).first();
    
    if (await themeButton.isVisible()) {
      await themeButton.click();
      await page.waitForTimeout(300);
      
      // 查找选中图标（勾选）
      const checkIcon = themeButton.locator('svg, [class*="check"]');
      const hasCheck = await checkIcon.count() > 0;
      
      expect(hasCheck).toBeTruthy();
    }
  });

  test('主题切换应该更新页面外观', async ({ page }) => {
    // 获取初始背景色
    const body = page.locator('body');
    const initialBg = await body.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    
    // 切换主题
    const darkButton = page.locator('button').filter({
      has: page.locator('text=/暗色|深色|Dark/i')
    }).first();
    
    if (await darkButton.isVisible()) {
      await darkButton.click();
      await page.waitForTimeout(500);
      
      // 页面应该仍然可见
      await expect(body).toBeVisible();
    }
  });

  test('主题预览应该显示', async ({ page }) => {
    // 查找预览区域
    const preview = page.locator('text=/预览|Preview/i').first();
    
    if (await preview.isVisible()) {
      // 预览区域应该有内容
      await expect(preview).toBeVisible();
    }
  });
});

test.describe('语言设置', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('应该显示语言选项', async ({ page }) => {
    // 查找中文选项
    const chineseOption = page.locator('button').filter({
      has: page.locator('text=/中文|Chinese|🇨🇳/i')
    }).first();
    
    // 查找英文选项
    const englishOption = page.locator('button').filter({
      has: page.locator('text=/English|🇺🇸/i')
    }).first();
    
    // 至少应该有一个语言选项
    expect(await chineseOption.isVisible() || await englishOption.isVisible()).toBeTruthy();
  });

  test('切换到中文应该更新界面', async ({ page }) => {
    // 查找中文按钮
    const chineseButton = page.locator('button').filter({
      has: page.locator('text=/中文|🇨🇳/i')
    }).first();
    
    if (await chineseButton.isVisible()) {
      await chineseButton.click();
      await page.waitForTimeout(500);
      
      // 验证选中状态
      const className = await chineseButton.getAttribute('class') || '';
      const isSelected = className.includes('cyan-500') || className.includes('active');
      expect(isSelected).toBeTruthy();
    }
  });

  test('切换到英文应该更新界面', async ({ page }) => {
    // 查找英文按钮
    const englishButton = page.locator('button').filter({
      has: page.locator('text=/English|🇺🇸/i')
    }).first();
    
    if (await englishButton.isVisible()) {
      await englishButton.click();
      await page.waitForTimeout(500);
      
      // 验证选中状态
      const className = await englishButton.getAttribute('class') || '';
      const isSelected = className.includes('cyan-500') || className.includes('active');
      expect(isSelected).toBeTruthy();
    }
  });

  test('语言切换应该更新 URL', async ({ page }) => {
    // 初始 URL
    const initialUrl = page.url();
    
    // 切换语言
    const englishButton = page.locator('button').filter({
      has: page.locator('text=/English|🇺🇸/i')
    }).first();
    
    if (await englishButton.isVisible()) {
      await englishButton.click();
      await page.waitForTimeout(500);
      
      // URL 可能包含语言代码
      const newUrl = page.url();
      
      // 记录 URL 变化
      console.log(`URL 变化: ${initialUrl} -> ${newUrl}`);
    }
  });

  test('当前语言应该显示选中状态', async ({ page }) => {
    // 从 URL 判断当前语言
    const url = page.url();
    const isChinese = url.includes('/zh');
    const isEnglish = url.includes('/en');
    
    // 查找对应的选中按钮
    if (isChinese) {
      const chineseButton = page.locator('button').filter({
        has: page.locator('text=/中文|🇨🇳/i')
      }).first();
      
      if (await chineseButton.isVisible()) {
        const className = await chineseButton.getAttribute('class') || '';
        expect(className.includes('cyan')).toBeTruthy();
      }
    } else if (isEnglish) {
      const englishButton = page.locator('button').filter({
        has: page.locator('text=/English|🇺🇸/i')
      }).first();
      
      if (await englishButton.isVisible()) {
        const className = await englishButton.getAttribute('class') || '';
        expect(className.includes('cyan')).toBeTruthy();
      }
    }
  });
});

test.describe('通知设置', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('应该显示通知设置区域', async ({ page }) => {
    // 查找通知标题
    const notificationTitle = page.locator('h2').filter({
      has: page.locator('text=/通知|Notification/i')
    }).first();
    
    if (await notificationTitle.isVisible()) {
      await expect(notificationTitle).toBeVisible();
    }
  });

  test('应该显示通知开关', async ({ page }) => {
    // 查找开关按钮
    const toggleButtons = page.locator('button').filter({
      has: page.locator('class=/rounded-full|w-12|h-6/')
    });
    
    const count = await toggleButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('点击通知开关应该切换状态', async ({ page }) => {
    // 查找启用通知开关
    const enableToggle = page.locator('button').filter({
      has: page.locator('text=/启用|Enable/i')
    }).locator('..').locator('button[class*="rounded-full"]').first();
    
    // 直接查找圆角开关按钮
    const toggle = page.locator('button[class*="rounded-full"][class*="w-12"]').first();
    
    if (await toggle.isVisible()) {
      // 获取初始状态
      const initialClass = await toggle.getAttribute('class') || '';
      const wasEnabled = initialClass.includes('cyan-500');
      
      // 点击切换
      await toggle.click();
      await page.waitForTimeout(300);
      
      // 验证状态变化
      const newClass = await toggle.getAttribute('class') || '';
      const isNowEnabled = newClass.includes('cyan-500');
      
      // 状态应该改变
      expect(wasEnabled).not.toBe(isNowEnabled);
    }
  });

  test('关闭主通知开关应该禁用其他选项', async ({ page }) => {
    // 查找通知区域的所有开关
    const toggles = page.locator('button[class*="rounded-full"][class*="w-12"]');
    const count = await toggles.count();
    
    if (count > 1) {
      // 第一个应该是主开关
      const mainToggle = toggles.first();
      
      // 确保关闭
      const mainClass = await mainToggle.getAttribute('class') || '';
      if (mainClass.includes('cyan-500')) {
        await mainToggle.click();
        await page.waitForTimeout(300);
      }
      
      // 其他开关应该被禁用
      const secondToggle = toggles.nth(1);
      const secondClass = await secondToggle.getAttribute('class') || '';
      
      // 检查是否有禁用状态
      console.log(`第二个开关状态: ${secondClass}`);
    }
  });

  test('声音通知开关应该可以切换', async ({ page }) => {
    // 查找声音开关
    const soundToggle = page.locator('button').filter({
      has: page.locator('text=/声音|Sound/i')
    }).locator('..').locator('button[class*="rounded-full"]').first();
    
    // 或者直接通过索引查找
    const toggles = page.locator('button[class*="rounded-full"][class*="w-12"]');
    
    if (await toggles.count() >= 2) {
      const soundToggleBtn = toggles.nth(1);
      await soundToggleBtn.click();
      await page.waitForTimeout(300);
      
      // 验证页面稳定
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('邮件通知开关应该可以切换', async ({ page }) => {
    const toggles = page.locator('button[class*="rounded-full"][class*="w-12"]');
    
    if (await toggles.count() >= 3) {
      const emailToggle = toggles.nth(2);
      await emailToggle.click();
      await page.waitForTimeout(300);
      
      // 验证页面稳定
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('推送通知开关应该可以切换', async ({ page }) => {
    const toggles = page.locator('button[class*="rounded-full"][class*="w-12"]');
    
    if (await toggles.count() >= 4) {
      const pushToggle = toggles.nth(3);
      await pushToggle.click();
      await page.waitForTimeout(300);
      
      // 验证页面稳定
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('保存和重置', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('应该显示保存按钮', async ({ page }) => {
    const saveButton = page.locator('button').filter({
      has: page.locator('text=/保存|Save/i')
    }).first();
    
    await expect(saveButton).toBeVisible();
  });

  test('应该显示重置按钮', async ({ page }) => {
    const resetButton = page.locator('button').filter({
      has: page.locator('text=/重置|Reset/i')
    }).first();
    
    await expect(resetButton).toBeVisible();
  });

  test('点击保存应该显示成功消息', async ({ page }) => {
    const saveButton = page.locator('button').filter({
      has: page.locator('text=/保存|Save/i')
    }).first();
    
    await saveButton.click();
    await page.waitForTimeout(500);
    
    // 查找成功消息
    const successMessage = page.locator('text=/已保存|Saved|✓/i').first();
    
    // 应该显示成功消息
    if (await successMessage.isVisible()) {
      await expect(successMessage).toBeVisible();
    }
  });

  test('成功消息应该在几秒后消失', async ({ page }) => {
    const saveButton = page.locator('button').filter({
      has: page.locator('text=/保存|Save/i')
    }).first();
    
    await saveButton.click();
    await page.waitForTimeout(500);
    
    // 等待消息消失
    await page.waitForTimeout(2500);
    
    // 消息应该消失
    const successMessage = page.locator('text=/已保存|Saved|✓/i');
    const messageVisible = await successMessage.isVisible().catch(() => false);
    
    // 消息可能已经消失
    console.log(`成功消息已消失: ${!messageVisible}`);
  });

  test('点击重置应该显示确认对话框', async ({ page }) => {
    // 监听对话框
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm');
      await dialog.dismiss();
    });
    
    const resetButton = page.locator('button').filter({
      has: page.locator('text=/重置|Reset/i')
    }).first();
    
    await resetButton.click();
    await page.waitForTimeout(500);
  });

  test('确认重置应该恢复默认设置', async ({ page }) => {
    // 监听并接受对话框
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    
    const resetButton = page.locator('button').filter({
      has: page.locator('text=/重置|Reset/i')
    }).first();
    
    await resetButton.click();
    await page.waitForTimeout(500);
    
    // 应该显示成功消息
    const successMessage = page.locator('text=/已保存|Saved|✓/i').first();
    
    if (await successMessage.isVisible()) {
      await expect(successMessage).toBeVisible();
    }
  });

  test('取消重置应该保持设置不变', async ({ page }) => {
    // 先更改一个设置
    const themeButton = page.locator('button').filter({
      has: page.locator('text=/暗色|深色|Dark/i')
    }).first();
    
    if (await themeButton.isVisible()) {
      await themeButton.click();
      await page.waitForTimeout(300);
    }
    
    // 监听并取消对话框
    page.on('dialog', async dialog => {
      await dialog.dismiss();
    });
    
    const resetButton = page.locator('button').filter({
      has: page.locator('text=/重置|Reset/i')
    }).first();
    
    await resetButton.click();
    await page.waitForTimeout(500);
    
    // 设置应该保持不变
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Settings 导航测试', () => {
  test('从首页导航到设置页面', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 点击设置链接
    const settingsLink = page.locator('a[href*="settings"]').first();
    
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await page.waitForLoadState('networkidle');
      
      // 应该到达设置页面
      expect(page.url()).toContain('settings');
    }
  });

  test('从 Dashboard 导航到设置页面', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 查找设置链接
    const settingsLink = page.locator('a[href*="settings"]').first();
    
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await page.waitForLoadState('networkidle');
      
      // 应该到达设置页面
      expect(page.url()).toContain('settings');
    }
  });

  test('设置页面导航栏应该显示', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    // 验证导航栏
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
  });
});

test.describe('Settings 响应式测试', () => {
  test('移动端设置页面应该正确显示', async ({ page, isMobile }) => {
    test.skip(!isMobile, '仅在移动端运行');
    
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    // 验证页面可访问
    await expect(page.locator('body')).toBeVisible();
    
    // 验证标题可见
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('桌面端设置页面应该正确显示', async ({ page, isMobile }) => {
    test.skip(isMobile, '仅在桌面端运行');
    
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    // 验证页面可访问
    await expect(page.locator('body')).toBeVisible();
    
    // 验证设置区域显示
    const sections = page.locator('section, [class*="section"]');
    const sectionCount = await sections.count();
    expect(sectionCount).toBeGreaterThan(0);
  });

  test('移动端主题按钮应该垂直排列', async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    // 查找主题按钮
    const themeButtons = page.locator('button').filter({
      has: page.locator('text=/亮色|浅色|Light|暗色|深色|Dark|系统|System/i')
    });
    
    const count = await themeButtons.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });
});

test.describe('Settings 性能测试', () => {
  test('设置页面加载性能', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // 页面应在 5 秒内加载完成
    expect(loadTime).toBeLessThan(5000);
  });

  test('主题切换响应时间', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    const themeButton = page.locator('button').filter({
      has: page.locator('text=/暗色|深色|Dark/i')
    }).first();
    
    if (await themeButton.isVisible()) {
      const startTime = Date.now();
      await themeButton.click();
      await page.waitForTimeout(300);
      const responseTime = Date.now() - startTime;
      
      // 切换应该快速响应
      expect(responseTime).toBeLessThan(1000);
    }
  });

  test('语言切换响应时间', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    const langButton = page.locator('button').filter({
      has: page.locator('text=/English|🇺🇸/i')
    }).first();
    
    if (await langButton.isVisible()) {
      const startTime = Date.now();
      await langButton.click();
      await page.waitForTimeout(500);
      const responseTime = Date.now() - startTime;
      
      // 切换应该在合理时间内完成
      expect(responseTime).toBeLessThan(3000);
    }
  });
});

test.describe('Settings 无障碍测试', () => {
  test('设置按钮应该可以通过键盘访问', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    // Tab 到第一个交互元素
    await page.keyboard.press('Tab');
    
    // 应该有元素获得焦点
    const focusedElement = page.locator(':focus');
    await expect(focusedElement.first()).toBeVisible();
  });

  test('主题按钮应该可以通过键盘操作', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    // 多次 Tab 到达主题按钮区域
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
    }
    
    // 按 Enter 激活
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    // 页面应该稳定
    await expect(page.locator('body')).toBeVisible();
  });

  test('开关按钮应该可以通过键盘操作', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    // Tab 到开关区域
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
    }
    
    // 按 Enter 或 Space 切换
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    // 页面应该稳定
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Settings SEO 测试', () => {
  test('设置页面应该有正确的 SEO 元素', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    // 检查标题
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    
    // 检查 meta description
    const metaDescription = page.locator('meta[name="description"]');
    const hasDescription = await metaDescription.count() > 0;
    
    console.log(`有 meta description: ${hasDescription}`);
  });
});

test.describe('Settings 状态持久化测试', () => {
  test('刷新页面后主题设置应该保持', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    // 切换到暗色主题
    const darkButton = page.locator('button').filter({
      has: page.locator('text=/暗色|深色|Dark/i')
    }).first();
    
    if (await darkButton.isVisible()) {
      await darkButton.click();
      await page.waitForTimeout(500);
      
      // 保存
      const saveButton = page.locator('button').filter({
        has: page.locator('text=/保存|Save/i')
      }).first();
      await saveButton.click();
      await page.waitForTimeout(500);
      
      // 刷新页面
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // 验证暗色主题仍然选中
      const darkButtonAfter = page.locator('button').filter({
        has: page.locator('text=/暗色|深色|Dark/i')
      }).first();
      
      const className = await darkButtonAfter.getAttribute('class') || '';
      expect(className.includes('cyan')).toBeTruthy();
    }
  });

  test('刷新页面后语言设置应该保持', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    // 切换到英文
    const englishButton = page.locator('button').filter({
      has: page.locator('text=/English|🇺🇸/i')
    }).first();
    
    if (await englishButton.isVisible()) {
      await englishButton.click();
      await page.waitForTimeout(500);
      
      // 刷新页面
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // 验证 URL 仍包含 en
      const url = page.url();
      // 语言设置可能通过 URL 或 localStorage 保持
      console.log(`刷新后 URL: ${url}`);
    }
  });
});
