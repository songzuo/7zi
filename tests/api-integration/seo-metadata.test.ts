/**
 * SEO Metadata 测试
 *
 * 验证页面元标签和结构化数据的正确性
 *
 * @date 2026-03-28
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

describe('SEO Metadata Tests', () => {
  const layoutPath = path.join(process.cwd(), 'src/app/layout.tsx')
  const layoutContent = readFileSync(layoutPath, 'utf-8')

  describe('Root Layout Metadata', () => {
    it('should have metadata export', () => {
      // 验证 metadata 导出存在
      expect(layoutContent).toContain('export const metadata')
    })

    it('should have required meta tags configured', () => {
      // title 验证
      expect(layoutContent).toContain('title:')
      expect(layoutContent).toContain('7zi Frontend')

      // description 验证
      expect(layoutContent).toContain('description:')

      // keywords 验证
      expect(layoutContent).toContain('keywords:')
    })

    it('should have OpenGraph configuration', () => {
      // OpenGraph 验证 - Next.js Metadata API 使用 openGraph 对象
      // 运行时 HTML 会自动添加 og: 前缀
      expect(layoutContent).toContain('openGraph: {')
      expect(layoutContent).toContain("title: '7zi Frontend")
      expect(layoutContent).toContain('description:')
      expect(layoutContent).toContain('images:')
    })

    it('should have Twitter card configuration', () => {
      // Twitter Card 验证
      expect(layoutContent).toContain('twitter:')
      expect(layoutContent).toContain('summary_large_image')
    })

    it('should have image optimization configuration', () => {
      // 验证图片优化相关配置存在
      // 真实契约：src/app/layout.tsx 已不再使用 next/image 的 <Image> 组件，
      // 而是通过 Next.js Metadata API 的 images 字段配置 OG / Twitter 图片（第 64、78 行）。
      expect(layoutContent).toContain('images:')
      expect(layoutContent).toContain('og-image')
      expect(layoutContent).toContain('summary_large_image')
      expect(layoutContent).toContain('width: 1200')
      expect(layoutContent).toContain('height: 630')
    })
  })

  describe('i18n Language Configuration', () => {
    it('should have correct html lang attribute', () => {
      expect(layoutContent).toContain('lang=')
      expect(layoutContent).toContain('zh-CN')
    })

    it('should have suppressHydrationWarning for i18n', () => {
      expect(layoutContent).toContain('suppressHydrationWarning')
    })
  })

  describe('Image Optimization', () => {
    it('should have preconnect for image CDN', () => {
      expect(layoutContent).toContain('preconnect')
      expect(layoutContent).toContain('images.unsplash.com')
    })

    it('should have dns-prefetch for performance', () => {
      expect(layoutContent).toContain('dns-prefetch')
    })
  })
})
