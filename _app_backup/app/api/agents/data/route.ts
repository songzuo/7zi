/**
 * 智能体数据 API
 * Agent Data API
 * 
 * 智能体通过此 API 访问平台数据（任务、用户等）
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAgentToken, logDataAccess } from '@/lib/agents/repository';
import { getAllTasks } from '@/lib/db/tasks.repository';
import { getAllUsers } from '@/lib/users/repository';

/**
 * 验证智能体授权
 */
async function validateAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  return validateAgentToken(token);
}

/**
 * GET /api/agents/data/tasks - 获取任务数据
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await validateAuth(request);
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { agent, token } = authResult;
    const url = new URL(request.url);
    const resource = url.searchParams.get('resource') || 'tasks';

    // 检查权限
    if (!token.scopes.includes('read') && !token.scopes.includes('admin')) {
      return NextResponse.json({ success: false, error: 'No read permission' }, { status: 403 });
    }

    let data: unknown;
    let resourceId = 'all';

    switch (resource) {
      case 'tasks':
        data = await getAllTasks();
        resourceId = 'tasks';
        break;
      
      case 'users':
        // 只有 admin 权限才能访问用户数据
        if (!token.scopes.includes('admin')) {
          return NextResponse.json({ success: false, error: 'No permission to access user data' }, { status: 403 });
        }
        data = await getAllUsers();
        resourceId = 'users';
        break;
      
      default:
        return NextResponse.json({ success: false, error: 'Unknown resource type' }, { status: 400 });
    }

    // 记录数据访问
    await logDataAccess(agent.id, resource, resourceId, 'read');

    return NextResponse.json({
      success: true,
      resource,
      data,
      agent: {
        id: agent.id,
        name: agent.name,
      },
    });
  } catch (error) {
    console.error('Data fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}