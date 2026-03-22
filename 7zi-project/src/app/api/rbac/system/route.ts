/**
 * RBAC API - System Initialization and Management
 * RBAC 系统初始化和管理
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/middleware-rbac';
import {
  seedDefaultRolesAndPermissions,
  needsSeeding,
  getSeedingStats,
  resetToDefaults,
} from '@/lib/permissions/seed';
import { logger } from '@/lib/logger';

/**
 * GET /api/rbac/system - 获取 RBAC 系统状态
 */
export async function GET(request: NextRequest) {
  return withAdmin(request, async (_req, context) => {
    try {
      const stats = await getSeedingStats();

      return NextResponse.json({
        success: true,
        data: {
          systemInitialized: !stats.needsSeeding,
          rolesInDb: stats.rolesInDb,
          permissionsInDb: stats.permissionsInDb,
          defaultRolesCount: stats.defaultRolesCount,
          needsSeeding: stats.needsSeeding,
        },
      });
    } catch (error) {
      logger.error('Failed to get RBAC system status:', { error, userId: context.userId });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to get system status',
          },
        },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/rbac/system/initialize - 初始化 RBAC 系统
 */
export async function POST(request: NextRequest) {
  return withAdmin(request, async (req, context) => {
    try {
      const body = await req.json();
      const { force = false } = body;

      // 检查是否需要初始化
      const needsInit = await needsSeeding();

      if (!needsInit && !force) {
        return NextResponse.json({
          success: true,
          data: {
            message: 'RBAC system already initialized',
            initialized: false,
          },
        });
      }

      // 执行初始化
      const result = await seedDefaultRolesAndPermissions();

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INITIALIZATION_FAILED',
              message: result.message,
            },
          },
          { status: 500 }
        );
      }

      logger.info('RBAC system initialized', {
        userId: context.userId,
        rolesSeeded: result.rolesSeeded.length,
        permissionsSeeded: result.permissionsSeeded,
      });

      return NextResponse.json({
        success: true,
        data: {
          ...result,
          initialized: true,
        },
        message: 'RBAC system initialized successfully',
      });
    } catch (error) {
      logger.error('Failed to initialize RBAC system:', { error, userId: context.userId });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to initialize RBAC system',
          },
        },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/rbac/system/reset - 重置 RBAC 系统到默认状态
 */
export async function DELETE(request: NextRequest) {
  return withAdmin(request, async (_req, context) => {
    try {
      const result = await resetToDefaults();

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'RESET_FAILED',
              message: result.message,
            },
          },
          { status: 500 }
        );
      }

      logger.warn('RBAC system reset to defaults', {
        userId: context.userId,
      });

      return NextResponse.json({
        success: true,
        data: {
          ...result,
        },
        message: 'RBAC system reset to defaults successfully',
      });
    } catch (error) {
      logger.error('Failed to reset RBAC system:', { error, userId: context.userId });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to reset RBAC system',
          },
        },
        { status: 500 }
      );
    }
  });
}
