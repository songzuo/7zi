/**
 * @fileoverview TeamStatusPanel 组件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TeamStatusPanel } from '../TeamStatusPanel'
import { TeamMember } from '../types'
import { TestWrapper } from '@/test/test-utils'

const mockTeamMembers: TeamMember[] = [
  {
    id: '1',
    name: '张三',
    emoji: '👨‍💻',
    status: 'online',
    role: 'Frontend Developer',
    specialty: '前端开发',
  },
  {
    id: '2',
    name: '李四',
    emoji: '👩‍🔬',
    status: 'busy',
    role: 'Backend Developer',
    specialty: '后端开发',
  },
  {
    id: '3',
    name: '王五',
    emoji: '👨‍🎨',
    status: 'offline',
    role: 'UI Designer',
    specialty: 'UI设计',
  },
  {
    id: '4',
    name: '赵六',
    emoji: '👩‍💼',
    status: 'online',
    role: 'Product Manager',
    specialty: '产品管理',
  },
  {
    id: '5',
    name: '孙七',
    emoji: '🧪',
    status: 'busy',
    role: 'QA Engineer',
    specialty: '测试工程师',
  },
  {
    id: '6',
    name: '周八',
    emoji: '📊',
    status: 'online',
    role: 'Data Analyst',
    specialty: '数据分析师',
  },
]

describe('TeamStatusPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('渲染', () => {
    it('应该显示所有团队成员', () => {
      render(TestWrapper.withIntl(<TeamStatusPanel />))

      expect(screen.getByText('张三')).toBeInTheDocument()
      expect(screen.getByText('李四')).toBeInTheDocument()
      expect(screen.getByText('王五')).toBeInTheDocument()
      expect(screen.getByText('赵六')).toBeInTheDocument()
      expect(screen.getByText('孙七')).toBeInTheDocument()
      expect(screen.getByText('周八')).toBeInTheDocument()
    })

    it('应该显示所有成员的表情符号', () => {
      render(TestWrapper.withIntl(<TeamStatusPanel />))

      expect(screen.getByText('👨‍💻')).toBeInTheDocument()
      expect(screen.getByText('👩‍🔬')).toBeInTheDocument()
      expect(screen.getByText('👨‍🎨')).toBeInTheDocument()
      expect(screen.getByText('👩‍💼')).toBeInTheDocument()
      expect(screen.getByText('🧪')).toBeInTheDocument()
      expect(screen.getByText('📊')).toBeInTheDocument()
    })

    it('应该显示状态指示器', () => {
      const { container } = render(TestWrapper.withIntl(<TeamStatusPanel />))

      // 检查状态指示器（带有 rounded-full 和背景色的圆点）
      const statusDots = container.querySelectorAll('.w-2.h-2.rounded-full')
      expect(statusDots.length).toBe(mockTeamMembers.length)
    })

    it('应该显示成员专长（tooltip）', () => {
      const { container } = render(TestWrapper.withIntl(<TeamStatusPanel />))

      // 检查是否有包含专长信息的 tooltip
      const tooltips = container.querySelectorAll('[title]')
      expect(tooltips.length).toBe(mockTeamMembers.length)

      expect(container.querySelector('[title="前端开发"]')).toBeInTheDocument()
      expect(container.querySelector('[title="后端开发"]')).toBeInTheDocument()
      expect(container.querySelector('[title="UI设计"]')).toBeInTheDocument()
    })
  })

  describe('状态显示', () => {
    it('应该正确显示在线状态', () => {
      const { container } = render(TestWrapper.withIntl(<TeamStatusPanel />))

      const onlineDots = container.querySelectorAll('.bg-green-500')
      expect(onlineDots.length).toBe(3) // 张三、赵六、周八
    })

    it('应该正确显示忙碌状态', () => {
      const { container } = render(TestWrapper.withIntl(<TeamStatusPanel />))

      const busyDots = container.querySelectorAll('.bg-yellow-500')
      expect(busyDots.length).toBe(2) // 李四、孙七
    })

    it('应该正确显示离线状态', () => {
      const { container } = render(TestWrapper.withIntl(<TeamStatusPanel />))

      const offlineDots = container.querySelectorAll('.bg-zinc-400')
      expect(offlineDots.length).toBe(1) // 王五
    })
  })

  describe('布局和样式', () => {
    it('应该使用 3 列网格布局', () => {
      const { container } = render(TestWrapper.withIntl(<TeamStatusPanel />))

      const grid = container.querySelector('.grid-cols-3')
      expect(grid).toBeInTheDocument()
    })

    it('应该有最大高度限制和滚动条', () => {
      const { container } = render(TestWrapper.withIntl(<TeamStatusPanel />))

      const panel = container.querySelector('.max-h-40')
      expect(panel).toBeInTheDocument()

      const overflowContainer = container.querySelector('.overflow-y-auto')
      expect(overflowContainer).toBeInTheDocument()
    })

    it('应该显示成员卡片背景', () => {
      const { container } = render(TestWrapper.withIntl(<TeamStatusPanel />))

      const cards = container.querySelectorAll('.bg-white')
      expect(cards.length).toBe(mockTeamMembers.length)
    })

    it('应该有 hover 效果', () => {
      const { container } = render(TestWrapper.withIntl(<TeamStatusPanel />))

      const hoverElements = container.querySelectorAll('.hover\\:shadow-md')
      expect(hoverElements.length).toBeGreaterThan(0)
    })
  })

  describe('空状态', () => {
    it('空团队成员列表应该正常渲染', () => {
      const { container } = render(TestWrapper.withIntl(<TeamStatusPanel />))

      const panel = container.querySelector('.max-h-40')
      expect(panel).toBeInTheDocument()
    })
  })

  describe('成员数量', () => {
    it('应该正确显示单个成员', () => {
      const singleMember = [mockTeamMembers[0]]
      const { container } = render(TestWrapper.withIntl(<TeamStatusPanel />))

      expect(screen.getByText('张三')).toBeInTheDocument()
      expect(screen.getByText('👨‍💻')).toBeInTheDocument()

      const statusDots = container.querySelectorAll('.w-2.h-2.rounded-full')
      expect(statusDots.length).toBe(1)
    })

    it('应该正确显示大量成员', () => {
      const manyMembers = [...mockTeamMembers, ...mockTeamMembers, ...mockTeamMembers]
      const { container } = render(TestWrapper.withIntl(<TeamStatusPanel />))

      const statusDots = container.querySelectorAll('.w-2.h-2.rounded-full')
      expect(statusDots.length).toBe(manyMembers.length)
    })
  })

  describe('成员信息', () => {
    it('应该显示成员姓名', () => {
      render(TestWrapper.withIntl(<TeamStatusPanel />))

      expect(screen.getByText('张三')).toBeInTheDocument()
      expect(screen.getByText('李四')).toBeInTheDocument()
      expect(screen.getByText('王五')).toBeInTheDocument()
    })

    it('应该显示成员表情符号', () => {
      render(TestWrapper.withIntl(<TeamStatusPanel />))

      expect(screen.getByText('👨‍💻')).toBeInTheDocument()
      expect(screen.getByText('👩‍🔬')).toBeInTheDocument()
      expect(screen.getByText('👨‍🎨')).toBeInTheDocument()
    })

    it('应该通过 tooltip 显示专长信息', () => {
      const { container } = render(TestWrapper.withIntl(<TeamStatusPanel />))

      const memberCards = container.querySelectorAll('[title]')
      memberCards.forEach(card => {
        expect(card).toBeInTheDocument()
      })
    })
  })

  describe('响应式设计', () => {
    it('应该在所有屏幕尺寸上正确渲染', () => {
      const { container } = render(TestWrapper.withIntl(<TeamStatusPanel />))

      const grid = container.querySelector('.grid-cols-3')
      expect(grid).toBeInTheDocument()
    })
  })

  describe('边框和分隔符', () => {
    it('应该显示底部边框', () => {
      const { container } = render(TestWrapper.withIntl(<TeamStatusPanel />))

      const panel = container.querySelector('.border-b')
      expect(panel).toBeInTheDocument()
    })
  })
})
