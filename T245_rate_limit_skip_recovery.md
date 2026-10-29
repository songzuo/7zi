# T245 — rate-limit skip 恢复报告

**任务**：恢复 `src/lib/rate-limit/rate-limiter.test.ts` 中 11 处 `it.skip`，目标 11 → 0
**执行人**：🧪 测试员 子代理
**日期**：2026-10-29
**结论**：**Yes** —— 11 → 0，全部恢复并全绿，无合理保留的 skip

---

## 一、11 处 skip 清单与逐条根因

11 处 skip **全部集中在 `describe('RedisAdapter')` 块内**，是 11 个**空壳用例**（函数体只有一行注释 `// Requires real Redis or advanced mocking`，**没有任何断言**）。

| # | 用例名 | 根因分类 | 具体说明 |
|---|---|---|---|
| 1 | `应该成功连接到 Redis` | **mock 缺失 + 空壳** | 断言体为空。原文件顶部已有 `vi.mock('ioredis')`，但那个 mock 的 client 是 `mockResolvedValue(1)` 之类的**恒定桩**：`ping()` 恒返回 `'PONG'`、`get()` 恒返回 `null`、`eval()` 恒返回 `1` —— 用这种桩写不出有意义的断言，等于"断言 mock 自身"，所以作者选择整片 skip。 |
| 2 | `应该能够设置值` | **mock 缺失 + 空壳** | 需要验证 `set()` 真正写入并带 key 前缀 + TTL。恒桩无法验证写入内容。 |
| 3 | `应该能够获取值` | **mock 缺失 + 空壳** | `get()` 恒返回 `null`，写不出"存在则返回值 / 不存在返回 null"的断言。 |
| 4 | `应该能够删除键` | **mock 缺失 + 空壳** | `del()` 恒返回 `1`，无法区分"删成功"与"删不存在的键"两种真实语义。 |
| 5 | `应该能够执行原子递增操作` | **mock 缺失 + 空壳** | `incr()` 走 Lua `eval`，恒桩 `eval: () => 1` 无法验证累加语义与 TTL 写入。 |
| 6 | `应该能够执行原子递减操作` | **mock 缺失 + 空壳** | 同上，且无法验证"自减不小于 0"的下界截断语义。 |
| 7 | `应该能够设置过期时间` | **mock 缺失 + 空壳** | `expire()` 恒返回 `1`，无法区分"键存在/不存在"两种返回值。 |
| 8 | `应该能够获取剩余过期时间` | **mock 缺失 + 空壳** | `ttl()` 恒返回 `3600`，无法验证 Redis 真实语义：无 TTL → `-1`、键不存在 → `-2`。 |
| 9 | `应该能够批量删除键` | **mock 缺失 + 空壳** | `keys()` 恒返回 `[]`，无法验证通配符匹配与删除计数。 |
| 10 | `应该能够检查连接状态` | **mock 缺失 + 空壳** | 恒桩 client 没有 connect/disconnect 生命周期差异。 |
| 11 | `应该能够断开连接` | **mock 缺失 + 空壳** | 无法验证 disconnect 后各操作抛 `Redis not connected`。 |

**根因总结（不是环境依赖，也不是定时器/断言过期/真坏代码）**：
这 11 处 skip 的**唯一真实原因是「Redis mock 太弱，写不出断言」**，作者用"需要真实 Redis 或高级 mock"当借口整片跳过。文件顶部其实**已经 mock 了 ioredis**，说明并不依赖真实 Redis 服务 —— 只是那个 mock 是恒定桩而已。

**解决方式**：把恒定桩换成**有语义的内存版 Redis fake**（`vi.hoisted` 内构造），真实实现了 RedisAdapter 用到的那几条命令语义（TTL 过期、`ttl` 的 -1/-2、`eval` Lua 计数脚本的原子自增/自减与下界截断、`keys` 通配符匹配、`del` 多键删除），再用真实断言覆盖实现行为。

## 二、改动文件清单

| 文件 | 改动 |
|---|---|
| `src/lib/rate-limit/rate-limiter.test.ts` | **唯一改动文件**（+280/-… 行）。11 处 `it.skip` → `it` 并补齐全部断言；`ioredis` mock 由恒定桩替换为语义化内存 fake；顺带修掉同文件内两处既有弱点：① `'unknown' as any` → 去掉 `as any`（`createFromPreset` 形参就是 `string`，本来就无需断言）；② `expect(true).toBe(true)` 空转断言 → 换成真实的限流边界断言。 |

**未改动**：`src/lib/rate-limit/` 下任何实现文件（**无需改动**——被测实现本身没有 bug，skip 的锅全在测试侧）；`src/lib/rate-limit/__tests__/**`（无需新增）。

## 三、改动前后真实测试输出对比

### 改动前（基线）

```
$ npx vitest run src/lib/rate-limit/rate-limiter.test.ts
 ✓ src/lib/rate-limit/rate-limiter.test.ts (57 tests | 11 skipped) 35ms
 Test Files  1 passed (1)
      Tests  46 passed | 11 skipped (57)
```

### 改动后

```
$ npx vitest run src/lib/rate-limit/rate-limiter.test.ts
 ✓ src/lib/rate-limit/rate-limiter.test.ts (57 tests) 52ms
 Test Files  1 passed (1)
      Tests  57 passed (57)
```

### 全目录回归

```
$ npx vitest run src/lib/rate-limit/
 ✓ src/lib/rate-limit/__tests__/memory-store.test.ts (16 tests) 33ms
 ✓ src/lib/rate-limit/rate-limiter.test.ts (57 tests) 56ms
 ✓ src/lib/rate-limit/__tests__/rate-limit.test.ts (14 tests) 25ms
 Test Files  3 passed (3)
      Tests  87 passed (87)
```

**skip 计数**：改动前 11 → 改动后 **0**（`grep -n "skip" src/lib/rate-limit/rate-limiter.test.ts` 仅剩注释里的一处历史说明文字，无任何 `it.skip/describe.skip/test.skip`）。

## 四、合理保留的 skip 及理由

**无。** 11 处 skip 全部恢复，**没有任何一处以"需要真实 Redis / 外部服务"为由保留**。

理由：RedisAdapter 的全部对外契约（连接状态、带前缀的键、TTL、原子计数、批量删除、断开后抛错）都是**纯客户端侧行为**，用一个实现了相同命令语义的内存 fake 就能完整验证。fake 不是"整片 mock 蒙混过关"——它实现了真实的语义规则（TTL 过期判断、`ttl` 的 -1/-2 区分、Lua 脚本的加减与 0 下界、`keys` glob 匹配），断言校验的是 **RedisAdapter 实现对 Redis 的调用方式与返回值处理**，而不是 fake 自身的行为。例如：
- `incr` 断言的是 **累加序列 1 → 2 → 7**，且脚本被正确路由到 fake 的 Lua 分支；
- `ttl` 断言的是 **-1（无 TTL）/ -2（键不存在）/ 剩余秒数** 三种 Redis 真实语义；
- `decr` 断言的是 **自减下界截断到 0**；
- `deletePattern` 断言的是 **只删匹配的 2 个键、不动不匹配的键**；
- `disconnect` 断言的是 **9 个操作全部抛 `Redis not connected`**。

## 五、tsc 结果

```
$ timeout 180 npx tsc --noEmit > /tmp/tsc_t245.log 2>&1; echo "TSC_EXIT=$?"
TSC_EXIT=0
$ wc -l /tmp/tsc_t245.log
0 /tmp/tsc_t245.log
```

**通过，无输出、无 OOM**（未被 OOM 杀掉）。

## 六、纪律自检

- ✅ 未执行任何 `git add / commit / push / checkout / stash / reset`
- ✅ 无 `as any` / `@ts-ignore` / `@ts-expect-error` / `eslint-disable`（并主动删掉了原有的一处 `as any`）
- ✅ 未改 lint / tsconfig / vitest 配置
- ✅ 未改他人路径文件；未改 `HEARTBEAT.md` / `state/tasks.json` / `memory/*` / `MEMORY.md` / `DEV_TASKS_*.md`
- ✅ 所有 shell 命令带 timeout
- ✅ 结论均贴真实命令输出
- ✅ 孤儿进程：`ps aux | grep -E 'vitest|tsc' | grep -v grep` 仅剩**其他子代理（RoomManager 的 ue.test.tsx）**的 vitest 进程，非本任务产生；本任务自己的 vitest/tsc 均已正常退出，无残留

## 七、结论

**Yes** —— T245 目标达成：`src/lib/rate-limit/rate-limiter.test.ts` 的 11 处 `it.skip` 全部恢复为真实断言（11 → 0），该文件 57/57 全绿，`src/lib/rate-limit/` 目录 87/87 全绿，`tsc --noEmit` 零错误零警告。
