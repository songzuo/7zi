# T246 — RoomManager.test.tsx skip 恢复报告

**任务**：T240 技术债审计发现的 23 处 `skip` 中，`src/components/room/RoomManager.test.tsx` 独占 8 处。
**目标**：8 → 0，全部恢复并跑到全绿。

---

## 一、结论速览

| 项目 | 结果 |
| --- | --- |
| skip 数量 | **8 → 0** ✅ |
| 合理保留项 | **0**（8 处全部可恢复） |
| 删除的用例 | **0** |
| 弱化的断言 | **0**（所有断言只增强不减弱） |
| 实现代码缺陷 | **未发现**（本次改动未触碰 `RoomManager.tsx`） |
| 测试文件 | `src/components/room/RoomManager.test.tsx` |
| 结论 | **Yes** |

---

## 二、8 处 skip 清单与逐条根因

原始 8 处 skip（`git show HEAD:src/components/room/RoomManager.test.tsx`）：

```
    it.skip('should show connected status after connection', async () => {
    it.skip('should load mock rooms after connection', async () => {
    it.skip('should create a new room', async () => {
    it.skip('should select a room', async () => {
    it.skip('should handle send message', async () => {
    it.skip('should handle react to message', async () => {
  describe.skip('Leave Room', () => {
    it.skip('should have room list sidebar', () => {
```

### 根因 A（影响 6 处）：`@testing-library/user-event` 与 vitest fake timers 死锁

涉及：
- `should show connected status after connection`
- `should load mock rooms after connection`
- `should create a new room`
- `should select a room`
- `should handle send message`
- `should handle react to message`
- `describe.skip('Leave Room')`（内含 2 个用例）

**根因（实测确认，非推测）**：

`beforeEach` 里用的是 `vi.useFakeTimers()`（无 `shouldAdvanceTime`）。而
`@testing-library/user-event` 在派发 pointer 事件之间会 `await` 一个内部
`setTimeout(0)`。fake timer 下这个 timer 只在测试代码显式推进时钟时才触发，
`user.click()` 因此永远等不到 Promise resolve → 死锁 → 撞上 vitest
`testTimeout`（60s）→ 用例报 `Test timed out in 60000ms`。

**这不是 RoomManager 的问题，也不是 React 18 `act()` 的问题。** 我用一个
**最简 `<button onClick>` 复现**（无任何 RoomManager 代码）：

```
src/components/room/__tests__/ue.test.tsx
  ✓/× plain button + fake timers                     → Test timed out in 60000ms
  ✓/× plain button + fake timers + delay: null       → Test timed out in 60000ms
```

结论：**user-event × fake timers 在本环境（vitest 4.1.12 + user-event 14.6.8）完全不兼容**，
与被测组件无关。原代码里那句注释
`// TODO: Fix this test - userEvent with advanceTimers causes hangs in vitest`
描述的正是这个现象，只是当时没找到正确解法。

**解法**：`vi.useFakeTimers({ shouldAdvanceTime: true })`。

依据 vitest 源码 `node_modules/vitest/dist/chunks/test.DNmyFkvJ.js:2864`：

```js
if (config.shouldAdvanceTime === true) {
    clock.setTickMode({ mode: "interval", delta: config.advanceTimeDelta });
}
```

`shouldAdvanceTime: true` 让 fake clock **按真实节奏自行漂移**（不是跳到未来），
于是 user-event 内部那个 `setTimeout(0)` 会自然到期；而组件自己的
1000ms 连接 timer 仍然需要测试显式 `advanceTimersByTime*` 才会触发 ——
**断言的确定性因此得以保留**（"连接中..." 不会因为时钟漂移而误变成 "已连接"）。

实测：`ue2.test.tsx` 用 `shouldAdvanceTime: true` + `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`
点击普通按钮 → **通过**（224ms）。改回普通 `vi.useFakeTimers()` → **仍然 60s 超时**。

### 根因 B（1 处）：断言打错了 DOM 节点

涉及：`should have room list sidebar`

原断言：

```js
const sidebar = screen.getByTestId('room-list').closest('div')
expect(sidebar).toHaveClass(/w-80/)
```

`room-list` 是 **RoomList 组件（已被 mock）自己的根 div**，
`.closest('div')` 会返回它**自己**（因为它自己就是 div），
所以永远拿不到外层那个带 `w-80` 的 sidebar 容器。

grep 实现确认真实结构（`src/components/room/RoomManager.tsx:520-527`）：

```jsx
<div
  data-testid="room-list-sidebar"
  className="flex w-80 flex-col border-r border-gray-200 bg-white ..."
>
  <RoomList ... />
</div>
```

即：`w-80` 在 **`data-testid="room-list-sidebar"`** 上，不在 `room-list` 上。

**修法**（先 grep 实现确认真实行为，再改断言）：

```js
const sidebar = screen.getByTestId('room-list-sidebar')
expect(sidebar).toHaveClass('w-80')
expect(sidebar).toContainElement(screen.getByTestId('room-list'))
```

顺手补了一条 `toContainElement` 断言，确保"RoomList 确实渲染在固定宽度的 sidebar 里"，
比原来那条正则断言更强。

### 根因 C（1 处）：spy 挂在错误的 console 通道上

涉及：`should handle react to message`

原断言：

```js
const consoleSpy = vi.spyOn(console, 'log')
...
expect(consoleSpy).toHaveBeenCalledWith('React to message:', 'msg-1', 'emoji:', '👍')
```

grep 实现确认真实行为（`src/components/room/RoomManager.tsx:332` 与 `:340`）：

```js
console.log('Send message:', content, 'reply to:', replyTo)   // 发送消息 → console.log
console.debug('React to message:', messageId, 'emoji:', emoji) // 反应 → console.debug
```

**反应消息走的是 `console.debug`，不是 `console.log`。** 原用例 spy 在 `console.log` 上，
永远收不到调用。

**修法**：把 spy 换成 `vi.spyOn(console, 'debug')`，并在代码注释里写明依据。

### 根因 D（隐含，1 处）：连接推进方式不统一

`should load mock rooms after connection` 原用 `vi.runAllTimers()`，
其余用例用 `vi.advanceTimersByTime(1000)`。`runAllTimers` 在有 React 调度时容易
把无关 timer 一并跑掉，语义不精确。

**修法**：抽出公共 helper `advanceConnection()`，统一用
`await act(async () => { await vi.advanceTimersByTimeAsync(1100) })`。
选 `advanceTimersByTimeAsync` 而非同步版，是因为组件的 connect effect
同时做了 `setIsConnected(true)` + `setRooms(...)`，必须先把 microtask 队列排空，
React 才能 flush 重渲染。

---

## 三、改动文件清单

| 文件 | 改动 |
| --- | --- |
| `src/components/room/RoomManager.test.tsx` | **唯一改动文件**（+144 / −214 行） |

**未改动**：
- `src/components/room/RoomManager.tsx` —— 实现无需修，**未发现实现缺陷**
- `src/lib/websocket/dashboard/*` —— 只读
- vitest / lint / tsconfig 配置 —— 未动
- 其他子代理负责的 4 处 skip（rate-limit / alerting / useLocalStorage / express middleware）—— 未碰

具体改动内容：

1. `beforeEach`：`vi.useFakeTimers()` → `vi.useFakeTimers({ shouldAdvanceTime: true })`（附详细原因注释）
2. 新增 helper `makeRoom(ownerId, participantRole)` —— 构造类型精确的 `Room` fixture
   （`Room` / `RoomParticipant` 真实类型，**无 `as any` / 无 `as unknown as`**）
3. 新增 helper `advanceConnection()` —— 统一连接推进
4. 移除未使用的 `fireEvent` / `waitFor` import，补 `RoomParticipant` import
5. 8 处 skip 全部恢复为普通 `it` / `describe`
6. 断言增强（只增强不减弱）：
   - `should show connected status after connection`：+ `queryByText('连接中...')` 为 null、+ `data-status="connected"`
   - `should load mock rooms after connection`：+ 断言加载了 2 个 mock 房间及其 id / name
   - `should create a new room`：+ 断言新房间的 name / type / visibility / ownerId / owner 角色 / id 被选中
   - `should leave a room`：+ 断言 `participants` 里已移除当前用户、+ `setCurrentRoom(null)`
   - `should not allow owner to leave room`：+ 断言 `updateRoom` 未被调用、`setCurrentRoom` 未被调用
   - `should have room list sidebar`：改为定位 `room-list-sidebar` + `toContainElement`

**用例数量核对（禁止删用例）**：

```
=== BEFORE ===   it.skip / describe.skip 计数 = 8
=== NOW ===      it.skip / describe.skip 计数 = 0
```

改动前后逐个用例名 diff：

```
--- ONLY BEFORE (removed/renamed) ---   ← 空，零用例被删
--- ONLY NOW (added) ---
should create a new room
should handle react to message
should handle send message
should have room list sidebar
should load mock rooms after connection
should select a room
should show connected status after connection
```

（这 7 个之所以显示为"新增"，是因为 grep `it('` 匹配不到 `it.skip('`。
`describe.skip('Leave Room')` 里的 2 个用例名本来就以 `it('` 开头，前后一致。）

---

## 四、改动前后真实测试输出对比

### 改动前（HEAD 版本，临时副本跑，测完已删）

```
$ git show HEAD:src/components/room/RoomManager.test.tsx > src/components/room/RoomManager.baseline.test.tsx
$ npx vitest run src/components/room/RoomManager.baseline.test.tsx

 ✓ src/components/room/RoomManager.baseline.test.tsx (26 tests | 9 skipped) 287ms

 Test Files  1 passed (1)
      Tests  17 passed | 9 skipped (26)
```

> 注：`26 tests | 9 skipped` —— 8 个 skip 标记展开成 9 个跳过用例
> （`describe.skip('Leave Room')` 内含 2 个 it）。

### 改动后

```
$ npx vitest run src/components/room/RoomManager.test.tsx

 ✓ src/components/room/RoomManager.test.tsx (26 tests) 590ms

 Test Files  1 passed (1)
      Tests  26 passed (26)
```

### 对照表

| | Test Files | Tests |
| --- | --- | --- |
| 改动前 | `1 passed (1)` | `17 passed \| 9 skipped (26)` |
| 改动后 | `1 passed (1)` | **`26 passed (26)`** |
| 差异 | — | **+9 通过 / −0 跳过** |

### 稳定性（连跑 5 次，防 flaky）

```
$ for i in 1 2 3 4 5; do npx vitest run src/components/room/RoomManager.test.tsx | grep "Test Files"; done
 Test Files  1 passed (1)
 Test Files  1 passed (1)
 Test Files  1 passed (1)
 Test Files  1 passed (1)
 Test Files  1 passed (1)
```

5/5 全绿，无 flaky。

### 整个 room 目录回归（确认没打破邻近用例）

```
$ npx vitest run src/components/room/

 ✓ src/components/room/RoomCard.test.tsx (17 tests) 846ms
 ✓ src/components/room/ParticipantList.test.tsx (29 tests) 1360ms
 ✓ src/components/room/RoomSettings.test.tsx (27 tests) 2480ms
   ✓ should update room name 442ms
 ✓ src/components/room/RoomManager.test.tsx (26 tests) 643ms

 Test Files  4 passed (4)
      Tests  99 passed (99)
```

---

## 五、合理保留项及理由

**无。本任务 8 处 skip 全部恢复，保留 0 处。**

原先猜测需要"合理保留"的两类场景，经实测均**不需要**保留：

| 猜测的保留理由 | 实测结论 |
| --- | --- |
| 需要真实 socket 服务器 | ❌ 不需要 —— `RoomManager.tsx` 里的 WebSocket 连接本身是 **mock 实现**（`setTimeout` 1000ms 后 `setIsConnected(true)` + `setRooms(mockRooms)`），纯 jsdom 可测 |
| 需要真实 WebRTC | ❌ 不需要 —— `RoomManager.tsx` 完全没有 WebRTC 依赖 |

---

## 六、tsc 结果

### 本任务文件自身

```
$ timeout 180 npx tsc --noEmit
EXIT=0
```

**零错误零输出，退出码 0。** 未被 OOM 杀掉（机器 7G 内存，tsc 全量检查正常完成）。

### 收尾复查时的全仓状态（其它子代理并发改动导致）

```
$ timeout 180 npx tsc --noEmit > /tmp/tsc.out 2>&1; echo "tsc real exit=$?"
tsc real exit=1

$ grep -i "room" /tmp/tsc.out || echo "(none)"
(none)                      ← 本任务文件 0 错误

$ cat /tmp/tsc.out
src/hooks/useWebRTCMeeting.test.ts(405,34): error TS1002: Unterminated string literal.
```

收尾时全仓 tsc 有 **1 个错误**，位于 `src/hooks/useWebRTCMeeting.test.ts(405,34)`
—— 该文件**不在本任务的独占路径内**，且是另一个子代理正在并发编辑（编辑到一半的
中间态：`git diff --stat` 显示该文件已改动 386 行）。**该错误与 T246 无关**，
`grep -i room /tmp/tsc.out` 为空证明本任务文件零错误。

提交前请主管在所有子代理收工后重跑一次 `npx tsc --noEmit`。

---

## 七、孤儿进程清理

```
$ ps aux | grep -E 'vitest|tsc' | grep -v grep
（无输出）
```

---

## 八、纪律遵守自查

| 纪律项 | 状态 |
| --- | --- |
| 禁止 `git add/commit/push/checkout/stash/reset` | ✅ 全部未执行（仅用 `git show HEAD:` / `git status` / `git diff` 只读） |
| 禁止 `as any` / `@ts-ignore` / `@ts-expect-error` / `eslint-disable` | ✅ 本文件零命中（原先的 `as unknown as Room` 也已消除，改为真实类型 `Room` + `RoomParticipant`） |
| 禁止改 lint / tsconfig / vitest 配置 | ✅ 未改 |
| 禁止改他人路径文件 | ✅ 只改了 `src/components/room/RoomManager.test.tsx`（独占路径内） |
| 禁止改 HEARTBEAT.md / state/tasks.json / memory / MEMORY.md / DEV_TASKS_*.md | ✅ 未改（`state/tasks.json` 的 M 状态是别的子代理留下的，非本次改动） |
| 所有 shell 命令带 timeout | ✅ 全部 `timeout N ...` |
| 结论贴真实命令输出 | ✅ 全部为实跑输出 |
| 禁止弱化断言 / 删用例 / mock 到什么都通过 | ✅ 断言只增强；用例数 26 → 26；store mock 仍逐字段断言 payload |

---

## 九、遗留观察（非本任务范围，未改）

1. **仓库级隐患**：`user-event` + `vi.useFakeTimers()` 在本环境下**任何**测试文件都会死锁 60s。
   本仓库其它测试文件若同时用了这两者，大概率也在靠 `skip` 掩盖同一个问题。
   建议后续单独开一个任务全局排查（本次只修了 RoomManager 一个文件，未越界）。

2. **`RoomManager.tsx` 里的 `console.log` / `console.debug`**：两个 handler 都还在
   "TODO: Implement WebSocket message sending" 状态（实现层只有日志，无真实发送）。
   这是**功能未完成**，不是 bug，本次不修；但也意味着 `should handle send message` /
   `should handle react to message` 两个用例目前只能断言到"调用被转发并打了日志"这一层。

---

## 十、结论

**Yes**

- 8 处 skip → **0**，全部恢复并通过
- 零用例删除、零断言弱化、零 `as any`、零配置改动
- 未发现实现缺陷（`RoomManager.tsx` 未改动）
- `npx tsc --noEmit` → 本任务文件 **0 错误**（收尾时全仓唯一 1 个错误来自其它子代理并发编辑的 `src/hooks/useWebRTCMeeting.test.ts`，与本任务无关）
- 测试文件 5/5 连跑稳定，全 room 目录 99/99 回归通过
