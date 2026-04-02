# UI 一致性设计规范指南

**项目**: 7zi-frontend v1.8.0
**创建日期**: 2026-04-02
**创建者**: 🎨 设计师子代理
**状态**: 审查完成

---

## 📋 目录

1. [执行摘要](#执行摘要)
2. [发现的问题清单](#发现的问题清单)
3. [颜色系统规范](#颜色系统规范)
4. [间距系统规范](#间距系统规范)
5. [字体系统规范](#字体系统规范)
6. [组件样式规范](#组件样式规范)
7. [暗色模式规范](#暗色模式规范)
8. [修复优先级计划](#修复优先级计划)
9. [代码修改建议](#代码修改建议)

---

## 执行摘要

本次 UI 一致性审查覆盖了 7zi-frontend 项目的所有核心 React 组件和样式文件。共发现 **23 个具体问题**，按严重程度分类：

| 严重程度 | 数量 | 说明 |
|----------|------|------|
| 🔴 高 | 6 | 影响用户体验或功能 |
| 🟡 中 | 10 | 影响一致性或可维护性 |
| 🟢 低 | 7 | 优化建议 |

**整体评分**: 7.2/10

**主要发现**:
- ✅ 设计 Token 系统完整且定义清晰
- ✅ 组件功能丰富，交互体验好
- ⚠️ 暗色模式颜色设置有误
- ⚠️ 部分组件未使用设计 Token
- ⚠️ 国际化集成不完整

---

## 发现的问题清单

### 🔴 高优先级问题

#### 1. 暗色模式颜色设置错误

**文件**: `src/app/globals.css:35-38`

**问题代码**:
```css
/* ❌ 错误：暗色模式下使用了错误的颜色变量 */
.dark body {
  color: var(--color-gray-900);  /* 应该是最亮的文本色 */
  background-color: var(--color-gray-50);  /* 应该是最深的背景色 */
}
```

**影响**: 暗色模式下文本颜色和背景颜色互换，导致可读性问题。

**修复后代码**:
```css
/* ✅ 正确：暗色模式下使用正确的颜色 */
.dark body {
  color: var(--color-gray-800);  /* 亮色文本 */
  background-color: var(--color-gray-50);  /* 深色背景 (tokens.css 中定义为 #0f172a) */
}
```

---

#### 2. 全局过渡动画应用于所有元素

**文件**: `src/app/globals.css:14-19`

**问题代码**:
```css
/* ❌ 问题：所有元素都应用过渡，影响性能 */
* {
  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease;
}
```

**影响**: 可能导致滚动和交互性能下降。

**修复后代码**:
```css
/* ✅ 修复：仅在需要的元素上应用过渡 */
body,
button,
input,
a,
[role="button"],
.card,
.modal {
  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease;
}
```

---

#### 3. Modal 组件未使用设计 Token

**文件**: `src/components/ui/Modal.tsx:80-85`

**问题代码**:
```css
/* ❌ 使用硬编码颜色值 */
className="... bg-white rounded-lg shadow-2xl ..."
className="... border-b border-gray-200 ..."
className="... bg-gray-50 ..."
```

**影响**: 样式不一致，暗色模式支持不完整。

**修复后代码**:
```tsx
// ✅ 使用 Tailwind 的 dark: 前缀支持暗色模式
className={clsx(
  "relative w-full rounded-lg shadow-2xl",
  "bg-white dark:bg-gray-800",
  "transform transition-all duration-300",
  // ...
)}
```

---

#### 4. Pricing 页面未集成 i18n 系统

**文件**: `src/app/pricing/page.tsx:40-90`

**问题**: 页面自管理翻译对象，未使用项目的 i18n 系统。

**影响**: 翻译不一致，维护困难。

**修复建议**:
1. 创建 `src/locales/en/pricing.json` 和 `src/locales/zh/pricing.json`
2. 重构页面使用 `useTranslation('pricing')` 钩子

---

#### 5. 组件目录结构存在冗余

**文件**: `src/shared/components/ui/` 目录

**问题**: 存在与 `src/components/ui/` 功能重复的组件。

**影响**: 维护成本增加，组件版本不一致。

**修复建议**: 删除 `src/shared/components/ui/` 目录，统一使用 `src/components/ui/`。

---

#### 6. Button 组件涟漪效果可能导致内存泄漏

**文件**: `src/components/ui/Button.tsx:58-65`

**问题代码**:
```tsx
// ❌ 未清理 timeout
const cleanupRipples = useCallback(() => {
  if (rippleTimeoutRef.current) {
    clearTimeout(rippleTimeoutRef.current);
  }
  rippleTimeoutRef.current = setTimeout(() => {
    setRipples([]);
  }, 600);
}, []);
```

**修复后代码**:
```tsx
// ✅ 添加 useEffect 清理
useEffect(() => {
  return () => {
    if (rippleTimeoutRef.current) {
      clearTimeout(rippleTimeoutRef.current);
    }
  };
}, []);
```

---

### 🟡 中优先级问题

#### 7. 卡片圆角不一致

**文件**: `src/components/ui/Card.tsx:45`

**问题描述**: Card 使用 `rounded-lg`，而其他组件可能使用 `rounded-xl`。

**建议**: 统一使用 `rounded-xl` 或在 tokens.css 中定义组件级圆角变量。

---

#### 8. 房间卡片时间格式硬编码

**文件**: `src/components/rooms/RoomCard.tsx:65-75`

**问题代码**:
```tsx
// ❌ 硬编码中文时间格式
if (days > 0) return `${days}天前`;
if (hours > 0) return `${hours}小时前`;
if (minutes > 0) return `${minutes}分钟前`;
return "刚刚";
```

**修复建议**: 使用 i18n 系统或日期格式化库（如 date-fns）。

---

#### 9. Input 组件验证图标动画类名错误

**文件**: `src/components/ui/Input.tsx:101-113`

**问题代码**:
```tsx
// ❌ Tailwind 不支持 animate-in, fade-in, zoom-in
className="h-5 w-5 text-green-500 animate-in fade-in zoom-in duration-200"
```

**修复建议**: 使用 Tailwind 的 `animate-pulse` 或自定义动画。

---

#### 10. 首页链接样式不一致

**文件**: `src/app/page.tsx:52-75`

**问题描述**: 首页使用了内联样式和 Tailwind 类混合，与其他页面风格不一致。

**建议**: 提取为统一的卡片链接组件。

---

#### 11. 容器类使用不一致

**问题描述**: 部分页面使用 `container mx-auto`，部分使用 `max-w-7xl mx-auto`。

**建议**: 统一使用以下模式：
```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
```

---

#### 12. 间距值不一致

**问题描述**: 页面间使用 `py-8`、`py-12`、`py-16` 等不同间距值。

**建议**: 定义统一的页面间距 token：
```css
:root {
  --page-padding-y: 2rem; /* py-8 */
  --section-padding-y: 4rem; /* py-16 */
}
```

---

#### 13. 颜色透明度语法问题

**文件**: `src/styles/tokens.css:38-52`

**问题描述**: 定义了 `--color-blue-900-30` 等变量以支持暗色模式透明度。

**建议**: Tailwind v4 支持直接使用 `dark:bg-blue-900/30` 语法，可移除这些变量。

---

#### 14. 动画定义重复

**问题描述**: `globals.css` 和 `onboarding.css` 都定义了 `fadeIn`、`slideIn` 动画。

**建议**: 统一在 `src/styles/animations.css` 中定义所有动画。

---

#### 15. 缺少 pricing.json 翻译文件

**问题描述**: 定价页面翻译未集成到 i18n 系统。

**建议**: 创建 `src/locales/zh/pricing.json` 和 `src/locales/en/pricing.json`。

---

#### 16. 按钮 loading 状态样式可改进

**文件**: `src/components/ui/Button.tsx:82`

**问题描述**: loading 状态使用 `opacity-75`，建议使用更明显的视觉反馈。

**建议**:
```tsx
loading && "opacity-70 cursor-wait pointer-events-none"
```

---

### 🟢 低优先级问题

#### 17. 骨架屏动画可优化

**建议**: 使用 CSS 变量定义骨架屏渐变颜色，支持暗色模式。

---

#### 18. 空状态图标可统一

**建议**: 创建统一的 EmptyState 图标库。

---

#### 19. 表单错误提示可增强

**建议**: 添加表单验证的 ARIA 属性和错误提示动画。

---

#### 20. 响应式断点可文档化

**建议**: 在设计规范中明确各断点的使用场景。

---

#### 21. 图标使用可标准化

**建议**: 统一使用 Lucide 图标库，避免混用多种图标库。

---

#### 22. 可访问性属性可完善

**建议**: 为所有交互组件添加完整的 ARIA 属性。

---

#### 23. CSS 变量命名可优化

**建议**: 统一使用 kebab-case 命名 CSS 变量。

---

## 颜色系统规范

### 主色调 (Primary)

| Token | 值 | 用途 |
|-------|-----|------|
| `--color-primary-50` | `#eff6ff` | 浅背景 |
| `--color-primary-500` | `#3b82f6` | 主按钮、链接 |
| `--color-primary-600` | `#2563eb` | 悬停状态 |
| `--color-primary-700` | `#1d4ed8` | 激活状态 |

### 语义色

| 类型 | Token | 值 | 用途 |
|------|-------|-----|------|
| 成功 | `--color-success-500` | `#22c55e` | 成功提示 |
| 警告 | `--color-warning-500` | `#f59e0b` | 警告提示 |
| 错误 | `--color-error-500` | `#ef4444` | 错误提示 |
| 信息 | `--color-info-500` | `#3b82f6` | 信息提示 |

### 使用规范

```tsx
// ✅ 推荐：使用 Tailwind 类
<button className="bg-blue-600 hover:bg-blue-700 text-white">

// ✅ 也可以：使用 CSS 变量
<button className="bg-[var(--color-primary-600)]">

// ❌ 避免：硬编码颜色
<button className="bg-[#2563eb]">
```

---

## 间距系统规范

### 基础间距

| Token | 值 | Tailwind 类 |
|-------|-----|-------------|
| `--spacing-1` | 4px | `p-1`, `m-1` |
| `--spacing-2` | 8px | `p-2`, `m-2` |
| `--spacing-3` | 12px | `p-3`, `m-3` |
| `--spacing-4` | 16px | `p-4`, `m-4` |
| `--spacing-6` | 24px | `p-6`, `m-6` |
| `--spacing-8` | 32px | `p-8`, `m-8` |

### 页面级间距

```tsx
// 页面容器
<div className="py-8 px-4 sm:px-6 lg:px-8">

// 区块间距
<section className="py-12">

// 卡片内边距
<div className="p-6">
```

---

## 字体系统规范

### 字体族

```css
--font-family-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-family-mono: "JetBrains Mono", "Fira Code", "Consolas", monospace;
```

### 字体大小

| Token | 值 | Tailwind 类 | 用途 |
|-------|-----|-------------|------|
| `--font-size-xs` | 12px | `text-xs` | 辅助文本 |
| `--font-size-sm` | 14px | `text-sm` | 正文、标签 |
| `--font-size-base` | 16px | `text-base` | 正文 |
| `--font-size-lg` | 18px | `text-lg` | 副标题 |
| `--font-size-xl` | 20px | `text-xl` | 标题 |
| `--font-size-2xl` | 24px | `text-2xl` | 大标题 |
| `--font-size-3xl` | 30px | `text-3xl` | 页面标题 |

### 字重

```tsx
// 正文
<p className="font-normal">

// 强调
<strong className="font-medium">

// 标题
<h1 className="font-semibold">

// 重要标题
<h1 className="font-bold">
```

---

## 组件样式规范

### Button 组件

```tsx
// 主要按钮
<Button variant="primary" size="md">提交</Button>

// 次要按钮
<Button variant="secondary">取消</Button>

// 危险按钮
<Button variant="danger">删除</Button>

// 图标按钮
<IconButton icon={<Plus />} aria-label="添加" />
```

### Card 组件

```tsx
<Card shadow="md" hoverable>
  <CardHeader>标题</CardHeader>
  <CardBody>内容</CardBody>
  <CardFooter>操作</CardFooter>
</Card>
```

### Modal 组件

```tsx
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="确认操作"
  size="md"
>
  内容
</Modal>
```

---

## 暗色模式规范

### 实现方式

使用 Tailwind 的 `dark:` 前缀：

```tsx
// ✅ 推荐
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">

// ✅ 使用 CSS 变量
<div className="bg-[var(--color-gray-50)] text-[var(--color-gray-900)]">
```

### 颜色映射

| 亮色模式 | 暗色模式 |
|----------|----------|
| `bg-white` | `dark:bg-gray-800` |
| `bg-gray-50` | `dark:bg-gray-900` |
| `text-gray-900` | `dark:text-white` |
| `text-gray-600` | `dark:text-gray-400` |
| `border-gray-200` | `dark:border-gray-700` |

---

## 修复优先级计划

### 第1阶段（紧急）- 1-2 天

| 任务 | 文件 | 预估时间 |
|------|------|----------|
| 修复暗色模式颜色设置 | `globals.css` | 15 分钟 |
| 修复全局过渡动画 | `globals.css` | 15 分钟 |
| 修复 Modal 暗色模式支持 | `Modal.tsx` | 30 分钟 |
| 修复 Button 内存泄漏 | `Button.tsx` | 15 分钟 |

### 第2阶段（重要）- 3-5 天

| 任务 | 文件 | 预估时间 |
|------|------|----------|
| 重构 Pricing 页面使用 i18n | `pricing/page.tsx` | 2 小时 |
| 创建缺失的翻译文件 | `locales/` | 1 小时 |
| 统一容器和间距规范 | 所有页面 | 2 小时 |
| 修复房间卡片时间格式 | `RoomCard.tsx` | 30 分钟 |

### 第3阶段（优化）- 1-2 周

| 任务 | 文件 | 预估时间 |
|------|------|----------|
| 整合动画定义 | `animations.css` | 1 小时 |
| 完善可访问性属性 | 所有组件 | 4 小时 |
| 优化骨架屏和空状态 | 多文件 | 2 小时 |
| 文档化响应式断点 | 文档 | 1 小时 |

---

## 代码修改建议

### 修复 1: globals.css 暗色模式

```css
/* src/app/globals.css */

/* 修改前 */
.dark body {
  color: var(--color-gray-900);
  background-color: var(--color-gray-50);
}

/* 修改后 */
.dark body {
  color: var(--color-gray-800);
  background-color: var(--color-gray-50);
}
```

### 修复 2: globals.css 过渡动画

```css
/* src/app/globals.css */

/* 修改前 */
* {
  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease;
}

/* 修改后 */
body,
button,
input,
a,
[role="button"],
.card,
.modal,
.btn {
  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease;
}
```

### 修复 3: Modal.tsx 暗色模式

```tsx
// src/components/ui/Modal.tsx

// 修改后的 Modal 组件
<div
  ref={modalRef}
  className={clsx(
    "relative w-full rounded-lg shadow-2xl",
    "bg-white dark:bg-gray-800",
    "transform transition-all duration-300",
    isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0",
    sizeStyles[size],
    className,
  )}
  // ...
>
  {/* 头部 */}
  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
    {title && (
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        {title}
      </h2>
    )}
    {/* ... */}
  </div>

  {/* 内容 */}
  <div className="px-6 py-4">{children}</div>

  {/* 页脚 */}
  {footer && (
    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg">
      {footer}
    </div>
  )}
</div>
```

### 修复 4: Button.tsx 内存泄漏

```tsx
// src/components/ui/Button.tsx

// 添加 useEffect 清理
useEffect(() => {
  return () => {
    if (rippleTimeoutRef.current) {
      clearTimeout(rippleTimeoutRef.current);
    }
  };
}, []);
```

### 修复 5: RoomCard.tsx 国际化

```tsx
// src/components/rooms/RoomCard.tsx

// 修改前
const formatLastActivity = useMemo(() => {
  const minutes = Math.floor(diff / 60000);
  if (days > 0) return `${days}天前`;
  // ...
}, [room.lastActivityAt]);

// 修改后
import { useTranslation } from 'react-i18next';

const { t } = useTranslation('rooms');

const formatLastActivity = useMemo(() => {
  const minutes = Math.floor(diff / 60000);
  if (days > 0) return t('time.daysAgo', { count: days });
  if (hours > 0) return t('time.hoursAgo', { count: hours });
  if (minutes > 0) return t('time.minutesAgo', { count: minutes });
  return t('time.justNow');
}, [room.lastActivityAt, t]);
```

### 新增: locales/zh/rooms.json

```json
{
  "time": {
    "daysAgo": "{{count}}天前",
    "hoursAgo": "{{count}}小时前",
    "minutesAgo": "{{count}}分钟前",
    "justNow": "刚刚"
  }
}
```

---

## 附录: 组件清单

### 核心组件

| 组件 | 路径 | 状态 |
|------|------|------|
| Button | `src/components/ui/Button.tsx` | ✅ 良好 |
| Card | `src/components/ui/Card.tsx` | ✅ 良好 |
| Input | `src/components/ui/Input.tsx` | ⚠️ 需修复动画 |
| Modal | `src/components/ui/Modal.tsx` | ⚠️ 需修复暗色模式 |
| Loading | `src/components/ui/Loading.tsx` | ✅ 良好 |
| Skeleton | `src/components/ui/Skeleton.tsx` | ✅ 良好 |
| EmptyState | `src/components/ui/EmptyState.tsx` | ✅ 良好 |

### 业务组件

| 组件 | 路径 | 状态 |
|------|------|------|
| RoomCard | `src/components/rooms/RoomCard.tsx` | ⚠️ 需国际化 |
| RoomPanel | `src/components/rooms/RoomPanel.tsx` | ✅ 良好 |
| TaskCard | `src/components/ui/TaskCard.tsx` | ✅ 良好 |
| Navigation | `src/components/ui/Navigation.tsx` | ✅ 良好 |

---

## 总结

7zi-frontend 项目的 UI 基础架构良好，设计 Token 系统完整。主要需要解决的问题是：

1. **暗色模式颜色设置错误** - 高优先级，影响用户体验
2. **全局过渡动画性能问题** - 中优先级，影响性能
3. **国际化集成不完整** - 中优先级，影响可维护性

预计完成所有修复需要 **1-2 周** 时间。建议按优先级逐步推进，先解决高优先级问题，再进行优化改进。

---

**文档版本**: 1.0.0
**最后更新**: 2026-04-02
**下次审查**: v1.8.0 发布前
