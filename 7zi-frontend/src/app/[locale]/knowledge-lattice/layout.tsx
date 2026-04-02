import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Knowledge Lattice - 知识图谱可视化 - 7zi Studio',
  description:
    '交互式 3D 知识图谱可视化。探索知识节点之间的连接关系，通过直观的 3D 界面理解和学习复杂的知识结构。',
  keywords: [
    '知识图谱',
    '3D 可视化',
    'Knowledge Graph',
    'Three.js',
    '知识网络',
    '知识节点',
    '7zi Studio',
  ],
  openGraph: {
    title: 'Knowledge Lattice - 知识图谱可视化 - 7zi Studio',
    description:
      '交互式 3D 知识图谱可视化。探索知识节点之间的连接关系，通过直观的 3D 界面理解和学习复杂的知识结构。',
    type: 'website',
    url: 'https://7zi.studio/knowledge-lattice',
    images: [
      {
        url: 'https://7zi.studio/images/og-knowledge-lattice.jpg',
        width: 1200,
        height: 630,
        alt: 'Knowledge Lattice 知识图谱可视化',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Knowledge Lattice - 知识图谱可视化 - 7zi Studio',
    description:
      '交互式 3D 知识图谱可视化。探索知识节点之间的连接关系，通过直观的 3D 界面理解和学习复杂的知识结构。',
    images: ['https://7zi.studio/images/og-knowledge-lattice.jpg'],
  },
}

export default function KnowledgeLatticeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
