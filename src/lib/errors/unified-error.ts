/**
 * 统一错误类
 * Unified Error Class
 *
 * 提供统一的错误类,用于创建和抛出结构化错误。
 */

import {
  UnifiedErrorType,
  UnifiedErrorInfo,
  isRetryableErrorType,
  getDefaultStatusCode,
  ErrorCodes,
} from './unified-types';

/**
 * 统一应用错误类
 * Unified Application Error Class
 *
 * 所有应用错误都应该使用这个类或其子类。
 */
export class UnifiedAppError extends Error implements UnifiedErrorInfo {
  /**
   * 错误类型
   */
  public readonly type: UnifiedErrorType;

  /**
   * 错误代码 (用于国际化)
   */
  public readonly code?: string;

  /**
   * HTTP 状态码
   */
  public readonly statusCode: number;

  /**
   * 额外的错误详情
   */
  public readonly details?: Record<string, unknown>;

  /**
   * 是否可重试
   */
  public readonly retryable: boolean;

  /**
   * 重试等待时间 (秒)
   */
  public readonly retryAfter?: number;

  /**
   * 错误时间戳
   */
  public readonly timestamp: string;

  constructor(
    type: UnifiedErrorType,
    message: string,
    statusCode?: number,
    details?: Record<string, unknown>,
    retryable?: boolean,
    retryAfter?: number,
    code?: string
  ) {
    super(message);

    // 设置错误名称
    this.name = 'UnifiedAppError';

    // 设置类型
    this.type = type;

    // 设置状态码 (自动判断或使用提供的值)
    this.statusCode = statusCode ?? getDefaultStatusCode(type);

    // 设置详情
    this.details = details;

    // 设置可重试标志 (自动判断或使用提供的值)
    this.retryable = retryable ?? isRetryableErrorType(type);

    // 设置重试等待时间
    this.retryAfter = retryAfter;

    // 设置错误代码
    this.code = code;

    // 设置时间戳
    this.timestamp = new Date().toISOString();

    // 保持正确的堆栈跟踪 (仅限 V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnifiedAppError);
    }
  }

  /**
   * 转换为纯对象 (用于日志记录)
   */
  toJSON(): UnifiedErrorInfo {
    return {
      type: this.type,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      retryable: this.retryable,
      retryAfter: this.retryAfter,
    };
  }

  /**
   * 创建验证错误
   */
  static validation(message: string, details?: Record<string, unknown>): UnifiedAppError {
    return new UnifiedAppError(
      UnifiedErrorType.VALIDATION,
      message,
      400,
      details,
      false,
      undefined,
      ErrorCodes.VALIDATION_ERROR
    );
  }

  /**
   * 创建未找到错误
   */
  static notFound(message: string, details?: Record<string, unknown>): UnifiedAppError {
    return new UnifiedAppError(
      UnifiedErrorType.NOT_FOUND,
      message,
      404,
      details,
      false,
      undefined,
      ErrorCodes.NOT_FOUND
    );
  }

  /**
   * 创建未授权错误
   */
  static unauthorized(message: string = 'Unauthorized access'): UnifiedAppError {
    return new UnifiedAppError(
      UnifiedErrorType.UNAUTHORIZED,
      message,
      401,
      undefined,
      false,
      undefined,
      ErrorCodes.UNAUTHORIZED
    );
  }

  /**
   * 创建禁止访问错误
   */
  static forbidden(message: string = 'Access forbidden'): UnifiedAppError {
    return new UnifiedAppError(
      UnifiedErrorType.FORBIDDEN,
      message,
      403,
      undefined,
      false,
      undefined,
      ErrorCodes.FORBIDDEN
    );
  }

  /**
   * 创建速率限制错误
   */
  static rateLimit(message: string = 'Rate limit exceeded', retryAfter?: number): UnifiedAppError {
    return new UnifiedAppError(
      UnifiedErrorType.RATE_LIMIT,
      message,
      429,
      undefined,
      true,
      retryAfter,
      ErrorCodes.RATE_LIMIT
    );
  }

  /**
   * 创建内部错误
   */
  static internal(message: string = 'Internal server error', details?: Record<string, unknown>): UnifiedAppError {
    return new UnifiedAppError(
      UnifiedErrorType.INTERNAL,
      message,
      500,
      details,
      true,
      undefined,
      ErrorCodes.SERVER_ERROR
    );
  }

  /**
   * 创建服务不可用错误
   */
  static serviceUnavailable(message: string = 'Service temporarily unavailable', retryAfter?: number): UnifiedAppError {
    return new UnifiedAppError(
      UnifiedErrorType.SERVICE_UNAVAILABLE,
      message,
      503,
      undefined,
      true,
      retryAfter
    );
  }

  /**
   * 创建网络错误
   */
  static network(message: string = 'Network error', retryAfter?: number): UnifiedAppError {
    return new UnifiedAppError(
      UnifiedErrorType.NETWORK_ERROR,
      message,
      503,
      undefined,
      true,
      retryAfter,
      ErrorCodes.NETWORK_ERROR
    );
  }

  /**
   * 创建超时错误
   */
  static timeout(message: string = 'Request timeout', retryAfter?: number): UnifiedAppError {
    return new UnifiedAppError(
      UnifiedErrorType.TIMEOUT,
      message,
      504,
      undefined,
      true,
      retryAfter
    );
  }

  /**
   * 创建注册失败错误
   */
  static registrationFailed(message: string = 'Registration failed', details?: Record<string, unknown>): UnifiedAppError {
    return new UnifiedAppError(
      UnifiedErrorType.REGISTRATION_FAILED,
      message,
      400,
      details,
      false,
      undefined,
      ErrorCodes.REGISTRATION_FAILED
    );
  }

  /**
   * 创建弱密码错误
   */
  static weakPassword(message: string = 'Password is too weak', details?: Record<string, unknown>): UnifiedAppError {
    return new UnifiedAppError(
      UnifiedErrorType.WEAK_PASSWORD,
      message,
      400,
      details,
      false,
      undefined,
      ErrorCodes.WEAK_PASSWORD
    );
  }

  /**
   * 创建缺失令牌错误
   */
  static missingToken(message: string = 'Authentication token is missing'): UnifiedAppError {
    return new UnifiedAppError(
      UnifiedErrorType.MISSING_TOKEN,
      message,
      401,
      undefined,
      false,
      undefined,
      ErrorCodes.UNAUTHORIZED
    );
  }

  /**
   * 创建冲突错误
   */
  static conflict(message: string, details?: Record<string, unknown>): UnifiedAppError {
    return new UnifiedAppError(
      UnifiedErrorType.CONFLICT,
      message,
      409,
      details,
      false
    );
  }
}

/**
 * 从普通错误创建统一错误
 * Create a unified error from a generic error
 */
export function toUnifiedError(error: unknown): UnifiedAppError {
  // 如果已经是 UnifiedAppError,直接返回
  if (error instanceof UnifiedAppError) {
    return error;
  }

  // 如果是普通 Error 对象
  if (error instanceof Error) {
    // 尝试从消息推断错误类型
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return UnifiedAppError.network(error.message);
    }

    if (message.includes('timeout')) {
      return UnifiedAppError.timeout(error.message);
    }

    if (message.includes('not found') || message.includes('404')) {
      return UnifiedAppError.notFound(error.message);
    }

    if (message.includes('unauthorized') || message.includes('401')) {
      return UnifiedAppError.unauthorized(error.message);
    }

    if (message.includes('forbidden') || message.includes('403')) {
      return UnifiedAppError.forbidden(error.message);
    }

    if (message.includes('rate limit') || message.includes('429')) {
      return UnifiedAppError.rateLimit(error.message);
    }

    // 默认返回内部错误
    return UnifiedAppError.internal(error.message);
  }

  // 如果是字符串
  if (typeof error === 'string') {
    return UnifiedAppError.internal(error);
  }

  // 默认返回内部错误
  return UnifiedAppError.internal('An unknown error occurred');
}

/**
 * 判断是否为统一错误
 * Check if an error is a unified error
 */
export function isUnifiedError(error: unknown): error is UnifiedAppError {
  return error instanceof UnifiedAppError;
}

/**
 * 从错误中提取信息
 * Extract error information from an error
 */
export function extractErrorInfo(error: unknown): UnifiedErrorInfo {
  const unifiedError = toUnifiedError(error);
  return unifiedError.toJSON();
}
