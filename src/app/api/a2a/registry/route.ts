/**
 * A2A Agent Registry API Route
 * GET  /api/a2a/registry - List all agents
 * POST /api/a2a/registry - Register a new agent
 */

import { NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { withA2AAuth, canAccessAgent, type A2AAuthContext } from '@/lib/agents/a2a/auth'
import { getAgentRegistry } from '@/lib/agents/a2a/agent-registry'
import { AgentRegistration } from '@/lib/agents/a2a/types'
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
  createForbiddenError,
} from '@/lib/api/error-handler'

export async function GET(request: NextRequest) {
  return withA2AAuth(request, GETHandler)
}

/**
 * GET /api/a2a/registry
 * List all registered agents
 *
 * 可见性按 canAccessAgent 过滤：
 *   - JWT 方式 → 可见全部（权限由 RBAC 层管）
 *   - API Key 方式且绑定了 agentId → 只能看到自己那个 agent
 *     （否则一个 scoped key 可以枚举出全平台的 agent 清单）
 *   - API Key 方式但没绑定 agentId（单 key 部署）→ 可见全部
 */
async function GETHandler(request: NextRequest, auth: A2AAuthContext) {
  try {
    const { searchParams } = new URL(request.url)
    const capability = searchParams.get('capability')
    const skill = searchParams.get('skill')
    const status = searchParams.get('status')
    const available = searchParams.get('available') === 'true'

    const registry = getAgentRegistry()
    let agents = registry.getAll()

    // 权限过滤：只保留调用方有权访问的 agent
    agents = agents.filter(agent => canAccessAgent(auth, agent.id))

    // Filter by capability
    if (capability) {
      agents = agents.filter(agent => agent.capabilities.includes(capability))
    }

    // Filter by skill
    if (skill) {
      agents = agents.filter(agent => agent.skills.includes(skill))
    }

    // Filter by status
    if (status) {
      agents = agents.filter(agent => agent.status === status)
    }

    // Filter available agents
    if (available) {
      agents = agents.filter(agent => agent.status === 'online')
    }

    return createSuccessResponse({
      agents,
      count: agents.length,
    })
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

export async function POST(request: NextRequest) {
  return withA2AAuth(request, POSTHandler)
}

/**
 * POST /api/a2a/registry
 * Register a new agent
 */
async function POSTHandler(request: NextRequest, auth: A2AAuthContext) {
  try {
    const body = await request.json()

    // Basic validation
    if (!body.name || !body.url) {
      return createValidationError('Missing required fields', { fields: ['name', 'url'] })
    }

    // capabilities / skills 必须是数组（缺省时才算合法）
    if (
      (body.capabilities !== undefined && !Array.isArray(body.capabilities)) ||
      (body.skills !== undefined && !Array.isArray(body.skills))
    ) {
      return createValidationError('capabilities and skills must be arrays', {
        fields: ['capabilities', 'skills'],
      })
    }

    const registration: AgentRegistration = {
      // registry.register() 内部虽然会用 uuidv4() 兜底，
      // 但不会把补出来的 id 回写给调用方 —— 如果这里不自己生成 id，
      // 后面 registry.get(registration.id) 会拿到 undefined，
      // 导致 201 响应的 data.agent 是 undefined。
      id: body.id || randomUUID(),
      name: body.name,
      url: body.url,
      capabilities: body.capabilities || [],
      skills: body.skills || [],
      status: body.status || 'online',
      lastHeartbeat: new Date().toISOString(),
      load: body.load,
      metadata: body.metadata,
    }

    // 允许调用方指定 id 时，必须校验这个 id 对自己可见：
    // 否则一个绑定在 agent-A 上的 API Key 可以用 POST 指定 id=agent-B，
    // 直接把 agent-B 的注册信息覆盖掉（register 是 upsert 语义）。
    //
    // 只在「调用方显式指定 id」时校验：
    // 未指定 id 时由服务端生成新 id，那是注册新 agent，不是操作别人的 agent。
    if (body.id && !canAccessAgent(auth, body.id)) {
      return createForbiddenError(`Access denied for agent: ${body.id}`)
    }

    const registry = getAgentRegistry()
    registry.register(registration)

    return createSuccessResponse(
      {
        message: 'Agent registered successfully',
        agent: registry.get(registration.id),
      },
      201
    )
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}
