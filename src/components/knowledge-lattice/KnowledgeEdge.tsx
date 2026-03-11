/**
 * 知识晶格边组件
 */

'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { LatticeEdge, RelationType } from '@/lib/agents/knowledge-lattice';

// 边颜色配置
export const EDGE_COLORS: Record<RelationType, string> = {
  [RelationType.PARTIAL_ORDER]: '#60A5FA',
  [RelationType.EQUIVALENCE]: '#34D399',
  [RelationType.COMPLEMENT]: '#FBBF24',
  [RelationType.ASSOCIATION]: '#A78BFA',
  [RelationType.CAUSAL]: '#F87171',
};

export interface KnowledgeEdgeProps {
  edge: LatticeEdge;
  fromPosition: [number, number, number];
  toPosition: [number, number, number];
  animated?: boolean;
}

export default function KnowledgeEdge({
  edge,
  fromPosition,
  toPosition,
  animated = false,
}: KnowledgeEdgeProps) {
  const color = EDGE_COLORS[edge.type];
  const lineWidth = 0.5 + (edge.weight * 1.5);

  const points = useMemo(() => {
    return [
      new THREE.Vector3(...fromPosition),
      new THREE.Vector3(...toPosition),
    ];
  }, [fromPosition, toPosition]);

  return (
    <line>
      <bufferGeometry attach="geometry" setFromPoints={points} />
      <lineBasicMaterial
        attach="material"
        color={color}
        linewidth={lineWidth}
        transparent
        opacity={animated ? 0.8 : 0.6}
      />
    </line>
  );
}