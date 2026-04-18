/**
 * PWA Manifest 生成器
 * Next.js 15+ Metadata API
 * v1.13.0: 增强移动端支持
 */

import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.com'

  return {
    name: '7zi Frontend - 智能体协作平台',
    short_name: '7zi',
    description: 'Next.js 最佳实践演示项目 - 智能体协作平台',
    start_url: '/',
    display: 'standalone',
    display_override: ['fullscreen', 'standalone'],
    background_color: '#ffffff',
    theme_color: '#667eea',
    orientation: 'portrait-primary',
    scope: '/',
    prefer_related_applications: false,
    // iOS 相关配置
    icons: [
      {
        src: '/icons/icon-72x72.png',
        sizes: '72x72',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-128x128.png',
        sizes: '128x128',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-144x144.png',
        sizes: '144x144',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-152x152.png',
        sizes: '152x152',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-384x384.png',
        sizes: '384x384',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['developer', 'productivity', 'business'],
    // 快捷方式
    shortcuts: [
      {
        name: '控制台',
        short_name: '控制台',
        description: '打开仪表盘',
        url: '/dashboard',
        icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' }],
      },
      {
        name: '房间',
        short_name: '房间',
        description: '查看房间列表',
        url: '/rooms',
        icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' }],
      },
      {
        name: '设置',
        short_name: '设置',
        description: '打开设置',
        url: '/settings',
        icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' }],
      },
    ],
    // 截图
    screenshots: [
      {
        src: '/screenshots/desktop-1.png',
        sizes: '1280x720',
        type: 'image/png',
        label: '桌面端视图',
        form_factor: 'wide',
      },
      {
        src: '/screenshots/mobile-1.png',
        sizes: '750x1334',
        type: 'image/png',
        label: '移动端视图',
        form_factor: 'narrow',
      },
    ],
    // 关联的 Web 应用
    related_applications: [],
  }
}
