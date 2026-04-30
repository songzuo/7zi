import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '发现 | 7zi Platform',
  description: '探索 7zi 平台的精彩功能，发现推荐内容、热门功能和最新动态。',
  keywords: ['发现', '推荐', '功能', '7zi'],
  openGraph: {
    title: '发现 | 7zi Platform',
    description: '探索 7zi 平台的精彩功能',
  },
}

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return children
}
