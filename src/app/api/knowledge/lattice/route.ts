import { NextRequest, NextResponse } from 'next/server';
import { getKnowledgeStore } from '@/lib/store/knowledge-store';
import { apiLogger } from '@/lib/logger';

/**
 * GET /api/knowledge/lattice
 * 获取完整晶格结构
 */
export async function GET(request: NextRequest) {
  try {
    const store = getKnowledgeStore();

    const searchParams = request.nextUrl.searchParams;
    const includeNeighbors = searchParams.get('includeNeighbors') === 'true';
    const includeStats = searchParams.get('includeStats') === 'true';

    const nodes = store.getAllNodes();
    const edges = store.getAllEdges();

    const result: {
      success: true;
      data: {
        nodes: typeof nodes;
        edges: typeof edges;
        stats?: ReturnType<typeof store.getStats>;
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
      result.data.stats = store.getStats();
    }

    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error('Error fetching lattice:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lattice' },
      { status: 500 }
    );
  }
}
