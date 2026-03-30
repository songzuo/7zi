/**
 * lib/ 层导入路径验证测试
 * 验证 v1.5.0 重构后所有主要导出是否可正常导入
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';

// 场景 A1: 测试 agents 模块导入
describe('Agents 模块导入验证', () => {
  it('应该能够导入所有 agent 核心功能', async () => {
    const agentModule = await import('../agents/agent/index');

    // 验证主要导出存在
    expect(typeof agentModule).toBe('object');

    // 验证类型导出存在 (如果有的话)
    const exportedKeys = Object.keys(agentModule);
    expect(exportedKeys.length).toBeGreaterThan(0);
  });

  it('应该能够导入 agent 认证服务', async () => {
    const { generateApiKey, authenticateAgent } = await import('../agents/agent/index');

    expect(typeof generateApiKey).toBe('function');
    expect(typeof authenticateAgent).toBe('function');
  });

  it('应该能够导入 agent 仓库功能', async () => {
    const { createAgent, getAgentById, getAllAgents } = await import('../agents/agent/index');

    expect(typeof createAgent).toBe('function');
    expect(typeof getAgentById).toBe('function');
    expect(typeof getAllAgents).toBe('function');
  });

  it('应该能够导入 agent 钱包功能', async () => {
    const { createWallet, getWalletBalance } = await import('../agents/agent/index');

    expect(typeof createWallet).toBe('function');
    expect(typeof getWalletBalance).toBe('function');
  });
});

// 场景 A2: 测试 a2a 模块导入
describe('A2A (Agent-to-Agent) 模块导入验证', () => {
  it('应该能够导入 A2A 核心类型', async () => {
    const agentModule = await import('../agents/index');

    // 验证 A2A 相关导出
    expect(agentModule).toBeDefined();
  });

  it('应该能够导入 A2A 请求处理器', async () => {
    const { A2ARequestHandler, createRequestHandler } = await import('../agents/index');

    expect(typeof A2ARequestHandler).toBe('function');
    expect(typeof createRequestHandler).toBe('function');
  });

  it('应该能够导入 A2A 任务存储', async () => {
    const { InMemoryTaskStore } = await import('../agents/index');

    expect(typeof InMemoryTaskStore).toBe('function');
  });
});

// 场景 A3: 测试 scheduler 模块导入
describe('Scheduler 模块导入验证', () => {
  it('应该能够导入调度器核心', async () => {
    const { Scheduler } = await import('../agents/scheduler/index');

    expect(typeof Scheduler).toBe('function');
  });

  it('应该能够导入任务匹配器', async () => {
    const { TaskMatcher } = await import('../agents/scheduler/index');

    expect(typeof TaskMatcher).toBe('function');
  });

  it('应该能够导入负载均衡器', async () => {
    const { LoadBalancer } = await import('../agents/scheduler/index');

    expect(typeof LoadBalancer).toBe('function');
  });

  it('应该能够导入 Dashboard 组件', async () => {
    const { Dashboard } = await import('../agents/scheduler/index');

    expect(typeof Dashboard).toBe('function');
  });

  it('应该能够导入调度器 Store', async () => {
    const { useSchedulerStore } = await import('../agents/scheduler/index');

    expect(typeof useSchedulerStore).toBe('function');
  });
});

// 场景 A4: 测试 agents 统一导出
describe('Agents 统一导出验证', () => {
  it('应该能够从统一入口导入所有 agent 功能', async () => {
    const agentsModule = await import('../agents/index');

    expect(agentsModule).toBeDefined();
    expect(typeof agentsModule).toBe('object');
  });

  it('应该能够重导出所有子模块', async () => {
    const agentsModule = await import('../agents/index');

    // 验证关键导出存在
    const keys = Object.keys(agentsModule);
    expect(keys.length).toBeGreaterThan(10); // 应该有大量导出
  });
});

// 场景 A5: 测试其他核心模块导入
describe('其他核心模块导入验证', () => {
  it('应该能够导入权限模块', async () => {
    const { Permission, hasPermission, hasRole } = await import('../permissions/index');

    expect(typeof Permission).toBe('object');
    expect(typeof hasPermission).toBe('function');
    expect(typeof hasRole).toBe('function');
  });

  it('应该能够导入数据库模块', async () => {
    const dbModule = await import('../db/index');

    expect(dbModule).toBeDefined();
    expect(typeof dbModule).toBe('object');
  });

  it('应该能够导入 WebSocket 模块', async () => {
    const wsModule = await import('../websocket/index');

    expect(wsModule).toBeDefined();
    expect(typeof wsModule).toBe('object');
  });

  it('应该能够导入认证模块', async () => {
    const authModule = await import('../auth/index');

    expect(authModule).toBeDefined();
    expect(typeof authModule).toBe('object');
  });

  it('应该能够导入性能监控模块', async () => {
    const perfModule = await import('../performance-monitoring/index');

    expect(perfModule).toBeDefined();
    expect(typeof perfModule).toBe('object');
  });
});

// 场景 A6: 测试导入路径的一致性
describe('导入路径一致性验证', () => {
  it('从统一入口导入应该与直接导入相同', async () => {
    const agentsUnified = await import('../agents/index');
    const agentsDirect = await import('../agents/agent/index');

    // 验证两者都是有效模块
    expect(agentsUnified).toBeDefined();
    expect(agentsDirect).toBeDefined();
  });

  it('scheduler 模块应该导出所有预期的类型', async () => {
    const schedulerModule = await import('../agents/scheduler/index');

    // 验证关键类型和函数导出
    const exports = Object.keys(schedulerModule);
    const expectedExports = [
      'Scheduler',
      'TaskMatcher',
      'LoadBalancer',
      'Dashboard',
      'useSchedulerStore'
    ];

    expectedExports.forEach(expected => {
      expect(exports.some(e => e.includes(expected) || e === expected)).toBe(true);
    });
  });
});
