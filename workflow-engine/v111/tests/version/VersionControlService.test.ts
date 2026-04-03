/**
 * OpenClaw Workflow Engine v1.11.0
 * Version Control Service Unit Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { VersionControlService } from '../../src/version/VersionControlService';
import { RedisStorage } from '../../src/storage/RedisStorage';
import { ILogContext } from '../../src/logging/Logger';
import { IWorkflow, WorkflowStatus, NodeType } from '../../src/types/workflow.types';
import { ChangeType } from '../../src/types/version.types';

// Mock Logger
class MockLogger {
  logs: Array<{level: string; message: string; context?: ILogContext}> = [];

  error(message: string, context?: ILogContext): void {
    this.logs.push({ level: 'error', message, context });
  }

  warn(message: string, context?: ILogContext): void {
    this.logs.push({ level: 'warn', message, context });
  }

  info(message: string, context?: ILogContext): void {
    this.logs.push({ level: 'info', message, context });
  }

  debug(message: string, context?: ILogContext): void {
    this.logs.push({ level: 'debug', message, context });
  }

  verbose(message: string, context?: ILogContext): void {
    this.logs.push({ level: 'verbose', message, context });
  }
}

// Mock Redis Client
class MockRedisClient {
  private data: Map<string, string> = new Map();
  private sets: Map<string, Set<string>> = new Map();
  private zsets: Map<string, Map<string, number>> = new Map();

  async get(key: string): Promise<string | null> {
    return this.data.get(key) || null;
  }

  async set(key: string, value: string): Promise<'OK'> {
    this.data.set(key, value);
    return 'OK';
  }

  async del(key: string): Promise<number> {
    return this.data.delete(key) ? 1 : 0;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }
    const set = this.sets.get(key)!;
    let added = 0;
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        added++;
      }
    }
    return added;
  }

  async smembers(key: string): Promise<string[]> {
    const set = this.sets.get(key);
    return set ? Array.from(set) : [];
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const set = this.sets.get(key);
    if (!set) return 0;
    let removed = 0;
    for (const member of members) {
      if (set.delete(member)) {
        removed++;
      }
    }
    return removed;
  }

  async scard(key: string): Promise<number> {
    const set = this.sets.get(key);
    return set ? set.size : 0;
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    if (!this.zsets.has(key)) {
      this.zsets.set(key, new Map());
    }
    const existed = this.zsets.get(key)!.has(member);
    this.zsets.get(key)!.set(member, score);
    return existed ? 0 : 1;
  }

  async zrange(key: string, start: number, stop: number, order: string = 'ASC'): Promise<string[]> {
    const zset = this.zsets.get(key);
    if (!zset) return [];
    const entries = Array.from(zset.entries())
      .sort((a, b) => order === 'ASC' ? a[1] - b[1] : b[1] - a[1]);
    const end = stop === -1 ? entries.length : stop + 1;
    return entries.slice(start, end).map(e => e[0]);
  }

  async ping(): Promise<'PONG'> {
    return 'PONG';
  }
}

// Mock Redis Storage
class MockRedisStorage {
  private workflows: Map<string, IWorkflow> = new Map();
  private redis: MockRedisClient;

  constructor() {
    this.redis = new MockRedisClient();
  }

  async saveWorkflow(workflow: IWorkflow): Promise<void> {
    this.workflows.set(workflow.id, JSON.parse(JSON.stringify(workflow)));
  }

  async getWorkflow(id: string): Promise<IWorkflow | null> {
    const wf = this.workflows.get(id);
    return wf ? JSON.parse(JSON.stringify(wf)) : null;
  }

  async getAllWorkflows(): Promise<IWorkflow[]> {
    return Array.from(this.workflows.values()).map(wf => JSON.parse(JSON.stringify(wf)));
  }

  async deleteWorkflow(id: string): Promise<void> {
    this.workflows.delete(id);
  }

  async workflowExists(id: string): Promise<boolean> {
    return this.workflows.has(id);
  }

  getClient(): MockRedisClient {
    return this.redis;
  }
}

describe('VersionControlService', () => {
  let versionService: VersionControlService;
  let storage: MockRedisStorage;
  let logger: MockLogger;

  // 创建测试工作流
  const createTestWorkflow = (id: string = 'test-workflow-1'): IWorkflow => ({
    id,
    name: 'Test Workflow',
    description: 'A test workflow',
    version: '1.0.0',
    status: WorkflowStatus.DRAFT,
    nodes: [
      {
        id: 'node-1',
        type: NodeType.TRIGGER_MANUAL,
        name: 'Start',
        config: {}
      },
      {
        id: 'node-2',
        type: NodeType.ACTION_HTTP,
        name: 'HTTP Request',
        config: {
          http: {
            url: 'https://api.example.com',
            method: 'GET'
          }
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2'
      }
    ],
    variables: {
      apiKey: 'test-key'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  });

  beforeEach(() => {
    logger = new MockLogger();
    storage = new MockRedisStorage();
    // @ts-ignore - Mock implementation
    versionService = new VersionControlService(storage as any, logger as any);
  });

  describe('Version Creation', () => {
    it('should create initial version', async () => {
      const workflow = createTestWorkflow();
      await storage.saveWorkflow(workflow);

      const version = await versionService.createVersion(
        workflow,
        'Initial version',
        'test-user'
      );

      expect(version).toBeDefined();
      expect(version.workflowId).toBe(workflow.id);
      expect(version.version).toBe('1.0.1');
      expect(version.changeSummary).toBe('Initial version');
      expect(version.createdBy).toBe('test-user');
      expect(version.branch).toBe('main');
      expect(version.changes).toHaveLength(1);
      expect(version.changes[0].type).toBe(ChangeType.CREATE);
    });

    it('should increment version number', async () => {
      const workflow = createTestWorkflow();
      await storage.saveWorkflow(workflow);

      const version1 = await versionService.createVersion(workflow, 'First version');
      const version2 = await versionService.createVersion(workflow, 'Second version');

      expect(version1.version).toBe('1.0.1');
      expect(version2.version).toBe('1.0.2');
    });

    it('should track parent version', async () => {
      const workflow = createTestWorkflow();
      await storage.saveWorkflow(workflow);

      const version1 = await versionService.createVersion(workflow, 'First version');
      const version2 = await versionService.createVersion(workflow, 'Second version');

      expect(version2.parentVersionId).toBe(version1.id);
    });

    it('should calculate changes between versions', async () => {
      const workflow = createTestWorkflow();
      await storage.saveWorkflow(workflow);

      await versionService.createVersion(workflow, 'First version');

      // 修改工作流
      workflow.name = 'Updated Workflow';
      workflow.nodes.push({
        id: 'node-3',
        type: NodeType.ACTION_EMAIL,
        name: 'Send Email',
        config: {}
      });

      const version2 = await versionService.createVersion(workflow, 'Added email node');

      expect(version2.changes.length).toBeGreaterThan(0);
      const nameChange = version2.changes.find((c: any) => c.path === 'name');
      expect(nameChange).toBeDefined();
      expect(nameChange?.oldValue).toBe('Test Workflow');
      expect(nameChange?.newValue).toBe('Updated Workflow');
    });
  });

  describe('Version Retrieval', () => {
    it('should retrieve version by ID', async () => {
      const workflow = createTestWorkflow();
      await storage.saveWorkflow(workflow);

      const createdVersion = await versionService.createVersion(workflow, 'Test version');
      const retrievedVersion = await versionService.getVersion(createdVersion.id);

      expect(retrievedVersion).toBeDefined();
      expect(retrievedVersion?.id).toBe(createdVersion.id);
      expect(retrievedVersion?.version).toBe(createdVersion.version);
    });

    it('should return null for non-existent version', async () => {
      const version = await versionService.getVersion('non-existent-id');
      expect(version).toBeNull();
    });

    it('should get all versions for a workflow', async () => {
      const workflow = createTestWorkflow();
      await storage.saveWorkflow(workflow);

      await versionService.createVersion(workflow, 'Version 1');
      await versionService.createVersion(workflow, 'Version 2');
      await versionService.createVersion(workflow, 'Version 3');

      const versions = await versionService.getVersions(workflow.id);

      expect(versions).toHaveLength(3);
    });

    it('should get latest version', async () => {
      const workflow = createTestWorkflow();
      await storage.saveWorkflow(workflow);

      await versionService.createVersion(workflow, 'Version 1');
      await versionService.createVersion(workflow, 'Version 2');
      const version3 = await versionService.createVersion(workflow, 'Version 3');

      const latest = await versionService.getLatestVersion(workflow.id);

      expect(latest).toBeDefined();
      expect(latest?.id).toBe(version3.id);
    });

    it('should support pagination', async () => {
      const workflow = createTestWorkflow();
      await storage.saveWorkflow(workflow);

      for (let i = 1; i <= 10; i++) {
        await versionService.createVersion(workflow, `Version ${i}`);
      }

      const page1 = await versionService.getVersions(workflow.id, { limit: 5, offset: 0 });
      const page2 = await versionService.getVersions(workflow.id, { limit: 5, offset: 5 });

      expect(page1).toHaveLength(5);
      expect(page2).toHaveLength(5);
      expect(page1[0].id).not.toBe(page2[0].id);
    });
  });

  describe('Version Diff', () => {
    it('should calculate diff between two versions', async () => {
      const workflow = createTestWorkflow();
      await storage.saveWorkflow(workflow);

      const version1 = await versionService.createVersion(workflow, 'Version 1');

      // 修改工作流
      workflow.name = 'Updated Workflow';
      workflow.nodes.push({
        id: 'node-3',
        type: NodeType.ACTION_EMAIL,
        name: 'Send Email',
        config: {}
      });

      const version2 = await versionService.createVersion(workflow, 'Version 2');

      const diff = await versionService.diffVersions({
        versionId1: version1.id,
        versionId2: version2.id
      });

      expect(diff).toBeDefined();
      expect(diff.versionId1).toBe(version1.id);
      expect(diff.versionId2).toBe(version2.id);
      expect(diff.changes.length).toBeGreaterThan(0);
      expect(diff.summary.totalChanges).toBeGreaterThan(0);
    });

    it('should detect added nodes', async () => {
      const workflow = createTestWorkflow();
      await storage.saveWorkflow(workflow);

      const version1 = await versionService.createVersion(workflow, 'Version 1');

      workflow.nodes.push({
        id: 'node-3',
        type: NodeType.ACTION_EMAIL,
        name: 'Send Email',
        config: {}
      });

      const version2 = await versionService.createVersion(workflow, 'Version 2');

      const diff = await versionService.diffVersions({
        versionId1: version1.id,
        versionId2: version2.id
      });

      expect(diff.summary.addedNodes).toBe(1);
    });

    it('should detect removed nodes', async () => {
      const workflow = createTestWorkflow();
      await storage.saveWorkflow(workflow);

      const version1 = await versionService.createVersion(workflow, 'Version 1');

      workflow.nodes = workflow.nodes.filter((n: any) => n.id !== 'node-2');

      const version2 = await versionService.createVersion(workflow, 'Version 2');

      const diff = await versionService.diffVersions({
        versionId1: version1.id,
        versionId2: version2.id
      });

      expect(diff.summary.removedNodes).toBe(1);
    });

    it('should detect modified nodes', async () => {
      const workflow = createTestWorkflow();
      await storage.saveWorkflow(workflow);

      const version1 = await versionService.createVersion(workflow, 'Version 1');

      workflow.nodes[0].name = 'Updated Start Node';

      const version2 = await versionService.createVersion(workflow, 'Version 2');

      const diff = await versionService.diffVersions({
        versionId1: version1.id,
        versionId2: version2.id
      });

      expect(diff.summary.modifiedNodes).toBeGreaterThan(0);
    });
  });

  describe('Version Rollback', () => {
    it('should rollback to previous version', async () => {
      const workflow = createTestWorkflow();
      await storage.saveWorkflow(workflow);

      const version1 = await versionService.createVersion(workflow, 'Version 1');

      // 修改工作流
      workflow.name = 'Modified Workflow';
      workflow.nodes.push({
        id: 'node-3',
        type: NodeType.ACTION_EMAIL,
        name: 'Send Email',
        config: {}
      });

      await versionService.createVersion(workflow, 'Version 2');

      // 回滚
      const result = await versionService.rollback(
        workflow.id,
        { versionId: version1.id, createNewVersion: true },
        'test-user'
      );

      expect(result.success).toBe(true);
      expect(result.workflowId).toBe(workflow.id);
      expect(result.previousVersionId).toBeDefined();
      expect(result.newVersionId).toBeDefined();

      // 验证工作流已恢复
      const currentWorkflow = await storage.getWorkflow(workflow.id);
      expect(currentWorkflow?.name).toBe('Test Workflow');
      expect(currentWorkflow?.nodes.length).toBe(2);
    });

    it('should fail to rollback to non-existent version', async () => {
      const workflow = createTestWorkflow();
      await storage.saveWorkflow(workflow);

      const result = await versionService.rollback(
        workflow.id,
        { versionId: 'non-existent-id' }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should fail to rollback version from different workflow', async () => {
      const workflow1 = createTestWorkflow('workflow-1');
      const workflow2 = createTestWorkflow('workflow-2');
      await storage.saveWorkflow(workflow1);
      await storage.saveWorkflow(workflow2);

      const version1 = await versionService.createVersion(workflow1, 'Version 1');

      const result = await versionService.rollback(
        workflow2.id,
        { versionId: version1.id }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('does not belong to this workflow');
    });
  });

  describe('Branch Management', () => {
    it('should create branch', async () => {
      const workflow = createTestWorkflow();
      await storage.saveWorkflow(workflow);

      const version = await versionService.createVersion(workflow, 'Version 1');

      const branch = await versionService.createBranch(
        workflow.id,
        'feature-branch',
        version.id,
        'test-user'
      );

      expect(branch).toBeDefined();
      expect(branch.name).toBe('feature-branch');
      expect(branch.workflowId).toBe(workflow.id);
      expect(branch.headVersionId).toBe(version.id);
      expect(branch.createdBy).toBe('test-user');
    });

    it('should get branch head', async () => {
      const workflow = createTestWorkflow();
      await storage.saveWorkflow(workflow);

      const version = await versionService.createVersion(workflow, 'Version 1');

      await versionService.createBranch(workflow.id, 'feature-branch', version.id);

      const head = await versionService.getBranchHead(workflow.id, 'feature-branch');

      expect(head).toBeDefined();
      expect(head?.id).toBe(version.id);
    });

    it('should get all branches', async () => {
      const workflow = createTestWorkflow();
      await storage.saveWorkflow(workflow);

      const version = await versionService.createVersion(workflow, 'Version 1');

      await versionService.createBranch(workflow.id, 'feature-1', version.id);
      await versionService.createBranch(workflow.id, 'feature-2', version.id);

      const branches = await versionService.getBranches(workflow.id);

      expect(branches.length).toBeGreaterThanOrEqual(2);
      expect(branches.map((b: any) => b.name)).toContain('feature-1');
      expect(branches.map((b: any) => b.name)).toContain('feature-2');
    });

    it('should delete branch', async () => {
      const workflow = createTestWorkflow();
      await storage.saveWorkflow(workflow);

      const version = await versionService.createVersion(workflow, 'Version 1');

      await versionService.createBranch(workflow.id, 'feature-branch', version.id);

      const deleted = await versionService.deleteBranch(workflow.id, 'feature-branch');

      expect(deleted).toBe(true);

      const branches = await versionService.getBranches(workflow.id);
      expect(branches.map((b: any) => b.name)).not.toContain('feature-branch');
    });

    it('should not allow deleting main branch', async () => {
      await expect(
        versionService.deleteBranch('test-workflow', 'main')
      ).rejects.toThrow('Cannot delete the main branch');
    });
  });

  describe('Tag Management', () => {
    it('should create tag', async () => {
      const workflow = createTestWorkflow();
      await storage.saveWorkflow(workflow);

      const version = await versionService.createVersion(workflow, 'Version 1');

      const tag = await versionService.createTag(
        workflow.id,
        version.id,
        'v1.0.0',
        'test-user',
        'Production release'
      );

      expect(tag).toBeDefined();
      expect(tag.name).toBe('v1.0.0');
      expect(tag.versionId).toBe(version.id);
      expect(tag.workflowId).toBe(workflow.id);
      expect(tag.createdBy).toBe('test-user');
      expect(tag.description).toBe('Production release');
    });

    it('should get version by tag', async () => {
      const workflow = createTestWorkflow();
      await storage.saveWorkflow(workflow);

      const version = await versionService.createVersion(workflow, 'Version 1');

      await versionService.createTag(workflow.id, version.id, 'v1.0.0');

      const retrievedVersion = await versionService.getVersionByTag(workflow.id, 'v1.0.0');

      expect(retrievedVersion).toBeDefined();
      expect(retrievedVersion?.id).toBe(version.id);
    });

    it('should get all tags', async () => {
      const workflow = createTestWorkflow();
      await storage.saveWorkflow(workflow);

      const version1 = await versionService.createVersion(workflow, 'Version 1');
      const version2 = await versionService.createVersion(workflow, 'Version 2');

      await versionService.createTag(workflow.id, version1.id, 'v1.0.0');
      await versionService.createTag(workflow.id, version2.id, 'v1.1.0');

      const tags = await versionService.getTags(workflow.id);

      expect(tags).toHaveLength(2);
      expect(tags.map((t: any) => t.name)).toContain('v1.0.0');
      expect(tags.map((t: any) => t.name)).toContain('v1.1.0');
    });

    it('should delete tag', async () => {
      const workflow = createTestWorkflow();
      await storage.saveWorkflow(workflow);

      const version = await versionService.createVersion(workflow, 'Version 1');

      await versionService.createTag(workflow.id, version.id, 'v1.0.0');

      const deleted = await versionService.deleteTag(workflow.id, 'v1.0.0');

      expect(deleted).toBe(true);

      const tags = await versionService.getTags(workflow.id);
      expect(tags.map((t: any) => t.name)).not.toContain('v1.0.0');
    });
  });

  describe('Version History', () => {
    it('should get version history', async () => {
      const workflow = createTestWorkflow();
      await storage.saveWorkflow(workflow);

      const version1 = await versionService.createVersion(workflow, 'Version 1');
      const version2 = await versionService.createVersion(workflow, 'Version 2');
      const version3 = await versionService.createVersion(workflow, 'Version 3');

      const history = await versionService.getVersionHistory(workflow.id, version3.id);

      expect(history).toHaveLength(3);
      expect(history[0].id).toBe(version1.id);
      expect(history[1].id).toBe(version2.id);
      expect(history[2].id).toBe(version3.id);
    });

    it('should get timeline', async () => {
      const workflow = createTestWorkflow();
      await storage.saveWorkflow(workflow);

      await versionService.createVersion(workflow, 'Version 1');
      const version2 = await versionService.createVersion(workflow, 'Version 2');

      await versionService.createTag(workflow.id, version2.id, 'v1.0.0');
      await versionService.createBranch(workflow.id, 'feature', version2.id);

      const timeline = await versionService.getVersionTimeline(workflow.id);

      expect(timeline.versions).toHaveLength(2);
      expect(timeline.branches.length).toBeGreaterThanOrEqual(1);
      expect(timeline.tags).toHaveLength(1);
    });
  });

  describe('Cleanup', () => {
    it('should delete all workflow versions', async () => {
      const workflow = createTestWorkflow();
      await storage.saveWorkflow(workflow);

      await versionService.createVersion(workflow, 'Version 1');
      await versionService.createVersion(workflow, 'Version 2');

      await versionService.deleteWorkflowVersions(workflow.id);

      const versions = await versionService.getVersions(workflow.id);
      expect(versions).toHaveLength(0);
    });
  });
});