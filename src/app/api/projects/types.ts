/**
 * Project API Types
 * 项目 API 类型定义
 */

// ============================================================================
// Project Types
// ============================================================================

/**
 * 项目状态
 */
export enum ProjectStatus {
  ACTIVE = 'active',
  IN_PROGRESS = 'in-progress',
  ON_HOLD = 'on-hold',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

/**
 * 项目优先级
 */
export enum ProjectPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * 项目实体
 */
export interface Project {
  /** 项目 ID */
  id: number;
  /** 项目名称 */
  name: string;
  /** 项目描述 */
  description: string;
  /** 项目状态 */
  status: ProjectStatus;
  /** 项目优先级 */
  priority: ProjectPriority;
  /** 进度百分比 (0-100) */
  progress: number;
  /** 所有者用户 ID */
  ownerId: string;
  /** 开始日期 */
  startDate: string | null;
  /** 结束日期 */
  endDate: string | null;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 项目成员
 */
export interface ProjectMember {
  id: number;
  projectId: number;
  userId: string;
  role: string;
  joinedAt: string;
}

/**
 * 项目统计
 */
export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  onHoldProjects: number;
  archivedProjects: number;
}

// ============================================================================
// API Request Types
// ============================================================================

/**
 * 创建项目请求
 */
export interface CreateProjectRequest {
  name: string;
  description: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  progress?: number;
  startDate?: string | null;
  endDate?: string | null;
}

/**
 * 更新项目请求
 */
export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  progress?: number;
  startDate?: string | null;
  endDate?: string | null;
}

/**
 * 项目列表查询参数
 */
export interface ListProjectsQuery {
  page?: number;
  limit?: number;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  ownerId?: string;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'priority' | 'progress';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * 项目列表响应
 */
export interface ListProjectsResponse {
  success: boolean;
  data: Project[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * 项目详情响应
 */
export interface ProjectResponse {
  success: boolean;
  data: Project | null;
}

/**
 * 创建项目响应
 */
export interface CreateProjectResponse {
  success: boolean;
  data: Project | null;
  message?: string;
}

/**
 * 更新项目响应
 */
export interface UpdateProjectResponse {
  success: boolean;
  data: Project | null;
  message?: string;
}

/**
 * 删除项目响应
 */
export interface DeleteProjectResponse {
  success: boolean;
  message: string;
}

/**
 * 错误响应
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}
