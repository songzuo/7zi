/**
 * 知识晶格 API
 * 获取完整的知识图谱结构
 * 
 * @module api/knowledge/lattice
 * @description 返回知识晶格中所有节点和边，支持统计信息
 * 
 * @example
 * // 基础请求
 * GET /api/knowledge/lattice
 * 
 * // 包含统计信息
 * GET /api/knowledge/lattice?includeStats=true
 * 
 * // 响应示例
 * {
 *   "success": true,
 *   "data": {
 *     "nodes": [
 *       { "id": "node-001", "content": "...", "type": "concept", ... }
 *     ],
 *     "edges": [
 *       { "id": "edge-001", "from": "node-001", "to": "node-002", "type": "relates_to" }
 *     ],
 *     "stats": {
 *       "totalNodes": 100,
 *       "totalEdges": 250,
 *       "avgConnectivity": 2.5
 *     }
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getKnowledgeStore } from '@/lib/store/knowledge-store';
import { apiLogger } from '@/lib/logger';

/**
 * 晶格查询参数
 * @typedef {Object} LatticeQueryParams
 * @property {boolean} [includeNeighbors=false] - 是否包含邻居节点
 * @property {boolean} [includeStats=false] - 是否包含统计信息
 */

/**
 * 晶格响应数据
 * @typedef {Object} LatticeData
 * @property {Object[]} nodes - 所有知识节点
 * @property {Object[]} edges - 所有知识边（关系）
 * @property {Object} [stats] - 统计信息（可选）
 */

/**
 * GET /api/knowledge/lattice
 * 获取完整知识晶格结构
 * 
 * @param {NextRequest} request - 请求对象
 * @returns {Promise<NextResponse<LatticeData>>} 晶格数据
 * 
 * @throws {500} 服务器内部错误
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
