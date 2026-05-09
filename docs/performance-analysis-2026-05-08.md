# 性能瓶颈分析

**项目**: 7zi-frontend  
**版本**: v1.0.0 (实际版本 v1.14.1)  
**分析日期**: 2026-05-08  
**技术栈**: Next.js 16, React 19, TypeScript, Tailwind CSS, Shadcn UI

---

## 组件优化

### 发现的问题

#### 1. **AI Chat 组件未使用 memo 导致不必要的重渲染**

**文件**:
- `src/components/ui/ai-chat/ChatMessage.tsx`
- `src/components/ui/ai-chat/ChatWindow.tsx`
- `src/components/ui/ai-chat/ChatInput.tsx`
- `src/components/ui/ai-chat/SuggestionPanel.tsx`

**问题**: 这些组件接收复杂 props（消息列表、回调函数），但未使用 `React.memo()` 包装。在聊天窗口频繁更新时，会导致所有消息组件不必要的重渲染。

**建议**: 为这些组件添加 `memo()` 包装：
```tsx
export const ChatMessage = memo<ChatMessageProps>(({ message, onCopy, onRetry }) => {
  // ...
})
```

#### 2. **useEffect 依赖不完整可能导致陈旧闭包**

**文件**: `src/components/WorkflowEditor/WorkflowEditor.tsx`

**问题**: 部分 useEffect 依赖了 `fetchData`（useCallback），但 fetchData 内部可能引用了尚未更新的状态。

```tsx
useEffect(() => {
  if (!initialData) {
    fetchData()
  }
}, [initialData, fetchData]) // fetchData 每次都应该是新引用，需要确认
```

**建议**: 使用 `useRef` 存储最新的 fetchData 或使用 `useEffectEvent`（React 19 新特性）。

#### 3. **Keyboard 快捷键组件存在重复 useEffect**

**文件**: `src/components/keyboard/ShortcutTutorial.tsx`

```tsx
useEffect(() => {
  // ...
}, [isOpen, steps, currentStep])

useEffect(() => {
  // ...
}, [currentStep, onComplete])
```

**问题**: 多个 useEffect 监听相同依赖项，可能导致更新逻辑分散。

**建议**: 合并相关逻辑到单个 useEffect。

#### 4. **Toast 组件使用过多 useCallback**

**文件**: `src/components/ui/feedback/ToastProvider.tsx`

**问题**: `addToast`, `removeToast`, `removeAllToasts` 都用 useCallback 包装，但 ToastProvider 本身可能不是高频更新点，过度优化反而增加复杂度。

**建议**: 评估实际使用频率，对于低频操作可移除 useCallback。

### 良好实践

- ✅ `date-fns` 的 `useMemo` 正确使用在图表组件中
- ✅ `clsx` 配合 `memo` 使用（Button, Input 组件）
- ✅ WorkflowEditor 大量使用 `useCallback` 和 `useMemo` 进行优化

---

## 图片优化

### 检查结果

#### ✅ 已有的优化措施

1. **next.config.ts 配置完善**:
   - 启用 `avif` 和 `webp` 现代格式
   - 完善的 `deviceSizes` 和 `imageSizes`
   - 30 天缓存 TTL
   - 远程图片域名白名单配置

2. **LazyImage 组件**:
   - 使用 Intersection Observer 实现懒加载
   - 支持 `blurDataURL` 模糊占位图
   - 支持多种预设尺寸 (avatar, thumbnail, card, hero, content, logo, banner)

3. **OptimizedImage 组件**:
   - 提供图片预设类型
   - 支持 `onLoad` 和 `onError` 回调

#### ⚠️ 发现的问题

1. **LazyImage 组件未使用 memo**
   
   `src/components/ui/LazyImage.tsx` 未被 memo 包装，父组件更新时会导致图片组件重新渲染。

2. **图片加载状态管理可能造成重渲染**
   
   `LazyImage` 内部使用多个 `useState` 管理加载/错误/可见状态，在快速滚动时可能产生频繁状态更新。

3. **建议添加图片占位符优化**
   
   当前使用纯色背景，建议使用 `next/image` 的 `placeholder="blur"` 配合 `blurDataURL`。

---

## 动态导入

### 使用情况

#### ✅ 良好实践

1. **ReactFlow 组件动态导入** (`src/components/WorkflowEditor/reactflow-imports.tsx`)
   
   ```tsx
   export const ReactFlow = dynamic(
     () => import('reactflow').then(mod => mod.ReactFlow),
     { ssr: false, loading: () => <div>Loading...</div> }
   )
   ```
   
   ReactFlow 及其所有子组件（Controls, MiniMap, Panel, Handle 等）都使用 `next/dynamic` 动态导入，这是正确的做法。

2. **图表组件懒加载** (`src/components/analytics/charts/LazyChart.tsx`)
   
   ```tsx
   export const LazyMetricChart = dynamic(
     () => import('./MetricChart'),
     { ssr: false, loading: () => <ChartSkeleton /> }
   )
   ```

3. **3D 知识图谱懒加载** (`src/app/[locale]/knowledge-lattice/page.tsx`)
   
   ```tsx
   const KnowledgeLattice3D = dynamic(
     () => import('@/components/knowledge-lattice/KnowledgeLattice3D'),
     { ssr: false }
   )
   ```

#### ⚠️ 可改进之处

1. **RichTextEditor 未动态导入**
   
   `src/components/ui/RichTextEditor/RichTextEditor.tsx` 包含 Tiptap 编辑器，但未使用动态导入。Tiptap 及所有扩展（@tiptap/*）体积较大，应考虑懒加载。

   **建议**:
   ```tsx
   const RichTextEditor = dynamic(
     () => import('./RichTextEditor'),
     { ssr: false, loading: () => <Skeleton className="h-64" /> }
   )
   ```

2. **ChatWindow 组件未动态导入**
   
   AI 聊天窗口可能包含较多依赖（流式处理、代码高亮等），可考虑在非首屏时懒加载。

3. **通用动态导入工具** (`src/lib/dynamic-import.tsx`)
   
   已存在通用 `lazy` 函数，建议推广使用到更多组件。

---

## 依赖分析

### 可优化的依赖

#### 1. **three** (0.183.2) - ⚠️ 建议优化

**问题**: Three.js 完整包体积约 500KB+，但项目仅使用核心 3D 功能。

**建议**:
- 使用 `three-stdlib` 替代完整包
- 或者使用 `@react-three/fiber` 的懒加载
- 检查 KnowledgeLattice3D 是否需要全部 three 功能

#### 2. **exceljs** (4.4.0) - ✅ 合理使用

**使用场景**: 导出功能（按需使用）

**建议**: 考虑替换为更轻量的替代方案：
- `xlsx` (SheetJS) - 更流行，tree-shaking 更好
- 或使用 `export-from-json`

#### 3. **@tiptap/* 扩展** - ⚠️ 可优化

**当前**: 逐个导入扩展
```json
"@tiptap/extension-blockquote": "^2.27.2",
"@tiptap/extension-bold": "^2.27.2",
"@tiptap/extension-bullet-list": "^2.27.2",
// ... 20+ 个扩展
```

**建议**:
- 使用 `@tiptap/react` 的 ` StarterKit` 包含大多数常用扩展
- 仅添加额外需要的扩展

#### 4. **@xenova/transformers** (2.0.1) - ⚠️ 大型依赖

**问题**: Transformers.js 完整包约 30MB+（WebAssembly + 模型）

**建议**:
- 确认是否在客户端运行 AI 推理
- 如只在服务端使用，考虑使用 `transformers` (Python) 后端 API
- 或使用动态导入 + Web Worker

#### 5. **socket.io-client** (4.8.3) - ✅ 合理使用

**当前**: 已配置独立 chunk 分割

**观察**: WebSocket 连接管理组件 (`WebSocketStatusPanel.tsx`) 有良好的状态管理。

#### 6. **recharts** (3.8.1) - ✅ 合理使用

**当前**: 已使用 `next/dynamic` 懒加载

**建议**: 确认 chart 组件只在需要时加载，已正确配置。

### 依赖尺寸估算

| 依赖 | 预估大小 | 优先级 |
|------|---------|--------|
| three + @react-three/* | ~600KB | 高 |
| @tiptap/* (所有扩展) | ~400KB | 中 |
| @xenova/transformers | ~30MB (含 WASM) | 高 |
| exceljs | ~300KB | 低 |
| recharts | ~150KB (懒加载) | 低 |
| socket.io-client | ~50KB | 低 |

---

## 优先级改进项

### Top 3 改进项

#### 1. 🔴 **高优先级: RichTextEditor 动态导入**

**文件**: `src/components/ui/RichTextEditor/RichTextEditor.tsx`

**问题**: Tiptap 编辑器及其 20+ 扩展在首屏加载时全部打包，约 400KB+。

**实施方案**:
```tsx
// 在使用时动态导入
const RichTextEditor = dynamic(
  () => import('./RichTextEditor').then(mod => mod.RichTextEditor),
  { 
    ssr: false,
    loading: () => <Skeleton className="min-h-[200px]" />
  }
)
```

**预期收益**: 首屏 JS bundle 减少 300-400KB

#### 2. 🟡 **中优先级: AI Chat 组件 memo 化**

**文件**: `src/components/ui/ai-chat/*.tsx`

**问题**: ChatMessage、ChatWindow 等组件频繁重渲染，影响聊天体验。

**实施方案**:
```tsx
// ChatMessage.tsx
export const ChatMessage = memo<ChatMessageProps>(({ message, onCopy, onRetry }) => {
  // ...
}, (prev, next) => {
  return prev.message.id === next.message.id && 
         prev.message.status === next.message.status
})
```

**预期收益**: 减少 30-50% 的聊天组件重渲染

#### 3. 🟡 **中优先级: Three.js 按需加载**

**文件**: `src/components/knowledge-lattice/KnowledgeLattice3D.tsx`

**问题**: 3D 组件可能不需要在首屏展示，但完整加载。

**实施方案**:
1. 确认 3D 组件使用场景
2. 使用 `@react-three/drei` 的 `Suspense` + `lazy`
3. 考虑使用更轻量的 2D 可视化作为 fallback

**预期收益**: 首屏 JS bundle 减少 200-400KB

---

## 总结

| 类别 | 状态 | 备注 |
|------|------|------|
| 组件优化 | ⚠️ 需改进 | AI Chat 组件需 memo 化 |
| 图片优化 | ✅ 良好 | next/image 配置完善 |
| 动态导入 | ⚠️ 部分缺失 | RichTextEditor 需添加 |
| 依赖分析 | ⚠️ 需优化 | three/transformers 体积大 |

**整体评估**: 项目已有良好的性能优化基础（动态导入、代码分割、next/image 配置），主要问题在于部分重型组件（RichTextEditor、3D 可视化）未进行懒加载，以及高频更新组件未使用 memo 优化。
