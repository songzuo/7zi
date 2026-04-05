/**
 * Workflow Version Type Definitions
 * @version 1.12.0
 * @date 2026-04-04
 */

// ============================================
// Workflow Version Types
// ============================================

export interface WorkflowVersion {
  id: string
  workflowId: string
  version: string
  name: string
  description?: string
  definition: WorkflowDefinition
  createdAt: string
  createdBy: string
  metadata?: {
    changeType: 'create' | 'update' | 'rollback'
    changeDescription?: string
    sourceVersion?: string
  }
}

export interface WorkflowDefinition {
  nodes: Array<{
    id: string
    type: string
    data: Record<string, unknown>
    position: { x: number; y: number }
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    condition?: string
  }>
  variables?: Array<{
    name: string
    type: string
    defaultValue?: unknown
  }>
}

export interface CreateWorkflowVersionDTO {
  workflowId: string
  version: string
  name: string
  description?: string
  definition: WorkflowDefinition
  changeType?: 'create' | 'update' | 'rollback'
  changeDescription?: string
  sourceVersion?: string
}

export interface RollbackWorkflowDTO {
  versionId: string
  rollbackBy: string
  rollbackReason?: string
}

// ============================================
// Version History Query Types
// ============================================

export interface WorkflowVersionHistoryQuery {
  workflowId?: string
  version?: string
  changeType?: 'create' | 'update' | 'rollback'
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

// ============================================
// API Response Types
// ============================================

export interface WorkflowVersionHistoryResponse {
  versions: WorkflowVersion[]
  total: number
  page: number
  pageSize: number
}

export interface RollbackResponse {
  currentVersion: WorkflowVersion
  previousVersion: WorkflowVersion
  rollbackAt: string
}
