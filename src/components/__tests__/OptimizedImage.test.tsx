/**
 * @fileoverview OptimizedImage 组件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { OptimizedImage, ResponsiveImage } from '../OptimizedImage'

// Mock IntersectionObserver at the top level
const mockObserve = vi.fn()
const mockUnobserve = vi.fn()
const mockDisconnect = vi.fn()
const mockTakeRecords = vi.fn().mockReturnValue([])
const mockCallback = vi.fn()

class MockIntersectionObserver {
  root: Element | Document | null = null
  rootMargin: string = ''
  thresholds: ReadonlyArray<number> = []

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    mockCallback(callback)
    if (options) {
      if (options.root) this.root = options.root
      if (options.rootMargin) this.rootMargin = options.rootMargin
      if (options.threshold) {
        this.thresholds = Array.isArray(options.threshold) ? options.threshold : [options.threshold]
      }
    }
  }

  observe = mockObserve
  unobserve = mockUnobserve
  disconnect = mockDisconnect
  takeRecords = mockTakeRecords
}

window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver

describe('OptimizedImage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockObserve.mockClear()
    mockUnobserve.mockClear()
    mockDisconnect.mockClear()
    mockCallback.mockClear()
  })

  describe('基本渲染', () => {
    it('应该渲染图片元素', async () => {
      render(<OptimizedImage src="/test.jpg" alt="Test image" priority />)

      await waitFor(() => {
        const img = screen.queryByAltText('Test image')
        expect(img).toBeInTheDocument()
      })
    })

    it('应该使用提供的 src', async () => {
      render(<OptimizedImage src="/test.jpg" alt="Test image" priority />)

      await waitFor(() => {
        const img = screen.getByAltText('Test image')
        expect(img).toHaveAttribute('src', '/test.jpg')
      })
    })

    it('应该使用提供的 alt', async () => {
      render(<OptimizedImage src="/test.jpg" alt="Test image" priority />)

      await waitFor(() => {
        const img = screen.getByAltText('Test image')
        expect(img).toHaveAttribute('alt', 'Test image')
      })
    })

    it('应该支持自定义 className', async () => {
      const { container } = render(
        <OptimizedImage src="/test.jpg" alt="Test image" priority className="custom-class" />
      )

      await waitFor(() => {
        const wrapper = container.querySelector('.custom-class')
        expect(wrapper).toBeInTheDocument()
      })
    })

    it('应该支持自定义 style', async () => {
      const { container } = render(
        <OptimizedImage src="/test.jpg" alt="Test image" priority style={{ width: '200px' }} />
      )

      await waitFor(() => {
        const wrapper = container.querySelector('[style*="width: 200px"]')
        expect(wrapper).toBeInTheDocument()
      })
    })
  })

  describe('尺寸和布局', () => {
    it('应该应用宽度', async () => {
      const { container } = render(
        <OptimizedImage src="/test.jpg" alt="Test image" width={300} priority />
      )

      await waitFor(() => {
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper).toHaveStyle({ width: '300px' })
      })
    })

    it('应该应用高度', async () => {
      const { container } = render(
        <OptimizedImage src="/test.jpg" alt="Test image" height={200} priority />
      )

      await waitFor(() => {
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper).toHaveStyle({ height: '200px' })
      })
    })

    it('应该同时应用宽度和高度', async () => {
      const { container } = render(
        <OptimizedImage src="/test.jpg" alt="Test image" width={300} height={200} priority />
      )

      await waitFor(() => {
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper).toHaveStyle({ width: '300px' })
        expect(wrapper).toHaveStyle({ height: '200px' })
      })
    })

    it('没有指定宽度时应该响应式调整', async () => {
      const { container } = render(<OptimizedImage src="/test.jpg" alt="Test image" priority />)

      await waitFor(() => {
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper).toHaveStyle({ width: '100%' })
      })
    })
  })

  describe('懒加载行为', () => {
    it('priority 为 true 时应该设置 eager 加载', async () => {
      render(<OptimizedImage src="/test.jpg" alt="Test image" priority />)

      await waitFor(() => {
        const img = screen.getByAltText('Test image')
        expect(img).toHaveAttribute('loading', 'eager')
      })
    })

    it('应该使用 async 解码', async () => {
      render(<OptimizedImage src="/test.jpg" alt="Test image" priority />)

      await waitFor(() => {
        const img = screen.getByAltText('Test image')
        expect(img).toHaveAttribute('decoding', 'async')
      })
    })

    it('非 priority 图片应该设置 IntersectionObserver', async () => {
      render(<OptimizedImage src="/test.jpg" alt="Test image" priority={false} />)

      // Check that IntersectionObserver was created and observe was called
      expect(mockObserve).toHaveBeenCalled()
    })

    it('priority 图片不应该设置 IntersectionObserver', async () => {
      render(<OptimizedImage src="/test.jpg" alt="Test image" priority />)

      // Check that observe was NOT called for priority images
      expect(mockObserve).not.toHaveBeenCalled()
    })

    it('组件卸载时应该断开 IntersectionObserver', async () => {
      const { unmount } = render(
        <OptimizedImage src="/test.jpg" alt="Test image" priority={false} />
      )

      await act(async () => {
        unmount()
      })

      expect(mockDisconnect).toHaveBeenCalled()
    })
  })

  describe('占位符', () => {
    it('placeholder 为 blur 时应该显示模糊占位符', async () => {
      render(
        <OptimizedImage
          src="/test.jpg"
          alt="Test image"
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD"
        />
      )

      await waitFor(() => {
        const blurImage = screen.queryByAltText('')
        expect(blurImage).toBeInTheDocument()
      })
    })

    it('占位符应该带有 animate-pulse 类', async () => {
      const { container } = render(<OptimizedImage src="/test.jpg" alt="Test image" />)

      await waitFor(() => {
        const placeholder = container.querySelector('.animate-pulse')
        expect(placeholder).toBeInTheDocument()
      })
    })
  })

  describe('加载状态回调', () => {
    it('应该调用 onLoad 回调', async () => {
      const onLoad = vi.fn()

      render(<OptimizedImage src="/test.jpg" alt="Test image" priority onLoad={onLoad} />)

      await waitFor(() => {
        const img = screen.queryByAltText('Test image') as HTMLImageElement
        if (img) {
          img.dispatchEvent(new Event('load', { bubbles: true }))
        }
      })

      await waitFor(() => {
        expect(onLoad).toHaveBeenCalled()
      })
    })

    it('应该调用 onError 回调', async () => {
      const onError = vi.fn()

      render(<OptimizedImage src="/invalid.jpg" alt="Test image" priority onError={onError} />)

      await waitFor(() => {
        const img = screen.queryByAltText('Test image') as HTMLImageElement
        if (img) {
          img.dispatchEvent(new Event('error', { bubbles: true }))
        }
      })

      await waitFor(() => {
        expect(onError).toHaveBeenCalled()
      })
    })

    it('错误后应该显示错误图标', async () => {
      const { container } = render(<OptimizedImage src="/invalid.jpg" alt="Test image" priority />)

      await waitFor(() => {
        const img = container.querySelector('img[alt="Test image"]') as HTMLImageElement
        if (img) {
          img.dispatchEvent(new Event('error', { bubbles: true }))
        }
      })

      await waitFor(() => {
        const errorIcon = container.querySelector('svg')
        expect(errorIcon).toBeInTheDocument()
      })
    })
  })

  describe('响应式属性', () => {
    it('应该支持 sizes 属性', async () => {
      render(
        <OptimizedImage
          src="/test.jpg"
          alt="Test image"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      )

      await waitFor(() => {
        const img = screen.getByAltText('Test image')
        expect(img).toHaveAttribute('sizes', '(max-width: 768px) 100vw, 50vw')
      })
    })
  })

  describe('URL 处理', () => {
    it('应该保持绝对 URL 不变', async () => {
      render(<OptimizedImage src="https://example.com/image.jpg" alt="Test image" priority />)

      await waitFor(() => {
        const img = screen.getByAltText('Test image')
        expect(img).toHaveAttribute('src', 'https://example.com/image.jpg')
      })
    })

    it('应该保持相对 URL 不变', async () => {
      render(<OptimizedImage src="/test.jpg" alt="Test image" priority />)

      await waitFor(() => {
        const img = screen.getByAltText('Test image')
        expect(img).toHaveAttribute('src', '/test.jpg')
      })
    })
  })

  describe('可访问性', () => {
    it('应该设置适当的 alt 文本', async () => {
      render(<OptimizedImage src="/test.jpg" alt="A beautiful landscape" priority />)

      await waitFor(() => {
        const img = screen.getByAltText('A beautiful landscape')
        expect(img).toBeInTheDocument()
      })
    })
  })
})

describe('ResponsiveImage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockObserve.mockClear()
  })

  describe('基本渲染', () => {
    it('应该渲染包装器和图片', async () => {
      render(<ResponsiveImage src="/test.jpg" alt="Test image" priority />)

      await waitFor(() => {
        const img = screen.getByAltText('Test image')
        expect(img).toBeInTheDocument()
      })
    })

    it('应该支持 16:9 宽高比', async () => {
      const { container } = render(
        <ResponsiveImage src="/test.jpg" alt="Test image" aspectRatio="16/9" priority />
      )

      await waitFor(() => {
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper).toHaveStyle({ aspectRatio: '16/9' })
      })
    })

    it('应该支持 4:3 宽高比', async () => {
      const { container } = render(
        <ResponsiveImage src="/test.jpg" alt="Test image" aspectRatio="4/3" priority />
      )

      await waitFor(() => {
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper).toHaveStyle({ aspectRatio: '4/3' })
      })
    })

    it('应该支持 1:1 宽高比', async () => {
      const { container } = render(
        <ResponsiveImage src="/test.jpg" alt="Test image" aspectRatio="1/1" priority />
      )

      await waitFor(() => {
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper).toHaveStyle({ aspectRatio: '1/1' })
      })
    })

    it('默认应该使用 16:9 宽高比', async () => {
      const { container } = render(<ResponsiveImage src="/test.jpg" alt="Test image" priority />)

      await waitFor(() => {
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper).toHaveStyle({ aspectRatio: '16/9' })
      })
    })
  })

  describe('填充模式', () => {
    it('fill 为 true 时应该绝对定位', async () => {
      const { container } = render(
        <ResponsiveImage src="/test.jpg" alt="Test image" fill priority />
      )

      await waitFor(() => {
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper).toHaveStyle({
          position: 'absolute',
          inset: '0',
        })
      })
    })

    it('fill 为 false 时应该非绝对定位', async () => {
      const { container } = render(
        <ResponsiveImage src="/test.jpg" alt="Test image" fill={false} priority />
      )

      await waitFor(() => {
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper.style.position).not.toBe('absolute')
      })
    })
  })

  describe('属性传递', () => {
    it('应该传递 priority 属性', async () => {
      render(<ResponsiveImage src="/test.jpg" alt="Test image" priority />)

      await waitFor(() => {
        const img = screen.getByAltText('Test image')
        expect(img).toHaveAttribute('loading', 'eager')
      })
    })

    it('应该支持自定义 className', async () => {
      const { container } = render(
        <ResponsiveImage src="/test.jpg" alt="Test image" className="custom-class" priority />
      )

      await waitFor(() => {
        const wrapper = container.querySelector('.custom-class')
        expect(wrapper).toBeInTheDocument()
      })
    })
  })
})
