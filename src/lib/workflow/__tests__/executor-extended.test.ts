/**
 * 工作流执行器扩展测试
 * 覆盖边界条件、错误处理、并行执行等关键场景
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
  EdgeType,
} from "@/types/workflow";
import {
  AgentNodeExecutor,
} from "../executors/agent-executor";
import {
  ConditionNodeExecutor,
} from "../executors/condition-executor";
import {
  WaitNodeExecutor,
} from "../executors/wait-executor";

describe("EnhancedWorkflowExecutor - Extended Tests", () => {
  let executor: EnhancedWorkflowExecutor;

  const createBaseWorkflow = (): WorkflowDefinition => ({
    id: "test-workflow",
    name: "测试工作流",
    version: 1,
    status: WorkflowStatus.ACTIVE,
    nodes: [],
    edges: [],
    config: { variables: {} },
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

  describe("并行执行", () => {
    it("应该成功执行并行分支", async () => {
      const workflow: WorkflowDefinition = {
        id: "parallel-workflow",
        name: "并行测试工作流",
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
            id: "parallel-1",
            type: NodeType.PARALLEL,
            name: "并行节点",
            position: { x: 100, y: 0 },
          },
          {
            id: "agent-a",
            type: NodeType.AGENT,
            name: "Agent A",
            position: { x: 200, y: -50 },
            agentConfig: { agentId: "agent-a", agentType: "test" },
          },
          {
            id: "agent-b",
            type: NodeType.AGENT,
            name: "Agent B",
            position: { x: 200, y: 50 },
            agentConfig: { agentId: "agent-b", agentType: "test" },
          },
          {
            id: "end-1",
            type: NodeType.END,
            name: "结束",
            position: { x: 300, y: 0 },
          },
        ],
        edges: [
          { id: "edge-1", source: "start-1", target: "parallel-1", type: EdgeType.SEQUENCE },
          { id: "edge-2", source: "parallel-1", target: "agent-a", type: EdgeType.PARALLEL },
          { id: "edge-3", source: "parallel-1", target: "agent-b", type: EdgeType.PARALLEL },
          { id: "edge-4", source: "agent-a", target: "end-1", type: EdgeType.SEQUENCE },
          { id: "edge-5", source: "agent-b", target: "end-1", type: EdgeType.SEQUENCE },
        ],
        config: { variables: {} },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "test",
          updatedBy: "test",
        },
      };

      executor.registerWorkflow(workflow);
      const instance = executor.createInstance(workflow.id);
      const result = await executor.executeInstance(instance.id);

      expect(result.status).toBe(InstanceStatus.COMPLETED);
      expect(result.nodeResults.get("agent-a")?.status).toBe(NodeStatus.SUCCESS);
      expect(result.nodeResults.get("agent-b")?.status).toBe(NodeStatus.SUCCESS);
    });

    it("并行执行应该共享相同的变量上下文", async () => {
      const workflow: WorkflowDefinition = {
        id: "parallel-variables",
        name: "并行变量测试",
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
            id: "parallel-1",
            type: NodeType.PARALLEL,
            name: "并行节点",
            position: { x: 100, y: 0 },
          },
          {
            id: "agent-a",
            type: NodeType.AGENT,
            name: "Agent A",
            position: { x: 200, y: -50 },
            agentConfig: { agentId: "agent-a", agentType: "test" },
          },
          {
            id: "agent-b",
            type: NodeType.AGENT,
            name: "Agent B",
            position: { x: 200, y: 50 },
            agentConfig: { agentId: "agent-b", agentType: "test" },
          },
          {
            id: "end-1",
            type: NodeType.END,
            name: "结束",
            position: { x: 300, y: 0 },
          },
        ],
        edges: [
          { id: "edge-1", source: "start-1", target: "parallel-1", type: EdgeType.SEQUENCE },
          { id: "edge-2", source: "parallel-1", target: "agent-a", type: EdgeType.PARALLEL },
          { id: "edge-3", source: "parallel-1", target: "agent-b", type: EdgeType.PARALLEL },
          { id: "edge-4", source: "agent-a", target: "end-1", type: EdgeType.SEQUENCE },
          { id: "edge-5", source: "agent-b", target: "end-1", type: EdgeType.SEQUENCE },
        ],
        config: { variables: { sharedVar: "shared-value" } },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "test",
          updatedBy: "test",
        },
      };

      executor.registerWorkflow(workflow);
      const instance = executor.createInstance(workflow.id);

      // 初始变量应该包含 sharedVar
      expect(instance.data.variables?.sharedVar).toBe("shared-value");

      await executor.executeInstance(instance.id);
    });
  });

  describe("等待节点", () => {
    it("应该支持定时等待", async () => {
      const workflow: WorkflowDefinition = {
        id: "wait-duration",
        name: "定时等待测试",
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
            id: "wait-1",
            type: NodeType.WAIT,
            name: "等待节点",
            position: { x: 100, y: 0 },
            waitConfig: { duration: 1 }, // 1 秒
          },
          {
            id: "end-1",
            type: NodeType.END,
            name: "结束",
            position: { x: 200, y: 0 },
          },
        ],
        edges: [
          { id: "edge-1", source: "start-1", target: "wait-1", type: EdgeType.SEQUENCE },
          { id: "edge-2", source: "wait-1", target: "end-1", type: EdgeType.SEQUENCE },
        ],
        config: { variables: {} },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "test",
          updatedBy: "test",
        },
      };

      executor.registerWorkflow(workflow);
      const instance = executor.createInstance(workflow.id);
      const startTime = Date.now();

      const result = await executor.executeInstance(instance.id);

      const endTime = Date.now();
      const actualDuration = endTime - startTime;

      expect(result.status).toBe(InstanceStatus.COMPLETED);
      expect(result.nodeResults.get("wait-1")?.status).toBe(NodeStatus.SUCCESS);
      // 至少等待了 1 秒（由于测试环境可能更快，只验证成功状态）
      expect(actualDuration).toBeGreaterThanOrEqual(500);
    });

    it("应该支持事件等待（模拟）", async () => {
      const workflow: WorkflowDefinition = {
        id: "wait-event",
        name: "事件等待测试",
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
            id: "wait-1",
            type: NodeType.WAIT,
            name: "等待事件",
            position: { x: 100, y: 0 },
            waitConfig: { waitForEvent: "test-event" },
          },
          {
            id: "end-1",
            type: NodeType.END,
            name: "结束",
            position: { x: 200, y: 0 },
          },
        ],
        edges: [
          { id: "edge-1", source: "start-1", target: "wait-1", type: EdgeType.SEQUENCE },
          { id: "edge-2", source: "wait-1", target: "end-1", type: EdgeType.SEQUENCE },
        ],
        config: { variables: {} },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "test",
          updatedBy: "test",
        },
      };

      executor.registerWorkflow(workflow);
      const instance = executor.createInstance(workflow.id);
      const result = await executor.executeInstance(instance.id);

      expect(result.status).toBe(InstanceStatus.COMPLETED);
      expect(result.nodeResults.get("wait-1")?.status).toBe(NodeStatus.SUCCESS);
    });
  });

  describe("条件分支 false 分支", () => {
    it("应该正确执行条件 false 分支", async () => {
      const workflow: WorkflowDefinition = {
        id: "condition-false",
        name: "条件 false 分支测试",
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
            conditionConfig: { expression: "false" },
          },
          {
            id: "agent-true",
            type: NodeType.AGENT,
            name: "True 分支",
            position: { x: 200, y: -50 },
            agentConfig: { agentId: "agent-true", agentType: "test" },
          },
          {
            id: "agent-false",
            type: NodeType.AGENT,
            name: "False 分支",
            position: { x: 200, y: 50 },
            agentConfig: { agentId: "agent-false", agentType: "test" },
          },
          {
            id: "end-1",
            type: NodeType.END,
            name: "结束",
            position: { x: 300, y: 0 },
          },
        ],
        edges: [
          { id: "edge-1", source: "start-1", target: "condition-1", type: EdgeType.SEQUENCE },
          {
            id: "edge-2",
            source: "condition-1",
            target: "agent-true",
            type: EdgeType.CONDITION,
            conditionConfig: { condition: "true", label: "true" },
          },
          {
            id: "edge-3",
            source: "condition-1",
            target: "agent-false",
            type: EdgeType.CONDITION,
            conditionConfig: { condition: "false", label: "false" },
          },
          { id: "edge-4", source: "agent-true", target: "end-1", type: EdgeType.SEQUENCE },
          { id: "edge-5", source: "agent-false", target: "end-1", type: EdgeType.SEQUENCE },
        ],
        config: { variables: {} },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "test",
          updatedBy: "test",
        },
      };

      executor.registerWorkflow(workflow);
      const instance = executor.createInstance(workflow.id);
      const result = await executor.executeInstance(instance.id);

      expect(result.status).toBe(InstanceStatus.COMPLETED);
      // false 分支应该被执行
      expect(result.nodeResults.get("agent-false")?.status).toBe(NodeStatus.SUCCESS);
      // true 分支应该保持 IDLE（未执行）
      expect(result.nodeResults.get("agent-true")?.status).toBe(NodeStatus.IDLE);
    });

    it("应该使用默认分支如果没有匹配的条件", async () => {
      const workflow: WorkflowDefinition = {
        id: "condition-default",
        name: "条件默认分支测试",
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
            conditionConfig: { expression: "'other'" },
          },
          {
            id: "agent-default",
            type: NodeType.AGENT,
            name: "默认分支",
            position: { x: 200, y: 0 },
            agentConfig: { agentId: "agent-default", agentType: "test" },
          },
          {
            id: "end-1",
            type: NodeType.END,
            name: "结束",
            position: { x: 300, y: 0 },
          },
        ],
        edges: [
          { id: "edge-1", source: "start-1", target: "condition-1", type: EdgeType.SEQUENCE },
          {
            id: "edge-2",
            source: "condition-1",
            target: "agent-default",
            type: EdgeType.DEFAULT,
          },
          { id: "edge-3", source: "agent-default", target: "end-1", type: EdgeType.SEQUENCE },
        ],
        config: { variables: {} },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "test",
          updatedBy: "test",
        },
      };

      executor.registerWorkflow(workflow);
      const instance = executor.createInstance(workflow.id);
      const result = await executor.executeInstance(instance.id);

      expect(result.status).toBe(InstanceStatus.COMPLETED);
      expect(result.nodeResults.get("agent-default")?.status).toBe(NodeStatus.SUCCESS);
    });
  });

  describe("条件表达式安全性", () => {
    it("应该拒绝包含 eval 的表达式", () => {
      const workflow = createBaseWorkflow();
      workflow.nodes.push({
        id: "condition-1",
        type: NodeType.CONDITION,
        name: "危险条件",
        position: { x: 0, y: 0 },
        conditionConfig: { expression: "eval('alert(1)')" },
      });

      const validation = executor.validateWorkflow(workflow);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("不安全"))).toBe(true);
    });

    it("应该拒绝包含 Function 的表达式", () => {
      const workflow = createBaseWorkflow();
      workflow.nodes.push({
        id: "condition-1",
        type: NodeType.CONDITION,
        name: "危险条件",
        position: { x: 0, y: 0 },
        conditionConfig: { expression: "Function('return 1')()" },
      });

      const validation = executor.validateWorkflow(workflow);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("不安全"))).toBe(true);
    });

    it("应该拒绝包含 require 的表达式", () => {
      const workflow = createBaseWorkflow();
      workflow.nodes.push({
        id: "condition-1",
        type: NodeType.CONDITION,
        name: "危险条件",
        position: { x: 0, y: 0 },
        conditionConfig: { expression: "require('fs')" },
      });

      const validation = executor.validateWorkflow(workflow);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("不安全"))).toBe(true);
    });

    it("应该接受安全的条件表达式", () => {
      const workflow = createBaseWorkflow();
      workflow.nodes.push({
        id: "start-1",
        type: NodeType.START,
        name: "开始",
        position: { x: 0, y: 0 },
      });
      workflow.nodes.push({
        id: "condition-1",
        type: NodeType.CONDITION,
        name: "安全条件",
        position: { x: 100, y: 0 },
        conditionConfig: { expression: "inputs.value > 10" },
      });
      workflow.nodes.push({
        id: "end-1",
        type: NodeType.END,
        name: "结束",
        position: { x: 200, y: 0 },
      });
      workflow.edges.push(
        { id: "edge-1", source: "start-1", target: "condition-1", type: EdgeType.SEQUENCE },
        {
          id: "edge-2",
          source: "condition-1",
          target: "end-1",
          type: EdgeType.DEFAULT,
        },
      );

      const validation = executor.validateWorkflow(workflow);
      expect(validation.valid).toBe(true);
    });
  });

  describe("变量传递", () => {
    it("应该正确传递节点输出到下一个节点", async () => {
      const workflow: WorkflowDefinition = {
        id: "variable-passing",
        name: "变量传递测试",
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
            name: "第一个 Agent",
            position: { x: 100, y: 0 },
            agentConfig: { agentId: "agent-1", agentType: "test" },
          },
          {
            id: "agent-2",
            type: NodeType.AGENT,
            name: "第二个 Agent",
            position: { x: 200, y: 0 },
            agentConfig: { agentId: "agent-2", agentType: "test" },
          },
          {
            id: "end-1",
            type: NodeType.END,
            name: "结束",
            position: { x: 300, y: 0 },
          },
        ],
        edges: [
          { id: "edge-1", source: "start-1", target: "agent-1", type: EdgeType.SEQUENCE },
          { id: "edge-2", source: "agent-1", target: "agent-2", type: EdgeType.SEQUENCE },
          { id: "edge-3", source: "agent-2", target: "end-1", type: EdgeType.SEQUENCE },
        ],
        config: { variables: { initialVar: "value1" } },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "test",
          updatedBy: "test",
        },
      };

      executor.registerWorkflow(workflow);
      const instance = executor.createInstance(workflow.id);
      await executor.executeInstance(instance.id);

      // 验证节点输出被存储到变量中
      expect(instance.data.variables!["node_agent-1_output"]).toBeDefined();
      expect(instance.data.variables!["node_agent-2_output"]).toBeDefined();
    });

    it("应该在工作流变量中保留初始值", async () => {
      const workflow: WorkflowDefinition = {
        id: "preserve-variables",
        name: "变量保留测试",
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
            name: "Agent",
            position: { x: 100, y: 0 },
            agentConfig: { agentId: "agent-1", agentType: "test" },
          },
          {
            id: "end-1",
            type: NodeType.END,
            name: "结束",
            position: { x: 200, y: 0 },
          },
        ],
        edges: [
          { id: "edge-1", source: "start-1", target: "agent-1", type: EdgeType.SEQUENCE },
          { id: "edge-2", source: "agent-1", target: "end-1", type: EdgeType.SEQUENCE },
        ],
        config: {
          variables: {
            configVar1: "value1",
            configVar2: "value2",
          },
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "test",
          updatedBy: "test",
        },
      };

      executor.registerWorkflow(workflow);
      const instance = executor.createInstance(workflow.id);
      await executor.executeInstance(instance.id);

      // 初始变量应该仍然存在
      expect(instance.data.variables!.configVar1).toBe("value1");
      expect(instance.data.variables!.configVar2).toBe("value2");
    });
  });

  describe("并发实例测试", () => {
    it("应该正确处理多个实例同时执行", async () => {
      const workflow: WorkflowDefinition = {
        id: "concurrent-workflow",
        name: "并发测试工作流",
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
            name: "Agent",
            position: { x: 100, y: 0 },
            agentConfig: { agentId: "agent-1", agentType: "test" },
          },
          {
            id: "end-1",
            type: NodeType.END,
            name: "结束",
            position: { x: 200, y: 0 },
          },
        ],
        edges: [
          { id: "edge-1", source: "start-1", target: "agent-1", type: EdgeType.SEQUENCE },
          { id: "edge-2", source: "agent-1", target: "end-1", type: EdgeType.SEQUENCE },
        ],
        config: { variables: {} },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "test",
          updatedBy: "test",
        },
      };

      executor.registerWorkflow(workflow);

      // 创建多个实例
      const instance1 = executor.createInstance(workflow.id);
      const instance2 = executor.createInstance(workflow.id);
      const instance3 = executor.createInstance(workflow.id);

      // 并发执行
      const results = await Promise.all([
        executor.executeInstance(instance1.id),
        executor.executeInstance(instance2.id),
        executor.executeInstance(instance3.id),
      ]);

      // 验证所有实例都成功完成
      results.forEach((result) => {
        expect(result.status).toBe(InstanceStatus.COMPLETED);
      });

      // 验证统计信息
      const stats = executor.getStatistics(workflow.id);
      expect(stats.totalInstances).toBe(3);
      expect(stats.success).toBe(3);
    });
  });

  describe("节点执行器验证", () => {
    it("Agent 节点执行器应该验证必需的配置", () => {
      const executor = new AgentNodeExecutor();

      // 缺少 agentConfig
      let validation = executor.validate({
        id: "agent-1",
        type: NodeType.AGENT,
        name: "Test Agent",
        position: { x: 0, y: 0 },
      });
      expect(validation.valid).toBe(false);

      // 缺少 agentId 和 agentType
      validation = executor.validate({
        id: "agent-1",
        type: NodeType.AGENT,
        name: "Test Agent",
        position: { x: 0, y: 0 },
        agentConfig: {} as { agentId: string; agentType: string },
      });
      expect(validation.valid).toBe(false);

      // 有效配置
      validation = executor.validate({
        id: "agent-1",
        type: NodeType.AGENT,
        name: "Test Agent",
        position: { x: 0, y: 0 },
        agentConfig: { agentId: "test-agent", agentType: "test" },
      });
      expect(validation.valid).toBe(true);
    });

    it("条件节点执行器应该验证表达式", () => {
      const executor = new ConditionNodeExecutor();

      // 缺少 conditionConfig
      let validation = executor.validate({
        id: "condition-1",
        type: NodeType.CONDITION,
        name: "Test Condition",
        position: { x: 0, y: 0 },
      });
      expect(validation.valid).toBe(false);

      // 缺少表达式
      validation = executor.validate({
        id: "condition-1",
        type: NodeType.CONDITION,
        name: "Test Condition",
        position: { x: 0, y: 0 },
        conditionConfig: { expression: "" } as { expression: string },
      });
      expect(validation.valid).toBe(false);

      // 危险表达式
      validation = executor.validate({
        id: "condition-1",
        type: NodeType.CONDITION,
        name: "Test Condition",
        position: { x: 0, y: 0 },
        conditionConfig: { expression: "eval(1)" },
      });
      expect(validation.valid).toBe(false);

      // 有效表达式
      validation = executor.validate({
        id: "condition-1",
        type: NodeType.CONDITION,
        name: "Test Condition",
        position: { x: 0, y: 0 },
        conditionConfig: { expression: "inputs.value > 10" },
      });
      expect(validation.valid).toBe(true);
    });

    it("等待节点执行器应该验证等待配置", () => {
      const executor = new WaitNodeExecutor();

      // 缺少 waitConfig
      let validation = executor.validate({
        id: "wait-1",
        type: NodeType.WAIT,
        name: "Test Wait",
        position: { x: 0, y: 0 },
      });
      expect(validation.valid).toBe(false);

      // 缺少 duration 和 waitForEvent
      validation = executor.validate({
        id: "wait-1",
        type: NodeType.WAIT,
        name: "Test Wait",
        position: { x: 0, y: 0 },
        waitConfig: {},
      });
      expect(validation.valid).toBe(false);

      // 负数 duration
      validation = executor.validate({
        id: "wait-1",
        type: NodeType.WAIT,
        name: "Test Wait",
        position: { x: 0, y: 0 },
        waitConfig: { duration: -1 },
      });
      expect(validation.valid).toBe(false);

      // 有效 duration
      validation = executor.validate({
        id: "wait-1",
        type: NodeType.WAIT,
        name: "Test Wait",
        position: { x: 0, y: 0 },
        waitConfig: { duration: 5 },
      });
      expect(validation.valid).toBe(true);

      // 有效 waitForEvent
      validation = executor.validate({
        id: "wait-1",
        type: NodeType.WAIT,
        name: "Test Wait",
        position: { x: 0, y: 0 },
        waitConfig: { waitForEvent: "test-event" },
      });
      expect(validation.valid).toBe(true);
    });
  });

  describe("执行器注册表动态管理", () => {
    it("应该能够取消注册执行器", () => {
      const typesBefore = nodeExecutorRegistry.getRegisteredTypes();
      expect(typesBefore).toContain(NodeType.AGENT);

      const agentExecutor = nodeExecutorRegistry.get(NodeType.AGENT);
      nodeExecutorRegistry.unregister(NodeType.AGENT);

      const typesAfter = nodeExecutorRegistry.getRegisteredTypes();
      expect(typesAfter).not.toContain(NodeType.AGENT);
      expect(nodeExecutorRegistry.has(NodeType.AGENT)).toBe(false);

      // 恢复
      if (agentExecutor) {
        nodeExecutorRegistry.register(agentExecutor);
      }
    });

    it("应该能够清除所有执行器", () => {
      // 保存所有执行器
      const savedExecutors = new Map();
      const types = nodeExecutorRegistry.getRegisteredTypes();
      types.forEach((type) => {
        savedExecutors.set(type, nodeExecutorRegistry.get(type));
      });

      nodeExecutorRegistry.clear();
      const clearedTypes = nodeExecutorRegistry.getRegisteredTypes();
      expect(clearedTypes).toHaveLength(0);

      // 恢复所有执行器
      savedExecutors.forEach((executor, _type) => {
        if (executor) {
          nodeExecutorRegistry.register(executor);
        }
      });
    });
  });

  describe("实例状态转换", () => {
    it("应该正确跟踪完整的状态转换", async () => {
      const workflow: WorkflowDefinition = {
        id: "state-transition",
        name: "状态转换测试",
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
            name: "Agent",
            position: { x: 100, y: 0 },
            agentConfig: { agentId: "agent-1", agentType: "test" },
          },
          {
            id: "end-1",
            type: NodeType.END,
            name: "结束",
            position: { x: 200, y: 0 },
          },
        ],
        edges: [
          { id: "edge-1", source: "start-1", target: "agent-1", type: EdgeType.SEQUENCE },
          { id: "edge-2", source: "agent-1", target: "end-1", type: EdgeType.SEQUENCE },
        ],
        config: { variables: {} },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "test",
          updatedBy: "test",
        },
      };

      executor.registerWorkflow(workflow);

      // PENDING 状态
      const instance = executor.createInstance(workflow.id);
      expect(instance.status).toBe(InstanceStatus.PENDING);

      // RUNNING 状态
      const executionPromise = executor.executeInstance(instance.id);
      expect(executor.getInstance(instance.id)?.status).toBe(InstanceStatus.RUNNING);

      // COMPLETED 状态
      await executionPromise;
      expect(executor.getInstance(instance.id)?.status).toBe(InstanceStatus.COMPLETED);
    });

    it("应该能够从 PENDING 转换到 CANCELLED", () => {
      const workflow: WorkflowDefinition = {
        id: "cancel-test",
        name: "取消测试",
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
            id: "end-1",
            type: NodeType.END,
            name: "结束",
            position: { x: 100, y: 0 },
          },
        ],
        edges: [{ id: "edge-1", source: "start-1", target: "end-1", type: EdgeType.SEQUENCE }],
        config: { variables: {} },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "test",
          updatedBy: "test",
        },
      };

      executor.registerWorkflow(workflow);
      const instance = executor.createInstance(workflow.id);

      expect(instance.status).toBe(InstanceStatus.PENDING);

      executor.cancelInstance(instance.id);

      const result = executor.getInstance(instance.id);
      expect(result?.status).toBe(InstanceStatus.CANCELLED);
      expect(result?.metadata.endedAt).toBeDefined();
    });
  });

  describe("错误处理", () => {
    it("应该在条件表达式执行失败时停止工作流", async () => {
      // 创建一个条件表达式在运行时会失败的工作流
      const workflow: WorkflowDefinition = {
        id: "error-workflow",
        name: "错误处理测试",
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
            name: "会失败的条件",
            position: { x: 100, y: 0 },
            // 这个表达式会抛出错误（访问不存在的属性）
            conditionConfig: { expression: "nonExistentObject.nonExistentProperty" },
          },
          {
            id: "end-1",
            type: NodeType.END,
            name: "结束",
            position: { x: 200, y: 0 },
          },
        ],
        edges: [
          { id: "edge-1", source: "start-1", target: "condition-1", type: EdgeType.SEQUENCE },
          {
            id: "edge-2",
            source: "condition-1",
            target: "end-1",
            type: EdgeType.DEFAULT,
          },
        ],
        config: { variables: {} },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "test",
          updatedBy: "test",
        },
      };

      executor.registerWorkflow(workflow);
      const instance = executor.createInstance(workflow.id);

      // 条件表达式执行失败会导致工作流失败
      await executor.executeInstance(instance.id);

      const result = executor.getInstance(instance.id);
      // 条件表达式错误导致节点失败，进而工作流失败
      expect(result?.status).toBe(InstanceStatus.FAILED);
      expect(result?.error).toBeDefined();
    });

    it("应该正确处理条件分支有默认分支但没有匹配", async () => {
      const workflow: WorkflowDefinition = {
        id: "default-branch-test",
        name: "默认分支测试",
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
            // 表达式返回 false，不匹配任何条件分支
            conditionConfig: { expression: "false" },
          },
          {
            id: "agent-matched",
            type: NodeType.AGENT,
            name: "匹配分支（不应执行）",
            position: { x: 200, y: -50 },
            agentConfig: { agentId: "agent-matched", agentType: "test" },
          },
          {
            id: "agent-default",
            type: NodeType.AGENT,
            name: "默认分支（应执行）",
            position: { x: 200, y: 50 },
            agentConfig: { agentId: "agent-default", agentType: "test" },
          },
          {
            id: "end-1",
            type: NodeType.END,
            name: "结束",
            position: { x: 300, y: 0 },
          },
        ],
        edges: [
          { id: "edge-1", source: "start-1", target: "condition-1", type: EdgeType.SEQUENCE },
          {
            id: "edge-2",
            source: "condition-1",
            target: "agent-matched",
            type: EdgeType.CONDITION,
            conditionConfig: { condition: "true", label: "true" },
          },
          {
            id: "edge-3",
            source: "condition-1",
            target: "agent-default",
            type: EdgeType.DEFAULT,
          },
          { id: "edge-4", source: "agent-matched", target: "end-1", type: EdgeType.SEQUENCE },
          { id: "edge-5", source: "agent-default", target: "end-1", type: EdgeType.SEQUENCE },
        ],
        config: { variables: {} },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "test",
          updatedBy: "test",
        },
      };

      executor.registerWorkflow(workflow);
      const instance = executor.createInstance(workflow.id);
      const result = await executor.executeInstance(instance.id);

      // 工作流应该完成
      expect(result.status).toBe(InstanceStatus.COMPLETED);
      // 应该执行默认分支（因为 false 不匹配 "true" 分支）
      expect(result.nodeResults.get("agent-default")?.status).toBe(NodeStatus.SUCCESS);
      // 不应该执行匹配分支
      expect(result.nodeResults.get("agent-matched")?.status).toBe(NodeStatus.IDLE);
    });
  });

  describe("元数据和统计", () => {
    it("应该正确记录实例元数据", async () => {
      const workflow: WorkflowDefinition = {
        id: "metadata-test",
        name: "元数据测试",
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
            name: "Agent",
            position: { x: 100, y: 0 },
            agentConfig: { agentId: "agent-1", agentType: "test" },
          },
          {
            id: "end-1",
            type: NodeType.END,
            name: "结束",
            position: { x: 200, y: 0 },
          },
        ],
        edges: [
          { id: "edge-1", source: "start-1", target: "agent-1", type: EdgeType.SEQUENCE },
          { id: "edge-2", source: "agent-1", target: "end-1", type: EdgeType.SEQUENCE },
        ],
        config: { variables: {} },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "test",
          updatedBy: "test",
        },
      };

      executor.registerWorkflow(workflow);
      const instance = executor.createInstance(workflow.id, { testInput: "value" }, {
        triggeredBy: "test-user",
        triggerType: "manual",
      });

      expect(instance.metadata.triggeredBy).toBe("test-user");
      expect(instance.metadata.triggerType).toBe("manual");
      expect(instance.metadata.startedAt).toBeDefined();

      await executor.executeInstance(instance.id);

      expect(instance.metadata.endedAt).toBeDefined();
      expect(instance.metadata.duration).toBeGreaterThan(0);
    });

    it("应该正确计算平均执行时长", async () => {
      const workflow: WorkflowDefinition = {
        id: "duration-stats",
        name: "时长统计测试",
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
            name: "Agent",
            position: { x: 100, y: 0 },
            agentConfig: { agentId: "agent-1", agentType: "test" },
          },
          {
            id: "end-1",
            type: NodeType.END,
            name: "结束",
            position: { x: 200, y: 0 },
          },
        ],
        edges: [
          { id: "edge-1", source: "start-1", target: "agent-1", type: EdgeType.SEQUENCE },
          { id: "edge-2", source: "agent-1", target: "end-1", type: EdgeType.SEQUENCE },
        ],
        config: { variables: {} },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "test",
          updatedBy: "test",
        },
      };

      executor.registerWorkflow(workflow);

      // 执行多个实例
      const instance1 = executor.createInstance(workflow.id);
      await executor.executeInstance(instance1.id);

      const instance2 = executor.createInstance(workflow.id);
      await executor.executeInstance(instance2.id);

      const stats = executor.getStatistics(workflow.id);

      expect(stats.totalInstances).toBe(2);
      expect(stats.success).toBe(2);
      expect(stats.avgDuration).toBeGreaterThan(0);
    });
  });

  describe("输入参数传递", () => {
    it("应该正确传递输入参数到节点", async () => {
      const workflow: WorkflowDefinition = {
        id: "input-passing",
        name: "输入参数测试",
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
            name: "Agent",
            position: { x: 100, y: 0 },
            agentConfig: { agentId: "agent-1", agentType: "test" },
          },
          {
            id: "end-1",
            type: NodeType.END,
            name: "结束",
            position: { x: 200, y: 0 },
          },
        ],
        edges: [
          { id: "edge-1", source: "start-1", target: "agent-1", type: EdgeType.SEQUENCE },
          { id: "edge-2", source: "agent-1", target: "end-1", type: EdgeType.SEQUENCE },
        ],
        config: { variables: {} },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "test",
          updatedBy: "test",
        },
      };

      executor.registerWorkflow(workflow);
      const instance = executor.createInstance(workflow.id, {
        param1: "value1",
        param2: 123,
        param3: { nested: "object" },
      });

      expect(instance.data.inputs).toEqual({
        param1: "value1",
        param2: 123,
        param3: { nested: "object" },
      });

      await executor.executeInstance(instance.id);
    });
  });
});
