import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '任务列表 - AI 团队实时看板',
  description: '管理和追踪 AI 团队任务。支持任务创建、分配、状态更新和进度追踪。与 GitHub Issues 深度集成，实时同步任务状态。',
  keywords: ['任务管理', '任务列表', '任务追踪', '团队任务', 'GitHub集成', '任务分配'],
  openGraph: {
    title: '任务列表 - AI 团队实时看板',
    description: '管理和追踪 AI 团队任务，支持 GitHub 集成',
    url: 'https://7zi.com/tasks',
    images: [
      {
        url: '/og-tasks.png',
        width: 1200,
        height: 630,
        alt: 'AI 团队任务列表',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '任务列表 - AI 团队实时看板',
    description: '管理和追踪 AI 团队任务，支持 GitHub 集成',
    images: ['/og-tasks.png'],
  },
  alternates: {
    canonical: 'https://7zi.com/tasks',
  },
};

export default function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}