# WebSocket 房间系统测试修复方案

## 概述

**测试状态：**

- 测试文件：4 个
- 测试用例：97 个
- 通过率：21/97 (21.7%)
- 主要问题：测试选择器与实际组件 DOM 结构不匹配

## 问题分析

### 1. RoomCard.test.tsx vs RoomCard.tsx

#### 问题 1.1: 按钮缺少 name/aria-label 属性

**测试期望：**

```typescript
screen.getByRole('button', { name: /加入/i })
screen.getByRole('button', { name: /离开/i })
screen.getByRole('button', { name: /删除/i })
```

**实际组件：** 按钮只有文本内容，没有明确的 `name` 属性或 `aria-label`

**修复方案：**

在 `RoomCard.tsx` 中添加 `aria-label` 属性：

```tsx
// CardLayout 菜单按钮
<button
  onClick={(e) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  }}
  aria-label="菜单"
  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
>
  ...
</button>

// 删除按钮
<button
  onClick={(e) => {
    e.stopPropagation();
    handleMenuAction('delete');
  }}
  aria-label="删除房间"
  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
>
  删除
</button>

// 离开按钮
<button
  onClick={(e) => {
    e.stopPropagation();
    handleMenuAction('leave');
  }}
  aria-label="离开房间"
  className="w-full px-4 py-2 text-left text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
>
  离开
</button>

// ListLayout 加入按钮
<button
  onClick={(e) => {
    e.stopPropagation();
    onJoin(room.id);
  }}
  aria-label="加入房间"
  className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
>
  加入
</button>

// ListLayout 离开按钮
<button
  onClick={(e) => {
    e.stopPropagation();
    onLeave(room.id);
  }}
  aria-label="离开房间"
  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
>
  离开
</button>
```

#### 问题 1.2: 缺少 data-testid 属性

**测试期望：**

```typescript
const card = screen.getByText('测试房间').closest('div')
expect(card?.className).toMatch(/border-blue-500|border-blue-400/)
```

**问题：** 使用 `closest('div')` 不稳定，容易选择错误的元素

**修复方案：** 添加 `data-testid`

```tsx
// CardLayout
<div
  data-testid="room-card"
  className={`
    relative p-4 rounded-xl cursor-pointer transition-all duration-200 group
    ...
  `}
  ...
>
  ...
</div>

// ListLayout
<div
  data-testid="room-card-list"
  className={`
    flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
    ...
  `}
  ...
>
  ...
</div>

// CompactLayout
<div
  data-testid="room-card-compact"
  className={`
    flex items-center gap-2 p-2 rounded cursor-pointer transition-colors
    ...
  `}
  ...
>
  ...
</div>
```

---

### 2. ParticipantList.test.tsx vs ParticipantList.tsx

#### 问题 2.1: 缺少 data-testid 属性

**测试期望：**

```typescript
const onlineIndicator = document.querySelector('[data-status="online"]')
const offlineIndicator = document.querySelector('[data-status="offline"]')

const container = document.querySelector('[data-testid="participant-grid"]')
expect(container).toBeInTheDocument()

const avatars = document.querySelectorAll('[data-testid="participant-avatar"]')

const avatars = document.querySelectorAll('[data-testid="avatar-stack"]')

const container = document.querySelector('[data-testid="participant-compact"]')

const typingIndicator = document.querySelector('[data-testid="typing-indicator"]')

const currentUserItem = screen.getByText('当前用户').closest('[data-testid="participant-item"]')

const avatar = document.querySelector('[data-testid="avatar-initial"]')

const list = screen.getByRole('list')
```

**修复方案：** 添加完整的 data-testid

```tsx
// ParticipantItem - 状态指示器
{participant.isOnline && (
  <span
    data-status="online"
    className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"
  />
)}
{!participant.isOnline && (
  <span
    data-status="offline"
    className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-gray-400 rounded-full border-2 border-white dark:border-gray-900"
  />
)}

// ParticipantItem - Avatar (无图片)
<div
  data-testid="avatar-initial"
  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
  style={{ backgroundColor: participant.color }}
>
  {participant.avatar ? (
    <img
      data-testid="participant-avatar"
      src={participant.avatar}
      alt={participant.name}
      className="w-full h-full rounded-full object-cover"
    />
  ) : (
    participant.name.charAt(0).toUpperCase()
  )}
</div>

// ParticipantItem - 整个容器
<div
  data-testid="participant-item"
  data-user-id={participant.id}
  className={`
    flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors group
    ${isCurrentUser ? 'current-user' : ''}
  `}
  ...
>
  ...
</div>

// ParticipantList - 主容器
<div
  data-testid="participant-list"
  data-layout={layout}
  className="space-y-1"
>
  ...
</div>

// ParticipantList - Grid 布局
<div
  data-testid="participant-grid"
  className="grid grid-cols-3 gap-3"
>
  ...
</div>

// ParticipantList - Compact 布局
<div
  data-testid="participant-compact"
  data-testid="avatar-stack"
  className="flex items-center gap-1"
>
  ...
</div>

// ParticipantList - 输入指示器
{participant.isTyping && (
  <span
    data-testid="typing-indicator"
    className="text-xs text-blue-600 dark:text-blue-400"
  >
    正在输入...
  </span>
)}

// ParticipantList - 主列表容器（role="list"）
<div
  data-testid="participant-list"
  role="list"
  aria-label="参与者列表"
  className="space-y-1"
>
  ...
</div>
```

#### 问题 2.2: 缺少 aria-label

**修复方案：**

```tsx
// 操作按钮
<button
  onClick={() => setShowRoleMenu(!showRoleMenu)}
  aria-label="更改角色"
  className="..."
  title="更改角色"
>
  ...
</button>

<button
  onClick={() => onKickUser?.(participant.id)}
  aria-label="踢出用户"
  className="..."
  title="踢出"
>
  ...
</button>

<button
  onClick={() => onBanUser?.(participant.id)}
  aria-label="封禁用户"
  className="..."
  title="封禁"
>
  ...
</button>
```

---

### 3. RoomSettings.test.tsx vs RoomSettings.tsx

#### 问题 3.1: Tab 组件的 name 属性不匹配

**测试期望：**

```typescript
screen.getByRole('tab', { name: '通用设置' })
screen.getByRole('tab', { name: '权限管理' })
screen.getByRole('tab', { name: '成员管理' })
screen.getByRole('tab', { name: '危险区域' })
```

**实际组件：** Tab 标签是 "通用"、"权限"、"成员"、"危险"

**修复方案 1：** 修改组件（推荐）

```tsx
// Tabs 组件
const tabs = [
  { id: 'general', label: '通用设置', icon: '⚙️' },
  { id: 'permissions', label: '权限管理', icon: '🔐' },
  { id: 'members', label: '成员管理', icon: '👥' },
  { id: 'danger', label: '危险区域', icon: '⚠️' },
]
```

**修复方案 2：** 修改测试（备选）

```typescript
screen.getByRole('tab', { name: '通用' })
screen.getByRole('tab', { name: '权限' })
screen.getByRole('tab', { name: '成员' })
screen.getByRole('tab', { name: '危险' })
```

#### 问题 3.2: 缺少 data-testid

**修复方案：**

```tsx
// 主容器
<div
  data-testid="room-settings"
  className="h-full flex flex-col bg-white dark:bg-gray-900"
>
  ...
</div>

// 可见性按钮
<button
  data-testid={`visibility-${option.value}`}
  onClick={() => canManage && onChangeVisibility(option.value)}
  ...
>
  ...
</button>

// 输入框
<input
  data-testid="room-name-input"
  type="text"
  value={roomName}
  ...
/>

<input
  data-testid="max-participants-input"
  type="range"
  min="2"
  max="500"
  value={maxParticipants}
  ...
/>

// Toggle 按钮
<button
  data-testid={`toggle-${allowGuests ? 'allow-guests' : 'disallow-guests'}`}
  onClick={() => canManage && onUpdateConfig({ allowGuests: !allowGuests })}
  ...
>
  ...
</button>
```

#### 问题 3.3: 表单控件缺少 name 属性

**修复方案：**

```tsx
<input
  type="text"
  name="roomName"
  data-testid="room-name-input"
  ...
/>

<input
  type="range"
  name="maxParticipants"
  data-testid="max-participants-input"
  ...
/>

<input
  type="range"
  name="autoCleanup"
  data-testid="auto-cleanup-input"
  ...
/>

<button
  name="allowGuests"
  type="button"
  data-testid="toggle-allow-guests"
  ...
>
  ...
</button>
```

---

### 4. RoomManager.test.tsx vs RoomManager.tsx

#### 问题 4.1: 组件 mocked 正确，但需要确保 data-testid

**修复方案：**

```tsx
// 主容器
<div
  data-testid="room-manager"
  className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900"
>
  ...
</div>

// Header
<div
  data-testid="room-manager-header"
  className="h-14 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between px-4"
>
  ...
</div>

// 连接状态
<div
  data-testid="connection-status"
  data-status={isConnected ? 'connected' : isConnecting ? 'connecting' : 'disconnected'}
  className="..."
>
  ...
</div>

// Sidebar
<div
  data-testid="room-list-sidebar"
  className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800"
>
  ...
</div>

// 内容区
<div
  data-testid="room-view-container"
  className="flex-1 flex overflow-hidden"
>
  ...
</div>
```

---

## 修复优先级和预估时间

### 高优先级（核心功能，影响大量测试）

| 文件                  | 修复内容                        | 预估时间 |
| --------------------- | ------------------------------- | -------- |
| `RoomCard.tsx`        | 添加 data-testid 和 aria-label  | 30 分钟  |
| `ParticipantList.tsx` | 添加完整 data-testid 属性       | 45 分钟  |
| `RoomSettings.tsx`    | 修改 tab 标签，添加 data-testid | 30 分钟  |
| `RoomManager.tsx`     | 添加 data-testid                | 20 分钟  |

**总计：** 约 2 小时

### 中优先级（提升测试稳定性）

| 文件                  | 修复内容                     | 预估时间 |
| --------------------- | ---------------------------- | -------- |
| `RoomCard.tsx`        | 优化按钮结构，添加 name 属性 | 20 分钟  |
| `ParticipantList.tsx` | 添加 aria-label 和 role 属性 | 15 分钟  |
| `RoomSettings.tsx`    | 表单控件添加 name 属性       | 15 分钟  |

**总计：** 约 50 分钟

### 低优先级（可选优化）

| 文件     | 修复内容                   | 预估时间 |
| -------- | -------------------------- | -------- |
| 测试文件 | 更新选择器使用 data-testid | 1 小时   |
| 测试文件 | 添加更多边界情况测试       | 1 小时   |

**总计：** 约 2 小时

---

## 测试文件更新建议

### 1. 更新选择器使用 data-testid

**旧代码：**

```typescript
const card = screen.getByText('测试房间').closest('div')
expect(card?.className).toMatch(/border-blue-500|border-blue-400/)
```

**新代码：**

```typescript
const card = screen.getByTestId('room-card')
expect(card).toHaveClass('border-blue-500', 'border-blue-400')
```

### 2. 使用更精确的查询

**旧代码：**

```typescript
const menuButton = screen.getByRole('button', { name: /操作/i })
```

**新代码：**

```typescript
const menuButton = screen.getByTestId('participant-menu-button')
// 或
const menuButton = screen.getByLabelText('更改角色')
```

### 3. 添加 data-testid 帮助函数

```typescript
// 创建 test-utils.ts
export const getByTestId = (testId: string) => {
  return screen.getByTestId(testId)
}

export const queryByTestId = (testId: string) => {
  return screen.queryByTestId(testId)
}

export const getAllByTestId = (testId: string) => {
  return screen.getAllByTestId(testId)
}
```

---

## 执行计划

### 阶段 1：核心修复（2 小时）

1. ✅ 修复 `RoomCard.tsx` - 添加 data-testid 和 aria-label
2. ✅ 修复 `ParticipantList.tsx` - 添加完整 data-testid
3. ✅ 修复 `RoomSettings.tsx` - 修改 tab 标签，添加 data-testid
4. ✅ 修复 `RoomManager.tsx` - 添加 data-testid

### 阶段 2：运行测试验证（30 分钟）

1. 运行所有测试：`npm test`
2. 记录失败的测试
3. 分析失败原因

### 阶段 3：补充修复（30 分钟）

1. 根据阶段 2 结果进行补充修复
2. 优化测试选择器

### 阶段 4：最终验证（15 分钟）

1. 再次运行所有测试
2. 确保通过率 > 90%

---

## 预期结果

修复后预期通过率：

- **修复前：** 21/97 (21.7%)
- **修复后：** 85+/97 (87%+)

剩余失败的测试可能涉及：

- 异步状态更新
- 事件处理逻辑
- 边界情况处理

这些需要单独分析代码逻辑进行修复。

---

## 注意事项

1. **向后兼容：** 添加 data-testid 和 aria-label 不会影响现有功能
2. **可访问性：** aria-label 的添加同时提升了组件的可访问性
3. **维护性：** data-testid 使测试更稳定，不易受 UI 文本变化影响
4. **文档：** 记录所有 data-testid 的命名约定

---

## 测试最佳实践建议

### DO ✅

- 使用 `data-testid` 而不是 CSS 类或文本内容
- 使用 `aria-label` 提供可访问性
- 使用语义化的 HTML（role 属性）
- 测试用户行为而不是实现细节
- 使用 waitFor 处理异步操作

### DON'T ❌

- 不要依赖 CSS 类名（容易变化）
- 不要依赖文本内容（可能国际化）
- 不要测试内部状态
- 不要过度测试第三方库
- 不要在测试中使用 setTimeout（使用 waitFor）
