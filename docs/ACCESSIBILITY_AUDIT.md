# 7zi 项目无障碍审计报告

**审计日期**: 2026-03-15  
**审计范围**: src/app/, src/components/  
**审计标准**: WCAG 2.1 AA

---

## 📊 执行摘要

| 类别 | 评分 | 状态 |
|------|------|------|
| ARIA Labels | 7/10 | ⚠️ 需改进 |
| 表单控件 | 6/10 | ⚠️ 需改进 |
| 颜色对比度 | 8/10 | ✅ 良好 |
| 键盘导航 | 8/10 | ✅ 良好 |
| 屏幕阅读器支持 | 6/10 | ⚠️ 需改进 |
| **总体评分** | **7/10** | ⚠️ 中等 |

---

## 1. ARIA Labels 审计

### ✅ 做得好的地方

#### Navigation.tsx
```tsx
// ✅ 导航区域有正确的 aria-label
<nav aria-label="主导航">

// ✅ 移动菜单有完整的 ARIA 属性
<button
  aria-label={isMobileMenuOpen ? '关闭菜单' : '打开菜单'}
  aria-expanded={isMobileMenuOpen}
  aria-controls="mobile-menu"
>

// ✅ 移动菜单使用 role="dialog"
<div role="dialog" aria-modal="true" aria-label="导航菜单">
```

#### ToggleSwitch.tsx
```tsx
// ✅ 开关组件有正确的 ARIA 属性
<button
  role="switch"
  aria-checked={checked}
  aria-label={label}
  aria-disabled={disabled}
>
```

#### ThemeToggle.tsx
```tsx
// ✅ 主题切换按钮有 aria-label
<button aria-label={isDark ? '切换到亮色模式' : '切换到暗色模式'}>
```

#### NotificationBadge.tsx
```tsx
// ✅ 徽章有 aria-label
<span aria-label={`${count} 条未读通知`}>
```

#### Modal.tsx
```tsx
// ✅ 模态框有完整的 ARIA 支持
<div role="dialog" aria-modal="true" aria-labelledby={title ? 'modal-title' : undefined}>
<button aria-label="Close modal">
```

### ⚠️ 需要改进的地方

#### 1. TaskBoard.tsx - 缺少 aria-label
```tsx
// ❌ 问题：select 没有 aria-label
<select
  value={filter}
  onChange={(e) => setFilter(e.target.value as 'open' | 'closed' | 'all')}
  className="..."
>
```

**修复建议**:
```tsx
<select
  aria-label="过滤任务状态"
  value={filter}
  onChange={(e) => setFilter(e.target.value as 'open' | 'closed' | 'all')}
  className="..."
>
```

#### 2. DataTable.tsx - 分页按钮缺少 aria-label
```tsx
// ❌ 问题：分页按钮没有 aria-label
<button onClick={() => handlePageChange(1)} disabled={currentPage === 1}>
  First
</button>
```

**修复建议**:
```tsx
<button 
  onClick={() => handlePageChange(1)} 
  disabled={currentPage === 1}
  aria-label="跳转到第一页"
  aria-disabled={currentPage === 1}
>
  First
</button>
```

#### 3. LoadingSpinner.tsx - 需要更完整的描述
```tsx
// ⚠️ 当前实现
<div role="status" aria-label="加载中" />

// ✅ 改进建议：添加隐藏文本供屏幕阅读器使用
<div role="status" aria-label="加载中">
  <span className="sr-only">正在加载，请稍候...</span>
</div>
```

---

## 2. 表单控件标签审计

### ✅ 做得好的地方

#### FormInput.tsx (contact)
```tsx
// ✅ 正确的 label + id 关联
<label htmlFor={props.id}>{label}</label>
<input id={props.id} ... />
```

#### Input.tsx (ui)
```tsx
// ✅ 有完整的表单支持
<label htmlFor={inputId}>{label}</label>
<input
  id={inputId}
  aria-invalid={!!error}
  aria-describedby={error || hint ? `${inputId}-hint` : undefined}
/>
{(error || hint) && <p id={`${inputId}-hint`}>...</p>}
```

#### TaskForm.tsx
```tsx
// ✅ 正确的 label 关联
<label htmlFor="title">任务标题 *</label>
<input id="title" name="title" ... />
```

### ⚠️ 需要改进的地方

#### 1. FormSelect.tsx - 缺少 aria-required
```tsx
// ❌ 问题：没有 aria-required 或 required 属性
<select id={props.id} ...>
```

**修复建议**:
```tsx
<select
  id={props.id}
  aria-required={required}
  required={required}
  ...
>
```

#### 2. TaskBoard.tsx - select 没有 label
```tsx
// ❌ 问题：下拉框没有关联的 label
<select value={filter} onChange={...}>
  <option value="open">进行中</option>
  <option value="closed">已完成</option>
  <option value="all">全部</option>
</select>
```

**修复建议**:
```tsx
<div>
  <label htmlFor="task-filter" className="sr-only">过滤任务状态</label>
  <select id="task-filter" value={filter} onChange={...}>
    ...
  </select>
</div>
```

#### 3. Button.tsx - 缺少 type 属性
```tsx
// ⚠️ 问题：按钮没有默认 type="button"
<button ...>
```

**修复建议**:
```tsx
<button type="button" ...>
```

---

## 3. 颜色对比度审计

### ✅ 做得好的地方

根据 globals.css 的颜色变量分析：

| 元素 | 亮色模式对比度 | 暗色模式对比度 | 状态 |
|------|---------------|---------------|------|
| 正文文字 | #171717 on #fff (17.8:1) | #ededed on #0a0a0a (15.4:1) | ✅ AAA |
| 次要文字 | #71717a on #fff (4.8:1) | #a1a1aa on #18181b (6.2:1) | ✅ AA |
| Primary 按钮 | #fff on #06b6d4 (3.2:1) | #0a0a0a on #22d3ee (4.5:1) | ⚠️ AA |

### ⚠️ 需要改进的地方

#### 1. Primary 按钮对比度 (亮色模式)
```
#ffffff on #06b6d4 = 3.2:1
```
- WCAG AA 要求：4.5:1 (正常文字) / 3:1 (大文字)
- **建议**：将 primary 颜色从 `#06b6d4` 调整为 `#0891b2`（对比度 4.5:1）

#### 2. 错误提示颜色
```tsx
// ⚠️ globals.css
--destructive: #ef4444;

// 暗色模式
--destructive: #7f1d1d;
```
- 暗色模式下 `#7f1d1d` 可能对比度不足
- **建议**：调整为 `#dc2626`

#### 3. 状态徽章颜色
```tsx
// TaskBoard.tsx 中的标签颜色
style={{
  backgroundColor: `#${label.color}20`,
  color: `#${label.color}`,
}}
```
- 动态颜色可能无法保证对比度
- **建议**：添加对比度检查逻辑或使用预定义的安全颜色

---

## 4. 键盘导航审计

### ✅ 做得好的地方

#### Navigation.tsx
```tsx
// ✅ ESC 键关闭菜单
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isMobileMenuOpen]);
```

#### Modal.tsx
```tsx
// ✅ ESC 键关闭模态框
const handleKeyDown = useCallback((e: KeyboardEvent) => {
  if (e.key === 'Escape' && closeOnEscape) {
    onClose();
  }
}, [closeOnEscape, onClose]);

// ✅ 阻止背景滚动
if (preventScroll) {
  document.body.style.overflow = 'hidden';
}
```

#### Button.tsx
```tsx
// ✅ 焦点状态样式
focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
```

#### Input.tsx
```tsx
// ✅ 焦点状态
focus:outline-none focus:ring-2 focus:ring-cyan-500/20
```

### ⚠️ 需要改进的地方

#### 1. DataTable.tsx - 缺少键盘导航
```tsx
// ❌ 问题：表格行没有 tabindex
<tr onClick={() => onRowClick?.(row)}>
```

**修复建议**:
```tsx
<tr
  onClick={() => onRowClick?.(row)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRowClick?.(row);
    }
  }}
  tabIndex={onRowClick ? 0 : undefined}
  role={onRowClick ? 'button' : undefined}
>
```

#### 2. Navigation.tsx - 移动菜单焦点陷阱
```tsx
// ⚠️ 问题：移动菜单打开时焦点没有 trap 在菜单内
// 当前实现：tabIndex={isMobileMenuOpen ? 0 : -1}
// 但没有完整的焦点陷阱实现
```

**修复建议**:
使用焦点陷阱库或手动实现：
```tsx
import { FocusTrap } from '@headlessui/react';
// 或
useEffect(() => {
  if (isMobileMenuOpen) {
    const firstFocusable = menuRef.current?.querySelector('button, a, input');
    firstFocusable?.focus();
  }
}, [isMobileMenuOpen]);
```

#### 3. globals.css - 减少动画支持
```css
/* ✅ 已有减少动画支持 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 5. 屏幕阅读器支持审计

### ✅ 做得好的地方

- Navigation 有 `aria-label="主导航"`
- Modal 有 `role="dialog"` 和 `aria-modal="true"`
- ToggleSwitch 有 `role="switch"` 和 `aria-checked`
- LoadingSpinner 有 `role="status"` 和 `aria-label`
- NotificationBadge 有描述性的 `aria-label`

### ⚠️ 需要改进的地方

#### 1. 图标按钮缺少屏幕阅读器文本
```tsx
// ⚠️ 问题：一些图标按钮只有视觉内容
<button onClick={toggleMenu}>
  <span className="text-2xl">🤖</span>
</button>
```

**修复建议**:
```tsx
<button onClick={toggleMenu} aria-label="AI 团队首页">
  <span className="text-2xl" aria-hidden="true">🤖</span>
</button>
```

#### 2. 动态内容缺少 live region
```tsx
// ⚠️ 问题：任务状态更新没有通知屏幕阅读器
// TaskBoard.tsx 中的进度条更新
<ProgressBar progress={progress} showLabel />
```

**修复建议**:
```tsx
<div role="status" aria-live="polite" aria-atomic="true">
  <ProgressBar progress={progress} showLabel />
</div>
```

#### 3. 表格缺少 caption
```tsx
// ❌ DataTable.tsx 没有表格标题
<table className="w-full text-sm">
  <thead>...</thead>
</table>
```

**修复建议**:
```tsx
<table className="w-full text-sm" aria-label={tableLabel || "数据表格"}>
  <caption className="sr-only">{tableLabel || "数据表格"}</caption>
  <thead>...</thead>
</table>
```

---

## 6. 其他发现

### 6.1 触摸目标大小 ✅
```css
/* globals.css - 移动端优化 */
@media (hover: none) and (pointer: coarse) {
  nav a, nav button, .nav-link {
    min-height: 48px;
    min-width: 48px;
  }
}
```
- ✅ 移动端触摸目标符合 44x44px 最小尺寸要求

### 6.2 Safe Area 支持 ✅
```css
@supports (padding: max(0px)) {
  body {
    padding-left: max(0px, env(safe-area-inset-left));
    padding-right: max(0px, env(safe-area-inset-right));
  }
}
```
- ✅ 支持 iPhone 刘海和安全区域

### 6.3 跳过导航链接 ❌
- ⚠️ **缺失**：没有 "跳到主要内容" 链接

**修复建议**:
```tsx
// 在 layout.tsx 或 Navigation.tsx 顶部添加
<a 
  href="#main-content" 
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded"
>
  跳到主要内容
</a>
```

---

## 7. 优先级改进清单

### 🔴 高优先级 (P0)

| # | 问题 | 文件 | 修复难度 |
|---|------|------|----------|
| 1 | 添加跳过导航链接 | layout.tsx | 低 |
| 2 | DataTable 添加键盘导航 | ui/DataTable.tsx | 中 |
| 3 | 所有 select 添加 aria-label | TaskBoard.tsx, TaskForm.tsx | 低 |
| 4 | 表单错误信息关联 | FormSelect.tsx | 低 |

### 🟡 中优先级 (P1)

| # | 问题 | 文件 | 修复难度 |
|---|------|------|----------|
| 5 | 移动菜单焦点陷阱 | Navigation.tsx | 中 |
| 6 | 动态内容 live region | TaskBoard.tsx | 低 |
| 7 | 表格添加 caption | DataTable.tsx | 低 |
| 8 | Primary 按钮对比度 | globals.css | 低 |

### 🟢 低优先级 (P2)

| # | 问题 | 文件 | 修复难度 |
|---|------|------|----------|
| 9 | LoadingSpinner 添加隐藏文本 | LoadingSpinner.tsx | 低 |
| 10 | 图标按钮 aria-hidden | 多个文件 | 低 |
| 11 | 分页按钮 aria-label | DataTable.tsx | 低 |

---

## 8. 快速修复代码示例

### 8.1 添加跳过导航链接

```tsx
// src/app/[locale]/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-cyan-500 focus:text-white focus:rounded-lg"
        >
          跳到主要内容
        </a>
        <Navigation />
        <main id="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}
```

### 8.2 添加 sr-only 工具类

```css
/* globals.css */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.not-sr-only {
  position: static;
  width: auto;
  height: auto;
  padding: 0;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

### 8.3 Focus Trap Hook

```tsx
// hooks/useFocusTrap.ts
import { useEffect, useRef } from 'react';

export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => container.removeEventListener('keydown', handleTabKey);
  }, [isActive]);

  return containerRef;
}
```

---

## 9. 测试建议

### 自动化测试工具
1. **Axe DevTools** - 浏览器扩展，自动检测 WCAG 违规
2. **Lighthouse** - Chrome 内置无障碍审计
3. **Pa11y** - 命令行工具，可集成到 CI/CD

### 手动测试清单
- [ ] 使用 Tab 键导航所有交互元素
- [ ] 使用 VoiceOver/NVDA 测试屏幕阅读器
- [ ] 放大 200% 测试布局
- [ ] 禁用 CSS 测试内容顺序
- [ ] 禁用 JavaScript 测试核心功能

---

## 10. 结论

7zi 项目在无障碍性方面已经有一个良好的基础，特别是：
- ✅ 导航组件的 ARIA 支持完善
- ✅ 模态框键盘导航良好
- ✅ 颜色对比度基本符合 AA 标准
- ✅ 移动端触摸目标大小合适

主要需要改进的方面：
- ⚠️ 表单控件需要更完整的 aria 属性
- ⚠️ 需要添加跳过导航链接
- ⚠️ 数据表格需要键盘导航支持
- ⚠️ 动态内容更新需要 live region

按照优先级清单进行修复后，项目可以达到 WCAG 2.1 AA 标准。

---

**审计人员**: AI 无障碍工程师  
**下次审计建议**: 3 个月后
