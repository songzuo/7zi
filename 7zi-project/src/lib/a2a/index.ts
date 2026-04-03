/**
 * A2A Protocol Module Exports
 */

// 核心类
export { A2AProtocol } from './A2AProtocol';
export { A2AClient } from './A2AClient';
export { A2AServer } from './A2AServer';

// 类型定义
export type {
  A2AMessage,
  A2ARequestOptions,
  A2AHandler,
  A2AConnection,
  A2AServerConfig,
  A2AClientConfig,
  A2AEvent,
  A2AEventHandler
} from './A2ATypes';

// 示例（可选导出）
export {
  example1_basicSetup,
  example2_notifications,
  example3_requestResponse,
  example4_errorHandling,
  example5_eventHandling,
  example6_messageHistory,
  example7_connectionManagement,
  runAllExamples
} from './examples/A2AExamples';
