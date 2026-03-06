import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '个人资料 - AI 团队实时看板',
  description: '查看和编辑您的个人资料信息。管理您的账户设置、偏好配置和个人信息。',
  keywords: ['个人资料', '用户设置', '账户管理', '个人信息'],
  openGraph: {
    title: '个人资料 - AI 团队实时看板',
    description: '查看和编辑您的个人资料信息',
    url: 'https://7zi.com/profile',
    images: [
      {
        url: '/og-profile.png',
        width: 1200,
        height: 630,
        alt: '个人资料',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '个人资料 - AI 团队实时看板',
    description: '查看和编辑您的个人资料信息',
    images: ['/og-profile.png'],
  },
  alternates: {
    canonical: 'https://7zi.com/profile',
  },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}