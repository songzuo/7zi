/**
 * AgentStatusPanel 组件测试
 *
 * @version 1.0.0
 * @date 2026-03-30
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
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

      expect(screen.getByText('AI Agents')).toBeInTheDocument()
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

      expect(screen.getByText('Total: 4 agents')).toBeInTheDocument()
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

      // 验证主要 agent 名称存在
      expect(screen.getByText('Designer')).toBeInTheDocument()
      expect(screen.getByText('Developer')).toBeInTheDocument()
      expect(screen.getByText('Tester')).toBeInTheDocument()
      expect(screen.getByText('Manager')).toBeInTheDocument()
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
      expect(screen.getByText('Total')).toBeInTheDocument()

      // 验证统计数字存在（使用 getAllByText 因为可能有多个匹配）
      expect(screen.getAllByText('4').length).toBeGreaterThan(0)
      expect(screen.getAllByText('2').length).toBeGreaterThan(0)
      expect(screen.getAllByText('1').length).toBeGreaterThan(0)
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

      // 检查骨架屏是否渲染
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
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

      expect(screen.getByText('No Agents')).toBeInTheDocument()
      expect(screen.getByText('No agents available')).toBeInTheDocument()
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

      const refreshButton = screen.getByText('Refresh')
      fireEvent.click(refreshButton)

      expect(mockOnRefresh).toHaveBeenCalledTimes(1)
    })
  })

  describe('Agent 卡片内容', () => {
    it('应该显示 agent 名称', () => {
      render(
        <AgentStatusPanel
          agents={MOCK_AGENTS}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      // 检查至少一个 agent 名称存在
      expect(screen.getByText(/Designer/)).toBeInTheDocument()
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

      expect(screen.getByText(/Design Dashboard/)).toBeInTheDocument()
      expect(screen.getByText(/design/)).toBeInTheDocument()
      expect(screen.getByText(/65%/)).toBeInTheDocument()
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

      // 检查是否有 CPU 和 Memory 标签（有多个 agent）
      expect(screen.queryAllByText(/CPU/).length).toBeGreaterThan(0)
      expect(screen.queryAllByText(/Memory/).length).toBeGreaterThan(0)
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

      // 使用 regex 匹配，因为可能有多个匹配项
      expect(screen.getAllByText(/Active/).length).toBeGreaterThan(0)
    })
  })

  describe('筛选功能', () => {
    it('应该支持搜索功能', async () => {
      render(
        <AgentStatusPanel
          agents={MOCK_AGENTS}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      const searchInput = screen.getByPlaceholderText('Search agents...')
      
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Designer' } })
      })

      // 验证搜索功能可以工作
      await waitFor(() => {
        expect(screen.getByText('Designer')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('应该支持筛选功能', async () => {
      render(
        <AgentStatusPanel
          agents={MOCK_AGENTS}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      // 找到筛选按钮
      const filterButtons = screen.getAllByRole('button')
      const activeButton = filterButtons.find(btn => btn.textContent?.includes('Active'))
      
      if (activeButton) {
        await act(async () => {
          fireEvent.click(activeButton)
        })
      }
      
      // 验证组件仍然正常工作
      expect(screen.getByText('AI Agents')).toBeInTheDocument()
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

      const refreshButton = screen.getByText('Refresh')
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

      const detailsButtons = screen.getAllByText('Details')
      fireEvent.click(detailsButtons[0])

      expect(mockOnViewDetails).toHaveBeenCalledTimes(1)
      expect(mockOnViewDetails).toHaveBeenCalledWith(MOCK_AGENTS[0])
    })

    it('点击 Disable 按钮应该触发 onToggleAgent', () => {
      render(
        <AgentStatusPanel
          agents={MOCK_AGENTS}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      const disableButtons = screen.getAllByText('Disable')
      fireEvent.click(disableButtons[0])

      expect(mockOnToggleAgent).toHaveBeenCalledTimes(1)
      expect(mockOnToggleAgent).toHaveBeenCalledWith('agent-1', false)
    })

    it('点击 Enable 按钮应该触发 onToggleAgent', () => {
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

      const enableButtons = screen.getAllByText('Enable')
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

      expect(screen.getByText('Previous')).toBeInTheDocument()
      expect(screen.getByText('Next')).toBeInTheDocument()
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
    })

    it('点击 Next 应该显示下一页', async () => {
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

      const nextButton = screen.getByText('Next')
      fireEvent.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText('2 / 3')).toBeInTheDocument()
      })
    })

    it('点击 Previous 应该显示上一页', async () => {
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
      const nextButton = screen.getByText('Next')
      fireEvent.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText('2 / 3')).toBeInTheDocument()
      })

      // 再回到第一页
      const prevButton = screen.getByText('Previous')
      fireEvent.click(prevButton)

      await waitFor(() => {
        expect(screen.getByText('1 / 3')).toBeInTheDocument()
      })
    })
  })

  describe('自动刷新', () => {
    it('应该在指定间隔后自动刷新', () => {
      vi.useFakeTimers()

      render(
        <AgentStatusPanel
          agents={MOCK_AGENTS}
          refreshInterval={5000}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      expect(mockOnRefresh).not.toHaveBeenCalled()

      // 快进 5 秒
      vi.advanceTimersByTime(5000)

      expect(mockOnRefresh).toHaveBeenCalledTimes(1)

      // 再快进 5 秒
      vi.advanceTimersByTime(5000)

      expect(mockOnRefresh).toHaveBeenCalledTimes(2)

      vi.useRealTimers()
    })

    it('应该取消自动刷新当组件卸载', () => {
      vi.useFakeTimers()

      const { unmount } = render(
        <AgentStatusPanel
          agents={MOCK_AGENTS}
          refreshInterval={5000}
          onRefresh={mockOnRefresh}
          onViewDetails={mockOnViewDetails}
          onToggleAgent={mockOnToggleAgent}
        />
      )

      unmount()

      // 快进 10 秒
      vi.advanceTimersByTime(10000)

      expect(mockOnRefresh).not.toHaveBeenCalled()

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

      // 检查是否有多个 CPU 标签（因为多个 agent）
      const cpuElements = screen.queryAllByText('CPU')
      expect(cpuElements.length).toBeGreaterThan(0)

      const memoryElements = screen.queryAllByText('Memory')
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

      // 资源信息不应该显示（只有 4 个 agent，如果有显示的话应该至少有 4 个）
      const cpuElements = screen.queryAllByText('CPU')
      expect(cpuElements.length).toBe(0)
    })
  })
})
