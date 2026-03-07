/**
 * 错误上报工具函数
 *
 * 提供统一的错误上报接口，支持多种错误类型
 * 集成 Sentry 错误监控服务
 */

import * as Sentry from '@sentry/nextjs';

export type ErrorCategory =
  | 'react-error'
  | 'js-error'
  | 'api-error'
  | 'network-error'
  | 'resource-error'
  | 'custom';

export interface ErrorReportPayload {
  type: ErrorCategory;
  message: string;
  stack?: string;
  url?: string;
  timestamp?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 上报错误到服务器
 * 同时发送到 Sentry（如果已配置）
 */
export async function reportError(
  error: Error | string,
  category: ErrorCategory = 'custom',
  metadata?: Record<string, unknown>
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const payload: ErrorReportPayload = {
    type: category,
    message: typeof error === 'string' ? error : error.message,
    stack: typeof error === 'string' ? undefined : error.stack,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    metadata,
  };

  // Send to Sentry if enabled
  try {
    const errorObj = typeof error === 'string' ? new Error(error) : error;

    // Add context tags and extra data
    Sentry.withScope((scope) => {
      scope.setTag('error_category', category);
      scope.setExtra('metadata', metadata);
      scope.setExtra('url', window.location.href);

      // Set user context if available
      const userId = (window as any).__user_id__ || null;
      if (userId) {
        scope.setUser({ id: userId });
      }

      // Capture the exception
      Sentry.captureException(errorObj);
    });
  } catch (sentryError) {
    // Silently fail if Sentry throws an error
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('Failed to send error to Sentry:', sentryError);
    }
  }

  // Still send to custom API endpoint
  try {
    // 优先使用 sendBeacon
    if (window.navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      return window.navigator.sendBeacon('/api/errors', blob);
    }

    // 降级使用 fetch
    const response = await fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 全局错误处理器
 * 在应用入口处调用，捕获未处理的错误
 */
export function setupGlobalErrorHandler(): void {
  if (typeof window === 'undefined') return;

  // 捕获未处理的 Promise 拒绝
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    
    // eslint-disable-next-line no-console
    console.error('[Unhandled Rejection]', error);
    
    reportError(
      error instanceof Error ? error : String(error),
      'js-error',
      {
        type: 'unhandledrejection',
        reason: error instanceof Error ? error.message : String(error),
      }
    );
  });

  // 捕获全局错误
  window.addEventListener('error', (event) => {
    // eslint-disable-next-line no-console
    console.error('[Global Error]', event.error || event.message);
    
    reportError(
      event.error || event.message,
      'js-error',
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }
    );
  });

  // 捕获资源加载错误（需要使用捕获阶段）
  window.addEventListener(
    'error',
    (event) => {
      if (event.target && (event.target as HTMLElement).tagName) {
        const target = event.target as HTMLElement;
        
        reportError(
          `Resource failed to load: ${target.tagName}`,
          'resource-error',
          {
            tagName: target.tagName,
            src: (target as HTMLImageElement).src || (target as HTMLScriptElement).src,
          }
        );
      }
    },
    true // 使用捕获阶段
  );
}

/**
 * API 错误上报
 */
export function reportApiError(
  url: string,
  status: number,
  message: string,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  return reportError(
    `API Error: ${status} ${message}`,
    'api-error',
    {
      url,
      status,
      ...metadata,
    }
  );
}

/**
 * 网络错误上报
 */
export function reportNetworkError(
  url: string,
  error: Error,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  return reportError(
    error,
    'network-error',
    {
      url,
      ...metadata,
    }
  );
}

/**
 * 设置 Sentry 用户上下文
 * 用于跟踪特定用户的错误
 */
export function setSentryUser(user: {
  id: string;
  email?: string;
  username?: string;
  [key: string]: unknown;
}): void {
  Sentry.setUser(user);

  // Also store in window for error reporting
  if (typeof window !== 'undefined') {
    (window as any).__user_id__ = user.id;
  }
}

/**
 * 清除 Sentry 用户上下文
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);

  if (typeof window !== 'undefined') {
    delete (window as any).__user_id__;
  }
}

/**
 * 设置 Sentry 自定义上下文
 * 用于添加额外的上下文信息到所有错误
 */
export function setSentryContext(
  key: string,
  context: Record<string, unknown>
): void {
  Sentry.setContext(key, context);
}

/**
 * 设置 Sentry 自定义标签
 * 用于分组和过滤错误
 */
export function setSentryTag(key: string, value: string): void {
  Sentry.setTag(key, value);
}

/**
 * 设置 Sentry 自定义额外数据
 */
export function setSentryExtra(key: string, extra: unknown): void {
  Sentry.setExtra(key, extra);
}

/**
 * 添加 Sentry 面包屑
 * 用于跟踪用户操作路径
 */
export function addSentryBreadcrumb(
  message: string,
  category?: string,
  level?: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug'
): void {
  Sentry.addBreadcrumb({
    message,
    category: category || 'custom',
    level: level || 'info',
  });
}

export default {
  reportError,
  setupGlobalErrorHandler,
  reportApiError,
  reportNetworkError,
  setSentryUser,
  clearSentryUser,
  setSentryContext,
  setSentryTag,
  setSentryExtra,
  addSentryBreadcrumb,
};