import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '图片优化示例 - Image Optimization Demo | 7zi',
  description: '探索 Next.js 图片优化最佳实践：WebP/AVIF 自动转换、响应式图片、懒加载、blur placeholder 等功能演示。',
  keywords: ['图片优化', 'WebP', 'AVIF', 'Next.js Image', '响应式图片', '懒加载'],
  openGraph: {
    title: '图片优化示例 - 7zi',
    description: 'Next.js 图片优化最佳实践演示，包含 WebP/AVIF、懒加载、blur placeholder 等功能。',
    type: 'website',
    images: ['/images/og-image.jpg'],
  },
}
