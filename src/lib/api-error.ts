/**
 * 统一 API 错误处理工具
 * 
 * @deprecated 请使用 '@/lib/api-response' 中的新 API
 * 此文件保留用于向后兼容
 * 
 * @module lib/api-error
 */

import { NextRequest, NextResponse } from 'next/server';

// 重新导出新 API
export {
  apiHandler,
  createErrorResponse,
  
  apiError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessable,
  rateLimited,
  serverError,
  serviceUnavailable,

  success,
  paginated,
  created,

  validateRequired,
  validateString,
  validateRange,
  validateEnum,
  validateObject,
  validateArray,
  
  type ApiErrorResponse,
  type ApiSuccessResponse,
  type ApiResponse,
} from '@/lib/api-response';

// 从新模块导入
import {
  apiHandler as newApiHandler,
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
export const handleApiRequest = newApiHandler;

/**
 * @deprecated 使用 badRequest 代替
 */
export const apiServerError = serverError;

/**
 * @deprecated 使用 serverError 代替
 */
export function unknownError(request?: NextRequest): NextResponse {
  return serverError('发生未知错误', request);
}

export default {
  handleApiRequest,
  unknownError,
  apiServerError,
};
