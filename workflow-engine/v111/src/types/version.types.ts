/**
 * OpenClaw Workflow Engine v1.11.0
 * Version Control Type Definitions
 */

import { IWorkflow } from './workflow.types';

// ============================================================================
// Workflow Version Types
// ============================================================================

/**
 * 工作流版本记录
 */
export interface IWorkflowVersion {
  id: string;
  workflowId: string;
  version: string;
  parentVersionId?: string;
  branch?: string;
  workflow: IWorkflow;
  changeSummary: string;
  changes: IChange[];
  createdBy?: string;
  createdAt: Date;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * 版本变更记录
 */
export interface IChange {
  type: ChangeType;
  path: string;
  oldValue?: any;
  newValue?: any;
  description?: string;
}

/**
 * 变更类型
 */
export enum ChangeType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  MOVE = 'move'
}

/**
 * 版本差异
 */
export interface IVersionDiff {
  versionId1: string;
  versionId2: string;
  workflowId: string;
  changes: IChange[];
  summary: IDiffSummary;
  createdAt: Date;
}

/**
 * 差异摘要
 */
export interface IDiffSummary {
  totalChanges: number;
  addedNodes: number;
  removedNodes: number;
  modifiedNodes: number;
  addedEdges: number;
  removedEdges: number;
  modifiedEdges: number;
  modifiedConfig: number;
}

/**
 * 版本分支
 */
export interface IVersionBranch {
  name: string;
  workflowId: string;
  headVersionId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  description?: string;
}

/**
 * 版本标签
 */
export interface IVersionTag {
  name: string;
  versionId: string;
  workflowId: string;
  createdAt: Date;
  createdBy?: string;
  description?: string;
}

/**
 * 版本回滚请求
 */
export interface IRollbackRequest {
  versionId: string;
  createNewVersion?: boolean;
  changeSummary?: string;
}

/**
 * 版本回滚结果
 */
export interface IRollbackResult {
  success: boolean;
  workflowId: string;
  previousVersionId: string;
  newVersionId?: string;
  message: string;
}

/**
 * 版本列表查询参数
 */
export interface IVersionListQuery {
  workflowId: string;
  branch?: string;
  tag?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'version';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 版本对比请求
 */
export interface IDiffRequest {
  versionId1: string;
  versionId2: string;
  includeDetails?: boolean;
}