/**
 * E2E Test: Notification System
 * 
 * 测试通知系统的完整功能:
 * - 通知接收和显示
 * - 通知中心交互
 * - 标记已读/未读
 * - 清除通知
 * - 通知偏好设置
 * - 实时通知接收
 */

import { test, expect } from '../fixtures/test.fixtures';
import { NotificationPage } from '../fixtures/types';
import {
  checkToast,
  clearStorage,
  setAuthToken,
  getTimestamp,
  waitForElement,
} from '../helpers/test-helpers';

// Mock 通知数据
const mockNotifications = [
  {
    id: 'notif-1',
    title: '系统消息',
    message: '欢迎来到 7zi 系统',
    type: 'info' as const,
    read: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'notif-2',
    title: '项目更新',
    message: '您的项目已被审核通过',
    type: 'success' as const,
    read: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'notif-3',
    title: '安全提醒',
    message: '检测到新设备登录',
    type: 'warning' as const,
    read: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

test.describe('通知系统', () => {
  let notificationPage: NotificationPage;

  test.beforeEach(async ({ authenticatedPage, page }) => {
    notificationPage = new NotificationPage(page);

    // Mock 通知 API
    await page.route('**/api/notifications**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notifications: mockNotifications,
          total: mockNotifications.length,
          unread: mockNotifications.filter(n => !n.read).length,
        }),
      });
    });

    // Mock WebSocket 通知
    await page.addInitScript(() => {
      // 模拟 WebSocket 推送通知
      (window as any).testMockNotification = (notification: any) => {
        window.dispatchEvent(new CustomEvent('notification', {
          detail: notification,
        }));
      };
    });
  });

  test('应该显示通知铃铛', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(notificationPage.notificationBell).toBeVisible();
  });

  test('应该显示未读通知数量', async ({ page }) => {
    await page.goto('/dashboard');
    
    // 等待通知加载
    await page.waitForTimeout(500);
    
    const count = await notificationPage.getNotificationCount();
    expect(count).toBe(2); // 2 个未读通知
  });

  test('应该打开通知中心', async ({ page }) => {
    await page.goto('/dashboard');
    await notificationPage.openNotificationCenter();
    
    await expect(notificationPage.notificationCenter).toBeVisible();
    await expect(notificationPage.notificationList).toBeVisible();
  });

  test('应该显示通知列表', async ({ authenticatedPage, page }) => {
    await page.goto('/dashboard');
    await notificationPage.openNotificationCenter();
    
    // 验证通知数量
    const notifications = notificationPage.notificationList.getByTestId(/notification-item/);
    const count = await notifications.count();
    expect(count).toBeGreaterThan(0);
  });

  test('应该显示不同类型的通知', async ({ authenticatedPage, page }) => {
    await page.goto('/dashboard');
    await notificationPage.openNotificationCenter();
    
    // 检查 info 类型通知
    await expect(page.getByText('系统消息')).toBeVisible();
    
    // 检查 success 类型通知
    await expect(page.getByText('项目更新')).toBeVisible();
    
    // 检查 warning 类型通知
    await expect(page.getByText('安全提醒')).toBeVisible();
  });

  test('应该标记通知为已读', async ({ authenticatedPage, page }) => {
    await page.goto('/dashboard');
    await notificationPage.openNotificationCenter();
    
    // 获取初始未读数量
    const initialCount = await notificationPage.getNotificationCount();
    expect(initialCount).toBe(2);
    
    // 标记第一个通知为已读
    await notificationPage.markAsRead('notif-1');
    
    // 验证未读数量减少
    const newCount = await notificationPage.getNotificationCount();
    expect(newCount).toBe(1);
  });

  test('应该点击通知标记为已读', async ({ authenticatedPage, page }) => {
    await page.goto('/dashboard');
    await notificationPage.openNotificationCenter();
    
    // 点击未读通知
    const unreadNotification = notificationPage.notificationList
      .locator('[data-notification-id="notif-1"]')
      .filter({ hasText: '系统消息' });
    
    await unreadNotification.click();
    
    // 验证通知已标记为已读
    await expect(unreadNotification).toHaveAttribute('data-read', 'true');
  });

  test('应该清除所有通知', async ({ authenticatedPage, page }) => {
    await page.goto('/dashboard');
    await notificationPage.openNotificationCenter();
    
    // 点击清除全部
    await notificationPage.clearAllButton.click();
    
    // 确认清除
    await page.getByRole('button', { name: /确认/i }).click();
    
    // 验证通知列表为空
    await expect(notificationPage.notificationList).toContainText(/暂无通知|no notifications/i);
    
    // 验证铃铛无角标
    const badge = notificationPage.notificationBell.getByTestId('notification-badge');
    await expect(badge).not.toBeVisible();
  });

  test('应该显示通知时间', async ({ authenticatedPage, page }) => {
    await page.goto('/dashboard');
    await notificationPage.openNotificationCenter();
    
    // 验证时间显示
    await expect(page.getByText(/\d+小时前|\d+ hours ago/)).toBeVisible();
    await expect(page.getByText(/\d+天前|\d+ days ago/)).toBeVisible();
  });

  test('应该删除单个通知', async ({ authenticatedPage, page }) => {
    await page.goto('/dashboard');
    await notificationPage.openNotificationCenter();
    
    const notification = notificationPage.notificationList
      .locator('[data-notification-id="notif-1"]');
    
    // 点击删除按钮
    await notification.getByRole('button', { name: /删除|delete/i }).click();
    
    // 确认删除
    await page.getByRole('button', { name: /确认/i }).click();
    
    // 验证通知已删除
    await expect(notification).not.toBeVisible();
  });

  test('应该实时接收新通知', async ({ authenticatedPage, page }) => {
    await page.goto('/dashboard');
    
    // 初始未读数量
    const initialCount = await notificationPage.getNotificationCount();
    
    // 模拟收到新通知
    await page.evaluate(() => {
      (window as any).testMockNotification({
        id: 'notif-new',
        title: '新消息',
        message: '这是一条新通知',
        type: 'info',
        read: false,
        createdAt: new Date().toISOString(),
      });
    });
    
    // 等待通知更新
    await page.waitForTimeout(500);
    
    // 验证未读数量增加
    const newCount = await notificationPage.getNotificationCount();
    expect(newCount).toBe(initialCount + 1);
    
    // 验证显示通知 Toast
    await checkToast(page, '新消息');
  });

  test('应该支持通知分组', async ({ authenticatedPage, page }) => {
    // 添加更多测试通知
    await page.route('**/api/notifications**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notifications: [
            ...mockNotifications,
            { id: 'notif-4', title: '系统消息', message: '第二条系统消息', type: 'info', read: false, createdAt: new Date().toISOString() },
            { id: 'notif-5', title: '系统消息', message: '第三条系统消息', type: 'info', read: false, createdAt: new Date().toISOString() },
          ],
          total: 5,
          unread: 4,
        }),
      });
    });

    await page.goto('/dashboard');
    await notificationPage.openNotificationCenter();
    
    // 验证分组显示
    await expect(page.getByText(/系统消息.*3条/)).toBeVisible();
  });

  test('应该搜索通知', async ({ authenticatedPage, page }) => {
    await page.goto('/dashboard');
    await notificationPage.openNotificationCenter();
    
    // 输入搜索关键词
    const searchInput = page.getByPlaceholder(/搜索通知|search/i);
    await searchInput.fill('系统');
    
    // 验证搜索结果
    await expect(page.getByText('系统消息')).toBeVisible();
    await expect(page.getByText('项目更新')).not.toBeVisible();
  });
});

test.describe('通知偏好设置', () => {
  test('应该打开通知设置', async ({ authenticatedPage, page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: /通知设置|notification settings/i }).click();
    
    // 验证设置面板打开
    await expect(page.getByRole('dialog', { name: /通知设置/i })).toBeVisible();
  });

  test('应该启用/禁用桌面通知', async ({ authenticatedPage, page }) => {
    await page.goto('/dashboard');
    
    // 打开设置
    await page.getByRole('button', { name: /通知设置/i }).click();
    
    // 切换桌面通知开关
    const toggle = page.getByRole('switch', { name: /桌面通知|desktop notification/i });
    await toggle.check();
    await expect(toggle).toBeChecked();
    
    // 保存设置
    await page.getByRole('button', { name: /保存|save/i }).click();
    
    // 验证成功提示
    await checkToast(page, /设置已保存|settings saved/i);
  });

  test('应该设置通知类型过滤', async ({ authenticatedPage, page }) => {
    await page.goto('/dashboard');
    
    // 打开设置
    await page.getByRole('button', { name: /通知设置/i }).click();
    
    // 取消勾选 warning 类型
    const warningToggle = page.getByRole('checkbox', { name: /警告通知|warning notification/i });
    await warningToggle.uncheck();
    
    // 保存设置
    await page.getByRole('button', { name: /保存|save/i }).click();
    
    // 重新加载通知
    await page.reload();
    
    // 验证 warning 通知不再显示
    await expect(page.getByText('安全提醒')).not.toBeVisible();
  });
});

test.describe('通知错误处理', () => {
  test('应该处理通知加载失败', async ({ authenticatedPage, page }) => {
    // Mock API 错误
    await page.route('**/api/notifications**', async (route) => {
      await route.abort('failed');
    });
    
    await page.goto('/dashboard');
    
    // 应该显示错误提示
    await checkToast(page, /加载通知失败|failed to load notifications/i);
  });

  test('应该处理标记已读失败', async ({ authenticatedPage, page }) => {
    // 初始成功加载
    await page.route('**/api/notifications', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ notifications: mockNotifications }),
        });
      } else if (route.request().method() === 'PATCH') {
        await route.abort('failed');
      }
    });

    await page.goto('/dashboard');
    await notificationPage.openNotificationCenter();
    
    // 尝试标记已读
    await notificationPage.markAsRead('notif-1');
    
    // 应该显示错误提示
    await checkToast(page, /操作失败|operation failed/i);
  });
});

test.describe('通知性能', () => {
  test('应该处理大量通知', async ({ authenticatedPage, page }) => {
    // 生成 100 条通知
    const manyNotifications = Array.from({ length: 100 }, (_, i) => ({
      id: `notif-${i}`,
      title: `通知 ${i + 1}`,
      message: `这是第 ${i + 1} 条通知消息`,
      type: 'info' as const,
      read: i >= 50,
      createdAt: new Date(Date.now() - i * 60000).toISOString(),
    }));

    await page.route('**/api/notifications**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notifications: manyNotifications,
          total: 100,
          unread: 50,
        }),
      });
    });

    await page.goto('/dashboard');
    await notificationPage.openNotificationCenter();
    
    // 验证所有通知都能显示
    const notifications = notificationPage.notificationList.getByTestId('notification-item');
    const count = await notifications.count();
    expect(count).toBe(100);
  });

  test('应该支持虚拟滚动', async ({ authenticatedPage, page }) => {
    // 大量通知场景
    const manyNotifications = Array.from({ length: 1000 }, (_, i) => ({
      id: `notif-${i}`,
      title: `通知 ${i + 1}`,
      message: `这是第 ${i + 1} 条通知消息`,
      type: 'info' as const,
      read: i >= 500,
      createdAt: new Date(Date.now() - i * 60000).toISOString(),
    }));

    await page.route('**/api/notifications**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notifications: manyNotifications,
          total: 1000,
          unread: 500,
        }),
      });
    });

    await page.goto('/dashboard');
    await notificationPage.openNotificationCenter();
    
    // 滚动到底部
    await notificationPage.notificationList.evaluate(el => el.scrollTop = el.scrollHeight);
    
    // 验证最后一条通知可见
    await expect(page.getByText('通知 1000')).toBeVisible();
  });
});
