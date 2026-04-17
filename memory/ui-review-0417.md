# UI/UX 审查报告 - 2026-04-17

## 项目概述
- **项目**: 7zi-frontend (Next.js App Router)
- **审查范围**: src/components/ui, src/components/dashboard, src/app, src/features
- **技术栈**: Next.js + React + Tailwind CSS + TypeScript

---

## 1. 目录结构 ✅

```
src/components/
├── ui/              # 基础 UI 组件 (Button, Card, Input, Modal, Tabs 等)
├── dashboard/       # 仪表盘专用组件 (AgentStatusPanel)
├── feedback/        # Toast、ErrorBoundary 等反馈组件
├── alerts/          # 警告提示
├── analytics/       # 分析相关
├── navigation/      # 导航组件
├── workflow/        # 工作流编辑器
├── rooms/           # 房间组件
├── mobile/          # 移动端适配
├── pwa/             # PWA 相关
├── webhook/         # Webhook
└── websocket/      # WebSocket
```

**评价**: 结构清晰，分层合理。`ui/` 基础组件独立，`features/` 按业务域划分。

---

## 2. 设计模式分析

### 2.1 UI 组件模式 ✅

| 特性 | 状态 | 说明 |
|------|------|------|
| forwardRef | ✅ | Button、Input 都使用 |
| React.memo | ✅ | 所有组件都包装了 memo |
| TypeScript | ✅ | 接口定义完整 |
| Variant Props | ✅ | Button 有 6 种 variant，5 种 size |
| 涟漪效果 | ✅ | Button 有 ripple 效果 |
| 暗色模式 | ✅ | 所有组件都有 dark: 样式 |
| 移动端优化 | ✅ | Card 有 fullWidthMobile、mobilePadding |
| 无障碍 (a11y) | ⚠️ | 基础有 aria-label，但 Modal focus trap 不完整 |

### 2.2 设计一致性

**✅ 优点**:
- 使用 `clsx` 统一管理条件类名
- 样式变量统一在 `tokens.css` 管理
- 组件 Props 类型一致，都有详细的 JSDoc

**❌ 问题**:
- **缺少 Design Token 统一管理**: 颜色、间距、圆角等硬编码在组件中（如 Card 的 `shadow-sm/md/lg` 分散定义）
- **组件尺寸命名不统一**: Button 用 xs/sm/md/lg/xl，CardImage 用 xs/sm/md/lg/xl（但与 Button 一致）
- **Border 使用不一致**: Card 用 `border border-gray-200`，Button outline 用 `border-2`

---

## 3. 关键组件审查

### 3.1 Button ✅
- 功能完整（ripple 效果、loading 状态、6 种变体）
- 使用 `transform-gpu` + `active:scale-[0.98]` 优化触控反馈
- **问题**: ripple effect 的 `setTimeout` 在快速点击时可能积累多个 timeout

### 3.2 Card ✅
- 子组件丰富（CardHeader、CardBody、CardFooter、CardImage、CardBadge 等）
- 移动端响应式处理较好（有 `fullWidthMobile`、`mobilePadding` 选项）
- **问题**: `transform-gpu` + hover + translateY 在低端移动设备上可能卡顿

### 3.3 Input ✅
- 验证状态完整（valid/invalid/warning）
- 密码可见性切换
- **问题**: `forwardRef` 与内部 `useState` value 混用（controlled vs uncontrolled），`value ?? internalValue` 模式有潜在 bug

### 3.4 Modal ⚠️
- 基础的 focus trap（保存/恢复焦点）
- ESC 键关闭
- **严重问题**: 
  - `'use memo'` 字符串字面量出现在组件内（应该是 `'use client'` 的误写）
  - focus trap 不完整：只在打开时聚焦到 modal，键盘 Tab 可以在遮罩层上循环
  - `showOverlay` 为 true 时点击遮罩关闭的逻辑有 bug：事件绑定在外层 div，但 `onClick={e => e.stopPropagation()}` 在内层，导致无法正确关闭

---

## 4. 改进建议（按优先级）

### 🔴 P0 - 必须修复

1. **Modal 组件 bug**
   - 移除第 68 行的 `'use memo'` 字符串
   - 修复遮罩点击关闭逻辑（当前 onClick stopPropagation 阻止了关闭）
   - 补充完整的 focus trap（参考 `react-aria` 或 `focus-trap-react`）

2. **Input uncontrolled/controlled 混用**
   - `value ?? internalValue` 在外部传入 value 后内部状态不更新的问题
   - 建议：完全使用受控组件模式，或提供 `useCombinedRefs` 工具

### 🟡 P1 - 建议改进

3. **Design Token 统一**
   - 提取颜色、阴影、间距到 `src/styles/tokens.css`
   - 创建 `tailwind.config.ts` 的 `tokens` 扩展，避免硬编码

4. **组件包体积**
   - `ui/index.ts` 导出全部 16+ 组件，可能导致 tree-shaking 不完全
   - 考虑按需导入：`import { Button } from '@/components/ui/Button'`

5. **Card 性能优化**
   - `hoverable` + `transform-gpu` + `translateY` 在低端设备可能掉帧
   - 建议：移动端禁用 hover translate，只保留 shadow 变化

### 🟢 P2 - 体验增强

6. **暗色模式切换时闪烁 (FOUC)**
   - 虽然 layout.tsx 有 `theme-init` script，但仍有轻微闪烁
   - 建议：使用 CSS 自定义属性 + `@layer base` 方式替代 JS 切换

7. **组件文档**
   - 大部分组件有 JSDoc，但缺少 `Props` 接口的示例用法
   - 建议：Storybook 或 inline stories

8. **EmptyState 组件缺失**
   - 有 `EmptyState.tsx` 但没有被 `index.ts` 导出
   - 确认是否应该加入统一导出

---

## 5. 总结

| 维度 | 评分 | 说明 |
|------|------|------|
| 代码质量 | ⭐⭐⭐⭐ | 整体结构清晰，TypeScript 使用规范 |
| 一致性 | ⭐⭐⭐ | 设计语言基本一致，但有细节不统一 |
| 性能 | ⭐⭐⭐⭐ | memo、lazy 等优化手段到位 |
| 可访问性 | ⭐⭐⭐ | 基础 a11y 有，但 Modal focus trap 较弱 |
| 移动端 | ⭐⭐⭐⭐ | 有较多移动端适配，但部分 hover 效果可能影响性能 |

**总体评价**: 这是一套设计良好的 UI 组件库，代码质量高。主要问题集中在 Modal 的 bug（遮罩关闭失效、`'use memo'` 误写）和 Input 的受控/非受控混用上，建议优先修复。
