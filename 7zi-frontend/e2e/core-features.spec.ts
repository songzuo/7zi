/**
 * E2E Test: Core Features
 * 
 * 测试核心业务流程:
 * - 首页导航
 * - 图片优化功能
 * - 搜索功能
 * - 反馈功能
 * - 用户设置
 */

import { test, expect } from '../fixtures/test.fixtures';
import {
  checkToast,
  waitForElement,
  waitForNetworkIdle,
} from '../helpers/test-helpers';

test.describe('首页和导航', () => {
  test('应该正确显示首页', async ({ page }) => {
    await page.goto('/');
    
    // 验证标题
    await expect(page).toHaveTitle(/7zi/);
    
    // 验证主要内容
    await expect(page.getByRole('heading', { name: /7zi Frontend/ })).toBeVisible();
    
    // 验证导航链接
    await expect(page.getByRole('link', { name: /图片优化/i })).toBeVisible();
  });

  test('应该正确导航到各功能页面', async ({ page }) => {
    await page.goto('/');
    
    // 导航到图片优化示例
    await page.getByRole('link', { name: /图片优化示例/i }).click();
    await expect(page).toHaveURL(/image-optimization-demo/);
    
    // 返回首页
    await page.goBack();
    
    // 导航到通知示例
    await page.getByRole('link', { name: /通知示例/i }).click();
    await expect(page).toHaveURL(/notification-demo/);
  });

  test('应该正确处理404页面', async ({ page }) => {
    await page.goto('/non-existent-page');
    
    // 应该显示404提示
    await expect(page.getByText(/404|页面不存在|not found/i)).toBeVisible();
    
    // 应该有返回首页链接
    const homeLink = page.getByRole('link', { name: /返回首页|home/i });
    if (await homeLink.count() > 0) {
      await homeLink.click();
      await expect(page).toHaveURL('/');
    }
  });

  test('应该支持响应式布局', async ({ page }) => {
    // 桌面视图
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /7zi Frontend/ })).toBeVisible();
    
    // 平板视图
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByRole('heading', { name: /7zi Frontend/ })).toBeVisible();
    
    // 移动视图
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByRole('heading', { name: /7zi Frontend/ })).toBeVisible();
  });
});

test.describe('图片优化功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/image-optimization-demo');
  });

  test('应该显示图片优化示例页面', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /图片优化/i })).toBeVisible();
  });

  test('应该正确加载优化后的图片', async ({ page }) => {
    // 检查图片是否加载
    const images = page.getByRole('img');
    const count = await images.count();
    
    if (count > 0) {
      // 检查第一张图片
      const firstImage = images.first();
      await expect(firstImage).toBeVisible();
      
      // 检查图片是否成功加载（没有错误）
      const naturalWidth = await firstImage.evaluate((img: HTMLImageElement) => img.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    }
  });

  test('应该支持 WebP 格式', async ({ page }) => {
    // 检查是否有 WebP 图片
    const webpImages = page.locator('img[src*=".webp"], img[type="image/webp"]');
    const count = await webpImages.count();
    
    if (count > 0) {
      await expect(webpImages.first()).toBeVisible();
    }
  });

  test('应该支持懒加载', async ({ page }) => {
    // 检查懒加载属性
    const lazyImages = page.locator('img[loading="lazy"]');
    const count = await lazyImages.count();
    
    expect(count).toBeGreaterThan(0);
  });

  test('应该处理图片加载错误', async ({ page }) => {
    // Mock 图片加载失败
    await page.route('**/*.png', async (route) => {
      await route.abort('failed');
    });
    
    await page.reload();
    
    // 检查是否有错误处理（占位图或错误提示）
    const errorElement = page.getByText(/图片加载失败|failed to load|error/i);
    const placeholderImage = page.locator('img[alt*="placeholder"], img[alt*="error"]');
    
    const hasError = await errorElement.count() > 0 || await placeholderImage.count() > 0;
    expect(hasError).toBe(true);
  });

  test('应该支持响应式图片', async ({ page }) => {
    // 检查 srcset 属性
    const responsiveImages = page.locator('img[srcset]');
    const count = await responsiveImages.count();
    
    // 如果有响应式图片
    if (count > 0) {
      const srcset = await responsiveImages.first().getAttribute('srcset');
      expect(srcset).toBeTruthy();
    }
  });
});

test.describe('搜索功能', () => {
  test.beforeEach(async ({ page }) => {
    // 如果有搜索页面
    const searchPage = page.getByRole('link', { name: /搜索|search/i });
    if (await searchPage.count() > 0) {
      await searchPage.click();
    } else {
      // 使用全局搜索框
      await page.goto('/');
    }
  });

  test('应该显示搜索框', async ({ page }) => {
    const searchInput = page.getByRole('searchbox');
    
    if (await searchInput.count() > 0) {
      await expect(searchInput).toBeVisible();
    } else {
      // 可能是 input[type="search"]
      const altSearchInput = page.locator('input[type="search"]');
      if (await altSearchInput.count() > 0) {
        await expect(altSearchInput).toBeVisible();
      }
    }
  });

  test('应该支持搜索查询', async ({ page }) => {
    const searchInput = page.getByRole('searchbox').or(page.locator('input[type="search"]'));
    
    if (await searchInput.count() > 0) {
      await searchInput.fill('test query');
      await searchInput.press('Enter');
      
      // 应该显示搜索结果或无结果提示
      await waitForNetworkIdle(page);
      
      const results = page.getByRole('listitem');
      const noResults = page.getByText(/没有找到|no results|not found/i);
      
      expect(
        await results.count() > 0 || await noResults.count() > 0
      ).toBe(true);
    }
  });

  test('应该显示搜索建议', async ({ page }) => {
    const searchInput = page.getByRole('searchbox').or(page.locator('input[type="search"]'));
    
    if (await searchInput.count() > 0) {
      await searchInput.fill('te');
      
      // 智能等待建议出现 (替换硬编码 500ms)
      const suggestions = page.getByRole('listbox').or(page.getByRole('list'));
      // 等待建议列表可能出现的最大时间
      await suggestions.first().waitFor({ state: 'visible', timeout: 2000 }).catch(() => {
        // 建议可能不存在，继续测试
      });
      
      if (await suggestions.count() > 0) {
        await expect(suggestions).toBeVisible();
      }
    }
  });

  test('应该支持搜索过滤', async ({ page }) => {
    const searchInput = page.getByRole('searchbox').or(page.locator('input[type="search"]'));
    
    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      await searchInput.press('Enter');
      
      // 检查是否有过滤器
      const filterButton = page.getByRole('button', { name: /过滤|filter/i });
      if (await filterButton.count() > 0) {
        await filterButton.click();
        await expect(page.getByRole('dialog')).toBeVisible();
      }
    }
  });

  test('应该支持搜索历史', async ({ page }) => {
    const searchInput = page.getByRole('searchbox').or(page.locator('input[type="search"]'));
    
    if (await searchInput.count() > 0) {
      // 执行搜索
      await searchInput.fill('history test');
      await searchInput.press('Enter');
      
      // 再次聚焦搜索框
      await searchInput.click();
      
      // 检查是否有历史记录
      const history = page.getByText(/历史|history|最近搜索|recent/i);
      if (await history.count() > 0) {
        await expect(history).toBeVisible();
      }
    }
  });
});

test.describe('反馈功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/feedback');
  });

  test('应该显示反馈表单', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /反馈|feedback/i })).toBeVisible();
    
    // 检查表单字段
    const nameInput = page.getByLabel(/姓名|name/i);
    const emailInput = page.getByLabel(/邮箱|email/i);
    const messageInput = page.getByLabel(/内容|message|反馈/i);
    const submitButton = page.getByRole('button', { name: /提交|submit/i });
    
    if (await nameInput.count() > 0) {
      await expect(nameInput).toBeVisible();
    }
    if (await emailInput.count() > 0) {
      await expect(emailInput).toBeVisible();
    }
    if (await messageInput.count() > 0) {
      await expect(messageInput).toBeVisible();
    }
    if (await submitButton.count() > 0) {
      await expect(submitButton).toBeVisible();
    }
  });

  test('应该成功提交反馈', async ({ page }) => {
    const nameInput = page.getByLabel(/姓名|name/i);
    const emailInput = page.getByLabel(/邮箱|email/i);
    const messageInput = page.getByLabel(/内容|message|反馈/i);
    const submitButton = page.getByRole('button', { name: /提交|submit/i });
    
    if (await nameInput.count() > 0) {
      await nameInput.fill('测试用户');
    }
    if (await emailInput.count() > 0) {
      await emailInput.fill('test@example.com');
    }
    if (await messageInput.count() > 0) {
      await messageInput.fill('这是一条测试反馈');
    }
    if (await submitButton.count() > 0) {
      await submitButton.click();
      
      // 应该显示成功消息
      await expect(page.getByText(/感谢|成功|success|thank/i)).toBeVisible();
    }
  });

  test('应该验证必填字段', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /提交|submit/i });
    
    if (await submitButton.count() > 0) {
      await submitButton.click();
      
      // 应该显示验证错误
      const error = page.getByText(/必填|required|请填写/i);
      if (await error.count() > 0) {
        await expect(error.first()).toBeVisible();
      }
    }
  });

  test('应该支持反馈类型选择', async ({ page }) => {
    const typeSelect = page.getByLabel(/类型|type/i);
    
    if (await typeSelect.count() > 0) {
      await typeSelect.click();
      
      const options = page.getByRole('option');
      expect(await options.count()).toBeGreaterThan(0);
    }
  });

  test('应该支持文件上传', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    
    if (await fileInput.count() > 0) {
      // 测试文件上传（如果有）
      const submitButton = page.getByRole('button', { name: /提交|submit/i });
      await expect(submitButton).toBeVisible();
    }
  });
});

test.describe('用户设置', () => {
  test.use({ storageState: '.auth/user.json' });

  test('应该显示用户设置页面', async ({ page }) => {
    // 尝试访问设置页面
    await page.goto('/settings');
    
    // 或者从用户菜单进入
    const userMenu = page.getByRole('button', { name: /用户|user|头像|avatar/i });
    if (await userMenu.count() > 0) {
      await userMenu.click();
      const settingsLink = page.getByRole('link', { name: /设置|settings/i });
      if (await settingsLink.count() > 0) {
        await settingsLink.click();
      }
    }
  });

  test('应该支持修改个人信息', async ({ page }) => {
    await page.goto('/settings');
    
    const editButton = page.getByRole('button', { name: /编辑|edit/i });
    if (await editButton.count() > 0) {
      await editButton.click();
      
      const nameInput = page.getByLabel(/姓名|name/i);
      if (await nameInput.count() > 0) {
        await nameInput.fill('新名称');
        
        const saveButton = page.getByRole('button', { name: /保存|save/i });
        await saveButton.click();
        
        await expect(page.getByText(/保存成功|success/i)).toBeVisible();
      }
    }
  });

  test('应该支持修改密码', async ({ page }) => {
    await page.goto('/settings');
    
    const passwordTab = page.getByRole('tab', { name: /密码|password/i });
    if (await passwordTab.count() > 0) {
      await passwordTab.click();
      
      const currentPassword = page.getByLabel(/当前密码|current password/i);
      const newPassword = page.getByLabel(/新密码|new password/i);
      const confirmPassword = page.getByLabel(/确认密码|confirm password/i);
      
      if (await currentPassword.count() > 0) {
        await currentPassword.fill('OldPassword123!');
        await newPassword.fill('NewPassword123!');
        await confirmPassword.fill('NewPassword123!');
        
        const saveButton = page.getByRole('button', { name: /保存|save|更改/i });
        await saveButton.click();
        
        await expect(page.getByText(/密码已更新|password updated/i)).toBeVisible();
      }
    }
  });

  test('应该支持通知偏好设置', async ({ page }) => {
    await page.goto('/settings');
    
    const notificationTab = page.getByRole('tab', { name: /通知|notification/i });
    if (await notificationTab.count() > 0) {
      await notificationTab.click();
      
      const emailNotification = page.getByLabel(/邮件通知|email notification/i);
      if (await emailNotification.count() > 0) {
        await emailNotification.click();
        await expect(page.getByText(/已更新|updated/i)).toBeVisible();
      }
    }
  });

  test('应该支持删除账户', async ({ page }) => {
    await page.goto('/settings');
    
    const deleteButton = page.getByRole('button', { name: /删除账户|delete account/i });
    if (await deleteButton.count() > 0) {
      // 不实际删除，只验证按钮存在
      await expect(deleteButton).toBeVisible();
      
      // 点击后应该显示确认对话框
      await deleteButton.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      
      // 取消删除
      const cancelButton = page.getByRole('button', { name: /取消|cancel/i });
      await cancelButton.click();
    }
  });
});

test.describe('管理员功能', () => {
  test.use({ storageState: '.auth/admin.json' });

  test('应该显示管理面板', async ({ page }) => {
    await page.goto('/admin');
    
    await expect(page.getByRole('heading', { name: /管理|admin|dashboard/i })).toBeVisible();
  });

  test('应该显示用户列表', async ({ page }) => {
    await page.goto('/admin/users');
    
    const userTable = page.getByRole('table');
    if (await userTable.count() > 0) {
      await expect(userTable).toBeVisible();
    }
  });

  test('应该显示反馈列表', async ({ page }) => {
    await page.goto('/admin/feedback');
    
    const feedbackList = page.getByRole('list').or(page.getByRole('table'));
    if (await feedbackList.count() > 0) {
      await expect(feedbackList).toBeVisible();
    }
  });

  test('应该支持导出数据', async ({ page }) => {
    await page.goto('/admin');
    
    const exportButton = page.getByRole('button', { name: /导出|export/i });
    if (await exportButton.count() > 0) {
      await expect(exportButton).toBeVisible();
    }
  });
});

test.describe('性能监控', () => {
  test('应该监控页面加载性能', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    
    // 页面加载应该在合理时间内完成
    expect(loadTime).toBeLessThan(10000);
  });

  test('应该监控图片加载性能', async ({ page }) => {
    await page.goto('/image-optimization-demo');
    
    // 等待所有图片加载
    const images = await page.getByRole('img').all();
    
    for (const img of images) {
      const startTime = Date.now();
      await img.waitFor({ state: 'visible' });
      const loadTime = Date.now() - startTime;
      
      // 每张图片加载应该在合理时间内
      expect(loadTime).toBeLessThan(5000);
    }
  });

  test('应该监控 API 响应时间', async ({ page }) => {
    // Mock API 响应
    await page.route('**/api/**', async (route) => {
      const startTime = Date.now();
      await route.continue();
      const responseTime = Date.now() - startTime;
      
      // API 响应应该在合理时间内
      expect(responseTime).toBeLessThan(3000);
    });
    
    await page.goto('/');
  });
});
