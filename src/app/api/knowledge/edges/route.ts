/**
 * 知识边关系 API
 * 管理知识图谱中节点之间的关系（边）
 * 
 * @module api/knowledge/edges
 * @description 提供知识图谱边的 CRUD 操作，支持多条件过滤
 * 
 * @example
 * // 获取所有边
 * GET /api/knowledge/edges
 * 
 * // 按类型过滤
 * GET /api/knowledge/edges?type=relates_to&minWeight=0.7
 * 
 * // 获取特定节点的边
 * GET /api/knowledge/edges?from=node-001
 * 
 * // 创建新边
 * POST /api/knowledge/edges
 * {
 *   "from": "node-001",
 *   "to": "node-002",
 *   "type": "relates_to",
 *   "weight": 0.8
 * }
 * 
 * // 响应示例
 * {
 *   "success": true,
 *   "data": {
 *     "id": "edge-xxx",
 *     "from": "node-001",
 *     "to": "node-002",
 *     "type": "relates_to",
 *     "weight": 0.8
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getKnowledgeStore } from '@/lib/store/knowledge-store';
import { RelationType } from '@/lib/agents/knowledge-lattice';
import { apiLogger } from '@/lib/logger';

/**
 * 边查询参数
 * @typedef {Object} EdgeQueryParams
 * @property {string} [type] - 关系类型: relates_to, depends_on, extends, contradicts
 * @property {string} [from] - 起始节点 ID
 * @property {string} [to] - 目标节点 ID
 * @property {number} [minWeight] - 最小权重 (0-1)
 * @property {number} [limit] - 结果数量限制
 * @property {number} [offset] - 偏移量
 */

/**
 * 创建边请求体
 * @typedef {Object} CreateEdgeRequest
 * @property {string} from - 起始节点 ID（必填）
 * @property {string} to - 目标节点 ID（必填）
 * @property {string} type - 关系类型（必填）
 * @property {number} [weight=0.5] - 权重 (0-1)
 * @property {Object} [metadata] - 元数据
 */

/**
 * GET /api/knowledge/edges
 * 获取边关系列表，支持过滤和分页
 * 
 * @param {NextRequest} request - 请求对象
 * @returns {Promise<NextResponse>} 边列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const store = getKnowledgeStore();

    // 获取所有边
    let edges = store.getAllEdges();

    // 过滤参数
    const type = searchParams.get('type') as RelationType | null;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const minWeight = searchParams.get('minWeight') ? parseFloat(searchParams.get('minWeight')!) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    // 应用过滤
    if (type) {
      edges = edges.filter(e => e.type === type);
    }
    if (from) {
      edges = edges.filter(e => e.from === from);
    }
    if (to) {
      edges = edges.filter(e => e.to === to);
    }
    if (minWeight !== undefined) {
      edges = edges.filter(e => e.weight >= minWeight);
    }

    // 分页
    const total = edges.length;
    if (offset || limit) {
      edges = edges.slice(offset, limit ? offset + limit : undefined);
    }

    return NextResponse.json({
      success: true,
      data: edges,
      pagination: {
        total,
        offset,
        limit: limit || edges.length,
      },
    });
  } catch (error) {
    apiLogger.error('Error fetching edges', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch edges' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/knowledge/edges
 * 添加新边
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const store = getKnowledgeStore();

    // 验证必需字段
    if (!body.from || !body.to || !body.type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: from, to, type' },
        { status: 400 }
      );
    }

    // 验证类型
    if (!Object.values(RelationType).includes(body.type)) {
      return NextResponse.json(
        { success: false, error: `Invalid type: ${body.type}` },
        { status: 400 }
      );
    }

    // 验证节点存在性
    const fromNode = store.getNode(body.from);
    const toNode = store.getNode(body.to);
    
    if (!fromNode) {
      return NextResponse.json(
        { success: false, error: `Source node not found: ${body.from}` },
        { status: 404 }
      );
    }
    
    if (!toNode) {
      return NextResponse.json(
        { success: false, error: `Target node not found: ${body.to}` },
        { status: 404 }
      );
    }

    // 创建边
    const edge = {
      id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from: body.from,
      to: body.to,
      type: body.type as RelationType,
      weight: body.weight ?? 0.5,
      timestamp: Date.now(),
      metadata: body.metadata || {},
    };

    const edgeId = store.addEdge(edge);

    return NextResponse.json({
      success: true,
      data: store.getEdge(edgeId),
    }, { status: 201 });
  } catch (error) {
    apiLogger.error('Error creating edge', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to create edge' },
      { status: 500 }
    );
  }
}
