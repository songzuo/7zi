import { NextRequest, NextResponse } from 'next/server';
import { getKnowledgeStore } from '@/lib/store/knowledge-store';
import { getKnowledgeQueryCache } from '@/lib/cache/knowledge-cache';
import { KnowledgeType, KnowledgeSource } from '@/lib/agents/knowledge-lattice';
import { apiLogger } from '@/lib/logger';

/**
 * 缓存控制工具
 */
function setCacheHeaders(response: NextResponse, maxAge: number = 30): NextResponse {
  response.headers.set('Cache-Control', `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`);
  response.headers.set('Vary', 'Accept-Encoding');
  return response;
}

/**
 * GET /api/knowledge/nodes
 * 获取所有节点或根据查询参数过滤（优化版）
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const store = getKnowledgeStore();
    const cache = getKnowledgeQueryCache();

    // 解析参数
    const type = searchParams.get('type') as KnowledgeType | null;
    const source = searchParams.get('source') as KnowledgeSource | null;
    const tags = searchParams.get('tags')?.split(',') || [];
    const minWeight = searchParams.get('minWeight') ? parseFloat(searchParams.get('minWeight')!) : undefined;
    const minConfidence = searchParams.get('minConfidence') ? parseFloat(searchParams.get('minConfidence')!) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    // 检查缓存
    const cacheKey = cache.createKey('nodes', {
      type, source, tags, minWeight, minConfidence, limit, offset
    });

    const cached = cache.get<{ nodes: unknown[]; pagination: { total: number; offset: number; limit: number } }>(cacheKey);
    if (cached) {
      const response = NextResponse.json({
        success: true,
        data: cached.nodes,
        pagination: cached.pagination,
        cached: true,
      });
      return setCacheHeaders(response, 30);
    }

    // 使用高性能查询
    const { nodes, total } = store.queryNodes({
      type: type || undefined,
      source: source || undefined,
      tags: tags.length > 0 ? tags : undefined,
      minWeight,
      minConfidence,
      limit,
      offset,
    });

    const result = {
      nodes,
      pagination: {
        total,
        offset,
        limit: limit || nodes.length,
      },
    };

    // 写入缓存
    cache.set(cacheKey, result, 30000); // 30 秒 TTL

    const response = NextResponse.json({
      success: true,
      data: nodes,
      pagination: result.pagination,
    });

    return setCacheHeaders(response, 30);
  } catch (error) {
    apiLogger.error('Error fetching nodes', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch nodes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/knowledge/nodes
 * 添加新节点
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const store = getKnowledgeStore();
    const cache = getKnowledgeQueryCache();

    // 验证必需字段
    if (!body.content || !body.type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: content, type' },
        { status: 400 }
      );
    }

    // 验证类型
    if (!Object.values(KnowledgeType).includes(body.type)) {
      return NextResponse.json(
        { success: false, error: `Invalid type: ${body.type}` },
        { status: 400 }
      );
    }

    // 创建节点
    const node = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: body.content,
      type: body.type as KnowledgeType,
      weight: body.weight ?? 0.5,
      confidence: body.confidence ?? 0.5,
      source: body.source ?? KnowledgeSource.USER,
      embedding: body.embedding,
      tags: body.tags || [],
      metadata: body.metadata || {},
      timestamp: Date.now(),
    };

    const nodeId = store.addNode(node);

    // 清除相关缓存
    cache.invalidatePrefix('nodes:');
    cache.invalidatePrefix('query:');
    cache.invalidatePrefix('lattice:');

    const response = NextResponse.json({
      success: true,
      data: store.getNode(nodeId),
    }, { status: 201 });

    // 新资源不需要缓存
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    apiLogger.error('Error creating node', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to create node' },
      { status: 500 }
    );
  }
}
