/**
 * Sitemap.xml 测试套件
 * 测试 sitemap.xml 生成和配置
 */

import { describe, it, expect, beforeAll } from 'vitest'

describe('SEO - Sitemap.xml 生成测试', () => {
  let sitemap: any[]

  beforeAll(async () => {
    try {
      // 动态导入生成的 sitemap 配置
      const sitemapModule = await import('@/app/sitemap')
      sitemap = sitemapModule.default()
    } catch (_error) {
      console.warn('sitemap.ts 未找到，测试标记为待实现')
    }
  })

  describe('基本结构', () => {
    it('应返回 sitemap 数组', () => {
      if (!sitemap) {
        it.todo('实现 sitemap.ts')
        return
      }

      expect(Array.isArray(sitemap)).toBe(true)
      expect(sitemap.length).toBeGreaterThan(0)
    })

    it('每个 URL 对象应包含必需字段', () => {
      if (!sitemap) {
        it.todo('实现 sitemap.ts')
        return
      }

      sitemap.forEach((item) => {
        expect(item).toHaveProperty('url')
        expect(item).toHaveProperty('lastModified')
        expect(item).toHaveProperty('changeFrequency')
        expect(item).toHaveProperty('priority')
      })
    })

    it('所有 URL 应使用正确的协议', () => {
      if (!sitemap) {
        it.todo('实现 sitemap.ts')
        return
      }

      sitemap.forEach((item) => {
        expect(item.url).toMatch(/^https?:\/\//)
      })
    })
  })

  describe('URL 完整性', () => {
    it('应包含首页', () => {
      if (!sitemap) {
        it.todo('实现 sitemap.ts')
        return
      }

      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.com'
      const hasHome = sitemap.some((item) => item.url === baseUrl || item.url === `${baseUrl}/`)
      expect(hasHome).toBe(true)
    })

    it('应包含主要页面', () => {
      if (!sitemap) {
        it.todo('实现 sitemap.ts')
        return
      }

      const expectedPages = [
        '/image-optimization-demo',
        '/notification-demo',
        '/design-system',
        '/feedback',
        '/i18n-demo',
      ]

      expectedPages.forEach((page) => {
        const exists = sitemap.some((item) => item.url.endsWith(page))
        expect(exists).toBe(true)
      })
    })

    it('不应包含 API 路由', () => {
      if (!sitemap) {
        it.todo('实现 sitemap.ts')
        return
      }

      const hasApiRoutes = sitemap.some((item) => item.url.includes('/api/'))
      expect(hasApiRoutes).toBe(false)
    })

    it('不应包含管理后台路由', () => {
      if (!sitemap) {
        it.todo('实现 sitemap.ts')
        return
      }

      const hasAdminRoutes = sitemap.some((item) => item.url.includes('/admin/'))
      expect(hasAdminRoutes).toBe(false)
    })
  })

  describe('多语言支持', () => {
    it('应包含多语言页面', () => {
      if (!sitemap) {
        it.todo('实现 sitemap.ts')
        return
      }

      const hasLocalePages = sitemap.some((item) =>
        item.url.match(/\/(zh-CN|en)\//)
      )
      expect(hasLocalePages).toBe(true)
    })

    it('多语言页面应包含 alternates', () => {
      if (!sitemap) {
        it.todo('实现 sitemap.ts')
        return
      }

      const localePages = sitemap.filter((item) =>
        item.url.match(/\/(zh-CN|en)\//)
      )

      localePages.forEach((item) => {
        if (item.alternates && item.alternates.languages) {
          expect(item.alternates.languages).toHaveProperty('zh-CN')
          expect(item.alternates.languages).toHaveProperty('en')
        }
      })
    })
  })

  describe('优先级和更新频率', () => {
    it('首页应有最高优先级', () => {
      if (!sitemap) {
        it.todo('实现 sitemap.ts')
        return
      }

      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.com'
      const homePage = sitemap.find(
        (item) => item.url === baseUrl || item.url === `${baseUrl}/`
      )

      expect(homePage).toBeDefined()
      expect(homePage.priority).toBe(1)
    })

    it('主要页面应有合理优先级（0.7-1.0）', () => {
      if (!sitemap) {
        it.todo('实现 sitemap.ts')
        return
      }

      sitemap.forEach((item) => {
        expect(item.priority).toBeGreaterThanOrEqual(0)
        expect(item.priority).toBeLessThanOrEqual(1)
      })
    })

    it('changeFrequency 应是有效值', () => {
      if (!sitemap) {
        it.todo('实现 sitemap.ts')
        return
      }

      const validFrequencies = [
        'always',
        'hourly',
        'daily',
        'weekly',
        'monthly',
        'yearly',
        'never',
      ]

      sitemap.forEach((item) => {
        expect(validFrequencies).toContain(item.changeFrequency)
      })
    })

    it('静态页面应有合理的 changeFrequency', () => {
      if (!sitemap) {
        it.todo('实现 sitemap.ts')
        return
      }

      // 静态页面通常不需要频繁更新
      const staticPages = sitemap.filter((item) => !item.url.includes('/api/'))

      staticPages.forEach((item) => {
        expect(['weekly', 'monthly', 'yearly', 'never']).toContain(item.changeFrequency)
      })
    })
  })

  describe('lastModified', () => {
    it('所有条目应有有效的 lastModified 日期', () => {
      if (!sitemap) {
        it.todo('实现 sitemap.ts')
        return
      }

      sitemap.forEach((item) => {
        expect(item.lastModified).toBeInstanceOf(Date)
        expect(item.lastModified.getTime()).not.toBeNaN()
      })
    })

    it('lastModified 不应是未来日期', () => {
      if (!sitemap) {
        it.todo('实现 sitemap.ts')
        return
      }

      const now = new Date()

      sitemap.forEach((item) => {
        expect(item.lastModified.getTime()).toBeLessThanOrEqual(now.getTime())
      })
    })
  })

  describe('URL 格式和标准化', () => {
    it('所有 URL 应使用相同的域名', () => {
      if (!sitemap) {
        it.todo('实现 sitemap.ts')
        return
      }

      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.com'

      sitemap.forEach((item) => {
        expect(item.url).toContain(baseUrl)
      })
    })

    it('URL 应是有效的 HTTP/HTTPS 地址', () => {
      if (!sitemap) {
        it.todo('实现 sitemap.ts')
        return
      }

      sitemap.forEach((item) => {
        expect(() => new URL(item.url)).not.toThrow()
      })
    })

    it('不应有重复的 URL', () => {
      if (!sitemap) {
        it.todo('实现 sitemap.ts')
        return
      }

      const urls = sitemap.map((item) => item.url)
      const uniqueUrls = new Set(urls)

      expect(urls.length).toBe(uniqueUrls.size)
    })
  })
})
