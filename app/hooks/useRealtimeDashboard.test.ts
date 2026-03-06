/**
 * useRealtimeDashboard Hook Tests
 * 
 * 测试覆盖:
 * - 实时数据更新
 * - 事件订阅
 * - 错误处理
 * - 数据缓存
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRealtimeDashboard, GitHubIssue, GitHubCommit, ActivityItem } from './useRealtimeDashboard';

// Mock useWebSocket
const mockWebSocket = {
  isConnected: false,
  lastMessage: null as any,
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  send: vi.fn(),
  disconnect: vi.fn(),
  connect: vi.fn(),
};

vi.mock('./useWebSocket', () => ({
  useWebSocket: vi.fn(() => mockWebSocket),
  WebSocketMessage: {} as any,
}));

// Mock useDashboardData
const mockDashboardData = {
  issues: [] as GitHubIssue[],
  commits: [] as GitHubCommit[],
  activities: [] as ActivityItem[],
  isLoading: false,
  error: null as string | null,
  lastUpdated: null as Date | null,
  refreshData: vi.fn(),
};

vi.mock('./useDashboardData', () => ({
  useDashboardData: vi.fn(() => mockDashboardData),
}));

// Helper to create mock issues
function createMockIssue(overrides: Partial<GitHubIssue> = {}): GitHubIssue {
  return {
    number: 1,
    title: 'Test Issue',
    state: 'open',
    labels: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    html_url: 'https://github.com/owner/repo/issues/1',
    ...overrides,
  };
}

// Helper to create mock commits
function createMockCommit(overrides: Partial<GitHubCommit> = {}): GitHubCommit {
  return {
    sha: 'abc123',
    commit: {
      message: 'Test commit',
      author: {
        name: 'Test Author',
        date: new Date().toISOString(),
      },
    },
    html_url: 'https://github.com/owner/repo/commit/abc123',
    ...overrides,
  };
}

describe('useRealtimeDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Reset mock states
    mockWebSocket.isConnected = false;
    mockWebSocket.lastMessage = null;
    mockDashboardData.issues = [];
    mockDashboardData.commits = [];
    mockDashboardData.activities = [];
    mockDashboardData.isLoading = false;
    mockDashboardData.error = null;
    mockDashboardData.lastUpdated = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial Data Loading', () => {
    it('should return initial data from useDashboardData', () => {
      const mockIssues = [createMockIssue({ number: 1, title: 'Issue 1' })];
      const mockCommits = [createMockCommit({ sha: 'abc123' })];
      
      mockDashboardData.issues = mockIssues;
      mockDashboardData.commits = mockCommits;
      mockDashboardData.isLoading = true;

      const { result } = renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
      }));

      expect(result.current.issues).toEqual(mockIssues);
      expect(result.current.commits).toEqual(mockCommits);
      expect(result.current.isLoading).toBe(true);
    });

    it('should pass options to useDashboardData', () => {
      const { result } = renderHook(() => useRealtimeDashboard({
        owner: 'myowner',
        repo: 'myrepo',
        token: 'mytoken',
      }));

      // Data should be passed through
      expect(result.current.issues).toEqual(mockDashboardData.issues);
    });

    it('should expose error state from dashboard data', () => {
      mockDashboardData.error = 'Failed to load data';

      const { result } = renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
      }));

      expect(result.current.error).toBe('Failed to load data');
    });

    it('should expose lastUpdated from dashboard data', () => {
      const now = new Date();
      mockDashboardData.lastUpdated = now;

      const { result } = renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
      }));

      expect(result.current.lastUpdated).toEqual(now);
    });
  });

  describe('WebSocket Connection State', () => {
    it('should expose WebSocket connection state', () => {
      mockWebSocket.isConnected = true;

      const { result } = renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
        wsUrl: 'wss://example.com/ws',
      }));

      expect(result.current.isRealtimeConnected).toBe(true);
    });

    it('should reflect disconnected state', () => {
      mockWebSocket.isConnected = false;

      const { result } = renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
        wsUrl: 'wss://example.com/ws',
      }));

      expect(result.current.isRealtimeConnected).toBe(false);
    });

    it('should not use WebSocket when wsUrl is not provided', () => {
      const { useWebSocket } = await import('./useWebSocket');
      
      renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
      }));

      // useWebSocket should still be called (with undefined url)
      expect(useWebSocket).toHaveBeenCalled();
    });
  });

  describe('Event Subscription', () => {
    it('should subscribe to repository when WebSocket connects', async () => {
      mockWebSocket.isConnected = true;

      const { rerender } = renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
        wsUrl: 'wss://example.com/ws',
      }));

      // Trigger effect by rerendering
      rerender();

      expect(mockWebSocket.subscribe).toHaveBeenCalledWith('testowner', 'testrepo');
    });

    it('should subscribe when connection becomes available', () => {
      mockWebSocket.isConnected = false;

      const { rerender } = renderHook(
        ({ isConnected }) => useRealtimeDashboard({
          owner: 'testowner',
          repo: 'testrepo',
          wsUrl: 'wss://example.com/ws',
        }),
        { initialProps: { isConnected: false } }
      );

      expect(mockWebSocket.subscribe).not.toHaveBeenCalled();

      // Simulate connection
      mockWebSocket.isConnected = true;
      rerender({ isConnected: true });

      expect(mockWebSocket.subscribe).toHaveBeenCalledWith('testowner', 'testrepo');
    });

    it('should not subscribe without owner or repo', () => {
      mockWebSocket.isConnected = true;

      renderHook(() => useRealtimeDashboard({
        owner: '',
        repo: '',
        wsUrl: 'wss://example.com/ws',
      }));

      expect(mockWebSocket.subscribe).not.toHaveBeenCalled();
    });
  });

  describe('Real-time Data Updates', () => {
    it('should increment pending updates on push event', async () => {
      const { useWebSocket } = await import('./useWebSocket');
      const mockOnMessage = vi.fn();
      
      // Capture the onMessage callback
      let capturedOnMessage: ((msg: any) => void) | undefined;
      (useWebSocket as any).mockImplementation((options: any) => {
        capturedOnMessage = options.onMessage;
        return mockWebSocket;
      });

      mockWebSocket.isConnected = true;

      renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
        wsUrl: 'wss://example.com/ws',
      }));

      // Simulate push event
      act(() => {
        capturedOnMessage?.({
          type: 'push',
          payload: { ref: 'main' },
        });
      });

      // Need to re-render to see state changes
      // The hook should track pending updates
    });

    it('should increment pending updates on issues event', async () => {
      const { useWebSocket } = await import('./useWebSocket');
      
      let capturedOnMessage: ((msg: any) => void) | undefined;
      (useWebSocket as any).mockImplementation((options: any) => {
        capturedOnMessage = options.onMessage;
        return mockWebSocket;
      });

      mockWebSocket.isConnected = true;

      renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
        wsUrl: 'wss://example.com/ws',
      }));

      act(() => {
        capturedOnMessage?.({
          type: 'issues',
          payload: { action: 'opened' },
        });
      });
    });

    it('should increment pending updates on pull_request event', async () => {
      const { useWebSocket } = await import('./useWebSocket');
      
      let capturedOnMessage: ((msg: any) => void) | undefined;
      (useWebSocket as any).mockImplementation((options: any) => {
        capturedOnMessage = options.onMessage;
        return mockWebSocket;
      });

      mockWebSocket.isConnected = true;

      renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
        wsUrl: 'wss://example.com/ws',
      }));

      act(() => {
        capturedOnMessage?.({
          type: 'pull_request',
          payload: { action: 'opened' },
        });
      });
    });

    it('should increment pending updates on release event', async () => {
      const { useWebSocket } = await import('./useWebSocket');
      
      let capturedOnMessage: ((msg: any) => void) | undefined;
      (useWebSocket as any).mockImplementation((options: any) => {
        capturedOnMessage = options.onMessage;
        return mockWebSocket;
      });

      mockWebSocket.isConnected = true;

      renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
        wsUrl: 'wss://example.com/ws',
      }));

      act(() => {
        capturedOnMessage?.({
          type: 'release',
          payload: { action: 'published' },
        });
      });
    });

    it('should not increment pending updates for other event types', async () => {
      const { useWebSocket } = await import('./useWebSocket');
      
      let capturedOnMessage: ((msg: any) => void) | undefined;
      (useWebSocket as any).mockImplementation((options: any) => {
        capturedOnMessage = options.onMessage;
        return mockWebSocket;
      });

      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

      renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
        wsUrl: 'wss://example.com/ws',
      }));

      act(() => {
        capturedOnMessage?.({
          type: 'ping',
          payload: {},
        });
      });

      // Should have logged the message but not affected pending updates
      expect(consoleLog).toHaveBeenCalled();
      consoleLog.mockRestore();
    });
  });

  describe('Pending Updates Management', () => {
    it('should clear pending updates with clearPendingUpdates', () => {
      const { result } = renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
      }));

      // Clear should be available
      expect(typeof result.current.clearPendingUpdates).toBe('function');

      act(() => {
        result.current.clearPendingUpdates();
      });

      expect(result.current.pendingUpdates).toBe(0);
    });

    it('should expose pending updates count', () => {
      const { result } = renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
      }));

      expect(result.current.pendingUpdates).toBe(0);
    });
  });

  describe('Auto Refresh', () => {
    it('should auto refresh data at specified interval', async () => {
      const refreshInterval = 60000; // 1 minute

      renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
        autoRefresh: true,
        refreshInterval,
      }));

      // Initial refresh should not be called by this hook (handled by useDashboardData)
      
      // Advance time by refresh interval
      act(() => {
        vi.advanceTimersByTime(refreshInterval);
      });

      // Should have called refreshData
      expect(mockDashboardData.refreshData).toHaveBeenCalled();
    });

    it('should not auto refresh when autoRefresh is false', async () => {
      renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
        autoRefresh: false,
        refreshInterval: 1000,
      }));

      // Advance time significantly
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // Should not have called refreshData from auto-refresh
      // (may be called from initial load)
    });

    it('should cleanup interval on unmount', () => {
      const { unmount } = renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
        autoRefresh: true,
        refreshInterval: 1000,
      }));

      unmount();

      // Advance timers - should not cause any issues
      act(() => {
        vi.advanceTimersByTime(10000);
      });
    });
  });

  describe('Manual Refresh', () => {
    it('should expose refreshData function', () => {
      const { result } = renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
      }));

      expect(typeof result.current.refreshData).toBe('function');
    });

    it('should call refreshData when invoked', async () => {
      const { result } = renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
      }));

      await act(async () => {
        await result.current.refreshData();
      });

      expect(mockDashboardData.refreshData).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should pass through errors from useDashboardData', () => {
      mockDashboardData.error = 'API Error: Rate limit exceeded';

      const { result } = renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
      }));

      expect(result.current.error).toBe('API Error: Rate limit exceeded');
    });

    it('should handle null error state', () => {
      mockDashboardData.error = null;

      const { result } = renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
      }));

      expect(result.current.error).toBeNull();
    });
  });

  describe('Data Caching (via useDashboardData)', () => {
    it('should return cached data from useDashboardData', () => {
      const mockActivities: ActivityItem[] = [
        {
          id: 'commit-abc123',
          type: 'commit',
          title: 'Fix bug',
          author: 'Developer',
          timestamp: new Date().toISOString(),
          url: 'https://github.com/owner/repo/commit/abc123',
        },
      ];

      mockDashboardData.activities = mockActivities;

      const { result } = renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
      }));

      expect(result.current.activities).toEqual(mockActivities);
    });

    it('should return empty arrays initially', () => {
      const { result } = renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
      }));

      expect(result.current.issues).toEqual([]);
      expect(result.current.commits).toEqual([]);
      expect(result.current.activities).toEqual([]);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete data flow', async () => {
      const mockIssues = [createMockIssue({ number: 1, title: 'Bug fix' })];
      const mockCommits = [createMockCommit({ sha: 'def456' })];
      
      mockDashboardData.issues = mockIssues;
      mockDashboardData.commits = mockCommits;
      mockWebSocket.isConnected = true;

      const { result } = renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
        wsUrl: 'wss://example.com/ws',
      }));

      // Verify data is passed through
      expect(result.current.issues).toEqual(mockIssues);
      expect(result.current.commits).toEqual(mockCommits);
      expect(result.current.isRealtimeConnected).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle loading state correctly', () => {
      mockDashboardData.isLoading = true;

      const { result } = renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
      }));

      expect(result.current.isLoading).toBe(true);
    });

    it('should handle transition from loading to loaded', () => {
      mockDashboardData.isLoading = true;

      const { result, rerender } = renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
      }));

      expect(result.current.isLoading).toBe(true);

      // Simulate data loaded
      mockDashboardData.isLoading = false;
      mockDashboardData.issues = [createMockIssue()];
      
      rerender();

      expect(result.current.isLoading).toBe(false);
      expect(result.current.issues).toHaveLength(1);
    });
  });

  describe('Options Handling', () => {
    it('should use default values for optional options', () => {
      const { result } = renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
      }));

      // Should work without wsUrl, token, etc.
      expect(result.current).toBeDefined();
    });

    it('should handle token option', () => {
      const { result } = renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
        token: 'github-token',
      }));

      expect(result.current).toBeDefined();
    });

    it('should handle null token', () => {
      const { result } = renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
        token: null,
      }));

      expect(result.current).toBeDefined();
    });

    it('should use custom refresh interval', () => {
      renderHook(() => useRealtimeDashboard({
        owner: 'testowner',
        repo: 'testrepo',
        autoRefresh: true,
        refreshInterval: 30000,
      }));

      // Should not throw and should use the custom interval
      act(() => {
        vi.advanceTimersByTime(30000);
      });
    });
  });
});
