import { NextRequest, NextResponse } from 'next/server';
import { KnowledgeLattice, KnowledgeType, KnowledgeSource } from '@/lib/agents/knowledge-lattice';
import { apiLogger } from '@/lib/logger';

// 创建全局知识晶格实例
let latticeInstance: KnowledgeLattice | null = null;

function getLattice(): KnowledgeLattice {
  if (!latticeInstance) {
    latticeInstance = new KnowledgeLattice();
  }
  return latticeInstance;
}

/**
 * POST /api/knowledge/query
 * 查询知识晶格
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const lattice = getLattice();

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
    const result = lattice.query(filters);

    // 如果提供了搜索文本，可以进行内容匹配
    if (body.searchText) {
      const searchTerm = body.searchText.toLowerCase();
      result.nodes = result.nodes.filter(n =>
        n.content.toLowerCase().includes(searchTerm)
      );
    }

    // 按相关性排序
    const indexedNodes = result.nodes.map((node, index) => ({
      node,
      relevance: result.relevanceScores[index],
    }));

    indexedNodes.sort((a, b) => b.relevance - a.relevance);

    // 限制结果数量
    const limit = body.limit || 50;
    const sortedNodes = indexedNodes.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: {
        nodes: sortedNodes.map(item => item.node),
        relevanceScores: sortedNodes.map(item => item.relevance),
        edges: result.edges,
        total: result.nodes.length,
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