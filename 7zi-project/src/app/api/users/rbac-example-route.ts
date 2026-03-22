/**
 * User Management API with RBAC
 * Demonstrates how to apply RBAC middleware to API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { withPermissions, withRole, withAnyRole } from '@/lib/permissions/middleware';
import { Permission, Role } from '@/lib/permissions/types';
import { UserRole } from '@/lib/auth/types';
import { getAllUsers, updateUser } from '@/lib/auth/repository';
import { getAllRolesWithCount } from '@/lib/permissions/repository';

/**
 * GET /api/users - List all users
 * Requires: user:read permission
 */
export async function GET(request: NextRequest) {
  return withPermissions(Permission.USER_READ)(request, async (req, context) => {
    try {
      const users = await getAllUsers();

      // Remove passwords from response
      const safeUsers = users.map(({ password, ...user }) => user);

      return NextResponse.json({
        success: true,
        data: safeUsers,
        meta: {
          count: safeUsers.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch users',
          },
        },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/users - Create new user
 * Requires: user:create permission
 */
export async function POST(request: NextRequest) {
  return withPermissions(Permission.USER_CREATE)(request, async (req, context) => {
    try {
      const body = await request.json();
      const { email, password, name } = body;

      if (!email || !password || !name) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Missing required fields: email, password, name',
            },
          },
          { status: 400 }
        );
      }

      // Import and use createUser
      const { createUser } = await import('@/lib/auth/repository');
      const user = await createUser({
        email,
        password,
        name,
        role: UserRole.MEMBER, // Default role
      });

      const { password: _, ...userWithoutPassword } = user;

      return NextResponse.json(
        {
          success: true,
          data: userWithoutPassword,
          meta: {
            timestamp: new Date().toISOString(),
          },
        },
        { status: 201 }
      );
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create user',
          },
        },
        { status: 500 }
      );
    }
  });
}

/**
 * PATCH /api/users/:id - Update user
 * Requires: user:update permission
 */
export async function PATCH(request: NextRequest) {
  return withPermissions(Permission.USER_UPDATE)(request, async (req, context) => {
    try {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get('id');

      if (!userId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'User ID is required',
            },
          },
          { status: 400 }
        );
      }

      const body = await request.json();
      const { name, avatar, roles, status } = body;

      // Update user
      const updatedUser = await updateUser(userId, {
        name,
        avatar,
        status,
      });

      if (!updatedUser) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'User not found',
            },
          },
          { status: 404 }
        );
      }

      // Update roles if provided
      if (roles && Array.isArray(roles)) {
        const { addRolesToUser, removeRolesFromUser, getUserRoles } = await import('@/lib/permissions/repository');

        const currentRoles = await getUserRoles(userId);
        const rolesToAdd = roles.filter((r: Role) => !currentRoles.includes(r));
        const rolesToRemove = currentRoles.filter((r) => !roles.includes(r));

        if (rolesToAdd.length > 0) {
          await addRolesToUser(userId, rolesToAdd, context.userId);
        }

        if (rolesToRemove.length > 0) {
          await removeRolesFromUser(userId, rolesToRemove);
        }
      }

      const { password: _, ...userWithoutPassword } = updatedUser;

      return NextResponse.json({
        success: true,
        data: userWithoutPassword,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update user',
          },
        },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/users/:id - Delete user
 * Requires: user:delete permission AND admin role
 */
export async function DELETE(request: NextRequest) {
  // Admin-only operation - requires both permission and role
  return withRole(Role.ADMIN)(request, async (req, context) => {
    try {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get('id');

      if (!userId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'User ID is required',
            },
          },
          { status: 400 }
        );
      }

      // Import deleteUser function
      const { deleteUser } = await import('@/lib/auth/repository');
      const result = await deleteUser(userId);

      if (!result) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'User not found',
            },
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: { id: userId },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete user',
          },
        },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/users/roles - Get all roles with user counts
 * Requires: user:manage_role permission OR manager or admin role
 */
export async function GET_ROLES(request: NextRequest) {
  return withAnyRole(Role.ADMIN, Role.MANAGER)(request, async (req, context) => {
    try {
      const roles = await getAllRolesWithCount();

      return NextResponse.json({
        success: true,
        data: roles,
        meta: {
          count: roles.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch roles',
          },
        },
        { status: 500 }
      );
    }
  });
}
