# 7zi Frontend Design System

完整的设计系统文档和组件库，包含可复用的 UI 组件、设计 Token 和最佳实践。

## 📦 安装

```bash
# 安装依赖
npm install
```

## 🚀 快速开始

### 运行 Storybook

查看所有组件的交互式文档：

```bash
npm run storybook
```

访问：http://localhost:6006

### 使用组件

```tsx
import { Button, Input, Card } from '@/components/ui'

export default function MyComponent() {
  return (
    <Card shadow="lg">
      <Input label="邮箱" type="email" placeholder="example@email.com" />
      <Button variant="primary" size="md" onClick={handleSubmit}>
        提交
      </Button>
    </Card>
  )
}
```

## 📚 组件列表

### 核心 UI 组件

#### Button - 按钮

支持多种变体和尺寸的按钮组件。

**变体**：

- `primary` - 主要按钮
- `secondary` - 次要按钮
- `outline` - 轮廓按钮
- `ghost` - 幽灵按钮
- `danger` - 危险操作
- `success` - 成功操作

**尺寸**：

- `xs` - 超小 (12px)
- `sm` - 小 (14px)
- `md` - 中等 (16px) - 默认
- `lg` - 大 (18px)
- `xl` - 超大 (20px)

#### Input - 输入框

支持多种输入类型的表单组件。

**特性**：

- 文本、密码、邮箱、电话等多种类型
- 内置表单验证
- 帮助文本和错误提示
- 密码可见性切换
- 前缀和后缀图标

#### Card - 卡片

用于组织和展示内容的容器组件。

**子组件**：

- `CardHeader` - 卡片头部
- `CardBody` - 卡片内容
- `CardFooter` - 卡片底部
- `CardImage` - 卡片图片
- `CardTitle` - 卡片标题
- `CardText` - 卡片文本

**阴影级别**：

- `none` - 无阴影
- `sm` - 小阴影
- `md` - 中阴影
- `lg` - 大阴影
- `xl` - 特大阴影

#### Modal - 模态框

用于显示对话框、表单等的弹出组件。

**尺寸**：

- `sm` - 小 (max-w-md)
- `md` - 中 (max-w-lg)
- `lg` - 大 (max-w-2xl)
- `xl` - 超大 (max-w-4xl)
- `full` - 全屏

**特性**：

- 动画过渡
- 键盘导航（ESC 关闭）
- 可定制页脚
- 点击遮罩关闭（可配置）

## 🎨 设计 Token

### 颜色 (Colors)

```css
/* 主色调 */
--color-primary-500: #3b82f6;

/* 灰色系 */
--color-gray-500: #6b7280;

/* 语义颜色 */
--color-success-500: #22c55e;
--color-warning-500: #f59e0b;
--color-error-500: #ef4444;
--color-info-500: #3b82f6;
```

### 字体 (Typography)

```css
/* 字体族 */
--font-family-sans: 'Inter', sans-serif;
--font-family-mono: 'JetBrains Mono', monospace;

/* 字体大小 */
--font-size-xs: 0.75rem;
--font-size-sm: 0.875rem;
--font-size-base: 1rem;
--font-size-lg: 1.125rem;

/* 字重 */
--font-weight-normal: 400;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

### 间距 (Spacing)

基于 4px 网格的间距系统：

```css
--spacing-1: 0.25rem; /* 4px */
--spacing-2: 0.5rem; /* 8px */
--spacing-4: 1rem; /* 16px */
--spacing-6: 1.5rem; /* 24px */
--spacing-8: 2rem; /* 32px */
```

### 断点 (Breakpoints)

```css
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
```

## 🌓 主题系统

### 亮色主题（默认）

```tsx
<div className="bg-white text-gray-900">
  <!-- 内容 -->
</div>
```

### 暗色主题

```tsx
<div className="bg-gray-900 text-white">
  <!-- 内容 -->
</div>
```

### 使用 Tailwind 的 dark: 前缀

```tsx
<div className="bg-white dark:bg-gray-900">
  <p className="text-gray-900 dark:text-gray-100">主题切换示例</p>
</div>
```

## 📱 响应式设计

### Tailwind 响应式前缀

```tsx
{
  /* 移动：1 列，平板：2 列，桌面：3 列 */
}
;<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">{/* 内容 */}</div>

{
  /* 移动：小字号，桌面：大字号 */
}
;<p className="text-sm md:text-base lg:text-lg">响应式文本</p>
```

### 响应式组件

所有组件都支持响应式布局，会根据断点自动调整。

## ♿ 无障碍

设计系统遵循 WCAG 2.1 AA 标准：

- ✅ 颜色对比度至少 4.5:1
- ✅ 键盘导航支持
- ✅ 屏幕阅读器友好
- ✅ ARIA 标签支持
- ✅ 明显的焦点指示器

## 🔧 开发指南

### 添加新组件

1. 在 `src/components/ui/` 创建组件文件
2. 编写 Storybook 故事文件
3. 在 `src/components/ui/index.ts` 导出
4. 编写单元测试
5. 更新文档

### 组件规范

- 使用 TypeScript 定义 props 类型
- 支持自定义 className
- 使用 forwardRef 暴露 ref
- 提供合理的默认值
- 遵循命名约定

### Storybook 规范

```tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '../components/ui/Button'

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
}
```

## 📚 文档

- [设计系统文档](/design-system) - 完整的设计系统指南
- [Storybook](http://localhost:6006) - 交互式组件文档
- [DESIGN_SYSTEM.md](/docs/DESIGN_SYSTEM.md) - 详细设计系统文档

## 🧪 测试

```bash
# 运行单元测试
npm test

# 运行测试并监听变化
npm run test:watch

# 生成测试覆盖率报告
npm run test:coverage

# 运行端到端测试
npm run test:e2e
```

## 🚢 部署

```bash
# 构建 Storybook
npm run build-storybook

# 输出在 .storybook-out/ 目录
```

## 📝 更新日志

### v1.0.0 (2024-03-28)

✨ 初始版本发布：

- ✅ 核心 UI 组件（Button, Input, Card, Modal）
- ✅ 设计 Token 系统
- ✅ 响应式断点系统
- ✅ Storybook 集成
- ✅ 主题切换支持
- ✅ 设计系统文档站点

## 🤝 贡献

欢迎贡献！请查看 [贡献指南](/docs/CONTRIBUTING.md) 了解详情。

## 📄 许可证

MIT License
