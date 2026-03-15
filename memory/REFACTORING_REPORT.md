# 7zi 项目代码重构报告

**生成日期**: 2026-03-15  
**分析范围**: `src/app/` 目录  
**目标**: 减少重复代码、提取公共组件、改善代码结构

---

## 📊 总体评估

| 指标 | 当前状态 | 建议改进 |
|------|----------|----------|
| 重复代码率 | ~15-20% | < 10% |
| 最大文件行数 | 896 行 (test) / 784 行 (page) | < 500 行 |
| 公共组件复用 | 低 | 高 |
| 国际化模式 | 分散 | 集中管理 |

---

## 🔴 严重问题 (立即处理)

### 1. API 路由认证逻辑重复

**问题**: 几乎所有 API 路由都有相同的认证模式

```typescript
// ❌ 当前: 每个文件都重复这段代码
const token = extractToken(request);
let userId = 'anonymous';
if (token) {
  const payload = await verifyToken(token);
  if (payload) {
    userId = payload.sub;
  }
}
```

**影响文件**:
- `api/notifications/route.ts`
- `api/tasks/route.ts`
- `api/projects/route.ts`
- `api/logs/route.ts`
- `api/comments/[id]/route.ts`
- ... 等 10+ 个文件

**建议**: 创建统一的认证工具函数

```typescript
// ✅ 建议: src/lib/middleware/auth-utils.ts
export async function getRequestUser(request: NextRequest): Promise<{
  userId: string;
  role: string;
  isAuthenticated: boolean;
}> {
  const token = extractToken(request);
  if (!token) {
    return { userId: 'anonymous', role: 'guest', isAuthenticated: false };
  }
  const payload = await verifyToken(token);
  return {
    userId: payload?.sub ?? 'anonymous',
    role: payload?.role ?? 'guest',
    isAuthenticated: !!payload,
  };
}

// 使用
const { userId, role, isAuthenticated } = await getRequestUser(request);
```

---

### 2. CSRF 中间件重复实例化

**问题**: 每个路由文件都创建自己的 CSRF 中间件实例

```typescript
// ❌ 当前: 每个文件都有
const csrfMiddleware = createCsrfMiddleware();
// ...
const csrfResult = await csrfMiddleware(request);
if (csrfResult) return csrfResult;
```

**建议**: 创建统一的高阶函数

```typescript
// ✅ 建议: src/lib/middleware/route-helpers.ts
export function withCsrfProtection(
  handler: (request: NextRequest) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  const csrfMiddleware = createCsrfMiddleware();
  
  return async (request: NextRequest) => {
    const csrfResult = await csrfMiddleware(request);
    if (csrfResult) return csrfResult;
    return handler(request);
  };
}

// 使用
export const POST = withCsrfProtection(async (request) => {
  // 直接处理业务逻辑
});
```

---

### 3. 通知页面过大 (784 行)

**问题**: `notifications/page.tsx` 包含太多逻辑

**建议拆分为**:

```
src/app/[locale]/notifications/
├── page.tsx (主页面, ~150 行)
├── components/
│   ├── NotificationItem.tsx
│   ├── NotificationSkeleton.tsx
│   ├── EmptyState.tsx
│   ├── BatchActionBar.tsx
│   ├── GroupHeader.tsx
│   └── FilterBar.tsx
├── hooks/
│   ├── useNotifications.ts
│   └── useSelection.ts
├── utils/
│   └── grouping.ts
└── config/
    └── notification-config.ts
```

---

## 🟡 中等问题 (近期处理)

### 4. 骨架屏组件重复

**问题**: 多个页面有相似的骨架屏实现

**当前位置**:
- `notifications/page.tsx` - `NotificationSkeleton`
- `dashboard/page.tsx` - `DashboardSkeleton`
- `components/LazyImage.tsx` - `SkeletonOptimized`

**建议**: 统一骨架屏组件

```typescript
// ✅ 建议: src/components/ui/Skeleton.tsx
export function Skeleton({ 
  className, 
  variant = 'rect',
  width,
  height,
  count = 1 
}: SkeletonProps) {
  // 统一实现
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) { ... }
export function TableSkeleton({ rows = 5 }: { rows?: number }) { ... }
export function ListSkeleton({ count = 5 }: { count?: number }) { ... }
```

---

### 5. 时间格式化函数重复

**问题**: `notifications/page.tsx` 有自己的 `formatTime` 函数

```typescript
// ❌ 当前: 通知页面的 formatTime
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  // ... 自定义实现
}
```

**已有**: `lib/datetime.ts` 提供了 `formatTimeAgo`

**建议**: 统一使用 `lib/datetime.ts`

```typescript
// ✅ 建议
import { formatTimeAgo, getFriendlyDateTime } from '@/lib/datetime';

// 替换所有自定义时间格式化
```

---

### 6. 配置对象分散

**问题**: `typeConfig`, `priorityConfig` 等配置在组件内定义

**建议**: 提取到配置文件

```typescript
// ✅ 建议: src/config/notification-config.ts
export const NOTIFICATION_TYPE_CONFIG = {
  task_assigned: { 
    icon: '📋', 
    label: { zh: '任务分配', en: 'Task Assigned' },
    color: 'bg-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30'
  },
  // ...
};

export const PRIORITY_CONFIG = {
  high: { 
    label: { zh: '紧急', en: 'Urgent' },
    // ...
  },
  // ...
};
```

---

### 7. 国际化模式分散

**问题**: 大量 `locale === 'zh' ? '中文' : 'English'` 三元表达式

**建议**: 使用 `next-intl` 的 `useTranslations` hook

```typescript
// ✅ 建议: messages/zh.json & messages/en.json
{
  "notifications": {
    "title": "通知中心",
    "allRead": "全部已读",
    "noUnread": "暂无未读通知"
  }
}

// 组件中使用
const t = useTranslations('notifications');
<h1>{t('title')}</h1>
```

---

## 🟢 低优先级 (可选改进)

### 8. 样式类重复

**问题**: 骨架屏样式类重复出现

```css
bg-zinc-200 dark:bg-zinc-800 rounded-2xl p-6
```

**建议**: 使用 Tailwind `@apply` 或组件封装

```css
/* globals.css */
@layer components {
  .skeleton-card {
    @apply bg-zinc-200 dark:bg-zinc-800 rounded-2xl p-6 animate-pulse;
  }
}
```

---

### 9. CSV 解析逻辑复杂 (tasks/import/route.ts)

**问题**: 444 行的 CSV 导入逻辑过于复杂

**建议**: 拆分为独立模块

```
src/lib/csv/
├── parser.ts       # CSV 解析
├── validator.ts    # 数据验证
├── mapper.ts       # 字段映射
└── importer.ts     # 导入逻辑
```

---

### 10. 命名规范不一致

**问题**: 部分文件命名不一致

| 当前 | 建议 |
|------|------|
| `useSettingsPage.ts` | `useSettings.ts` (移除 Page 后缀) |
| `AssignmentSuggester.tsx` | `AssignmentSuggester.tsx` ✓ |

---

## 📋 重构优先级清单

### Phase 1 (本周)
- [ ] 创建 `getRequestUser` 统一认证函数
- [ ] 创建 `withCsrfProtection` 高阶函数
- [ ] 提取通知页面组件

### Phase 2 (下周)
- [ ] 统一骨架屏组件
- [ ] 迁移时间格式化到 `lib/datetime.ts`
- [ ] 提取配置对象到 `config/` 目录

### Phase 3 (后续)
- [ ] 国际化重构
- [ ] CSV 导入模块拆分
- [ ] 样式类统一

---

## 🔧 建议的新文件结构

```
src/
├── app/[locale]/
│   └── notifications/
│       ├── page.tsx              # 主页面 (精简后)
│       ├── components/           # 子组件
│       ├── hooks/               # 自定义 hooks
│       └── config/              # 页面配置
│
├── components/
│   └── ui/
│       ├── Skeleton.tsx         # 统一骨架屏
│       └── ...
│
├── lib/
│   ├── middleware/
│   │   ├── auth-utils.ts        # 认证工具函数
│   │   └── route-helpers.ts     # 路由辅助函数
│   ├── csv/                     # CSV 处理模块
│   └── datetime.ts              # 时间工具 (已有)
│
└── config/
    ├── notification-config.ts   # 通知配置
    ├── task-config.ts           # 任务配置
    └── i18n/                    # 国际化文件
```

---

## 📈 预期收益

| 指标 | 改进前 | 改进后 | 收益 |
|------|--------|--------|------|
| 通知页面行数 | 784 | ~150 | -80% |
| 认证代码重复 | 10+ 处 | 1 处 | -90% |
| 骨架屏组件 | 3 个独立实现 | 1 个统一组件 | -67% |
| 国际化维护 | 分散在各文件 | 集中 JSON 文件 | 更易维护 |

---

## 🚀 快速启动指南

### 1. 创建认证工具函数

```bash
# 创建文件
touch src/lib/middleware/auth-utils.ts
```

### 2. 创建统一骨架屏组件

```bash
# 创建文件
touch src/components/ui/Skeleton.tsx
```

### 3. 开始重构通知页面

```bash
# 创建目录结构
mkdir -p src/app/[locale]/notifications/{components,hooks,config}
```

---

*报告生成: 2026-03-15*
