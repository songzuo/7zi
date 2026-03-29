'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

/**
 * Dynamic import of KnowledgeLattice3D component
 * This ensures Three.js (~38MB) is only loaded when this page is visited
 * SSR disabled because Three.js requires window/DOM APIs
 */
const KnowledgeLattice3D = dynamic(
  () => import('@/components/knowledge-lattice/KnowledgeLattice3D').then(mod => mod.KnowledgeLattice3D),
  {
    ssr: false,
    loading: () => <KnowledgeLatticeFallback />
  }
);

/**
 * Fallback component shown while Three.js is loading
 */
function KnowledgeLatticeFallback() {
  return (
    <div className="w-full h-full min-h-[600px] flex flex-col items-center justify-center bg-zinc-900">
      <div className="relative">
        {/* Animated loader */}
        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
      <div className="mt-6 text-zinc-400 text-sm">
        Loading 3D visualization...
      </div>
      <div className="mt-2 text-zinc-600 text-xs">
        Initializing Three.js renderer
      </div>
    </div>
  );
}

export default function KnowledgeLatticePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="px-6 py-4 border-b border-zinc-800">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Knowledge Lattice
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Interactive 3D visualization of knowledge connections
        </p>
      </header>

      {/* 3D Visualization Container */}
      <div className="relative w-full h-[calc(100vh-80px)]">
        <Suspense fallback={<KnowledgeLatticeFallback />}>
          <KnowledgeLattice3D />
        </Suspense>

        {/* Controls overlay */}
        <div className="absolute top-4 right-4 bg-zinc-900/80 backdrop-blur-sm rounded-lg p-4 border border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-400 mb-3">Controls</h2>
          <ul className="text-xs text-zinc-500 space-y-1">
            <li>• Drag to rotate</li>
            <li>• Scroll to zoom</li>
            <li>• Click nodes for details</li>
          </ul>
        </div>

        {/* Stats overlay */}
        <div className="absolute bottom-4 left-4 bg-zinc-900/80 backdrop-blur-sm rounded-lg p-3 border border-zinc-800">
          <div className="text-xs text-zinc-500">
            <span className="text-zinc-400">Nodes:</span> 20
          </div>
          <div className="text-xs text-zinc-500">
            <span className="text-zinc-400">Connections:</span> 47
          </div>
        </div>
      </div>
    </main>
  );
}
