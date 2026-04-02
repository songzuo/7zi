/**
 * 工作流执行器测试
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { EnhancedWorkflowExecutor } from "../executor";
import { nodeExecutorRegistry } from "../executors/registry";
import {
  WorkflowDefinition,
  WorkflowStatus,
  NodeType,
  InstanceStatus,
  NodeStatus,
} from "@/types/workflow";

describe("EnhancedWorkflowExecutor", () => {
  let executor: EnhancedWorkflowExecutor;

  // 测试用工作流定义（简化版，不包含条件节点）
  const createTestWorkflow = (): WorkflowDefinition => ({
    id: "test-workflow-1",
    name: "测试工作流",
    description: "用于测试的工作流",
    version: 1,
    status: WorkflowStatus.ACTIVE,
    nodes: [
      {
        id: "start-1",
        type: NodeType.START,
        name: "开始",
        position: { x: 0, y: 0 },
      },
      {
        id: "agent-1",
        type: NodeType.AGENT,
        name: "Agent 执行",
        position: { x: 100, y: 0 },
        agentConfig: {
          agentId: "test-agent",
          agentType: "test",
        },
      },
      {
        id: "end-1",
        type: NodeType.END,
        name: "结束",
        position: { x: 200, y: 0 },
      },
    ],
    edges: [
      { id: "edge-1", source: "start-1", target: "agent-1", type: "sequence" as any },
      { id: "edge-2", source: "agent-1", target: "end-1", type: "sequence" as any },
    ],
    config: {
      variables: {
        testVar: "initial",
      },
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "test",
      updatedBy: "test",
    },
  });

  beforeEach(() => {
    executor = new EnhancedWorkflowExecutor();
  });

  describe("registerWorkflow", () => {
    it("应该成功注册工作流", () => {
      const workflow = createTestWorkflow();
      executor.registerWorkflow(workflow);

      const result = executor.getWorkflow(workflow.id);
      expect(result).toBeDefined();
      expect(result?.name).toBe("测试工作流");
    });

    it("应该覆盖已存在的工作流", () => {
      const workflow = createTestWorkflow();
      executor.registerWorkflow(workflow);

      const updatedWorkflow = { ...workflow, name: "更新后的工作流" };
      executor.registerWorkflow(updatedWorkflow);

      const result = executor.getWorkflow(workflow.id);
      expect(result?.name).toBe("更新后的工作流");
    });
  });

  describe("validateWorkflow", () => {
    it("应该验证通过合法的工作流", () => {
      const workflow = createTestWorkflow();
      const validation = executor.validateWorkflow(workflow);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("应该检测缺少名称的工作流", () => {
      const workflow = createTestWorkflow();
      workflow.name = "";

      const validation = executor.validateWorkflow(workflow);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("工作流名称不能为空");
    });

    it("应该检测缺少节点的工作流", () => {
      const workflow = createTestWorkflow();
      workflow.nodes = [];

      const validation = executor.validateWorkflow(workflow);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("工作流必须包含至少一个节点");
    });

    it("应该检测重复的节点 ID", () => {
      const workflow = createTestWorkflow();
      workflow.nodes[1].id = workflow.nodes[0].id;

      const validation = executor.validateWorkflow(workflow);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("重复"))).toBe(true);
    });

    it("应该检测不存在的源节点", () => {
      const workflow = createTestWorkflow();
      workflow.edges[0].source = "non-existent";

      const validation = executor.validateWorkflow(workflow);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("源节点不存在"))).toBe(true);
    });

    it("应该检测缺少开始节点", () => {
      const workflow = createTestWorkflow();
      workflow.nodes = workflow.nodes.filter((n) => n.type !== NodeType.START);

      const validation = executor.validateWorkflow(workflow);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("工作流必须包含至少一个开始节点");
    });

    it("应该检测缺少结束节点", () => {
      const workflow = createTestWorkflow();
      workflow.nodes = workflow.nodes.filter((n) => n.type !== NodeType.END);

      const validation = executor.validateWorkflow(workflow);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("工作流必须包含至少一个结束节点");
    });

    it("应该检测多个开始节点", () => {
      const workflow = createTestWorkflow();
      workflow.nodes.push({
        id: "start-2",
        type: NodeType.START,
        name: "开始2",
        position: { x: 0, y: 100 },
      });

      const validation = executor.validateWorkflow(workflow);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("工作流只能包含一个开始节点");
    });

    it("应该检测孤立节点", () => {
      const workflow = createTestWorkflow();
      workflow.nodes.push({
        id: "isolated-node",
        type: NodeType.AGENT,
        name: "孤立节点",
        position: { x: 500, y: 500 },
        agentConfig: {
          agentId: "isolated",
          agentType: "test",
        },
      });

      const validation = executor.validateWorkflow(workflow);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("孤立节点"))).toBe(true);
    });
  });

  describe("createInstance", () => {
    it("应该成功创建实例", () => {
      const workflow = createTestWorkflow();
      executor.registerWorkflow(workflow);

      const instance = executor.createInstance(workflow.id, { testInput: "value" });

      expect(instance).toBeDefined();
      expect(instance.workflowId).toBe(workflow.id);
      expect(instance.status).toBe(InstanceStatus.PENDING);
      expect(instance.data.inputs).toEqual({ testInput: "value" });
    });

    it("应该抛出错误如果工作流不存在", () => {
      expect(() => {
        executor.createInstance("non-existent");
      }).toThrow("工作流不存在");
    });

    it("应该抛出错误如果工作流验证失败", () => {
      const workflow = createTestWorkflow();
      workflow.nodes = [];
      executor.registerWorkflow(workflow);

      expect(() => {
        executor.createInstance(workflow.id);
      }).toThrow("工作流验证失败");
    });

    it("应该初始化所有节点状态为 IDLE", () => {
      const workflow = createTestWorkflow();
      executor.registerWorkflow(workflow);

      const instance = executor.createInstance(workflow.id);

      expect(instance.nodeResults.size).toBe(workflow.nodes.length);
      instance.nodeResults.forEach((result) => {
        expect(result.status).toBe(NodeStatus.IDLE);
      });
    });
  });

  describe("executeInstance", () => {
    it("应该成功执行简单工作流", async () => {
      const workflow = createTestWorkflow();
      executor.registerWorkflow(workflow);

      const instance = executor.createInstance(workflow.id);
      const executedInstance = await executor.executeInstance(instance.id);

      expect(executedInstance.status).toBe(InstanceStatus.COMPLETED);
      expect(executedInstance.progress.completed).toBe(workflow.nodes.length);
      expect(executedInstance.metadata.duration).toBeDefined();
    });

    it("应该抛出错误如果实例不存在", async () => {
      await expect(executor.executeInstance("non-existent")).rejects.toThrow(
        "实例不存在",
      );
    });

    it("应该抛出错误如果实例状态不正确", async () => {
      const workflow = createTestWorkflow();
      executor.registerWorkflow(workflow);

      const instance = executor.createInstance(workflow.id);
      await executor.executeInstance(instance.id);

      // 尝试再次执行
      await expect(executor.executeInstance(instance.id)).rejects.toThrow(
        "实例状态错误",
      );
    });

    it("应该更新节点状态为 SUCCESS", async () => {
      const workflow = createTestWorkflow();
      executor.registerWorkflow(workflow);

      const instance = executor.createInstance(workflow.id);
      await executor.executeInstance(instance.id);

      // 检查所有被执行的节点状态
      const executedNodes = ["start-1", "agent-1", "end-1"];
      executedNodes.forEach((nodeId) => {
        const result = instance.nodeResults.get(nodeId);
        expect(result?.status).toBe(NodeStatus.SUCCESS);
      });
    });

    it("应该记录执行日志", async () => {
      const workflow = createTestWorkflow();
      executor.registerWorkflow(workflow);

      const instance = executor.createInstance(workflow.id);
      await executor.executeInstance(instance.id);

      const agentResult = instance.nodeResults.get("agent-1");
      expect(agentResult).toBeDefined();
      expect((agentResult as unknown as { logs?: unknown }).logs).toBeDefined();
    });

    it("应该正确执行条件分支", async () => {
      // 创建包含条件节点的工作流
      const workflowWithCondition: WorkflowDefinition = {
        id: "test-workflow-condition",
        name: "条件工作流",
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          {
            id: "start-1",
            type: NodeType.START,
            name: "开始",
            position: { x: 0, y: 0 },
          },
          {
            id: "condition-1",
            type: NodeType.CONDITION,
            name: "条件判断",
            position: { x: 100, y: 0 },
            conditionConfig: {
              expression: "true", // 总是为 true
            },
          },
          {
            id: "end-1",
            type: NodeType.END,
            name: "结束",
            position: { x: 200, y: 0 },
          },
        ],
        edges: [
          { id: "edge-1", source: "start-1", target: "condition-1", type: "sequence" as any },
          {
            id: "edge-2",
            source: "condition-1",
            target: "end-1",
            type: "condition" as any,
            conditionConfig: {
              condition: "true",
              label: "true",
            },
          },
        ],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "test",
          updatedBy: "test",
        },
      };

      executor.registerWorkflow(workflowWithCondition);
      const instance = executor.createInstance(workflowWithCondition.id);
      const result = await executor.executeInstance(instance.id);

      expect(result.status).toBe(InstanceStatus.COMPLETED);
      expect(result.progress.completed).toBe(workflowWithCondition.nodes.length);
    });
  });

  describe("getInstance", () => {
    it("应该返回存在的实例", () => {
      const workflow = createTestWorkflow();
      executor.registerWorkflow(workflow);

      const instance = executor.createInstance(workflow.id);
      const result = executor.getInstance(instance.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(instance.id);
    });

    it("应该返回 undefined 如果实例不存在", () => {
      const result = executor.getInstance("non-existent");
      expect(result).toBeUndefined();
    });
  });

  describe("getAllInstances", () => {
    it("应该返回所有实例", () => {
      const workflow = createTestWorkflow();
      executor.registerWorkflow(workflow);

      executor.createInstance(workflow.id);
      executor.createInstance(workflow.id);

      const instances = executor.getAllInstances();
      expect(instances).toHaveLength(2);
    });

    it("应该过滤指定工作流的实例", () => {
      const workflow1 = createTestWorkflow();
      const workflow2 = { ...createTestWorkflow(), id: "test-workflow-2" };
      executor.registerWorkflow(workflow1);
      executor.registerWorkflow(workflow2);

      executor.createInstance(workflow1.id);
      executor.createInstance(workflow2.id);

      const instances = executor.getAllInstances(workflow1.id);
      expect(instances).toHaveLength(1);
      expect(instances[0].workflowId).toBe(workflow1.id);
    });
  });

  describe("cancelInstance", () => {
    it("应该取消实例", () => {
      const workflow = createTestWorkflow();
      executor.registerWorkflow(workflow);

      const instance = executor.createInstance(workflow.id);
      executor.cancelInstance(instance.id);

      const result = executor.getInstance(instance.id);
      expect(result?.status).toBe(InstanceStatus.CANCELLED);
      expect(result?.metadata.endedAt).toBeDefined();
    });

    it("应该忽略不存在的实例", () => {
      // 不应该抛出错误
      executor.cancelInstance("non-existent");
    });
  });

  describe("getStatistics", () => {
    it("应该返回正确的统计信息", async () => {
      const workflow = createTestWorkflow();
      executor.registerWorkflow(workflow);

      // 创建并执行实例
      const instance1 = executor.createInstance(workflow.id);
      await executor.executeInstance(instance1.id);

      const instance2 = executor.createInstance(workflow.id);
      await executor.executeInstance(instance2.id);

      // 取消一个实例
      const instance3 = executor.createInstance(workflow.id);
      executor.cancelInstance(instance3.id);

      const stats = executor.getStatistics(workflow.id);

      expect(stats.totalInstances).toBe(3);
      expect(stats.success).toBe(2);
      expect(stats.cancelled).toBe(1);
    });
  });

  describe("clearInstances", () => {
    it("应该清除指定工作流的实例", () => {
      const workflow1 = createTestWorkflow();
      const workflow2 = { ...createTestWorkflow(), id: "test-workflow-2" };
      executor.registerWorkflow(workflow1);
      executor.registerWorkflow(workflow2);

      executor.createInstance(workflow1.id);
      executor.createInstance(workflow2.id);

      executor.clearInstances(workflow1.id);

      const instances1 = executor.getAllInstances(workflow1.id);
      const instances2 = executor.getAllInstances(workflow2.id);

      expect(instances1).toHaveLength(0);
      expect(instances2).toHaveLength(1);
    });

    it("应该清除所有实例", () => {
      const workflow = createTestWorkflow();
      executor.registerWorkflow(workflow);

      executor.createInstance(workflow.id);
      executor.createInstance(workflow.id);

      executor.clearInstances();

      const instances = executor.getAllInstances();
      expect(instances).toHaveLength(0);
    });
  });
});

describe("NodeExecutorRegistry", () => {
  it("应该注册所有内置执行器", () => {
    const types = nodeExecutorRegistry.getRegisteredTypes();

    expect(types).toContain(NodeType.START);
    expect(types).toContain(NodeType.END);
    expect(types).toContain(NodeType.AGENT);
    expect(types).toContain(NodeType.CONDITION);
    expect(types).toContain(NodeType.PARALLEL);
    expect(types).toContain(NodeType.WAIT);
  });

  it("应该返回正确的执行器", () => {
    const executor = nodeExecutorRegistry.get(NodeType.AGENT);
    expect(executor).toBeDefined();
    expect(executor?.canHandle(NodeType.AGENT)).toBe(true);
  });

  it("应该返回 undefined 对于未注册的类型", () => {
    const executor = nodeExecutorRegistry.get("custom" as NodeType);
    expect(executor).toBeUndefined();
  });

  it("应该检查执行器是否存在", () => {
    expect(nodeExecutorRegistry.has(NodeType.AGENT)).toBe(true);
    expect(nodeExecutorRegistry.has("custom" as NodeType)).toBe(false);
  });
});
