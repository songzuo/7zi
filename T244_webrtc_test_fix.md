# T244 — useWebRTCMeeting 测试修复报告

**任务**: T244 · 修复 `src/hooks/useWebRTCMeeting.test.ts` 中 12 个失败用例，并排查实现缺陷
**执行者**: ⚡ Executor 子代理
**日期**: 2026-10-29
**仓库**: `/root/.openclaw/workspace` (branch main)

---

## 结论

**Yes** — 目标文件 `src/hooks/useWebRTCMeeting.test.ts` **20/20 全绿**；同时定位并修复了 **2 个真实的实现缺陷**（实现文件在独占路径内，允许修改）。

---

## 一、改动文件清单

| 文件 | 类型 | 说明 |
|---|---|---|
| `src/hooks/useWebRTCMeeting.test.ts` | 重写 | 20 个用例全部按实现真实语义重写断言 |
| `src/hooks/useWebRTCMeeting.ts` | 修复 | 2 处实现缺陷（详见第三节） |

未触碰任何其他文件（`git diff --stat` 仅显示上述两个 + 他人已在改的 `src/components/room/RoomManager.test.tsx` + `state/tasks.json`，后两者非我改动）。

---

## 二、12 个失败用例逐个根因分析

### 根因分类总览

| # | 用例 | 根因 | 处理 |
|---|---|---|---|
| 1 | initialization > should initialize socket with correct config | 断言用了 `expect.any(Object)` / `expect.objectContaining` 但**调用点缺失**——`io()` 只在 `joinMeeting()` → `initializeSocket()` 里调用，原用例没调用 `joinMeeting`，`io` 从未被调用 | 补 `joinMeeting()` 调用 + 精确断言 io 参数 |
| 2 | joinMeeting > should join meeting successfully | 同上：未调用 `joinMeeting`，`join-room` 从未 emit | 补调用 + 断言 `getUserMedia` 参数与 `join-room` payload |
| 3 | joinMeeting > should handle join-room event | 事件名错误：测试用 `'join-room'` 回调，但服务端/实现实际用 **`'room-joined'`** 回送（`src/lib/voice-meeting/signaling.ts:214`） | 改用 `room-joined` 处理器，断言 participants Map |
| 4 | joinMeeting > should handle errors during join | 语义错误：实现中 `joinMeeting()` **不会 reject**，错误统一通过 `options.onError` 回调上报（`useWebRTCMeeting.ts:482`）；原用例 `await expect(...).rejects` 永远失败 | 改为断言 `onError` 被调用且收到原始 Error，且未 emit `join-room` |
| 5 | leaveMeeting > should leave meeting successfully | 未调用 `joinMeeting`，从未 emit `leave-room`；且 `isConnected` 依赖 `'connect'` 事件回调触发 | 补 join + 手动触发 `connect` 回调 + 断言 `leave-room` / `disconnect` / 状态复位 |
| 6 | leaveMeeting > should cleanup local stream on leave | 同上，未 join 则 `localStreamRef` 为空，无轨道可 stop | 补 join；并把轨道 mock 改成**稳定引用**（原先 `getTracks` 每次返回新数组+新对象，`stop` 断言挂不到） |
| 7 | toggleMute > should toggle mute state | 同上，未 join 则 `localStreamRef.current` 为空，`toggleMute` 直接 return，`isMuted` 不变 | 补 join + `connect` 触发 |
| 8 | toggleMute > should emit mute-state event | 事件名错误：测试断言 `'mute-state'`，实现实际 emit **`'mute-state-changed'`**（与 `signaling.ts:593` 服务端监听一致） | 改为 `'mute-state-changed'`，并断言 muted true/false 双向 |
| 9 | cleanup > should cleanup on unmount | 未 join → socket 从未创建 → `disconnect` 未被调用 | 补 join 后再 unmount |
| 10 | audio elements > should return null for non-existent audio element | 语义错误：`getAudioElement` 是 **get-or-create** 语义（`useWebRTCMeeting.ts:596` 区域），对未知 peerId 也会新建 `<audio>`，**永远不会返回 null** | 改为断言「会创建新 audio 元素 + 二次调用返回同一实例」，这是真实语义 |
| 11 | enable audio > should enable audio | 未 join → `localStreamRef.current` 为空 → `enableAudio()` 直接 return，`isMuted` 不变 | 补 join 并先 toggleMute 到 muted 状态再 enable |
| 12 | disable audio > should disable audio | 同上 | 补 join 后再 disable |

### 两个共性的 mock 根因

1. **`mockSocket.connected` 必须为 `true`**（已在上一轮改对，本轮保留）。
   实现里 `joinMeeting` 只有在 `socketRef.current?.connected` 为真时才 `emit('join-room')`：
   ```
   // useWebRTCMeeting.ts
   if (socketRef.current?.connected) {
     socketRef.current.emit('join-room', {...})
   }
   ```
   connected 为 false 时，`joinMeeting` 走到 `getLocalStream()` 就结束，**join-room / leave-room / mute-state-changed 全部不会发生** —— 这是 12 个失败里一大半的直接原因。

2. **`global.MediaStream` 需 mock**（已在上一轮补上，本轮保留并加强）。
   jsdom 无此全局，`new MediaStream()` 会 ReferenceError。

3. **本轮新发现**：`mockTrack` 必须是**稳定引用**。
   原 mock 写的是 `getTracks: vi.fn(() => [{ enabled: true, stop: vi.fn() }])` —— 每次调用返回**全新数组和全新对象**，所以 `expect(mockTrack.stop).toHaveBeenCalled()` 这种断言永远挂不到。改为在 `beforeEach` 里创建单个 `mockTrack` 对象并复用。

---

## 三、实现缺陷（2 处）

### 缺陷 1：auto-join effect 依赖数组导致会议被立刻断开 🔴 严重

**位置**: `src/hooks/useWebRTCMeeting.ts`（原 line ~629）

**原代码**:
```ts
useEffect(() => {
  if (autoJoin && !isCleanupRef.current) {
    joinMeeting()
  }
  return () => {
    if (!isCleanupRef.current) {
      leaveMeeting()
    }
  }
}, [autoJoin, joinMeeting, leaveMeeting])
```

**问题**: `joinMeeting` / `leaveMeeting` 都是 `useCallback`，依赖 `isConnecting` / `isConnected` 等 state。
只要这些 state 变化 → 两个回调身份变化 → **effect 重跑 → 上一次的 cleanup 被调用 → `leaveMeeting()` 执行** → 刚加入的会议被立刻断开、`isConnected` 被重置为 `false`、本地音轨被 `stop()`。

**真实影响**: `autoJoin: true` 的场景（生产端 `MeetingRoom.tsx:453` 正是 `autoJoin: true`）会出现「加入 → 自动断开 → 状态错乱」的抖动。而且 `MeetingRoom.tsx` 的 `useEffect` 依赖 `remoteStreams` / `getAudioElement`，又会进一步触发重渲染放大该问题。

**修复**: effect 只依赖 `autoJoin`，回调通过 ref 取最新实现。
```ts
const joinMeetingRef = useRef(joinMeeting)
const leaveMeetingRef = useRef(leaveMeeting)

useEffect(() => {
  joinMeetingRef.current = joinMeeting
  leaveMeetingRef.current = leaveMeeting
}, [joinMeeting, leaveMeeting])

useEffect(() => {
  if (autoJoin && !isCleanupRef.current) {
    joinMeetingRef.current()
  }
  return () => {
    if (!isCleanupRef.current) {
      leaveMeetingRef.current()
    }
  }
}, [autoJoin])
```

**验证（该修复是 load-bearing）**: 临时回退实现后重跑测试 →
```
Test Files  1 failed (1)
     Tests  3 failed | 17 passed (20)
× should leave meeting successfully
× should toggle mute state
× should emit mute-state event
```
恢复修复后 → `20 passed (20)`。

---

### 缺陷 2：`leaveMeeting()` 未重置 `isMuted` 🟡 中等

**位置**: `src/hooks/useWebRTCMeeting.ts`（`leaveMeeting` 的 "Reset state" 块）

**原代码**:
```ts
// Reset state
setIsConnected(false)
setIsConnecting(false)
setParticipants(new Map())
setRemoteStreams(new Map())
```

**问题**: `isMuted` 没有被重置。但 `leaveMeeting` 上面已经把本地流销毁了（`track.stop()` + `localStreamRef.current = null`）。
后果：用户在静音状态下离开会议 → 重新加入 → `isMuted` 残留为 `true`，但此时本地流是全新的（音轨 `enabled` 为 true），**UI 显示静音但实际在出声**，状态与实际不符。

**修复**: 补 `setIsMuted(false)`。

**验证（load-bearing）**: 临时移除后跑 edge-cases 文件 →
```
Tests  4 failed | 25 passed (29)
× should maintain consistent state after operations
× should handle state reset on rejoin
```
恢复后 → `2 failed | 27 passed (29)`。

> 附带收益：`src/hooks/useWebRTCMeeting.edge-cases.test.ts`（**不在我的独占路径内，我未修改该文件**）因这个实现修复，从 `4 failed` 改善到 `2 failed`。

---

## 四、测试输出对比（真实命令输出）

### 改动前

```
$ npx vitest run src/hooks/useWebRTCMeeting.test.ts
 Test Files  1 failed (1)
      Tests  12 failed | 8 passed (20)
```
（主管 T242 实测基线）

### 改动后

```
$ npx vitest run src/hooks/useWebRTCMeeting.test.ts
 Test Files  1 passed (1)
      Tests  20 passed (20)
```

### 连同 edge-cases 文件一起跑（回归对照）

```
$ npx vitest run src/hooks/useWebRTCMeeting.test.ts src/hooks/useWebRTCMeeting.edge-cases.test.ts
 Test Files  1 failed | 1 passed (2)
      Tests  2 failed | 47 passed (49)
```
（改动前 edge-cases 是 `4 failed | 25 passed (29)`，我的实现修复改善了其中 2 个）

---

## 五、tsc 结果

```
$ timeout 300 npx tsc --noEmit
TSC_EXIT=0

Process exited with code 0.
```
✅ 通过，无输出、无错误、未被 OOM 杀死（进程正常 exit 0）。

补充 lint 检查：
```
$ npx eslint src/hooks/useWebRTCMeeting.ts src/hooks/useWebRTCMeeting.test.ts
  0:0  warning  File ignored because of a matching ignore pattern. Use "--no-ignore" to disable file ignore settings
✖ 1 problem (0 errors, 1 warning)
ESLINT_EXIT=0
```
（0 errors；test 文件本身在 eslint ignore 列表内，与仓库现状一致）

---

## 六、纪律遵守情况

- ✅ 未执行 `git add` / `commit` / `push` / `checkout` / `stash` / `reset`
- ✅ 未使用 `as any` / `@ts-ignore` / `@ts-expect-error` / `eslint-disable`（唯一一处 `as any` 是仓库 HEAD 原文件里就有的 `(navigator.mediaDevices.getUserMedia as any).mockRejectedValue(...)`，我原样保留，未新增）
- ✅ 未新增 `@ts-nocheck`（原文件首行已有 `// @ts-nocheck`，保留）
- ✅ 未改 lint / tsconfig / vitest 配置，未改他人路径文件
- ✅ 未改 `HEARTBEAT.md` / `state/tasks.json` / `memory/*` / `MEMORY.md` / `DEV_TASKS_*.md`
- ✅ 所有 shell 命令均带 timeout
- ✅ 结论均贴真实命令输出
- ✅ 未删除任何用例、未弱化断言（每条新断言都比原来更具体：精确 payload、精确事件名、精确参数、重复调用返回同一实例等）

### 孤儿进程清理
```
$ ps aux | grep -E 'vitest|tsc' | grep -v grep
```
（执行结果见下方；所有 vitest / tsc 进程均已随命令结束自然退出，无残留）

---

## 七、遗留问题

1. **`src/hooks/useWebRTCMeeting.edge-cases.test.ts` 仍有 2 个失败** —— 该文件**不在我的独占路径内**，我未修改：
   - `should cleanup properly after error during join` —— 断言 `mockSocket.disconnect` 被调用，但该场景下 join 因权限拒绝失败、socket 在 `initializeSocket` 中已创建，断言与时序不符。
   - `should handle missing mediaDevices API` —— `delete navigator.mediaDevices` 在 jsdom 的 Navigator 上抛 `TypeError: Cannot delete property 'mediaDevices' of #<Navigator>`（jsdom 限制），与本 hook 实现无关。

   建议派单给负责该文件的同事，或下轮一并纳入我的独占路径处理。

2. **仓库其它文件存在历史失败**（`useDashboardData` / `useLocalStorage` / `useNotifications` / `useWebSocket` 等共 31 个 failed）—— 与本任务无关，属其他路径。

3. **`autoJoin` effect 的修复引入了新的 ref 同步 effect** —— 每次 `joinMeeting` 身份变化都会更新 ref，这是预期行为且开销极小，但意味着 effect 只在 mount/unmount 时触发一次 auto-join，**重试加入需要组件显式调用 `joinMeeting()`**（与原语义一致，原实现因 state 抖动会意外重复 join，实际上是 bug 而非特性）。

---

## 八、结论

**Yes**

- 目标文件 20/20 全绿
- 定位并修复 2 个真实实现缺陷（auto-join effect 依赖导致的会议瞬断、`isMuted` 未在 leave 时复位）
- 所有新增断言均对照实现与 `src/lib/voice-meeting/signaling.ts` 的真实事件名/语义编写，无弱化、无删用例
- `npx tsc --noEmit` 通过（exit 0）
- 遗留：`useWebRTCMeeting.edge-cases.test.ts` 2 个失败（超出本任务独占路径，已顺带改善 2 个）
