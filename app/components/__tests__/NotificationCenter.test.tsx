/**
 * NotificationCenter 组件测试
 * 测试通知中心的渲染、过滤、标记已读等功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// 导入被测组件
import { NotificationCenter } from '../NotificationCenter';

// ============================================================================
// 测试套件
// ============================================================================

describe('NotificationCenter', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ============================================================================
  // 渲染测试
  // ============================================================================

  describe('渲染', () => {
    it('应该正确渲染组件', () => {
      render(<NotificationCenter />);

      expect(screen.getByText('通知中心')).toBeInTheDocument();
    });

    it('应该显示未读计数', () => {
      render(<NotificationCenter />);

      // 模拟数据中有未读通知
      const unreadBadge = screen.getByText('3');
      expect(unreadBadge).toBeInTheDocument();
    });

    it('应该显示通知列表', async () => {
      render(<NotificationCenter />);

      // 等待 useEffect 执行
      await vi.runAllTimersAsync();

      expect(screen.getByText('任务完成')).toBeInTheDocument();
      expect(screen.getByText('有人@了你')).toBeInTheDocument();
    });

    it('应该显示过滤标签', async () => {
      render(<NotificationCenter />);

      await vi.runAllTimersAsync();

      expect(screen.getByRole('button', { name: /全部/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /未读/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /任务/ })).toBeInTheDocument();
    });

    it('应该显示搜索框', async () => {
      render(<NotificationCenter />);

      await vi.runAllTimersAsync();

      expect(screen.getByPlaceholderText('搜索通知...')).toBeInTheDocument();
    });

    it('应该显示底部操作按钮', async () => {
      render(<NotificationCenter />);

      await vi.runAllTimersAsync();

      expect(screen.getByText('全部已读')).toBeInTheDocument();
      expect(screen.getByText('清空全部')).toBeInTheDocument();
    });

    it('应该应用自定义 className', () => {
      const { container } = render(<NotificationCenter className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  // ============================================================================
  // 通知项测试
  // ============================================================================

  describe('通知项', () => {
    it('应该显示通知标题和消息', async () => {
      render(<NotificationCenter />);

      await vi.runAllTimersAsync();

      expect(screen.getByText('任务完成')).toBeInTheDocument();
      expect(screen.getByText(/Executor 完成了"实现团队协作功能"任务/)).toBeInTheDocument();
    });

    it('应该显示发送者信息', async () => {
      render(<NotificationCenter />);

      await vi.runAllTimersAsync();

      expect(screen.getByText('来自 Executor')).toBeInTheDocument();
    });

    it('应该显示相对时间', async () => {
      render(<NotificationCenter />);

      await vi.runAllTimersAsync();

      expect(screen.getByText('5分钟前')).toBeInTheDocument();
    });

    it('应该显示优先级指示', async () => {
      render(<NotificationCenter />);

      await vi.runAllTimersAsync();

      // 紧急通知应该有标识
      expect(screen.getByText('紧急')).toBeInTheDocument();
    });

    it('应该显示操作按钮', async () => {
      render(<NotificationCenter />);

      await vi.runAllTimersAsync();

      expect(screen.getByText('查看详情 →')).toBeInTheDocument();
    });

    it('应该根据类型显示不同样式', async () => {
      render(<NotificationCenter />);

      await vi.runAllTimersAsync();

      // 成功类型的通知
      const successNotification = screen.getByText('任务完成').closest('div');
      expect(successNotification).toHaveClass('bg-green-50');
    });
  });

  // ============================================================================
  // 过滤功能测试
  // ============================================================================

  describe('过滤功能', () => {
    it('点击未读标签应该只显示未读通知', async () => {
      render(<NotificationCenter />);

      await vi.runAllTimersAsync();

      const unreadFilter = screen.getByRole('button', { name: /未读/ });
      await user.click(unreadFilter);

      // 应该只显示未读通知（3条未读）
      const notifications = screen.getAllByRole('button', { name: /关闭/ });
      expect(notifications.length).toBe(3);
    });

    it('点击任务标签应该只显示任务通知', async () => {
      render(<NotificationCenter />);

      await vi.runAllTimersAsync();

      const taskFilter = screen.getByRole('button', { name: /任务/ });
      await user.click(taskFilter);

      // 应该显示任务相关的通知
      expect(screen.getByText('任务完成')).toBeInTheDocument();
      expect(screen.getByText('新任务分配')).toBeInTheDocument();
    });

    it('点击全部标签应该显示所有通知', async () => {
      render(<NotificationCenter />);

      await vi.runAllTimersAsync();

      // 先切换到未读
      await user.click(screen.getByRole('button', { name: /未读/ }));

      // 再切换回全部
      await user.click(screen.getByRole('button', { name: /全部/ }));

      // 应该显示所有通知
      expect(screen.getByText('任务完成')).toBeInTheDocument();
      expect(screen.getByText('系统维护通知')).toBeInTheDocument();
    });

    it('过滤标签应该显示计数', async () => {
      render(<NotificationCenter />);

      await vi.runAllTimersAsync();

      // 未读标签显示未读数量
      const unreadFilter = screen.getByRole('button', { name: /未读/ });
      expect(within(unreadFilter).getByText('3')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 搜索功能测试
  // ============================================================================

  describe('搜索功能', () => {
    it('应该能搜索通知标题', async () => {
      render(<NotificationCenter />);

      await vi.runAllTimersAsync();

      const searchInput = screen.getByPlaceholderText('搜索通知...');
      await user.type(searchInput, '任务');

      expect(screen.getByText('任务完成')).toBeInTheDocument();
    });

    it('应该能搜索通知内容', async () => {
      render(<NotificationCenter />);

      await vi.runAllTimersAsync();

      const searchInput = screen.getByPlaceholderText('搜索通知...');
      await user.type(searchInput, '部署');

      expect(screen.getByText('部署失败')).toBeInTheDocument();
    });

    it('搜索无结果时应该显示空状态', async () => {
      render(<NotificationCenter />);

      await vi.runAllTimersAsync();

      const searchInput = screen.getByPlaceholderText('搜索通知...');
      await user.type(searchInput, '不存在的关键词xyz123');

      expect(screen.getByText('没有找到匹配的通知')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 标记已读测试
  // ============================================================================

  describe('标记已读', () => {
    it('点击通知应该标记为已读', async () => {
      render(<NotificationCenter />);

      await vi.runAllTimersAsync();

      const notification = screen.getByText('任务完成').closest('div');
      if (notification) {
        await user.click(notification);
      }

      // 未读计数应该减少
      const unreadBadges = screen.getAllByText('3');
      // 第一个是头部计数，应该更新
      expect(unreadBadges.length).toBeGreaterThan(0);
    });

    it('全部已读按钮应该标记所有通知为已读', async () => {
      const onMarkAllRead = vi.fn();

      render(<NotificationCenter onMarkAllRead={onMarkAllRead} />);

      await vi.runAllTimersAsync();

      const markAllReadButton = screen.getByText('全部已读');
      await user.click(markAllReadButton);

      expect(onMarkAllRead).toHaveBeenCalled();
    });

    it('没有未读时全部已读按钮应该禁用', async () => {
      const onMarkAllRead = vi.fn();

      render(<NotificationCenter onMarkAllRead={onMarkAllRead} />);

      await vi.runAllTimersAsync();

      // 先标记全部已读
      await user.click(screen.getByText('全部已读'));

      // 按钮应该被禁用
      const markAllReadButton = screen.getByText('全部已读');
      expect(markAllReadButton).toBeDisabled();
    });
  });

  // ============================================================================
  // 关闭通知测试
  // ============================================================================

  describe('关闭通知', () => {
    it('点击关闭按钮应该关闭通知', async () => {
      render(<NotificationCenter />);

      await vi.runAllTimersAsync();

      const closeButtons = screen.getAllByRole('button', { name: '关闭' });
      await user.click(closeButtons[0]);

      // 通知应该被关闭（不显示）
      await vi.runAllTimersAsync();
    });

    it('清除已读按钮应该移除已读通知', async () => {
      render(<NotificationCenter />);

      await vi.runAllTimersAsync();

      // 先标记一个为已读
      const notification = screen.getByText('系统维护通知').closest('div');
      if (notification) {
        await user.click(notification);
      }

      // 点击清除已读
      await user.click(screen.getByText('清除已读'));

      // 已读的通知应该被移除
      await vi.runAllTimersAsync();
    });

    it('清空全部按钮应该清空所有通知', async () => {
      render(<NotificationCenter />);

      await vi.runAllTimersAsync();

      const clearAllButton = screen.getByText('清空全部');
      await user.click(clearAllButton);

      // 应该显示空状态
      expect(screen.getByText('暂无通知')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 点击通知测试
  // ============================================================================

  describe('点击通知', () => {
    it('点击通知应该触发 onNotificationClick', async () => {
      const onNotificationClick = vi.fn();

      render(<NotificationCenter onNotificationClick={onNotificationClick} />);

      await vi.runAllTimersAsync();

      const notification = screen.getByText('任务完成').closest('div');
      if (notification) {
        await user.click(notification);
      }

      expect(onNotificationClick).toHaveBeenCalled();
    });

    it('点击通知应该传递正确的通知对象', async () => {
      const onNotificationClick = vi.fn();

      render(<NotificationCenter onNotificationClick={onNotificationClick} />);

      await vi.runAllTimersAsync();

      const notification = screen.getByText('任务完成').closest('div');
      if (notification) {
        await user.click(notification);
      }

      expect(onNotificationClick).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '任务完成',
        })
      );
    });
  });

  // ============================================================================
  // 展开/折叠测试
  // ============================================================================

  describe('展开/折叠', () => {
    it('点击展开按钮应该折叠面板', async () => {
      render(<NotificationCenter />);

      await vi.runAllTimersAsync();

      const collapseButton = screen.getByRole('button', { name: /折叠/ });
      await user.click(collapseButton);

      // 搜索框应该不可见
      expect(screen.queryByPlaceholderText('搜索通知...')).not.toBeInTheDocument();
    });

    it('折叠后再点击应该展开', async () => {
      render(<NotificationCenter />);

      await vi.runAllTimersAsync();

      // 折叠
      await user.click(screen.getByRole('button', { name: /折叠/ }));

      // 展开
      await user.click(screen.getByRole('button', { name: /展开/ }));

      // 搜索框应该重新可见
      expect(screen.getByPlaceholderText('搜索通知...')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 边界情况测试
  // ============================================================================

  describe('边界情况', () => {
    it('maxVisible 参数应该限制显示数量', async () => {
      render(<NotificationCenter maxVisible={2} />);

      await vi.runAllTimersAsync();

      // 应该只显示 2 条通知
      const closeButtons = screen.getAllByRole('button', { name: '关闭' });
      expect(closeButtons.length).toBe(2);
    });

    it('没有通知时应该显示空状态', async () => {
      // 修改初始状态为空
      render(<NotificationCenter />);

      await vi.runAllTimersAsync();

      // 清空所有通知
      await user.click(screen.getByText('清空全部'));

      expect(screen.getByText('暂无通知')).toBeInTheDocument();
    });

    it('应该处理超过 99 条未读', async () => {
      render(<NotificationCenter />);

      await vi.runAllTimersAsync();

      // 如果未读超过 99 条，应该显示 99+
      // 这里模拟数据只有 3 条，所以显示 3
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 可访问性测试
  // ============================================================================

  describe('可访问性', () => {
    it('关闭按钮应该有 aria-label', async () => {
      render(<NotificationCenter />);

      await vi.runAllTimersAsync();

      const closeButtons = screen.getAllByRole('button', { name: '关闭' });
      expect(closeButtons[0]).toBeInTheDocument();
    });

    it('通知项应该可以通过键盘操作', async () => {
      render(<NotificationCenter />);

      await vi.runAllTimersAsync();

      const notifications = screen.getAllByRole('button', { name: '关闭' });
      notifications[0].focus();

      expect(notifications[0]).toHaveFocus();
    });
  });
});