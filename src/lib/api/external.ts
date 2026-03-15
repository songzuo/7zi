/**
 * 外部 API 调用工具
 * 提供统一的超时、重试和错误处理
 * 
 * @module lib/api/external
 */

import { AppError, ErrorCodes, ErrorCategory, ErrorSeverity } from '@/lib/errors';
import { apiLogger } from '@/lib/logger';

/**
 * 外部 API 调用配置
 */
export interface ExternalApiOptions {
  /** 请求超时时间 (毫秒), 默认 10000 */
  timeout?: number;
  /** 重试次数, 默认 0 */
  retries?: number;
  /** 重试延迟 (毫秒), 默认 1000 */
  retryDelay?: number;
  /** 重试条件函数 */
  retryCondition?: (error: unknown) => boolean;
  /** 请求头 */
  headers?: Record<string, string>;
  /** 是否记录请求/响应 (生产环境默认关闭) */
  logging?: boolean;
}

/**
 * 默认配置
 */
const DEFAULT_OPTIONS: Required<Omit<ExternalApiOptions, 'retryCondition' | 'headers'>> = {
  timeout: 10000,
  retries: 0,
  retryDelay: 1000,
  logging: process.env.NODE_ENV === 'development',
};

/**
 * 默认重试条件: 网络错误或 5xx 响应
 */
const defaultRetryCondition = (error: unknown): boolean => {
  if (error instanceof AppError) {
    return (
      error.code === ErrorCodes.NETWORK_ERROR ||
      error.code === ErrorCodes.TIMEOUT ||
      error.code === ErrorCodes.SERVICE_UNAVAILABLE
    );
  }
  return error instanceof TypeError; // 网络错误通常是 TypeError
};

/**
 * 创建带超时的 AbortController
 */
function createTimeoutController(timeout: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeout);
  return controller;
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 将 HTTP 响应转换为 AppError
 */
function responseToError(response: Response, url: string): AppError {
  const statusCode = response.status;
  
  // 根据状态码映射错误类型
  if (statusCode === 401) {
    return new AppError(`External API unauthorized: ${url}`, {
      code: ErrorCodes.UNAUTHORIZED,
      category: ErrorCategory.EXTERNAL_SERVICE,
      severity: ErrorSeverity.WARNING,
      userMessage: '外部服务认证失败',
      context: { statusCode, url },
    });
  }
  
  if (statusCode === 403) {
    return new AppError(`External API forbidden: ${url}`, {
      code: ErrorCodes.FORBIDDEN,
      category: ErrorCategory.EXTERNAL_SERVICE,
      severity: ErrorSeverity.WARNING,
      userMessage: '没有权限访问外部服务',
      context: { statusCode, url },
    });
  }
  
  if (statusCode === 404) {
    return new AppError(`External API not found: ${url}`, {
      code: ErrorCodes.NOT_FOUND,
      category: ErrorCategory.EXTERNAL_SERVICE,
      severity: ErrorSeverity.WARNING,
      userMessage: '外部服务资源不存在',
      context: { statusCode, url },
    });
  }
  
  if (statusCode === 429) {
    return new AppError(`External API rate limited: ${url}`, {
      code: ErrorCodes.RATE_LIMITED,
      category: ErrorCategory.EXTERNAL_SERVICE,
      severity: ErrorSeverity.WARNING,
      userMessage: '请求过于频繁，请稍后再试',
      context: { statusCode, url },
    });
  }
  
  if (statusCode >= 500) {
    return new AppError(`External API server error: ${url}`, {
      code: ErrorCodes.EXTERNAL_SERVICE_ERROR,
      category: ErrorCategory.EXTERNAL_SERVICE,
      severity: ErrorSeverity.ERROR,
      userMessage: '外部服务暂时不可用',
      context: { statusCode, url },
    });
  }
  
  // 其他 4xx 错误
  return new AppError(`External API error (${statusCode}): ${url}`, {
    code: ErrorCodes.EXTERNAL_SERVICE_ERROR,
    category: ErrorCategory.EXTERNAL_SERVICE,
    severity: ErrorSeverity.WARNING,
    userMessage: '外部服务请求失败',
    context: { statusCode, url },
  });
}

/**
 * 外部 API 调用包装器
 * 
 * @example
 * ```ts
 * const data = await externalApi.fetch('https://api.example.com/data', {
 *   timeout: 5000,
 *   retries: 2,
 * });
 * ```
 */
export const externalApi = {
  /**
   * 发起 GET 请求
   */
  async get<T = unknown>(url: string, options: ExternalApiOptions = {}): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' });
  },

  /**
   * 发起 POST 请求
   */
  async post<T = unknown>(url: string, body: unknown, options: ExternalApiOptions = {}): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /**
   * 发起 PUT 请求
   */
  async put<T = unknown>(url: string, body: unknown, options: ExternalApiOptions = {}): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  /**
   * 发起 DELETE 请求
   */
  async delete<T = unknown>(url: string, options: ExternalApiOptions = {}): Promise<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  },

  /**
   * 通用请求方法
   */
  async request<T = unknown>(
    url: string,
    options: ExternalApiOptions & {
      method?: string;
      body?: string;
    } = {}
  ): Promise<T> {
    const {
      timeout = DEFAULT_OPTIONS.timeout,
      retries = DEFAULT_OPTIONS.retries,
      retryDelay = DEFAULT_OPTIONS.retryDelay,
      retryCondition = defaultRetryCondition,
      headers = {},
      logging = DEFAULT_OPTIONS.logging,
      method = 'GET',
      body,
    } = options;

    let lastError: unknown;
    let attempt = 0;

    while (attempt <= retries) {
      attempt++;

      try {
        // 创建超时控制器
        const controller = createTimeoutController(timeout);

        // 构建请求头
        const requestHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          ...headers,
        };

        if (logging) {
          apiLogger.debug(`[External API] ${method} ${url}`, {
            attempt,
            timeout,
            headers: Object.keys(requestHeaders),
          });
        }

        // 发起请求
        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body,
          signal: controller.signal,
        });

        // 检查响应状态
        if (!response.ok) {
          throw responseToError(response, url);
        }

        // 解析响应
        const contentType = response.headers.get('content-type');
        let data: T;

        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text() as T;
        }

        if (logging) {
          apiLogger.debug(`[External API] Response received`, {
            status: response.status,
            url,
          });
        }

        return data;
      } catch (error) {
        lastError = error;

        // 处理超时
        if (error instanceof Error && error.name === 'AbortError') {
          lastError = new AppError(`External API timeout: ${url}`, {
            code: ErrorCodes.TIMEOUT,
            category: ErrorCategory.EXTERNAL_SERVICE,
            severity: ErrorSeverity.WARNING,
            userMessage: '请求超时，请稍后重试',
            context: { url, timeout },
          });
        }

        // 检查是否应该重试
        if (attempt <= retries && retryCondition(lastError)) {
          if (logging) {
            apiLogger.warn(`[External API] Retrying (${attempt}/${retries})`, {
              url,
              error: lastError instanceof Error ? lastError.message : String(lastError),
            });
          }
          await delay(retryDelay * attempt); // 指数退避
          continue;
        }

        // 不重试或重试次数用尽
        break;
      }
    }

    // 转换未知错误
    if (!(lastError instanceof AppError)) {
      lastError = new AppError(
        `External API error: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
        {
          code: ErrorCodes.EXTERNAL_SERVICE_ERROR,
          category: ErrorCategory.EXTERNAL_SERVICE,
          severity: ErrorSeverity.ERROR,
          userMessage: '外部服务请求失败',
          context: { url },
          cause: lastError instanceof Error ? lastError : undefined,
        }
      );
    }

    // 记录错误
    apiLogger.error(`[External API] Request failed`, {
      url,
      method,
      attempt,
      error: lastError instanceof AppError ? lastError.userMessage : String(lastError),
    });

    throw lastError;
  },
};

/**
 * 创建预配置的外部 API 客户端
 * 
 * @example
 * ```ts
 * const githubApi = createExternalClient({
 *   baseUrl: 'https://api.github.com',
 *   headers: { Authorization: `Bearer ${token}` },
 *   timeout: 5000,
 * });
 * 
 * const repos = await githubApi.get('/user/repos');
 * ```
 */
export function createExternalClient(baseOptions: ExternalApiOptions & { baseUrl?: string }) {
  const { baseUrl, ...defaultOpts } = baseOptions;

  return {
    get<T = unknown>(path: string, options?: ExternalApiOptions): Promise<T> {
      const url = baseUrl ? `${baseUrl}${path}` : path;
      return externalApi.get<T>(url, { ...defaultOpts, ...options });
    },

    post<T = unknown>(path: string, body: unknown, options?: ExternalApiOptions): Promise<T> {
      const url = baseUrl ? `${baseUrl}${path}` : path;
      return externalApi.post<T>(url, body, { ...defaultOpts, ...options });
    },

    put<T = unknown>(path: string, body: unknown, options?: ExternalApiOptions): Promise<T> {
      const url = baseUrl ? `${baseUrl}${path}` : path;
      return externalApi.put<T>(url, body, { ...defaultOpts, ...options });
    },

    delete<T = unknown>(path: string, options?: ExternalApiOptions): Promise<T> {
      const url = baseUrl ? `${baseUrl}${path}` : path;
      return externalApi.delete<T>(url, { ...defaultOpts, ...options });
    },
  };
}

export default externalApi;
