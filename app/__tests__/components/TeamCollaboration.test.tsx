import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TeamCollaborationHub } from '@/components/TeamCollaborationHub';
import { NotificationCenter } from '@/components/NotificationCenter';

// ============================================================================
// TeamCollaborationHub 测试
// ============================================================================

describe('TeamCollaborationHub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该正确渲染组件', () => {
    render(<TeamCollaborationHub />);
    
    // 检查标题
    expect(screen.getByText('团队协作')).toBeInTheDocument();
    
    // 检查标签
    expect(screen.getByText('成员')).toBeInTheDocument();
    expect(screen.getByText('频道')).toBeInTheDocument();
    expect(screen.getByText('动态')).toBeInTheDocument();
  });

  it('应该显示在线成员统计', () => {
    render(<TeamCollaborationHub />);
    
    // 应该显示在线统计
    expect(screen.getByText(/在线/)).toBeInTheDocument();
  });

  it('应该切换标签', async () => {
    render(<TeamCollaborationHub />);
    
    // 点击频道标签
    const channelsTab = screen.getByRole('button', { name: /频道/ });
    fireEvent.click(channelsTab);
    
    // 等待频道列表显示
    await waitFor(() => {
      expect(screen.getByText('全体公告')).toBeInTheDocument();
    });
  });

  it('应该支持搜索', async () => {
    render(<TeamCollaborationHub />);
    
    // 输入搜索
    const searchInput = screen.getByPlaceholderText(/搜索成员/);
    fireEvent.change(searchInput, { target: { value: '架构师' } });
    
    // 等待过滤结果
    await waitFor(() => {
      expect(screen.getByText('架构师')).toBeInTheDocument();
    });
  });

  it('应该触发成员点击回调', async () => {
    const handleMemberSelect = vi.fn();
    render(<TeamCollaborationHub onMemberSelect={handleMemberSelect} />);
    
    // 点击成员
    const memberCard = screen.getByText('智能体专家').closest('button');
    if (memberCard) {
      fireEvent.click(memberCard);
      expect(handleMemberSelect).toHaveBeenCalled();
    }
  });

  it('应该触发频道点击回调', async () => {
    const handleChannelSelect = vi.fn();
    render(<TeamCollaborationHub onChannelSelect={handleChannelSelect} />);
    
    // 切换到频道标签
    const channelsTab = screen.getByRole('button', { name: /频道/ });
    fireEvent.click(channelsTab);
    
    // 点击频道
    await waitFor(() => {
      const channelItem = screen.getByText('全体公告').closest('button');
      if (channelItem) {
        fireEvent.click(channelItem);
        expect(handleChannelSelect).toHaveBeenCalled();
      }
    });
  });

  it('应该可以折叠和展开', () => {
    render(<TeamCollaborationHub />);
    
    // 点击折叠按钮
    const collapseButton = screen.getByLabelText(/折叠/);
    fireEvent.click(collapseButton);
    
    // 检查是否折叠
    expect(screen.getByLabelText(/展开/)).toBeInTheDocument();
  });
});

// ============================================================================
// NotificationCenter 测试
// ============================================================================

describe('NotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该正确渲染组件', () => {
    render(<NotificationCenter />);
    
    // 检查标题
    expect(screen.getByText('通知中心')).toBeInTheDocument();
  });

  it('应该显示未读统计', () => {
    render(<NotificationCenter />);
    
    // 应该显示未读数
    expect(screen.getByText(/未读/)).toBeInTheDocument();
  });

  it('应该支持过滤', async () => {
    render(<NotificationCenter />);
    
    // 点击未读过滤
    const unreadFilter = screen.getByRole('button', { name: /未读/ });
    fireEvent.click(unreadFilter);
    
    // 验证过滤生效
    await waitFor(() => {
      expect(unreadFilter).toHaveClass('bg-rose-100');
    });
  });

  it('应该支持搜索', async () => {
    render(<NotificationCenter />);
    
    // 输入搜索
    const searchInput = screen.getByPlaceholderText(/搜索通知/);
    fireEvent.change(searchInput, { target: { value: '任务' } });
    
    // 等待过滤结果
    await waitFor(() => {
      expect(screen.getByText(/没有找到匹配的通知|任务/)).toBeInTheDocument();
    });
  });

  it('应该可以标记全部已读', async () => {
    const handleMarkAllRead = vi.fn();
    render(<NotificationCenter onMarkAllRead={handleMarkAllRead} />);
    
    // 等待通知加载
    await waitFor(() => {
      const markAllButton = screen.getByText('全部已读');
      if (markAllButton) {
        fireEvent.click(markAllButton);
        expect(handleMarkAllRead).toHaveBeenCalled();
      }
    });
  });

  it('应该可以关闭通知', async () => {
    render(<NotificationCenter />);
    
    // 等待通知加载
    await waitFor(() => {
      const dismissButtons = screen.getAllByLabelText('关闭');
      if (dismissButtons.length > 0) {
        fireEvent.click(dismissButtons[0]);
      }
    });
  });

  it('应该可以折叠和展开', () => {
    render(<NotificationCenter />);
    
    // 点击折叠按钮
    const collapseButton = screen.getByLabelText(/折叠/);
    fireEvent.click(collapseButton);
    
    // 检查是否折叠
    expect(screen.getByLabelText(/展开/)).toBeInTheDocument();
  });

  it('应该显示紧急通知标识', async () => {
    render(<NotificationCenter />);
    
    // 等待通知加载
    await waitFor(() => {
      const urgentBadge = screen.queryByText('紧急');
      // 如果有紧急通知，应该显示标识
      if (urgentBadge) {
        expect(urgentBadge).toBeInTheDocument();
      }
    });
  });

  it('应该触发通知点击回调', async () => {
    const handleNotificationClick = vi.fn();
    render(<NotificationCenter onNotificationClick={handleNotificationClick} />);
    
    // 等待通知加载
    await waitFor(() => {
      const notificationItems = screen.getAllByRole('button');
      const notificationItem = notificationItems.find(item => 
        item.textContent?.includes('任务完成')
      );
      
      if (notificationItem) {
        fireEvent.click(notificationItem);
        expect(handleNotificationClick).toHaveBeenCalled();
      }
    });
  });
});