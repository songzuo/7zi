/**
 * OpenClaw Workflow Engine v1.11.0
 * Version Control Service
 */

import { v4 as uuidv4 } from 'uuid';
import { ILogger } from '../logging/Logger';
import { RedisStorage } from '../storage/RedisStorage';
import { IWorkflow } from '../types/workflow.types';
import {
  IWorkflowVersion,
  IChange,
  ChangeType,
  IVersionDiff,
  IDiffSummary,
  IVersionBranch,
  IVersionTag,
  IRollbackRequest,
  IRollbackResult,
  IVersionListQuery,
  IDiffRequest,
  IChange as IVersionChange
} from '../types/version.types';

/**
 * 版本控制服务
 * 提供工作流版本管理、差异计算、分支和回滚功能
 */
export class VersionControlService {
  private storage: RedisStorage;
  private logger: ILogger;
  private readonly prefix = 'openclaw:workflow:version';

  constructor(storage: RedisStorage, logger: ILogger) {
    this.storage = storage;
    this.logger = logger;
  }

  // ============================================================================
  // Version Creation
  // ============================================================================

  /**
   * 创建新版本
   * 当工作流被修改时自动调用
   */
  async createVersion(
    workflow: IWorkflow,
    changeSummary: string,
    createdBy?: string,
    parentVersionId?: string,
    branch?: string
  ): Promise<IWorkflowVersion> {
    const versionId = uuidv4();
    
    // 获取上一个版本以计算变更和版本号
    let previousVersion: IWorkflowVersion | null = null;
    if (parentVersionId) {
      previousVersion = await this.getVersion(parentVersionId);
    } else {
      const latestVersion = await this.getLatestVersion(workflow.id);
      if (latestVersion) {
        previousVersion = latestVersion;
      }
    }
    
    // 基于上一个版本号递增，如果没有则使用工作流版本
    const currentVersion = previousVersion?.version || workflow.version || '1.0.0';
    const newVersion = this.incrementVersion(currentVersion);
    
    // 计算变更
    const changes = previousVersion 
      ? this.calculateChanges(previousVersion.workflow, workflow)
      : [{ type: ChangeType.CREATE, path: 'workflow', newValue: workflow, description: 'Initial version' }];
    
    const version: IWorkflowVersion = {
      id: versionId,
      workflowId: workflow.id,
      version: newVersion,
      parentVersionId: parentVersionId || previousVersion?.id,
      branch: branch || 'main',
      workflow: JSON.parse(JSON.stringify(workflow)), // 深拷贝
      changeSummary,
      changes,
      createdBy,
      createdAt: new Date(),
      metadata: {
        nodeCount: workflow.nodes.length,
        edgeCount: workflow.edges.length
      }
    };
    
    // 保存版本
    await this.saveVersion(version);
    
    // 更新分支头
    await this.updateBranchHead(version.workflowId, version.branch || 'main', version.id);
    
    this.logger.info('Version created', {
      versionId: version.id,
      workflowId: workflow.id,
      version: version.version,
      changes: changes.length
    });
    
    return version;
  }

  /**
   * 递增版本号
   */
  private incrementVersion(version: string): string {
    const parts = version.split('.').map(Number);
    
    // 确保 3 部分
    while (parts.length < 3) {
      parts.push(0);
    }
    
    // 递增补丁版本
    parts[2]++;
    
    return parts.join('.');
  }

  // ============================================================================
  // Version Retrieval
  // ============================================================================

  /**
   * 保存版本到存储
   */
  private async saveVersion(version: IWorkflowVersion): Promise<void> {
    const redis = this.storage.getClient();
    const key = `${this.prefix}:${version.id}`;
    const workflowKey = `${this.prefix}:workflow:${version.workflowId}:versions`;
    const branchKey = `${this.prefix}:workflow:${version.workflowId}:branch:${version.branch}`;
    
    await redis.set(key, JSON.stringify(version));
    await redis.sadd(workflowKey, version.id);
    await redis.zadd(
      `${this.prefix}:workflow:${version.workflowId}:timeline`,
      version.createdAt.getTime(),
      version.id
    );
    
    // 初始化或更新分支
    const branchData = await redis.get(branchKey);
    const branch = branchData ? JSON.parse(branchData) : {
      name: version.branch,
      workflowId: version.workflowId,
      createdAt: version.createdAt.toISOString()
    };
    branch.headVersionId = version.id;
    branch.updatedAt = new Date().toISOString();
    await redis.set(branchKey, JSON.stringify(branch));
    await redis.sadd(`${this.prefix}:workflow:${version.workflowId}:branches`, version.branch || 'main');
  }

  /**
   * 获取版本详情
   */
  async getVersion(versionId: string): Promise<IWorkflowVersion | null> {
    const redis = this.storage.getClient();
    const key = `${this.prefix}:${versionId}`;
    const data = await redis.get(key);
    
    if (!data) return null;
    
    const version = JSON.parse(data);
    return {
      ...version,
      createdAt: new Date(version.createdAt)
    };
  }

  /**
   * 获取工作流的所有版本
   */
  async getVersions(workflowId: string, query?: Partial<IVersionListQuery>): Promise<IWorkflowVersion[]> {
    const redis = this.storage.getClient();
    const timelineKey = `${this.prefix}:workflow:${workflowId}:timeline`;
    
    // 获取版本 ID 列表（按时间排序）
    let versionIds: string[];
    
    if (query?.sortBy === 'version') {
      // 按版本号排序
      const workflowKey = `${this.prefix}:workflow:${workflowId}:versions`;
      versionIds = await redis.smembers(workflowKey);
      const versions = await Promise.all(versionIds.map(id => this.getVersion(id)));
      return versions
        .filter((v): v is IWorkflowVersion => v !== null)
        .sort((a, b) => {
          const vA = a.version.split('.').map(Number);
          const vB = b.version.split('.').map(Number);
          for (let i = 0; i < 3; i++) {
            if ((vA[i] || 0) !== (vB[i] || 0)) {
              return (query.sortOrder === 'desc' ? -1 : 1) * ((vA[i] || 0) - (vB[i] || 0));
            }
          }
          return 0;
        });
    } else {
      // 默认按时间排序
      const sortOrder = query?.sortOrder === 'asc' ? 'ASC' : 'DESC';
      versionIds = await redis.zrange(timelineKey, 0, -1);
      if (sortOrder === 'DESC') {
        versionIds = versionIds.reverse();
      }
    }
    
    // 分页
    const offset = query?.offset || 0;
    const limit = query?.limit || versionIds.length;
    const paginatedIds = versionIds.slice(offset, offset + limit);
    
    // 获取版本详情
    const versions = await Promise.all(
      paginatedIds.map(id => this.getVersion(id))
    );
    
    return versions.filter((v): v is IWorkflowVersion => v !== null);
  }

  /**
   * 获取最新版本
   */
  async getLatestVersion(workflowId: string): Promise<IWorkflowVersion | null> {
    const redis = this.storage.getClient();
    const timelineKey = `${this.prefix}:workflow:${workflowId}:timeline`;
    
    // 获取最新的版本 ID
    const versionIds = await redis.zrange(timelineKey, -1, -1);
    
    if (versionIds.length === 0) return null;
    
    return this.getVersion(versionIds[0]);
  }

  /**
   * 获取版本数量
   */
  async getVersionCount(workflowId: string): Promise<number> {
    const redis = this.storage.getClient();
    const workflowKey = `${this.prefix}:workflow:${workflowId}:versions`;
    return await redis.scard(workflowKey);
  }

  // ============================================================================
  // Version Diff
  // ============================================================================

  /**
   * 计算两个工作流之间的差异
   */
  private calculateChanges(oldWorkflow: IWorkflow, newWorkflow: IWorkflow): IChange[] {
    const changes: IChange[] = [];
    
    // 基本属性变更
    if (oldWorkflow.name !== newWorkflow.name) {
      changes.push({
        type: ChangeType.UPDATE,
        path: 'name',
        oldValue: oldWorkflow.name,
        newValue: newWorkflow.name,
        description: `Name changed from "${oldWorkflow.name}" to "${newWorkflow.name}"`
      });
    }
    
    if (oldWorkflow.description !== newWorkflow.description) {
      changes.push({
        type: ChangeType.UPDATE,
        path: 'description',
        oldValue: oldWorkflow.description,
        newValue: newWorkflow.description,
        description: 'Description updated'
      });
    }
    
    // 节点变更
    const oldNodesMap = new Map(oldWorkflow.nodes.map(n => [n.id, n]));
    const newNodesMap = new Map(newWorkflow.nodes.map(n => [n.id, n]));
    
    // 检查新增和修改的节点
    for (const [nodeId, newNode] of newNodesMap) {
      if (!oldNodesMap.has(nodeId)) {
        changes.push({
          type: ChangeType.CREATE,
          path: `nodes.${nodeId}`,
          newValue: newNode,
          description: `Node "${newNode.name}" added`
        });
      } else {
        const oldNode = oldNodesMap.get(nodeId)!;
        const nodeChanges = this.calculateNodeChanges(nodeId, oldNode, newNode);
        changes.push(...nodeChanges);
      }
    }
    
    // 检查删除的节点
    for (const [nodeId, oldNode] of oldNodesMap) {
      if (!newNodesMap.has(nodeId)) {
        changes.push({
          type: ChangeType.DELETE,
          path: `nodes.${nodeId}`,
          oldValue: oldNode,
          description: `Node "${oldNode.name}" removed`
        });
      }
    }
    
    // 边变更
    const oldEdgesMap = new Map(oldWorkflow.edges.map(e => [e.id, e]));
    const newEdgesMap = new Map(newWorkflow.edges.map(e => [e.id, e]));
    
    // 检查新增的边
    for (const [edgeId, newEdge] of newEdgesMap) {
      if (!oldEdgesMap.has(edgeId)) {
        changes.push({
          type: ChangeType.CREATE,
          path: `edges.${edgeId}`,
          newValue: newEdge,
          description: `Edge from ${newEdge.source} to ${newEdge.target} added`
        });
      }
    }
    
    // 检查删除的边
    for (const [edgeId, oldEdge] of oldEdgesMap) {
      if (!newEdgesMap.has(edgeId)) {
        changes.push({
          type: ChangeType.DELETE,
          path: `edges.${edgeId}`,
          oldValue: oldEdge,
          description: `Edge from ${oldEdge.source} to ${oldEdge.target} removed`
        });
      }
    }
    
    // 变量变更
    if (JSON.stringify(oldWorkflow.variables) !== JSON.stringify(newWorkflow.variables)) {
      changes.push({
        type: ChangeType.UPDATE,
        path: 'variables',
        oldValue: oldWorkflow.variables,
        newValue: newWorkflow.variables,
        description: 'Variables updated'
      });
    }
    
    // 元数据变更
    if (JSON.stringify(oldWorkflow.metadata) !== JSON.stringify(newWorkflow.metadata)) {
      changes.push({
        type: ChangeType.UPDATE,
        path: 'metadata',
        oldValue: oldWorkflow.metadata,
        newValue: newWorkflow.metadata,
        description: 'Metadata updated'
      });
    }
    
    return changes;
  }

  /**
   * 计算节点变更
   */
  private calculateNodeChanges(nodeId: string, oldNode: any, newNode: any): IChange[] {
    const changes: IChange[] = [];
    const excludeKeys = ['id', 'type'];
    
    for (const key of Object.keys(newNode)) {
      if (excludeKeys.includes(key)) continue;
      
      const oldValue = oldNode[key];
      const newValue = newNode[key];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          type: ChangeType.UPDATE,
          path: `nodes.${nodeId}.${key}`,
          oldValue,
          newValue,
          description: `Node property "${key}" updated`
        });
      }
    }
    
    return changes;
  }

  /**
   * 对比两个版本
   */
  async diffVersions(request: IDiffRequest): Promise<IVersionDiff> {
    const version1 = await this.getVersion(request.versionId1);
    const version2 = await this.getVersion(request.versionId2);
    
    if (!version1 || !version2) {
      throw new Error('One or both versions not found');
    }
    
    if (version1.workflowId !== version2.workflowId) {
      throw new Error('Cannot diff versions from different workflows');
    }
    
    const changes = this.calculateChanges(version1.workflow, version2.workflow);
    const summary = this.calculateDiffSummary(changes);
    
    return {
      versionId1: request.versionId1,
      versionId2: request.versionId2,
      workflowId: version1.workflowId,
      changes,
      summary,
      createdAt: new Date()
    };
  }

  /**
   * 计算差异摘要
   */
  private calculateDiffSummary(changes: IChange[]): IDiffSummary {
    const summary: IDiffSummary = {
      totalChanges: changes.length,
      addedNodes: 0,
      removedNodes: 0,
      modifiedNodes: 0,
      addedEdges: 0,
      removedEdges: 0,
      modifiedEdges: 0,
      modifiedConfig: 0
    };
    
    for (const change of changes) {
      if (change.path.startsWith('nodes.')) {
        if (change.type === ChangeType.CREATE) summary.addedNodes++;
        else if (change.type === ChangeType.DELETE) summary.removedNodes++;
        else if (change.type === ChangeType.UPDATE) summary.modifiedNodes++;
      } else if (change.path.startsWith('edges.')) {
        if (change.type === ChangeType.CREATE) summary.addedEdges++;
        else if (change.type === ChangeType.DELETE) summary.removedEdges++;
        else if (change.type === ChangeType.UPDATE) summary.modifiedEdges++;
      } else {
        summary.modifiedConfig++;
      }
    }
    
    return summary;
  }

  // ============================================================================
  // Version Rollback
  // ============================================================================

  /**
   * 回滚到指定版本
   */
  async rollback(
    workflowId: string,
    request: IRollbackRequest,
    createdBy?: string
  ): Promise<IRollbackResult> {
    // 获取目标版本
    const targetVersion = await this.getVersion(request.versionId);
    
    if (!targetVersion) {
      return {
        success: false,
        workflowId,
        previousVersionId: '',
        message: `Version ${request.versionId} not found`
      };
    }
    
    if (targetVersion.workflowId !== workflowId) {
      return {
        success: false,
        workflowId,
        previousVersionId: '',
        message: 'Version does not belong to this workflow'
      };
    }
    
    // 获取当前工作流
    const currentWorkflow = await this.storage.getWorkflow(workflowId);
    
    if (!currentWorkflow) {
      return {
        success: false,
        workflowId,
        previousVersionId: '',
        message: 'Workflow not found'
      };
    }
    
    // 获取当前最新版本
    const currentVersion = await this.getLatestVersion(workflowId);
    
    // 恢复工作流到目标版本的状态
    const restoredWorkflow: IWorkflow = {
      ...targetVersion.workflow,
      id: workflowId, // 保持相同的 ID
      updatedAt: new Date()
    };
    
    // 保存工作流
    await this.storage.saveWorkflow(restoredWorkflow);
    
    // 如果需要创建新版本
    let newVersionId: string | undefined;
    if (request.createNewVersion !== false) {
      const newVersion = await this.createVersion(
        restoredWorkflow,
        request.changeSummary || `Rolled back to version ${targetVersion.version}`,
        createdBy,
        currentVersion?.id
      );
      newVersionId = newVersion.id;
    }
    
    this.logger.info('Workflow rolled back', {
      workflowId,
      targetVersionId: request.versionId,
      newVersionId
    });
    
    return {
      success: true,
      workflowId,
      previousVersionId: currentVersion?.id || '',
      newVersionId,
      message: `Successfully rolled back to version ${targetVersion.version}`
    };
  }

  // ============================================================================
  // Branch Management
  // ============================================================================

  /**
   * 创建分支
   */
  async createBranch(
    workflowId: string,
    branchName: string,
    fromVersionId: string,
    createdBy?: string
  ): Promise<IVersionBranch> {
    const redis = this.storage.getClient();
    
    // 检查分支是否已存在
    const branchKey = `${this.prefix}:workflow:${workflowId}:branch:${branchName}`;
    const existing = await redis.get(branchKey);
    
    if (existing) {
      throw new Error(`Branch "${branchName}" already exists`);
    }
    
    // 验证源版本
    const sourceVersion = await this.getVersion(fromVersionId);
    if (!sourceVersion || sourceVersion.workflowId !== workflowId) {
      throw new Error('Source version not found or does not belong to this workflow');
    }
    
    const branch: IVersionBranch = {
      name: branchName,
      workflowId,
      headVersionId: fromVersionId,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
      description: `Created from version ${sourceVersion.version}`
    };
    
    // 保存分支
    await redis.set(branchKey, JSON.stringify(branch));
    await redis.sadd(`${this.prefix}:workflow:${workflowId}:branches`, branchName);
    
    this.logger.info('Branch created', {
      workflowId,
      branchName,
      fromVersionId
    });
    
    return branch;
  }

  /**
   * 获取分支列表
   */
  async getBranches(workflowId: string): Promise<IVersionBranch[]> {
    const redis = this.storage.getClient();
    const branchNames = await redis.smembers(`${this.prefix}:workflow:${workflowId}:branches`);
    
    const branches: IVersionBranch[] = [];
    for (const name of branchNames) {
      const branchKey = `${this.prefix}:workflow:${workflowId}:branch:${name}`;
      const data = await redis.get(branchKey);
      if (data) {
        const branch = JSON.parse(data);
        branches.push({
          ...branch,
          createdAt: new Date(branch.createdAt),
          updatedAt: new Date(branch.updatedAt)
        });
      }
    }
    
    return branches;
  }

  /**
   * 更新分支头
   */
  private async updateBranchHead(
    workflowId: string,
    branchName: string,
    versionId: string
  ): Promise<void> {
    const redis = this.storage.getClient();
    const branchKey = `${this.prefix}:workflow:${workflowId}:branch:${branchName}`;
    
    const data = await redis.get(branchKey);
    if (data) {
      const branch = JSON.parse(data);
      branch.headVersionId = versionId;
      branch.updatedAt = new Date().toISOString();
      await redis.set(branchKey, JSON.stringify(branch));
    }
  }

  /**
   * 获取分支的最新版本
   */
  async getBranchHead(workflowId: string, branchName: string): Promise<IWorkflowVersion | null> {
    const redis = this.storage.getClient();
    const branchKey = `${this.prefix}:workflow:${workflowId}:branch:${branchName}`;
    
    const data = await redis.get(branchKey);
    if (!data) return null;
    
    const branch = JSON.parse(data);
    return this.getVersion(branch.headVersionId);
  }

  /**
   * 删除分支
   */
  async deleteBranch(workflowId: string, branchName: string): Promise<boolean> {
    const redis = this.storage.getClient();
    
    // 不能删除主分支
    if (branchName === 'main') {
      throw new Error('Cannot delete the main branch');
    }
    
    const branchKey = `${this.prefix}:workflow:${workflowId}:branch:${branchName}`;
    const existed = await redis.del(branchKey);
    await redis.srem(`${this.prefix}:workflow:${workflowId}:branches`, branchName);
    
    this.logger.info('Branch deleted', { workflowId, branchName });
    
    return existed > 0;
  }

  // ============================================================================
  // Tag Management
  // ============================================================================

  /**
   * 创建标签
   */
  async createTag(
    workflowId: string,
    versionId: string,
    tagName: string,
    createdBy?: string,
    description?: string
  ): Promise<IVersionTag> {
    const redis = this.storage.getClient();
    
    // 验证版本
    const version = await this.getVersion(versionId);
    if (!version || version.workflowId !== workflowId) {
      throw new Error('Version not found or does not belong to this workflow');
    }
    
    // 检查标签是否已存在
    const tagKey = `${this.prefix}:workflow:${workflowId}:tag:${tagName}`;
    const existing = await redis.get(tagKey);
    
    if (existing) {
      throw new Error(`Tag "${tagName}" already exists`);
    }
    
    const tag: IVersionTag = {
      name: tagName,
      versionId,
      workflowId,
      createdAt: new Date(),
      createdBy,
      description
    };
    
    await redis.set(tagKey, JSON.stringify(tag));
    await redis.sadd(`${this.prefix}:workflow:${workflowId}:tags`, tagName);
    
    this.logger.info('Tag created', {
      workflowId,
      tagName,
      versionId
    });
    
    return tag;
  }

  /**
   * 获取标签列表
   */
  async getTags(workflowId: string): Promise<IVersionTag[]> {
    const redis = this.storage.getClient();
    const tagNames = await redis.smembers(`${this.prefix}:workflow:${workflowId}:tags`);
    
    const tags: IVersionTag[] = [];
    for (const name of tagNames) {
      const tagKey = `${this.prefix}:workflow:${workflowId}:tag:${name}`;
      const data = await redis.get(tagKey);
      if (data) {
        const tag = JSON.parse(data);
        tags.push({
          ...tag,
          createdAt: new Date(tag.createdAt)
        });
      }
    }
    
    return tags;
  }

  /**
   * 通过标签获取版本
   */
  async getVersionByTag(workflowId: string, tagName: string): Promise<IWorkflowVersion | null> {
    const redis = this.storage.getClient();
    const tagKey = `${this.prefix}:workflow:${workflowId}:tag:${tagName}`;
    
    const data = await redis.get(tagKey);
    if (!data) return null;
    
    const tag = JSON.parse(data);
    return this.getVersion(tag.versionId);
  }

  /**
   * 删除标签
   */
  async deleteTag(workflowId: string, tagName: string): Promise<boolean> {
    const redis = this.storage.getClient();
    const tagKey = `${this.prefix}:workflow:${workflowId}:tag:${tagName}`;
    
    const existed = await redis.del(tagKey);
    await redis.srem(`${this.prefix}:workflow:${workflowId}:tags`, tagName);
    
    this.logger.info('Tag deleted', { workflowId, tagName });
    
    return existed > 0;
  }

  // ============================================================================
  // Version History
  // ============================================================================

  /**
   * 获取版本的完整历史路径
   */
  async getVersionHistory(workflowId: string, versionId: string): Promise<IWorkflowVersion[]> {
    const history: IWorkflowVersion[] = [];
    let currentVersion = await this.getVersion(versionId);
    
    while (currentVersion) {
      history.unshift(currentVersion);
      
      if (currentVersion.parentVersionId) {
        currentVersion = await this.getVersion(currentVersion.parentVersionId);
      } else {
        break;
      }
    }
    
    return history;
  }

  /**
   * 获取版本的时间线
   */
  async getVersionTimeline(workflowId: string): Promise<{
    versions: IWorkflowVersion[];
    branches: IVersionBranch[];
    tags: IVersionTag[];
  }> {
    const [versions, branches, tags] = await Promise.all([
      this.getVersions(workflowId, { sortOrder: 'desc' }),
      this.getBranches(workflowId),
      this.getTags(workflowId)
    ]);
    
    return { versions, branches, tags };
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * 删除工作流的所有版本数据
   */
  async deleteWorkflowVersions(workflowId: string): Promise<void> {
    const redis = this.storage.getClient();
    
    // 获取所有版本 ID
    const versionIds = await redis.smembers(`${this.prefix}:workflow:${workflowId}:versions`);
    
    // 删除所有版本
    for (const versionId of versionIds) {
      await redis.del(`${this.prefix}:${versionId}`);
    }
    
    // 删除版本相关键
    await redis.del(`${this.prefix}:workflow:${workflowId}:versions`);
    await redis.del(`${this.prefix}:workflow:${workflowId}:timeline`);
    
    // 删除分支
    const branches = await redis.smembers(`${this.prefix}:workflow:${workflowId}:branches`);
    for (const branch of branches) {
      await redis.del(`${this.prefix}:workflow:${workflowId}:branch:${branch}`);
    }
    await redis.del(`${this.prefix}:workflow:${workflowId}:branches`);
    
    // 删除标签
    const tags = await redis.smembers(`${this.prefix}:workflow:${workflowId}:tags`);
    for (const tag of tags) {
      await redis.del(`${this.prefix}:workflow:${workflowId}:tag:${tag}`);
    }
    await redis.del(`${this.prefix}:workflow:${workflowId}:tags`);
    
    this.logger.info('Workflow versions deleted', { workflowId, versionCount: versionIds.length });
  }
}
