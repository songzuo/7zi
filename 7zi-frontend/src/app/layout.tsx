/**
 * 根布局文件 - 包含图片优化配置和主题管理
 */

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/shared/context/ThemeContext'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: '7zi Frontend - 图片优化示例',
  description: 'Next.js 图片优化最佳实践展示',
  keywords: ['Next.js', 'Image Optimization', 'WebP', 'AVIF', 'Performance'],
  openGraph: {
    title: '7zi Frontend - 图片优化示例',
    description: 'Next.js 图片优化最佳实践展示',
    images: ['/images/og-image.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/images/twitter-image.jpg'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 预连接到图片 CDN */}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
