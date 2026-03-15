/**
 * 知识推理 API
 * 基于知识图谱进行推理，发现节点间隐含关系
 * 
 * @module api/knowledge/inference
 * @description 执行图遍历推理，从起始节点出发发现相关知识和推断结论
 * 
 * @example
 * // 请求示例
 * POST /api/knowledge/inference
 * {
 *   "startNodeId": "node-001",
 *   "maxDepth": 3
 * }
 * 
 * // 响应示例
 * {
 *   "success": true,
 *   "data": {
 *     "conclusion": "Based on 5 related knowledge items",
 *     "confidence": 0.85,
 *     "path": ["node-001", "node-002", "node-003"],
 *     "relatedNodes": [...]
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getKnowledgeStore } from '@/lib/store/knowledge-store';
import { apiLogger } from '@/lib/logger';

/**
 * 推理请求参数
 * @typedef {Object} InferenceRequest
 * @property {string} startNodeId - 起始节点 ID（必填）
 * @property {number} [maxDepth=3] - 推理深度，最大遍历层数
 */

/**
 * 推理响应数据
 * @typedef {Object} InferenceData
 * @property {string} conclusion - 推理结论描述
 * @property {number} confidence - 置信度 (0-1)
 * @property {string[]} path - 遍历路径（节点 ID 列表）
 * @property {Object[]} relatedNodes - 相关节点列表（按置信度排序，最多5个）
 */

/**
 * POST /api/knowledge/inference
 * 执行基于图遍历的知识推理
 * 
 * @param {NextRequest} request - 请求对象
 * @returns {Promise<NextResponse>} 推理结果
 * 
 * @throws {400} 缺少 startNodeId 参数
 * @throws {404} 起始节点不存在
 * @throws {404} 未找到相关节点
 * @throws {500} 服务器内部错误
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
