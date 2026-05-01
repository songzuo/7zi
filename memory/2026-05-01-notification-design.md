# Notification 系统去重重构 - 技术设计文档
**架构师 | 2026-05-01 04:12 UTC**

---

## 1. 现状分析

### 1.1 文件清单与行数

| 文件 | 行数 | 主要职责 |
|------|------|----------|
| `notification.ts` | 224 | 基础通知类、BadgeNotification |
| `notifications.ts` | 10 | 重导出 |
| `notification-types.ts` | 69 | 类型定义（NotificationType 等） |
| `notification-manager.ts` | 648 | 通知管理器（单例模式） |
| `notification-enhanced.ts` | 676 | 增强版（额外功能/UI） |
| `notification-storage.ts` | 634 | 本地存储抽象层 |
| `notification-indexeddb.ts` | 662 | IndexedDB 实现 |
| `notification-center.tsx` | 547 | React 组件 |
| **总计** | **3470** | 8 个文件 |

### 1.2 核心问题

1. **职责重叠**：manager、enhanced、storage 三个文件功能大量重复
2. **继承混乱**：`enhanced` 继承 `manager`，但职责边界模糊
3. **存储分层不清**：storage 和 indexeddb 存在功能重叠
4. **入口分散**：notifications.ts 仅做重导出，无实际价值

### 1.3 重叠代码分析

```
通知发送流程在 3 处重复实现：
  - notification-manager.ts: sendNotification()
  - notification-enhanced.ts: sendNotification()
  - notification-storage.ts: saveNotification()

存储抽象在 2 处重复：
  - notification-storage.ts: getItem/setItem
  - notification-indexeddb.ts: getItem/setItem (IndexedDB 直接实现)
```

---

## 2. 目标架构

### 2.1 合并后：3 个模块

```
src/lib/notifications/
├── types.ts           (~150 行)  ← 类型 + 接口
├── core.ts            (~800 行)  ← 核心业务逻辑
└── ui.tsx             (~400 行)  ← React 组件
```

**减少**: 8 文件 → 3 文件，减少约 2100+ 行（依赖清理后）

### 2.2 模块职责边界

#### `types.ts` - 类型定义层
- 所有 TypeScript 接口/类型
- 常量枚举
- 通知配置类型
- **无运行时代码**

#### `core.ts` - 核心业务逻辑层
- NotificationManager 类（单例）
- 存储抽象（StorageAdapter 接口）
- IndexedDB 存储实现
- 去重逻辑（基于 timestamp + type + contentHash）
- 队列管理（QueueItem）
- 生命周期（init/destroy）
- **无 React 依赖**

#### `ui.tsx` - React 展示层
- NotificationCenter 组件
- BadgeNotification 组件
- 快捷操作按钮（Mark as Read, Clear All）
- Hooks: useNotifications, useNotificationCenter

---

## 3. 接口定义

### 3.1 类型层 (types.ts)

```typescript
// ========== 核心类型 ==========

export type NotificationType = 
  | 'badge' | 'email' | 'sms' 
  | 'webhook' | 'in_app' | 'system';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationPayload {
  id?: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp?: number;
  priority?: NotificationPriority;
  metadata?: Record<string, unknown>;
  read?: boolean;
  userId?: string;
}

export interface Notification extends NotificationPayload {
  id: string;
  timestamp: number;
  read: boolean;
  delivered: boolean;
}

// ========== 存储层 ==========

export interface IStorageAdapter {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

// ========== 管理器接口 ==========

export interface INotificationManager {
  init(): Promise<void>;
  destroy(): void;
  send(payload: NotificationPayload): Promise<Notification>;
  getAll(): Promise<Notification[]>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(): Promise<void>;
  delete(id: string): Promise<void>;
  clearAll(): Promise<void>;
  subscribe(callback: NotificationCallback): UnsubscribeFn;
}

export type NotificationCallback = (notifications: Notification[]) => void;
export type UnsubscribeFn = () => void;

// ========== UI 层类型 ==========

export interface NotificationCenterProps {
  maxVisible?: number;
  position?: 'top-right' | 'bottom-right' | 'bottom-left';
  onNotificationClick?: (n: Notification) => void;
  filter?: (n: Notification) => boolean;
}

export interface BadgeNotificationProps {
  count?: number;
  icon?: React.ReactNode;
  maxCount?: number;
  onClick?: () => void;
}
```

### 3.2 核心层 (core.ts)

```typescript
// ========== 单例管理器 ==========

class NotificationManager implements INotificationManager {
  private static instance: NotificationManager;
  private storage: IStorageAdapter;
  private subscribers = new Set<NotificationCallback>();
  private queue: QueueItem[] = [];
  private deduplicationCache = new Map<string, number>(); // contentHash -> timestamp
  
  static getInstance(): NotificationManager { ... }
  
  async init(): Promise<void> {
    this.storage = new IndexedDBStorageAdapter('notifications-db');
    await this.storage.init?.(); // 允许无 init 方法的 adapter
    this.loadDeduplicationCache();
  }
  
  // ========== 去重核心逻辑 ==========
  private shouldDeduplicate(payload: NotificationPayload): boolean {
    const hash = this.computeContentHash(payload);
    const lastTime = this.deduplicationCache.get(hash);
    if (lastTime && Date.now() - lastTime < DEDUP_WINDOW_MS) {
      return true;
    }
    this.deduplicationCache.set(hash, Date.now());
    return false;
  }
  
  private computeContentHash(payload: NotificationPayload): string {
    // 基于 type + title + body 的轻量哈希
    return cryptoHash(`${payload.type}:${payload.title}:${payload.body}`);
  }
  
  // ========== 发送流程 ==========
  async send(payload: NotificationPayload): Promise<Notification> {
    if (this.shouldDeduplicate(payload)) {
      return this.getByHash(payload) ?? throw new Error('Deduplicated');
    }
    // ... 实际发送逻辑
  }
}
```

---

## 4. 文件迁移计划

### 阶段 1：创建新文件（独立开发，不影响现有代码）

```
在 src/lib/notifications/ 下创建：
  - types.ts        （基于现有 notification-types.ts 扩展）
  - core.ts         （新建，合并 manager + enhanced + storage）
  - ui.tsx          （基于 notification-center.tsx 改造）
```

### 阶段 2：内部合并（逐步吸收功能）

```
步骤 2.1: core.ts 吸收 notification-manager.ts
  - 复制 manager 代码
  - 删除 enhanced 和 storage 中的重复实现
  - 适配器统一通过 IStorageAdapter

步骤 2.2: core.ts 吸收 notification-storage.ts
  - 将 storage 逻辑作为私有方法
  - IndexedDB 具体实现内聚在 core.ts 底部
  
步骤 2.3: core.ts 吸收 notification-enhanced.ts
  - 判断哪些增强功能是必要的
  - 保留必要的，废弃冗余的
```

### 阶段 3：清理旧文件

```
步骤 3.1: 删除 notification.ts（功能已被 core.ts 覆盖）
步骤 3.2: 删除 notification-manager.ts
步骤 3.3: 删除 notification-enhanced.ts
步骤 3.4: 删除 notification-storage.ts
步骤 3.5: 删除 notification-indexeddb.ts
步骤 3.6: 更新 notifications.ts → 重导出新的 3 个模块
步骤 3.7: 删除 notification-types.ts（已被 types.ts 替代）
步骤 3.8: 删除 notification-center.tsx（已被 ui.tsx 替代）
```

### 阶段 4：更新引用

```
grep -r "from.*notification" src/ --include="*.ts" --include="*.tsx"
逐个更新导入路径：
  old: import { NotificationManager } from '@/lib/notification-manager'
  new: import { NotificationManager } from '@/lib/notifications/core'
```

### 迁移顺序图

```
notification-types.ts ─────┐
notification-manager.ts ──┼──→ types.ts (保留类型)
notification-enhanced.ts ──┤        core.ts (合并逻辑)
notification-storage.ts ───┤        ui.tsx (合并UI)
notification-indexeddb.ts ──┤
notification-center.tsx ────┤
notification.ts ────────────┤
notifications.ts ───────────┘

最终: 3 文件 → types.ts + core.ts + ui.tsx
```

---

## 5. 详细重构步骤

### Step 1: 创建 types.ts（第 1 小时）

```typescript
// 创建 src/lib/notifications/types.ts
// 合并所有类型定义
// 保留：NotificationType, NotificationPayload, Notification
// 新增：IStorageAdapter, INotificationManager 接口
```

### Step 2: 创建 core.ts 骨架（第 2 小时）

```typescript
// 创建 src/lib/notifications/core.ts
// 导入 types.ts 中定义的接口
// 实现 NotificationManager 单例
// 注入 IStorageAdapter
```

### Step 3: 实现 IndexedDB 存储（第 3 小时）

```typescript
// 在 core.ts 底部添加：
class IndexedDBStorageAdapter implements IStorageAdapter {
  // 将 notification-indexeddb.ts 的核心逻辑移入
  // 保留数据库 schema 定义
}
```

### Step 4: 迁移增强功能（第 4 小时）

```typescript
// 分析 notification-enhanced.ts 中有价值的功能：
// - 去重窗口期配置
// - 优先级队列处理
// - 最大存储数量限制
// 合并到 core.ts 的 NotificationManager

// 废弃功能（不迁移）：
// - 重复的 sendNotification 实现
// - 已过时的配置项
```

### Step 5: 创建 ui.tsx（第 5 小时）

```typescript
// 创建 src/lib/notifications/ui.tsx
// 基于 notification-center.tsx 重写
// 使用 core.ts 导出的 hooks
// 保持现有 UI 行为不变
```

### Step 6: 更新导入和删除旧文件（第 6 小时）

```bash
# 查找所有引用
grep -rn "from.*notifications" src/ --include="*.ts" --include="*.tsx"

# 更新为新路径
# 删除旧文件（确认无引用后）
```

---

## 6. 风险评估

### 🔴 高风险

| 风险 | 描述 | 缓解措施 |
|------|------|----------|
| 运行时行为改变 | 去重逻辑可能改变现有通知的展示行为 | 添加 feature flag，渐进式开启 |
| IndexedDB 数据迁移 | 旧 schema 与新 schema 不兼容 | 实现 version upgrade 逻辑 |

### 🟡 中风险

| 风险 | 描述 | 缓解措施 |
|------|------|----------|
| 导入遗漏 | 8 个文件散落在各目录，grep 可能遗漏 | 全面测试：页面加载、通知发送/接收 |
| 测试覆盖不足 | 现有测试文件可能依赖旧路径 | 同步更新测试文件 |

### 🟢 低风险

| 风险 | 描述 | 缓解措施 |
|------|------|----------|
| API 签名变化 | 如果外部代码调用了 NotificationManager 内部方法 | 新增 deprecated 注释，引导使用公开接口 |
| 性能回退 | 合并后 bundle size 增加 | Tree-shaking 友好设计，保留按需导入 |

### 风险矩阵

```
影响程度
  高 │ [去重逻辑] [数据迁移]
  中 │ [导入遗漏] [测试覆盖]
  低 │ [API签名]  [bundle大小]

  概率→   低        中        高
```

---

## 7. 验收标准

### 7.1 代码质量

- [ ] TypeScript 编译 0 errors（`tsc --noEmit`）
- [ ] `as any` 在 notifications 模块内 < 5 处
- [ ] JSDoc 覆盖所有公开接口

### 7.2 功能回归

- [ ] 通知发送正常（badge、email、sms 各场景）
- [ ] 通知存储正常（刷新页面后数据保留）
- [ ] 去重正常（相同内容 60s 内不重复展示）
- [ ] 标记已读/全部已读正常
- [ ] 删除/清空正常

### 7.3 性能指标

- [ ] Bundle size 不增加（tree-shaking 验证）
- [ ] 通知列表渲染 < 16ms（60fps）

### 7.4 覆盖率

- [ ] 核心逻辑单元测试覆盖率 > 80%
- [ ] UI 组件快照测试覆盖

---

## 8. 工时估算

| 阶段 | 任务 | 工时 |
|------|------|------|
| 1 | 创建 types.ts | 1h |
| 2 | 创建 core.ts 骨架 | 1h |
| 3 | 实现 IndexedDB 存储 | 1h |
| 4 | 迁移增强功能 | 1h |
| 5 | 创建 ui.tsx | 1h |
| 6 | 更新导入 + 删除旧文件 | 1h |
| 7 | 调试 + 回归测试 | 2h |
| **总计** | | **8h** |

**实际预估**: 6-8 小时（取决于现有代码的混乱程度）

---

## 9. 后续建议

1. **添加通知优先级队列**：current 无优先级处理
2. **支持更多存储后端**：localStorage 作为 fallback
3. **Web Worker 化**：将 IndexedDB 操作移入 Worker，避免阻塞主线程
4. **通知模板化**：减少重复的 title/body 构建代码

---

*文档生成：🏗️ 架构师子代理 | 2026-05-01 04:12 UTC*
*下一步：Executor 将根据此文档执行重构任务*