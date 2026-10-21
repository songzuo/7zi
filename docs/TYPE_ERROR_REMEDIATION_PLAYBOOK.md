# 🧭 TypeScript 错误治理手册（Remediation Playbook）

> 状态：**生效中** · 最近更新：2026-10-21
> 适用项目：`7zi-frontend/`（Next.js 16 + TypeScript strict）
> 后端回归门槛：`cd 7zi-backend && npx jest` 必须保持全绿

本文档沉淀 2026-10-21 这一轮类型错误治理的**方法论**，而非具体的修复清单。
目的是让后续每一轮（无论是人还是子代理）都按同一套分类、按同一套修法、走同一条硬门槛，
避免"为了把数字刷下去而把类型债藏起来"。

---

## 📊 当前基线（2026-10-21）

| 阶段 | 口径 | error 数 | 说明 |
|------|------|---------|------|
| 历史记录口径 | `npx tsc --noEmit` | **556** | 早期轮次记录值（含 `tsconfig.tsbuildinfo` 缓存导致的虚高） |
| 上一轮门槛 | `npx tsc --noEmit` | **425** | 硬门槛设为"不得恶化"，同样受缓存口径影响 |
| **真实基线** | `npx tsc --noEmit --incremental false` | **334** | ⚠️ **唯一权威口径** |
| 本轮修复后 | `npx tsc --noEmit --incremental false` | 持续下降中 | 见下方"基线口径修正" |

### ⚠️ 基线口径修正（重要）

项目 `7zi-frontend/tsconfig.json` 开启了 `incremental: true`。
直接执行 `npx tsc --noEmit` 会复用 `tsconfig.tsbuildinfo` 缓存，**报出的错误数虚高**：

- 实测虚高口径：**425**
- 实测真实口径：**334**
- 偏差：**91 条**

> **规则**：自 2026-10-21 起，所有轮次**一律**使用
> `npx tsc --noEmit --incremental false` 作为唯一基线口径。
> 此前记录的 556 / 425 均为虚高值，实际进度比记录更好，但**不可直接相减**。
> 对外汇报时必须注明口径，否则会出现"数字不降反升"的误读。

### 错误分布（真实基线 334 时点）

| 文件 | errors | 说明 |
|------|--------|------|
| `src/components/WorkflowEditor/stores/workflow-editor-store.ts` | 46 | 依赖未安装引发的连锁 implicit any |
| `src/lib/services/__tests__/notification-enhanced.test.ts` | 23 | 测试 mock 类型缺失 |
| `src/lib/pwa/web-push-service.ts` | 16 | 第三方 Web Push SDK 无类型 |
| `src/lib/services/notification-center.tsx` | 13 | hook 返回值形状不匹配 |
| `src/components/WorkflowEditor/__tests__/workflow-editor-v110.test.ts` | 13 | 测试 mock 类型缺失 |
| `src/components/workflow/VersionHistoryPanel.tsx` | 9 | 组件 props 类型不完整 |
| `src/lib/search/__tests__/fuzzy-search.spec.ts` | 8 | 测试 mock 类型缺失 |
| `src/lib/pwa/service-worker-manager.ts` | 8 | ServiceWorker 类型窄化 |
| `src/lib/knowledge/vector-store.ts` | 8 | 第三方 SDK 无类型 |
| `src/lib/monitoring/__tests__/email-alert.test.ts` | 7 | mock fetch 响应类型 |

> 特征：**头部 10 个文件占 180+ 错误**，其余长尾单文件多在 1–5 条。
> 这决定了治理策略应当是"**逐文件深挖**"而非"全局撒网"。

---

## 📚 错误分类法

本轮治理把 TypeScript 报错归为 5 类。分类的意义在于：**每一类的正确修法完全不同**，
混在一起处理必然产生"用 `as any` 一把梭"的反模式。

| 编号 | 错误码 | 名称 | 典型触发原因 |
|------|--------|------|-------------|
| **A** | `TS2304` | 名称未定义（Cannot find name） | 漏 import、依赖根本未安装、文件被移动后引用未更新 |
| **B** | `TS7006` | 隐式 `any` 参数 | 回调参数无上下文类型（泛型推断失败时级联爆发） |
| **C** | `TS7053` | 索引签名缺失 | 用任意字符串访问对象，而对象类型没有索引签名 |
| **D** | `TS2322` | 类型不兼容 | 赋值的类型与声明类型不匹配（联合类型收窄不足、DOM/React 特例） |
| **E** | `TS2741` | 缺少属性 | 对象字面量赋给要求更多属性的类型时，漏写必填字段 |

### 附：辅助错误码

| 错误码 | 名称 | 备注 |
|--------|------|------|
| `TS2307` | 找不到模块 | 通常是 A 类的**根因**：依赖未安装 |
| `TS2339` | 属性不存在 | 多为 D 类的表现 |
| `TS7031` / `TS7005` | 变量隐式 `any` | B 类的变量版本 |
| `TS2769` | 无重载匹配 | D 类的调用版本 |

---

## 🔧 分类标准修法与反模式

### A 类 — `TS2304` 名称未定义

**根因优先级（从高到低）**：

1. **依赖根本没装**（伴随 `TS2307`）→ **不要加类型断言绕过**。
   正确做法是二选一：
   - 改用项目内已有的等价实现（**首选**，见下方 B 类案例）
   - 或在项目明确允许时补装依赖（需主管批准，本轮统一不新增依赖）
2. 漏了 import → 补 import
3. 文件移动/重命名后引用未更新 → 改引用路径

**✅ 标准修法（实例：`workflow-editor-store.ts`）**

原实现依赖 `zundo` 的 `temporal` middleware，但该依赖从未被安装 →
`TS2307` 引发连锁 `TS7006`（46 条错误）。

正确修法是**同目录已有的等价实现**：同目录 `workflow-editor-store-v110.ts` 已采用
「手写 undo/redo」并注释说明 zundo v2.x 的 temporal store API 尚未稳定。
于是移除 `import { temporal } from 'zundo'`，手写 `past` / `future` 历史栈，
**保持既有 API 名称与行为不变**，不引入新依赖。

> 关键点：修 A 类时优先找**项目内既有的正确实现**，
> 而不是发明新写法，更不是用 `declare module 'zundo'` 伪造模块。

**❌ 反模式**

```ts
// 反模式 1：伪造模块声明
declare module 'zundo' { export const temporal: any }

// 反模式 2：断言绕过
const store = temporal(persist(...) as any)
```

---

### B 类 — `TS7006` 隐式 `any` 参数

**✅ 标准修法**：给回调参数**显式标注类型**，或让上下文类型能推断出来。

```ts
// ✅ 显式标注
nodes.map((node: WorkflowNodeData) => node.id)

// ✅ 提供上下文类型，让推断生效
const filtered = notifications.filter((n): boolean => n.type === filterType)
```

在 Zustand store 里，`create<T>()((set, get) => ({ ... }))` 的上下文类型能给 `set` / `get` 推断，
但**对象字面量内部的嵌套回调**常常丢失上下文——这类地方必须显式标注。

**✅ 配套：把"空壳对象"补成有类型的初始状态**

```ts
// ✅ 显式断言初值类型
const initialState = {
  workflow: null as WorkflowDefinition | null,
  nodes: [] as Node<WorkflowNodeData>[],
  panPosition: { x: 0, y: 0 } as { x: number; y: number },
}
```

**❌ 反模式**

```ts
// 反模式 1：给整个 store 套 any（污染全文件）
const initialState: any = { ... }

// 反模式 2：给每个参数套 any（错误数量不变，只是被静音）
nodes.map((node: any) => node.id)
```

> `as any` 唯一可接受的场景是**第三方 SDK 完全无类型定义**，
> 且必须配合"最小必要接口声明"（见 C 类实例），不能只是裸 `any`。

---

### C 类 — `TS7053` 索引签名缺失

**根因**：用 `obj[someString]` 访问，而 `obj` 的类型没有索引签名。

**✅ 标准修法（按优先级）**：

1. **补索引签名**（推荐）
   ```ts
   interface WeaviateClient {
     collections?: { get: (name: string) => unknown };
     schema?: { classCreator?: unknown };
     [key: string]: unknown;   // ← 索引签名
   }
   ```
2. **用 `keyof` 约束键名**，把运行期错误提前到编译期
   ```ts
   type MetricType = 'cpu' | 'memory' | 'responseTime';
   function read(m: Record<MetricType, number>, k: MetricType) { return m[k]; }
   ```
3. **收紧 `Record<string, any>` → `Record<string, unknown>`**
   ```ts
   // ✅ unknown 强制下游先做收窄
   filters?: Record<string, unknown>
   // ❌ any 直接放弃检查
   filters?: Record<string, any>
   ```
4. 确实需要动态键 → 加索引签名 + **类型守卫**做收窄
   ```ts
   function isFilterOperator(value: unknown): value is FilterCondition {
     return typeof value === 'object' && value !== null && 'op' in value && 'value' in value;
   }
   ```

**❌ 反模式**

```ts
// 反模式 1：整对象 any
private buildWhereFilter(filters: Record<string, any>): any { ... }

// 反模式 2：用 any 索引签名，等于关掉检查
interface Config { [key: string]: any }
```

> 判据：**`unknown` + 守卫 > `any`**。`unknown` 会强制消费方先收窄，
> `any` 则把问题推迟到运行期。

---

### D 类 — `TS2322` 类型不兼容

**根因**：赋值的类型与声明类型不匹配。

**✅ 标准修法**：

1. **收窄联合类型**，而不是强转
   ```ts
   // ✅ 显式枚举
   type ReadFilter = 'all' | 'unread' | 'read';
   const [filterRead, setFilterRead] = useState<ReadFilter>('all');
   ```
2. **修正返回值形状**（hook 解构错误是本轮 D 类的大头）
   ```ts
   // ❌ useUnreadCount 实际返回 { count, loading, refresh }
   const { unreadCount, loading } = useUnreadCount(userId);
   // ✅
   const { count: unreadCount, loading } = useUnreadCount(userId);
   ```
3. **拆开来源不同的 hook**（本轮实例）
   ```ts
   // ✅ useNotifications 只提供列表；操作与未读数分别来自别处
   const { notifications } = useNotifications({ userId, read: false, limit: 5 });
   const { count: unreadCount } = useUnreadCount(userId);
   const { markAsRead, deleteNotification } = useNotificationActions();
   ```
4. **DOM 特例：`<select>` 的 `value` 只能是 `string`**
   ```tsx
   // ❌ value={false} 不是合法 string
   <option value={false}>未读</option>
   // ✅ 用字符串枚举 + 显式映射
   <option value="unread">未读</option>
   onChange={(e) => {
     const raw = e.target.value;
     setFilterRead(raw === 'unread' ? 'unread' : raw === 'read' ? 'read' : 'all');
   }}
   ```
5. **第三方 API 响应** → 声明最小响应接口 + `as` 标注
   ```ts
   interface LlmChatResponse {
     choices?: Array<{ message?: { content?: string } }>;
   }
   const data = (await response.json()) as LlmChatResponse;
   ```
   > 注意：这里的 `as` 是**收窄**（`unknown` → 具体类型），不是**逃逸**（具体类型 → `any`），
   > 属于可接受用法。

**❌ 反模式**

```ts
// 反模式 1：双向强转
const data = (await response.json()) as any;

// 反模式 2：整个对象 any 化
const body: any = await request.json();
```

---

### E 类 — `TS2741` 缺少属性

**根因**：对象字面量赋给要求更多属性的类型时，漏写必填字段。

**✅ 标准修法**：

1. **补齐缺失字段**（首选）
   ```ts
   const config: SmsChannelConfig = {
     name: 'sms',
     type: 'sms',
     enabled: true,     // ← 补上
     recipients: [],
   };
   ```
2. 字段确实是"调用方可选" → 在**类型定义侧**改成可选
   ```ts
   interface SmsChannelConfig {
     enabled?: boolean;   // ← 类型侧放宽，而非调用侧强转
   }
   ```
3. 继承已有默认值 → 从默认对象展开
   ```ts
   const config: SmsChannelConfig = { ...DEFAULT_SMS_CONFIG, recipients: ['+86...'] };
   ```

**❌ 反模式**

```ts
// 反模式 1：整体 any（缺失字段被静默吞掉，运行期才炸）
const config: any = { name: 'sms' };

// 反模式 2：非空断言掩盖缺失
const config = { name: 'sms' } as SmsChannelConfig;   // ⚠️ 尤其危险
```

> `as SmsChannelConfig` 这种"从窄对象断言到宽类型"会让缺失字段在运行期变成 `undefined`，
> 比 `as any` 更危险，因为它**看起来**已经类型安全了。

---

## 🚫 `as any` 滥用总览（本轮最高优先级反模式）

`as any` 让编译器闭嘴，但**不解决任何问题**。它把类型债从"编译期可见"变成"运行期爆炸"。

### 判定标准

| 场景 | 是否可接受 | 说明 |
|------|-----------|------|
| `await response.json() as SomeInterface` | ✅ 可接受 | 收窄断言，配合本地声明的接口使用 |
| `unknown` 收窄为具体类型 | ✅ 可接受 | 类型守卫或 `as` 均可 |
| `x as any` 绕过参数类型不兼容 | ❌ 不可接受 | 必须修根因 |
| `const x: any = {...}` | ❌ 不可接受 | 用 `unknown` + 守卫，或补齐类型 |
| `arr.map((i: any) => ...)` | ❌ 不可接受 | 显式标注真实类型即可 |
| 整个函数/模块顶层 `any` | ❌ 不可接受 | 污染范围最大 |

### 替代路径速查

| 你想做的事 | ❌ 别写 | ✅ 写成 |
|-----------|--------|--------|
| 动态键访问 | `obj[k]` on 无索引签名 | 补 `[key: string]: unknown` 或 `keyof` 约束 |
| 未知 JSON | `const d: any = await res.json()` | `const d = (await res.json()) as MyInterface` |
| 第三方 SDK | `private client: any` | 定义最小必要接口（`[key: string]: unknown`） |
| 过滤条件 | `Record<string, any>` | `Record<string, unknown>` + 类型守卫 |
| 联合类型 | `as boolean \| 'all'` | 改用字符串枚举 `'all' \| 'unread' \| 'read'` |

### 本轮实测

`git diff` 统计：本轮共移除 **43** 处 `as any` / `: any`，
新增 **23** 处（主要是新增的 `unknown` 索引签名与类型守卫配套代码）。
净减 20 处，且**没有一处是靠新增 `as any` 实现的**。

---

## 🔁 工作流：目录隔离 + 硬门槛

### 1. 目录隔离（避免并行冲突）

多代理 / 多任务并行改类型时，最大的浪费是**同目录互相覆盖**。
本轮采用的隔离规则：

1. **每个任务书只列明允许改动的文件清单**，超出清单即视为越界。
2. **同目录 / 同族文件不并行派发**。
   实例：`workflow-editor-store.ts` 与 `workflow-editor-v110.test.ts` 同属 WorkflowEditor，
   前者完成后再处理后者，避免同目录并行冲突。
3. **子代理一律不 `git add` / `git commit`**，统一由主管收口提交。
4. 跨任务共享文件（如 `notification-center.tsx`）被中断时，
   **开一个接续任务（接续编号，如 T2b）** 附精确错误清单，而不是让原代理重头再来。

### 2. 硬门槛（每轮必须成立）

| 门槛 | 判定方式 | 说明 |
|------|---------|------|
| 类型错误不得恶化 | `npx tsc --noEmit --incremental false` 计数 ≤ 上一轮 | 允许持平，**不允许上升** |
| 后端测试全绿 | `cd 7zi-backend && npx jest` | 10 suites / 111 tests 必须全通过 |
| 不得新增依赖 | `git diff -- package.json` | 本轮统一不新增、不升级依赖 |
| 不得改 tsconfig | `git diff -- tsconfig.json` | `strict` 等配置保持不变 |
| 不得用 `as any` 绕过 | 人工 review diff | 见上文判定标准 |

> 硬门槛的意义在于：**宁可这轮少修几条，也不能让全局数字上升**。
> 类型债治理最大的失败模式不是"修得慢"，而是"一边修一边造新的"。

### 3. 单轮节奏

```
1. 取基线      npx tsc --noEmit --incremental false | grep -cE "error TS"
2. 排序        按文件聚合错误数，头部优先（头部 10 文件占 180+）
3. 分派        按目录隔离原则切分任务书，每个任务书附精确错误清单
4. 修复        按 A→B→C→D→E 分类法处理；A 类先查项目内既有实现
5. 复测        重新取基线，确认 ≤ 上一轮；跑后端 Jest
6. 收口        主管统一 commit；把本轮手法沉淀进本手册
```

### 4. 429 / 中断处理

本轮 T1、T2 两个子代理在启动后 40–50 秒被 API 速率限制（429）强制中断。
处置原则：

- **不放弃、不重头再来**：已落盘的部分改造保留，接续任务从精确错误清单继续
- 降低并发（本轮 5–6 个子代理即触发速率上限，必要时降到 3–4）
- 中断任务的产出**必须验证落盘**（`git diff --stat`），不能只信报告

---

## ✅ 本轮实例对照表

| 文件 | 错误码 | 标准修法 |
|------|--------|---------|
| `WorkflowEditor/stores/workflow-editor-store.ts` | A + B | 移除未安装的 `zundo` 依赖，改用同目录 `workflow-editor-store-v110.ts` 的手写 undo/redo；`initialState` 补显式类型断言；回调参数显式标注 |
| `lib/services/notification-center.tsx` | D | 修正 `useUnreadCount` / `useNotifications` / `useNotificationActions` 的解构形状；`<select>` 读取状态筛选改字符串枚举 |
| `lib/knowledge/vector-store.ts` | C | `Record<string, any>` → `Record<string, unknown>`；`private client: any` → 最小接口 `WeaviateClient`（带 `[key: string]: unknown`）；新增 `FilterOperator` / `FilterCondition` / `WeaviateWhereFilter` 与 `isFilterOperator` 守卫 |
| `lib/knowledge/rag-qa.ts` | D | 声明 `LlmChatResponse` 接口，`as LlmChatResponse` 收窄替代 `const data: any` |
| `lib/knowledge/document-pipeline.ts` | D | 声明 `EmbeddingApiResponse` 接口，`as EmbeddingApiResponse` 收窄替代 `const data: any` |
| `lib/knowledge/examples.ts` | A | 移除未使用的 `RAGQAConfig` 导入与未解构的 `retriever` |
| `lib/services/notification-enhanced.ts` | A | 清理未使用的 `NotificationFilter` 导入 |

---

## 🔗 相关文档

- [后端测试指南](./BACKEND_TESTING_GUIDE.md) — 后端 Jest 运行、组织、覆盖率阈值
- [开发规范 / 代码质量](./DEVELOPMENT.md)
- [架构文档](./ARCHITECTURE.md)
- [API 参考](../API.md)

---

*最后更新：2026-10-21 · 基线口径：`npx tsc --noEmit --incremental false`*
