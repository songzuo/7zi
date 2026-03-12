/**
 * 知识晶格布局计算工具
 */

import { LatticeNode, LatticeEdge, KnowledgeType } from '@/lib/agents/knowledge-lattice';
import { calculateForceLayout } from './forceLayout';

export type LayoutType = 'force' | 'circular' | 'hierarchical';

/**
 * 计算节点布局位置
 */
export function calculateLayout(
  nodes: LatticeNode[],
  edges: LatticeEdge[],
  layout: LayoutType = 'force'
): Map<string, [number, number, number]> {
  const positions = new Map<string, [number, number, number]>();

  if (layout === 'circular') {
    calculateCircularLayout(nodes, positions);
  } else if (layout === 'hierarchical') {
    calculateHierarchicalLayout(nodes, positions);
  } else {
    calculateForceLayout(nodes, edges, positions);
  }

  return positions;
}

/**
 * 圆形布局
 */
function calculateCircularLayout(
  nodes: LatticeNode[],
  positions: Map<string, [number, number, number]>
): void {
  const radius = 10;
  nodes.forEach((node, index) => {
    const angle = (2 * Math.PI * index) / nodes.length;
    positions.set(node.id, [
      radius * Math.cos(angle),
      (Math.random() - 0.5) * 2,
      radius * Math.sin(angle),
    ]);
  });
}

/**
 * 层级布局 - 按知识类型分层
 */
function calculateHierarchicalLayout(
  nodes: LatticeNode[],
  positions: Map<string, [number, number, number]>
): void {
  const layers: Record<KnowledgeType, LatticeNode[]> = {
    [KnowledgeType.CONCEPT]: [],
    [KnowledgeType.RULE]: [],
    [KnowledgeType.EXPERIENCE]: [],
    [KnowledgeType.SKILL]: [],
    [KnowledgeType.FACT]: [],
    [KnowledgeType.PREFERENCE]: [],
    [KnowledgeType.MEMORY]: [],
  };

  nodes.forEach(node => {
    layers[node.type].push(node);
  });

  let yOffset = 10;
  const layerTypes = Object.values(KnowledgeType);
  layerTypes.forEach(type => {
    const layerNodes = layers[type];
    const layerWidth = layerNodes.length * 2;
    const layerStart = -layerWidth / 2;

    layerNodes.forEach((node, index) => {
      positions.set(node.id, [
        layerStart + index * 2,
        yOffset,
        (Math.random() - 0.5) * 2,
      ]);
    });

    yOffset -= 4;
  });
}