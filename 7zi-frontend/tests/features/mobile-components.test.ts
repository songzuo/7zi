/**
 * Mobile Components Tests - v1.13.0
 *
 * 测试移动端组件功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import {
  Touchable,
  Swipeable,
  PullToRefresh,
  ScrollLock,
} from '@/components/mobile/MobileTouch'

describe('Mobile Components Tests', () => {
  describe('Touchable 组件', () => {
    it('应该渲染子元素', () => {
      render(
        <Touchable>
          <button>Click me</button>
        </Touchable>
      )

      expect(screen.getByText('Click me')).toBeInTheDocument()
    })

    it('应该响应点击事件', () => {
      const handleClick = vi.fn()

      render(
        <Touchable onPress={handleClick}>
          <button>Click me</button>
        </Touchable>
      )

      const button = screen.getByText('Click me')
      fireEvent.click(button)

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('应该响应长按事件', async () => {
      const handleLongPress = vi.fn()

      render(
        <Touchable onLongPress={handleLongPress} longPressDelay={100}>
          <button>Long press me</button>
        </Touchable>
      )

      const button = screen.getByText('Long press me')

      // 模拟长按
      fireEvent.touchStart(button)
      await waitFor(
        () => {
          expect(handleLongPress).toHaveBeenCalled()
        },
        { timeout: 200 }
      )
    })

    it('应该在禁用状态下不响应点击', () => {
      const handleClick = vi.fn()

      render(
        <Touchable onPress={handleClick} disabled>
          <button>Disabled</button>
        </Touchable>
      )

      const button = screen.getByText('Disabled')
      fireEvent.click(button)

      expect(handleClick).not.toHaveBeenCalled()
    })

    it('应该应用不同的反馈类型', () => {
      const { rerender } = render(
        <Touchable feedbackType="opacity">
          <button>Opacity</button>
        </Touchable>
      )

      let button = screen.getByText('Opacity')
      expect(button).toHaveClass('active:opacity-70')

      rerender(
        <Touchable feedbackType="scale">
          <button>Scale</button>
        </Touchable>
      )

      button = screen.getByText('Scale')
      expect(button).toHaveClass('active:scale-[0.97]')
    })

    it('应该应用自定义类名', () => {
      render(
        <Touchable className="custom-class">
          <button>Custom</button>
        </Touchable>
      )

      const button = screen.getByText('Custom')
      expect(button).toHaveClass('custom-class')
    })

    it('应该应用自定义样式', () => {
      const customStyle = { backgroundColor: 'red' }

      render(
        <Touchable style={customStyle}>
          <button>Styled</button>
        </Touchable>
      )

      const button = screen.getByText('Styled')
      expect(button).toHaveStyle({ backgroundColor: 'red' })
    })

    it('应该防止双击缩放', () => {
      render(
        <Touchable noDoubleTapZoom>
          <button>No zoom</button>
        </Touchable>
      )

      const button = screen.getByText('No zoom')
      expect(button).toHaveClass('touch-manipulation')
    })

    it('应该在激活状态下显示激活样式', () => {
      render(
        <Touchable active>
          <button>Active</button>
        </Touchable>
      )

      const button = screen.getByText('Active')
      expect(button).toHaveClass('bg-blue-50')
    })
  })

  describe('Swipeable 组件', () => {
    it('应该渲染子元素', () => {
      render(
        <Swipeable>
          <div>Swipe me</div>
        </Swipeable>
      )

      expect(screen.getByText('Swipe me')).toBeInTheDocument()
    })

    it('应该检测向右滑动', () => {
      const handleSwipeRight = vi.fn()

      render(
        <Swipeable onSwipeRight={handleSwipeRight}>
          <div>Swipe right</div>
        </Swipeable>
      )

      const container = screen.getByText('Swipe right')

      // 模拟滑动
      fireEvent.touchStart(container, {
        touches: [{ clientX: 0, clientY: 0 }],
      })

      fireEvent.touchEnd(container, {
        changedTouches: [{ clientX: 100, clientY: 0 }],
      })

      expect(handleSwipeRight).toHaveBeenCalled()
    })

    it('应该检测向左滑动', () => {
      const handleSwipeLeft = vi.fn()

      render(
        <Swipeable onSwipeLeft={handleSwipeLeft}>
          <div>Swipe left</div>
        </Swipeable>
      )

      const container = screen.getByText('Swipe left')

      fireEvent.touchStart(container, {
        touches: [{ clientX: 100, clientY: 0 }],
      })

      fireEvent.touchEnd(container, {
        changedTouches: [{ clientX: 0, clientY: 0 }],
      })

      expect(handleSwipeLeft).toHaveBeenCalled()
    })

    it('应该检测向上滑动', () => {
      const handleSwipeUp = vi.fn()

      render(
        <Swipeable onSwipeUp={handleSwipeUp}>
          <div>Swipe up</div>
        </Swipeable>
      )

      const container = screen.getByText('Swipe up')

      fireEvent.touchStart(container, {
        touches: [{ clientX: 0, clientY: 100 }],
      })

      fireEvent.touchEnd(container, {
        changedTouches: [{ clientX: 0, clientY: 0 }],
      })

      expect(handleSwipeUp).toHaveBeenCalled()
    })

    it('应该检测向下滑动', () => {
      const handleSwipeDown = vi.fn()

      render(
        <Swipeable onSwipeDown={handleSwipeDown}>
          <div>Swipe down</div>
        </Swipeable>
      )

      const container = screen.getByText('Swipe down')

      fireEvent.touchStart(container, {
        touches: [{ clientX: 0, clientY: 0 }],
      })

      fireEvent.touchEnd(container, {
        changedTouches: [{ clientX: 0, clientY: 100 }],
      })

      expect(handleSwipeDown).toHaveBeenCalled()
    })

    it('应该使用自定义滑动阈值', () => {
      const handleSwipeRight = vi.fn()

      render(
        <Swipeable onSwipeRight={handleSwipeRight} minSwipeDistance={200}>
          <div>Long swipe</div>
        </Swipeable>
      )

      const container = screen.getByText('Long swipe')

      // 滑动距离小于阈值
      fireEvent.touchStart(container, {
        touches: [{ clientX: 0, clientY: 0 }],
      })

      fireEvent.touchEnd(container, {
        changedTouches: [{ clientX: 50, clientY: 0 }],
      })

      // 不应该触发
      expect(handleSwipeRight).not.toHaveBeenCalled()
    })
  })

  describe('PullToRefresh 组件', () => {
    it('应该渲染子元素', () => {
      render(
        <PullToRefresh onRefresh={vi.fn()}>
          <div>Content</div>
        </PullToRefresh>
      )

      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('应该显示刷新指示器', async () => {
      const handleRefresh = vi.fn().mockResolvedValue(undefined)

      render(
        <PullToRefresh onRefresh={handleRefresh} refreshing>
          <div>Refreshing content</div>
        </PullToRefresh>
      )

      // 应该显示刷新中状态
      await waitFor(() => {
        expect(screen.getByText(/刷新中/)).toBeInTheDocument()
      })
    })

    it('应该在拉动时显示提示', async () => {
      const handleRefresh = vi.fn().mockResolvedValue(undefined)

      render(
        <PullToRefresh onRefresh={handleRefresh} threshold={50}>
          <div>Pull content</div>
        </PullToRefresh>
      )

      const container = screen.getByText('Pull content')

      // 模拟下拉
      fireEvent.touchStart(container, {
        touches: [{ clientX: 0, clientY: 0 }],
      })

      fireEvent.touchMove(container, {
        touches: [{ clientX: 0, clientY: 60 }],
      })

      // 应该显示下拉提示
      await waitFor(() => {
        expect(screen.getByText(/下拉刷新/)).toBeInTheDocument()
      })
    })

    it('应该在达到阈值时显示释放提示', async () => {
      const handleRefresh = vi.fn().mockResolvedValue(undefined)

      render(
        <PullToRefresh onRefresh={handleRefresh} threshold={50}>
          <div>Release content</div>
        </PullToRefresh>
      )

      const container = screen.getByText('Release content')

      // 模拟下拉超过阈值
      fireEvent.touchStart(container, {
        touches: [{ clientX: 0, clientY: 0 }],
      })

      fireEvent.touchMove(container, {
        touches: [{ clientX: 0, clientY: 80 }],
      })

      // 应该显示释放提示
      await waitFor(() => {
        expect(screen.getByText(/释放刷新/)).toBeInTheDocument()
      })
    })

    it('应该在释放时触发刷新', async () => {
      const handleRefresh = vi.fn().mockResolvedValue(undefined)

      render(
        <PullToRefresh onRefresh={handleRefresh} threshold={50}>
          <div>Refresh content</div>
        </PullToRefresh>
      )

      const container = screen.getByText('Refresh content')

      // 模拟下拉并释放
      fireEvent.touchStart(container, {
        touches: [{ clientX: 0, clientY: 0 }],
      })

      fireEvent.touchMove(container, {
        touches: [{ clientX: 0, clientY: 80 }],
      })

      fireEvent.touchEnd(container, {
        changedTouches: [{ clientX: 0, clientY: 80 }],
      })

      // 应该触发刷新
      await waitFor(() => {
        expect(handleRefresh).toHaveBeenCalled()
      })
    })

    it('应该使用自定义阈值', () => {
      const handleRefresh = vi.fn().mockResolvedValue(undefined)

      render(
        <PullToRefresh onRefresh={handleRefresh} threshold={100}>
          <div>Custom threshold</div>
        </PullToRefresh>
      )

      const container = screen.getByText('Custom threshold')

      // 模拟下拉但未达到阈值
      fireEvent.touchStart(container, {
        touches: [{ clientX: 0, clientY: 0 }],
      })

      fireEvent.touchMove(container, {
        touches: [{ clientX: 0, clientY: 50 }],
      })

      fireEvent.touchEnd(container, {
        changedTouches: [{ clientX: 0, clientY: 50 }],
      })

      // 不应该触发刷新
      expect(handleRefresh).not.toHaveBeenCalled()
    })
  })

  describe('ScrollLock 组件', () => {
    it('应该渲染子元素', () => {
      render(
        <ScrollLock locked={false}>
          <div>Content</div>
        </ScrollLock>
      )

      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('应该在锁定时禁用滚动', () => {
      const originalOverflow = document.body.style.overflow

      render(
        <ScrollLock locked={true}>
          <div>Locked content</div>
        </ScrollLock>
      )

      expect(document.body.style.overflow).toBe('hidden')

      // 恢复原始样式
      document.body.style.overflow = originalOverflow
    })

    it('应该在解锁时恢复滚动', () => {
      const originalOverflow = document.body.style.overflow

      const { rerender } = render(
        <ScrollLock locked={true}>
          <div>Locked content</div>
        </ScrollLock>
      )

      expect(document.body.style.overflow).toBe('hidden')

      // 解锁
      rerender(
        <ScrollLock locked={false}>
          <div>Unlocked content</div>
        </ScrollLock>
      )

      expect(document.body.style.overflow).toBe('')

      // 恢复原始样式
      document.body.style.overflow = originalOverflow
    })

    it('应该保存和恢复滚动位置', () => {
      const originalOverflow = document.body.style.overflow
      const originalPosition = document.body.style.position

      // 设置初始滚动位置
      window.scrollTo(0, 100)

      render(
        <ScrollLock locked={true}>
          <div>Locked content</div>
        </ScrollLock>
      )

      const scrollY = window.scrollY

      // 锁定后应该保存位置
      expect(scrollY).toBe(100)

      // 恢复原始样式
      document.body.style.overflow = originalOverflow
      document.body.style.position = originalPosition
    })
  })

  describe('集成测试', () => {
    it('应该组合使用多个移动端组件', () => {
      const handleClick = vi.fn()
      const handleSwipe = vi.fn()
      const handleRefresh = vi.fn().mockResolvedValue(undefined)

      render(
        <ScrollLock locked={false}>
          <PullToRefresh onRefresh={handleRefresh}>
            <Swipeable onSwipeRight={handleSwipe}>
              <Touchable onPress={handleClick}>
                <button>Combined</button>
              </Touchable>
            </Swipeable>
          </PullToRefresh>
        </ScrollLock>
      )

      expect(screen.getByText('Combined')).toBeInTheDocument()
    })

    it('应该正确处理嵌套组件', () => {
      const outerClick = vi.fn()
      const innerClick = vi.fn()

      render(
        <Touchable onPress={outerClick}>
          <div>
            <Touchable onPress={innerClick}>
              <button>Inner</button>
            </Touchable>
          </div>
        </Touchable>
      )

      const button = screen.getByText('Inner')
      fireEvent.click(button)

      // 应该触发内部点击
      expect(innerClick).toHaveBeenCalled()
    })
  })
})