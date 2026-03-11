/**
 * Test Type Definitions
 * 
 * 这个文件定义了测试中使用的类型，用于替换 any 类型。
 * 这些类型用于测试断言中的回调参数。
 */

import type { Task } from '@/lib/types/task-types';
import type { TokenPayload } from '@/lib/security/auth';

/**
 * Status API 返回的服务对象
 */
export interface StatusApiService {
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  uptime: number;
  responseTime: number;
}

/**
 * Status API 响应结构
 */
export interface StatusApiResponse {
  status: 'operational' | 'degraded' | 'outage';
  lastUpdated: string;
  services: StatusApiService[];
  metrics: {
    requests: number;
    errors: number;
    avgResponseTime: number;
    p95ResponseTime: number;
  };
  incidents: unknown[];
  maintenance: unknown[];
}

/**
 * Knowledge Node API 返回的节点对象
 */
export interface KnowledgeNodeApiResponse {
  id: string;
  content: string;
  type: string;
  source?: string;
  weight?: number;
  confidence?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
  embedding?: number[];
  timestamp?: number;
}

/**
 * Knowledge Edge API 返回的边对象
 */
export interface KnowledgeEdgeApiResponse {
  id: string;
  from: string;
  to: string;
  relation: string;
  weight?: number;
}

/**
 * 用于 verifyToken mock 的最小 TokenPayload
 */
export type MockTokenPayload = Pick<TokenPayload, 'sub' | 'role' | 'email'> & Partial<TokenPayload>;

/**
 * Mock 任务对象（用于测试断言）
 */
export type MockTask = Pick<Task, 'status' | 'type' | 'assignee'> & Partial<Task>;
