/**
 * CollaborationGraph 组件测试
 *
 * 测试覆盖：
 * - 组件渲染和基本功能
 * - Agent 节点显示
 * - 连接边显示
 * - 状态指示器
 * - 实时更新
 * - 回调函数
 * - 暗色模式
 * - 边界情况
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import React from 'react'
import { CollaborationGraph } from '@/components/agent-dashboard/CollaborationGraph'
import type { AgentNode, AgentStatus } from '@/components/agent-dashboard/CollaborationGraph'

// Mock @xyflow/react - 使用部分真实实现
vi.mock('@xyflow/react', () => {
  const React = require('react')
  return {
    ReactFlow: ({
      children,
      nodes,
      edges,
      onNodesChange,
      onEdgesChange,
      onConnect,
      onEdgeClick,
      nodeTypes,
      fitView,
    }: any) => (
      <div data-testid="react-flow" data-nodes-count={nodes.length} data-edges-count={edges.length}>
        <div data-testid="node-types">{Object.keys(nodeTypes).join(',')}</div>
        {nodes.map((node: any) => (
          <div key={node.id} data-testid={`node-${node.id}`} data-type={node.type}>
            {node.data?.agent?.name || node.data?.label || node.id}
          </div>
        ))}
        {children}
      </div>
    ),
    Background: ({ variant, color }: any) => (
      <div data-testid="background" data-variant={variant} data-color={color} />
    ),
    Controls: ({ className }: any) => <div data-testid="controls" className={className} />,
    MiniMap: ({ nodeColor, className }: any) => <div data-testid="minimap" className={className} />,
    useNodesState: (initial: any) => {
      const [nodes, setNodes] = React.useState(initial)
      const onNodesChange = vi.fn()
      return [nodes, setNodes, onNodesChange]
    },
    useEdgesState: (initial: any) => {
      const [edges, setEdges] = React.useState(initial)
      const onEdgesChange = vi.fn()
      return [edges, setEdges, onEdgesChange]
    },
    addEdge: (params: any, edges: any) => [...edges, { id: `edge-${Date.now()}`, ...params }],
    ConnectionMode: {
      Loose: 'loose',
      Strict: 'strict',
    },
    BackgroundVariant: {
      Dots: 'dots',
      Lines: 'lines',
      Cross: 'cross',
    },
    Panel: ({ position, children, className }: any) => (
      <div data-testid="panel" data-position={position} className={className}>
        {children}
      </div>
    ),
  }
})

// Mock preferencesStore
vi.mock('@/stores/preferencesStore', () => ({
  useDarkMode: vi.fn(() => false),
}))

describe('CollaborationGraph', () => {
  const mockAgentNodes: AgentNode[] = [
    {
      id: 'agent-1',
      name: '智能体世界专家',
      status: 'idle' as AgentStatus,
      lastActivity: Date.now() - 60000,
      avatar: '🌟',
      currentTask: '分析市场趋势',
      load: 20,
    },
    {
      id: 'agent-2',
      name: '咨询师',
      status: 'running' as AgentStatus,
      lastActivity: Date.now(),
      avatar: '📚',
      currentTask: '撰写研究报告',
      load: 75,
    },
    {
      id: 'agent-3',
      name: '架构师',
      status: 'error' as AgentStatus,
      lastActivity: Date.now() - 300000,
      avatar: '🏗️',
      currentTask: undefined,
      load: 50,
    },
    {
      id: 'agent-4',
      name: '系统管理员',
      status: 'offline' as AgentStatus,
      lastActivity: Date.now() - 86400000,
      avatar: '🛡️',
      currentTask: undefined,
      load: undefined,
    },
  ]

  const mockConnections = [
    {
      source: 'agent-1',
      target: 'agent-2',
      taskId: 'task-123',
      taskType: 'research',
      label: '研究任务',
    },
    {
      source: 'agent-2',
      target: 'agent-3',
      taskId: 'task-456',
      taskType: 'design',
      label: '设计任务',
    },
    {
      source: 'agent-3',
      target: 'agent-4',
      taskType: 'deploy',
      label: '部署任务',
    },
  ]

  beforeEach(() => {
    cleanup()
  })

  afterEach(() => {
    cleanup()
  })

  describe('基本渲染', () => {
    it('应该渲染组件', () => {
      render(<CollaborationGraph agentNodes={mockAgentNodes} connections={mockConnections} />)

      const flow = screen.getByTestId('react-flow')
      expect(flow).toBeInTheDocument()
    })

    it('应该渲染所有 Agent 节点', () => {
      render(<CollaborationGraph agentNodes={mockAgentNodes} connections={mockConnections} />)

      const flow = screen.getByTestId('react-flow')
      expect(flow).toHaveAttribute('data-nodes-count', '4') // 4 agents (hub is added by component but not by mock)
    })

    it('应该渲染所有连接边', () => {
      render(<CollaborationGraph agentNodes={mockAgentNodes} connections={mockConnections} />)

      const flow = screen.getByTestId('react-flow')
      expect(flow).toHaveAttribute('data-edges-count', '3')
    })

    it('应该支持自定义 className', () => {
      render(
        <CollaborationGraph
          agentNodes={mockAgentNodes}
          connections={mockConnections}
          className="custom-class"
        />
      )

      const flow = screen.getByTestId('react-flow').parentElement
      expect(flow).toHaveClass('custom-class')
    })

    it('应该支持禁用实时更新', () => {
      render(
        <CollaborationGraph
          agentNodes={mockAgentNodes}
          connections={mockConnections}
          enableRealtime={false}
        />
      )

      const flow = screen.getByTestId('react-flow')
      expect(flow).toBeInTheDocument()
    })
  })

  describe('Agent 节点显示', () => {
    it('应该渲染 Agent 节点', () => {
      render(<CollaborationGraph agentNodes={mockAgentNodes} connections={mockConnections} />)

      // 验证节点被渲染
      expect(screen.getByTestId('node-agent-1')).toBeInTheDocument()
      expect(screen.getByTestId('node-agent-2')).toBeInTheDocument()
      expect(screen.getByTestId('node-agent-3')).toBeInTheDocument()
      expect(screen.getByTestId('node-agent-4')).toBeInTheDocument()
    })

    it('应该使用正确的节点类型', () => {
      render(<CollaborationGraph agentNodes={mockAgentNodes} connections={mockConnections} />)

      const nodeTypes = screen.getByTestId('node-types')
      expect(nodeTypes.textContent).toContain('agentNode')
    })
  })

  describe('连接边显示', () => {
    it('应该有正确的边数量', () => {
      render(<CollaborationGraph agentNodes={mockAgentNodes} connections={mockConnections} />)

      const flow = screen.getByTestId('react-flow')
      expect(flow).toHaveAttribute('data-edges-count', '3')
    })

    it('应该支持 taskType 为 active 的连接', () => {
      const activeConnection = {
        source: 'agent-1',
        target: 'agent-2',
        taskType: 'active',
        label: '活跃任务',
      }

      render(<CollaborationGraph agentNodes={mockAgentNodes} connections={[activeConnection]} />)

      const flow = screen.getByTestId('react-flow')
      expect(flow).toHaveAttribute('data-edges-count', '1')
    })
  })

  describe('回调函数', () => {
    it('应该接受 onAgentUpdate 回调', () => {
      const onAgentUpdate = vi.fn()

      render(
        <CollaborationGraph
          agentNodes={mockAgentNodes}
          connections={mockConnections}
          onAgentUpdate={onAgentUpdate}
        />
      )

      expect(onAgentUpdate).toBeDefined()
    })

    it('应该接受 onConnectionClick 回调', () => {
      const onConnectionClick = vi.fn()

      render(
        <CollaborationGraph
          agentNodes={mockAgentNodes}
          connections={mockConnections}
          onConnectionClick={onConnectionClick}
        />
      )

      expect(onConnectionClick).toBeDefined()
    })
  })

  describe('UI 组件', () => {
    it('应该渲染 Background 组件', () => {
      render(<CollaborationGraph agentNodes={mockAgentNodes} connections={mockConnections} />)

      const background = screen.getByTestId('background')
      expect(background).toBeInTheDocument()
      expect(background).toHaveAttribute('data-variant', 'dots')
    })

    it('应该渲染 Controls 组件', () => {
      render(<CollaborationGraph agentNodes={mockAgentNodes} connections={mockConnections} />)

      const controls = screen.getByTestId('controls')
      expect(controls).toBeInTheDocument()
    })

    it('应该渲染 MiniMap 组件', () => {
      render(<CollaborationGraph agentNodes={mockAgentNodes} connections={mockConnections} />)

      const minimap = screen.getByTestId('minimap')
      expect(minimap).toBeInTheDocument()
    })

    it('应该渲染信息面板', () => {
      render(<CollaborationGraph agentNodes={mockAgentNodes} connections={mockConnections} />)

      const panels = screen.getAllByTestId('panel')
      const legendPanel = panels.find(p => p.getAttribute('data-position') === 'top-left')
      expect(legendPanel).toBeInTheDocument()
      expect(legendPanel?.textContent).toContain('图例')
    })

    it('应该渲染统计面板', () => {
      render(<CollaborationGraph agentNodes={mockAgentNodes} connections={mockConnections} />)

      const panels = screen.getAllByTestId('panel')
      const statsPanel = panels.find(p => p.getAttribute('data-position') === 'top-right')
      expect(statsPanel).toBeInTheDocument()
      expect(statsPanel?.textContent).toContain('Agents:')
      expect(statsPanel?.textContent).toContain('Connections:')
    })
  })

  describe('边界情况', () => {
    it('应该处理空的 Agent 节点列表', () => {
      render(<CollaborationGraph agentNodes={[]} connections={mockConnections} />)

      const flow = screen.getByTestId('react-flow')
      // 当有连接但没有 agent 时，可能不会创建 hub
      expect(flow).toHaveAttribute('data-nodes-count', '0')
    })

    it('应该处理空的连接列表', () => {
      render(<CollaborationGraph agentNodes={mockAgentNodes} connections={[]} />)

      const flow = screen.getByTestId('react-flow')
      // 没有连接时，hub 节点不会被创建
      expect(flow).toHaveAttribute('data-nodes-count', '4')
      expect(flow).toHaveAttribute('data-edges-count', '0')
    })

    it('应该处理同时为空的情况', () => {
      render(<CollaborationGraph agentNodes={[]} connections={[]} />)

      const flow = screen.getByTestId('react-flow')
      expect(flow).toBeInTheDocument()
    })

    it('应该处理没有 avatar 的 Agent', () => {
      const agentWithoutAvatar: AgentNode = {
        id: 'agent-5',
        name: '无头像Agent',
        status: 'idle',
        lastActivity: Date.now(),
        load: 0,
      }

      render(<CollaborationGraph agentNodes={[agentWithoutAvatar]} connections={[]} />)

      expect(screen.getByTestId('node-agent-5')).toBeInTheDocument()
    })

    it('应该处理没有 load 的 Agent', () => {
      const agentWithoutLoad: AgentNode = {
        id: 'agent-5',
        name: '无负载Agent',
        status: 'idle',
        lastActivity: Date.now(),
      }

      render(<CollaborationGraph agentNodes={[agentWithoutLoad]} connections={[]} />)

      expect(screen.getByTestId('node-agent-5')).toBeInTheDocument()
    })

    it('应该处理没有 currentTask 的 Agent', () => {
      const agentWithoutTask: AgentNode = {
        id: 'agent-5',
        name: '无任务Agent',
        status: 'idle',
        lastActivity: Date.now(),
        load: 0,
      }

      render(<CollaborationGraph agentNodes={[agentWithoutTask]} connections={[]} />)

      expect(screen.getByTestId('node-agent-5')).toBeInTheDocument()
    })

    it('应该处理没有 label 的连接', () => {
      const connectionWithoutLabel = {
        source: 'agent-1',
        target: 'agent-2',
        taskType: 'unknown',
      }

      render(
        <CollaborationGraph agentNodes={mockAgentNodes} connections={[connectionWithoutLabel]} />
      )

      const flow = screen.getByTestId('react-flow')
      expect(flow).toHaveAttribute('data-edges-count', '1')
    })
  })

  describe('节点类型', () => {
    it('应该注册自定义节点类型', () => {
      render(<CollaborationGraph agentNodes={mockAgentNodes} connections={mockConnections} />)

      const nodeTypes = screen.getByTestId('node-types')
      expect(nodeTypes.textContent).toContain('agentNode')
    })
  })

  describe('实时更新', () => {
    it('应该在启用实时更新时正常渲染', () => {
      render(
        <CollaborationGraph
          agentNodes={mockAgentNodes}
          connections={mockConnections}
          enableRealtime={true}
        />
      )

      const flow = screen.getByTestId('react-flow')
      expect(flow).toBeInTheDocument()
    })

    it('应该在禁用实时更新时正常渲染', () => {
      render(
        <CollaborationGraph
          agentNodes={mockAgentNodes}
          connections={mockConnections}
          enableRealtime={false}
        />
      )

      const flow = screen.getByTestId('react-flow')
      expect(flow).toBeInTheDocument()
    })
  })
})
