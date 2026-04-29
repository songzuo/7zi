# 7zi 平台 CTA 按钮组件优化方案

**日期:** 2026-04-28
**角色:** 设计师子代理
**任务:** CTA 按钮组件设计问题分析与优化

---

## 一、现有 CTA 组件分析

### 1.1 涉及组件

| 组件 | 位置 | 说明 |
|------|------|------|
| `Button.tsx` | `src/components/ui/Button.tsx` | 核心按钮组件 |
| `IconButton` | 同上 | 图标按钮封装 |
| `ButtonGroup` | 同上 | 按钮组 |
| `MobileBottomNav.tsx` | `src/components/mobile/` | 移动端导航按钮 |

### 1.2 Button 组件当前状态

**✅ 做得好的地方：**
- 多种变体 (primary/secondary/outline/ghost/danger/success)
- 多种尺寸 (xs/sm/md/lg/xl)
- 涟漪效果 (ripple)
- 加载状态 (loading spinner)
- `disabled` 和 `loading` 状态处理
- `React.memo` 优化

**❌ 需要改进的问题：**

#### 问题 1：视觉层级不够清晰

- Primary 按钮使用 `bg-blue-600`，但 hover 时颜色变化（`-700`）对比度不够强
- Ghost 按钮在深色模式下 `hover:bg-gray-800` 颜色偏暗，与背景融合
- 缺少明确的**点击区域视觉反馈**（当前只有 scale 动画）

**改进建议：**
```css
/* 建议增强 Primary hover 效果 */
primary: clsx(
  'bg-blue-600 text-white',
  'hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25',
  'focus:ring-blue-500',
  'shadow-sm',
  'active:bg-blue-800 active:shadow-sm active:translate-y-[1px]' /* 新增按压态 */
),
```

#### 问题 2：移动端适配不足

- 最小触控区域 `min-h-[44px]` 只在 `MobileBottomNav` 中设置
- 普通 Button 在移动端的触控区域可能小于 44x44px（尤其是 xs/sm 尺寸）
- 没有针对触控的专用样式变量

**改进建议：**
```css
sizeStyles = {
  xs: 'px-2.5 py-1 text-xs gap-1 min-h-[36px] min-w-[36px]', // 移动端最小 36px
  sm: 'px-3 py-1.5 text-sm gap-1.5 min-h-[40px] min-w-[40px]',
  md: 'px-4 py-2 text-sm gap-2 min-h-[44px] min-w-[44px]',   // iOS 推荐 44px
  lg: 'px-5 py-2.5 text-base gap-2 min-h-[48px] min-w-[48px]',
  xl: 'px-6 py-3 text-lg gap-2.5 min-h-[52px] min-w-[52px]',
}
```

#### 问题 3：状态反馈不完善

**当前状态：**
| 状态 | 当前实现 | 缺失 |
|------|----------|------|
| default | ✅ | - |
| hover | ✅ scale 变化 | 缺少视觉突出（如边框、光晕） |
| active | ⚠️ `scale-[0.98]` | 没有颜色变化 |
| focus | ⚠️ ring-2 | ring 颜色偏弱 |
| disabled | ⚠️ `opacity-50` | 对比度可能不足（WCAG 要求 3:1） |
| loading | ✅ spinner | 文字可读性差 |

**改进建议（disabled 状态）：**
```css
'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500'
```

**改进建议（loading 状态）：**
```css
loading && 'opacity-75 cursor-wait relative'
loading && 'after:absolute after:inset-0 after:bg-white/20' /* 半透明遮罩 */
```

---

## 二、CTA 场景专项分析

### 2.1 登录页 CTA（`login/page.tsx`）

**当前代码：**
```tsx
<Button
  type="submit"
  variant="primary"
  size="lg"
  fullWidth
  disabled={!canSubmit}
  loading={isLoading}
>
  {isLoading ? '登录中...' : '登录'}
</Button>
```

**问题：**
- `disabled={!canSubmit}` 会在用户未填写时禁用，但样式变化不明显
- 表单验证错误时没有视觉提示

**建议：**
- 使用 `outline` 或 `danger` 变体显示错误状态
- 考虑将 primary 按钮在错误时保持可用，仅在提交后 disabled

### 2.2 移动端底部导航

**当前代码：**
```tsx
w-full h-full min-w-[44px] min-h-[44px] // ✅ 已达标
```

**做得好的地方：**
- ✅ 44px 最小触控区域
- ✅ Safe Area 适配
- ✅ 激活指示器

**可以改进：**
- 涟漪效果可以考虑在移动端关闭（性能）
- 点击反馈可以更明显（不只是颜色变化）

---

## 三、优化方案代码建议

### 3.1 Button 组件优化版本

```tsx
// src/components/ui/Button.tsx

// 新增 TouchTarget 包装器确保移动端触控区域
const TouchTarget = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={clsx('contents', className)}>
    {children}
  </span>
)

// 增强 variant 样式
const variantStyles = {
  primary: clsx(
    'bg-blue-600 text-white',
    'hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-[1px]',
    'active:bg-blue-800 active:shadow-sm active:translate-y-[1px] active:shadow-none',
    'focus:ring-4 focus:ring-blue-300/50', // 增强 focus ring
    'disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:hover:translate-y-0',
    'shadow-sm'
  ),
  // ... 其他变体类似增强
}

// 新增 transition timing
const baseStyles = clsx(
  'relative overflow-hidden',
  'inline-flex items-center justify-center font-medium rounded-xl', // 增大圆角
  'transition-all duration-200 ease-out', // 原生 ease
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2', // focus-visible
  'disabled:opacity-50 disabled:cursor-not-allowed',
  'active:scale-[0.97]', // 稍微激进的按压反馈
  'transform-gpu'
)
```

### 3.2 新增 CTAButton 变体

```tsx
// 专用的 CTA 按钮，带更强的视觉层级
export interface CTAPlaceholder {
  placeholder: 'signup' | 'login' | 'join' | 'purchase' | 'subscribe'
}

export const CTAButton = React.memo(({ placeholder, ...props }: CTAPlaceholder & Omit<ButtonProps, 'variant' | 'children'>) => {
  const presets = {
    signup: { label: '立即注册', variant: 'primary' as const, icon: '→' },
    login: { label: '登录', variant: 'primary' as const, icon: null },
    join: { label: '加入房间', variant: 'success' as const, icon: '🚪' },
    purchase: { label: '立即购买', variant: 'primary' as const, icon: '💎' },
    subscribe: { label: '订阅', variant: 'primary' as const, icon: '⭐' },
  }
  const { label, variant, icon } = presets[placeholder]
  return (
    <Button variant={variant} size="lg" {...props}>
      {icon && <span className="mr-2">{icon}</span>}
      {label}
    </Button>
  )
})
```

---

## 四、设计规范建议

### 4.1 CTA 按钮设计原则

1. **视觉突出**：CTA 按钮必须是页面中最突出的元素
2. **足够大**：移动端最小 44x44px，建议 48x48px
3. **对比度**：WCAG 2.1 AA 标准（对比度 ≥ 4.5:1）
4. **反馈明确**：每种状态都有清晰的视觉区分
5. **位置显眼**：页面顶部或自然阅读终点

### 4.2 状态对照表

| 状态 | 背景色 | 文字色 | 阴影 | 动画 |
|------|--------|--------|------|------|
| Default | `bg-blue-600` | 白 | 小阴影 | - |
| Hover | `bg-blue-700` | 白 | 大阴影+上移 | 200ms |
| Active/Pressed | `bg-blue-800` | 白 | 无+下移 | 100ms |
| Focus | - | - | ring 外发光 | 立即 |
| Disabled | `bg-gray-300` | `text-gray-500` | 无 | - |
| Loading | `opacity-75` | 正常 | 遮罩 | spinner |

---

## 五、实施优先级

| 优先级 | 改进项 | 工作量 |
|--------|--------|--------|
| P0 | 移动端触控区域尺寸确保 ≥44px | 小 |
| P0 | disabled 状态对比度提升 | 小 |
| P1 | hover/active 状态视觉增强 | 中 |
| P1 | focus ring 增强 | 小 |
| P2 | 新增 CTAButton 预设组件 | 中 |
| P2 | 深色模式适配 | 中 |

---

## 六、输出文件位置

本设计方案写入：`memory/2026-04-28-cta-design.md`

---

**设计师子代理 报告完毕**
