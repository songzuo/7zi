import { Metadata } from 'next';
import KnowledgeLattice3D from '@/components/knowledge-lattice/KnowledgeLattice3D';

export const metadata: Metadata = {
  title: '知识图谱 - 7zi Studio',
  description: '交互式3D知识图谱可视化',
};

// Sample data for the knowledge lattice
const knowledgeData = [
  {
    id: '1',
    title: 'React',
    category: '技术',
    connections: ['2', '3', '4'],
  },
  {
    id: '2',
    title: 'Three.js',
    category: '技术',
    connections: ['1', '5', '6'],
  },
  {
    id: '3',
    title: 'Next.js',
    category: '技术',
    connections: ['1', '4', '7'],
  },
  {
    id: '4',
    title: 'TypeScript',
    category: '技术',
    connections: ['1', '3', '8'],
  },
  {
    id: '5',
    title: '3D设计',
    category: '设计',
    connections: ['2', '6', '9'],
  },
  {
    id: '6',
    title: 'UI/UX',
    category: '设计',
    connections: ['2', '5', '10'],
  },
  {
    id: '7',
    title: 'SSR',
    category: '产品',
    connections: ['3', '8', '10'],
  },
  {
    id: '8',
    title: '类型安全',
    category: '产品',
    connections: ['4', '7', '9'],
  },
  {
    id: '9',
    title: '可视化',
    category: '营销',
    connections: ['5', '8', '10'],
  },
  {
    id: '10',
    title: '性能优化',
    category: '营销',
    connections: ['6', '7', '9'],
  },
];

export default function KnowledgeLatticePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
            知识图谱
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            交互式3D知识可视化 • 拖拽旋转查看
          </p>
        </div>

        {/* 3D Component */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl p-4 h-[700px]">
          <KnowledgeLattice3D data={knowledgeData} />
        </div>

        {/* Info */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-lg">
            <div className="text-3xl font-bold text-cyan-500 mb-2">10+</div>
            <div className="text-zinc-600 dark:text-zinc-400">知识节点</div>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-lg">
            <div className="text-3xl font-bold text-purple-500 mb-2">3D</div>
            <div className="text-zinc-600 dark:text-zinc-400">交互式视图</div>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-lg">
            <div className="text-3xl font-bold text-pink-500 mb-2">动态</div>
            <div className="text-zinc-600 dark:text-zinc-400">实时加载</div>
          </div>
        </div>
      </div>
    </div>
  );
}
