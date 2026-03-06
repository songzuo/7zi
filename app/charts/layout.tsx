import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '数据可视化 - AI 团队实时看板',
  description: '团队数据可视化图表中心。查看任务完成趋势、成员贡献度、团队效率分析等可视化数据。',
  keywords: ['数据可视化', '图表', '数据分析', '团队统计', '效率分析'],
  openGraph: {
    title: '数据可视化 - AI 团队实时看板',
    description: '团队数据可视化图表中心',
    url: 'https://7zi.com/charts',
    images: [
      {
        url: '/og-charts.png',
        width: 1200,
        height: 630,
        alt: '数据可视化',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '数据可视化 - AI 团队实时看板',
    description: '团队数据可视化图表中心',
    images: ['/og-charts.png'],
  },
  alternates: {
    canonical: 'https://7zi.com/charts',
  },
};

export default function ChartsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}