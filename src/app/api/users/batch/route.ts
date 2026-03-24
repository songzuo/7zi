/**
 * API Route: Users Batch Operations
 * Endpoint: /api/users/batch
 * Methods: GET, POST, PATCH
 *
 * This API endpoint handles batch operations for users:
 * - GET: Batch retrieve multiple users by IDs
 * - POST: Batch create multiple users
 * - PATCH: Batch update multiple users
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getUserById,
  createUser,
  updateUser,
  getUserByEmail,
  getAllUsers,
} from '@/lib/auth/repository';
import { batchInsert, batchUpdate, batchDelete } from '@/lib/db/batch-operations';
import { logger } from '@/lib/logger';

/**
 * Helper function to validate user data
 */
function validateUserData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.email || typeof data.email !== 'string') {
    errors.push('email is required and must be a string');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('email must be a valid email address');
  }

  if (!data.name || typeof data.name !== 'string') {
    errors.push('name is required and must be a string');
  }

  if (!data.password || typeof data.password !== 'string') {
    errors.push('password is required and must be a string');
  } else if (data.password.length < 8) {
    errors.push('password must be at least 8 characters');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Helper function to validate user update data
 */
function validateUpdateData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.email !== undefined && typeof data.email !== 'string') {
    errors.push('email must be a string');
  } else if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('email must be a valid email address');
  }

  if (data.name !== undefined && typeof data.name !== 'string') {
    errors.push('name must be a string');
  }

  if (data.status !== undefined) {
    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(data.status)) {
      errors.push(`status must be one of: ${validStatuses.join(', ')}`);
    }
  }

  if (data.role !== undefined) {
    const validRoles = ['admin', 'member', 'guest'];
    if (!validRoles.includes(data.role)) {
      errors.push(`role must be one of: ${validRoles.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * GET /api/users/batch?ids=id1,id2,id3
 * Batch retrieve multiple users by IDs
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_PARAMETER',
            message: 'ids parameter is required (comma-separated user IDs)',
          },
        },
        { status: 400 }
      );
    }

    const ids = idsParam.split(',').map(id => id.trim()).filter(id => id);

    if (ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'No valid user IDs provided',
          },
        },
        { status: 400 }
      );
    }

    if (ids.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Maximum 100 user IDs per batch request',
          },
        },
        { status: 400 }
      );
    }

    // Batch retrieve users
    const users = await Promise.all(
      ids.map(async (id) => {
        try {
          const user = await getUserById(id);
          return user ? { id, user, error: null } : { id, user: null, error: 'User not found' };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          return { id, user: null, error: errorMsg };
        }
      })
    );

    const successfulUsers = users.filter(u => u.user).map(u => u.user);
    const failed = users.filter(u => !u.user);

    return NextResponse.json({
      success: true,
      data: successfulUsers,
      meta: {
        total: ids.length,
        successful: successfulUsers.length,
        failed: failed.length,
        errors: failed.length > 0 ? failed.map(f => ({ id: f.id, error: f.error })) : undefined,
      },
    });
  } catch (error) {
    logger.error('Failed to batch get users', { error });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users/batch
 * Batch create multiple users
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { users } = body;

    if (!Array.isArray(users)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'users must be an array',
          },
        },
        { status: 400 }
      );
    }

    if (users.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'users array cannot be empty',
          },
        },
        { status: 400 }
      );
    }

    if (users.length > 50) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Maximum 50 users per batch create request',
          },
        },
        { status: 400 }
      );
    }

    // Validate all users
    const validationResults = users.map((user: any, index: number) => {
      const validation = validateUserData(user);
      return {
        index,
        valid: validation.valid,
        errors: validation.errors,
      };
    });

    const invalidUsers = validationResults.filter(r => !r.valid);
    if (invalidUsers.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Some users have invalid data',
            details: invalidUsers.map(r => ({
              index: r.index,
              errors: r.errors,
            })),
          },
        },
        { status: 400 }
      );
    }

    // Check for duplicate emails
    const emails = users.map(u => u.email);
    const uniqueEmails = new Set(emails);
    if (uniqueEmails.size !== emails.length) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_EMAIL',
            message: 'Duplicate email addresses found in the batch',
          },
        },
        { status: 400 }
      );
    }

    // Check if any emails already exist
    const existingEmails = await Promise.all(
      emails.map(async (email) => {
        const existing = await getUserByEmail(email);
        return existing ? email : null;
      })
    );

    const duplicateEmails = existingEmails.filter(e => e !== null);
    if (duplicateEmails.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'Some email addresses already exist',
            details: duplicateEmails,
          },
        },
        { status: 409 }
      );
    }

    // Batch create users
    const results = await Promise.all(
      users.map(async (user: any, index: number) => {
        try {
          const created = await createUser(user);
          return { index, user: created, error: null };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          return { index, user: null, error: errorMsg };
        }
      })
    );

    const successfulUsers = results.filter(r => r.user).map(r => r.user);
    const failed = results.filter(r => !r.user);

    return NextResponse.json(
      {
        success: true,
        data: successfulUsers,
        meta: {
          total: users.length,
          successful: successfulUsers.length,
          failed: failed.length,
          errors: failed.length > 0 ? failed.map(f => ({ index: f.index, error: f.error })) : undefined,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Failed to batch create users', { error });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/batch
 * Batch update multiple users
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'updates must be an array',
          },
        },
        { status: 400 }
      );
    }

    if (updates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'updates array cannot be empty',
          },
        },
        { status: 400 }
      );
    }

    if (updates.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Maximum 100 users per batch update request',
          },
        },
        { status: 400 }
      );
    }

    // Validate all updates
    const validationResults = updates.map((update: any, index: number) => {
      if (!update.id || typeof update.id !== 'string') {
        return {
          index,
          valid: false,
          errors: ['id is required and must be a string'],
        };
      }
      const validation = validateUpdateData(update);
      return {
        index,
        valid: validation.valid,
        errors: validation.errors,
      };
    });

    const invalidUpdates = validationResults.filter(r => !r.valid);
    if (invalidUpdates.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Some updates have invalid data',
            details: invalidUpdates.map(r => ({
              index: r.index,
              errors: r.errors,
            })),
          },
        },
        { status: 400 }
      );
    }

    // Batch update users
    const results = await Promise.all(
      updates.map(async (update: any, index: number) => {
        try {
          const { id, ...updateData } = update;
          const updated = await updateUser(id, updateData);
          return {
            index,
            id,
            user: updated,
            error: !updated ? 'User not found' : null,
          };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          return {
            index,
            id: update.id,
            user: null,
            error: errorMsg,
          };
        }
      })
    );

    const successfulUsers = results.filter(r => r.user).map(r => r.user);
    const failed = results.filter(r => !r.user);

    return NextResponse.json({
      success: true,
      data: successfulUsers,
      meta: {
        total: updates.length,
        successful: successfulUsers.length,
        failed: failed.length,
        errors: failed.length > 0 ? failed.map(f => ({ id: f.id, error: f.error })) : undefined,
      },
    });
  } catch (error) {
    logger.error('Failed to batch update users', { error });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/batch
 * Batch delete multiple users (optional endpoint)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_PARAMETER',
            message: 'ids parameter is required (comma-separated user IDs)',
          },
        },
        { status: 400 }
      );
    }

    const ids = idsParam.split(',').map(id => id.trim()).filter(id => id);

    if (ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'No valid user IDs provided',
          },
        },
        { status: 400 }
      );
    }

    if (ids.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Maximum 100 user IDs per batch delete request',
          },
        },
        { status: 400 }
      );
    }

    // Check if users exist before deleting
    const existingUsers = await Promise.all(
      ids.map(async (id) => {
        const user = await getUserById(id);
        return user ? id : null;
      })
    );

    const existingIds = existingUsers.filter(id => id !== null) as string[];
    const notFoundIds = ids.filter(id => !existingIds.includes(id));

    // Import delete function from repository
    const { deleteUser } = await import('@/lib/auth/repository');

    // Batch delete users
    const results = await Promise.all(
      existingIds.map(async (id) => {
        try {
          const deleted = await deleteUser(id);
          return { id, deleted, error: null };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          return { id, deleted: false, error: errorMsg };
        }
      })
    );

    const successfulDeletions = results.filter(r => r.deleted);
    const failedDeletions = results.filter(r => !r.deleted);

    return NextResponse.json({
      success: true,
      meta: {
        total: ids.length,
        successful: successfulDeletions.length,
        failed: failedDeletions.length,
        notFound: notFoundIds.length,
        errors: failedDeletions.length > 0 ? failedDeletions.map(f => ({ id: f.id, error: f.error })) : undefined,
        notFoundIds: notFoundIds.length > 0 ? notFoundIds : undefined,
      },
    });
  } catch (error) {
    logger.error('Failed to batch delete users', { error });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      },
      { status: 500 }
    );
  }
}
