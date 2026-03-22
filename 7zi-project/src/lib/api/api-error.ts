/**
 * API Error Types
 *
 * Standardized types for API error handling across the application
 */

/**
 * Standard API error codes
 */
export enum ApiErrorCode {
  // Success (not an error, but included for completeness)
  SUCCESS = 'SUCCESS',

  // Client Errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  CONFLICT = 'CONFLICT',
  UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',

  // Server Errors (5xx)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  BAD_GATEWAY = 'BAD_GATEWAY',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',

  // Network Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  CONNECTION_ERROR = 'CONNECTION_ERROR',

  // Application Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * HTTP status code to error code mapping
 */
export const STATUS_CODE_TO_ERROR: Record<number, ApiErrorCode> = {
  400: ApiErrorCode.BAD_REQUEST,
  401: ApiErrorCode.UNAUTHORIZED,
  403: ApiErrorCode.FORBIDDEN,
  404: ApiErrorCode.NOT_FOUND,
  405: ApiErrorCode.METHOD_NOT_ALLOWED,
  409: ApiErrorCode.CONFLICT,
  422: ApiErrorCode.UNPROCESSABLE_ENTITY,
  429: ApiErrorCode.TOO_MANY_REQUESTS,
  500: ApiErrorCode.INTERNAL_SERVER_ERROR,
  502: ApiErrorCode.BAD_GATEWAY,
  503: ApiErrorCode.SERVICE_UNAVAILABLE,
  504: ApiErrorCode.GATEWAY_TIMEOUT,
};

/**
 * Error code to HTTP status code mapping
 */
export const ERROR_CODE_TO_STATUS: Record<ApiErrorCode, number> = {
  [ApiErrorCode.SUCCESS]: 200,
  [ApiErrorCode.BAD_REQUEST]: 400,
  [ApiErrorCode.UNAUTHORIZED]: 401,
  [ApiErrorCode.FORBIDDEN]: 403,
  [ApiErrorCode.NOT_FOUND]: 404,
  [ApiErrorCode.METHOD_NOT_ALLOWED]: 405,
  [ApiErrorCode.CONFLICT]: 409,
  [ApiErrorCode.UNPROCESSABLE_ENTITY]: 422,
  [ApiErrorCode.TOO_MANY_REQUESTS]: 429,
  [ApiErrorCode.INTERNAL_SERVER_ERROR]: 500,
  [ApiErrorCode.BAD_GATEWAY]: 502,
  [ApiErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ApiErrorCode.GATEWAY_TIMEOUT]: 504,
  [ApiErrorCode.NETWORK_ERROR]: 503,
  [ApiErrorCode.TIMEOUT]: 504,
  [ApiErrorCode.CONNECTION_ERROR]: 503,
  [ApiErrorCode.VALIDATION_ERROR]: 400,
  [ApiErrorCode.PARSE_ERROR]: 400,
  [ApiErrorCode.UNKNOWN_ERROR]: 500,
};

/**
 * User-friendly error messages
 */
export const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  [ApiErrorCode.SUCCESS]: '操作成功',
  [ApiErrorCode.BAD_REQUEST]: '请求参数错误',
  [ApiErrorCode.UNAUTHORIZED]: '未授权，请登录',
  [ApiErrorCode.FORBIDDEN]: '没有权限执行此操作',
  [ApiErrorCode.NOT_FOUND]: '请求的资源不存在',
  [ApiErrorCode.METHOD_NOT_ALLOWED]: '不允许的请求方法',
  [ApiErrorCode.CONFLICT]: '资源冲突',
  [ApiErrorCode.UNPROCESSABLE_ENTITY]: '无法处理的实体',
  [ApiErrorCode.TOO_MANY_REQUESTS]: '请求过于频繁，请稍后再试',
  [ApiErrorCode.INTERNAL_SERVER_ERROR]: '服务器内部错误',
  [ApiErrorCode.BAD_GATEWAY]: '网关错误',
  [ApiErrorCode.SERVICE_UNAVAILABLE]: '服务暂时不可用',
  [ApiErrorCode.GATEWAY_TIMEOUT]: '网关超时',
  [ApiErrorCode.NETWORK_ERROR]: '网络连接失败',
  [ApiErrorCode.TIMEOUT]: '请求超时',
  [ApiErrorCode.CONNECTION_ERROR]: '连接错误',
  [ApiErrorCode.VALIDATION_ERROR]: '数据验证失败',
  [ApiErrorCode.PARSE_ERROR]: '数据解析错误',
  [ApiErrorCode.UNKNOWN_ERROR]: '未知错误',
};

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
  /** Error code */
  code: ApiErrorCode;
  /** Error message */
  message: string;
  /** Detailed error description */
  detail?: string;
  /** Validation errors */
  errors?: Record<string, string[]>;
  /** Error timestamp */
  timestamp: string;
  /** Request ID for tracing */
  requestId?: string;
  /** Error stack trace (development only) */
  stack?: string;
}

/**
 * Standard API success response structure
 */
export interface ApiSuccessResponse<T = unknown> {
  /** Success indicator */
  success: true;
  /** Response data */
  data: T;
  /** Response metadata */
  meta?: {
    /** Total items (for paginated responses) */
    total?: number;
    /** Current page (for paginated responses) */
    page?: number;
    /** Items per page (for paginated responses) */
    pageSize?: number;
    /** Total pages (for paginated responses) */
    totalPages?: number;
  };
  /** Timestamp */
  timestamp: string;
  /** Request ID for tracing */
  requestId?: string;
}

/**
 * Standard API response (union type)
 */
export type ApiResponse<T = unknown> =
  | ApiSuccessResponse<T>
  | ApiErrorResponse;

/**
 * API error class
 */
export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly statusCode: number;
  public readonly detail?: string;
  public readonly errors?: Record<string, string[]>;
  public readonly requestId?: string;

  constructor(options: {
    code?: ApiErrorCode;
    message?: string;
    statusCode?: number;
    detail?: string;
    errors?: Record<string, string[]>;
    requestId?: string;
    cause?: Error;
  }) {
    const {
      code = ApiErrorCode.UNKNOWN_ERROR,
      message = ERROR_MESSAGES[code],
      statusCode = ERROR_CODE_TO_STATUS[code],
      detail,
      errors,
      requestId,
      cause,
    } = options;

    super(message, { cause });

    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.detail = detail;
    this.errors = errors;
    this.requestId = requestId;
  }

  /**
   * Convert to API error response
   */
  toResponse(): ApiErrorResponse {
    return {
      code: this.code,
      message: this.message,
      detail: this.detail,
      errors: this.errors,
      timestamp: new Date().toISOString(),
      requestId: this.requestId,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
    };
  }

  /**
   * Create ApiError from HTTP status code
   */
  static fromStatusCode(
    statusCode: number,
    message?: string,
    detail?: string
  ): ApiError {
    const code = STATUS_CODE_TO_ERROR[statusCode] || ApiErrorCode.UNKNOWN_ERROR;
    return new ApiError({
      code,
      message: message || ERROR_MESSAGES[code],
      statusCode,
      detail,
    });
  }

  /**
   * Create ApiError from Error
   */
  static fromError(error: unknown): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    if (error instanceof Error) {
      return new ApiError({
        code: ApiErrorCode.UNKNOWN_ERROR,
        message: error.message,
        detail: error.stack,
        cause: error,
      });
    }

    return new ApiError({
      code: ApiErrorCode.UNKNOWN_ERROR,
      message: String(error),
    });
  }
}

/**
 * Validation error class
 */
export class ValidationError extends ApiError {
  constructor(
    errors: Record<string, string[]>,
    message: string = '数据验证失败'
  ) {
    super({
      code: ApiErrorCode.VALIDATION_ERROR,
      message,
      errors,
    });
    this.name = 'ValidationError';
  }
}
