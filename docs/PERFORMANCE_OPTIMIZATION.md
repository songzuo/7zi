# React 组件性能优化文档

## 概述

本文档记录了 AI 团队项目中 React 组件的性能优化措施。优化主要围绕以下核心原则：

1. **避免不必要的重渲染** - 使用 `React.memo` 包装组件
2. **稳定 props 引用** - 使用 `useCallback` 和 `useMemo` 缓存函数和对象
3. **提取配置常量** - 将静态配置移到组件外部
4. **子组件分离** - 将大型组件拆分为小型、可 memo 的子组件

---

## 已优化组件列表

### 1. ProgressBar.tsx

**优化前问题:**

- 缺少 `React.memo` 包装
- 每次渲染重新创建 `sizeClasses` 和 `colorClasses` 对象
- 缺少 `useMemo` 缓存计算结果

**优化措施:**

- 使用 `memo` 包装 `ProgressBar`、`CircularProgress`、`MultiProgressBar` 组件
- 将 `SIZE_CLASSES` 和 `COLOR_CLASSES` 配置移到模块级别
- 使用 `useMemo` 缓存 `percentage`、`strokeDashoffset` 等计算结果

```tsx
// 优化后
const ProgressBar = memo(function ProgressBar({ ... }) {
  const percentage = useMemo(
    () => Math.min(Math.max((value / max) * 100, 0), 100),
    [value, max]
  );
  // ...
});
```

---

### 2. ThemeToggle.tsx

**优化前问题:**

- 缺少 `React.memo` 包装
- 每次渲染重新创建 `THEME_OPTIONS` 数组
- 主题选项渲染使用内联函数
- 缺少 `useMemo` 缓存

**优化措施:**

- 使用 `memo` 包装整个组件
- 将 `THEME_OPTIONS` 和 `SIZE_CLASSES` 移到模块级别
- 提取 `ThemeOptionButton` 子组件并使用 `memo`
- 使用 `useCallback` 缓存事件处理函数
- 使用 `useMemo` 缓存 `currentThemeOption`

```tsx
// 子组件提取
const ThemeOptionButton = memo(function ThemeOptionButton({ option, isSelected, onSelect }) {
  const handleClick = useCallback(() => {
    onSelect(option.value)
  }, [option.value, onSelect])
  // ...
})
```

---

### 3. LanguageSwitcher.tsx

**优化前问题:**

- 缺少 `React.memo` 包装
- 每次渲染重新创建 `sizeClasses` 和 `iconSizes` 对象
- `getCurrentLocale` 函数在每次渲染时重新定义
- 语言选项渲染使用内联函数

**优化措施:**

- 使用 `memo` 包装整个组件
- 将 `SIZE_CLASSES` 和 `ICON_SIZES` 移到模块级别
- 提取 `LanguageOption` 子组件并使用 `memo`
- 使用 `useMemo` 缓存 `currentLocale`
- 使用 `useCallback` 缓存 `changeLocale` 和 `toggleDropdown`

```tsx
// 子组件提取
const LanguageOption = memo(function LanguageOption({ locale, isCurrent, onSelect }) {
  const handleClick = useCallback(() => {
    onSelect(locale)
  }, [locale, onSelect])
  // ...
})
```

---

### 4. Loading.tsx

**优化前问题:**

- `LoadingPage`、`LoadingContent`、`LoadingWithProgress` 缺少 `memo`
- 条件渲染逻辑在每次渲染时重新计算
- 缺少 `useMemo` 缓存

**优化措施:**

- 使用 `memo` 包装所有三个导出组件
- 使用 `useMemo` 缓存渲染内容
- 减少不必要的条件判断

```tsx
export const LoadingPage = memo(function LoadingPage({
  message = '加载中...',
  showSpinner = true,
}) {
  const content = useMemo(() => {
    if (showSpinner) { ... }
    return ( ... );
  }, [showSpinner, message]);
  // ...
});
```

---

## 之前已优化的组件

以下组件在之前的优化中已经应用了性能优化措施：

| 组件                           | 优化措施                                   |
| ------------------------------ | ------------------------------------------ |
| ActivityLog.tsx                | memo, useCallback, useMemo                 |
| BatchOperationsToolbar.tsx     | memo, useRef 稳定回调, 常量外部化          |
| ContributionChart.tsx          | memo, useMemo, 子组件分离                  |
| ErrorBoundary.tsx              | 类组件 (无需 memo)                         |
| FeedbackSystem.tsx             | memo, useCallback, useMemo                 |
| MemberCard.tsx                 | memo, 自定义比较函数, useCallback          |
| Navigation.tsx                 | memo, useCallback, 子组件分离              |
| NotificationToast.tsx          | memo, useCallback, useRef                  |
| ProfilePage.tsx                | memo, useCallback, useMemo, 子组件分离     |
| RealtimeChart.tsx              | memo, useMemo, 常量外部化                  |
| RealtimeCollaborationPanel.tsx | memo, useCallback, useMemo                 |
| TaskBoard.tsx                  | memo, useCallback, useMemo, 自定义比较函数 |
| ThemeCustomizer.tsx            | memo, useCallback, useMemo                 |
| Rating.tsx                     | memo, useCallback                          |

---

## 性能优化最佳实践

### 1. React.memo 使用

```tsx
// 推荐：命名函数便于调试
const MyComponent = memo(function MyComponent({ data }) {
  return <div>{data}</div>
})

// 推荐：自定义比较函数
const ExpensiveComponent = memo(
  function ExpensiveComponent({ item }) {
    return <div>{item.name}</div>
  },
  (prevProps, nextProps) => {
    return prevProps.item.id === nextProps.item.id
  }
)
```

### 2. useCallback 使用

```tsx
// 推荐：缓存事件处理函数
const handleClick = useCallback((id: string) => {
  setSelected(id)
}, [])

// 推荐：依赖项完整
const handleSubmit = useCallback(
  (data: FormData) => {
    submitForm(data, userId)
  },
  [userId]
)
```

### 3. useMemo 使用

```tsx
// 推荐：缓存计算结果
const sortedData = useMemo(() => [...data].sort((a, b) => a.name.localeCompare(b.name)), [data])

// 推荐：缓存对象/数组
const config = useMemo(
  () => ({
    enabled: isEnabled,
    timeout: 5000,
  }),
  [isEnabled]
)
```

### 4. 常量外部化

```tsx
// 推荐：移到组件外部
const SIZE_CLASSES = {
  sm: 'p-2 text-sm',
  md: 'p-3 text-base',
  lg: 'p-4 text-lg',
} as const

const MyComponent = memo(function MyComponent({ size }) {
  return <div className={SIZE_CLASSES[size]}>...</div>
})
```

### 5. 子组件分离

```tsx
// 推荐：分离并 memo 化
const ItemRow = memo(function ItemRow({ item, onSelect }) {
  return (
    <tr onClick={() => onSelect(item.id)}>
      <td>{item.name}</td>
    </tr>
  )
})

const ItemList = memo(function ItemList({ items }) {
  return (
    <table>
      {items.map(item => (
        <ItemRow key={item.id} item={item} onSelect={handleSelect} />
      ))}
    </table>
  )
})
```

---

## 性能监控

建议使用 React DevTools Profiler 监控组件渲染性能：

1. 打开 Chrome DevTools
2. 切换到 Profiler 标签
3. 点击录制按钮
4. 执行用户操作
5. 分析火焰图找出重渲染热点

### 关键指标

- **Render time**: 组件渲染耗时
- **Render count**: 组件渲染次数
- **Why did this render?**: 渲染原因分析

---

## 更新日志

### 2024-03-07

- 优化 ProgressBar.tsx：添加 memo, useMemo
- 优化 ThemeToggle.tsx：添加 memo, useCallback, 子组件分离
- 优化 LanguageSwitcher.tsx：添加 memo, useMemo, 子组件分离
- 优化 Loading.tsx：添加 memo, useMemo
- 创建性能优化文档

### 之前优化

- 优化核心组件：ActivityLog, BatchOperationsToolbar, ContributionChart 等
- 优化 UI 组件：Navigation, NotificationToast, Rating 等
- 优化业务组件：TaskBoard, ProfilePage, ThemeCustomizer 等
