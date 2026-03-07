/**
 * 检查用户权限 API
 * Check User Permissions API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { Permission, Role } from '../../../../lib/permissions/types';
import { getRolePermissions, roleHasPermission, compareRoles, canManageRole } from '../../../../lib/permissions';
import { getUserById, getUserWithPermissions } from '../../../../lib/users/repository';

/**
 * POST /api/permissions/check
 * 检查用户权限
 * 
 * Body: { userId: string, permission: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, permission } = body;
    
    if (!userId || !permission) {
      return NextResponse.json(
        { success: false, error: 'userId and permission are required' },
        { status: 400 }
      );
    }
    
    // 获取用户信息
    const userWithPerms = await getUserWithPermissions(userId);
    
    if (!userWithPerms) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // 检查权限
    const hasPermission = userWithPerms.permissions.includes(permission as Permission);
    
    return NextResponse.json({
      success: true,
      data: {
        userId,
        role: userWithPerms.user.role,
        permission,
        granted: hasPermission,
        permissions: userWithPerms.permissions,
      },
    });
  } catch (error) {
    console.error('Error checking permission:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check permission' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/permissions/check?userId=xxx
 * 获取用户所有权限
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }
    
    const userWithPerms = await getUserWithPermissions(userId);
    
    if (!userWithPerms) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        user: userWithPerms.user,
        role: userWithPerms.user.role,
        permissions: userWithPerms.permissions,
      },
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user permissions' },
      { status: 500 }
    );
  }
}