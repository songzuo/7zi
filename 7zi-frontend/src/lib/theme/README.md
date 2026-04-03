# Theme Management System

深色模式主题管理系统，用于 v1.12.0 版本。

## 功能特性

- ✅ 三种主题模式：Light / Dark / System
- ✅ 持久化主题偏好（localStorage）
- ✅ 基于系统偏好的自动切换
- ✅ 基于时间的自动切换（白天/夜晚）
- ✅ 平滑过渡动画
- ✅ 完整的 CSS 变量集
- ✅ 无闪烁加载（Flash-free）
- ✅ Tailwind CSS 集成

## 安装使用

### 1. 导入主题脚本到 `layout.tsx`

在 `app/layout.tsx` 中添加内联脚本，防止 FOUC：

```tsx
import { getThemeScript } from '@/lib/theme/theme-script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <script dangerouslySetInnerHTML={{ __html: getThemeScript() }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

### 2. 导入主题样式

在全局样式文件中导入主题 CSS：

```css
@/lib/theme/theme.css
```

或者在 `globals.css` 中导入：

```css
@import '@/lib/theme/theme.css';
```

### 3. 在应用根组件中使用 ThemeProvider

```tsx
'use client';

import { ThemeProvider } from '@/lib/theme';

export default function App({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
```

## API 参考

### ThemeProvider Props

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| children | React.ReactNode | - | 子组件 |
| defaultMode | ThemeMode | 'system' | 默认主题模式 |
| defaultTimeBased | boolean | false | 默认启用时间切换 |

### ThemeSwitcher Props

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| showTimeBased | boolean | true | 显示时间切换选项 |
| className | string | '' | 自定义类名 |
| size | 'sm' \| 'md' \| 'lg' | 'md' | 尺寸变体 |
| showLabel | boolean | false | 显示标签 |
| variant | 'button' \| 'dropdown' \| 'icon' | 'dropdown' | UI 变体 |

### useTheme Hook

```tsx
const {
  mode,              // 当前模式: 'light' | 'dark' | 'system'
  resolvedTheme,     // 解析后的主题: 'light' | 'dark'
  setMode,           // 设置模式
  toggle,            // 切换主题
  timeBasedEnabled,  // 时间切换是否启用
  setTimeBasedEnabled, // 设置时间切换
  systemTheme,       // 系统主题偏好
  isLoaded,          // 是否已加载
} = useTheme();
```

### useThemeSwitch Hook

```tsx
const {
  mode,                // 当前模式
  resolvedTheme,       // 解析后的主题
  setMode,             // 设置模式（带过渡）
  toggle,              // 切换主题（带过渡）
  timeBasedEnabled,    // 时间切换是否启用
  setTimeBasedEnabled, // 设置时间切换
  isDark,              // 是否深色模式
  isLight,             // 是否浅色模式
} = useThemeSwitch({
  transition: true,           // 启用过渡动画
  transitionDuration: 300,    // 过渡时长(ms)
  onThemeChange: (theme) => { // 主题变化回调
    console.log('Theme changed to:', theme);
  },
});
```

## 使用示例

### 基础用法

```tsx
import { ThemeSwitcher, useTheme } from '@/lib/theme';

function Header() {
  const { resolvedTheme } = useTheme();
  
  return (
    <header>
      <h1>Current theme: {resolvedTheme}</h1>
      <ThemeSwitcher />
    </header>
  );
}
```

### 简单切换按钮

```tsx
<ThemeSwitcher 
  variant="button"
  showLabel={true}
/>
```

### 图标按钮

```tsx
<ThemeSwitcher variant="icon" size="lg" />
```

### 自定义主题切换

```tsx
import { useThemeSwitch } from '@/lib/theme';

function CustomThemeToggle() {
  const { toggle, isDark } = useThemeSwitch();
  
  return (
    <button onClick={toggle}>
      {isDark ? '☀️ Light' : '🌙 Dark'}
    </button>
  );
}
```

### 在组件中使用主题

```tsx
import { useTheme } from '@/lib/theme';

function MyComponent() {
  const { resolvedTheme } = useTheme();
  
  return (
    <div 
      style={{
        backgroundColor: resolvedTheme === 'dark' ? '#0f172a' : '#ffffff',
        color: resolvedTheme === 'dark' ? '#f1f5f9' : '#111827',
      }}
    >
      Content
    </div>
  );
}
```

### 使用 CSS 变量

```css
.my-component {
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.my-component:hover {
  background-color: var(--color-surface-hover);
  border-color: var(--color-border-hover);
}
```

## CSS 变量列表

### 颜色变量

```css
/* 背景色 */
--color-background
--color-surface
--color-surface-hover
--color-surface-active

/* 文字颜色 */
--color-text-primary
--color-text-secondary
--color-text-muted
--color-text-inverse

/* 主色 */
--color-primary
--color-primary-hover
--color-primary-active
--color-primary-light

/* 次色 */
--color-secondary
--color-secondary-hover
--color-secondary-light

/* 状态色 */
--color-success
--color-success-light
--color-success-bg

--color-warning
--color-warning-light
--color-warning-bg

--color-error
--color-error-light
--color-error-bg

--color-info
--color-info-light
--color-info-bg

/* 边框 */
--color-border
--color-border-hover
--color-border-focus
--color-border-disabled

/* 阴影 */
--shadow-sm
--shadow
--shadow-md
--shadow-lg
--shadow-xl

/* 代码 */
--color-code-background
--color-code-text

/* 图表 */
--color-chart-1 到 --color-chart-8
```

## Tailwind CSS 集成

在 `tailwind.config.js` 中已启用 `darkMode: 'class'`，因此可以直接使用：

```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  This component supports dark mode
</div>
```

## 时间自动切换

启用后，系统会根据时间自动切换：

- **白天**: 6:00 - 18:00 → Light 主题
- **夜晚**: 18:00 - 6:00 → Dark 主题

```tsx
<ThemeSwitcher showTimeBased={true} />
```

或通过代码启用：

```tsx
const { setTimeBasedEnabled } = useTheme();
setTimeBasedEnabled(true);
```

## 最佳实践

### 1. 使用 CSS 变量而非硬编码颜色

```tsx
// ❌ 不好
<div style={{ backgroundColor: '#ffffff' }} />

// ✅ 好
<div style={{ backgroundColor: 'var(--color-surface)' }} />
```

### 2. 使用 Tailwind 的 dark: 前缀

```tsx
// ❌ 不好
<div className={resolvedTheme === 'dark' ? 'bg-gray-900' : 'bg-white'} />

// ✅ 好
<div className="bg-white dark:bg-gray-900" />
```

### 3. 图片适配

深色模式下图片会自动调整亮度和对比度。如需禁用：

```css
.dark img {
  filter: none;
}
```

### 4. 代码高亮

主题系统包含 Prism.js/Tokens 的语法高亮样式，自动适配深色/浅色模式。

### 5. 图表适配

深色模式下 Canvas 和 SVG 会自动增加亮度：

```css
.dark canvas, .dark svg {
  filter: brightness(1.1);
}
```

## 故障排除

### FOUC（闪烁内容）

确保在 `layout.tsx` 中正确设置了初始化脚本：

```tsx
<script 
  dangerouslySetInnerHTML={{ __html: getThemeScript() }}
  id="theme-init"
  data-noparse="true"
/>
```

### 主题不生效

1. 检查是否使用了 `ThemeProvider`
2. 检查 `tailwind.config.js` 中 `darkMode: 'class'` 是否已设置
3. 检查是否导入了 `theme.css`

### 过渡动画不生效

确保使用 `useThemeSwitch` hook，或设置 `transition={true}`：

```tsx
const { toggle } = useThemeSwitch({ transition: true });
```

## TypeScript 支持

完整类型支持：

```tsx
import type { ThemeMode, ThemeColors, ThemeConfig } from '@/lib/theme/theme-config';
```

## 测试

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@/lib/theme';

describe('ThemeSystem', () => {
  it('should switch theme', () => {
    const TestComponent = () => {
      const { resolvedTheme, toggle } = useTheme();
      return (
        <button onClick={toggle}>{resolvedTheme}</button>
      );
    };
    
    render(
      <ThemeProvider defaultMode="light">
        <TestComponent />
      </ThemeProvider>
    );
    
    expect(screen.getByText('light')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('dark')).toBeInTheDocument();
  });
});
```

## 浏览器支持

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT
