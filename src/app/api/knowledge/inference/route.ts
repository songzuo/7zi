import { NextRequest, NextResponse } from 'next/server';
import { getKnowledgeStore } from '@/lib/store/knowledge-store';
import { apiLogger } from '@/lib/logger';

/**
 * POST /api/knowledge/inference
 * 执行推理
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const store = getKnowledgeStore();

    // 验证必需字段
    if (!body.startNodeId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: startNodeId' },
        { status: 400 }
      );
    }

    const startNode = store.getNode(body.startNodeId);
    if (!startNode) {
      return NextResponse.json(
        { success: false, error: 'Start node not found' },
        { status: 404 }
      );
    }

    // 执行推理（基于图遍历）
    const maxDepth = body.maxDepth || 3;
    
    // 收集相关节点
    const relevantNodes = new Set<typeof startNode>();
    const visited = new Set<string>([body.startNodeId]);
    const queue: { id: string; depth: number }[] = [{ id: body.startNodeId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;

      // 获取相邻节点
      const adjacentEdges = store.getAdjacentEdges(id);
      for (const edge of adjacentEdges) {
        const neighborId = edge.from === id ? edge.to : edge.from;
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          const neighbor = store.getNode(neighborId);
          if (neighbor) {
            relevantNodes.add(neighbor);
            queue.push({ id: neighborId, depth: depth + 1 });
          }
        }
      }
    }

    if (relevantNodes.size === 0) {
      return NextResponse.json(
        { success: false, error: 'No relevant nodes found for inference' },
        { status: 404 }
      );
    }

    // 简单推理：基于相关节点的权重和可信度
    const supportingNodes = Array.from(relevantNodes)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    const avgConfidence = supportingNodes.length > 0
      ? supportingNodes.reduce((sum, n) => sum + n.confidence, 0) / supportingNodes.length
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        conclusion: `Based on ${supportingNodes.length} related knowledge items`,
        confidence: avgConfidence,
        path: Array.from(visited),
        relatedNodes: supportingNodes,
      },
    });
  } catch (error) {
    apiLogger.error('Error performing inference', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to perform inference' },
      { status: 500 }
    );
  }
}
