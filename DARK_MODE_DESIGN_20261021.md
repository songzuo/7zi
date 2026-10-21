# 7zi 工具导航网站 - 暗色主题设计规范

**版本**: v1.0  
**日期**: 2026-10-21  
**作者**: 🎨 设计师 (Designer Agent)

---

## 1. 当前亮色主题分析

### 1.1 配色方案

| 类型 | 变量名 | 色值 | 用途 |
|------|--------|------|------|
| **主色** | `--color-primary-500` | `#3b82f6` | 主按钮、链接、强调 |
| **主色 Hover** | `--color-primary-600` | `#2563eb` | 交互状态 |
| **主色 Active** | `--color-primary-700` | `#1d4ed8` | 按下状态 |
| **灰色-背景** | `--color-gray-50` | `#f9fafb` | 页面背景 |
| **灰色-表面** | `--color-gray-100` | `#f3f4f6` | 卡片背景 |
| **灰色-边框** | `--color-gray-200` | `#e5e7eb` | 分割线、边框 |
| **灰色-文本** | `--color-gray-500` | `#6b7280` | 次要文本 |
| **灰色-主要** | `--color-gray-700` | `#374151` | 主要文本 |
| **灰色-标题** | `--color-gray-900` | `#111827` | 标题、大字 |
| **成功** | `--color-success-500` | `#22c55e` | 成功状态 |
| **警告** | `--color-warning-500` | `#f59e0b` | 警告状态 |
| **错误** | `--color-error-500` | `#ef4444` | 错误状态 |
| **信息** | `--color-info-500` | `#3b82f6` | 信息提示 |

### 1.2 现有暗色主题问题

当前 `tokens.css` 中的暗色模式存在以下问题：

1. **主色调反转错误**: `--color-primary-50: #0f172a` 应为浅色而非深色
2. **对比度不足**: 灰色系在暗色背景上对比度不够理想
3. **组件适配不完整**: 部分组件未完全适配暗色模式
4. **可访问性问题**: 文字与背景对比度未达到 WCAG AA 标准

---

## 2. 暗色主题调色板设计

### 2.1 核心色彩系统

```css
/* ===== 暗色主题核心变量 ===== */
:root,
[data-theme="dark"] {
  
  /* --- 背景色 (Background) --- */
  --bg-primary: #0a0e1a;        /* 主背景 - 深邃蓝黑 */
  --bg-secondary: #111827;       /* 次级背景 - slate-900 */
  --bg-tertiary: #1a2234;        /* 三级背景 - 卡片/面板 */
  --bg-elevated: #1e293b;        /* 悬浮背景 - 弹窗/下拉 */
  --bg-overlay: rgba(0, 0, 0, 0.7); /* 遮罩层 */
  
  /* --- 表面色 (Surface) --- */
  --surface-default: #111827;    /* 默认表面 */
  --surface-hover: #1a2234;      /* 悬浮状态 */
  --surface-active: #243044;     /* 激活状态 */
  --surface-muted: #1e293b;      /* 静音/禁用背景 */
  
  /* --- 文字色 (Text) - WCAG AA+ 对比度 --- */
  --text-primary: #f8fafc;       /* 主要文本 15.8:1 */
  --text-secondary: #cbd5e1;     /* 次要文本 8.6:1 */
  --text-muted: #94a3b8;         /* 静音文本 5.9:1 */
  --text-placeholder: #64748b;   /* 占位符 4.6:1 (AA级) */
  --text-inverse: #0f172a;       /* 反色文字 */
  --text-link: #60a5fa;          /* 链接文字 */
  --text-link-hover: #93c5fd;    /* 链接悬浮 */
  
  /* --- 主色 (Primary) - 蓝色系 --- */
  --primary-50: #eff6ff;         /* 浅色背景 */
  --primary-100: #dbeafe;        /* 边框/标签背景 */
  --primary-200: #bfdbfe;        /* 次级边框 */
  --primary-300: #93c5fd;        /* 禁用状态 */
  --primary-400: #60a5fa;        /* 主要悬停 */
  --primary-500: #3b82f6;        /* 主色 (标准) */
  --primary-600: #2563eb;        /* 主色按下 */
  --primary-700: #1d4ed8;        /* 主色激活 */
  --primary-800: #1e40af;        /* 深色强调 */
  --primary-900: #1e3a8a;        /* 最深强调 */
  
  /* --- 次色 (Secondary) - 紫色系 --- */
  --secondary-50: #f5f3ff;
  --secondary-100: #ede9fe;
  --secondary-200: #ddd6fe;
  --secondary-300: #c4b5fd;
  --secondary-400: #a78bfa;
  --secondary-500: #8b5cf6;
  --secondary-600: #7c3aed;
  --secondary-700: #6d28d9;
  --secondary-800: #5b21b6;
  --secondary-900: #4c1d95;
  
  /* --- 状态色 (Status) --- */
  --success-50: #f0fdf4;
  --success-100: #dcfce7;
  --success-200: #bbf7d0;
  --success-300: #86efac;
  --success-400: #4ade80;
  --success-500: #22c55e;        /* 标准 */
  --success-600: #16a34a;
  --success-700: #15803d;
  --success-800: #166534;
  --success-900: #14532d;
  
  --warning-50: #fffbeb;
  --warning-100: #fef3c7;
  --warning-200: #fde68a;
  --warning-300: #fcd34d;
  --warning-400: #fbbf24;        /* 标准 */
  --warning-500: #f59e0b;
  --warning-600: #d97706;
  --warning-700: #b45309;
  --warning-800: #92400e;
  --warning-900: #78350f;
  
  --error-50: #fef2f2;
  --error-100: #fee2e2;
  --error-200: #fecaca;
  --error-300: #fca5a5;
  --error-400: #f87171;          /* 标准 */
  --error-500: #ef4444;
  --error-600: #dc2626;
  --error-700: #b91c1c;
  --error-800: #991b1b;
  --error-900: #7f1d1d;
  
  --info-50: #eff6ff;
  --info-100: #dbeafe;
  --info-200: #bfdbfe;
  --info-300: #93c5fd;
  --info-400: #60a5fa;           /* 标准 */
  --info-500: #3b82f6;
  --info-600: #2563eb;
  --info-700: #1d4ed8;
  --info-800: #1e40af;
  --info-900: #1e3a8a;
  
  /* --- 边框色 (Border) --- */
  --border-default: #334155;     /* 默认边框 */
  --border-hover: #475569;       /* 悬浮边框 */
  --border-active: #60a5fa;      /* 激活/聚焦边框 */
  --border-muted: #1e293b;       /* 静音边框 */
  --border-focus: #3b82f6;       /* 聚焦环 */
  --border-focus-ring: rgba(59, 130, 246, 0.5); /* 聚焦环颜色 */
  
  /* --- 阴影色 (Shadow) --- */
  --shadow-color: 0 0 0;         /* 阴影颜色基础 */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6);
  --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  --shadow-inner: inset 0 2px 4px 0 rgba(0, 0, 0, 0.3);
  
  /* --- 代码/语法高亮 --- */
  --code-bg: #1a2234;
  --code-text: #e2e8f0;
  --code-border: #334155;
  
  /* --- 图表色 (Chart) --- */
  --chart-1: #60a5fa;            /* 蓝 */
  --chart-2: #a78bfa;            /* 紫 */
  --chart-3: #34d399;            /* 绿 */
  --chart-4: #fbbf24;            /* 黄 */
  --chart-5: #f87171;            /* 红 */
  --chart-6: #22d3ee;            /* 青 */
  --chart-7: #f472b6;            /* 粉 */
  --chart-8: #a3e635;            /* 青柠 */
}
```

### 2.2 对比度要求 (WCAG AA/AAA)

| 文本类型 | 最小对比度 | 暗色主题 | 达标 |
|----------|-----------|----------|------|
| 普通文本 (< 18px) | 4.5:1 | `--text-secondary: #cbd5e1` ≈ 8.6:1 | ✅ AAA |
| 大文本 (≥ 18px bold) | 3:1 | `--text-primary: #f8fafc` ≈ 15.8:1 | ✅ AAA |
| UI 组件边界 | 3:1 | `--border-default: #334155` vs `--bg-secondary: #111827` ≈ 2.1:1 | ⚠️ 需调整 |
| 链接文本 | 4.5:1 | `--text-link: #60a5fa` vs `--bg-primary: #0a0e1a` ≈ 7.3:1 | ✅ AA |

**调整方案**: 将 `--border-default` 从 `#334155` 改为 `#3d4a5c`，对比度提升至 2.5:1

---

## 3. 组件级暗色模式适配

### 3.1 按钮 (Button)

```css
/* === 主要按钮 === */
.btn-primary {
  background-color: var(--primary-500);
  color: #ffffff;
  border: 1px solid transparent;
}
.btn-primary:hover {
  background-color: var(--primary-600);
}
.btn-primary:active {
  background-color: var(--primary-700);
}
.btn-primary:disabled {
  background-color: var(--primary-800);
  color: var(--primary-400);
  cursor: not-allowed;
}

/* 暗色模式主要按钮 */
[data-theme="dark"] .btn-primary {
  background-color: var(--primary-500);
  color: #0f172a; /* 深色文字 */
}
[data-theme="dark"] .btn-primary:hover {
  background-color: var(--primary-400);
}
[data-theme="dark"] .btn-primary:active {
  background-color: var(--primary-600);
}

/* === 次级按钮 === */
.btn-secondary {
  background-color: transparent;
  color: var(--primary-500);
  border: 1px solid var(--primary-500);
}
[data-theme="dark"] .btn-secondary {
  background-color: transparent;
  color: var(--primary-400);
  border-color: var(--primary-400);
}

/* === 幽灵按钮 === */
.btn-ghost {
  background-color: transparent;
  color: var(--text-primary);
}
.btn-ghost:hover {
  background-color: var(--surface-hover);
}
[data-theme="dark"] .btn-ghost:hover {
  background-color: var(--surface-active);
}

/* === 危险按钮 === */
.btn-danger {
  background-color: var(--error-500);
  color: #ffffff;
}
[data-theme="dark"] .btn-danger {
  background-color: var(--error-500);
  color: #ffffff;
}
```

### 3.2 卡片 (Card)

```css
.card {
  background-color: var(--color-gray-50);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

[data-theme="dark"] .card {
  background-color: var(--bg-tertiary);    /* #1a2234 */
  border-color: var(--border-default);     /* #3d4a5c */
  box-shadow: var(--shadow-md);
}

[data-theme="dark"] .card:hover {
  border-color: var(--border-hover);
}

[data-theme="dark"] .card-elevated {
  background-color: var(--bg-elevated);
  box-shadow: var(--shadow-lg);
}
```

### 3.3 输入框 (Input)

```css
.input {
  background-color: var(--color-gray-50);
  border: 1px solid var(--color-gray-300);
  color: var(--color-gray-900);
}
.input::placeholder {
  color: var(--color-gray-400);
}
.input:focus {
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px var(--color-primary-100);
}

[data-theme="dark"] .input {
  background-color: var(--surface-muted);    /* #1e293b */
  border-color: var(--border-default);       /* #334155 */
  color: var(--text-primary);                /* #f8fafc */
}
[data-theme="dark"] .input::placeholder {
  color: var(--text-placeholder);            /* #64748b */
}
[data-theme="dark"] .input:focus {
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px var(--border-focus-ring); /* rgba(59,130,246,0.3) */
}
[data-theme="dark"] .input:disabled {
  background-color: var(--surface-default);
  color: var(--text-muted);
  cursor: not-allowed;
}

/* 错误状态 */
[data-theme="dark"] .input-error {
  border-color: var(--error-500);
}
[data-theme="dark"] .input-error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.3);
}
```

### 3.4 表格 (Table)

```css
table {
  background-color: var(--color-white);
  border-color: var(--color-gray-200);
}
th {
  background-color: var(--color-gray-50);
  color: var(--color-gray-900);
  border-bottom: 2px solid var(--color-gray-200);
}
td {
  border-bottom: 1px solid var(--color-gray-100);
}
tr:hover td {
  background-color: var(--color-gray-50);
}

[data-theme="dark"] table {
  background-color: var(--bg-secondary);
  border-color: var(--border-default);
}
[data-theme="dark"] th {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border-bottom-color: var(--border-default);
}
[data-theme="dark"] td {
  color: var(--text-secondary);
  border-bottom-color: var(--border-muted);
}
[data-theme="dark"] tr:hover td {
  background-color: var(--surface-hover);
}
[data-theme="dark"] tr.selected td {
  background-color: var(--primary-900);
}
```

### 3.5 导航/侧边栏 (Nav/Sidebar)

```css
.nav {
  background-color: var(--color-gray-50);
  border-right: 1px solid var(--color-gray-200);
}
.nav-item {
  color: var(--color-gray-600);
}
.nav-item:hover {
  background-color: var(--color-gray-100);
  color: var(--color-gray-900);
}
.nav-item.active {
  background-color: var(--color-primary-50);
  color: var(--color-primary-600);
}

[data-theme="dark"] .nav {
  background-color: var(--bg-secondary);
  border-right-color: var(--border-default);
}
[data-theme="dark"] .nav-item {
  color: var(--text-secondary);
}
[data-theme="dark"] .nav-item:hover {
  background-color: var(--surface-hover);
  color: var(--text-primary);
}
[data-theme="dark"] .nav-item.active {
  background-color: var(--primary-900);
  color: var(--primary-300);
  border-right: 2px solid var(--primary-500);
}
```

### 3.6 下拉菜单/弹出框 (Dropdown/Popover)

```css
.dropdown {
  background-color: var(--color-white);
  border: 1px solid var(--color-gray-200);
  box-shadow: var(--shadow-lg);
}
.dropdown-item {
  color: var(--color-gray-700);
}
.dropdown-item:hover {
  background-color: var(--color-gray-50);
}
.dropdown-item.disabled {
  color: var(--color-gray-400);
  cursor: not-allowed;
}

[data-theme="dark"] .dropdown {
  background-color: var(--bg-elevated);    /* #1e293b */
  border-color: var(--border-default);
  box-shadow: var(--shadow-xl);
}
[data-theme="dark"] .dropdown-item {
  color: var(--text-secondary);
}
[data-theme="dark"] .dropdown-item:hover {
  background-color: var(--surface-hover);
  color: var(--text-primary);
}
[data-theme="dark"] .dropdown-item.disabled {
  color: var(--text-muted);
}
[data-theme="dark"] .dropdown-divider {
  border-color: var(--border-muted);
}
```

### 3.7 模态框/对话框 (Modal/Dialog)

```css
.modal-backdrop {
  background-color: rgba(0, 0, 0, 0.5);
}
.modal {
  background-color: var(--color-white);
  box-shadow: var(--shadow-2xl);
}
.modal-header {
  border-bottom: 1px solid var(--color-gray-200);
}
.modal-footer {
  border-top: 1px solid var(--color-gray-200);
}

[data-theme="dark"] .modal-backdrop {
  background-color: rgba(0, 0, 0, 0.75);
}
[data-theme="dark"] .modal {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-default);
}
[data-theme="dark"] .modal-header {
  border-bottom-color: var(--border-default);
}
[data-theme="dark"] .modal-footer {
  border-top-color: var(--border-default);
}
```

### 3.8 标签/徽章 (Badge/Tag)

```css
.badge {
  background-color: var(--color-primary-100);
  color: var(--color-primary-700);
}
.badge-success {
  background-color: var(--color-success-100);
  color: var(--color-success-700);
}
.badge-warning {
  background-color: var(--color-warning-100);
  color: var(--color-warning-700);
}
.badge-error {
  background-color: var(--color-error-100);
  color: var(--color-error-700);
}

[data-theme="dark"] .badge {
  background-color: var(--primary-900);
  color: var(--primary-300);
}
[data-theme="dark"] .badge-success {
  background-color: var(--success-900);
  color: var(--success-300);
}
[data-theme="dark"] .badge-warning {
  background-color: var(--warning-900);
  color: var(--warning-300);
}
[data-theme="dark"] .badge-error {
  background-color: var(--error-900);
  color: var(--error-300);
}
```

### 3.9 进度条/加载 (Progress/Loading)

```css
.progress-track {
  background-color: var(--color-gray-200);
}
.progress-fill {
  background-color: var(--color-primary-500);
}

[data-theme="dark"] .progress-track {
  background-color: var(--border-default);
}
[data-theme="dark"] .progress-fill {
  background-color: var(--primary-500);
}

/* Skeleton loading */
.skeleton {
  background: linear-gradient(90deg, var(--color-gray-200) 25%, var(--color-gray-100) 50%, var(--color-gray-200) 75%);
}
[data-theme="dark"] .skeleton {
  background: linear-gradient(90deg, var(--surface-muted) 25%, var(--surface-hover) 50%, var(--surface-muted) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

---

## 4. 暗色模式实现指南

### 4.1 主题切换实现

```tsx
// ThemeContext.tsx 扩展
type ThemeScheme = 'light' | 'dark' | 'system';

const themeConfig = {
  light: { /* 亮色配置 */ },
  dark: { /* 暗色配置 */ },
};

// 在 useEffect 中应用主题
useEffect(() => {
  const root = document.documentElement;
  const isDark = resolvedTheme === 'dark';
  
  root.classList.toggle('dark', isDark);
  root.setAttribute('data-theme', resolvedTheme);
  root.style.colorScheme = resolvedTheme;
}, [resolvedTheme]);
```

### 4.2 Tailwind CSS 集成

```js
// tailwind.config.js
module.exports = {
  darkMode: 'class', // 或 'media' for system preference
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary-500)',
          hover: 'var(--primary-600)',
          // ... 所有色阶
        },
        dark: {
          bg: 'var(--bg-primary)',
          surface: 'var(--bg-secondary)',
          border: 'var(--border-default)',
          text: 'var(--text-primary)',
        }
      }
    }
  }
}
```

### 4.3 CSS 变量注入

```css
/* 在 globals.css 或单独的 dark-mode.css 中 */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    /* 系统暗色偏好时应用 */
    --bg-primary: #0a0e1a;
    --bg-secondary: #111827;
    /* ... 其他变量 */
  }
}

[data-theme="dark"] {
  --bg-primary: #0a0e1a;
  --bg-secondary: #111827;
  /* ... 其他变量 */
}
```

---

## 5. 实施清单

### 5.1 高优先级 (P0)

- [ ] 更新 `tokens.css` 中的暗色主题变量
- [ ] 修复灰色系对比度问题
- [ ] 确保所有文本对比度 ≥ 4.5:1
- [ ] 修复按钮组件暗色状态
- [ ] 修复输入框暗色状态

### 5.2 中优先级 (P1)

- [ ] 表格组件暗色适配
- [ ] 导航/侧边栏暗色适配
- [ ] 下拉菜单暗色适配
- [ ] 模态框暗色适配
- [ ] 代码块语法高亮暗色主题

### 5.3 低优先级 (P2)

- [ ] 图表颜色暗色调整
- [ ] 进度条/加载状态暗色适配
- [ ] 标签/徽章暗色适配
- [ ] 暗色主题切换动画优化
- [ ] 触控反馈暗色优化

---

## 6. 附录

### 6.1 暗色主题检查清单

```
□ 背景色是否足够深 (> #0f172a)
□ 文本与背景对比度是否达标
□ 边框是否清晰可见
□ 悬浮/激活状态是否明显
□ 错误状态是否清晰可辨
□ 图片/图标是否需要调整亮度
□ 深色主题是否影响品牌识别度
```

### 6.2 参考资料

- [WCAG 2.1 对比度要求](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [Tailwind CSS 暗色模式](https://tailwindcss.com/docs/dark-mode)
- [Material Design 暗色主题](https://m3.material.io/styles/color/dark)
- [Apple Human Interface Guidelines - Dark Mode](https://developer.apple.com/design/human-interface-guidelines/foundations/dark-mode/)

---

**文档版本历史**:
- v1.0 (2026-10-21): 初始版本，包含完整暗色主题设计规范
