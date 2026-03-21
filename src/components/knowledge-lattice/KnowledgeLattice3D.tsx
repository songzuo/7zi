'use client';

import dynamic from 'next/dynamic';

// Dynamically import the 3D component with SSR disabled to avoid hydration issues
const KnowledgeLatticeScene = dynamic(
  () => import('./KnowledgeLatticeScene'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" />
      </div>
    ),
  }
);

interface KnowledgeLattice3DProps {
  data?: Array<{
    id: string;
    title: string;
    category: string;
    connections: string[];
  }>;
}

export default function KnowledgeLattice3D({ data = [] }: KnowledgeLattice3DProps) {
  return (
    <div className="w-full h-full min-h-[600px] relative">
      <KnowledgeLatticeScene data={data} />
    </div>
  );
}
