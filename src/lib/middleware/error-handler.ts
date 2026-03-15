/**
 * 统一错误处理中间件
 * 
 * @deprecated 请使用 '@/lib/api-response' 中的新 API
 * 此文件保留用于向后兼容
 * 
 * @module lib/middleware/error-handler
 */

import { NextRequest, NextResponse } from 'next/server';

// 重新导出新 API
export {
  apiHandler,
  createErrorResponse,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
  success,
  paginated,
  validateRequired,
  validateString,
  validateRange,
  validateEnum,
  type ApiErrorResponse,
  type ApiSuccessResponse,
  type ApiResponse,
} from '@/lib/api-response';

// 从新模块导入
import {
  apiHandler as newApiHandler,
  createErrorResponse as newCreateErrorResponse,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
  success,
  paginated,
} from '@/lib/api-response';

/**
 * @deprecated 使用 apiHandler 代替
 */
export const withErrorHandler = newApiHandler;

/**
 * @deprecated 使用 badRequest 代替
 */
export function validationError(
  message: string,
  field?: string,
  request?: NextRequest
): NextResponse {
  return badRequest(message, field ? { field } : undefined, request);
}

/**
 * @deprecated 使用 notFound 代替
 */
export function notFoundError(
  resource: string = '资源',
  id?: string,
  request?: NextRequest
): NextResponse {
  return notFound(resource, id, request);
}

/**
 * @deprecated 使用 unauthorized 代替
 */
export function authError(
  message: string = '需要登录才能访问',
  request?: NextRequest
): NextResponse {
  return unauthorized(message, request);
}

/**
 * @deprecated 使用 forbidden 代替
 */
export function forbiddenError(
  message: string = '没有权限访问',
  request?: NextRequest
): NextResponse {
  return forbidden(message, request);
}

/**
 * @deprecated 使用 serverError 代替
 */
export function serverErrorResponse(
  message: string = '服务器内部错误',
  request?: NextRequest
): NextResponse {
  return serverError(message, request);
}

/**
 * @deprecated 使用 success 代替
 */
export const successResponse = success;

/**
 * @deprecated 使用 paginated 代替
 */
export const paginatedResponse = paginated;

export default {
  createErrorResponse: newCreateErrorResponse,
  withErrorHandler,
  validationError,
  notFoundError,
  authError,
  forbiddenError,
  serverError,
  successResponse,
  paginatedResponse,
};
