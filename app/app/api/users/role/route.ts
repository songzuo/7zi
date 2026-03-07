/**
 * 用户角色管理 API
 * User Role Management API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { Role } from '../../../../lib/permissions/types';
import { getAllRoles, getAssignableRoles, canManageRole, RoleLabels } from '../../../../lib/permissions';
import { getUserById, updateUserRole, getUsersByRole, getAllUsers } from '../../../../lib/users/repository';

/**
 * GET /api/users/role
 * 获取所有用户或按角色筛选
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') as Role | null;
    
    let users;
    if (role && Object.values(Role).includes(role)) {
      users = await getUsersByRole(role);
    } else {
      users = await getAllUsers();
    }
    
    return NextResponse.json({
      success: true,
      data: {
        users,
        roles: getAllRoles(),
        roleLabels: RoleLabels,
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/role
 * 更新用户角色
 * 
 * Body: { userId: string, newRole: Role, adminId: string }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, newRole, adminId } = body;
    
    if (!userId || !newRole || !adminId) {
      return NextResponse.json(
        { success: false, error: 'userId, newRole, and adminId are required' },
        { status: 400 }
      );
    }
    
    // 验证角色有效性
    if (!Object.values(Role).includes(newRole)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }
    
    // 获取管理员信息
    const admin = await getUserById(adminId);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin user not found' },
        { status: 404 }
      );
    }
    
    // 检查管理员是否有权限分配该角色
    if (!canManageRole(admin.role, newRole)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to assign this role' },
        { status: 403 }
      );
    }
    
    // 获取目标用户
    const targetUser = await getUserById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Target user not found' },
        { status: 404 }
      );
    }
    
    // 检查管理员是否可以管理目标用户当前角色
    if (!canManageRole(admin.role, targetUser.role)) {
      return NextResponse.json(
        { success: false, error: 'Cannot modify user with equal or higher role' },
        { status: 403 }
      );
    }
    
    // 更新角色
    const updatedUser = await updateUserRole(userId, newRole);
    
    return NextResponse.json({
      success: true,
      data: {
        user: updatedUser,
        previousRole: targetUser.role,
        newRole,
      },
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user role' },
      { status: 500 }
    );
  }
}