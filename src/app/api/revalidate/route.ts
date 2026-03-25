import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, tag, secret } = body;

    // 验证密钥（防止未授权的缓存刷新）
    if (secret !== process.env.REVALIDATION_SECRET) {
      return NextResponse.json(
        { message: 'Invalid secret' },
        { status: 401 }
      );
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

    return NextResponse.json({
      message: 'Revalidation successful',
      path,
      tag,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { message: 'Revalidation failed', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 支持 GET 请求（用于测试）
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path');
  const tag = searchParams.get('tag');
  const secret = searchParams.get('secret');

  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json(
      { message: 'Invalid secret' },
      { status: 401 }
    );
  }

  if (path) {
    revalidatePath(path, 'page');
    // Path revalidated
  }

  if (tag) {
    revalidateTag(tag, tag);
    // Tag revalidated
  }

  return NextResponse.json({
    message: 'Revalidation successful',
    path,
    tag,
    timestamp: new Date().toISOString(),
  });
}
