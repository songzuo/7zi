# Draft Storage - 草稿持久化存储

基于 IndexedDB 的草稿持久化存储模块，支持 localStorage 降级。

## 功能特性

- ✅ **IndexedDB 优先** - 使用浏览器原生 IndexedDB 存储大量数据
- ✅ **localStorage 降级** - 当 IndexedDB 不可用时自动降级
- ✅ **自动过期清理** - 草稿默认 7 天过期，自动清理
- ✅ **多种类型支持** - workflow, template, execution
- ✅ **TypeScript 类型安全** - 完整的类型定义
- ✅ **React Hooks** - 提供便捷的 React hooks
- ✅ **自动保存** - 支持防抖自动保存

## 安装

模块已集成到项目中，无需额外安装。

## 基本使用

### 1. 保存草稿

```typescript
import { saveDraft } from '@/lib/db/draft-storage'

// 保存工作流草稿
const draftId = await saveDraft('workflow', {
  name: 'My Workflow',
  nodes: [
    { id: 'node1', type: 'start' },
    { id: 'node2', type: 'process' },
  ],
  edges: [],
})

console.log('Draft ID:', draftId) // DRAFT-WO-xxx-xxx
```

### 2. 加载草稿

```typescript
import { loadDraft } from '@/lib/db/draft-storage'

const draft = await loadDraft(draftId)
if (draft) {
  console.log('Draft data:', draft.data)
}
```

### 3. 列出草稿

```typescript
import { listDrafts } from '@/lib/db/draft-storage'

// 列出所有工作流草稿
const workflowDrafts = await listDrafts('workflow')

// 列出所有草稿
const allDrafts = await listDrafts()
```

### 4. 更新草稿

```typescript
import { updateDraft } from '@/lib/db/draft-storage'

await updateDraft(draftId, {
  nodes: [
    { id: 'node1', type: 'start' },
    { id: 'node2', type: 'end' },
  ],
})
```

### 5. 删除草稿

```typescript
import { deleteDraft } from '@/lib/db/draft-storage'

await deleteDraft(draftId)
```

### 6. 清理过期草稿

```typescript
import { clearExpiredDrafts } from '@/lib/db/draft-storage'

const cleared = await clearExpiredDrafts()
console.log(`Cleared ${cleared} expired draft(s)`)
```

## 高级使用

### 自定义过期时间

```typescript
import { saveDraft } from '@/lib/db/draft-storage'

// 保存 1 小时后过期的草稿
const draftId = await saveDraft(
  'workflow',
  { name: 'Temporary Workflow' },
  { ttl: 60 * 60 * 1000 } // 1 小时
)
```

### 使用 DraftStorageManager 类

```typescript
import { getDraftStorageManager } from '@/lib/db/draft-storage'

const manager = getDraftStorageManager()

// 检查存储后端
console.log('Storage backend:', manager.getBackend()) // 'indexeddb' | 'localstorage'

// 保存草稿
const draftId = await manager.saveDraft('workflow', data)

// 列出草稿
const drafts = await manager.listDrafts('workflow')

// 清空所有草稿
await manager.clearAllDrafts()
```

### 类型安全的草稿存储

```typescript
import { saveDraft, loadDraft } from '@/lib/db/draft-storage'

interface WorkflowData {
  name: string
  nodes: Array<{ id: string; type: string }>
  edges: Array<{ source: string; target: string }>
}

// 保存类型化数据
const workflow: WorkflowData = {
  name: 'My Workflow',
  nodes: [{ id: 'node1', type: 'start' }],
  edges: [],
}

const draftId = await saveDraft('workflow', workflow)

// 加载并保持类型安全
const draft = await loadDraft<WorkflowData>(draftId)
if (draft?.data) {
  console.log('Workflow name:', draft.data.name)
}
```

## React Hooks

### useDrafts - 获取草稿列表

```typescript
import { useDrafts } from '@/lib/db/draft-storage-hooks'

function WorkflowList() {
  const { drafts, loading, error, refresh } = useDrafts('workflow')

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <h2>Workflow Drafts ({drafts.length})</h2>
      <ul>
        {drafts.map((draft) => (
          <li key={draft.id}>
            {draft.data?.name} - {new Date(draft.updatedAt).toLocaleString()}
          </li>
        ))}
      </ul>
      <button onClick={refresh}>Refresh</button>
    </div>
  )
}
```

### useDraft - 管理单个草稿

```typescript
import { useDraft } from '@/lib/db/draft-storage-hooks'

function WorkflowEditor({ draftId }: { draftId: string | null }) {
  const { draft, loading, saving, error, save, update, remove } = useDraft(draftId)

  const handleSave = async () => {
    await save({ name: 'Updated Workflow', nodes: [] })
  }

  const handleUpdate = async () => {
    await update({ nodes: [{ id: 'node1', type: 'start' }] })
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <h2>{draft?.data?.name || 'New Workflow'}</h2>
      {saving && <div>Saving...</div>}
      {error && <div>Error: {error.message}</div>}
      <button onClick={handleSave}>Save</button>
      <button onClick={handleUpdate}>Update</button>
      <button onClick={remove}>Delete</button>
    </div>
  )
}
```

### useAutoSave - 自动保存

```typescript
import { useAutoSave } from '@/lib/db/draft-storage-hooks'

function WorkflowEditor() {
  const [workflow, setWorkflow] = useState({
    name: 'My Workflow',
    nodes: [],
  })

  const { isSaving, lastSavedAt, draftId, error, saveNow, discardDraft } = useAutoSave(
    'workflow',
    workflow,
    {
      debounceMs: 2000, // 2 秒后自动保存
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 天过期
      onSave: (id) => console.log('Saved:', id),
      onError: (err) => console.error('Save error:', err),
    }
  )

  return (
    <div>
      <input
        value={workflow.name}
        onChange={(e) => setWorkflow({ ...workflow, name: e.target.value })}
      />
      {isSaving && <span>Saving...</span>}
      {lastSavedAt && <span>Last saved: {new Date(lastSavedAt).toLocaleString()}</span>}
      {error && <div>Error: {error.message}</div>}
      <button onClick={saveNow}>Save Now</button>
      <button onClick={discardDraft}>Discard Draft</button>
    </div>
  )
}
```

### useDraftRecovery - 恢复最近的草稿

```typescript
import { useDraftRecovery } from '@/lib/db/draft-storage-hooks'

function WorkflowEditor() {
  const { draft, loading, accept, discard } = useDraftRecovery('workflow')

  if (loading) return <div>Loading...</div>

  if (draft) {
    return (
      <div>
        <p>发现未保存的工作流草稿 ({new Date(draft.updatedAt).toLocaleString()})</p>
        <button onClick={accept}>恢复草稿</button>
        <button onClick={discard}>丢弃草稿</button>
      </div>
    )
  }

  return <div>正常编辑模式</div>
}
```

### useDraftInitialization - 页面初始化

```typescript
import { useDraftInitialization } from '@/lib/db/draft-storage-hooks'

function App() {
  const { initialized, clearedCount } = useDraftInitialization()

  if (!initialized) {
    return <div>Initializing...</div>
  }

  return (
    <div>
      <h1>7zi Workflow Editor</h1>
      {clearedCount > 0 && (
        <div>已清理 {clearedCount} 个过期草稿</div>
      )}
      {/* 应用内容 */}
    </div>
  )
}
```

## 页面初始化

在应用根组件中初始化草稿存储：

```typescript
import { initializeDraftStorage } from '@/lib/db/draft-storage'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initializeDraftStorage()
  }, [])

  return <html>{children}</html>
}
```

## API 参考

### 类型定义

```typescript
type DraftType = 'workflow' | 'template' | 'execution'

interface Draft<T = unknown> {
  id: string
  type: DraftType
  data: T
  createdAt: number
  updatedAt: number
  expiresAt: number
}

interface SaveDraftOptions {
  ttl?: number // 过期时间（毫秒），默认 7 天
}
```

### 函数

| 函数 | 描述 |
|------|------|
| `saveDraft(type, data, options?)` | 保存草稿，返回 ID |
| `loadDraft<T>(id)` | 加载草稿 |
| `listDrafts<T>(type?)` | 列出草稿 |
| `updateDraft<T>(id, data)` | 更新草稿 |
| `deleteDraft(id)` | 删除草稿 |
| `clearExpiredDrafts()` | 清理过期草稿 |
| `clearAllDrafts()` | 清空所有草稿 |
| `initializeDraftStorage()` | 初始化并清理过期草稿 |

### DraftStorageManager 类

| 方法 | 描述 |
|------|------|
| `saveDraft(type, data, options?)` | 保存草稿 |
| `loadDraft<T>(id)` | 加载草稿 |
| `listDrafts<T>(type?)` | 列出草稿 |
| `updateDraft<T>(id, data)` | 更新草稿 |
| `deleteDraft(id)` | 删除草稿 |
| `clearExpiredDrafts()` | 清理过期草稿 |
| `clearAllDrafts()` | 清空所有草稿 |
| `getBackend()` | 获取存储后端类型 |

## 存储后端

### IndexedDB（优先）

- 支持大量数据存储
- 异步操作，不阻塞主线程
- 更好的性能

### localStorage（降级）

- 当 IndexedDB 不可用时自动降级
- 数据存储在 localStorage 中
- 适合小量数据

## 注意事项

1. **浏览器兼容性** - IndexedDB 在所有现代浏览器中都支持
2. **存储限制** - IndexedDB 通常有更大的存储限制
3. **隐私模式** - 某些浏览器的隐私模式可能限制存储
4. **过期清理** - 建议在页面加载时调用 `initializeDraftStorage()`

## 示例代码

完整示例请参考 `draft-storage.examples.ts` 文件。

## 测试

```bash
npm test
```

## 许可证

MIT