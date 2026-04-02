# 7zi Frontend UI 审查报告

**审查日期**: 2026-03-22
**审查人**: 🎨 设计师 (子代理)
**项目路径**: `/root/.openclaw/workspace/7zi-project/7zi-frontend`

---

## 📋 审查范围

- ✅ `src/` 目录下的组件结构
- ✅ `html/` 目录的页面模板
- ✅ 全局样式和CSS变量
- ✅ 响应式设计模式
- ✅ 暗色模式实现

---

## 🔍 发现的主要问题

### 1. 颜色系统不一致 ⚠️ 高优先级

#### 问题描述

主项目使用 `zinc-*` 作为主色系，但部分组件使用了 `gray-*` 颜色，导致视觉不一致。

#### 具体位置

**使用 `gray-*` 的组件**：

- `7zi-frontend/src/components/PerformanceDashboard.tsx`
  - `bg-gray-900` (容器)
  - `bg-gray-800` (卡片)
  - `text-gray-*` (文本)
- `7zi-frontend/src/components/SimplePerformanceDashboard.tsx`
  - `bg-gray-900`, `bg-gray-800`
- `7zi-frontend/src/app/notification-demo/page.tsx`
  - `bg-gray-50`, `bg-white`

**主项目的颜色系统** (`src/app/globals.css`)：

```css
--color-zinc-50: #fafafa;
--color-zinc-100: #f4f4f5;
/* ... */
--color-zinc-900: #18181b;
```

#### 影响

- 视觉不统一，影响品牌一致性
- 不同页面之间颜色过渡不自然

#### 🔧 建议修复

```tsx
// 将所有 gray-* 替换为 zinc-*

// ❌ 旧代码
<div className="bg-gray-900 rounded-lg p-6">
  <div className="bg-gray-800 rounded-lg p-4">
    <span className="text-gray-300">Text</span>
  </div>
</div>

// ✅ 新代码
<div className="bg-zinc-900 dark:bg-zinc-950 rounded-2xl p-6">
  <div className="bg-zinc-800 dark:bg-zinc-900 rounded-2xl p-4">
    <span className="text-zinc-300 dark:text-zinc-400">Text</span>
  </div>
</div>
```

---

### 2. 圆角大小不统一 ⚠️ 中优先级

#### 问题描述

组件使用了不同的圆角大小：`rounded-lg` (8px)、`rounded-2xl` (16px)、`rounded-full` 等。

#### 具体位置

| 组件                       | 圆角大小                      | 文件                                                         |
| -------------------------- | ----------------------------- | ------------------------------------------------------------ |
| PerformanceDashboard       | `rounded-lg`                  | `7zi-frontend/src/components/PerformanceDashboard.tsx`       |
| SimplePerformanceDashboard | `rounded`, `rounded-lg`       | `7zi-frontend/src/components/SimplePerformanceDashboard.tsx` |
| ContactForm                | `rounded-2xl`                 | `src/components/ContactForm.tsx`                             |
| AIChat                     | `rounded-full`, `rounded-2xl` | `src/components/AIChat.tsx`                                  |

#### 🔧 建议修复

在 `src/styles/classes.ts` 中定义统一的圆角常量：

```typescript
// 统一圆角系统
export const roundedSm = 'rounded-lg' // 8px - 小元素
export const roundedMd = 'rounded-xl' // 12px - 卡片
export const roundedLg = 'rounded-2xl' // 16px - 大卡片
export const roundedFull = 'rounded-full' // 圆形按钮

// 按钮样式统一
export const buttonPrimaryClasses = `
  px-6 py-3 ${roundedFull}
  bg-gradient-to-r from-cyan-500 to-purple-600
  text-white font-semibold
  hover:shadow-lg hover:shadow-cyan-500/25
  transition-all hover:-translate-y-0.5
`

// 卡片样式统一
export const cardBaseClasses = `
  bg-white dark:bg-zinc-800 ${roundedLg}
  shadow-lg border border-zinc-100 dark:border-zinc-700
`
```

---

### 3. 响应式断点不一致 ⚠️ 中优先级

#### 问题描述

不同组件使用了不同的响应式断点，导致布局在不同屏幕尺寸下表现不一致。

#### 具体位置

| 组件                 | 断点模式                  | 问题               |
| -------------------- | ------------------------- | ------------------ |
| AIChat               | `window.innerWidth < 480` | 自定义断点，非标准 |
| PerformanceDashboard | `md:`, `lg:`              | 标准断点           |
| NotificationToaster  | 固定宽度                  | 未做响应式         |
| Footer               | `sm:`, `md:`, `lg:`       | 标准断点           |

#### 🔧 建议修复

定义统一的响应式断点系统：

```typescript
// 在 src/styles/classes.ts 中添加
export const breakpoints = {
  mobile: '640px', // sm
  tablet: '768px', // md
  laptop: '1024px', // lg
  desktop: '1280px', // xl
}

// 响应式容器
export const containerClasses = `
  max-w-7xl mx-auto px-4
  sm:px-6
  md:px-8
`

// 响应式网格
export const gridResponsive = `
  grid-cols-1
  sm:grid-cols-2
  lg:grid-cols-3
  xl:grid-cols-4
`
```

---

### 4. 暗色模式不完整 ⚠️ 高优先级

#### 问题描述

部分组件缺少暗色模式支持，或暗色模式颜色与全局不一致。

#### 具体位置

**缺少暗色模式的组件**：

- `7zi-frontend/src/app/monitoring-example/page.tsx`
  - 使用固定的 `bg-gray-100`，没有 `dark:bg-*`
- `7zi-frontend/src/components/notifications/NotificationToast.tsx`
  - 部分元素缺少暗色模式

#### 🔧 建议修复

确保所有组件都支持暗色模式：

```tsx
// ❌ 旧代码 - 没有暗色模式
<div className="bg-white rounded-lg shadow p-6">
  <span className="text-gray-900">Text</span>
</div>

// ✅ 新代码 - 完整暗色模式
<div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg dark:shadow-none p-6">
  <span className="text-gray-900 dark:text-gray-100">Text</span>
</div>

// 使用 CSS 变量（优先）
<div className="bg-card rounded-lg shadow p-6" style={{ background: 'var(--card)' }}>
  <span style={{ color: 'var(--card-foreground)' }}>Text</span>
</div>
```

---

### 5. 输入框样式不统一 ⚠️ 中优先级

#### 问题描述

不同表单组件的输入框样式不一致。

#### 具体位置

| 组件                      | 内边距      | 圆角           | 边框              |
| ------------------------- | ----------- | -------------- | ----------------- |
| ContactForm               | `px-6 py-4` | `rounded-2xl`  | `border-zinc-200` |
| AIChat 输入框             | `px-4 py-3` | `rounded-full` | 无边框            |
| PerformanceDashboard (无) | -           | -              | -                 |

#### 🔧 建议修复

使用统一的输入框样式（已在 `src/styles/classes.ts` 定义）：

```typescript
// 使用已定义的样式
import { inputBaseClasses, labelClasses } from '@/styles/classes';

// 在组件中使用
<input
  className={`${inputBaseClasses} ${errors ? inputErrorClasses : ''}`}
  // ...
/>
```

---

### 6. 按钮样式混乱 ⚠️ 中优先级

#### 问题描述

按钮使用了多种不同的样式模式，没有统一的视觉语言。

#### 具体位置

| 组件               | 按钮类型       | 样式                                           |
| ------------------ | -------------- | ---------------------------------------------- |
| notification-demo  | 多种颜色       | `bg-blue-500`, `bg-green-500`, `bg-red-500`    |
| monitoring-example | 扁平风格       | `bg-blue-500 hover:bg-blue-600`                |
| AIChat             | 渐变+圆形      | `bg-gradient-to-r from-cyan-500 to-purple-600` |
| ContactForm        | 未使用统一样式 | 内联样式                                       |

#### 🔧 建议修复

定义完整的按钮系统：

```typescript
// 在 src/styles/classes.ts 中扩展
export const buttonSize = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
}

export const buttonVariant = {
  primary: `
    bg-gradient-to-r from-cyan-500 to-purple-600
    text-white hover:shadow-lg
  `,
  secondary: `
    border-2 border-zinc-300 dark:border-zinc-700
    text-zinc-700 dark:text-zinc-300
    hover:border-cyan-500 hover:text-cyan-500
  `,
  danger: `
    bg-red-500 text-white
    hover:bg-red-600
  `,
  ghost: `
    text-zinc-500 hover:text-zinc-700
    hover:bg-zinc-100 dark:hover:bg-zinc-800
  `,
}

export const buttonClasses = `
  font-semibold transition-all
  rounded-full
  disabled:opacity-50 disabled:cursor-not-allowed
`
```

---

### 7. 缺少统一的间距系统 ⚠️ 低优先级

#### 问题描述

组件内部间距随意，没有统一的间距标准。

#### 具体位置

- PerformanceDashboard: `space-y-6`, `space-y-4`
- SimplePerformanceDashboard: `space-y-4`
- ContactForm: `space-y-6`
- notification-demo: `space-y-2`, `gap-4`, `mb-8`

#### 🔧 建议修复

定义统一的间距系统：

```typescript
// 在 src/styles/classes.ts 中添加
export const spacing = {
  section: 'py-16', // 章节间距
  block: 'space-y-6', // 块级元素间距
  compact: 'space-y-4', // 紧凑间距
  item: 'gap-2', // 项目间距
  group: 'gap-4', // 组间距
}

// 使用示例
export const sectionClasses = `${spacing.section}`

export const cardListClasses = `
  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
`
```

---

### 8. 动画过渡不一致 ⚠️ 低优先级

#### 问题描述

不同组件使用了不同的动画时长和缓动函数。

#### 具体位置

| 组件                 | 动画时长            | 缓动函数                       |
| -------------------- | ------------------- | ------------------------------ |
| NotificationToast    | `duration-300`      | 默认                           |
| PerformanceDashboard | `transition-colors` | 默认                           |
| AIChat               | `duration-300`      | 默认                           |
| globals.css          | `200ms`             | `cubic-bezier(0.4, 0, 0.2, 1)` |

#### 🔧 建议修复

在 `globals.css` 中定义统一的动画：

```css
/* 添加到 globals.css */

:root {
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 使用 CSS 变量 */
* {
  transition-duration: var(--transition-base);
}

/* 特殊动画 */
.fade-in {
  animation: fadeIn var(--transition-slow);
}
```

---

### 9. 组件重复和命名冲突 ⚠️ 低优先级

#### 问题描述

`7zi-frontend` 目录下有独立的组件实现，与主项目 `src/` 目录下的组件功能重复。

#### 具体位置

- `7zi-frontend/src/components/PerformanceDashboard.tsx`
- `7zi-frontend/src/components/SimplePerformanceDashboard.tsx`
- `7zi-frontend/src/components/notifications/*`

#### 🔧 建议修复

合并或删除重复组件：

```
建议操作：
1. 将 7zi-frontend 组件移动到主项目 src/components/
2. 统一颜色系统为 zinc-*
3. 更新所有引用路径
4. 删除 7zi-frontend 目录（如果只是测试代码）
```

---

### 10. 访问性问题 ⚠️ 中优先级

#### 问题描述

部分交互元素缺少适当的 ARIA 标签。

#### 具体位置

**缺少 aria-label 的元素**：

- PerformanceDashboard 的按钮部分
- NotificationToast 的关闭按钮（部分有，部分没有）
- monitoring-example 页面的按钮

#### 🔧 建议修复

确保所有交互元素都有适当的可访问性标签：

```tsx
// ❌ 旧代码
<button onClick={loadMetrics}>
  <RefreshCw />
</button>

// ✅ 新代码
<button
  onClick={loadMetrics}
  disabled={isLoading}
  aria-label={isLoading ? 'Refreshing...' : 'Refresh data'}
  aria-busy={isLoading}
>
  <RefreshCw />
</button>
```

---

## 📊 总结统计

| 问题类型       | 数量    | 优先级分布            |
| -------------- | ------- | --------------------- |
| 颜色系统不一致 | 3 文件  | 1 高, 2 中            |
| 圆角不统一     | 4 文件  | 中                    |
| 响应式问题     | 4 文件  | 中                    |
| 暗色模式缺失   | 2 文件  | 高                    |
| 样式不统一     | 6 文件  | 中-低                 |
| 可访问性       | 3 文件  | 中                    |
| **总计**       | **22+** | **3 高, 12 中, 7 低** |

---

## 🎯 优先修复建议

### Phase 1: 高优先级（本周）

1. ✅ 统一颜色系统：将所有 `gray-*` 替换为 `zinc-*`
2. ✅ 完善暗色模式：为所有组件添加 `dark:` 类
3. ✅ 确保核心页面（首页、团队页）视觉一致

### Phase 2: 中优先级（下周）

4. ✅ 统一圆角系统：使用 `rounded-2xl` 作为标准
5. ✅ 规范响应式断点：使用 Tailwind 标准断点
6. ✅ 统一按钮和输入框样式
7. ✅ 修复可访问性问题

### Phase 3: 低优先级（后续迭代）

8. ✅ 定义统一的间距系统
9. ✅ 统一动画过渡效果
10. ✅ 清理重复组件

---

## 🛠️ 具体修复步骤

### 步骤 1: 创建样式工具文件（如果还没有）

```bash
# 确认 src/styles/classes.ts 存在并完善
# 该文件已存在，需要补充统一样式
```

### 步骤 2: 批量替换颜色

```bash
# 在项目根目录执行
find src -name "*.tsx" -type f -exec sed -i 's/bg-gray-/bg-zinc-/g' {} +
find src -name "*.tsx" -type f -exec sed -i 's/text-gray-/text-zinc-/g' {} +
find src -name "*.tsx" -type f -exec sed -i 's/border-gray-/border-zinc-/g' {} +
```

### 步骤 3: 添加暗色模式

```bash
# 使用 grep 查找需要添加暗色模式的组件
grep -r "bg-white\|bg-gray" src/components --include="*.tsx" | grep -v "dark:"
```

### 步骤 4: 统一圆角

```bash
# 查找不一致的圆角
grep -r "rounded" src/components --include="*.tsx" | grep -v "rounded-2xl\|rounded-full"
```

---

## 📝 检查清单

完成修复后，请确认以下项：

- [ ] 所有 `gray-*` 颜色已替换为 `zinc-*`
- [ ] 所有组件支持暗色模式
- [ ] 按钮样式统一（渐变主按钮 + 次要按钮）
- [ ] 输入框样式统一（`rounded-2xl`, `px-6 py-4`）
- [ ] 圆角统一（主要用 `rounded-2xl`）
- [ ] 响应式断点一致（使用标准 Tailwind 断点）
- [ ] 所有交互元素有 `aria-label`
- [ ] 重复组件已合并或删除

---

## 🔗 相关文件

- 全局样式: `src/app/globals.css`
- 样式常量: `src/styles/classes.ts`
- 主页面: `src/app/[locale]/page.tsx`
- AI聊天组件: `src/components/AIChat.tsx`
- 联系表单: `src/components/ContactForm.tsx`
- 页脚: `src/components/Footer.tsx`

---

## 📚 设计系统建议

基于审查结果，建议建立完整的设计系统文档：

```
/docs/design-system/
  ├── colors.md        # 颜色系统规范
  ├── typography.md    # 字体规范
  ├── spacing.md       # 间距系统
  ├── components.md    # 组件库
  ├── accessibility.md # 可访问性指南
  └── animation.md     # 动画规范
```

---

**报告生成时间**: 2026-03-22 11:35 GMT+1
**下次审查建议**: 修复完成后进行复审
