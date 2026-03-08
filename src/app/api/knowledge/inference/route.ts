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
 * POST /api/knowledge/inference
 * 执行推理
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const lattice = getLattice();

    // 验证必需字段
    if (!body.startNodeId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: startNodeId' },
        { status: 400 }
      );
    }

    // 执行推理
    const maxDepth = body.maxDepth || 3;
    const result = lattice.infer(body.startNodeId, maxDepth);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Inference failed or no relevant nodes found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error performing inference:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform inference' },
      { status: 500 }
    );
  }
}