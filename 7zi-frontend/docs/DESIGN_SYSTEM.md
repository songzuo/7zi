# 7zi Frontend 设计系统文档

## 简介

7zi Frontend 设计系统是一套完整的设计语言和可复用 UI 组件库，旨在帮助团队快速构建一致、美观、高性能的用户界面。

## 设计原则

### 1. 一致性 (Consistency)

确保所有组件和页面遵循相同的设计语言，包括：

- 统一的颜色系统
- 一致的间距和布局
- 标准化的交互模式

### 2. 可访问性 (Accessibility)

遵循 WCAG 2.1 AA 标准，确保：

- 足够的颜色对比度
- 键盘导航支持
- 屏幕阅读器友好
- 适当的焦点指示器

### 3. 响应式 (Responsive)

适配各种设备尺寸：

- 移动优先的设计方法
- 灵活的网格系统
- 响应式图片和排版
- 触摸友好的交互区域

### 4. 性能 (Performance)

保持优秀的加载和交互性能：

- 优化的组件渲染
- 代码分割和懒加载
- 合理的动画和过渡效果

## 核心概念

### 设计 Token

设计 Token 是设计系统的原子单元，包括：

#### 颜色 (Colors)

```css
/* 主色调 */
--color-primary-50: #eff6ff;
--color-primary-500: #3b82f6;
--color-primary-900: #1e3a8a;

/* 语义颜色 */
--color-success-500: #22c55e;
--color-warning-500: #f59e0b;
--color-error-500: #ef4444;
--color-info-500: #3b82f6;
```

#### 字体 (Typography)

```css
/* 字体族 */
--font-family-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* 字体大小 */
--font-size-xs: 0.75rem; /* 12px */
--font-size-sm: 0.875rem; /* 14px */
--font-size-base: 1rem; /* 16px */
--font-size-lg: 1.125rem; /* 18px */

/* 字重 */
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

#### 间距 (Spacing)

基于 4px 网格的间距系统：

```css
--spacing-1: 0.25rem; /* 4px */
--spacing-2: 0.5rem; /* 8px */
--spacing-4: 1rem; /* 16px */
--spacing-8: 2rem; /* 32px */
```

#### 断点 (Breakpoints)

```css
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
```

### 组件库

#### 按钮 (Button)

用于触发操作的交互元素。

```tsx
<Button variant="primary" size="md" onClick={handleClick}>
  点击我
</Button>
```

**变体**：

- `primary` - 主要按钮
- `secondary` - 次要按钮
- `outline` - 轮廓按钮
- `ghost` - 幽灵按钮
- `danger` - 危险操作
- `success` - 成功操作

**尺寸**：

- `xs` - 超小
- `sm` - 小
- `md` - 中等（默认）
- `lg` - 大
- `xl` - 超大

#### 输入框 (Input)

用于收集用户输入。

```tsx
<Input
  label="邮箱"
  type="email"
  placeholder="example@email.com"
  error={error}
  helperText="我们不会分享您的邮箱"
/>
```

**特性**：

- 支持多种输入类型（文本、密码、邮箱、电话等）
- 内置表单验证
- 帮助文本和错误提示
- 密码可见性切换

#### 卡片 (Card)

用于组织和展示内容。

```tsx
<Card shadow="lg">
  <CardImage src="/image.jpg" alt="Card image" />
  <CardBody>
    <CardTitle>卡片标题</CardTitle>
    <CardText>卡片内容描述</CardText>
  </CardBody>
  <CardFooter>
    <Button>操作按钮</Button>
  </CardFooter>
</Card>
```

**特性**：

- 多种阴影级别
- 可点击交互
- 灵活的内部布局

#### 模态框 (Modal)

用于显示对话框、表单等内容。

```tsx
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="确认操作"
  size="md"
  footer={
    <>
      <Button variant="outline" onClick={handleClose}>
        取消
      </Button>
      <Button variant="danger" onClick={handleConfirm}>
        确认
      </Button>
    </>
  }
>
  <p>您确定要执行此操作吗？</p>
</Modal>
```

**特性**：

- 多种尺寸
- 动画过渡
- 键盘导航（ESC 关闭）
- 可定制页脚

## 响应式设计

### 移动优先

使用 `min-width` 媒体查询：

```css
/* 默认样式（移动端） */
.container {
  padding: var(--spacing-4);
}

/* 平板及以上 */
@media (min-width: 768px) {
  .container {
    padding: var(--spacing-6);
  }
}

/* 桌面及以上 */
@media (min-width: 1024px) {
  .container {
    padding: var(--spacing-8);
  }
}
```

### Tailwind 响应式类

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">{/* 响应式网格 */}</div>
```

## 主题系统

### 亮色主题（默认）

```css
:root {
  --color-primary-600: #2563eb;
  --color-gray-900: #111827;
  --color-gray-50: #f9fafb;
}
```

### 暗色主题

```css
.dark {
  --color-primary-600: #60a5fa;
  --color-gray-900: #f9fafb;
  --color-gray-50: #111827;
}
```

### 主题切换

```tsx
// 使用 Tailwind 的 dark: 前缀
<div className="bg-white dark:bg-gray-900">
  <p className="text-gray-900 dark:text-gray-100">主题切换示例</p>
</div>
```

## 无障碍指南

### 颜色对比度

确保文本和背景之间有足够的对比度：

- 正常文本：至少 4.5:1
- 大号文本：至少 3:1
- UI 组件：至少 3:1

### 键盘导航

所有交互元素都应该可以通过键盘访问：

- 使用语义化的 HTML 元素
- 提供明显的焦点样式
- 支持 Tab 键导航
- 支持 Enter/Space 键激活

### ARIA 标签

为屏幕阅读器提供额外的上下文：

```tsx
<button aria-label="关闭对话框" onClick={handleClose}>
  ×
</button>

<input
  aria-required="true"
  aria-invalid={hasError}
  aria-describedby="email-help"
/>

<div id="email-help">请输入有效的邮箱地址</div>
```

## 性能优化

### 组件懒加载

```tsx
import dynamic from 'next/dynamic'

const Modal = dynamic(() => import('@/components/ui/Modal'), {
  loading: () => <div>Loading...</div>,
  ssr: false,
})
```

### 图片优化

```tsx
import Image from 'next/image'
;<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority={isAboveFold}
  placeholder="blur"
/>
```

### 代码分割

```tsx
// 动态导入
const heavyComponent = lazy(() => import('./HeavyComponent'))

;<Suspense fallback={<Loading />}>
  <heavyComponent />
</Suspense>
```

## 工具和资源

### Storybook

运行 Storybook 查看交互式组件文档：

```bash
npm run storybook
```

访问：http://localhost:6006

### 开发指南

1. **组件开发**：遵循组件接口规范
2. **测试**：为每个组件编写单元测试
3. **文档**：使用 Storybook 添加组件文档
4. **审查**：提交前进行代码审查

### 相关链接

- [Storybook 文档](https://storybook.js.org/)
- [Next.js 文档](https://nextjs.org/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [WCAG 指南](https://www.w3.org/WAI/WCAG21/quickref/)

## 版本历史

### v1.0.0 (2024-03-28)

初始版本发布：

- ✅ 核心 UI 组件（Button, Input, Card, Modal）
- ✅ 设计 Token 系统
- ✅ 响应式断点系统
- ✅ Storybook 集成
- ✅ 主题切换支持
- ✅ 设计系统文档站点

## 贡献指南

欢迎贡献新的组件或改进现有组件：

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License
