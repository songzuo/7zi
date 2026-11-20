'use client'

import dynamic from 'next/dynamic'

// Dynamically import the 3D component with SSR disabled to avoid hydration issues
const KnowledgeLatticeScene = dynamic(() => import('./KnowledgeLatticeScene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-cyan-500" />
    </div>
  ),
})

interface KnowledgeLattice3DProps {
  data?: Array<{
    id: string
    title: string
    category: string
    connections: string[]
  }>
}

export default function KnowledgeLattice3D({ data = [] }: KnowledgeLattice3DProps) {
  return (
    <div className="relative h-full min-h-[600px] w-full">
      <KnowledgeLatticeScene data={data} />
    </div>
  )
}
