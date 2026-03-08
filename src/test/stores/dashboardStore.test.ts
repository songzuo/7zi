import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  useDashboardStore,
  useMembers,
  useDashboardStats,
  useMembersByStatus,
  useMember,
  useDashboardLoading,
  useDashboardError,
  useLastUpdated,
  getDashboardSnapshot,
} from '@/stores/dashboardStore'

// Mock fetch for GitHub API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('dashboardStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    // Reset store to initial state - wrap in act to batch updates
    act(() => {
      useDashboardStore.setState({
      members: [
        {
          id: 'agent-world-expert',
          name: '智能体世界专家',
          role: '视角转换/未来布局',
          emoji: '🌟',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=expert',
          status: 'working',
          provider: 'minimax',
          currentTask: '#42 分析市场趋势',
          completedTasks: 156,
        },
        {
          id: 'consultant',
          name: '咨询师',
          role: '研究/分析',
          emoji: '📚',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=consultant',
          status: 'idle',
          provider: 'minimax',
          currentTask: undefined,
          completedTasks: 203,
        },
        {
          id: 'architect',
          name: '架构师',
          role: '设计/规划',
          emoji: '🏗️',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=architect',
          status: 'busy',
          provider: 'self-claude',
          currentTask: '#45 系统架构评审',
          completedTasks: 178,
        },
        {
          id: 'executor',
          name: 'Executor',
          role: '执行/实现',
          emoji: '⚡',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=executor',
          status: 'working',
          provider: 'volcengine',
          currentTask: '#51 实现看板功能',
          completedTasks: 312,
        },
        {
          id: 'sysadmin',
          name: '系统管理员',
          role: '运维/部署',
          emoji: '🛡️',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=sysadmin',
          status: 'offline',
          provider: 'bailian',
          currentTask: undefined,
          completedTasks: 145,
        },
        {
          id: 'tester',
          name: '测试员',
          role: '测试/调试',
          emoji: '🧪',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=tester',
          status: 'working',
          provider: 'minimax',
          currentTask: '#49 单元测试编写',
          completedTasks: 267,
        },
        {
          id: 'designer',
          name: '设计师',
          role: 'UI 设计',
          emoji: '🎨',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=designer',
          status: 'busy',
          provider: 'self-claude',
          currentTask: '#47 界面优化',
          completedTasks: 189,
        },
        {
          id: 'marketing',
          name: '推广专员',
          role: '推广/SEO',
          emoji: '📣',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=marketing',
          status: 'idle',
          provider: 'volcengine',
          currentTask: undefined,
          completedTasks: 134,
        },
        {
          id: 'sales',
          name: '销售客服',
          role: '销售/客服',
          emoji: '💼',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=sales',
          status: 'offline',
          provider: 'bailian',
          currentTask: undefined,
          completedTasks: 98,
        },
        {
          id: 'finance',
          name: '财务',
          role: '会计/审计',
          emoji: '💰',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=finance',
          status: 'idle',
          provider: 'minimax',
          currentTask: undefined,
          completedTasks: 76,
        },
        {
          id: 'media',
          name: '媒体',
          role: '媒体/宣传',
          emoji: '📺',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=media',
          status: 'working',
          provider: 'self-claude',
          currentTask: '#44 宣传文案撰写',
          completedTasks: 112,
        },
      ],
      issues: [],
      activities: [],
      isLoading: false,
      error: null,
      lastUpdated: null,
    }) // merge with existing state
    }) // end act()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('状态指示器测试', () => {
    it('correctly counts members by status', () => {
      const state = useDashboardStore.getState()
      const stats = {
        totalMembers: state.members.length,
        working: state.members.filter((m) => m.status === 'working').length,
        busy: state.members.filter((m) => m.status === 'busy').length,
        idle: state.members.filter((m) => m.status === 'idle').length,
        offline: state.members.filter((m) => m.status === 'offline').length,
      }
      
      expect(stats.totalMembers).toBe(11)
      expect(stats.working).toBe(4) // expert, executor, tester, media
      expect(stats.busy).toBe(2) // architect, designer
      expect(stats.idle).toBe(3) // consultant, marketing, finance
      expect(stats.offline).toBe(2) // sysadmin, sales
    })

    it('correctly groups members by status', () => {
      const state = useDashboardStore.getState()
      const grouped = {
        working: state.members.filter((m) => m.status === 'working'),
        busy: state.members.filter((m) => m.status === 'busy'),
        idle: state.members.filter((m) => m.status === 'idle'),
        offline: state.members.filter((m) => m.status === 'offline'),
      }
      
      expect(grouped.working).toHaveLength(4)
      expect(grouped.busy).toHaveLength(2)
      expect(grouped.idle).toHaveLength(3)
      expect(grouped.offline).toHaveLength(2)
    })

    it('identifies working status members correctly', () => {
      const state = useDashboardStore.getState()
      const workingNames = state.members.filter((m) => m.status === 'working').map(m => m.name)
      expect(workingNames).toContain('智能体世界专家')
      expect(workingNames).toContain('Executor')
      expect(workingNames).toContain('测试员')
      expect(workingNames).toContain('媒体')
    })

    it('identifies busy status members correctly', () => {
      const state = useDashboardStore.getState()
      const busyNames = state.members.filter((m) => m.status === 'busy').map(m => m.name)
      expect(busyNames).toContain('架构师')
      expect(busyNames).toContain('设计师')
    })

    it('identifies idle status members correctly', () => {
      const state = useDashboardStore.getState()
      const idleNames = state.members.filter((m) => m.status === 'idle').map(m => m.name)
      expect(idleNames).toContain('咨询师')
      expect(idleNames).toContain('推广专员')
      expect(idleNames).toContain('财务')
    })

    it('identifies offline status members correctly', () => {
      const state = useDashboardStore.getState()
      const offlineNames = state.members.filter((m) => m.status === 'offline').map(m => m.name)
      expect(offlineNames).toContain('系统管理员')
      expect(offlineNames).toContain('销售客服')
    })
  })

  describe('成员操作测试', () => {
    it('updates member status', () => {
      const { result } = renderHook(() => useMembers())
      
      act(() => {
        useDashboardStore.getState().updateMemberStatus('consultant', 'working')
      })
      
      const consultant = result.current.find(m => m.id === 'consultant')
      expect(consultant?.status).toBe('working')
    })

    it('updates member current task', () => {
      const { result } = renderHook(() => useMembers())
      
      act(() => {
        useDashboardStore.getState().updateMemberTask('consultant', '#55 新任务')
      })
      
      const consultant = result.current.find(m => m.id === 'consultant')
      expect(consultant?.currentTask).toBe('#55 新任务')
    })

    it('clears member current task when set to undefined', () => {
      act(() => {
        useDashboardStore.getState().updateMemberTask('architect', undefined)
      })
      
      const architect = useDashboardStore.getState().members.find(m => m.id === 'architect')
      expect(architect?.currentTask).toBeUndefined()
    })

    it('gets a single member by id', () => {
      const { result } = renderHook(() => useMember('executor'))
      
      expect(result.current?.name).toBe('Executor')
      expect(result.current?.role).toBe('执行/实现')
      expect(result.current?.status).toBe('working')
    })

    it('returns undefined for non-existent member', () => {
      const { result } = renderHook(() => useMember('non-existent'))
      
      expect(result.current).toBeUndefined()
    })
  })

  describe('加载状态测试', () => {
    it('returns loading state', () => {
      const { result } = renderHook(() => useDashboardLoading())
      
      expect(result.current).toBe(false)
      
      act(() => {
        useDashboardStore.setState({ isLoading: true })
      })
      
      expect(result.current).toBe(true)
    })

    it('returns error state', () => {
      const { result } = renderHook(() => useDashboardError())
      
      expect(result.current).toBeNull()
      
      act(() => {
        useDashboardStore.setState({ error: 'Test error' })
      })
      
      expect(result.current).toBe('Test error')
    })

    it('clears error', () => {
      act(() => {
        useDashboardStore.setState({ error: 'Test error' })
      })
      
      act(() => {
        useDashboardStore.getState().clearError()
      })
      
      expect(useDashboardStore.getState().error).toBeNull()
    })
  })

  describe('最后更新时间测试', () => {
    it('returns null when not updated', () => {
      const { result } = renderHook(() => useLastUpdated())
      
      expect(result.current).toBeNull()
    })

    it('returns last updated time after fetch', () => {
      const testDate = new Date('2024-03-08T12:00:00Z')
      
      act(() => {
        useDashboardStore.setState({ lastUpdated: testDate })
      })
      
      const { result } = renderHook(() => useLastUpdated())
      expect(result.current).toEqual(testDate)
    })
  })

  describe('快照测试', () => {
    it('returns current state snapshot', () => {
      const snapshot = getDashboardSnapshot()
      
      expect(snapshot.members).toHaveLength(11)
      expect(snapshot.isLoading).toBe(false)
      expect(snapshot.error).toBeNull()
    })
  })

  describe('配置测试', () => {
    it('sets configuration', () => {
      act(() => {
        useDashboardStore.getState().setConfig('test-owner', 'test-repo', 'test-token')
      })
      
      const state = useDashboardStore.getState()
      expect(state.owner).toBe('test-owner')
      expect(state.repo).toBe('test-repo')
      expect(state.token).toBe('test-token')
    })

    it('handles optional token', () => {
      act(() => {
        useDashboardStore.getState().setConfig('owner', 'repo')
      })
      
      const state = useDashboardStore.getState()
      expect(state.token).toBeNull()
    })
  })

  describe('数据获取测试', () => {
    it('sets loading state during fetch', async () => {
      mockFetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      )
      
      const fetchPromise = act(async () => {
        await useDashboardStore.getState().fetchAllData()
      })
      
      // Check loading was set
      expect(useDashboardStore.getState().isLoading).toBe(true)
      
      await fetchPromise
      
      expect(useDashboardStore.getState().isLoading).toBe(false)
    })

    it('handles fetch errors gracefully', async () => {
      mockFetch.mockImplementation(() => 
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        })
      )
      
      await act(async () => {
        await useDashboardStore.getState().fetchAllData()
      })
      
      const state = useDashboardStore.getState()
      expect(state.error).toBe('仓库不存在')
    })

    it('handles 401 unauthorized error', async () => {
      mockFetch.mockImplementation(() => 
        Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        })
      )
      
      await act(async () => {
        await useDashboardStore.getState().fetchAllData()
      })
      
      const state = useDashboardStore.getState()
      expect(state.error).toBe('GitHub Token 无效')
    })

    it('handles 403 rate limit error', async () => {
      mockFetch.mockImplementation(() => 
        Promise.resolve({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
        })
      )
      
      await act(async () => {
        await useDashboardStore.getState().fetchAllData()
      })
      
      const state = useDashboardStore.getState()
      expect(state.error).toBe('GitHub API 速率限制，请稍后重试')
    })
  })
})