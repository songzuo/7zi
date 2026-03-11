/**
 * 知识晶格布局计算工具
 */

import { LatticeNode, LatticeEdge, KnowledgeType } from '@/lib/agents/knowledge-lattice';

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

/**
 * 力导向布局（简化版）
 */
function calculateForceLayout(
  nodes: LatticeNode[],
  edges: LatticeEdge[],
  positions: Map<string, [number, number, number]>
): void {
  const forceIterations = 100;
  const repulsion = 5;
  const attraction = 0.1;

  // 初始随机位置
  nodes.forEach(node => {
    positions.set(node.id, [
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
    ]);
  });

  // 迭代计算
  for (let i = 0; i < forceIterations; i++) {
    const forces = new Map<string, [number, number, number]>();
    nodes.forEach(node => {
      forces.set(node.id, [0, 0, 0]);
    });

    // 斥力
    applyRepulsion(nodes, positions, forces, repulsion);

    // 引力（边）
    applyAttraction(edges, positions, forces, attraction);

    // 应用力
    applyForces(positions, forces);
  }
}

/**
 * 应用斥力
 */
function applyRepulsion(
  nodes: LatticeNode[],
  positions: Map<string, [number, number, number]>,
  forces: Map<string, [number, number, number]>,
  repulsion: number
): void {
  nodes.forEach((node1, idx1) => {
    nodes.forEach((node2, idx2) => {
      if (idx1 >= idx2) return;

      const pos1 = positions.get(node1.id)!;
      const pos2 = positions.get(node2.id)!;

      const dx = pos1[0] - pos2[0];
      const dy = pos1[1] - pos2[1];
      const dz = pos1[2] - pos2[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

      const force = repulsion / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const fz = (dz / dist) * force;

      const f1 = forces.get(node1.id)!;
      const f2 = forces.get(node2.id)!;

      forces.set(node1.id, [f1[0] + fx, f1[1] + fy, f1[2] + fz]);
      forces.set(node2.id, [f2[0] - fx, f2[1] - fy, f2[2] - fz]);
    });
  });
}

/**
 * 应用引力（边）
 */
function applyAttraction(
  edges: LatticeEdge[],
  positions: Map<string, [number, number, number]>,
  forces: Map<string, [number, number, number]>,
  attraction: number
): void {
  edges.forEach(edge => {
    const pos1 = positions.get(edge.from);
    const pos2 = positions.get(edge.to);
    if (!pos1 || !pos2) return;

    const dx = pos2[0] - pos1[0];
    const dy = pos2[1] - pos1[1];
    const dz = pos2[2] - pos1[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

    const force = attraction * dist;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    const fz = (dz / dist) * force;

    const f1 = forces.get(edge.from);
    const f2 = forces.get(edge.to);
    if (!f1 || !f2) return;

    forces.set(edge.from, [f1[0] + fx, f1[1] + fy, f1[2] + fz]);
    forces.set(edge.to, [f2[0] - fx, f2[1] - fy, f2[2] - fz]);
  });
}

/**
 * 应用力到位置
 */
function applyForces(
  positions: Map<string, [number, number, number]>,
  forces: Map<string, [number, number, number]>
): void {
  forces.forEach((force, nodeId) => {
    const pos = positions.get(nodeId);
    if (!pos) return;
    
    positions.set(nodeId, [
      pos[0] + force[0],
      pos[1] + force[1],
      pos[2] + force[2],
    ]);
  });
}