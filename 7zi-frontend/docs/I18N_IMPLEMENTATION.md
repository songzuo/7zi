# 7zi-frontend 国际化 (i18n) 实现文档

## 概述

本项目已实现完整的中英文国际化方案，支持：

- ✅ react-i18next 集成
- ✅ 中英文切换
- ✅ 语言自动检测（Cookie + Accept-Language header）
- ✅ SSR 兼容
- ✅ 服务端和客户端翻译

## 技术栈

- **i18next**: 国际化核心库
- **react-i18next**: React 绑定
- **i18next-browser-languagedetector**: 客户端语言检测

## 目录结构

```
src/
├── lib/
│   └── i18n/
│       ├── config.ts          # i18n 配置
│       ├── client.ts          # 客户端初始化
│       ├── server.ts          # 服务端初始化
│       ├── index.ts           # 模块导出
│       └── __tests__/         # 测试文件
├── locales/
│   ├── zh/                    # 中文翻译
│   │   ├── common.json
│   │   ├── auth.json
│   │   ├── navigation.json
│   │   ├── errors.json
│   │   └── dashboard.json
│   └── en/                    # 英文翻译
│       ├── common.json
│       ├── auth.json
│       ├── navigation.json
│       ├── errors.json
│       └── dashboard.json
├── shared/
│   ├── components/
│   │   ├── LanguageSwitcher.tsx    # 语言切换器
│   │   ├── LanguageProvider.tsx     # i18n 提供者
│   │   └── index.ts
│   └── hooks/
│       ├── useServerTranslation.ts  # 服务端翻译 Hook
│       └── index.ts
├── middleware.i18n.ts          # i18n 中间件
└── middleware.ts              # 主中间件（集成 i18n）
```

## 使用方法

### 1. 在服务端组件中使用

```tsx
import { useServerTranslation } from '@/shared/hooks'

export default async function DashboardPage() {
  const { t } = await useServerTranslation('dashboard')

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('welcome', { name: 'User' })}</p>
    </div>
  )
}
```

### 2. 在客户端组件中使用

```tsx
'use client'

import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/shared/components'

export default function UserProfile() {
  const { t } = useTranslation('common')

  return (
    <div>
      <LanguageSwitcher />
      <h2>{t('profile')}</h2>
      <p>{t('email')}: user@example.com</p>
    </div>
  )
}
```

### 3. 在 API 路由中使用

```tsx
import { createServerI18n } from '@/lib/i18n/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // 从 Cookie 获取语言
  const lng = request.cookies.get('i18next')?.value || 'zh'

  // 创建 i18n 实例
  const i18n = await createServerI18n(lng, 'errors')
  const t = i18n.getFixedT(lng, 'errors')

  return NextResponse.json({
    error: t('generic'),
  })
}
```

### 4. 在根布局中添加 LanguageProvider

```tsx
import { LanguageProvider } from '@/shared/components'
import { cookies } from 'next/headers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies()
  const initialLanguage = cookieStore.get('i18next')?.value

  return (
    <html lang={initialLanguage || 'zh'}>
      <body>
        <LanguageProvider initialLanguage={initialLanguage}>{children}</LanguageProvider>
      </body>
    </html>
  )
}
```

## 语言切换器

LanguageSwitcher 组件提供三种显示模式：

### Dropdown 模式（默认）

```tsx
<LanguageSwitcher variant="dropdown" />
```

### Buttons 模式

```tsx
<LanguageSwitcher variant="buttons" />
```

### Compact 模式

```tsx
<LanguageSwitcher variant="compact" />
```

### 自定义样式

```tsx
<LanguageSwitcher
  variant="buttons"
  className="my-custom-class"
  onChange={lng => console.log('Language changed:', lng)}
/>
```

## 翻译文件

### 添加新的翻译键

1. 在相应的 JSON 文件中添加键值对：

```json
{
  "newFeature": {
    "title": "新功能",
    "description": "这是一个很棒的功能"
  }
}
```

2. 在组件中使用：

```tsx
const { t } = useTranslation('newFeature')
console.log(t('title')) // "新功能"
```

### 添加新的命名空间

1. 在 `src/lib/i18n/config.ts` 中添加：

```ts
ns: ['common', 'auth', 'navigation', 'errors', 'dashboard', 'newNamespace'],
```

2. 创建翻译文件：

```
src/locales/zh/newNamespace.json
src/locales/en/newNamespace.json
```

3. 在组件中使用：

```tsx
const { t } = useTranslation('newNamespace')
```

## 语言检测

语言检测优先级：

1. **Cookie** (`i18next`)
2. **Accept-Language header**
3. **默认语言** (`zh`)

### 客户端检测

客户端使用 `i18next-browser-languagedetector` 自动检测：

```ts
// 配置选项
{
  order: ['cookie', 'localStorage', 'navigator', 'htmlTag'],
  lookupCookie: 'i18next',
  lookupLocalStorage: 'i18nextLng',
  caches: ['cookie', 'localStorage'],
}
```

### 服务端检测

服务端在中间件中检测：

```ts
function detectLanguage(request: NextRequest): string {
  // 1. 检查 Cookie
  const cookieLang = request.cookies.get('i18next')?.value

  // 2. 检查 Accept-Language header
  const acceptLang = request.headers.get('accept-language')

  // 3. 返回默认语言
  return normalizedLanguage || defaultLanguage
}
```

## SSR 兼容性

### 服务端组件 (RSC)

使用 `useServerTranslation` Hook：

```tsx
export default async function ServerComponent() {
  const { t, lng } = await useServerTranslation('common')
  return <div>{t('welcome')}</div>
}
```

### 客户端组件

使用 `useTranslation` Hook：

```tsx
'use client'
import { useTranslation } from 'react-i18next'

export function ClientComponent() {
  const { t } = useTranslation('common')
  return <div>{t('welcome')}</div>
}
```

### 混合使用

```tsx
// 服务端部分
export default async function Page() {
  const { t } = await useServerTranslation('common')

  return (
    <div>
      <h1>{t('title')}</h1>
      <ClientPart />
    </div>
  )
}

// 客户端部分
;('use client')
function ClientPart() {
  const { t } = useTranslation('common')
  return <p>{t('description')}</p>
}
```

## 配置选项

在 `src/lib/i18n/config.ts` 中修改：

```ts
export const i18nConfig: InitOptions = {
  supportedLngs: ['zh', 'en'],
  fallbackLng: 'zh',
  defaultNS: 'common',
  ns: ['common', 'auth', 'navigation', 'errors', 'dashboard'],
  debug: process.env.NODE_ENV === 'development',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false, // SSR 兼容
  },
}
```

## 测试

### 运行测试

```bash
npm test
```

### 测试覆盖率

```bash
npm run test:coverage
```

### 添加测试

```tsx
import { render, screen } from '@testing-library/react'
import { LanguageSwitcher } from '@/shared/components'

it('should render language switcher', () => {
  render(<LanguageSwitcher />)
  expect(screen.getByRole('combobox')).toBeInTheDocument()
})
```

## 最佳实践

### 1. 翻译键命名

- 使用点号分隔的命名空间：`'dashboard.title'`
- 使用有意义且一致的命名：`'auth.login.title'`
- 避免过深的嵌套

### 2. 插值

使用插值变量：

```tsx
// 翻译文件
{
  "welcome": "欢迎, {{name}}!",
  "count": "你有 {{count}} 条消息"
}

// 使用
t('welcome', { name: 'John' });
t('count', { count: 5 });
```

### 3. 复数

使用复数形式（需要 i18next-plural）：

```json
{
  "item_one": "1 个项目",
  "item_other": "{{count}} 个项目"
}
```

### 4. 格式化

使用格式化功能：

```tsx
t('date', { val: new Date(), formatParams: { val: { year: 'numeric' } } })
```

## 故障排除

### 问题：翻译不显示

**解决方案**：

1. 检查翻译文件是否存在
2. 检查命名空间是否正确
3. 检查翻译键是否拼写正确
4. 在开发环境中查看控制台警告

### 问题：语言不切换

**解决方案**：

1. 检查 Cookie 是否设置
2. 检查中间件是否正确配置
3. 清除浏览器缓存和 Cookie
4. 查看网络请求

### 问题：SSR 水合错误

**解决方案**：

1. 确保 `useSuspense: false` 在配置中
2. 使用 `LanguageProvider` 包裹根组件
3. 使用 `useServerTranslation` 在服务端组件中

### 问题：翻译文件过大

**解决方案**：

1. 按功能拆分命名空间
2. 使用代码分割
3. 按需加载翻译

## 性能优化

### 1. 代码分割

```ts
// 按命名空间拆分
import zhAuth from '@/locales/zh/auth.json'
import enAuth from '@/locales/en/auth.json'
```

### 2. 懒加载

```ts
// 延迟加载翻译
i18n.loadNamespaces(['lazy-namespace'], () => {
  // 加载完成后回调
})
```

### 3. 缓存

```ts
// 启用缓存
{
  caches: ['cookie', 'localStorage'],
  excludeCacheFor: ['cimode'],
}
```

## 扩展

### 添加新语言

1. 在 `src/lib/i18n/config.ts` 中添加语言：

```ts
export const supportedLanguages = ['zh', 'en', 'ja'] as const
```

2. 创建翻译文件：

```
src/locales/ja/
├── common.json
├── auth.json
└── ...
```

3. 更新语言名称：

```ts
export const languageNames = {
  zh: '中文',
  en: 'English',
  ja: '日本語',
}
```

### 添加翻译管理工具

使用 i18next-locize-backend 或类似工具进行翻译管理：

```ts
import Backend from 'i18next-locize-backend'

i18n.use(Backend).init({
  backend: {
    projectId: 'your-project-id',
    apiKey: 'your-api-key',
    referenceLng: 'zh',
  },
})
```

## 参考资料

- [i18next 文档](https://www.i18next.com/)
- [react-i18next 文档](https://react.i18next.com/)
- [Next.js 国际化](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
- [i18next Browser LanguageDetector](https://github.com/i18next/i18next-browser-languageDetector)

## 更新日志

### 2026-03-28

- ✅ 初始实现
- ✅ 支持中英文
- ✅ SSR 兼容
- ✅ 语言自动检测
- ✅ 完整的测试覆盖
