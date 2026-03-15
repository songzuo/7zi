import { NextRequest, NextResponse } from 'next/server';
import { getKnowledgeStore } from '@/lib/store/knowledge-store';
import { apiLogger } from '@/lib/logger';

/**
 * GET /api/knowledge/nodes/[id]
 * 获取单个节点详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const store = getKnowledgeStore();

    const node = store.getNode(id);

    if (!node) {
      return NextResponse.json(
        { success: false, error: 'Node not found' },
        { status: 404 }
      );
    }

    // 获取相关边
    const edges = store.getAdjacentEdges(id);

    // 获取邻居节点
    const neighborIds = edges.flatMap(e =>
      e.from === id ? [e.to] : [e.from]
    );
    const neighbors = neighborIds
      .map(nid => store.getNode(nid))
      .filter(n => n !== undefined);

    return NextResponse.json({
      success: true,
      data: node,
      edges,
      neighbors,
    });
  } catch (error) {
    apiLogger.error('Error fetching node', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch node' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/knowledge/nodes/[id]
 * 更新节点
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const store = getKnowledgeStore();

    const updatedNode = store.updateNode(id, body);

    if (!updatedNode) {
      return NextResponse.json(
        { success: false, error: 'Node not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedNode,
    });
  } catch (error) {
    apiLogger.error('Error updating node', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to update node' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/knowledge/nodes/[id]
 * 删除节点
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const store = getKnowledgeStore();

    const deleted = store.deleteNode(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Node not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Node deleted successfully',
    });
  } catch (error) {
    apiLogger.error('Error deleting node', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to delete node' },
      { status: 500 }
    );
  }
}
