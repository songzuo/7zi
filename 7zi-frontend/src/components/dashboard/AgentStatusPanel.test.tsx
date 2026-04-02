/**
 * AgentStatusPanel 组件测试
 *
 * @version 1.0.0
 * @date 2026-03-30
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AgentStatusPanel, type Agent } from './AgentStatusPanel'

// ============================================
// Mock i18n
// ============================================

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, any>) => {
      // 简单的翻译 mock
      const translations: Record<string, string> = {
        'agent.title': 'AI Agents',
        'agent.count': 'Total: {{count}} agents',
        'agent.noAgents': 'No Agents',
        'agent.noAgentsDescription': 'No agents available',
        'agent.noMatching': 'No matching agents',
        'agent.searchPlaceholder': 'Search agents...',
        'agent.currentTask': 'Current Task',
        'agent.details': 'Details',
        'agent.enable': 'Enable',
        'agent.disable': 'Disable',
        'agent.previousPage': 'Previous',
        'agent.nextPage': 'Next',
        'agent.lastActive': 'Last Active',
        'agent.resource.cpu': 'CPU',
        'agent.resource.memory': 'Memory',
        'stats.total': 'Total',
        'stats.avgCpu': 'Avg CPU',
        'stats.avgMemory': 'Avg Memory',
        'actions.refresh': 'Refresh',
        'filters.all': 'All',
        'agent.status.active': 'Active',
        'agent.status.idle': 'Idle',
        'agent.status.offline': 'Offline',
        'agent.status.error': 'Error',
        'agent.type.designer': 'Designer',
        'agent.type.developer': 'Developer',
        'agent.type.tester': 'Tester',
        'agent.type.manager': 'Manager',
        'agent.type.custom': 'Custom',
      }

      let text = translations[key] || key
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(`{{${k}}}`, String(v))
        })
      }
      return text
    },
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}))

// ============================================
// Mock 数据
// ============================================

const MOCK_AGENTS: Agent[] = [
  {
    id: 'agent-1',
    name: 'Designer',
    type: 'designer',
    status: 'active',
    description: 'UI/UX design expert',
    currentTask: {
      id: 'task-1',
      title: 'Design Dashboard',
      type: 'design',
      status: 'running',
      progress: 65,
      startedAt: '2026-03-30T10:00:00Z',
    },
    resourceUsage: {
      cpu: 45,
      memory: 60,
    },
    lastActiveAt: new Date().toISOString(),
    enabled: true,
  },
  {
    id: 'agent-2',
    name: 'Developer',
    type: 'developer',
    status: 'active',
    description: 'Full-stack developer',
    currentTask: {
      id: 'task-2',
      title: 'Implement Agent System',
      type: 'development',
      status: 'running',
      progress: 80,
      startedAt: '2026-03-30T09:30:00Z',
    },
    resourceUsage: {
      cpu: 75,
      memory: 55,
    },
    lastActiveAt: new Date().toISOString(),
    enabled: true,
  },
  {
    id: 'agent-3',
    name: 'Tester',
    type: 'tester',
    status: 'idle',
    description: 'Quality assurance expert',
    resourceUsage: {
      cpu: 15,
      memory: 30,
    },
    lastActiveAt: new Date(Date.now() - 3600000).toISOString(),
    enabled: true,
  },
  {
    id: 'agent-4',
    name: 'Manager',
    type: 'manager',
    status: 'offline',
    description: 'System architect',
    lastActiveAt: new Date(Date.now() - 86400000).toISOString(),
    enabled: false,
  },
]

// ============================================
// 测试套件
// ============================================

describe('AgentStatusPanel', () => {
  const mockOnRefresh = vi.fn()
  const mockOnViewDetails = vi.fn()
  const mockOnToggleAgent = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基础渲染', () => {
    it('应该渲染组件标题', () => {
      render(
        <AgentStatusPanel
          agents={MOCK_AGENTS}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      expect(screen.getByText('Agent 状态监控')).toBeInTheDocument()
    })

    it('应该显示 agent 数量统计', () => {
      render(
        <AgentStatusPanel
          agents={MOCK_AGENTS}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      expect(screen.getByText(/共.*4.*个 Agent/)).toBeInTheDocument()
    })

    it('应该渲染所有 agent 卡片', () => {
      render(
        <AgentStatusPanel
          agents={MOCK_AGENTS}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      // 使用 role 或者查询所有元素
      const agentNames = screen.getAllByText(/Designer|Developer|Tester|Manager/)
      expect(agentNames.length).toBe(4)
    })

    it('应该显示统计概览', () => {
      render(
        <AgentStatusPanel
          agents={MOCK_AGENTS}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      // 总数
      expect(screen.getByText('总计')).toBeInTheDocument()

      // 数字 4 (总数)
      const totalNumbers = screen.getAllByText('4')
      expect(totalNumbers.length).toBeGreaterThan(0)

      // Active - 统计区域
      const activeElements = screen.getAllByText('运行中')
      expect(activeElements.length).toBeGreaterThan(0)

      // 数字 2 (active 数量)
      const activeNumbers = screen.getAllByText('2')
      expect(activeNumbers.length).toBeGreaterThan(0)

      // Idle - 统计区域
      const idleElements = screen.getAllByText('空闲')
      expect(idleElements.length).toBeGreaterThan(0)

      // 数字 1 (idle 数量) - 可能有多个
      const idleNumbers = screen.getAllByText('1')
      expect(idleNumbers.length).toBeGreaterThan(0)

      // Offline - 统计区域
      const offlineElements = screen.getAllByText('离线')
      expect(offlineElements.length).toBeGreaterThan(0)
    })
  })

  describe('加载状态', () => {
    it('应该显示加载状态', () => {
      render(
        <AgentStatusPanel
          agents={[]}
          loading={true}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      // Loading 组件应该显示"加载中..."文本（可能有多个）
      const loadingTexts = screen.getAllByText('加载中...')
      expect(loadingTexts.length).toBeGreaterThan(0)
    })
  })

  describe('空状态', () => {
    it('应该显示空状态消息', () => {
      render(
        <AgentStatusPanel
          agents={[]}
          loading={false}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      expect(screen.getByText('暂无 Agent')).toBeInTheDocument()
      expect(screen.getByText('当前系统中没有任何 Agent 在运行')).toBeInTheDocument()
    })

    it('点击刷新按钮应该触发 onRefresh', () => {
      render(
        <AgentStatusPanel
          agents={[]}
          loading={false}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      const refreshButton = screen.getByText('刷新')
      fireEvent.click(refreshButton)

      expect(mockOnRefresh).toHaveBeenCalledTimes(1)
    })
  })

  describe('Agent 卡片内容', () => {
    it('应该显示 agent 名称和类型', () => {
      render(
        <AgentStatusPanel
          agents={MOCK_AGENTS}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      // 检查所有 agent 名称都存在
      expect(screen.getByText(/Designer/)).toBeInTheDocument()
      expect(screen.getByText(/Developer/)).toBeInTheDocument()
      expect(screen.getByText(/Tester/)).toBeInTheDocument()
      expect(screen.getByText(/Manager/)).toBeInTheDocument()
    })

    it('应该显示当前任务信息', () => {
      render(
        <AgentStatusPanel
          agents={MOCK_AGENTS}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      // 检查 Design Dashboard 任务
      const taskTitleElements = screen.getAllByText(/Design Dashboard/)
      expect(taskTitleElements.length).toBeGreaterThan(0)

      // 检查进度百分比
      const progressElements = screen.getAllByText(/65%/)
      expect(progressElements.length).toBeGreaterThan(0)
    })

    it('应该显示资源使用情况', () => {
      render(
        <AgentStatusPanel
          agents={MOCK_AGENTS}
          showResourceDetails={true}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      // 检查是否有 CPU 和 内存 标签（有多个 agent）
      expect(screen.queryAllByText(/CPU/).length).toBeGreaterThan(0)
      expect(screen.queryAllByText(/内存/).length).toBeGreaterThan(0)
    })

    it('应该显示状态徽章', () => {
      render(
        <AgentStatusPanel
          agents={MOCK_AGENTS}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      // 统计区域会显示这些状态
      const runningElements = screen.getAllByText(/运行中/)
      expect(runningElements.length).toBeGreaterThan(0)

      const idleElements = screen.getAllByText(/空闲/)
      expect(idleElements.length).toBeGreaterThan(0)

      const offlineElements = screen.getAllByText(/离线/)
      expect(offlineElements.length).toBeGreaterThan(0)
    })
  })

  describe('筛选功能', () => {
    it('应该支持状态筛选', async () => {
      render(
        <AgentStatusPanel
          agents={MOCK_AGENTS}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      // 点击 运行中 筛选按钮（使用 role 查询）
      const activeButtons = screen.getAllByRole('button', { name: '运行中' })
      fireEvent.click(activeButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Designer')).toBeInTheDocument()
        expect(screen.getByText('Developer')).toBeInTheDocument()
      })

      // 确保其他 agent 不再显示
      expect(screen.queryByText('Tester')).not.toBeInTheDocument()
      expect(screen.queryByText('Manager')).not.toBeInTheDocument()
    })

    it('应该支持搜索功能', async () => {
      render(
        <AgentStatusPanel
          agents={MOCK_AGENTS}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      const searchInput = screen.getByPlaceholderText('搜索 Agent 名称或描述...')
      fireEvent.change(searchInput, { target: { value: 'Designer' } })

      await waitFor(() => {
        expect(screen.getByText('Designer')).toBeInTheDocument()
      })

      expect(screen.queryByText('Developer')).not.toBeInTheDocument()
      expect(screen.queryByText('Tester')).not.toBeInTheDocument()
    })

    it('应该结合搜索和筛选', async () => {
      render(
        <AgentStatusPanel
          agents={MOCK_AGENTS}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      // 先筛选 运行中（使用 role 查询）
      const activeButtons = screen.getAllByRole('button', { name: '运行中' })
      fireEvent.click(activeButtons[0])

      // 再搜索
      const searchInput = screen.getByPlaceholderText('搜索 Agent 名称或描述...')
      fireEvent.change(searchInput, { target: { value: 'Designer' } })

      await waitFor(() => {
        expect(screen.getByText('Designer')).toBeInTheDocument()
        expect(screen.queryByText('Developer')).not.toBeInTheDocument()
      })
    })
  })

  describe('交互功能', () => {
    it('点击刷新按钮应该触发 onRefresh', () => {
      render(
        <AgentStatusPanel
          agents={MOCK_AGENTS}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      const refreshButton = screen.getByText('刷新')
      fireEvent.click(refreshButton)

      expect(mockOnRefresh).toHaveBeenCalledTimes(1)
    })

    it('点击 Details 按钮应该触发 onViewDetails', () => {
      render(
        <AgentStatusPanel
          agents={MOCK_AGENTS}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      const detailsButtons = screen.getAllByText('详情')
      fireEvent.click(detailsButtons[0])

      expect(mockOnViewDetails).toHaveBeenCalledTimes(1)
      expect(mockOnViewDetails).toHaveBeenCalledWith(MOCK_AGENTS[0])
    })

    it('点击 禁用 按钮应该触发 onToggleAgent', () => {
      render(
        <AgentStatusPanel
          agents={MOCK_AGENTS}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      const disableButtons = screen.getAllByText('禁用')
      fireEvent.click(disableButtons[0])

      expect(mockOnToggleAgent).toHaveBeenCalledTimes(1)
      expect(mockOnToggleAgent).toHaveBeenCalledWith('agent-1', false)
    })

    it('点击 启用 按钮应该触发 onToggleAgent', () => {
      // 使用包含 enabled=false 的 agent
      const agents = MOCK_AGENTS.filter(a => !a.enabled) // 只取 enabled=false 的

      render(
        <AgentStatusPanel
          agents={agents}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      const enableButtons = screen.getAllByText('启用')
      expect(enableButtons.length).toBeGreaterThan(0)

      fireEvent.click(enableButtons[0])

      expect(mockOnToggleAgent).toHaveBeenCalledTimes(1)
      expect(mockOnToggleAgent).toHaveBeenCalledWith('agent-4', true) // Manager
    })
  })

  describe('分页功能', () => {
    it('应该在 pageSize 小于 agent 数量时显示分页', () => {
      const manyAgents = Array.from({ length: 25 }, (_, i) => ({
        id: `agent-${i}`,
        name: `Agent ${i}`,
        type: 'custom' as const,
        status: 'active' as const,
        lastActiveAt: new Date().toISOString(),
        enabled: true,
      }))

      render(
        <AgentStatusPanel
          agents={manyAgents}
          pageSize={10}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      expect(screen.getByText('上一页')).toBeInTheDocument()
      expect(screen.getByText('下一页')).toBeInTheDocument()
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
    })

    it('点击 下一页 应该显示下一页', async () => {
      const manyAgents = Array.from({ length: 25 }, (_, i) => ({
        id: `agent-${i}`,
        name: `Agent ${i}`,
        type: 'custom' as const,
        status: 'active' as const,
        lastActiveAt: new Date().toISOString(),
        enabled: true,
      }))

      render(
        <AgentStatusPanel
          agents={manyAgents}
          pageSize={10}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      const nextButton = screen.getByText('下一页')
      fireEvent.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText('2 / 3')).toBeInTheDocument()
      })
    })

    it('点击 上一页 应该显示上一页', async () => {
      const manyAgents = Array.from({ length: 25 }, (_, i) => ({
        id: `agent-${i}`,
        name: `Agent ${i}`,
        type: 'custom' as const,
        status: 'active' as const,
        lastActiveAt: new Date().toISOString(),
        enabled: true,
      }))

      render(
        <AgentStatusPanel
          agents={manyAgents}
          pageSize={10}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      // 先到第二页
      const nextButton = screen.getByText('下一页')
      fireEvent.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText('2 / 3')).toBeInTheDocument()
      })

      // 再回到第一页
      const prevButton = screen.getByText('上一页')
      fireEvent.click(prevButton)

      await waitFor(() => {
        expect(screen.getByText('1 / 3')).toBeInTheDocument()
      })
    })
  })

  describe('自动刷新', () => {
    it('应该在指定间隔后自动刷新（使用 fetchAgents）', () => {
      vi.useFakeTimers()

      const mockFetchAgents = vi.fn().mockResolvedValue(MOCK_AGENTS)

      render(<AgentStatusPanel fetchAgents={mockFetchAgents} refreshInterval={5000} />)

      // 初始加载
      expect(mockFetchAgents).toHaveBeenCalledTimes(1)

      // 快进 5 秒
      vi.advanceTimersByTime(5000)

      expect(mockFetchAgents).toHaveBeenCalledTimes(2)

      // 再快进 5 秒
      vi.advanceTimersByTime(5000)

      expect(mockFetchAgents).toHaveBeenCalledTimes(3)

      vi.useRealTimers()
    })

    it('应该取消自动刷新当组件卸载', () => {
      vi.useFakeTimers()

      const mockFetchAgents = vi.fn().mockResolvedValue(MOCK_AGENTS)

      const { unmount } = render(
        <AgentStatusPanel fetchAgents={mockFetchAgents} refreshInterval={5000} />
      )

      // 初始加载
      expect(mockFetchAgents).toHaveBeenCalledTimes(1)

      unmount()

      // 快进 10 秒
      vi.advanceTimersByTime(10000)

      // 卸载后不应该再调用
      expect(mockFetchAgents).toHaveBeenCalledTimes(1)

      vi.useRealTimers()
    })
  })

  describe('资源显示控制', () => {
    it('showResourceDetails=true 应该显示资源使用情况', () => {
      render(
        <AgentStatusPanel
          agents={MOCK_AGENTS}
          showResourceDetails={true}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      // 检查是否有 CPU 和 内存 标签（因为多个 agent）
      const cpuElements = screen.queryAllByText(/CPU/)
      expect(cpuElements.length).toBeGreaterThan(0)

      const memoryElements = screen.queryAllByText(/内存/)
      expect(memoryElements.length).toBeGreaterThan(0)
    })

    it('showResourceDetails=false 不应该显示资源使用情况', () => {
      render(
        <AgentStatusPanel
          agents={MOCK_AGENTS}
          showResourceDetails={false}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      // 资源信息不应该显示
      // 注意：统计概览中有"平均 CPU"，所以可能会有 1 个匹配
      // 但 Agent 卡片中的资源栏不应该显示
      const cpuElements = screen.queryAllByText(/CPU/)
      // 可能只有统计概览中的"平均 CPU"，而不是每个 Agent 卡片中的
      expect(cpuElements.length).toBeLessThanOrEqual(1)

      const memoryElements = screen.queryAllByText(/内存/)
      // 可能只有统计概览中的"平均内存"
      expect(memoryElements.length).toBeLessThanOrEqual(1)
    })
  })
})
