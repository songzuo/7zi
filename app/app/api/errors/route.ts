import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

/**
 * 错误上报 API
 *
 * 接收来自前端的错误日志并记录
 * 集成 Sentry 错误监控服务
 */

interface ErrorReport {
  type: 'react-error' | 'js-error' | 'api-error' | 'resource-error';
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  timestamp: string;
  userAgent: string;
  metadata?: Record<string, unknown>;
}

// 内存存储（生产环境应使用数据库或日志服务）
const errorLogs: ErrorReport[] = [];
const MAX_LOGS = 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const errorReport: ErrorReport = {
      type: body.type || 'js-error',
      message: body.message || body.error || 'Unknown error',
      stack: body.stack,
      componentStack: body.componentStack,
      url: body.url || '',
      timestamp: body.timestamp || new Date().toISOString(),
      userAgent: body.userAgent || '',
      metadata: body.metadata,
    };

    // 添加到内存日志
    errorLogs.push(errorReport);

    // 限制日志数量
    if (errorLogs.length > MAX_LOGS) {
      errorLogs.shift();
    }

    // 开发环境打印错误
    if (process.env.NODE_ENV === 'development') {
      console.error('[Error Report]', {
        type: errorReport.type,
        message: errorReport.message,
        url: errorReport.url,
      });
    }

    // 生产环境发送到 Sentry
    if (process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLED === 'true') {
      try {
        // Create error object
        const error = new Error(errorReport.message);

        // Set error stack if available
        if (errorReport.stack) {
          error.stack = errorReport.stack;
        }

        // Capture with context
        Sentry.withScope((scope) => {
          // Set tags for filtering
          scope.setTag('error_type', errorReport.type);
          scope.setTag('report_source', 'api');

          // Set extra context
          scope.setExtra('url', errorReport.url);
          scope.setExtra('userAgent', errorReport.userAgent);
          scope.setExtra('timestamp', errorReport.timestamp);
          scope.setExtra('componentStack', errorReport.componentStack);
          scope.setExtra('metadata', errorReport.metadata);
          scope.setExtra('errorType', body.errorType);
          scope.setExtra('boundaryName', body.boundaryName);
          scope.setExtra('retryCount', body.retryCount);

          // Set user context if available
          if (body.metadata?.userId) {
            scope.setUser({ id: String(body.metadata.userId) });
          }

          // Capture the error
          Sentry.captureException(error);
        });
      } catch (sentryError) {
        console.error('Failed to send error to Sentry:', sentryError);
        // Don't fail the request if Sentry fails
      }
    }

    return NextResponse.json({
      success: true,
      errorId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });
  } catch (error) {
    console.error('Error processing error report:', error);

    // Also send the error processing failure to Sentry
    Sentry.captureException(error);

    return NextResponse.json(
      { success: false, message: 'Failed to process error report' },
      { status: 500 }
    );
  }
}

// 获取错误日志（管理员接口）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const type = searchParams.get('type');
  
  let filteredLogs = errorLogs;
  
  if (type) {
    filteredLogs = errorLogs.filter(log => log.type === type);
  }
  
  const recentLogs = filteredLogs.slice(-limit);
  
  return NextResponse.json({
    total: errorLogs.length,
    logs: recentLogs,
  });
}
