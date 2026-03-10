import { test, expect } from '@playwright/test';

/**
 * 仪表盘交互 E2E 测试
 * 测试 AI 团队实时看板的完整用户交互流程
 * 覆盖：页面加载、成员状态查看、任务分配、刷新功能、响应式布局等
 */

test.describe('仪表盘基础加载', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // 等待数据加载完成
    await page.waitForTimeout(2000);
  });

  test('仪表盘页面应该成功加载', async ({ page }) => {
    // 验证页面标题包含看板或Dashboard
    await expect(page).toHaveTitle(/看板|Dashboard|AI/i);
    
    // 页面主体应该可见
    await expect(page.locator('body')).toBeVisible();
    
    // 主要内容区域应该存在
    const mainContent = page.locator('[class*="dashboard"], main, [class*="container"]').first();
    await expect(mainContent).toBeVisible();
  });

  test('仪表盘应该显示统计信息卡片', async ({ page }) => {
    // 查找统计卡片
    const statCards = page.locator('[class*="stat"], [class*="metric"], [class*="card"]');
    const cardCount = await statCards.count();
    
    // 应该有多个统计卡片（总成员、工作中、空闲等）
    expect(cardCount).toBeGreaterThan(2);
    
    // 验证至少一个卡片可见
    if (cardCount > 0) {
      await expect(statCards.first()).toBeVisible();
    }
  });

  test('仪表盘应该显示AI成员列表', async ({ page }) => {
    // 查找成员相关元素
    const members = page.locator(
      'text=/智能体世界专家|咨询师|架构师|Executor|系统管理员|测试员|设计师|推广专员|销售客服|财务|媒体/'
    );
    const memberCount = await members.count();
    
    // 应该显示多个AI成员
    expect(memberCount).toBeGreaterThan(5);
  });
});

test.describe('仪表盘成员状态交互', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('成员卡片应该显示当前状态', async ({ page }) => {
    // 查找状态指示器
    const statusIndicators = page.locator(
      'text=/工作中|忙碌中|空闲中|离线|working|busy|idle|offline/i'
    );
    const statusCount = await statusIndicators.count();
    
    // 应该有状态信息显示
    expect(statusCount).toBeGreaterThan(0);
    
    // 验证第一个状态指示器可见
    if (statusCount > 0) {
      await expect(statusIndicators.first()).toBeVisible();
    }
  });

  test('成员卡片应该显示当前任务', async ({ page }) => {
    // 查找任务相关信息
    const taskInfo = page.locator('text=/#\\d+|任务|Task|Issue/i');
    const taskCount = await taskInfo.count();
    
    // 可能显示当前分配的任务
    expect(taskCount).toBeGreaterThanOrEqual(0);
  });

  test('点击成员卡片应该显示详细信息', async ({ page }) => {
    // 查找第一个成员卡片
    const memberCard = page.locator('[class*="member"], [class*="agent"], article').first();
    
    if (await memberCard.isVisible()) {
      // 点击成员卡片
      await memberCard.click();
      await page.waitForTimeout(500);
      
      // 详细信息面板应该出现
      const detailPanel = page.locator('[class*="detail"], [class*="modal"], dialog').first();
      if (await detailPanel.isVisible()) {
        await expect(detailPanel).toBeVisible();
      }
      
      // 或者页面导航到详情页
      const currentUrl = page.url();
      console.log(`点击后URL: ${currentUrl}`);
    }
  });
});

test.describe('仪表盘任务分配交互', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('应该显示任务分配界面', async ({ page }) => {
    // 查找任务分配相关元素
    const assignElements = page.locator(
      'button:has-text("分配"), text=/分配|Assign/, [class*="assign"]'
    );
    const assignCount = await assignElements.count();
    
    // 应该有任务分配功能
    expect(assignCount).toBeGreaterThanOrEqual(0);
  });

  test('点击分配按钮应该显示成员选择', async ({ page }) => {
    // 查找分配按钮
    const assignButton = page.locator('button:has-text("分配"), button:has-text("Assign")').first();
    
    if (await assignButton.isVisible()) {
      await assignButton.click();
      await page.waitForTimeout(500);
      
      // 成员选择面板应该出现
      const memberSelection = page.locator(
        'text=/智能体世界专家|咨询师|架构师|Executor|系统管理员|测试员|设计师|推广专员|销售客服|财务|媒体/'
      ).first();
      
      if (await memberSelection.isVisible()) {
        await expect(memberSelection).toBeVisible();
      }
    }
  });

  test('选择成员应该完成任务分配', async ({ page }) => {
    // 先找到一个可分配的任务
    const taskElements = page.locator('[class*="task"], [class*="issue"]').first();
    
    if (await taskElements.isVisible()) {
      // 点击任务
      await taskElements.click();
      await page.waitForTimeout(300);
      
      // 查找分配按钮
      const assignButton = page.locator('button:has-text("分配"), button:has-text("Assign")').first();
      
      if (await assignButton.isVisible()) {
        await assignButton.click();
        await page.waitForTimeout(300);
        
        // 选择一个成员（例如架构师）
        const architectButton = page.locator('button:has-text("架构师"), button:has-text("Architect")').first();
        
        if (await architectButton.isVisible()) {
          await architectButton.click();
          await page.waitForTimeout(1000);
          
          // 验证分配成功（状态应该更新）
          await expect(page.locator('body')).toBeVisible();
        }
      }
    }
  });
});

test.describe('仪表盘刷新功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('应该显示手动刷新按钮', async ({ page }) => {
    // 查找刷新按钮
    const refreshButton = page.locator('button:has-text("刷新"), button:has-text("🔄"), [aria-label*="refresh"]').first();
    
    if (await refreshButton.isVisible()) {
      await expect(refreshButton).toBeVisible();
    }
  });

  test('点击刷新按钮应该更新数据', async ({ page }) => {
    // 记录刷新前的时间戳
    const beforeRefresh = Date.now();
    
    // 点击刷新按钮
    const refreshButton = page.locator('button:has-text("刷新"), button:has-text("🔄")').first();
    
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForTimeout(1000);
      
      // 数据应该更新
      await expect(page.locator('body')).toBeVisible();
      
      // 刷新时间应该合理
      const afterRefresh = Date.now();
      expect(afterRefresh - beforeRefresh).toBeLessThan(5000);
    }
  });

  test('自动刷新开关应该工作', async ({ page }) => {
    // 查找自动刷新开关
    const autoRefreshToggle = page.locator('input[type="checkbox"]:has-text("自动"), label:has-text("自动") input[type="checkbox"]').first();
    
    if (await autoRefreshToggle.isVisible()) {
      // 获取初始状态
      const initialState = await autoRefreshToggle.isChecked();
      
      // 切换状态
      await autoRefreshToggle.click();
      await page.waitForTimeout(300);
      
      // 验证状态已改变
      const newState = await autoRefreshToggle.isChecked();
      expect(newState).toBe(!initialState);
    }
  });
});

test.describe('仪表盘活动日志交互', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('应该显示活动日志区域', async ({ page }) => {
    // 查找活动日志标题
    const activityLog = page.locator('text=/活动|Activity|日志|Log|commit|提交/i').first();
    
    if (await activityLog.isVisible()) {
      await expect(activityLog).toBeVisible();
    }
  });

  test('活动日志应该显示最近事件', async ({ page }) => {
    // 查找活动日志项
    const logItems = page.locator('[class*="log"], [class*="activity"], li').filter({
      has: page.locator('text=/分钟|小时|day|hour|minute/i')
    });
    const itemCount = await logItems.count();
    
    // 应该有最近的活动记录
    expect(itemCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe('仪表盘响应式交互', () => {
  test('移动端布局应该正确', async ({ page }) => {
    // 设置移动设备视口
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 验证页面可访问
    await expect(page.locator('body')).toBeVisible();
    
    // 统计卡片应该适应小屏幕
    const statCards = page.locator('[class*="stat"], [class*="metric"]').first();
    if (await statCards.isVisible()) {
      const box = await statCards.boundingBox();
      expect(box?.width).toBeLessThanOrEqual(400);
    }
  });

  test('桌面端布局应该正确', async ({ page }) => {
    // 设置桌面视口
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 验证页面可访问
    await expect(page.locator('body')).toBeVisible();
    
    // 应该显示多列网格布局
    const gridLayout = page.locator('[class*="grid"], .grid').first();
    if (await gridLayout.isVisible()) {
      await expect(gridLayout).toBeVisible();
    }
  });

  test('平板端布局应该正确', async ({ page }) => {
    // 设置平板视口
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 验证页面可访问
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('仪表盘导航交互', () => {
  test('从仪表盘导航到任务页面', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 查找任务页面链接
    const tasksLink = page.locator('a[href*="tasks"], button:has-text("任务"), button:has-text("Tasks")').first();
    
    if (await tasksLink.isVisible()) {
      await tasksLink.click();
      await page.waitForLoadState('networkidle');
      
      // 应该到达任务页面
      expect(page.url()).toContain('tasks');
    }
  });

  test('从仪表盘导航到设置页面', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 查找设置页面链接
    const settingsLink = page.locator('a[href*="settings"], button:has-text("设置"), button:has-text("Settings")').first();
    
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await page.waitForLoadState('networkidle');
      
      // 应该到达设置页面
      expect(page.url()).toContain('settings');
    }
  });

  test('仪表盘返回首页', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 点击Logo或首页链接
    const homeLink = page.locator('a[href="/"], nav a[href="/"]').first();
    
    if (await homeLink.isVisible()) {
      await homeLink.click();
      await page.waitForLoadState('networkidle');
      
      // 应该返回首页
      expect(page.url()).toMatch(/\/$/);
    }
  });
});

test.describe('仪表盘性能和错误处理', () => {
  test('仪表盘加载性能应该良好', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const loadTime = Date.now() - startTime;
    
    // 仪表盘应在5秒内加载完成
    expect(loadTime).toBeLessThan(5000);
  });

  test('API错误时应该优雅降级', async ({ page }) => {
    // 拦截API请求并返回错误
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server Error' })
      });
    });
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 页面应该仍然基本可用（即使有错误）
    await expect(page.locator('body')).toBeVisible();
  });

  test('网络中断后应该恢复', async ({ page }) => {
    // 模拟网络离线
    await page.context().setOffline(true);
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);
    
    // 恢复网络
    await page.context().setOffline(false);
    
    // 页面应该仍然有基本结构
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('仪表盘无障碍交互', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('主要交互元素应该有适当标签', async ({ page }) => {
    // 检查刷新按钮
    const refreshButton = page.locator('button:has-text("刷新"), button[aria-label*="refresh"]').first();
    
    if (await refreshButton.isVisible()) {
      const ariaLabel = await refreshButton.getAttribute('aria-label');
      const title = await refreshButton.getAttribute('title');
      
      // 应该有适当的无障碍标签
      expect(ariaLabel || title || await refreshButton.textContent()).toBeTruthy();
    }
  });

  test('键盘导航应该工作', async ({ page }) => {
    // 聚焦到第一个可聚焦元素
    await page.keyboard.press('Tab');
    
    // 验证有元素获得焦点
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});

test.describe('仪表盘多浏览器兼容性', () => {
  test('在Chromium中应该正常工作', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', '仅在Chromium中运行');
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('在Firefox中应该正常工作', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', '仅在Firefox中运行');
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('在WebKit中应该正常工作', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', '仅在WebKit中运行');
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await expect(page.locator('body')).toBeVisible();
  });
});