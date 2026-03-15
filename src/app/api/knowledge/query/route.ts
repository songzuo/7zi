import { NextRequest, NextResponse } from 'next/server';
import { getKnowledgeStore } from '@/lib/store/knowledge-store';
import { KnowledgeType, KnowledgeSource, LatticeNode, LatticeEdge } from '@/lib/agents/knowledge-lattice';
import { apiLogger } from '@/lib/logger';

/**
 * POST /api/knowledge/query
 * 查询知识晶格
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const store = getKnowledgeStore();

    // 构建查询过滤器
    const filters: {
      type?: KnowledgeType;
      source?: KnowledgeSource;
      tags?: string[];
      minWeight?: number;
      minConfidence?: number;
    } = {};

    if (body.type) {
      filters.type = body.type as KnowledgeType;
    }
    if (body.source) {
      filters.source = body.source as KnowledgeSource;
    }
    if (body.tags) {
      filters.tags = Array.isArray(body.tags) ? body.tags : [body.tags];
    }
    if (body.minWeight !== undefined) {
      filters.minWeight = body.minWeight;
    }
    if (body.minConfidence !== undefined) {
      filters.minConfidence = body.minConfidence;
    }

    // 执行查询
    let nodes: LatticeNode[] = store.getAllNodes();
    let edges: LatticeEdge[] = store.getAllEdges();

    // 应用过滤
    if (filters.type) {
      nodes = nodes.filter(n => n.type === filters.type);
    }
    if (filters.source) {
      nodes = nodes.filter(n => n.source === filters.source);
    }
    if (filters.tags?.length) {
      nodes = nodes.filter(n =>
        filters.tags!.some(tag => n.tags?.includes(tag))
      );
    }
    if (filters.minWeight !== undefined) {
      nodes = nodes.filter(n => n.weight >= filters.minWeight!);
    }
    if (filters.minConfidence !== undefined) {
      nodes = nodes.filter(n => n.confidence >= filters.minConfidence!);
    }

    // 获取相关边
    const nodeIds = new Set(nodes.map(n => n.id));
    edges = edges.filter(e =>
      nodeIds.has(e.from) && nodeIds.has(e.to)
    );

    // 计算相关性分数
    const relevanceScores = nodes.map(n =>
      (n.weight * 0.5) + (n.confidence * 0.5)
    );

    // 构建索引结果
    const indexedNodes = nodes.map((node, index) => ({
      node,
      relevance: relevanceScores[index],
    }));

    // 如果提供了搜索文本，进行内容匹配
    let searchResults = indexedNodes;
    if (body.searchText) {
      const searchTerm = body.searchText.toLowerCase();
      searchResults = indexedNodes.filter(item =>
        item.node.content.toLowerCase().includes(searchTerm)
      );

      const filteredNodeIds = new Set(searchResults.map(item => item.node.id));
      edges = edges.filter(e =>
        filteredNodeIds.has(e.from) && filteredNodeIds.has(e.to)
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
