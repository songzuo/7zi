/**
 * 任务分解引擎测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TaskDecomposer, DecompositionStrategy } from '../task-decomposer';
import { AgentRegistry } from '../registry';
import { MessageBus } from '../message-bus';
import {
  TaskStatus,
  MessagePriority,
  TransportType,
} from '../types';

describe('TaskDecomposer', () => {
  let taskDecomposer: TaskDecomposer;
  let registry: AgentRegistry;
  let messageBus: MessageBus;

  beforeEach(async () => {
    messageBus = new MessageBus(TransportType.MEMORY);
    registry = new AgentRegistry();
    taskDecomposer = new TaskDecomposer(registry, messageBus);

    // 注册测试 Agent
    await registry.register({
      id: 'agent-1',
      name: 'Coder Agent',
      type: 'llm',
      capabilities: [
        {
          id: 'coding',
          name: 'Coding',
          description: 'Write code',
          category: 'development',
          version: '1.0.0',
        },
      ],
      status: 'online',
      lastSeen: Date.now(),
      metadata: {},
    });
  });

  afterEach(async () => {
    await taskDecomposer.removeAllListeners?.();
    await registry.close();
    await messageBus.close();
  });

  describe('任务创建', () => {
    it('应该成功创建任务', async () => {
      const task = await taskDecomposer.createTask(
        'Test Task',
        'A test task',
        { data: 'test' }
      );

      expect(task).toHaveProperty('id');
      expect(task.name).toBe('Test Task');
      expect(task.description).toBe('A test Task');
      expect(task.status).toBe(TaskStatus.PENDING);
      expect(task.subTasks).toBeDefined();
    });

    it('应该使用模板创建任务', async () => {
      const template = {
        type: 'test',
        name: 'Template Task',
        description: 'Task from template',
        strategy: DecompositionStrategy.SEQUENTIAL,
        subTasks: [
          {
            id: 'step1',
            name: 'Step 1',
            description: 'First step',
            requiredCapabilities: ['coding'],
          },
          {
            id: 'step2',
            name: 'Step 2',
            description: 'Second step',
            requiredCapabilities: ['coding'],
            dependencies: ['step1'],
          },
        ],
      };

      const task = await taskDecomposer.createTask(
        'Test Task',
        'A test task',
        { data: 'test' },
        { template }
      );

      expect(task.subTasks).toHaveLength(2);
      expect(task.subTasks[0].name).toBe('Step 1');
      expect(task.subTasks[1].dependencies).toHaveLength(1);
      expect(task.subTasks[1].dependencies[0].taskId).toContain('step1');
    });
  });

  describe('任务分解', () => {
    it('应该自动分解分析任务', async () => {
      const task = await taskDecomposer.createTask(
        'Analysis Task',
        'Analyze the data and create a report',
        { data: 'test' }
      );

      expect(task.subTasks.length).toBeGreaterThan(0);
      expect(task.subTasks.some(st => st.name.includes('收集') || st.name.includes('分析'))).toBe(true);
    });

    it('应该自动分解开发任务', async () => {
      const task = await taskDecomposer.createTask(
        'Development Task',
        'Implement a new feature with code',
        { data: 'test' }
      );

      expect(task.subTasks.length).toBeGreaterThan(0);
      expect(task.subTasks.some(st => st.name.includes('设计') || st.name.includes('实现'))).toBe(true);
    });

    it('应该自动分解测试任务', async () => {
      const task = await taskDecomposer.createTask(
        'Testing Task',
        'Test the code and verify correctness',
        { data: 'test' }
      );

      expect(task.subTasks.length).toBeGreaterThan(0);
      expect(task.subTasks.some(st => st.name.includes('测试'))).toBe(true);
    });

    it('应该限制子任务数量', async () => {
      const limitedDecomposer = new TaskDecomposer(registry, messageBus, {
        maxSubTasks: 2,
      });

      const task = await limitedDecomposer.createTask(
        'Complex Task',
        'A complex task that would normally have many subtasks',
        { data: 'test' }
      );

      expect(task.subTasks.length).toBeLessThanOrEqual(2);

      await limitedDecomposer.removeAllListeners?.();
    });
  });

  describe('Agent 分配', () => {
    it('应该为子任务分配 Agent', async () => {
      const task = await taskDecomposer.createTask(
        'Test Task',
        'A test task',
        { data: 'test' }
      );

      if (task.subTasks.length > 0) {
        const subTask = task.subTasks[0];
        subTask.requiredCapabilities = ['coding'];

        const agentId = await taskDecomposer.assignAgent(subTask);

        expect(agentId).toBe('agent-1');
        expect(subTask.assignedAgentId).toBe('agent-1');
      }
    });

    it('应该返回 null 当没有可用 Agent', async () => {
      const subTask = {
        id: 'subtask-1',
        parentTaskId: 'task-1',
        name: 'Test SubTask',
        description: 'A subtask',
        requiredCapabilities: ['non-existent-capability'],
        dependencies: [],
        status: TaskStatus.PENDING as TaskStatus,
        input: null,
        createdAt: Date.now(),
        priority: MessagePriority.NORMAL,
      };

      const agentId = await taskDecomposer.assignAgent(subTask);

      expect(agentId).toBeNull();
    });
  });

  describe('任务执行', () => {
    it('应该成功执行无依赖的任务', async () => {
      // Mock 消息总线响应
      const requestSpy = vi.spyOn(messageBus, 'request').mockResolvedValueOnce({
        result: 'success',
      });

      const template = {
        type: 'test',
        name: 'Simple Task',
        description: 'Simple task',
        strategy: DecompositionStrategy.SEQUENTIAL,
        subTasks: [
          {
            id: 'step1',
            name: 'Step 1',
            description: 'First step',
            requiredCapabilities: ['coding'],
          },
        ],
      };

      const task = await taskDecomposer.createTask(
        'Test Task',
        'A test task',
        { data: 'test' },
        { template }
      );

      // 手动分配 Agent
      await taskDecomposer.assignAgent(task.subTasks[0]);

      const result = await taskDecomposer.executeTask(task.id);

      expect(task.status).toBe(TaskStatus.COMPLETED);
      expect(result).toBeDefined();
      expect(requestSpy).toHaveBeenCalled();

      requestSpy.mockRestore();
    });

    it('应该按依赖顺序执行任务', async () => {
      const requestSpy = vi.spyOn(messageBus, 'request')
        .mockResolvedValueOnce({ step1: 'done' })
        .mockResolvedValueOnce({ step2: 'done' });

      const template = {
        type: 'test',
        name: 'Sequential Task',
        description: 'Task with dependencies',
        strategy: DecompositionStrategy.SEQUENTIAL,
        subTasks: [
          {
            id: 'step1',
            name: 'Step 1',
            description: 'First step',
            requiredCapabilities: ['coding'],
          },
          {
            id: 'step2',
            name: 'Step 2',
            description: 'Second step',
            requiredCapabilities: ['coding'],
            dependencies: ['step1'],
          },
        ],
      };

      const task = await taskDecomposer.createTask(
        'Test Task',
        'A test task',
        { data: 'test' },
        { template }
      );

      // 分配 Agent
      for (const subTask of task.subTasks) {
        await taskDecomposer.assignAgent(subTask);
      }

      const result = await taskDecomposer.executeTask(task.id);

      expect(task.status).toBe(TaskStatus.COMPLETED);
      expect(requestSpy).toHaveBeenCalledTimes(2);

      requestSpy.mockRestore();
    });

    it('应该处理任务执行失败', async () => {
      vi.spyOn(messageBus, 'request').mockRejectedValueOnce(
        new Error('Agent error')
      );

      const template = {
        type: 'test',
        name: 'Failing Task',
        description: 'Task that will fail',
        strategy: DecompositionStrategy.SEQUENTIAL,
        subTasks: [
          {
            id: 'step1',
            name: 'Step 1',
            description: 'First step',
            requiredCapabilities: ['coding'],
          },
        ],
      };

      const task = await taskDecomposer.createTask(
        'Test Task',
        'A test task',
        { data: 'test' },
        { template }
      );

      await taskDecomposer.assignAgent(task.subTasks[0]);

      await expect(taskDecomposer.executeTask(task.id)).rejects.toThrow();

      expect(task.status).toBe(TaskStatus.FAILED);
    });
  });

  describe('任务取消', () => {
    it('应该成功取消任务', async () => {
      const task = await taskDecomposer.createTask(
        'Test Task',
        'A test task',
        { data: 'test' }
      );

      await taskDecomposer.cancelTask(task.id);

      expect(task.status).toBe(TaskStatus.CANCELLED);
    });

    it('应该拒绝取消不存在的任务', async () => {
      await expect(taskDecomposer.cancelTask('non-existent')).rejects.toThrow('not found');
    });
  });

  describe('任务模板', () => {
    it('应该注册任务模板', () => {
      const template = {
        type: 'custom',
        name: 'Custom Template',
        description: 'A custom template',
        strategy: DecompositionStrategy.PARALLEL,
        subTasks: [],
      };

      taskDecomposer.registerTemplate(template);

      const retrieved = taskDecomposer.getTemplate('custom');
      expect(retrieved).toEqual(template);
    });

    it('应该包含内置模板', () => {
      const codeReviewTemplate = taskDecomposer.getTemplate('code-review');
      expect(codeReviewTemplate).toBeDefined();
      expect(codeReviewTemplate?.type).toBe('code-review');

      const docTemplate = taskDecomposer.getTemplate('doc-generation');
      expect(docTemplate).toBeDefined();
      expect(docTemplate?.type).toBe('doc-generation');
    });
  });

  describe('任务查询', () => {
    it('应该能够获取任务', async () => {
      const task = await taskDecomposer.createTask(
        'Test Task',
        'A test task',
        { data: 'test' }
      );

      const retrieved = taskDecomposer.getTask(task.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(task.id);
    });

    it('应该能够获取所有任务', async () => {
      await taskDecomposer.createTask('Task 1', 'Description 1', {});
      await taskDecomposer.createTask('Task 2', 'Description 2', {});

      const allTasks = taskDecomposer.getAllTasks();

      expect(allTasks.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('事件系统', () => {
    it('应该在任务创建时发出事件', async () => {
      const eventSpy = vi.fn();
      taskDecomposer.on('task.created', eventSpy);

      await taskDecomposer.createTask('Test Task', 'Description', {});

      expect(eventSpy).toHaveBeenCalled();
      expect(eventSpy.mock.calls[0][0]).toHaveProperty('task');
    });

    it('应该在任务完成时发出事件', async () => {
      const eventSpy = vi.fn();
      taskDecomposer.on('task.completed', eventSpy);

      vi.spyOn(messageBus, 'request').mockResolvedValueOnce({ result: 'success' });

      const template = {
        type: 'test',
        name: 'Simple Task',
        description: 'Simple task',
        strategy: DecompositionStrategy.SEQUENTIAL,
        subTasks: [
          {
            id: 'step1',
            name: 'Step 1',
            description: 'First step',
            requiredCapabilities: ['coding'],
          },
        ],
      };

      const task = await taskDecomposer.createTask(
        'Test Task',
        'A test task',
        { data: 'test' },
        { template }
      );

      await taskDecomposer.assignAgent(task.subTasks[0]);
      await taskDecomposer.executeTask(task.id);

      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('清理功能', () => {
    it('应该清理已完成的任务', async () => {
      const task1 = await taskDecomposer.createTask('Task 1', 'Description', {});
      const task2 = await taskDecomposer.createTask('Task 2', 'Description', {});

      // 模拟任务完成
      task1.status = TaskStatus.COMPLETED;
      task2.status = TaskStatus.COMPLETED;

      taskDecomposer.cleanupCompletedTasks();

      expect(taskDecomposer.getTask(task1.id)).toBeUndefined();
      expect(taskDecomposer.getTask(task2.id)).toBeUndefined();
    });
  });
});
