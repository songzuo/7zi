# 未使用代码分析报告

生成时间: 2026/4/4 16:47:13

## 📊 摘要

| 指标                 | 数量 |
| -------------------- | ---- |
| 总文件数             | 75   |
| 包含未使用导入的文件 | 0    |
| 包含未使用导出的文件 | 27   |
| 可能包含死代码的文件 | 11   |

## 📤 未使用的导出

以下文件包含导出但未被其他文件引用：

_注意：已排除 Next.js 路由文件（page.tsx, layout.tsx 等）_

### src/lib/a2a/examples/A2AExamples.ts

- 命名导出: `example1_basicSetup`, `example2_notifications`, `example3_requestResponse`, `example4_errorHandling`, `example5_eventHandling`, `example6_messageHistory`, `example7_connectionManagement`, `runAllExamples`

### src/lib/a2a/index.ts

- 类型导出: `A2AHandler`

### src/lib/agents/index.ts

- 命名导出: `type MemoryEntry`, `type MemoryMetadata`, `type CreateMemoryInput`, `type UpdateMemoryInput`, `type MemorySearchQuery`, `type SemanticSearchOptions`, `type MemorySearchResult`, `type CleanupOptions`, `type CleanupResult`, `type MemorySystemConfig`, `type IAgentMemory`, `type MemoryStats`

### src/lib/agents/memory/index.ts

- 命名导出: `// Enums
MemoryType`, `// Interfaces
type MemoryEntry`, `type MemoryMetadata`, `type CreateMemoryInput`, `type UpdateMemoryInput`, `type MemorySearchQuery`, `type SemanticSearchOptions`, `type MemorySearchResult`, `type CleanupOptions`, `type CleanupResult`, `type MemorySystemConfig`, `type IAgentMemory`, `type MemoryStats`, `// Constants
DEFAULT_MEMORY_CONFIG`

### src/lib/ai/CodeGenerator.ts

- 默认导出: `CodeGenerator`
- 命名导出: `CodeGenerator`

### src/lib/ai/types.ts

- 命名导出: `InvalidResponseError`

### src/lib/audit/api.ts

- 命名导出: `createAuditAPIHandlers`

### src/lib/audit/index.ts

- 命名导出: `createAuditLogManager`, `auditLogManager`

### src/lib/collaboration/cursor-manager.ts

- 默认导出: `CursorManager`
- 命名导出: `CursorManager`

### src/lib/collaboration/presence-service.ts

- 默认导出: `PresenceService`
- 命名导出: `PresenceService`

### src/lib/collaboration/types.ts

- 命名导出: `DEFAULT_LOCK_CONFIG`

### src/lib/economy/pricing.ts

- 默认导出: `pricingService`
- 命名导出: `PricingService`, `pricingService`

### src/lib/monitoring/monitor.ts

- 默认导出: `PerformanceMonitor`
- 命名导出: `PerformanceMonitor`, `getDefaultMonitor`, `resetDefaultMonitor`

### src/lib/multi-agent/MultiAgentOrchestrator.ts

- 命名导出: `MultiAgentOrchestrator`

### src/lib/multi-agent/index.ts

- 命名导出: `MultiAgentOrchestrator`

### src/lib/performance/alerting/channels/slack-enhanced.ts

- 默认导出: `EnhancedSlackChannel`
- 命名导出: `LevelRouter`, `Throttler`, `Retryer`, `EnhancedSlackChannel`

### src/lib/performance/incremental-anomaly-detector.ts

- 命名导出: `IncrementalZScore`, `StreamingIsolationForest`, `StreamingAnomalyDetector`, `BatchZScoreDetector`, `createStreamingAnomalyDetector`, `isAnomalyQuick`

### src/lib/security/encryption.ts

- 默认导出: `encryptionService`
- 命名导出: `KeyManager`, `EncryptionService`, `encryptionService`

### src/lib/tenant/service.ts

- 默认导出: `tenantService`
- 命名导出: `TenantService`, `tenantService`

### src/lib/utils/id-generator.ts

- 命名导出: `generateShortId`, `createNamespacedIdGenerator`

### src/lib/utils/index.ts

- 命名导出: `generateShortId`, `createNamespacedIdGenerator`, `createLoggerWithGlobalLevel`, `setGlobalLogLevel`, `getGlobalLogLevel`, `type ResourceManagerOptions`

### src/lib/utils/logger.ts

- 命名导出: `setGlobalLogLevel`, `getGlobalLogLevel`, `createLoggerWithGlobalLevel`

### src/lib/webhook/event-delivery.ts

- 命名导出: `InMemoryDeliveryStorage`

### src/lib/webhook/index.ts

- 命名导出: `verifySignatureFromHeaders`, `hasValidSignatureHeaders`, `extractSignatureHeaders`, `normalizeHeaders`, `EventDispatcher`, `createWebhookSystem`

### src/lib/webhook/signature.ts

- 命名导出: `generateSignature`, `verifySignatureFromHeaders`, `hasValidSignatureHeaders`, `extractSignatureHeaders`, `normalizeHeaders`

### src/lib/webhook/webhook-manager.ts

- 命名导出: `InMemoryWebhookStorage`

### src/lib/websocket-manager.ts

- 默认导出: `WebSocketManager`
- 命名导出: `WebSocketManager`

## 💀 潜在的死代码

以下文件可能包含未使用的函数或常量：

### src/lib/agents/memory/agent-memory.ts

- 未使用的函数: `to`, `createAgentMemory`, `getMemoryInstance`, `resetMemoryInstance`

### src/lib/ai/CodeGenerator.ts

- 未使用的函数: `code`

### src/lib/audit/api.ts

- 未使用的函数: `createAuditAPIHandlers`

### src/lib/collaboration/types.ts

- 未使用的函数: `generateId`, `generateUserColor`, `isLockExpired`, `calculateDistance`, `createEditLock`

### src/lib/monitoring/monitor.ts

- 未使用的函数: `getDefaultMonitor`, `resetDefaultMonitor`

### src/lib/performance/alerting/channels/slack-enhanced.ts

- 未使用的函数: `formatTimestamp`

### src/lib/performance/incremental-anomaly-detector.ts

- 未使用的函数: `createStreamingAnomalyDetector`, `isAnomalyQuick`

### src/lib/utils/id-generator.ts

- 未使用的函数: `generateShortId`, `createNamespacedIdGenerator`

### src/lib/utils/logger.ts

- 未使用的函数: `createLogger`, `setGlobalLogLevel`, `getGlobalLogLevel`, `createLoggerWithGlobalLevel`

### src/lib/webhook/index.ts

- 未使用的函数: `createWebhookSystem`

### src/lib/webhook/signature.ts

- 未使用的函数: `generateSignatureHeaders`, `verifySignatureFromHeaders`, `hasValidSignatureHeaders`, `extractSignatureHeaders`, `normalizeHeaders`

## ⚠️ 注意事项

1. 此报告基于静态分析，可能存在误报
2. 某些导出可能仅用于类型检查
3. 某些函数可能通过字符串引用（如事件处理器）
4. 建议在删除代码前运行完整测试套件
5. 清理后请验证应用功能正常

## 🔧 建议步骤

1. 仔细审查此报告
2. 运行测试: `npm test`
3. 清理未使用的导入
4. 评估未使用的导出是否可以删除
5. 清理死代码
6. 再次运行测试确保一切正常
7. 提交更改
