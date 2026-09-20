# i18n（国际化）使用指南

本指南介绍如何在 7zi 项目中使用国际化功能。

---

## 📚 目录结构

```
src/i18n/
├── config.ts              # 语言和路由配置
├── request.ts             # 服务端请求配置
├── client.ts              # 客户端 hooks
├── routing.ts             # 路由导航工具
├── hooks.ts               # 高级 hooks 和工具函数
├── utils.ts               # 通用工具函数
├── index.ts               # 导出入口
└── messages/              # 翻译文件
    ├── zh.json            # 中文
    ├── en.json            # 英文
    ├── ja.json            # 日语（待添加）
    ├── ko.json            # 韩语（待添加）
    ├── fr.json            # 法语（待添加）
    └── de.json            # 德语（待添加）
```

---

## 🌍 支持的语言

| 语言代码 | 语言名称 | 区域标签 | 状态      |
| -------- | -------- | -------- | --------- |
| `zh`     | 中文     | `zh-CN`  | ✅ 完成   |
| `en`     | English  | `en-US`  | ✅ 完成   |
| `ja`     | 日本語   | `ja-JP`  | 🚧 待完成 |
| `ko`     | 한국어   | `ko-KR`  | 🚧 待完成 |
| `fr`     | Français | `fr-FR`  | 🚧 待完成 |
| `de`     | Deutsch  | `de-DE`  | 🚧 待完成 |

---

## 🚀 快速开始

### 1. 在服务器组件中使用

```tsx
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

type Params = Promise<{ locale: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'home' })

  return {
    title: t('meta.title'),
    description: t('meta.description'),
  }
}

export default async function HomePage({ params }: { params: Params }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'home' })

  return (
    <div>
      <h1>{t('hero.title')}</h1>
      <p>{t('hero.description')}</p>
    </div>
  )
}
```

### 2. 在客户端组件中使用

```tsx
'use client'

import { useTranslations } from '@/i18n/client'

export function HeroSection() {
  const t = useTranslations('home.hero')

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
      <button>{t('cta1')}</button>
    </div>
  )
}
```

### 3. 使用预定义的 hooks

```tsx
'use client'

import { useHomeTranslations } from '@/i18n/hooks'

export function HeroSection() {
  const t = useHomeTranslations()

  return (
    <div>
      <h1>{t('hero.title')}</h1>
    </div>
  )
}
```

### 4. 使用路由导航

```tsx
'use client'

import { Link } from '@/i18n/routing'
import { useTranslations } from '@/i18n/client'

export function Navigation() {
  const t = useTranslations('nav')

  return (
    <nav>
      <Link href="/">{t('home')}</Link>
      <Link href="/about">{t('about')}</Link>
      <Link href="/team">{t('team')}</Link>
    </nav>
  )
}
```

---

## 📝 添加翻译

### 1. 在翻译文件中添加新键

**`src/i18n/messages/zh.json`**:

```json
{
  "myComponent": {
    "title": "标题",
    "description": "描述",
    "button": "点击我"
  }
}
```

**`src/i18n/messages/en.json`**:

```json
{
  "myComponent": {
    "title": "Title",
    "description": "Description",
    "button": "Click Me"
  }
}
```

### 2. 在组件中使用翻译

```tsx
'use client'

import { useTranslations } from '@/i18n/client'

export function MyComponent() {
  const t = useTranslations('myComponent')

  return (
    <div>
      <h2>{t('title')}</h2>
      <p>{t('description')}</p>
      <button>{t('button')}</button>
    </div>
  )
}
```

---

## 🔧 高级用法

### 1. 带参数的翻译

**翻译文件**:

```json
{
  "greeting": "你好, {name}!",
  "items": "你有 {count} 个项目"
}
```

**使用方式**:

```tsx
const t = useTranslations();

<p>{t('greeting', { name: '张三' })}</p>
<p>{t('items', { count: 5 })}</p>
```

### 2. 获取当前语言

```tsx
'use client'

import { useLocale } from '@/i18n/client'

export function LanguageInfo() {
  const locale = useLocale()

  return (
    <div>
      <p>当前语言: {locale}</p>
    </div>
  )
}
```

### 3. 使用工具函数

```tsx
'use client'

import { useLocale, formatDate, formatNumber } from '@/i18n/hooks'

export function DateTime() {
  const locale = useLocale()
  const now = new Date()

  return (
    <div>
      <p>日期: {formatDate(now, locale)}</p>
      <p>数字: {formatNumber(1234.56, locale)}</p>
    </div>
  )
}
```

### 4. 动态命名空间

```tsx
'use client';

import { useTranslations } from '@/i18n/client';

export function DynamicSection({ section }: { section: string }) {
  const t = useTranslations(section);

  return (
    <div>
      <h2>{t('title')}</h2>
    </div>
  );
}

// 使用
<DynamicSection section="home" />
<DynamicSection section="about" />
```

---

## 🛠️ 工具函数

### 获取语言名称

```tsx
import { getLocaleName } from '@/i18n/hooks'

const name = getLocaleName('zh') // '中文'
const name = getLocaleName('en') // 'English'
```

### 获取语言标签

```tsx
import { getLocaleTag } from '@/i18n/hooks'

const tag = getLocaleTag('zh') // 'zh-CN'
const tag = getLocaleTag('en') // 'en-US'
```

### 检查是否为 RTL 语言

```tsx
import { isRTL } from '@/i18n/hooks'

const isRtl = isRTL('ar') // true
const isRtl = isRTL('zh') // false
```

### 格式化日期

```tsx
import { formatDate } from '@/i18n/hooks'

const date = new Date()
const formatted = formatDate(date, 'zh') // '2024年3月26日'
```

### 格式化数字

```tsx
import { formatNumber } from '@/i18n/hooks'

const formatted = formatNumber(1234.56, 'en') // '1,234.56'
```

### 格式化货币

```tsx
import { formatCurrency } from '@/i18n/hooks'

const formatted = formatCurrency(1234.56, 'en', 'USD') // '$1,234.56'
```

---

## 📋 命名规范

### 翻译键命名

- 使用点号 `.` 分隔层级
- 使用小写驼峰命名
- 保持语义清晰

**好的示例**:

```json
{
  "home": {
    "hero": {
      "title": "标题",
      "description": "描述"
    },
    "features": {
      "title": "功能"
    }
  }
}
```

**使用方式**:

```tsx
const t = useTranslations('home')
t('hero.title') // ✅ 清晰
t('features.title') // ✅ 清晰
```

### 避免的命名

**不好的示例**:

```json
{
  "homePageHeroTitle": "标题",
  "homePageHeroDescription": "描述"
}
```

**使用方式**:

```tsx
t('homePageHeroTitle') // ❌ 太长，不易维护
```

---

## 🧪 测试

### 单元测试

```tsx
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  it('renders Chinese text correctly', () => {
    const messages = {
      myComponent: {
        title: '标题',
      },
    }

    render(
      <NextIntlClientProvider messages={messages} locale="zh">
        <MyComponent />
      </NextIntlClientProvider>
    )

    expect(screen.getByText('标题')).toBeInTheDocument()
  })

  it('renders English text correctly', () => {
    const messages = {
      myComponent: {
        title: 'Title',
      },
    }

    render(
      <NextIntlClientProvider messages={messages} locale="en">
        <MyComponent />
      </NextIntlClientProvider>
    )

    expect(screen.getByText('Title')).toBeInTheDocument()
  })
})
```

---

## 🔍 调试

### 1. 检查当前语言

```tsx
'use client'

import { useLocale } from '@/i18n/client'

export function DebugLocale() {
  const locale = useLocale()

  return (
    <div style={{ position: 'fixed', bottom: 10, right: 10, background: 'white', padding: 10 }}>
      当前语言: {locale}
    </div>
  )
}
```

### 2. 检查翻译键是否存在

```tsx
'use client'

import { useTranslations } from '@/i18n/client'

export function DebugTranslations() {
  const t = useTranslations()

  return (
    <div>
      <p>{t('common.siteName')}</p>
      <p>{t('nav.home')}</p>
      {/* 不存在的键会返回键本身 */}
      <p>{t('nonexistent.key')}</p> {/* 输出: 'nonexistent.key' */}
    </div>
  )
}
```

---

## 📖 最佳实践

### 1. 避免硬编码文本

❌ **不要这样做**:

```tsx
export function Header() {
  return <h1>首页</h1>
}
```

✅ **应该这样做**:

```tsx
import { useTranslations } from '@/i18n/client'

export function Header() {
  const t = useTranslations('nav')
  return <h1>{t('home')}</h1>
}
```

### 2. 使用命名空间组织翻译

❌ **不要这样做**:

```json
{
  "homeHeroTitle": "标题",
  "homeHeroDescription": "描述",
  "aboutTitle": "关于",
  "aboutDescription": "关于描述"
}
```

✅ **应该这样做**:

```json
{
  "home": {
    "hero": {
      "title": "标题",
      "description": "描述"
    }
  },
  "about": {
    "title": "关于",
    "description": "关于描述"
  }
}
```

### 3. 保持翻译一致性

确保同一条术语在不同地方使用相同的翻译键和翻译文本。

### 4. 处理复数形式

```tsx
// 使用参数处理复数
const t = useTranslations();

<p>{t('items.count', { count: 1 })}</p>  // "1 个项目"
<p>{t('items.count', { count: 5 })}</p>  // "5 个项目"
```

### 5. 处理长文本

对于长文本，考虑分段翻译：

```json
{
  "about": {
    "intro": "我们是一个创新的数字工作室。",
    "mission": "我们的使命是提供卓越的数字解决方案。",
    "vision": "我们的愿景是成为行业领导者。"
  }
}
```

```tsx
<div>
  <p>{t('intro')}</p>
  <p>{t('mission')}</p>
  <p>{t('vision')}</p>
</div>
```

---

## 🚨 常见问题

### Q1: 翻译不显示怎么办？

1. 检查翻译键是否正确
2. 检查命名空间是否正确
3. 检查翻译文件是否存在
4. 检查浏览器控制台是否有错误

### Q2: 如何处理动态内容？

使用参数传递动态值：

```tsx
const t = useTranslations()
;<p>{t('greeting', { name: userName })}</p>
```

### Q3: 如何切换语言？

使用语言切换器组件：

```tsx
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
;<LanguageSwitcher />
```

### Q4: 如何添加新语言？

1. 在 `src/i18n/config.ts` 中添加语言代码
2. 创建对应的翻译文件 `src/i18n/messages/{locale}.json`
3. 更新 `pathnames` 配置（如果需要）

### Q5: 翻译文件太大怎么办？

考虑按页面分割翻译文件：

```json
// messages/home.json
{
  "home": {
    // 首页相关翻译
  }
}

// messages/about.json
{
  "about": {
    // 关于页面相关翻译
  }
}
```

---

## 📚 参考资料

- [next-intl 官方文档](https://next-intl-docs.vercel.app/)
- [Next.js 国际化指南](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
- [实施计划](./i18n-implementation-plan.md)

---

_文档版本：1.0_
_最后更新：2026-03-26_
