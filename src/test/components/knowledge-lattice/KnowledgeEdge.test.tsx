/**
 * KnowledgeEdge 组件测试
 */

import { describe, it, expect, vi } from 'vitest';
import { LatticeEdge, RelationType } from '@/lib/agents/knowledge-lattice';

// Mock react-three-fiber
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}));

describe('KnowledgeEdge', () => {
  it('should export EDGE_COLORS', async () => {
    const { EDGE_COLORS } = await import('@/components/knowledge-lattice/KnowledgeEdge');
    expect(EDGE_COLORS).toBeDefined();
    expect(EDGE_COLORS[RelationType.PARTIAL_ORDER]).toBe('#60A5FA');
    expect(EDGE_COLORS[RelationType.EQUIVALENCE]).toBe('#34D399');
    expect(EDGE_COLORS[RelationType.CAUSAL]).toBe('#F87171');
  });
});