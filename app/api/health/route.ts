/**
 * 数据库健康检查 API
 * GET: 检查数据库连接状态
 */

import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/db/index';

export async function GET() {
  try {
    const health = await checkDatabaseHealth();
    
    if (health.healthy) {
      return NextResponse.json({
        status: 'ok',
        database: health.path,
      });
    } else {
      return NextResponse.json({
        status: 'error',
        error: health.error,
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}