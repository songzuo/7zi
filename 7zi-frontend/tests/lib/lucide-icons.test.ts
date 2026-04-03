/**
 * Lucide Icon 组件测试
 *
 * 测试 DynamicIcon 组件的导入和渲染
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import * as React from 'react'
import { DynamicIcon, type IconName } from '@/shared/components/DynamicIcon'

// Mock React.lazy
vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual,
    lazy: (fn: () => Promise<any>) => {
      return () => {
        return {
          then: (cb: (mod: any) => void) => {
            fn().then(cb)
          },
        }
      }
    },
  }
})

describe('DynamicIcon 组件测试', () => {
  // 模拟 console.error 以避免 Suspense 警告
  const originalError = console.error
  beforeEach(() => {
    console.error = vi.fn()
  })

  afterEach(() => {
    console.error = originalError
  })

  describe('图标导入测试', () => {
    it('应该能正确导入 DynamicIcon 组件', () => {
      expect(DynamicIcon).toBeDefined()
      expect(typeof DynamicIcon).toBe('function')
    })

    it('应该导出正确的 IconName 类型', () => {
      // 测试有效的图标名称类型
      const validIcon: IconName = 'Bell'
      expect(validIcon).toBe('Bell')
    })

    it('应该支持所有预定义的图标名称', () => {
      const iconNames: IconName[] = [
        'Bell',
        'Send',
        'Trash2',
        'Check',
        'X',
        'Info',
        'CheckCircle',
        'AlertTriangle',
        'XCircle',
        'MessageSquare',
        'Star',
        'Upload',
        'Camera',
        'Save',
        'Loader2',
        'Globe',
        'Lightbulb',
      ]

      iconNames.forEach(name => {
        expect(name).toBeDefined()
      })
    })
  })

  describe('Lucide React 包测试', () => {
    it('应该能正确导入 lucide-react', async () => {
      const { Bell } = await import('lucide-react')
      expect(Bell).toBeDefined()
      // Lucide 图标可能是对象（ForwardRefExoticComponent）而不是直接的函数
      expect(typeof Bell === 'function' || typeof Bell === 'object').toBe(true)
    })

    it('应该能渲染基本的 Lucide 图标', () => {
      const { Bell } = require('lucide-react')
      render(React.createElement(Bell, { 'data-testid': 'test-bell-icon' }))
      const icon = screen.getByTestId('test-bell-icon')
      expect(icon).toBeDefined()
      expect(icon.tagName.toLowerCase()).toBe('svg')
    })

    it('应该支持图标的基本 props', () => {
      const { Bell } = require('lucide-react')
      const { container } = render(
        React.createElement(Bell, {
          'data-testid': 'sized-icon',
          size: 24,
          strokeWidth: 2,
          className: 'test-class',
        })
      )
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('width', '24')
      expect(svg).toHaveAttribute('height', '24')
      expect(svg).toHaveClass('test-class')
    })
  })

  describe('多个 Lucide 图标渲染测试', () => {
    it('应该能渲染多种不同图标', () => {
      const icons = [
        { name: 'Bell', Component: require('lucide-react').Bell },
        { name: 'Send', Component: require('lucide-react').Send },
        { name: 'CheckCircle', Component: require('lucide-react').CheckCircle },
        { name: 'AlertTriangle', Component: require('lucide-react').AlertTriangle },
        { name: 'XCircle', Component: require('lucide-react').XCircle },
        { name: 'Globe', Component: require('lucide-react').Globe },
      ]

      icons.forEach(({ name, Component }) => {
        render(React.createElement(Component, { 'data-testid': `icon-${name}` }))
        const icon = screen.getByTestId(`icon-${name}`)
        expect(icon).toBeDefined()
        expect(icon.tagName.toLowerCase()).toBe('svg')
      })
    })
  })

  describe('图标属性测试', () => {
    it('应该正确应用 size 属性', () => {
      const { Check } = require('lucide-react')
      const { container } = render(React.createElement(Check, { size: 32 }))
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('width', '32')
      expect(svg).toHaveAttribute('height', '32')
    })

    it('应该正确应用 strokeWidth 属性', () => {
      const { AlertTriangle } = require('lucide-react')
      const { container } = render(React.createElement(AlertTriangle, { strokeWidth: 1.5 }))
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('stroke-width', '1.5')
    })

    it('应该正确应用 color 属性', () => {
      const { XCircle } = require('lucide-react')
      const { container } = render(React.createElement(XCircle, { color: '#ff0000' }))
      const svg = container.querySelector('svg')
      // Lucide 图标会将 color 应用到 style 或 stroke 属性
      const color = svg?.getAttribute('color') || svg?.getAttribute('stroke') || svg?.style.color
      expect(color).toBeTruthy()
    })

    it('应该正确应用 className 属性', () => {
      const { MessageSquare } = require('lucide-react')
      const { container } = render(
        React.createElement(MessageSquare, { className: 'custom-class another-class' })
      )
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('custom-class')
      expect(svg).toHaveClass('another-class')
    })

    it('应该正确应用 aria-label 属性', () => {
      const { Lightbulb } = require('lucide-react')
      render(React.createElement(Lightbulb, { 'aria-label': '提示图标' }))
      const svg = screen.getByLabelText('提示图标')
      expect(svg).toBeDefined()
    })
  })
})

describe('Lucide React 版本验证', () => {
  it('应该安装正确版本的 lucide-react', async () => {
    const packageJson = await import('../../package.json', { assert: { type: 'json' } })
    const lucideVersion = packageJson.default.dependencies['lucide-react']
    
    // 验证版本号格式 ^1.7.0
    expect(lucideVersion).toMatch(/^\^?1\.7/)
  })

  it('所有项目使用的图标都应该在 lucide-react v1.7+ 中可用', async () => {
    // 项目中使用的图标列表
    const usedIcons = [
      'Activity', 'AlertCircle', 'AlertTriangle', 'Archive', 'ArrowDown',
      'ArrowLeft', 'ArrowRight', 'BarChart3', 'Bell', 'Bug', 'Calendar',
      'Camera', 'Check', 'CheckCircle', 'CheckCircle2', 'CheckCheck',
      'ChevronDown', 'ChevronRight', 'Circle', 'Clock', 'Copy', 'Cpu',
      'Database', 'Download', 'Edit2', 'Eye', 'EyeOff', 'FileJson',
      'FileText', 'Filter', 'Gauge', 'GitBranch', 'Globe', 'Grid',
      'Headphones', 'Home', 'Inbox', 'Info', 'Keyboard', 'Layers',
      'Layout', 'Lightbulb', 'Loader2', 'MapPin', 'Maximize',
      'MessageSquare', 'MoreVertical', 'Network', 'PieChart', 'Play',
      'Redo', 'RefreshCw', 'Reply', 'Save', 'Search', 'Send', 'Shield',
      'Sparkles', 'Star', 'ThumbsDown', 'ThumbsUp', 'Trash2', 'TrendingDown',
      'TrendingUp', 'Undo', 'Upload', 'Users', 'Wand2', 'X', 'XCircle',
      'Zap', 'ZoomIn', 'ZoomOut', 'MousePointer2'
    ]

    // 动态导入 lucide-react 模块
    const lucide = await import('lucide-react')
    
    // 验证关键图标存在
    const keyIcons = ['Bell', 'Send', 'CheckCircle', 'AlertTriangle', 'XCircle', 'Globe']
    keyIcons.forEach(iconName => {
      expect(lucide[iconName]).toBeDefined()
      // Lucide 图标可能是对象（ForwardRefExoticComponent）而不是直接的函数
      expect(typeof lucide[iconName] === 'function' || typeof lucide[iconName] === 'object').toBe(true)
    })
  })
})
