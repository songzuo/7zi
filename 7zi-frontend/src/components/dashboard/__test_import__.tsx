/**
 * 测试导入 - 验证组件是否能正确导入
 */

import { AgentStatusPanel, type Agent, type AgentTask, type ResourceUsage } from './index';

// 测试类型是否正确导出
const testAgent: Agent = {
  id: 'test-1',
  name: 'Test Agent',
  type: 'developer',
  status: 'active',
  lastActiveAt: new Date().toISOString(),
  enabled: true,
};

// 测试组件是否能正确使用
export function TestImport() {
  return (
    <AgentStatusPanel
      agents={[testAgent]}
      showResourceDetails={true}
      pageSize={10}
    />
  );
}

export { testAgent };
