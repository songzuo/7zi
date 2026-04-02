# Zustand 迁移指南

## 概述

本文档说明如何将 React 组件从 Context/Hooks 迁移到 Zustand stores。

## 迁移状态

### ✅ 已完成的 Stores

| Store                | 文件                             | 状态    | 测试            |
| -------------------- | -------------------------------- | ------- | --------------- |
| **preferencesStore** | `src/stores/preferencesStore.ts` | ✅ 完成 | ✅ 通过 (14/14) |
| **filterStore**      | `src/stores/filterStore.ts`      | ✅ 完成 | ✅ 通过 (19/19) |
| **uiStore**          | `src/stores/uiStore.ts`          | ✅ 完成 | ✅ 通过 (33/33) |
| dashboardStore       | `src/stores/dashboardStore.ts`   | 已存在  | ✅ 通过         |
| walletStore          | `src/stores/walletStore.ts`      | 已存在  | ✅ 通过         |

---

## 1. Preferences Store 迁移指南

### 从 SettingsContext 迁移

**旧方式 (SettingsContext):**

```tsx
import { useSettings } from '@/contexts/SettingsContext'

function MyComponent() {
  const { settings, setTheme, toggleTheme, isDark } = useSettings()

  return <button onClick={toggleTheme}>切换主题</button>
}
```

**新方式 (Zustand):**

```tsx
import { useTheme, useLanguage, useSettings } from '@/stores'

function MyComponent() {
  const { theme, toggleTheme, isDark } = useTheme()
  const { language, setLanguage } = useLanguage()

  return (
    <div>
      <button onClick={toggleTheme}>切换主题</button>
      <select onChange={e => setLanguage(e.target.value)}>
        <option value="zh">中文</option>
        <option value="en">English</option>
      </select>
    </div>
  )
}
```

### 变更对照表

| 旧 API                   | 新 API                                       | 说明         |
| ------------------------ | -------------------------------------------- | ------------ |
| `useSettings()`          | `useSettings()`                              | 获取所有设置 |
| `settings.theme`         | `useTheme().theme`                           | 获取主题     |
| `toggleTheme()`          | `useTheme().toggleTheme`                     | 切换主题     |
| `setTheme(theme)`        | `useTheme().setTheme`                        | 设置主题     |
| `isDark`                 | `useTheme().isDark`                          | 深色模式状态 |
| `settings.language`      | `useLanguage().language`                     | 获取语言     |
| `setLanguage(lang)`      | `useLanguage().setLanguage`                  | 设置语言     |
| `settings.notifications` | `useNotificationPreferences().notifications` | 获取通知偏好 |

### Provider 变更

**移除:**

```tsx
// 删除这个 Provider
<SettingsProvider defaultSettings={...}>
  {children}
</SettingsProvider>
```

**原因:** Zustand store 不需要 Provider，状态是全局共享的。

---

## 2. Filter Store 迁移指南

### 从本地 useState 迁移

**旧方式 (本地状态):**

```tsx
function MyComponent() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<FilterCondition[]>([])
  const [sort, setSort] = useState<SortCondition | null>(null)
  const [page, setPage] = useState(1)

  return <div>...</div>
}
```

**新方式 (Zustand - 带命名空间):**

```tsx
import { useFilters, useSort, usePagination } from '@/stores'

function MyComponent() {
  // 使用命名空间 'my-component' 隔离状态
  const filters = useFilters('my-component')
  const sort = useSort('my-component')
  const pagination = usePagination('my-component')

  const handleSearch = (query: string) => {
    import('@/stores').then(({ useFilterStore }) => {
      useFilterStore.getState().setSearchQuery('my-component', query)
    })
  }

  return <div>...</div>
}
```

### Filter Store 优势

1. **多组件共享状态** - 相同命名空间的组件自动同步
2. **持久化存储** - 刷新页面后状态保留
3. **命名空间隔离** - 不同页面/组件不会互相干扰
4. **统一 API** - 一致的过滤、排序、分页操作

### Action Hooks 使用

```tsx
import { useFilterActions, useSortActions } from '@/stores'

function MyComponent() {
  const filterActions = useFilterActions('my-component')
  const sortActions = useSortActions('my-component')

  return (
    <div>
      <input onChange={e => filterActions.setSearchQuery(e.target.value)} />
      <button onClick={() => sortActions.toggleSort('name')}>按名称排序</button>
    </div>
  )
}
```

---

## 3. UI Store 迁移指南

### 从 useNotifications Hook 迁移

**旧方式 (useNotifications Hook):**

```tsx
import { useNotifications } from '@/hooks/useNotifications'

function MyComponent() {
  const { success, error, info, warning } = useNotifications()

  const handleSuccess = () => {
    success('操作成功！', '成功标题')
  }

  return <button onClick={handleSuccess}>显示通知</button>
}
```

**新方式 (Zustand):**

```tsx
import { toast } from '@/stores'
// 或者
import { useToastActions } from '@/stores'

function MyComponent() {
  const { success, error, info, warning } = useToastActions()

  return <button onClick={() => toast.success('操作成功！')}>显示通知</button>
}
```

### Toast API 对照表

| 旧 API                    | 新 API                          | 说明         |
| ------------------------- | ------------------------------- | ------------ |
| `success(title, message)` | `toast.success(message, title)` | 参数顺序不同 |
| `error(title, message)`   | `toast.error(message, title)`   | 同上         |
| `warning(title, message)` | `toast.warning(message, title)` | 同上         |
| `info(title, message)`    | `toast.info(message, title)`    | 同上         |

### 侧边栏状态

```tsx
import { useSidebar } from '@/stores'

function MyComponent() {
  const { isOpen, toggle, open, close, isCollapsed, toggleCollapse } = useSidebar()

  return (
    <div>
      <button onClick={toggle}>切换侧边栏</button>
      <button onClick={toggleCollapse}>折叠/展开</button>
    </div>
  )
}
```

### Modal 状态

```tsx
import { useModalActions } from '@/stores'

function MyComponent() {
  const { openModal, closeModal, closeAllModals } = useModalActions()

  const handleOpenModal = () => {
    openModal({
      title: '对话框',
      content: <div>内容</div>,
      size: 'md',
      onClose: () => console.log('已关闭'),
    })
  }

  return <button onClick={handleOpenModal}>打开对话框</button>
}
```

### 表单草稿

```tsx
import { useFormDraft, useFormDraftActions } from '@/stores'

function MyForm() {
  const draft = useFormDraft('user-form')
  const { saveFormDraft, deleteFormDraft } = useFormDraftActions()

  const handleChange = (data: FormData) => {
    // 自动保存草稿
    saveFormDraft('user-form', data)
  }

  return <form>...</form>
}
```

---

## 4. SSR 兼容性

所有新 stores 都使用 `persist` 中间件并支持 SSR：

```typescript
export const usePreferencesStore = create<PreferencesState>()(
  devtools(
    persist(
      (set, get) => ({...}),
      {
        name: '7zi-user-settings',
        onRehydrateStorage: () => (state) => {
          // 客户端水合后初始化
          if (state) {
            state.isLoaded = true;
            // ... 其他初始化逻辑
          }
        },
      }
    )
  )
);
```

### 避免 Hydration 错误

1. **使用 `isLoaded` 标志** - 确保只在客户端完全加载后才渲染
2. **条件渲染** - 避免服务端和客户端渲染不一致

```tsx
function MyComponent() {
  const isLoaded = usePreferencesLoaded()

  if (!isLoaded) {
    return <div>Loading...</div>
  }

  return <div>内容</div>
}
```

---

## 5. 迁移清单

### 第一阶段：Preferences Store

- [ ] `SettingsContext.tsx` → 删除或标记为废弃
- [ ] 所有 `useSettings()` 调用 → 迁移到 `useTheme()` / `useLanguage()`
- [ ] 移除 `SettingsProvider` 包装
- [ ] 测试主题切换功能
- [ ] 测试语言切换功能
- [ ] 测试通知偏好设置

### 第二阶段：Filter Store

- [ ] 识别所有使用本地 `useState` 管理过滤状态的组件
- [ ] 迁移到 `useFilters(namespace)`
- [ ] 识别所有使用本地 `useState` 管理排序状态的组件
- [ ] 迁移到 `useSort(namespace)`
- [ ] 识别所有使用本地 `useState` 管理分页状态的组件
- [ ] 迁移到 `usePagination(namespace)`
- [ ] 测试多组件状态共享
- [ ] 测试持久化存储

### 第三阶段：UI Store

- [ ] `useNotifications.ts` Hook → 迁移到 `toast` API
- [ ] 所有 `toast.success/error/info/warning` 调用 → 更新参数顺序
- [ ] 侧边栏状态迁移到 `useSidebar()`
- [ ] Modal 状态迁移到 `useModalActions()`
- [ ] 表单草稿迁移到 `useFormDraftActions()`
- [ ] 测试 Toast 通知
- [ ] 测试 Modal 对话框
- [ ] 测试表单草稿自动保存

---

## 6. 示例组件

查看完整示例：`src/components/examples/StoreUsageExample.tsx`

```bash
npm run dev
# 访问 /examples/store-usage
```

---

## 7. 故障排除

### 问题：Hydration 错误

**症状:** `Text content does not match server-rendered HTML`

**解决方案:**

```tsx
const isLoaded = usePreferencesLoaded()
if (!isLoaded) return null // 或 loading 状态
```

### 问题：Toast 不显示

**症状:** 调用 `toast.success()` 后没有任何反应

**解决方案:**

- 确保使用 `import { toast } from '@/stores'`
- 检查是否有 Toast 组件渲染 `useToasts()`
- 确认 Toast 组件使用 `useToasts()` 获取列表

### 问题：Filter 状态不共享

**症状:** 多个组件之间的过滤状态不同步

**解决方案:**

- 确保使用相同的命名空间
- 检查命名空间字符串是否一致（注意大小写和空格）

---

## 8. 下一步

1. **渐进式迁移** - 不需要一次性迁移所有组件
2. **废弃警告** - 为旧的 Context 添加废弃警告
3. **文档更新** - 更新项目文档和组件文档
4. **性能监控** - 使用 React DevTools Profiler 监控性能变化

---

## 联系支持

如有问题，请查看：

- Store 测试文件：`src/stores/__tests__/`
- Store 使用示例：`src/components/examples/StoreUsageExample.tsx`
