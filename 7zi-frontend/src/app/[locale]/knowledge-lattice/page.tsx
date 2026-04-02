'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

/**
 * Dynamic import of KnowledgeLattice3D component
 * This ensures Three.js (~38MB) is only loaded when this page is visited
 * SSR disabled because Three.js requires window/DOM APIs
 */
const KnowledgeLattice3D = dynamic(
  () =>
    import('@/components/knowledge-lattice/KnowledgeLattice3D').then(mod => mod.KnowledgeLattice3D),
  {
    ssr: false,
    loading: () => <KnowledgeLatticeFallback />,
  }
)

/**
 * Fallback component shown while Three.js is loading
 */
function KnowledgeLatticeFallback() {
  return (
    <div className="flex h-full min-h-[600px] w-full flex-col items-center justify-center bg-zinc-900">
      <div className="relative">
        {/* Animated loader */}
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500" />
      </div>
      <div className="mt-6 text-sm text-zinc-400">Loading 3D visualization...</div>
      <div className="mt-2 text-xs text-zinc-600">Initializing Three.js renderer</div>
    </div>
  )
}

export default function KnowledgeLatticePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <h1 className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-2xl font-bold text-transparent">
          Knowledge Lattice
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Interactive 3D visualization of knowledge connections
        </p>
      </header>

      {/* 3D Visualization Container */}
      <div className="relative h-[calc(100vh-80px)] w-full">
        <Suspense fallback={<KnowledgeLatticeFallback />}>
          <KnowledgeLattice3D />
        </Suspense>

        {/* Controls overlay */}
        <div className="absolute top-4 right-4 rounded-lg border border-zinc-800 bg-zinc-900/80 p-4 backdrop-blur-sm">
          <h2 className="mb-3 text-sm font-semibold text-zinc-400">Controls</h2>
          <ul className="space-y-1 text-xs text-zinc-500">
            <li>• Drag to rotate</li>
            <li>• Scroll to zoom</li>
            <li>• Click nodes for details</li>
          </ul>
        </div>

        {/* Stats overlay */}
        <div className="absolute bottom-4 left-4 rounded-lg border border-zinc-800 bg-zinc-900/80 p-3 backdrop-blur-sm">
          <div className="text-xs text-zinc-500">
            <span className="text-zinc-400">Nodes:</span> 20
          </div>
          <div className="text-xs text-zinc-500">
            <span className="text-zinc-400">Connections:</span> 47
          </div>
        </div>
      </div>
    </main>
  )
}
