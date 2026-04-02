# I18n 国际化架构设计文档

> **版本**: 1.0.0  
> **更新日期**: 2026-03-06  
> **架构师**: AI Architect Agent

---

## 📋 目录

1. [架构概述](#架构概述)
2. [技术选型](#技术选型)
3. [目录结构](#目录结构)
4. [核心配置](#核心配置)
5. [使用指南](#使用指南)
6. [最佳实践](#最佳实践)
7. [组件集成](#组件集成)
8. [SEO 优化](#seo-优化)
9. [测试策略](#测试策略)
10. [扩展计划](#扩展计划)

---

## 架构概述

### 设计目标

- ✅ **无缝切换**: 用户可在任意页面切换语言，保持当前路由
- ✅ **SEO 友好**: 多语言 SEO 优化，支持 hreflang 标签
- ✅ **类型安全**: TypeScript 完整支持，翻译键自动提示
- ✅ **性能优化**: 按需加载翻译文件，静态生成支持
- ✅ **开发体验**: 简洁 API，自动命名空间管理

### 支持语言

| 语言代码 | 语言名称 | Flag | 区域设置 |
| -------- | -------- | ---- | -------- |
| `zh`     | 中文     | 🇨🇳   | zh_CN    |
| `en`     | English  | 🇺🇸   | en_US    |

---

## 技术选型

### 核心库

```json
{
  "next-intl": "^4.8.3"
}
```

### 选择 next-intl 的理由

| 特性            | next-intl            | 其他方案      |
| --------------- | -------------------- | ------------- |
| App Router 支持 | ✅ 原生支持          | ⚠️ 需额外配置 |
| 服务端渲染      | ✅ 内置 SSR/SSG      | ⚠️ 需手动处理 |
| 路由集成        | ✅ 自动路由前缀      | ❌ 需手动配置 |
| TypeScript      | ✅ 类型安全          | ⚠️ 部分支持   |
| SEO 优化        | ✅ hreflang 自动生成 | ❌ 需手动配置 |
| 维护状态        | ✅ 活跃维护          | ⚠️ 参差不齐   |

---

## 目录结构

```
src/
├── i18n/                          # i18n 核心目录
│   ├── config.ts                  # 语言配置
│   ├── routing.ts                 # 路由配置
│   ├── request.ts                 # 服务端请求配置
│   ├── client.ts                  # 客户端 hooks
│   ├── utils.ts                   # 辅助函数
│   ├── index.ts                   # 统一导出
│   └── messages/                  # 翻译文件
│       ├── zh.json                # 中文翻译
│       └── en.json                # 英文翻译
│
├── app/
│   ├── [locale]/                  # 动态语言路由
│   │   ├── layout.tsx             # 多语言 Layout
│   │   ├── page.tsx               # 首页
│   │   ├── about/                 # 关于页面
│   │   ├── team/                  # 团队页面
│   │   ├── contact/               # 联系页面
│   │   ├── blog/                  # 博客页面
│   │   └── dashboard/             # Dashboard
│   ├── layout.tsx                 # 根 Layout
│   └── globals.css                # 全局样式
│
├── middleware.ts                  # 中间件 (语言检测/重定向)
│
└── components/
    └── LanguageSwitcher.tsx       # 语言切换组件
```

---

## 核心配置

### 1. 语言配置 (`src/i18n/config.ts`)

```typescript
import { Pathnames, LocalePrefix } from 'next-intl/routing'

export const locales = ['zh', 'en'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'zh'

export const pathnames: Pathnames<typeof locales> = {
  '/': '/',
  '/about': {
    zh: '/about',
    en: '/about',
  },
  '/team': {
    zh: '/team',
    en: '/team',
  },
  '/contact': {
    zh: '/contact',
    en: '/contact',
  },
  '/blog': {
    zh: '/blog',
    en: '/blog',
  },
  '/dashboard': {
    zh: '/dashboard',
    en: '/dashboard',
  },
}

// 静态导出模式下使用 'always' 前缀策略
export const localePrefix: LocalePrefix<typeof locales> = 'always'
```

**关键点**:

- `locales`: 支持的语言列表
- `defaultLocale`: 默认语言
- `pathnames`: 路径映射（可本地化）
- `localePrefix`: URL 前缀策略

### 2. 路由配置 (`src/i18n/routing.ts`)

```typescript
import { createNavigation } from 'next-intl/navigation'
import { defineRouting } from 'next-intl/routing'
import { locales, defaultLocale, pathnames, localePrefix } from './config'

export const routing = defineRouting({
  locales,
  defaultLocale,
  pathnames,
  localePrefix,
})

// 创建导航工具
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
```

**导出的导航工具**:

- `Link`: 多语言链接组件
- `redirect`: 服务端重定向
- `usePathname`: 获取当前路径
- `useRouter`: 多语言路由
- `getPathname`: 获取本地化路径

### 3. 中间件 (`src/proxy.ts`)

```typescript
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  matcher: ['/', '/(zh|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)'],
}
```

**功能**:

- 自动语言检测
- URL 前缀处理
- 语言切换重定向

### 4. 请求配置 (`src/i18n/request.ts`)

```typescript
import { getRequestConfig } from 'next-intl/server'
import { locales, defaultLocale, Locale } from './config'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale

  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  }
})
```

---

## 使用指南

### 服务端使用

#### 获取翻译

```typescript
import { getTranslations } from 'next-intl/server';
import { Locale } from '@/i18n/config';

// 在 Server Component 中
export default async function Page({ params }: { params: { locale: Locale } }) {
  const t = await getTranslations({ locale: params.locale, namespace: 'home' });

  return (
    <div>
      <h1>{t('hero.title1')}</h1>
      <p>{t('hero.description')}</p>
    </div>
  );
}
```

#### 嵌套命名空间

```typescript
const t = await getTranslations({ locale, namespace: 'about.intro' })
// 访问 about.intro.p1
```

### 客户端使用

#### 使用 Hook

```typescript
'use client';

import { useTranslations, useLocale } from '@/i18n/client';

export function MyComponent() {
  const t = useTranslations('home');
  const locale = useLocale();

  return (
    <div>
      <h1>{t('hero.title1')}</h1>
      <p>Current locale: {locale}</p>
    </div>
  );
}
```

#### 使用原生 next-intl

```typescript
'use client'

import { useTranslations, useLocale } from 'next-intl'

export function MyComponent() {
  const t = useTranslations('home')
  const locale = useLocale()
  // ... 同上
}
```

### 辅助函数

```typescript
import { getServerTranslations, formatDate, formatNumber } from '@/i18n/utils'

// 服务端获取翻译
const { t } = await getServerTranslations(locale, 'namespace')

// 格式化日期
const dateStr = formatDate('zh', new Date(), {
  year: 'numeric',
  month: 'long',
})
// 输出: "2026年3月"

// 格式化数字
const numStr = formatNumber('en', 1234567.89)
// 输出: "1,234,567.89"
```

---

## 最佳实践

### 1. 翻译键命名规范

```json
{
  "namespace": {
    "component": {
      "element": "翻译文本"
    }
  }
}
```

**示例**:

```json
{
  "home": {
    "hero": {
      "title1": "用 AI 重新定义",
      "cta1": "了解更多"
    },
    "services": {
      "web": {
        "title": "网站开发"
      }
    }
  }
}
```

### 2. 组件内使用

```typescript
// ✅ 推荐: 明确命名空间
const t = useTranslations('home.hero')

// ❌ 不推荐: 无命名空间
const t = useTranslations()
```

### 3. 避免硬编码

```typescript
// ❌ 错误
<h1>Welcome to our website</h1>

// ✅ 正确
<h1>{t('welcome')}</h1>
```

### 4. 动态内容处理

```typescript
// 翻译文件
{
  "greeting": "你好，{name}！",
  "items": "共 {count} 项"
}

// 组件使用
t('greeting', { name: '张三' })
t('items', { count: 5 })
```

### 5. 复数处理

```json
{
  "items_one": "{count} 项",
  "items_other": "{count} 项"
}
```

```typescript
t('items', { count: 1 }) // "1 项"
t('items', { count: 5 }) // "5 项"
```

### 6. 富文本翻译

```typescript
// 使用 Trans 组件处理富文本
import { Trans } from 'next-intl';

<Trans
  i18nKey="agreement"
  values={{ link: '/terms' }}
  components={{
    a: <a className="text-cyan-500" />
  }}
/>
```

---

## 组件集成

### LanguageSwitcher 组件

位置: `src/components/LanguageSwitcher.tsx`

#### 完整版 (下拉菜单)

```tsx
<LanguageSwitcher />
```

功能:

- 显示当前语言和 flag
- 悬停展开下拉菜单
- 保持当前路由切换语言

#### 简洁版 (图标切换)

```tsx
<LanguageSwitcherCompact />
```

功能:

- 仅显示切换目标语言 flag
- 点击直接切换
- 适合 header 空间有限场景

### 集成到 Header

```typescript
// src/components/Header.tsx
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export function Header() {
  return (
    <header>
      {/* 其他内容 */}
      <LanguageSwitcher />
    </header>
  );
}
```

### Link 组件使用

```typescript
import { Link } from '@/i18n/routing';

// 自动处理语言前缀
<Link href="/about">关于我们</Link>

// 输出: /zh/about 或 /en/about
```

### useRouter 使用

```typescript
import { useRouter, usePathname } from '@/i18n/routing';

function Navigation() {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigate = () => {
    router.push('/about');
    // 或带参数
    router.push('/blog', { query: { id: '123' } });
  };

  return <button onClick={handleNavigate}>Navigate</button>;
}
```

---

## SEO 优化

### 1. Layout 多语言元数据

```typescript
// src/app/[locale]/layout.tsx
export async function generateMetadata({ params }) {
  const { locale } = await params

  return {
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: {
        'zh-CN': `${baseUrl}/zh`,
        'en-US': `${baseUrl}/en`,
        'x-default': `${baseUrl}/zh`,
      },
    },
  }
}
```

### 2. hreflang 标签

```tsx
<head>
  <link rel="alternate" hrefLang="zh-CN" href={`${baseUrl}/zh`} />
  <link rel="alternate" hrefLang="en-US" href={`${baseUrl}/en`} />
  <link rel="alternate" hrefLang="x-default" href={`${baseUrl}/zh`} />
</head>
```

### 3. Open Graph 多语言

```typescript
openGraph: {
  locale: locale === 'zh' ? 'zh_CN' : 'en_US',
  url: `${baseUrl}/${locale}`,
  // ...
}
```

### 4. 结构化数据

```typescript
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "7zi Studio",
  "url": "https://7zi.studio",
  "inLanguage": ["zh-CN", "en-US"]
}
</script>
```

---

## 测试策略

### 单元测试

```typescript
// src/test/components/LanguageSwitcher.test.tsx
import { render, screen } from '@testing-library/react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

describe('LanguageSwitcher', () => {
  it('renders current language', () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText('中文')).toBeInTheDocument();
  });
});
```

### E2E 测试

```typescript
// e2e/i18n.spec.ts
import { test, expect } from '@playwright/test'

test('language switch preserves route', async ({ page }) => {
  await page.goto('/zh/about')
  await page.click('[aria-label="Switch language"]')
  await page.click('text=English')
  await expect(page).toHaveURL('/en/about')
})
```

### 翻译完整性测试

```typescript
// scripts/check-translations.ts
import zh from '../src/i18n/messages/zh.json'
import en from '../src/i18n/messages/en.json'

function checkKeys(obj1: any, obj2: any, path = '') {
  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)

  const missing = keys1.filter(k => !keys2.includes(k))
  if (missing.length > 0) {
    console.warn(`Missing keys in en.json at ${path}:`, missing)
  }

  // 递归检查嵌套对象
  keys1.forEach(k => {
    if (typeof obj1[k] === 'object') {
      checkKeys(obj1[k], obj2[k] || {}, `${path}.${k}`)
    }
  })
}

checkKeys(zh, en)
```

---

## 扩展计划

### 短期计划 (已完成)

- [x] 核心配置文件
- [x] 中英文翻译文件
- [x] 语言切换组件
- [x] 路由集成
- [x] SEO 优化

### 中期计划

- [ ] 添加更多语言 (日语、韩语)
- [ ] 实现语言检测 (浏览器偏好)
- [ ] 添加翻译管理工具
- [ ] 实现 ICU 消息格式

### 长期计划

- [ ] 接入翻译管理系统 (Crowdin/Phrase)
- [ ] 自动翻译 CI/CD 流程
- [ ] A/B 测试多语言文案
- [ ] 本地化图片和资源

---

## 常见问题

### Q: 如何添加新页面？

1. 在 `src/app/[locale]/` 下创建页面目录
2. 在 `src/i18n/config.ts` 的 `pathnames` 中添加路径映射
3. 在翻译文件中添加对应翻译

### Q: 如何添加新语言？

1. 在 `src/i18n/config.ts` 添加语言代码
2. 创建新的翻译文件 `src/i18n/messages/xx.json`
3. 更新中间件 matcher
4. 更新 SEO 元数据

### Q: 如何获取当前语言？

```typescript
// 服务端
import { getLocale } from 'next-intl/server'
const locale = await getLocale()

// 客户端
import { useLocale } from 'next-intl'
const locale = useLocale()
```

### Q: 如何在非页面组件中使用翻译？

```typescript
// 服务端组件
import { getTranslations } from 'next-intl/server'
const t = await getTranslations('namespace')

// 客户端组件
;('use client')
import { useTranslations } from 'next-intl'
const t = useTranslations('namespace')
```

---

## 性能优化

### 1. 按需加载翻译

```typescript
// request.ts 自动处理
messages: (await import(`./messages/${locale}.json`)).default
```

### 2. 静态生成

```typescript
// layout.tsx
export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }))
}
```

### 3. 翻译文件分割

未来可按页面/功能模块分割翻译文件:

```
messages/
├── zh/
│   ├── common.json
│   ├── home.json
│   └── about.json
└── en/
    ├── common.json
    ├── home.json
    └── about.json
```

---

## 架构优化建议

### 1. Navigation 组件 i18n 集成

当前 `Navigation.tsx` 使用 `next/link`，建议改用 i18n Link：

```typescript
// 当前
import Link from 'next/link'

// 推荐
import { Link } from '@/i18n/routing'
```

### 2. 导航项国际化

```typescript
// 使用翻译替代硬编码
import { useTranslations } from 'next-intl';

const NAV_ITEMS = [
  { href: '/', labelKey: 'nav.home', icon: '🏠' },
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: '📊' },
  // ...
];

function Navigation() {
  const t = useTranslations();

  return (
    // ...
    <Link href={item.href}>
      <span>{item.icon}</span>
      <span>{t(item.labelKey)}</span>
    </Link>
    // ...
  );
}
```

### 3. 语言持久化

```typescript
// 在 middleware 或 layout 中保存用户偏好
import { cookies } from 'next/headers'

// 保存语言偏好
cookies().set('locale', locale, { maxAge: 60 * 60 * 24 * 365 })

// 读取语言偏好
const savedLocale = cookies().get('locale')?.value
```

---

## 维护指南

### 添加新翻译

1. 在 `zh.json` 和 `en.json` 中同时添加
2. 保持键名一致
3. 运行翻译完整性检查脚本

### 更新现有翻译

1. 修改对应语言文件
2. 测试页面显示
3. 检查 SEO 元数据

### 翻译审核流程

1. 开发添加翻译键
2. 内容审核文案
3. QA 测试显示效果
4. 合并到主分支

---

## 参考资料

- [next-intl 官方文档](https://next-intl-docs.vercel.app/)
- [Next.js 国际化](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
- [MDN: HTTP 内容协商](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Content_negotiation)

---

**文档维护**: 架构师 Agent  
**最后更新**: 2026-03-06
