import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEnhancedNotifications } from '@/hooks/useEnhancedNotifications';
import { useTeamCollaboration } from '@/hooks/useTeamCollaboration';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ============================================================================
// useEnhancedNotifications 测试
// ============================================================================

describe('useEnhancedNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该初始化为空数组', () => {
    const { result } = renderHook(() => useEnhancedNotifications({ autoFetch: false }));
    
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.urgentCount).toBe(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('应该成功获取通知', async () => {
    const mockNotifications = [
      {
        id: '1',
        type: 'success',
        category: 'task',
        priority: 'normal',
        title: '测试通知',
        message: '这是一条测试通知',
        timestamp: new Date().toISOString(),
        read: false,
        dismissed: false,
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          notifications: mockNotifications,
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          stats: { total: 1, unread: 1, urgent: 0 },
        },
      }),
    });

    const { result } = renderHook(() => useEnhancedNotifications({ autoFetch: false }));

    await act(async () => {
      await result.current.fetchNotifications();
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].title).toBe('测试通知');
    expect(result.current.unreadCount).toBe(1);
  });

  it('应该正确处理错误', async () => {
    mockFetch.mockRejectedValueOnce(new Error('网络错误'));

    const { result } = renderHook(() => useEnhancedNotifications({ autoFetch: false }));

    await act(async () => {
      await result.current.fetchNotifications();
    });

    expect(result.current.error).not.toBeNull();
    // 错误消息可能来自原始错误或包装后的错误
    expect(['网络错误', '获取通知失败', '未知错误']).toContain(result.current.error?.message);
  });

  it('应该正确添加通知', () => {
    const { result } = renderHook(() => useEnhancedNotifications({ autoFetch: false }));

    act(() => {
      result.current.push({
        type: 'success',
        category: 'task',
        priority: 'normal',
        title: '新通知',
        message: '测试消息',
      });
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].title).toBe('新通知');
    expect(result.current.unreadCount).toBe(1);
  });

  it('应该正确使用快捷方法', () => {
    const { result } = renderHook(() => useEnhancedNotifications({ autoFetch: false }));

    act(() => {
      result.current.success('成功', '操作成功');
      result.current.notifyError('错误', '操作失败');
      result.current.warning('警告', '请注意');
      result.current.info('信息', '提示信息');
    });

    expect(result.current.notifications).toHaveLength(4);
  });

  it('应该正确标记已读', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { updatedCount: 1 } }),
    });

    const { result } = renderHook(() => useEnhancedNotifications({ autoFetch: false }));

    act(() => {
      result.current.push({
        type: 'success',
        category: 'task',
        priority: 'normal',
        title: '测试',
        message: '消息',
      });
    });

    const notificationId = result.current.notifications[0].id;

    await act(async () => {
      await result.current.markAsRead(notificationId);
    });

    expect(result.current.notifications[0].read).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it('应该正确过滤通知', () => {
    const { result } = renderHook(() => useEnhancedNotifications({ autoFetch: false }));

    act(() => {
      result.current.push({
        type: 'success',
        category: 'task',
        priority: 'normal',
        title: '任务通知',
        message: '消息',
      });
      result.current.push({
        type: 'info',
        category: 'message',
        priority: 'normal',
        title: '消息通知',
        message: '消息',
      });
    });

    act(() => {
      result.current.setFilter('task');
    });

    expect(result.current.filteredNotifications).toHaveLength(1);
    expect(result.current.filteredNotifications[0].category).toBe('task');
  });

  it('应该正确搜索通知', () => {
    const { result } = renderHook(() => useEnhancedNotifications({ autoFetch: false }));

    act(() => {
      result.current.push({
        type: 'success',
        category: 'task',
        priority: 'normal',
        title: '任务完成',
        message: '消息',
      });
      result.current.push({
        type: 'info',
        category: 'message',
        priority: 'normal',
        title: '新消息',
        message: '消息',
      });
    });

    act(() => {
      result.current.setSearchQuery('任务');
    });

    expect(result.current.filteredNotifications).toHaveLength(1);
    expect(result.current.filteredNotifications[0].title).toBe('任务完成');
  });

  it('应该正确关闭通知', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { updatedCount: 1 } }),
    });

    const { result } = renderHook(() => useEnhancedNotifications({ autoFetch: false }));

    act(() => {
      result.current.push({
        type: 'success',
        category: 'task',
        priority: 'normal',
        title: '测试',
        message: '消息',
      });
    });

    const notificationId = result.current.notifications[0].id;

    await act(async () => {
      await result.current.dismiss(notificationId);
    });

    expect(result.current.notifications[0].dismissed).toBe(true);
  });
});

// ============================================================================
// useTeamCollaboration 测试
// ============================================================================

describe('useTeamCollaboration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('应该初始化为空数组', () => {
    const { result } = renderHook(() => useTeamCollaboration({ autoFetch: false }));
    
    expect(result.current.members).toEqual([]);
    expect(result.current.channels).toEqual([]);
    expect(result.current.stats).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('应该成功获取成员列表', async () => {
    const mockMembers = [
      { id: '1', name: 'Executor', role: '执行', status: 'online' },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          members: mockMembers,
          stats: { total: 1, online: 1, busy: 0, away: 0, offline: 0 },
        },
      }),
    });

    const { result } = renderHook(() => useTeamCollaboration({ autoFetch: false }));

    await act(async () => {
      await result.current.fetchMembers();
    });

    expect(result.current.members).toHaveLength(1);
    expect(result.current.members[0].name).toBe('Executor');
    expect(result.current.stats?.online).toBe(1);
  });

  it('应该成功获取频道列表', async () => {
    const mockChannels = [
      { id: '1', name: '全体公告', type: 'public', unreadCount: 2 },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          channels: mockChannels,
          stats: { total: 1, totalUnread: 2 },
        },
      }),
    });

    const { result } = renderHook(() => useTeamCollaboration({ autoFetch: false }));

    await act(async () => {
      await result.current.fetchChannels();
    });

    expect(result.current.channels).toHaveLength(1);
    expect(result.current.channels[0].name).toBe('全体公告');
    expect(result.current.totalUnread).toBe(2);
  });

  it('应该正确过滤成员', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          members: [
            { id: '1', name: 'Executor', role: '执行', status: 'online' },
            { id: '2', name: '架构师', role: '设计', status: 'online' },
          ],
          stats: { total: 2, online: 2, busy: 0, away: 0, offline: 0 },
        },
      }),
    });

    const { result } = renderHook(() => useTeamCollaboration({ autoFetch: false }));

    await act(async () => {
      await result.current.fetchMembers();
    });

    act(() => {
      result.current.setSearchQuery('Executor');
    });

    expect(result.current.filteredMembers).toHaveLength(1);
  });

  it('应该正确计算在线成员', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          members: [
            { id: '1', name: 'Executor', role: '执行', status: 'online' },
            { id: '2', name: '架构师', role: '设计', status: 'busy' },
            { id: '3', name: '测试员', role: '测试', status: 'offline' },
          ],
          stats: { total: 3, online: 1, busy: 1, away: 0, offline: 1 },
        },
      }),
    });

    const { result } = renderHook(() => useTeamCollaboration({ autoFetch: false }));

    await act(async () => {
      await result.current.fetchMembers();
    });

    expect(result.current.onlineMembers).toHaveLength(2);
  });

  it('应该成功创建频道', async () => {
    const newChannel = {
      id: 'channel-123',
      name: '测试频道',
      type: 'public',
      unreadCount: 0,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: newChannel,
      }),
    });

    const { result } = renderHook(() => useTeamCollaboration({ autoFetch: false }));

    await act(async () => {
      await result.current.createChannel('测试频道', 'public');
    });

    expect(result.current.channels).toHaveLength(1);
    expect(result.current.channels[0].name).toBe('测试频道');
  });
});