/**
 * SEO 集成测试
 * 测试端点输出和实际渲染结果
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'

describe('SEO - 集成测试', () => {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const isCI = process.env.CI === 'true'

  describe('Robots.txt 端点', () => {
    it(isCI ? 'GET /robots.txt 应返回 200' : 'skip - GET /robots.txt 应返回 200 (需要 CI 环境)', { skip: !isCI }, async () => {
      const response = await fetch(`${baseUrl}/robots.txt`)
      expect(response.status).toBe(200)
    })

    it(isCI ? 'robots.txt 应包含文本内容' : 'skip - robots.txt 应包含文本内容 (需要 CI 环境)', { skip: !isCI }, async () => {
      const response = await fetch(`${baseUrl}/robots.txt`)
      const text = await response.text()

      expect(text).toContain('User-agent')
      expect(text).toContain('Sitemap')
      expect(text).toContain('sitemap.xml')
    })
  })

  describe('Sitemap.xml 端点', () => {
    it(isCI ? 'GET /sitemap.xml 应返回 200' : 'skip - GET /sitemap.xml 应返回 200 (需要 CI 环境)', { skip: !isCI }, async () => {
      const response = await fetch(`${baseUrl}/sitemap.xml`)
      expect(response.status).toBe(200)
    })

    it(isCI ? 'sitemap.xml 应返回 XML 内容' : 'skip - sitemap.xml 应返回 XML 内容 (需要 CI 环境)', { skip: !isCI }, async () => {
      const response = await fetch(`${baseUrl}/sitemap.xml`)
      const text = await response.text()

      expect(text).toContain('<?xml')
      expect(text).toContain('<urlset')
      expect(text).toContain('<url>')
      expect(text).toContain('<loc>')
    })

    it(isCI ? 'sitemap.xml 应包含主要页面' : 'skip - sitemap.xml 应包含主要页面 (需要 CI 环境)', { skip: !isCI }, async () => {
      const response = await fetch(`${baseUrl}/sitemap.xml`)
      const text = await response.text()

      const expectedPages = ['/', '/image-optimization-demo', '/design-system']

      expectedPages.forEach((page) => {
        expect(text).toContain(page)
      })
    })
  })

  describe('Manifest.json 端点', () => {
    it(isCI ? 'GET /manifest.json 应返回 200' : 'skip - GET /manifest.json 应返回 200 (需要 CI 环境)', { skip: !isCI }, async () => {
      const response = await fetch(`${baseUrl}/manifest.json`)
      expect(response.status).toBe(200)
    })

    it(isCI ? 'manifest.json 应返回 JSON 内容' : 'skip - manifest.json 应返回 JSON 内容 (需要 CI 环境)', { skip: !isCI }, async () => {
      const response = await fetch(`${baseUrl}/manifest.json`)
      const json = await response.json()

      expect(json.name).toBeDefined()
      expect(json.short_name).toBeDefined()
      expect(json.start_url).toBeDefined()
      expect(json.display).toBeDefined()
      expect(json.theme_color).toBeDefined()
    })
  })

  describe('OG 图片端点', () => {
    it(isCI ? 'GET /opengraph-image.png 应返回 200' : 'skip - GET /opengraph-image.png 应返回 200 (需要 CI 环境)', { skip: !isCI }, async () => {
      const response = await fetch(`${baseUrl}/opengraph-image`)
      expect(response.status).toBe(200)
    })

    it(isCI ? 'OG 图片应返回正确的 content-type' : 'skip - OG 图片应返回正确的 content-type (需要 CI 环境)', { skip: !isCI }, async () => {
      const response = await fetch(`${baseUrl}/opengraph-image`)
      expect(response.headers.get('content-type')).toContain('image/')
    })
  })

  describe('页面 HTML 输出', () => {
    it(isCI ? '首页应包含 meta 标签' : 'skip - 首页应包含 meta 标签 (需要 CI 环境)', { skip: !isCI }, async () => {
      const response = await fetch(`${baseUrl}/`)
      const text = await response.text()

      expect(text).toContain('<meta name="description"')
      expect(text).toContain('<meta property="og:title"')
      expect(text).toContain('<meta property="og:description"')
      expect(text).toContain('<meta name="twitter:card"')
    })

    it(isCI ? '首页应包含结构化数据' : 'skip - 首页应包含结构化数据 (需要 CI 环境)', { skip: !isCI }, async () => {
      const response = await fetch(`${baseUrl}/`)
      const text = await response.text()

      expect(text).toContain('application/ld+json')
      expect(text).toContain('schema.org')
    })

    it(isCI ? '图片优化页面应有独立的 meta 标签' : 'skip - 图片优化页面应有独立的 meta 标签 (需要 CI 环境)', { skip: !isCI }, async () => {
      const response = await fetch(`${baseUrl}/image-optimization-demo`)
      const text = await response.text()

      expect(text).toContain('图片优化')
      expect(text).toContain('description')
    })

    it(isCI ? '页面应包含 canonical URL' : 'skip - 页面应包含 canonical URL (需要 CI 环境)', { skip: !isCI }, async () => {
      const response = await fetch(`${baseUrl}/`)
      const text = await response.text()

      expect(text).toContain('rel="canonical"')
    })
  })
})
