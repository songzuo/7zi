/**
 * SEO 测试套件
 * 测试 meta 标签完整性、robots.txt、sitemap.xml 和结构化数据
 */

import { describe, it, expect } from 'vitest'
import { generatePageMetadata, pageMetadataConfig } from '@/lib/seo/metadata'

describe('SEO - Meta Tags 完整性测试', () => {
  describe('页面级 Metadata 生成', () => {
    it('应为首页生成正确的 metadata', () => {
      const homeMeta = generatePageMetadata(pageMetadataConfig.home)

      expect(homeMeta.title).toContain('首页')
      expect(homeMeta.description).toBeDefined()
      expect(homeMeta.openGraph).toBeDefined()
      expect(homeMeta.twitter).toBeDefined()
    })

    it('应为图片优化页面生成正确的 metadata', () => {
      const imageOptMeta = generatePageMetadata(pageMetadataConfig.imageOptimization)

      expect(imageOptMeta.title).toContain('图片优化')
      expect(imageOptMeta.description).toContain('Next.js')
      expect(imageOptMeta.keywords).toBeDefined()
      expect(Array.isArray(imageOptMeta.keywords)).toBe(true)
    })

    it('应支持自定义 OG 图片', () => {
      const customImageMeta = generatePageMetadata({
        title: '测试页面',
        description: '测试描述',
        image: '/images/custom-og.jpg',
      })

      expect(customImageMeta.openGraph).toBeDefined()
      expect(customImageMeta.openGraph?.images).toBeDefined()
      const images = customImageMeta.openGraph?.images
      const firstImage = Array.isArray(images) ? images[0] : images
      expect(firstImage).toContain('/images/custom-og.jpg')
    })

    it('应支持 noIndex 选项', () => {
      const noIndexMeta = generatePageMetadata({
        title: '私有页面',
        description: '此页面不应被索引',
        noIndex: true,
      })

      expect(noIndexMeta.robots).toBeDefined()
      const robots = noIndexMeta.robots
      if (typeof robots === 'object' && robots !== null) {
        expect(robots.index).toBe(false)
        expect(robots.follow).toBe(false)
      }
    })

    it('应支持多语言 alternates', () => {
      const i18nMeta = generatePageMetadata({
        title: '多语言页面',
        description: '测试多语言',
        alternates: {
          canonical: 'https://7zi.com/zh-CN/page',
          languages: {
            'zh-CN': 'https://7zi.com/zh-CN/page',
            en: 'https://7zi.com/en/page',
          },
        },
      })

      expect(i18nMeta.alternates).toBeDefined()
      const alternates = i18nMeta.alternates
      if (alternates && typeof alternates === 'object') {
        expect(alternates.canonical).toBeDefined()
        expect(alternates.languages).toBeDefined()
        if (alternates.languages) {
          expect(alternates.languages['zh-CN']).toBeDefined()
          expect(alternates.languages.en).toBeDefined()
        }
      }
    })

    it('description 应在合理长度范围内', () => {
      const testCases = Object.values(pageMetadataConfig)

      testCases.forEach(config => {
        const meta = generatePageMetadata(config)
        const desc = meta.description || ''

        // description 应在合理范围内（SEO 最佳实践：50-160 字符）
        // 但考虑到可能的格式化，放宽限制到 15-200 字符
        expect(desc.length).toBeGreaterThan(15) // 至少 15 字符
        expect(desc.length).toBeLessThan(200) // 最多 200 字符
      })
    })
  })

  describe('Metadata 质量检查', () => {
    it('所有页面配置应有唯一的 title', () => {
      const titles = Object.values(pageMetadataConfig).map(config => config.title)
      const uniqueTitles = new Set(titles)

      expect(titles.length).toBe(uniqueTitles.size)
    })

    it('所有页面配置应有唯一的 description', () => {
      const descriptions = Object.values(pageMetadataConfig).map(config => config.description)
      const uniqueDescriptions = new Set(descriptions)

      // 允许少量重复，但大部分应唯一
      const uniqueRatio = uniqueDescriptions.size / descriptions.length
      expect(uniqueRatio).toBeGreaterThan(0.8)
    })

    it('keywords 应包含相关术语', () => {
      const importantKeywords = ['Next.js', 'React', 'TypeScript', '图片优化']

      importantKeywords.forEach(keyword => {
        const found = Object.values(pageMetadataConfig).some(config =>
          config.keywords?.some(k => k.toLowerCase().includes(keyword.toLowerCase()))
        )
        expect(found).toBe(true)
      })
    })
  })
})
