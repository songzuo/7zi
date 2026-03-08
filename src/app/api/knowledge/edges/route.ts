import { NextRequest, NextResponse } from 'next/server';
import { KnowledgeLattice, RelationType } from '@/lib/agents/knowledge-lattice';

// 创建全局知识晶格实例
let latticeInstance: KnowledgeLattice | null = null;

function getLattice(): KnowledgeLattice {
  if (!latticeInstance) {
    latticeInstance = new KnowledgeLattice();
  }
  return latticeInstance;
}

/**
 * GET /api/knowledge/edges
 * 获取所有边或根据查询参数过滤
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lattice = getLattice();

    // 获取所有边
    let edges = lattice.getAllEdges();

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
    console.error('Error fetching edges:', error);
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
    const lattice = getLattice();

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

    const edgeId = lattice.addEdge(edge);

    return NextResponse.json({
      success: true,
      data: lattice.getEdge(edgeId),
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating edge:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create edge' },
      { status: 500 }
    );
  }
}