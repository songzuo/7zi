/**
 * Single User API Route
 * Endpoint: /api/users/[userId]
 * Methods: GET, PATCH, DELETE
 *
 * Supports:
 * - Get single user details
 * - Update user (including avatar)
 * - Delete user
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getUserById,
  updateUser,
  deleteUser,
} from '@/lib/auth/repository';
import { UserStatus, UserRole } from '@/lib/auth/types';
import { createAuditLog, AuditAction, AuditStatus } from '@/lib/db/audit-log';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ userId: string }>;
}

/**
 * GET /api/users/[userId] - Get user details
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { userId } = await params;

    const user = await getUserById(userId);

    if (!user) {
      return NextResponse.json(
        {
          code: 'NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Remove sensitive data
    const sanitizedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };

    return NextResponse.json({
      success: true,
      data: sanitizedUser,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get user', { error });
    return NextResponse.json(
      {
        code: 'UNKNOWN_ERROR',
        message: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/[userId] - Update user details
 *
 * Supports:
 * - Update name, avatar, role, status
 * - Avatar upload via base64 or URL
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { userId } = await params;
    const body = await request.json();

    // Check if user exists
    const existingUser = await getUserById(userId);
    if (!existingUser) {
      return NextResponse.json(
        {
          code: 'NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Validate role if provided
    if (body.role && !Object.values(UserRole).includes(body.role)) {
      return NextResponse.json(
        {
          code: 'BAD_REQUEST',
          message: `Invalid role. Must be one of: ${Object.values(UserRole).join(', ')}`,
          errors: {
            role: [`Must be one of: ${Object.values(UserRole).join(', ')}`],
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (body.status && !Object.values(UserStatus).includes(body.status)) {
      return NextResponse.json(
        {
          code: 'BAD_REQUEST',
          message: `Invalid status. Must be one of: ${Object.values(UserStatus).join(', ')}`,
          errors: {
            status: [`Must be one of: ${Object.values(UserStatus).join(', ')}`],
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Validate password length if provided
    if (body.password && body.password.length < 8) {
      return NextResponse.json(
        {
          code: 'BAD_REQUEST',
          message: 'Password must be at least 8 characters',
          errors: {
            password: ['Must be at least 8 characters'],
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: {
      name?: string;
      avatar?: string;
      role?: UserRole;
      status?: UserStatus;
      password?: string;
      metadata?: Record<string, unknown>;
    } = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.avatar !== undefined) updateData.avatar = body.avatar;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.password !== undefined) updateData.password = body.password;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;

    // Update user
    const updatedUser = await updateUser(userId, updateData);

    if (!updatedUser) {
      return NextResponse.json(
        {
          code: 'UNKNOWN_ERROR',
          message: 'Failed to update user',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    // Audit log
    try {
      await createAuditLog({
        user_id: userId,
        action: AuditAction.USER_UPDATED,
        entity_type: 'user',
        entity_id: userId,
        resource_type: 'user',
        resource_id: userId,
        details: {
          changes: updateData,
        },
        ip_address: null,
        user_agent: null,
        status: AuditStatus.SUCCESS,
        error_message: null,
      });
    } catch (auditError) {
      logger.error('Failed to create audit log', { error: auditError });
      // Don't fail the request if audit logging fails
    }

    // Remove sensitive data
    const sanitizedUser = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      avatar: updatedUser.avatar,
      role: updatedUser.role,
      status: updatedUser.status,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      lastLoginAt: updatedUser.lastLoginAt,
    };

    return NextResponse.json({
      success: true,
      data: sanitizedUser,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to update user', { error });
    return NextResponse.json(
      {
        code: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[userId] - Delete user
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { userId } = await params;

    // Check if user exists
    const existingUser = await getUserById(userId);
    if (!existingUser) {
      return NextResponse.json(
        {
          code: 'NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Delete user
    const deleted = await deleteUser(userId);

    if (!deleted) {
      return NextResponse.json(
        {
          code: 'UNKNOWN_ERROR',
          message: 'Failed to delete user',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    // Audit log
    try {
      await createAuditLog({
        user_id: userId,
        action: AuditAction.USER_DELETED,
        entity_type: 'user',
        entity_id: userId,
        resource_type: 'user',
        resource_id: userId,
        details: {
          email: existingUser.email,
          name: existingUser.name,
        },
        ip_address: null,
        user_agent: null,
        status: AuditStatus.SUCCESS,
        error_message: null,
      });
    } catch (auditError) {
      logger.error('Failed to create audit log', { error: auditError });
      // Don't fail the request if audit logging fails
    }

    return NextResponse.json({
      success: true,
      data: { message: 'User deleted successfully' },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to delete user', { error });
    return NextResponse.json(
      {
        code: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
