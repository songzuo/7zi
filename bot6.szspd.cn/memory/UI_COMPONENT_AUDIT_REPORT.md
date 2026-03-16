# 7zi 项目 UI/UX 组件审计报告

**审计日期**: 2026-03-15  
**审计范围**: `src/app/` 和 `src/components/`  
**审计目标**: 识别重复代码、命名规范问题、重构机会

---

## 📊 审计概览

### 统计数据
- **页面组件**: 13 个页面 (`src/app/[locale]/`)
- **公共组件**: 151 个 (`src/components/`)
- **UI 基础组件**: 10 个 (`src/components/ui/`)

### 组件分布
| 目录 | 组件数 | 说明 |
|------|--------|------|
| `src/components/ui/` | 10 | 基础 UI 组件 |
| `src/components/home/` | 8 | 首页专用组件 |
| `src/components/team/` | 8 | 团队页专用组件 |
| `src/components/about/` | 7 | 关于页专用组件 |
| `src/components/contact/` | 6 | 联系页专用组件 |
| `src/components/portfolio/` | 4 | 作品集专用组件 |
| `src/components/knowledge-lattice/` | 14 | 知识图谱专用组件 |
| `src/components/chat/` | 8 | 聊天组件 |
| `src/components/NotificationCenter/` | 6 | 通知中心组件 |
| `src/components/UserSettings/` | 4 | 用户设置组件 |
| `src/components/blog/` | 2 | 博客组件 |
| `src/components/charts/` | 5 | 图表组件 |

---

## 🔴 发现的问题

### 1. 按钮样式不一致（高优先级）

**问题描述**: 项目中存在大量内联按钮样式，缺乏统一的按钮组件。

**发现的样式变体**:
```tsx
// 变体 1: 蓝色主按钮 (出现 5+ 次)
className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"

// 变体 2: 渐变按钮 (出现 3+ 次)
className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-full font-medium"
className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg"

// 变体 3: 次要按钮 (出现 4+ 次)
className="px-6 py-3 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 text-zinc-700 font-medium rounded-lg"
className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"

// 变体 4: 青色主按钮 (出现 2+ 次)
className="px-4 py-2.5 rounded-xl bg-cyan-500 text-white font-medium text-sm hover:bg-cyan-600"
```

**建议**: 创建统一的 `Button` 组件

---

### 2. 输入框样式重复（高优先级）

**问题描述**: 输入框样式在多个文件中重复定义。

**重复出现**:
```tsx
// 出现 10+ 次的输入框样式
className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"

// 出现 5+ 次的 textarea 样式
className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-cyan-500 resize-none"

// 出现 3+ 次的 select 样式
className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-lg"
```

**建议**: 创建统一的 `Input`, `Textarea`, `Select` 组件

---

### 3. Badge/Tag 组件重复（中优先级）

**问题描述**: 状态标签、优先级标签、类型标签样式在多处重复。

**重复位置**:
- `src/app/[locale]/tasks/components/TaskCard.tsx` - 状态/优先级/类型 Badge
- `src/app/[locale]/tasks/[id]/components/TaskBadges.tsx` - 独立 Badge 组件
- `src/app/[locale]/notifications/page.tsx` - 优先级/未读 Badge

**重复代码**:
```tsx
// 状态 Badge (出现 3+ 次)
const getStatusColor = (status) => {
  switch (status) {
    case 'pending': return 'bg-gray-100 text-gray-800';
    case 'assigned': return 'bg-blue-100 text-blue-800';
    case 'in_progress': return 'bg-purple-100 text-purple-800';
    case 'completed': return 'bg-green-100 text-green-800';
  }
};

// 优先级 Badge (出现 2+ 次)
const getPriorityColor = (priority) => {
  switch (priority) {
    case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low': return 'bg-green-100 text-green-800 border-green-200';
  }
};
```

**建议**: 创建统一的 `Badge` 组件，支持多种变体

---

### 4. 头像组件重复（中优先级）

**问题描述**: 头像组件在多处重复实现。

**重复位置**:
- `src/app/[locale]/tasks/[id]/components/CommentAvatar.tsx`
- `src/app/[locale]/tasks/[id]/components/AssigneeAvatar.tsx`
- `src/components/team/TeamMemberCard.tsx`

**重复代码**:
```tsx
// 重复的头像样式
className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-medium"
className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-medium"
```

**建议**: 创建统一的 `Avatar` 组件

---

### 5. 导航栏重复（中优先级）

**问题描述**: 导航栏在多个页面中重复实现，样式基本一致。

**重复位置**:
- `src/app/[locale]/about/page.tsx` - 内联导航
- `src/app/[locale]/contact/page.tsx` - 内联导航
- `src/components/home/Navigation.tsx` - 首页导航
- `src/components/team/TeamNavigation.tsx` - 团队页导航
- `src/components/Navigation.tsx` - 通用导航

**问题**: 每个页面都复制了几乎相同的导航代码，只是 active 状态不同。

**建议**: 创建统一的 `PageNavigation` 组件，通过 props 控制当前活动项

---

### 6. 骨架屏组件重复（低优先级）

**问题描述**: 骨架屏/加载占位符在多处重复定义。

**重复位置**:
- `src/app/[locale]/dashboard/page.tsx` - DashboardSkeleton
- `src/app/[locale]/notifications/page.tsx` - NotificationSkeleton
- `src/components/ui/Loading.tsx` - 已有但未使用

**建议**: 扩展现有 `Loading` 组件，添加更多骨架屏变体

---

### 7. 表单状态提示重复（低优先级）

**问题描述**: 成功/错误提示样式在多处重复。

**重复位置**:
- `src/components/ContactForm.tsx` - 成功/错误提示
- `src/components/contact/FormStatus.tsx` - 相同的提示组件
- `src/app/[locale]/settings/page.tsx` - 保存状态提示

**重复代码**:
```tsx
// 成功提示 (出现 3+ 次)
<div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl">
  <p className="text-green-700 dark:text-green-400">...</p>
</div>

// 错误提示 (出现 3+ 次)
<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
  <p className="text-red-700 dark:text-red-400">...</p>
</div>
```

**建议**: 创建 `Alert` 组件，支持 success/error/warning/info 变体

---

### 8. 空状态组件重复（低优先级）

**问题描述**: 空状态提示在多处重复实现。

**重复位置**:
- `src/app/[locale]/tasks/page.tsx` - 空任务列表
- `src/app/[locale]/notifications/page.tsx` - EmptyState 组件

**建议**: 创建统一的 `EmptyState` 组件

---

## 📝 命名规范问题

### 1. 文件命名不一致

| 问题 | 位置 | 建议 |
|------|------|------|
| 大小写混用 | `TaskCard.tsx` vs `task-card.tsx` | 统一使用 PascalCase |
| 组件与页面混放 | `src/app/[locale]/tasks/components/` | 页面专用组件可保留，但应标注 |

### 2. 组件命名问题

| 当前命名 | 问题 | 建议 |
|----------|------|------|
| `LazyProjectDashboard` | 前缀不够语义化 | 使用 `ProjectDashboardLazy` 或 `AsyncProjectDashboard` |
| `CTASection` (多处) | 名称重复但实现不同 | 添加上下文前缀如 `HomeCTASection`, `TeamCTASection` |

---

## ✅ 现有良好的实践

1. **`src/components/ui/`** - 已有统一的基础组件库
2. **`src/components/knowledge-lattice/`** - 模块化组织良好，有 index.ts 导出
3. **`src/components/team/`** - 组件职责清晰，有类型定义
4. **TypeScript 类型** - 大部分组件有良好的类型定义

---

## 🎯 重构建议

### 优先级 1: 创建缺失的基础组件

```
src/components/ui/
├── Button.tsx        # 统一按钮组件
├── Input.tsx         # 统一输入框组件
├── Textarea.tsx      # 统一文本域组件
├── Select.tsx        # 统一下拉选择组件
├── Badge.tsx         # 统一标签组件
├── Avatar.tsx        # 统一头像组件
├── Alert.tsx         # 统一提示组件
├── EmptyState.tsx    # 空状态组件
└── Skeleton.tsx      # 骨架屏组件
```

### 优先级 2: 创建复合组件

```
src/components/common/
├── PageNavigation.tsx    # 统一页面导航
├── PageHeader.tsx        # 统一页面头部
├── PageFooter.tsx        # 统一页面底部
├── FormField.tsx         # 表单字段包装器
└── CardList.tsx          # 卡片列表容器
```

### 优先级 3: 整合页面组件

将 `src/app/[locale]/tasks/components/` 中的可复用组件移到 `src/components/tasks/`

---

## 📦 推荐的组件 API 设计

### Button 组件

```tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger' | 'ghost' | 'gradient';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

// 使用示例
<Button variant="gradient" size="md">提交</Button>
<Button variant="primary" loading>保存中...</Button>
<Button variant="ghost" leftIcon={<PlusIcon />}>添加</Button>
```

### Badge 组件

```tsx
interface BadgeProps {
  variant: 'status' | 'priority' | 'type' | 'custom';
  value: string;  // 'pending' | 'high' | 'development' 等
  size?: 'sm' | 'md';
}

// 使用示例
<Badge variant="status" value="in_progress" />
<Badge variant="priority" value="high" />
<Badge variant="type" value="development" />
```

### Input 组件

```tsx
interface InputProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

// 使用示例
<Input 
  label="邮箱" 
  error="请输入有效的邮箱地址" 
  required 
/>
```

### Alert 组件

```tsx
interface AlertProps {
  variant: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

// 使用示例
<Alert variant="success" message="保存成功" />
<Alert variant="error" title="错误" message="提交失败，请重试" dismissible />
```

---

## 📈 重构收益预估

| 指标 | 当前 | 重构后 | 改进 |
|------|------|--------|------|
| 重复代码行数 | ~500+ | ~100 | -80% |
| 按钮样式变体 | 10+ | 1 | -90% |
| 输入框样式变体 | 8+ | 1 | -88% |
| 维护成本 | 高 | 低 | 显著降低 |
| 主题一致性 | 70% | 95% | +25% |

---

## 🚀 实施计划

### 阶段 1: 基础组件 (1-2 天)
1. 创建 `Button` 组件
2. 创建 `Input` / `Textarea` / `Select` 组件
3. 创建 `Badge` 组件
4. 创建 `Avatar` 组件
5. 创建 `Alert` 组件

### 阶段 2: 复合组件 (1 天)
1. 创建 `PageNavigation` 组件
2. 创建 `FormField` 包装器
3. 创建 `EmptyState` 组件
4. 扩展 `Skeleton` 组件

### 阶段 3: 迁移 (2-3 天)
1. 迁移 `src/app/[locale]/tasks/` 使用新组件
2. 迁移 `src/app/[locale]/notifications/` 使用新组件
3. 迁移 `src/app/[locale]/settings/` 使用新组件
4. 迁移 `src/components/ContactForm.tsx` 使用新组件

### 阶段 4: 清理 (1 天)
1. 移除重复代码
2. 更新文档
3. 添加组件测试

---

## 📚 参考资源

- 现有 UI 组件: `src/components/ui/index.ts`
- 设计系统参考: Tailwind UI, shadcn/ui
- 类型定义: `src/lib/types/task-types.ts`

---

**审计人**: UI/UX 工程师 (Subagent)  
**状态**: 待审核
