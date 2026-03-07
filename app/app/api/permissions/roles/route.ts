/**
 * 权限管理 API
 * Permission Management API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { Role } from '../../../lib/permissions/types';
import { 
  getAllRoles, 
  getRolePermissions, 
  RoleLabels, 
  RoleDescriptions 
} from '../../../lib/permissions';

/**
 * GET /api/permissions/roles
 * 获取所有角色定义
 */
export async function GET(request: NextRequest) {
  try {
    const roles = getAllRoles();
    
    const rolesInfo = roles.map((role) => ({
      role,
      label: RoleLabels[role],
      description: RoleDescriptions[role],
      permissions: getRolePermissions(role),
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        roles: rolesInfo,
        roleHierarchy: Object.fromEntries(
          roles.map((r) => [r, { label: RoleLabels[r], description: RoleDescriptions[r] }])
        ),
      },
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}
