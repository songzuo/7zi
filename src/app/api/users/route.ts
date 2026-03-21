/**
 * User Management API Route
 * Endpoint: /api/users
 * Methods: GET (list users with search and pagination), POST (create user)
 *
 * Supports:
 * - User search (fuzzy search on name and email)
 * - Pagination (offset-based)
 * - Filtering by status and role
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllUsers,
  createUser,
  getUserByEmail,
} from '@/lib/auth/repository';
import { UserStatus, UserRole } from '@/lib/auth/types';
import { createAuditLog, AuditAction, AuditStatus } from '@/lib/db/audit-log';
import { logger } from '@/lib/logger';

/**
 * Query parameters for user listing
 */
interface UserListQuery {
  search?: string;
  status?: UserStatus;
  role?: UserRole;
  page: number;
  limit: number;
  sort_by?: 'created_at' | 'name' | 'email' | 'last_login_at';
  sort_order?: 'asc' | 'desc';
}

/**
 * Paginated user list response
 */
interface UserListResponse {
  success: true;
  data: {
    users: Array<{
      id: string;
      email: string;
      name: string;
      avatar?: string;
      role: UserRole;
      status: UserStatus;
      createdAt: Date;
      lastLoginAt?: Date;
    }>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalUsers: number;
      itemsPerPage: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  };
}

/**
 * Error response
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * GET /api/users - List users with search and pagination
 *
 * Query parameters:
 * - search: Fuzzy search on name and email
 * - status: Filter by status (active, inactive, suspended, pending)
 * - role: Filter by role (admin, manager, member, guest)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - sort_by: Sort field (default: created_at)
 * - sort_order: Sort direction (default: desc)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const query: UserListQuery = {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') as UserStatus || undefined,
      role: searchParams.get('role') as UserRole || undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
      sort_by: (searchParams.get('sort_by') as 'created_at' | 'name' | 'email' | 'last_login_at') || 'created_at',
      sort_order: (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc',
    };

    // Validate page and limit
    if (query.page < 1) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'Page number must be >= 1',
          },
        },
        { status: 400 }
      );
    }

    if (query.limit < 1 || query.limit > 100) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'Limit must be between 1 and 100',
          },
        },
        { status: 400 }
      );
    }

    // Validate status
    if (query.status && !Object.values(UserStatus).includes(query.status)) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: `Invalid status. Must be one of: ${Object.values(UserStatus).join(', ')}`,
          },
        },
        { status: 400 }
      );
    }

    // Validate role
    if (query.role && !Object.values(UserRole).includes(query.role)) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: `Invalid role. Must be one of: ${Object.values(UserRole).join(', ')}`,
          },
        },
        { status: 400 }
      );
    }

    // Get all users with basic filtering
    let users = await getAllUsers({
      status: query.status,
      role: query.role,
    });

    // Apply fuzzy search
    if (query.search) {
      const searchTerm = query.search.toLowerCase();
      users = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
      );
    }

    // Get total count before pagination
    const totalUsers = users.length;

    // Apply sorting
    users.sort((a, b) => {
      let comparison = 0;

      switch (query.sort_by) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'last_login_at':
          if (!a.lastLoginAt && !b.lastLoginAt) {
            comparison = 0;
          } else if (!a.lastLoginAt) {
            comparison = 1;
          } else if (!b.lastLoginAt) {
            comparison = -1;
          } else {
            comparison = a.lastLoginAt.getTime() - b.lastLoginAt.getTime();
          }
          break;
        case 'created_at':
        default:
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
      }

      return query.sort_order === 'desc' ? -comparison : comparison;
    });

    // Apply pagination
    const offset = (query.page - 1) * query.limit;
    const paginatedUsers = users.slice(offset, offset + query.limit);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalUsers / query.limit);

    // Remove sensitive data (password, permissions metadata)
    const sanitizedUsers = paginatedUsers.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    }));

    const response: UserListResponse = {
      success: true,
      data: {
        users: sanitizedUsers,
        pagination: {
          currentPage: query.page,
          totalPages,
          totalUsers,
          itemsPerPage: query.limit,
          hasNext: query.page < totalPages,
          hasPrevious: query.page > 1,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to list users', { error });
    return NextResponse.json<ErrorResponse>(
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
 * POST /api/users - Create a new user
 *
 * Request body:
 * {
 *   email: string,
 *   password: string,
 *   name: string,
 *   role?: UserRole,
 *   roles?: Role[],
 *   permissions?: string[],
 *   metadata?: Record<string, unknown>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role, roles, permissions, metadata } = body;

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'email, password, and name are required',
          },
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid email format',
          },
        },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Password must be at least 8 characters',
          },
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'User with this email already exists',
          },
        },
        { status: 409 }
      );
    }

    // Validate role if provided
    if (role && !Object.values(UserRole).includes(role)) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid role. Must be one of: ${Object.values(UserRole).join(', ')}`,
          },
        },
        { status: 400 }
      );
    }

    // Create user
    const user = await createUser({
      email,
      password,
      name,
      role: role || UserRole.MEMBER,
      roles,
      permissions,
      metadata,
    });

    // Audit log
    try {
      await createAuditLog({
        user_id: user.id,
        action: AuditAction.USER_CREATED,
        entity_type: 'user',
        entity_id: user.id,
        resource_type: 'user',
        resource_id: user.id,
        details: {
          email: user.email,
          name: user.name,
          role: user.role,
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        user_agent: request.headers.get('user-agent') || null,
        status: AuditStatus.SUCCESS,
        error_message: null,
      });
    } catch (auditError) {
      logger.error('Failed to create audit log', { error: auditError });
      // Don't fail the request if audit logging fails
    }

    // Remove sensitive data from response
    const sanitizedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return NextResponse.json(
      {
        success: true,
        data: sanitizedUser,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Failed to create user', { error });
    return NextResponse.json<ErrorResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Internal server error',
        },
      },
      { status: 500 }
    );
  }
}
