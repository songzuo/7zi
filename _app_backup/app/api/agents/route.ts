/**
 * 智能体管理 API
 * Agent Management API
 * 
 * GET /api/agents - 获取智能体列表
 * POST /api/agents - 创建智能体
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAgent, getAllAgents, getAgentStats, AgentType, AgentProvider, AgentStatus } from '@/lib/agents';

/**
 * @openapi
 * /api/agents:
 *   get:
 *     summary: 获取智能体列表
 *     description: 返回所有智能体的列表，支持按状态、类型、提供商筛选
 *     tags:
 *       - Agents
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, busy, offline]
 *         description: 按状态筛选
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [assistant, worker, supervisor, specialist]
 *         description: 按类型筛选
 *       - in: query
 *         name: provider
 *         schema:
 *           type: string
 *           enum: [minimax, bailian, volcengine, self-claude, openai, anthropic, custom]
 *         description: 按提供商筛选
 *       - in: query
 *         name: stats
 *         schema:
 *           type: boolean
 *         description: 是否返回统计信息
 *     responses:
 *       200:
 *         description: 成功返回智能体列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 agents:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Agent'
 *                 stats:
 *                   type: object
 *       500:
 *         description: 服务器错误
 *   post:
 *     summary: 创建智能体
 *     description: 创建一个新的智能体
 *     tags:
 *       - Agents
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - provider
 *             properties:
 *               name:
 *                 type: string
 *                 description: 智能体名称
 *               description:
 *                 type: string
 *                 description: 智能体描述
 *               type:
 *                 type: string
 *                 enum: [assistant, worker, supervisor, specialist]
 *                 description: 智能体类型
 *               provider:
 *                 type: string
 *                 enum: [minimax, bailian, volcengine, self-claude, openai, anthropic, custom]
 *                 description: 模型提供商
 *               model:
 *                 type: string
 *                 description: 模型名称
 *               apiKey:
 *                 type: string
 *                 description: API 密钥
 *               webhookUrl:
 *                 type: string
 *                 description: 回调 URL
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 权限列表
 *               metadata:
 *                 type: object
 *                 description: 元数据
 *     responses:
 *       201:
 *         description: 智能体创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 agent:
 *                   $ref: '#/components/schemas/Agent'
 *                 apiKey:
 *                   type: string
 *                   description: 生成的 API 密钥（仅首次返回）
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as AgentStatus | null;
    const type = searchParams.get('type') as AgentType | null;
    const provider = searchParams.get('provider') as AgentProvider | null;
    const includeStats = searchParams.get('stats') === 'true';

    const agents = await getAllAgents({ status: status || undefined, type: type || undefined, provider: provider || undefined });

    const response: Record<string, unknown> = { agents };

    if (includeStats) {
      response.stats = await getAgentStats();
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必填字段
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!body.type) {
      return NextResponse.json(
        { error: 'Type is required' },
        { status: 400 }
      );
    }

    if (!body.provider) {
      return NextResponse.json(
        { error: 'Provider is required' },
        { status: 400 }
      );
    }

    // 创建智能体
    const agent = await createAgent({
      name: body.name,
      description: body.description,
      type: body.type,
      provider: body.provider,
      model: body.model,
      webhookUrl: body.webhookUrl,
      permissions: body.permissions,
      metadata: body.metadata,
      apiKey: body.apiKey,
    });

    // 返回创建的智能体（不包含 apiKey）
    const response = { agent };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Failed to create agent:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}