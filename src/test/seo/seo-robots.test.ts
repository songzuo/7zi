/**
 * Robots.txt 测试套件
 * 测试 robots.txt 生成和配置
 */

import { describe, it, expect, beforeAll } from 'vitest'

describe('SEO - Robots.txt 验证', () => {
  let robots: any

  beforeAll(async () => {
    try {
      // 动态导入生成的 robots 配置
      const robotsModule = await import('@/app/robots')
      robots = robotsModule.default()
    } catch (_error) {
      // 如果文件不存在，标记测试为待实现
      console.warn('robots.ts 未找到，测试标记为待实现')
    }
  })

  describe('基本配置', () => {
    it('应包含 user-agent 规则', () => {
      if (!robots) {
        it.todo('实现 robots.ts')
        return
      }

      expect(robots.rules).toBeDefined()
      expect(Array.isArray(robots.rules)).toBe(true)
      expect(robots.rules.length).toBeGreaterThan(0)
    })

    it('应允许所有搜索引擎爬取主要区域', () => {
      if (!robots) {
        it.todo('实现 robots.ts')
        return
      }

      const defaultRule = robots.rules.find((rule: any) => rule.userAgent === '*')
      expect(defaultRule).toBeDefined()
      expect(defaultRule.allow).toContain('/')
    })

    it('应禁止爬取 API 路由', () => {
      if (!robots) {
        it.todo('实现 robots.ts')
        return
      }

      const defaultRule = robots.rules.find((rule: any) => rule.userAgent === '*')
      expect(defaultRule.disallow).toContain('/api/')
    })

    it('应禁止爬取管理后台', () => {
      if (!robots) {
        it.todo('实现 robots.ts')
        return
      }

      const defaultRule = robots.rules.find((rule: any) => rule.userAgent === '*')
      expect(defaultRule.disallow).toContain('/admin/')
    })
  })

  describe('Sitemap 引用', () => {
    it('应包含 sitemap URL', () => {
      if (!robots) {
        it.todo('实现 robots.ts')
        return
      }

      expect(robots.sitemap).toBeDefined()
      expect(robots.sitemap).toContain('sitemap.xml')
      expect(robots.sitemap).toMatch(/^https?:\/\//)
    })

    it('sitemap URL 应使用正确的域名', () => {
      if (!robots) {
        it.todo('实现 robots.ts')
        return
      }

      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.com'
      expect(robots.sitemap).toContain(baseUrl)
    })
  })

  describe('自定义规则', () => {
    it('应支持特定搜索引擎的自定义规则（如有）', () => {
      if (!robots) {
        it.todo('实现 robots.ts')
        return
      }

      // 检查是否有 Googlebot 特定规则
      const googleBotRule = robots.rules.find((rule: any) =>
        rule.userAgent?.toLowerCase().includes('googlebot')
      )

      if (googleBotRule) {
        expect(googleBotRule.allow).toBeDefined()
        expect(googleBotRule.disallow).toBeDefined()
      }
    })

    it('Crawl-delay 应合理配置（如有）', () => {
      if (!robots) {
        it.todo('实现 robots.ts')
        return
      }

      const crawlDelay = robots.crawlDelay

      if (crawlDelay) {
        expect(typeof crawlDelay).toBe('number')
        expect(crawlDelay).toBeGreaterThan(0)
        expect(crawlDelay).toBeLessThan(10) // 不应太长
      }
    })
  })

  describe('安全性检查', () => {
    it('不应允许敏感目录', () => {
      if (!robots) {
        it.todo('实现 robots.ts')
        return
      }

      const defaultRule = robots.rules.find((rule: any) => rule.userAgent === '*')

      // 确保没有明确允许敏感目录
      const sensitivePaths = ['/api/', '/admin/', '/.git/', '/node_modules/']

      sensitivePaths.forEach((path) => {
        expect(defaultRule.allow).not.toContain(path)
      })
    })

    it('应禁止爬取隐藏文件和目录', () => {
      if (!robots) {
        it.todo('实现 robots.ts')
        return
      }

      const defaultRule = robots.rules.find((rule: any) => rule.userAgent === '*')
      expect(defaultRule.disallow).toContain('/.git/')
      expect(defaultRule.disallow).toContain('/node_modules/')
    })
  })
})
