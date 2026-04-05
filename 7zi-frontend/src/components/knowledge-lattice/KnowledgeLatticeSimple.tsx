'use client'

import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

interface KnowledgeLatticeSimpleProps {
  nodes?: Array<{ id: string; label: string; connections: string[] }>
}

/**
 * Knowledge Lattice Simple View (Mobile Fallback)
 * Lightweight 2D visualization for mobile devices
 * Avoids loading Three.js (~600KB) on mobile
 */
export function KnowledgeLatticeSimple({ nodes = [] }: KnowledgeLatticeSimpleProps) {
  'use memo'

  const displayNodes = nodes.length > 0 ? nodes : generateSampleNodes()

  return (
    <Card className="p-6 h-full min-h-[400px] w-full bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Knowledge Graph</h3>
          <span className="text-sm text-slate-400">{displayNodes.length} nodes</span>
        </div>

        {/* 2D Grid Visualization */}
        <div className="grid grid-cols-5 gap-2">
          {displayNodes.map((node, index) => (
            <div
              key={node.id}
              className="aspect-square rounded-full flex items-center justify-center text-xs font-medium transition-all hover:scale-110 cursor-pointer"
              style={{
                backgroundColor: `hsl(${(index * 36) % 360}, 70%, 50%)`,
                animationDelay: `${index * 50}ms`,
              }}
              title={node.label}
            >
              {index + 1}
            </div>
          ))}
        </div>

        {/* Node List */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {displayNodes.slice(0, 10).map((node, index) => (
            <div
              key={node.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: `hsl(${(index * 36) % 360}, 70%, 50%)` }}
              >
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{node.label}</p>
                <p className="text-xs text-slate-400">
                  {node.connections.length} connection{node.connections.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          ))}
        </div>

        {displayNodes.length > 10 && (
          <p className="text-center text-sm text-slate-400">
            +{displayNodes.length - 10} more nodes
          </p>
        )}
      </div>
    </Card>
  )
}

/**
 * Loading skeleton for Knowledge Lattice
 */
export function KnowledgeLatticeSkeleton() {
  return (
    <Card className="p-6 h-full min-h-[400px] w-full">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 20 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-full" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function generateSampleNodes() {
  const nodes = []
  for (let i = 0; i < 20; i++) {
    nodes.push({
      id: `node-${i}`,
      label: `Node ${i + 1}`,
      connections: [i + 1, i + 5, i + 10].filter(n => n < 20 && n !== i),
    })
  }
  return nodes
}