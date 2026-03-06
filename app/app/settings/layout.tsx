import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '设置 - AI 团队实时看板',
  description: '自定义您的 AI 团队看板体验。主题切换、显示设置、通知偏好等个性化配置。',
  keywords: ['设置', '主题', '偏好', '配置', '个性化'],
  openGraph: {
    title: '设置 - AI 团队实时看板',
    description: '自定义您的 AI 团队看板体验',
    url: 'https://7zi.com/settings',
    images: [
      {
        url: '/og-settings.png',
        width: 1200,
        height: 630,
        alt: '设置页面',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '设置 - AI 团队实时看板',
    description: '自定义您的 AI 团队看板体验',
    images: ['/og-settings.png'],
  },
  alternates: {
    canonical: 'https://7zi.com/settings',
  },
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}