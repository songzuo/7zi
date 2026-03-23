/**
 * Project API Validation
 * 项目 API 验证工具
 */

import { createAppError, ErrorCodes } from '@/lib/errors';
import {
  CreateProjectRequest,
  UpdateProjectRequest,
  ListProjectsQuery,
  ProjectStatus,
  ProjectPriority,
} from './types';

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * 验证项目名称
 */
function validateProjectName(name: unknown): asserts name is string {
  if (typeof name !== 'string') {
    throw createAppError('Project name must be a string', ErrorCodes.VALIDATION);
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw createAppError('Project name cannot be empty', ErrorCodes.VALIDATION);
  }

  if (trimmed.length > 100) {
    throw createAppError('Project name cannot exceed 100 characters', ErrorCodes.VALIDATION);
  }
}

/**
 * 验证项目描述
 */
function validateProjectDescription(description: unknown): asserts description is string {
  if (typeof description !== 'string') {
    throw createAppError('Project description must be a string', ErrorCodes.VALIDATION);
  }

  if (description.length > 1000) {
    throw createAppError('Project description cannot exceed 1000 characters', ErrorCodes.VALIDATION);
  }
}

/**
 * 验证项目状态
 */
function validateProjectStatus(status: unknown): asserts status is ProjectStatus {
  if (!status) return; // Optional field

  const validStatuses = Object.values(ProjectStatus);
  if (!validStatuses.includes(status as ProjectStatus)) {
    throw createAppError(
      `Invalid project status. Must be one of: ${validStatuses.join(', ')}`,
      ErrorCodes.VALIDATION
    );
  }
}

/**
 * 验证项目优先级
 */
function validateProjectPriority(priority: unknown): asserts priority is ProjectPriority {
  if (!priority) return; // Optional field

  const validPriorities = Object.values(ProjectPriority);
  if (!validPriorities.includes(priority as ProjectPriority)) {
    throw createAppError(
      `Invalid project priority. Must be one of: ${validPriorities.join(', ')}`,
      ErrorCodes.VALIDATION
    );
  }
}

/**
 * 验证进度值
 */
function validateProgress(progress: unknown): asserts progress is number {
  if (progress === undefined || progress === null) return; // Optional field

  if (typeof progress !== 'number') {
    throw createAppError('Progress must be a number', ErrorCodes.VALIDATION);
  }

  if (progress < 0 || progress > 100) {
    throw createAppError('Progress must be between 0 and 100', ErrorCodes.VALIDATION);
  }

  if (!Number.isInteger(progress)) {
    throw createAppError('Progress must be an integer', ErrorCodes.VALIDATION);
  }
}

/**
 * 验证日期
 */
function validateDate(date: unknown): asserts date is string | null {
  if (date === null || date === undefined || date === '') return; // Optional field

  if (typeof date !== 'string') {
    throw createAppError('Date must be a string', ErrorCodes.VALIDATION);
  }

  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    throw createAppError('Invalid date format', ErrorCodes.VALIDATION);
  }
}

/**
 * 验证分页参数
 */
function validatePagination(page: unknown, limit: unknown): {
  page: number;
  limit: number;
} {
  const validatedPage = typeof page === 'number' ? Math.max(1, page) : 1;
  const validatedLimit = typeof limit === 'number' ? Math.min(100, Math.max(1, limit)) : 20;

  return { page: validatedPage, limit: validatedLimit };
}

/**
 * 验证排序参数
 */
function validateSortParams(
  sortBy: unknown,
  sortOrder: unknown
): { sortBy: string; sortOrder: 'asc' | 'desc' } {
  const validSortBy = ['createdAt', 'updatedAt', 'name', 'priority', 'progress'];
  const validatedSortBy = validSortBy.includes(sortBy as string)
    ? (sortBy as string)
    : 'createdAt';

  const validSortOrder = ['asc', 'desc'];
  const validatedSortOrder = validSortOrder.includes(sortOrder as string)
    ? (sortOrder as 'asc' | 'desc')
    : 'desc';

  return { sortBy: validatedSortBy, sortOrder: validatedSortOrder };
}

// ============================================================================
// Request Validation
// ============================================================================

/**
 * 验证创建项目请求
 */
export function validateCreateProjectRequest(data: unknown): CreateProjectRequest {
  if (!data || typeof data !== 'object') {
    throw createAppError('Request body must be an object', ErrorCodes.VALIDATION);
  }

  const request = data as Record<string, unknown>;

  // Required fields
  validateProjectName(request.name);
  validateProjectDescription(request.description);

  // Optional fields
  if (request.status !== undefined) {
    validateProjectStatus(request.status);
  }

  if (request.priority !== undefined) {
    validateProjectPriority(request.priority);
  }

  if (request.progress !== undefined) {
    validateProgress(request.progress);
  }

  if (request.startDate !== undefined) {
    validateDate(request.startDate);
  }

  if (request.endDate !== undefined) {
    validateDate(request.endDate);
  }

  return {
    name: request.name.trim(),
    description: request.description.trim(),
    status: request.status || ProjectStatus.ACTIVE,
    priority: request.priority || ProjectPriority.MEDIUM,
    progress: request.progress ?? 0,
    startDate: request.startDate || null,
    endDate: request.endDate || null,
  };
}

/**
 * 验证更新项目请求
 */
export function validateUpdateProjectRequest(data: unknown): UpdateProjectRequest {
  if (!data || typeof data !== 'object') {
    throw createAppError('Request body must be an object', ErrorCodes.VALIDATION);
  }

  const request = data as Record<string, unknown>;

  // All fields are optional for update
  if (request.name !== undefined) {
    validateProjectName(request.name);
  }

  if (request.description !== undefined) {
    validateProjectDescription(request.description);
  }

  if (request.status !== undefined) {
    validateProjectStatus(request.status);
  }

  if (request.priority !== undefined) {
    validateProjectPriority(request.priority);
  }

  if (request.progress !== undefined) {
    validateProgress(request.progress);
  }

  if (request.startDate !== undefined) {
    validateDate(request.startDate);
  }

  if (request.endDate !== undefined) {
    validateDate(request.endDate);
  }

  const result: UpdateProjectRequest = {};

  if (request.name !== undefined) result.name = request.name.trim();
  if (request.description !== undefined) result.description = request.description.trim();
  if (request.status !== undefined) result.status = request.status;
  if (request.priority !== undefined) result.priority = request.priority;
  if (request.progress !== undefined) result.progress = request.progress;
  if (request.startDate !== undefined) result.startDate = request.startDate;
  if (request.endDate !== undefined) result.endDate = request.endDate;

  return result;
}

/**
 * 验证项目列表查询参数
 */
export function validateListProjectsQuery(params: URLSearchParams): ListProjectsQuery {
  const query: ListProjectsQuery = {};

  // Pagination
  const page = params.get('page');
  const limit = params.get('limit');
  if (page || limit) {
    const pagination = validatePagination(
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined
    );
    query.page = pagination.page;
    query.limit = pagination.limit;
  }

  // Filters
  const status = params.get('status');
  if (status) {
    validateProjectStatus(status);
    query.status = status as ProjectStatus;
  }

  const priority = params.get('priority');
  if (priority) {
    validateProjectPriority(priority);
    query.priority = priority as ProjectPriority;
  }

  const ownerId = params.get('ownerId');
  if (ownerId) {
    query.ownerId = ownerId;
  }

  const search = params.get('search');
  if (search) {
    if (search.length > 100) {
      throw createAppError('Search term cannot exceed 100 characters', ErrorCodes.VALIDATION);
    }
    query.search = search;
  }

  // Sorting
  const sortBy = params.get('sortBy');
  const sortOrder = params.get('sortOrder');
  const sort = validateSortParams(sortBy, sortOrder);
  query.sortBy = sort.sortBy as any;
  query.sortOrder = sort.sortOrder;

  return query;
}

/**
 * 验证项目 ID
 */
export function validateProjectId(id: string): number {
  const numId = parseInt(id, 10);

  if (isNaN(numId)) {
    throw createAppError('Invalid project ID', ErrorCodes.VALIDATION);
  }

  if (numId <= 0) {
    throw createAppError('Project ID must be a positive integer', ErrorCodes.VALIDATION);
  }

  return numId;
}
