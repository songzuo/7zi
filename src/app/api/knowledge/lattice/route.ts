import { NextRequest, NextResponse } from 'next/server';
import { KnowledgeLattice } from '@/lib/agents/knowledge-lattice';

// 创建全局知识晶格实例
let latticeInstance: KnowledgeLattice | null = null;

function getLattice(): KnowledgeLattice {
  if (!latticeInstance) {
    latticeInstance = new KnowledgeLattice();
  }
  return latticeInstance;
}

/**
 * GET /api/knowledge/lattice
 * 获取完整晶格结构
 */
export async function GET(request: NextRequest) {
  try {
    const lattice = getLattice();

    const searchParams = request.nextUrl.searchParams;
    const includeNeighbors = searchParams.get('includeNeighbors') === 'true';
    const includeStats = searchParams.get('includeStats') === 'true';

    const nodes = lattice.getAllNodes();
    const edges = lattice.getAllEdges();

    const result: {
      success: true;
      data: {
        nodes: typeof nodes;
        edges: typeof edges;
        stats?: ReturnType<typeof lattice.getStats>;
      };
    } = {
      success: true,
      data: {
        nodes,
        edges,
      },
    };

    // 包含统计信息
    if (includeStats) {
      result.data.stats = lattice.getStats();
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching lattice:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lattice' },
      { status: 500 }
    );
  }
}