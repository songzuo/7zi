/**
 * Revalidation API Route
 * POST /api/revalidate - Revalidate cache by path or tag
 * GET  /api/revalidate - Revalidate cache by path or tag (query params)
 */

import { NextRequest } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import {
  createSuccessResponse,
  createErrorResponse,
  createUnauthorizedError,
} from '@/lib/api/error-handler';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, tag, secret } = body;

    // 验证密钥（防止未授权的缓存刷新）
    if (secret !== process.env.REVALIDATION_SECRET) {
      return createUnauthorizedError('Invalid revalidation secret');
    }

    // 按路径重新验证
    if (path) {
      revalidatePath(path, 'page');
      // Path revalidated
    }

    // 按标签重新验证
    if (tag) {
      revalidateTag(tag, tag);
      // Tag revalidated
    }

    return createSuccessResponse({
      message: 'Revalidation successful',
      path,
      tag,
      timestamp: new Date().toISOString(),
    });
  } catch (_error) {
    return createErrorResponse(
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

// 支持 GET 请求（用于测试）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path');
    const tag = searchParams.get('tag');
    const secret = searchParams.get('secret');

    if (secret !== process.env.REVALIDATION_SECRET) {
      return createUnauthorizedError('Invalid revalidation secret');
    }

    if (path) {
      revalidatePath(path, 'page');
      // Path revalidated
    }

    if (tag) {
      revalidateTag(tag, tag);
      // Tag revalidated
    }

    return createSuccessResponse({
      message: 'Revalidation successful',
      path,
      tag,
      timestamp: new Date().toISOString(),
    });
  } catch (_error) {
    return createErrorResponse(
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
