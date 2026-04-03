# 协作系统测试框架

为 v1.12.0 实时协作系统准备的测试框架。

## 测试文件

| 文件 | 描述 | 测试用例数 |
|------|------|-----------|
| `cursor-sync.test.ts` | 光标同步测试 | 12 |
| `collaboration-state.test.ts` | 协作状态测试 | 18 |
| `conflict-resolution.test.ts` | 冲突解决测试 | 12 |
| `websocket-collab.test.ts` | WebSocket 协作消息测试 | 24 |

**总计：66 个测试用例**

## 功能覆盖

### 1. 光标同步 (cursor-sync.test.ts)
- ✅ 光标位置更新
- ✅ 远程光标接收
- ✅ 多用户光标管理
- ✅ 边界情况处理（负坐标、极大值）

### 2. 协作状态 (collaboration-state.test.ts)
- ✅ 用户管理（加入/离开/在线状态）
- ✅ 编辑锁管理（获取/释放/强制释放）
- ✅ 事件监听（用户事件、锁事件）
- ✅ 边界情况处理

### 3. 冲突解决 (conflict-resolution.test.ts)
- ✅ 冲突检测（编辑-编辑、编辑-删除、移动-删除）
- ✅ 冲突解决策略（Last-Write-Wins、Merge、Transform、Manual）
- ✅ 操作应用和版本管理
- ✅ 边界情况处理

### 4. WebSocket 协作 (websocket-collab.test.ts)
- ✅ 连接管理
- ✅ 消息发送（光标、锁、用户、编辑）
- ✅ 消息接收和处理
- ✅ 集成测试（完整流程）

## 运行测试

```bash
# 运行所有协作测试
npm test -- --testPathPattern=collaboration

# 运行特定测试文件
npm test -- cursor-sync.test.ts

# 运行测试并查看覆盖率
npm test -- --testPathPattern=collaboration --coverage
```

## 测试框架

- **测试框架**: Jest
- **语言**: TypeScript
- **Mock**: 自定义 Mock WebSocket 和服务类

## 测试结构

每个测试文件包含：
1. 类型定义
2. Mock 类实现
3. 服务类实现
4. 测试套件（describe/it/expect）

## 注意事项

- 测试使用 Jest 而非 Vitest（项目配置）
- 所有测试使用 Mock 模拟 WebSocket 和用户状态
- 每个测试文件至少包含 3 个测试用例
- 包含正常流程和异常边界情况