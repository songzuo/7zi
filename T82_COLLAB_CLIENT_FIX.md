# T82 — 前端 collab-client 测试失败修复

**执行者**：主管（AI主管，亲自执行；原派发的 T82 子代理被 429 掐断后由主管接手）
**日期**：2026-10-24 05:44–05:50 CST
**基线 commit**：`d2d0dd412a`

---

## 1. 基线

```
cd 7zi-frontend && npx vitest run tests/features/collab-client.test.ts
→ Test Files  1 failed (1)
→ Tests       15 failed | 23 passed (38)
```

失败分布（按 describe 块）：

| describe | 失败用例 |
|---|---|
| 连接管理 | 应该成功连接到协作服务器 / 应该正确处理连接事件 / 应该正确处理断开连接 / 应该正确处理断开连接事件 / 应该检查连接状态（5） |
| 光标同步 | 应该发送光标移动 / 应该节流光标更新（2） |
| 编辑锁 | 应该拒绝获取被他人锁定的节点（1） |
| 文档同步 | 应该正确处理文档更新事件 / 应该正确处理文档删除事件（2） |
| 事件监听 | 应该添加事件监听器 / 应该支持多个监听器 / 应该处理监听器中的错误（3） |
| 资源清理 | 应该正确销毁客户端 / 应该在销毁时释放所有锁（2） |

典型报错：`expected undefined to be 'connected'`、`expected "vi.fn()" to be called at least once`。

---

## 2. 根因分析

### 根因 A（主因，解释 13/15 失败）：测试 mock 的 `WebSocketManager` 契约与真实实现不一致

真实实现见 `7zi-frontend/src/lib/websocket/core.ts`（`WebSocketManager` 是 `WebSocketClient` 的别名，见 `src/lib/websocket/manager.ts`）：

| 行为 | 真实实现 | 旧 mock | 后果 |
|---|---|---|---|
| `onStateChange(listener)` | `listener(state: ConnectionState, previousState)`（core.ts:830） | `cb(payload)`，payload 是 `{ state: 'connected' }` 对象 | 状态回调收到的不是 `ConnectionState` 枚举值 → `stateMap[state]` 查表得到 `undefined` → `connectionInfo.state` 被写成 `undefined` |
| `on(event, listener)` | `listener(event, data)`（core.ts:848） | `cb(payload)`，只有一个参数 | `handleMessage(data)` 收到 `undefined` → 消息被 `isValidCollabMessage` 丢弃，远程消息永不生效 |
| `emit(event, data)` | **写到 socket（client→server）**，不回调本地监听者；离线时返回 `false`（core.ts:255-275） | 触发本地监听者（模拟的是 server→client 语义），且恒返回 `true` | ① 自己发出去的消息被当成本地收到的事件回灌；② 离线时 `emit` 仍返回 `true` → `sendCursorMove` / `acquireLock` / `updateNode` 的返回值全部失真 |

三处叠加，直接导致 `getConnectionInfo().state === undefined`、`isConnected()` 恒为 `false`、`connected` 事件不触发、`node:updated` / `node:deleted` 事件不触发。

### 根因 B（真实实现缺陷，非测试问题）：本地修改不发出事件

`CollabClient.updateNode()` / `deleteNode()` 更新了本地文档但**从不 emit** `node:updated` / `node:deleted`。
`handleMessage()` 里只有收到**远程** `doc:update` / `doc:delete` 帧时才 emit。
结果：编辑的作者本人永远收不到自己这次修改的事件 —— 这是协作编辑器的真实功能缺陷（本地 UI 无法通过事件驱动刷新）。

### 根因 C（测试用例本身有缺陷）："应该拒绝获取被他人锁定的节点"

该用例构造了一个 `lock` 对象（user-2 持有 node-1），但**从未把它注入客户端**，随后期望 `acquireLock('node-1')` 返回 `false`。
旧 mock 因为 `emit` 恒返回 `true`，客户端根本不知道有别人的锁，于是返回 `true` → 用例失败。
这是用例没有真正构造出"被他人锁定"的前置状态。修复方式：让服务器**真的推送**一条 user-2 的 `lock:acquire` 帧，再断言客户端感知到该锁并拒绝加锁。断言未被削弱，反而**加强**了（新增 `hasLock('node-1') === false`）。

---

## 3. 实际改动

### 3.1 `7zi-frontend/src/lib/collab/CollabClient.ts`（+16 行）

修根因 B —— 本地修改补发事件：

- `updateNode()`：在 `updateLocalNode()` 之后、发送之前 `emit({ type: 'node:updated', payload: { nodeId, changes } })`
- `deleteNode()`：在 `this.document.delete(nodeId)` 之后 `emit({ type: 'node:deleted', payload: { nodeId } })`

注释说明为何必须补：远程更新路径在 `handleMessage()` 里已 emit，本地路径缺失导致作者本人收不到事件。

### 3.2 `7zi-frontend/tests/features/collab-client.test.ts`（+113 / −55 行）

修根因 A、C —— 让 mock 对齐真实契约：

| 改动 | 说明 |
|---|---|
| `onStateChange` 独立实现 | 改为 `stateListeners: Set<Function>`，回调签名 `(state, previousState)`，与 core.ts:830 一致 |
| `connect()` / `disconnect()` | 改为调用 `stateListeners`，不再借用 `emit('stateChange', ...)` |
| `on(event, handler)` | 监听者调用改为 `cb(event, data)`（两个参数），与 core.ts:848 一致 |
| `emit(event, data)` | **不再回调本地监听者**；返回 `this.state === 'connected'`（离线返回 false），与 core.ts:255 一致；新增 `sent[]` 记录发往服务器的内容 |
| `deliver(event, data)` | **新增**的测试专用方法，模拟服务器 → 客户端推送帧（真实实现走 `socket.onAny`，core.ts:618-631） |
| `off()` / `offStateChange()` | 补齐真实接口 |
| `ConnectionState.ERROR` | mock 补上 `ERROR: 'error'`（真实枚举有 5 个值，mock 只有 4 个） |
| `__getLastMockManager` | mock 导出测试专用访问器，让用例能拿到 mock 实例；测试文件加 `getMockManager()` helper |
| "应该拒绝获取被他人锁定的节点" | 改为用 `deliver()` 注入 user-2 的 `lock:acquire` 帧，先断言 `getLock('node-1')?.userId === 'user-2'`（客户端确实感知到了），再断言 `acquireLock` 返回 false 且 `hasLock('node-1') === false` |

**未做的事**（遵守硬约束）：
- 没有删除、`.skip`、`.todo`、`.only` 任何用例
- 没有弱化任何断言
- 没有 `eslint-disable` / `@ts-ignore`

---

## 4. 验证

```
$ cd 7zi-frontend && npx vitest run tests/features/collab-client.test.ts
 ✓ CollabClient Feature Tests (38)
 Test Files  1 passed (1)
      Tests  38 passed (38)
```
（基线 15 failed / 23 passed → 现在 **38 passed / 0 failed**）

无回归（整个 collab 模块 + 该特性文件）：

```
$ cd 7zi-frontend && npx vitest run src/lib/collab tests/features/collab-client.test.ts
 ✓ 7 个测试文件全部通过
 Test Files  7 passed (7)
      Tests  165 passed | 1 skipped (166)
```

Lint / 类型：

```
$ cd 7zi-frontend && npx eslint src/lib/collab --max-warnings=0
（无输出）EXIT=0  ✅
```

`npx tsc --noEmit` 在 `src/components/ui/feedback/__tests__/ErrorFallback.test.tsx` 报 4 个 TS2339 错误
（`mockImplementation` / `mockResolvedValue` / `mockReturnValue` 不存在于 `retry` 的类型上）。
**该文件不在本任务负责范围内，由并行任务 T85 修改**，与本次改动无关；`src/lib/collab/**` 无任何 TS 错误。

---

## 5. 遗留问题

1. `tests/features/collab-client.test.ts` 被 ESLint ignore 规则排除（`eslint --max-warnings=0` 会报 "File ignored" warning）。测试目录整体不在 lint 覆盖范围内 —— 建议单独立项把 `tests/**` 纳入 lint 门禁。
2. `src/lib/collab/__tests__/CollabClient.test.ts` 里的 mock（`mockWsManager`）同样与真实契约不符，但该文件目前只测导出与 CRDTOperations，尚未触碰 `CollabClient` 的连接行为，暂未暴露问题。属于同类技术债。
3. `retry.ts` 的类型未声明 vitest mock 方法，导致 `ErrorFallback.test.tsx` 的 4 个 TS2339（归 T85）。
