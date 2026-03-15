/**
 * 知识查询 API
 * 查询知识图谱，支持文本搜索和多条件过滤
 * 
 * @module api/knowledge/query
 * @description 提供知识图谱的高级查询功能，支持相关性评分和结果排序
 * 
 * @example
 * // 基础查询
 * POST /api/knowledge/query
 * { "searchText": "React" }
 * 
 * // 多条件过滤查询
 * POST /api/knowledge/query
 * {
 *   "searchText": "组件",
 *   "type": "concept",
 *   "tags": ["react", "frontend"],
 *   "minConfidence": 0.7,
 *   "minWeight": 0.5,
 *   "limit": 20
 * }
 * 
 * // 响应示例
 * {
 *   "success": true,
 *   "data": {
 *     "nodes": [...],
 *     "relevanceScores": [0.95, 0.85, 0.75],
 *     "edges": [...],
 *     "total": 15
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getKnowledgeStore } from '@/lib/store/knowledge-store';
import { KnowledgeType, KnowledgeSource, LatticeNode, LatticeEdge } from '@/lib/agents/knowledge-lattice';
import { apiLogger } from '@/lib/logger';

/**
 * 知识查询请求参数
 * @typedef {Object} KnowledgeQueryRequest
 * @property {string} [searchText] - 搜索文本（内容匹配）
 * @property {string} [type] - 节点类型过滤: concept, fact, rule, procedure
 * @property {string} [source] - 来源过滤: user, ai, document
 * @property {string[]} [tags] - 标签过滤数组
 * @property {number} [minWeight] - 最小权重 (0-1)
 * @property {number} [minConfidence] - 最小置信度 (0-1)
 * @property {number} [limit=50] - 结果数量限制
 */

/**
 * 知识查询响应数据
 * @typedef {Object} KnowledgeQueryData
 * @property {Object[]} nodes - 匹配的知识节点
 * @property {number[]} relevanceScores - 相关性分数（与节点一一对应）
 * @property {Object[]} edges - 相关边关系
 * @property {number} total - 总匹配数
 */

/**
 * POST /api/knowledge/query
 * 查询知识图谱
 * 
 * @param {NextRequest} request - 请求对象
 * @returns {Promise<NextResponse<KnowledgeQueryData>>} 查询结果
 * 
 * @throws {500} 服务器内部错误
 */

/**
 * POST /api/knowledge/query
 * 查询知识晶格
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const store = getKnowledgeStore();

    // 提前解析过滤参数，避免后续重复解析
    const filters: {
      type?: KnowledgeType;
      source?: KnowledgeSource;
      tags?: string[];
      minWeight?: number;
      minConfidence?: number;
    } = {
      type: body.type as KnowledgeType | undefined,
      source: body.source as KnowledgeSource | undefined,
      tags: body.tags ? (Array.isArray(body.tags) ? body.tags : [body.tags]) : undefined,
      minWeight: body.minWeight,
      minConfidence: body.minConfidence,
    };

    // 提前判断是否需要查询全部数据
    const hasFilters = filters.type || filters.source || filters.tags?.length 
      || filters.minWeight !== undefined || filters.minConfidence !== undefined;
    const hasSearchText = body.searchText && typeof body.searchText === 'string';

    // 如果有过滤条件，直接使用 queryNodes，避免获取全部数据
    let nodes: LatticeNode[];
    let edges: LatticeEdge[];
    
    if (hasFilters || hasSearchText) {
      const queryResult = store.queryNodes({
        type: filters.type,
        source: filters.source,
        tags: filters.tags,
        minWeight: filters.minWeight,
        minConfidence: filters.minConfidence,
      });
      nodes = queryResult.nodes;
      edges = store.getAllEdges(); // 边需要单独获取
    } else {
      // 无过滤条件时获取全部
      nodes = store.getAllNodes();
      edges = store.getAllEdges();
    }

    // 提前 return 减少嵌套：如果没有数据直接返回
    if (!nodes.length) {
      return NextResponse.json({
        success: true,
        data: { nodes: [], relevanceScores: [], edges: [], total: 0 },
      });
    }

    // 获取相关边（优化：使用 Set 提高查找效率）
    const nodeIds = new Set(nodes.map(n => n.id));
    edges = edges.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to));

    // 计算相关性分数（优化：合并到一次遍历）
    const indexedNodes = nodes.map(node => ({
      node,
      relevance: (node.weight * 0.5) + (node.confidence * 0.5),
    }));

    // 如果提供了搜索文本，进行内容匹配
    let searchResults = indexedNodes;
    if (hasSearchText) {
      const searchTerm = body.searchText.toLowerCase();
      searchResults = indexedNodes.filter(item =>
        item.node.content.toLowerCase().includes(searchTerm)
      );
    }

    // 按相关性排序
    searchResults.sort((a, b) => b.relevance - a.relevance);

    // 限制结果数量
    const limit = body.limit || 50;
    const sortedNodes = searchResults.slice(0, limit);

    // 获取相关的边
    const sortedNodeIds = new Set(sortedNodes.map(item => item.node.id));
    const relatedEdges = edges.filter(e =>
      sortedNodeIds.has(e.from) || sortedNodeIds.has(e.to)
    );

    return NextResponse.json({
      success: true,
      data: {
        nodes: sortedNodes.map(item => item.node),
        relevanceScores: sortedNodes.map(item => item.relevance),
        edges: relatedEdges,
        total: nodes.length,
      },
    });
  } catch (error) {
    apiLogger.error('Error querying lattice', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to query lattice' },
      { status: 500 }
    );
  }
}
