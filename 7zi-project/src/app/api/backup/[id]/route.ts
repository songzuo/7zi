/**
 * Backup Management API
 * Download or delete a specific backup file by ID
 *
 * GET /api/backup/[id] - Download backup file (requires authentication)
 * DELETE /api/backup/[id] - Delete backup file (requires authentication)
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import fs from 'fs/promises';
import path from 'path';
import { withUserAuth, RBACUserContext } from '@/lib/auth/middleware-rbac';

const BACKUP_DIR = path.join(process.cwd(), 'backups');

/**
 * GET /api/backup/[id]
 * Download a specific backup file (requires authentication)
 */
async function GETHandler(
  request: NextRequest,
  context: RBACUserContext,
  backupId: string
) {
  try {
    const id = backupId;

    // Security check: prevent directory traversal
    if (id.includes('..') || id.includes('/') || id.includes('\\')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'INVALID_BACKUP_ID',
            message: 'Invalid backup ID',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    const filename = `${id}.json`;
    const filePath = path.join(BACKUP_DIR, filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'BACKUP_NOT_FOUND',
            message: 'Backup not found',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 }
      );
    }

    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');

    logger.info(`Backup downloaded: ${filename}`, {
      category: 'backup',
      backupId: id,
      userId: context.userId,
    });

    // Return file for download
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    logger.error('Failed to download backup', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to download backup',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  return withUserAuth(request, (req: NextRequest, userContext: RBACUserContext) => {
    return GETHandler(req, userContext, params.id); // @ts-ignore
  });
}

/**
 * DELETE /api/backup/[id]
 * Delete a specific backup file (requires authentication)
 */
async function DELETEHandler(
  request: NextRequest,
  context: RBACUserContext,
  backupId: string
) {
  try {
    const id = backupId;

    // Security check: prevent directory traversal
    if (id.includes('..') || id.includes('/') || id.includes('\\')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'INVALID_BACKUP_ID',
            message: 'Invalid backup ID',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    const filename = `${id}.json`;
    const filePath = path.join(BACKUP_DIR, filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'BACKUP_NOT_FOUND',
            message: 'Backup not found',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 }
      );
    }

    // Delete the file
    await fs.unlink(filePath);

    logger.info(`Backup deleted: ${filename}`, {
      category: 'backup',
      backupId: id,
      userId: context.userId,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Backup deleted successfully',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Failed to delete backup', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to delete backup',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  return withUserAuth(request, (req: NextRequest, userContext: RBACUserContext) => {
    return DELETEHandler(req, userContext, params.id); // @ts-ignore
  });
}
