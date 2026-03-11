/**
 * 智能体知识晶格 3D 可视化组件
 *
 * 使用 React Three Fiber 创建交互式 3D 晶格可视化
 */

'use client';

import React, { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { LatticeNode, LatticeEdge, KnowledgeType } from '@/lib/agents/knowledge-lattice';
import KnowledgeNode, { NODE_COLORS } from './KnowledgeNode';
import KnowledgeEdge from './KnowledgeEdge';
import { calculateLayout, LayoutType } from './layoutUtils';

// ============== 类型定义 ==============

export interface KnowledgeLattice3DProps {
  nodes: LatticeNode[];
  edges: LatticeEdge[];
  onNodeClick?: (node: LatticeNode) => void;
  onNodeHover?: (node: LatticeNode | null) => void;
  showLabels?: boolean;
  layout?: LayoutType;
}

// ============== 场景组件 ==============

interface SceneProps extends KnowledgeLattice3DProps {
  hoveredNode: LatticeNode | null;
  setHoveredNode: (node: LatticeNode | null) => void;
}

function Scene({
  nodes,
  edges,
  onNodeClick,
  onNodeHover,
  layout,
  showLabels,
  hoveredNode,
  setHoveredNode,
}: SceneProps) {
  const positions = useMemo(() => {
    return calculateLayout(nodes, edges, layout);
  }, [nodes, edges, layout]);

  const handleNodeClick = (node: LatticeNode) => {
    onNodeClick?.(node);
  };

  const handleNodeHover = (node: LatticeNode | null) => {
    setHoveredNode(node);
    onNodeHover?.(node);
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      {/* 渲染边 */}
      {edges.map((edge) => {
        const fromPos = positions.get(edge.from);
        const toPos = positions.get(edge.to);
        if (!fromPos || !toPos) return null;

        return (
          <KnowledgeEdge
            key={edge.id}
            edge={edge}
            fromPosition={fromPos}
            toPosition={toPos}
          />
        );
      })}

      {/* 渲染节点 */}
      {nodes.map((node) => {
        const position = positions.get(node.id);
        if (!position) return null;

        return (
          <KnowledgeNode
            key={node.id}
            node={node}
            position={position}
            onClick={handleNodeClick}
            onHover={handleNodeHover}
            isHovered={hoveredNode?.id === node.id}
            showLabel={showLabels}
          />
        );
      })}

      <OrbitControls enableDamping dampingFactor={0.05} />
    </>
  );
}

// ============== 主组件 ==============

export default function KnowledgeLattice3D({
  nodes,
  edges,
  onNodeClick,
  onNodeHover,
  showLabels = true,
  layout = 'force',
}: KnowledgeLattice3DProps) {
  const [hoveredNode, setHoveredNode] = useState<LatticeNode | null>(null);

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 0, 30], fov: 60 }}
        style={{ background: '#0f172a' }}
      >
        <Scene
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          onNodeHover={onNodeHover}
          layout={layout}
          showLabels={showLabels}
          hoveredNode={hoveredNode}
          setHoveredNode={setHoveredNode}
        />
      </Canvas>

      {/* 图例 */}
      <Legend />
    </div>
  );
}

// ============== 图例组件 ==============

function Legend() {
  return (
    <div className="absolute bottom-4 left-4 bg-slate-900/90 p-4 rounded-lg text-white text-sm">
      <h3 className="font-bold mb-2">节点类型</h3>
      {Object.entries(NODE_COLORS).map(([type, color]) => (
        <div key={type} className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span>{type}</span>
        </div>
      ))}
    </div>
  );
}

// Re-export for convenience
export { NODE_COLORS };