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
 * GET /api/knowledge/nodes
 * 获取所有节点或根据查询参数过滤
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lattice = getLattice();

    // 获取所有节点
    let nodes = lattice.getAllNodes();

    // 过滤参数
    const type = searchParams.get('type') as KnowledgeType | null;
    const source = searchParams.get('source') as KnowledgeSource | null;
    const tags = searchParams.get('tags')?.split(',') || [];
    const minWeight = searchParams.get('minWeight') ? parseFloat(searchParams.get('minWeight')!) : undefined;
    const minConfidence = searchParams.get('minConfidence') ? parseFloat(searchParams.get('minConfidence')!) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    // 应用过滤
    if (type) {
      nodes = nodes.filter(n => n.type === type);
    }
    if (source) {
      nodes = nodes.filter(n => n.source === source);
    }
    if (tags.length > 0) {
      nodes = nodes.filter(n => tags.some(tag => n.tags?.includes(tag)));
    }
    if (minWeight !== undefined) {
      nodes = nodes.filter(n => n.weight >= minWeight);
    }
    if (minConfidence !== undefined) {
      nodes = nodes.filter(n => n.confidence >= minConfidence);
    }

    // 分页
    const total = nodes.length;
    if (offset || limit) {
      nodes = nodes.slice(offset, limit ? offset + limit : undefined);
    }

    return NextResponse.json({
      success: true,
      data: nodes,
      pagination: {
        total,
        offset,
        limit: limit || nodes.length,
      },
    });
  } catch (error) {
    console.error('Error fetching nodes:', error);
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
    const lattice = getLattice();

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

    const nodeId = lattice.addNode(node);

    return NextResponse.json({
      success: true,
      data: lattice.getNode(nodeId),
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating node:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create node' },
      { status: 500 }
    );
  }
}