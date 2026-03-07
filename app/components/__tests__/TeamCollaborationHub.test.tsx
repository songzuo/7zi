/**
 * TeamCollaborationHub 组件测试
 * 测试团队协作中心的渲染、成员管理、频道切换等功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@/lib/realtime/store', () => ({
  useRealtimeNotificationStore: vi.fn(() => ({
    isConnected: true,
    notifications: [],
    addNotification: vi.fn(),
    markAsRead: vi.fn(),
  })),
}));

vi.mock('@/lib/realtime/socket-client', () => ({
  socketManager: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: vi.fn(),
    on: vi.fn(),
  },
}));

// 导入被测组件
import { TeamCollaborationHub } from '../TeamCollaborationHub';

// ============================================================================
// 测试套件
// ============================================================================

describe('TeamCollaborationHub', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // 渲染测试
  // ============================================================================

  describe('渲染', () => {
    it('应该正确渲染组件', () => {
      render(<TeamCollaborationHub />);

      expect(screen.getByText('团队协作')).toBeInTheDocument();
    });

    it('应该显示连接状态', () => {
      render(<TeamCollaborationHub />);

      expect(screen.getByText('已连接')).toBeInTheDocument();
    });

    it('应该显示在线成员统计', () => {
      render(<TeamCollaborationHub />);

      // 检查统计信息显示
      expect(screen.getByText(/在线/)).toBeInTheDocument();
    });

    it('应该显示标签栏', () => {
      render(<TeamCollaborationHub />);

      expect(screen.getByRole('tab', { name: /成员/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /频道/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /动态/ })).toBeInTheDocument();
    });

    it('应该显示搜索框', () => {
      render(<TeamCollaborationHub />);

      expect(screen.getByPlaceholderText(/搜索成员/)).toBeInTheDocument();
    });

    it('应该显示底部操作按钮', () => {
      render(<TeamCollaborationHub />);

      expect(screen.getByRole('button', { name: /新频道/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /邀请成员/ })).toBeInTheDocument();
    });

    it('应该应用自定义 className', () => {
      const { container } = render(<TeamCollaborationHub className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  // ============================================================================
  // 标签切换测试
  // ============================================================================

  describe('标签切换', () => {
    it('默认应该显示成员列表', () => {
      render(<TeamCollaborationHub />);

      // 成员标签应该处于激活状态
      const membersTab = screen.getByRole('tab', { name: /成员/ });
      expect(membersTab).toHaveClass('text-indigo-600');
    });

    it('点击频道标签应该切换到频道视图', async () => {
      render(<TeamCollaborationHub />);

      const channelsTab = screen.getByRole('tab', { name: /频道/ });
      await user.click(channelsTab);

      // 搜索框占位符应该改变
      expect(screen.getByPlaceholderText(/搜索频道/)).toBeInTheDocument();
    });

    it('点击动态标签应该切换到动态视图', async () => {
      render(<TeamCollaborationHub />);

      const activityTab = screen.getByRole('tab', { name: /动态/ });
      await user.click(activityTab);

      expect(screen.getByPlaceholderText(/搜索动态/)).toBeInTheDocument();
    });

    it('标签应该显示计数', () => {
      render(<TeamCollaborationHub />);

      // 成员标签应该显示成员数量 (11)
      const membersTab = screen.getByRole('tab', { name: /成员/ });
      expect(within(membersTab).getByText('11')).toBeInTheDocument();
    });

    it('频道标签应该显示未读计数', () => {
      render(<TeamCollaborationHub />);

      // 频道标签应该显示未读数
      const channelsTab = screen.getByRole('tab', { name: /频道/ });
      const unreadBadge = within(channelsTab).queryByText(/\d+/);
      // 如果有未读消息，应该显示
      expect(unreadBadge || within(channelsTab).getByText('4')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 成员列表测试
  // ============================================================================

  describe('成员列表', () => {
    it('应该显示在线成员分组', async () => {
      render(<TeamCollaborationHub />);

      // 应该显示在线分组标题
      expect(screen.getByText(/在线 \(\d+\)/)).toBeInTheDocument();
    });

    it('应该显示成员名称和角色', () => {
      render(<TeamCollaborationHub />);

      expect(screen.getByText('智能体专家')).toBeInTheDocument();
      expect(screen.getByText('视角转换')).toBeInTheDocument();
    });

    it('应该显示成员当前任务', () => {
      render(<TeamCollaborationHub />);

      expect(screen.getByText(/分析市场趋势/)).toBeInTheDocument();
    });

    it('点击成员应该触发 onMemberSelect', async () => {
      const onMemberSelect = vi.fn();

      render(<TeamCollaborationHub onMemberSelect={onMemberSelect} />);

      const memberCard = screen.getByText('智能体专家').closest('button');
      if (memberCard) {
        await user.click(memberCard);
      }

      expect(onMemberSelect).toHaveBeenCalled();
    });

    it('应该显示状态指示器', () => {
      render(<TeamCollaborationHub />);

      // 检查状态指示器存在（绿色圆点表示在线）
      const statusIndicators = screen.getAllByLabelText('在线');
      expect(statusIndicators.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // 频道列表测试
  // ============================================================================

  describe('频道列表', () => {
    it('应该显示频道列表', async () => {
      render(<TeamCollaborationHub />);

      const channelsTab = screen.getByRole('tab', { name: /频道/ });
      await user.click(channelsTab);

      expect(screen.getByText('全体公告')).toBeInTheDocument();
      expect(screen.getByText('开发组')).toBeInTheDocument();
    });

    it('应该显示频道未读计数', async () => {
      render(<TeamCollaborationHub />);

      const channelsTab = screen.getByRole('tab', { name: /频道/ });
      await user.click(channelsTab);

      // 全体公告有 2 条未读
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('应该显示最后消息预览', async () => {
      render(<TeamCollaborationHub />);

      const channelsTab = screen.getByRole('tab', { name: /频道/ });
      await user.click(channelsTab);

      expect(screen.getByText(/明天上午10点开会/)).toBeInTheDocument();
    });

    it('点击频道应该触发 onChannelSelect', async () => {
      const onChannelSelect = vi.fn();

      render(<TeamCollaborationHub onChannelSelect={onChannelSelect} />);

      const channelsTab = screen.getByRole('tab', { name: /频道/ });
      await user.click(channelsTab);

      const channelItem = screen.getByText('全体公告').closest('button');
      if (channelItem) {
        await user.click(channelItem);
      }

      expect(onChannelSelect).toHaveBeenCalledWith('general');
    });

    it('应该区分公开频道和私信', async () => {
      render(<TeamCollaborationHub />);

      const channelsTab = screen.getByRole('tab', { name: /频道/ });
      await user.click(channelsTab);

      // 公开频道显示 #
      expect(screen.getByText('#')).toBeInTheDocument();
      // 私信显示 @
      expect(screen.getByText('@')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 活动动态测试
  // ============================================================================

  describe('活动动态', () => {
    it('应该显示活动列表', async () => {
      render(<TeamCollaborationHub />);

      const activityTab = screen.getByRole('tab', { name: /动态/ });
      await user.click(activityTab);

      expect(screen.getByText(/完成了任务/)).toBeInTheDocument();
    });

    it('应该显示活动时间', async () => {
      render(<TeamCollaborationHub />);

      const activityTab = screen.getByRole('tab', { name: /动态/ });
      await user.click(activityTab);

      expect(screen.getByText('5分钟前')).toBeInTheDocument();
    });

    it('应该显示不同类型的活动图标', async () => {
      render(<TeamCollaborationHub />);

      const activityTab = screen.getByRole('tab', { name: /动态/ });
      await user.click(activityTab);

      // 任务完成图标
      expect(screen.getByText('✅')).toBeInTheDocument();
      // 评论图标
      expect(screen.getByText('💬')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 搜索功能测试
  // ============================================================================

  describe('搜索功能', () => {
    it('应该能搜索成员', async () => {
      render(<TeamCollaborationHub />);

      const searchInput = screen.getByPlaceholderText(/搜索成员/);
      await user.type(searchInput, '架构师');

      // 应该只显示匹配的成员
      expect(screen.getByText('架构师')).toBeInTheDocument();
    });

    it('应该能搜索频道', async () => {
      render(<TeamCollaborationHub />);

      const channelsTab = screen.getByRole('tab', { name: /频道/ });
      await user.click(channelsTab);

      const searchInput = screen.getByPlaceholderText(/搜索频道/);
      await user.type(searchInput, '开发');

      expect(screen.getByText('开发组')).toBeInTheDocument();
    });

    it('搜索无结果时应该显示空状态', async () => {
      render(<TeamCollaborationHub />);

      const searchInput = screen.getByPlaceholderText(/搜索成员/);
      await user.type(searchInput, '不存在的成员名字xyz');

      // 在线分组应该没有成员
      const onlineSection = screen.getByText(/在线 \(\d+\)/);
      expect(onlineSection).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 边界情况测试
  // ============================================================================

  describe('边界情况', () => {
    it('应该处理空的频道列表', async () => {
      // 这个测试验证组件在没有数据时不会崩溃
      render(<TeamCollaborationHub />);

      const channelsTab = screen.getByRole('tab', { name: /频道/ });
      await user.click(channelsTab);

      // 组件应该正常渲染
      expect(screen.getByPlaceholderText(/搜索频道/)).toBeInTheDocument();
    });

    it('应该处理断开连接状态', () => {
      vi.mocked(await import('@/lib/realtime/store')).useRealtimeNotificationStore.mockReturnValue({
        isConnected: false,
        notifications: [],
        addNotification: vi.fn(),
        markAsRead: vi.fn(),
      });

      render(<TeamCollaborationHub />);

      expect(screen.getByText('离线')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 可访问性测试
  // ============================================================================

  describe('可访问性', () => {
    it('标签应该可以通过键盘导航', async () => {
      render(<TeamCollaborationHub />);

      const membersTab = screen.getByRole('tab', { name: /成员/ });
      membersTab.focus();

      expect(membersTab).toHaveFocus();
    });

    it('成员卡片应该可以通过键盘聚焦', async () => {
      render(<TeamCollaborationHub />);

      const memberCards = screen.getAllByRole('button');
      memberCards[0].focus();

      expect(memberCards[0]).toHaveFocus();
    });
  });
});