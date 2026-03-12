/**
 * 力导向布局计算
 */

import { LatticeNode, LatticeEdge } from '@/lib/agents/knowledge-lattice';

/**
 * 力导向布局参数
 */
interface ForceLayoutParams {
  iterations: number;
  repulsion: number;
  attraction: number;
}

const DEFAULT_PARAMS: ForceLayoutParams = {
  iterations: 100,
  repulsion: 5,
  attraction: 0.1,
};

/**
 * 力导向布局计算
 */
export function calculateForceLayout(
  nodes: LatticeNode[],
  edges: LatticeEdge[],
  positions: Map<string, [number, number, number]>,
  params: Partial<ForceLayoutParams> = {}
): void {
  const { iterations, repulsion, attraction } = { ...DEFAULT_PARAMS, ...params };

  // 初始随机位置
  nodes.forEach(node => {
    positions.set(node.id, [
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
    ]);
  });

  // 迭代计算
  for (let i = 0; i < iterations; i++) {
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