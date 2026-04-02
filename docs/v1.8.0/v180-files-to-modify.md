# v1.8.0 需要修改的文件列表

## 🔴 高优先级 - TypeScript `any` 类型修复

### 1. src/lib/multi-agent/protocol.ts
- **any 类型数量**: 22
- **修复方式**: 定义 MessageBusEvent<T> 和 AgentMessage<T> 泛型类型
- **预计工作量**: 2-3 小时

### 2. src/lib/performance/root-cause-analysis/*.ts
- **any 类型数量**: 20
- **修复方式**: 定义性能分析相关的接口类型
- **预计工作量**: 3-4 小时

### 3. src/hooks/useWebRTCMeeting.test.ts
- **any 类型数量**: 15
- **修复方式**: 使用 vi.Mock 类型和 Socket 接口类型
- **预计工作量**: 1-2 小时

### 4. src/hooks/useWebRTCMeeting.edge-cases.test.ts
- **any 类型数量**: 12
- **修复方式**: 同上
- **预计工作量**: 1-2 小时

### 5. src/tools/agent-cli.ts
- **any 类型数量**: 6
- **修复方式**: 定义 CLI 输出格式类型
- **预计工作量**: 1 小时

---

## 🟡 中优先级 - 错误处理模块重构

### 1. src/lib/error-handler.ts
- **操作**: 重构为 `src/lib/error/client/error-handler.ts`
- **影响文件**: 所有导入该模块的文件
- **预计工作量**: 2 小时

### 2. src/lib/errors.ts
- **操作**: 重构为 `src/lib/error/core/error-factory.ts`
- **影响文件**: 所有导入该模块的文件
- **预计工作量**: 1 小时

### 3. src/lib/error-handling.ts
- **操作**: 重写为统一导出文件
- **影响文件**: 无 (仅导出)
- **预计工作量**: 1 小时

---

## 🟢 低优先级 - 代码重复清理

### 1. src/lib/csv-export.ts
- **操作**: 合并到 `src/lib/data-import-export.ts`
- **影响文件**: 导入该模块的文件
- **预计工作量**: 2 小时

### 2. src/lib/data-import-export.ts
- **操作**: 接收 csv-export.ts 的功能
- **影响文件**: 无
- **预计工作量**: 1 小时

### 3. src/types/r3f.d.ts
- **操作**: 引入正确的 Three.js 类型 (待社区更新)
- **影响文件**: 无 (类型声明)
- **预计工作量**: 需要等待上游更新

---

## 测试相关文件

### 需要创建共享 Mock 对象
1. `src/test/mocks/socket-mock.ts` - WebRTC Socket Mock
2. `src/test/mocks/auth-mock.ts` - 认证 Mock
3. `src/test/mocks/fetch-mock.ts` - Fetch Mock

---

## 导入引用更新清单

重构后需要更新导入的文件:
- `src/app/**/*.{ts,tsx}` - 更新错误处理导入
- `src/components/**/*.{ts,tsx}` - 更新错误处理导入
- `src/lib/**/*.{ts,tsx}` - 更新错误处理导入
- `src/hooks/**/*.{ts,tsx}` - 更新错误处理导入
- `src/test/**/*.{ts,tsx}` - 更新错误处理导入

---

*生成时间: 2026-04-02*
