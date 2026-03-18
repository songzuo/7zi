# 页面结构文档

**最后更新**: 2026-03-18
**版本**: v1.1.0

---

## 目录

1. [路由架构](#路由架构)
2. [页面列表](#页面列表)
3. [动态路由](#动态路由)
4. [布局系统](#布局系统)
5. [错误处理](#错误处理)
6. [SEO 配置](#seo-配置)

---

## 路由架构

### 国际化路由结构

项目使用 `next-intl` 实现国际化，所有页面都位于 `[locale]` 动态段下：

```
/               → 重定向到 /zh-CN (默认语言)
/zh-CN          → 中文首页
/en-US          → 英文首页
```

### 完整路由树

```
src/app/
├── [locale]/                    # 国际化路由段
│   ├── layout.tsx              # 语言特定布局
│   ├── page.tsx                # 首页 (/)
│   ├── about/
│   │   ├── error.tsx           # 错误边界
│   │   └── page.tsx            # 关于页面 (/about)
│   ├── blog/
│   │   ├── error.tsx
│   │   ├── page.tsx            # 博客列表 (/blog)
│   │   └── [slug]/
│   │       ├── error.tsx
│   │       └── page.tsx        # 博客文章 (/blog/[slug])
│   ├── contact/
│   │   ├── error.tsx
│   │   └── page.tsx            # 联系页面 (/contact)
│   ├── dashboard/
│   │   ├── DashboardClient.tsx # Dashboard 客户端组件
│   │   ├── error.tsx
│   │   └── page.tsx            # 团队看板 (/dashboard)
│   ├── portfolio/
│   │   ├── components/         # Portfolio 组件
│   │   │   ├── CategoryFilter.tsx
│   │   │   ├── CategoryFilterWrapper.tsx
│   │   │   ├── PortfolioGrid.tsx
│   │   │   └── ProjectCard.tsx
│   │   ├── data.ts             # 项目数据
│   │   ├── page.tsx            # 作品集 (/portfolio)
│   │   └── [slug]/
│   │       └── page.tsx        # 项目详情 (/portfolio/[slug])
│   ├── tasks/
│   │   └── page.tsx            # 任务页面 (/tasks)
│   └── team/
│       ├── error.tsx
│       └── page.tsx            # 团队页面 (/team)
├── layout.tsx                  # 根布局
├── page.tsx                    # 根页面（重定向）
├── error.tsx                   # 全局错误页面
├── not-found.tsx               # 404 页面
└── global-error.tsx            # 全局错误边界
```

---

## 页面列表

### 1. 首页 (`/`)

**文件**: `src/app/[locale]/page.tsx`

**功能**:
- Hero 展示区
- 团队预览
- GitHub 活动展示
- 服务介绍
- 为什么选择我们
- CTA (Call to Action)
- AI 聊天组件

**关键组件**:
- `LazyGitHubActivity` - GitHub 活动懒加载
- `LazyProjectDashboard` - 项目看板懒加载
- `LazyAIChat` - AI 聊天懒加载

**路由**: `/zh-CN`, `/en-US`

---

### 2. 关于页面 (`/about`)

**文件**: `src/app/[locale]/about/page.tsx`

**功能**:
- 7zi Studio 介绍
- 团队理念
- 发展历程
- 愿景和使命

**路由**: `/zh-CN/about`, `/en-US/about`

---

### 3. 团队页面 (`/team`)

**文件**: `src/app/[locale]/team/page.tsx`

**功能**:
- 11 位 AI 成员详细介绍
- 每个成员的角色和职责
- 成员状态展示

**路由**: `/zh-CN/team`, `/en-US/team`

**关键组件**: `MemberCard`, `MemberPresenceBoard`

---

### 4. 博客列表 (`/blog`)

**文件**: `src/app/[locale]/blog/page.tsx`

**功能**:
- 博客文章列表
- 分类筛选
- 搜索功能
- 分页

**路由**: `/zh-CN/blog`, `/en-US/blog`

---

### 5. 博客文章 (`/blog/[slug]`)

**文件**: `src/app/[locale]/blog/[slug]/page.tsx`

**功能**:
- 文章详情
- 文章元数据
- 相关文章推荐
- 评论区

**路由**: `/zh-CN/blog/my-article`, `/en-US/blog/my-article`

---

### 6. 联系页面 (`/contact`)

**文件**: `src/app/[locale]/contact/page.tsx`

**功能**:
- 联系表单
- 公司信息
- 地图集成
- 社交媒体链接

**路由**: `/zh-CN/contact`, `/en-US/contact`

**关键组件**: `ContactForm`, `EnhancedContactForm`

---

### 7. 团队看板 (`/dashboard`)

**文件**: `src/app/[locale]/dashboard/page.tsx`

**功能**:
- 实时 AI 团队状态
- GitHub Issues 追踪
- 实时活动日志
- 任务进度展示

**关键组件**:
- `DashboardClient` - 客户端组件
- `MemberCard` - 成员卡片
- `TaskBoard` - 任务看板
- `ActivityLog` - 活动日志
- `RealtimeDashboard` - 实时仪表盘
- `TeamActivityTracker` - 团队活动追踪

**路由**: `/zh-CN/dashboard`, `/en-US/dashboard`

**数据源**: GitHub API (`/api/github/issues`, `/api/github/commits`)

---

### 8. 作品集 (`/portfolio`)

**文件**: `src/app/[locale]/portfolio/page.tsx`

**功能**:
- 项目展示
- 分类筛选
- 项目搜索

**关键组件**:
- `PortfolioGrid`
- `ProjectCard`
- `CategoryFilter`

**路由**: `/zh-CN/portfolio`, `/en-US/portfolio`

---

### 9. 项目详情 (`/portfolio/[slug]`)

**文件**: `src/app/[locale]/portfolio/[slug]/page.tsx`

**功能**:
- 项目详情
- 截图展示
- 技术栈
- 项目链接

**路由**: `/zh-CN/portfolio/my-project`, `/en-US/portfolio/my-project`

---

### 10. 任务页面 (`/tasks`)

**文件**: `src/app/[locale]/tasks/page.tsx`

**功能**:
- 任务列表
- 任务状态管理
- 任务筛选

**路由**: `/zh-CN/tasks`, `/en-US/tasks`

---

## 动态路由

### `[locale]` - 语言段

**用途**: 支持多语言路由

**值**: `zh-CN`, `en-US`

**示例**:
```typescript
export default async function Page({ params }: { params: { locale: string } }) {
  const { locale } = params;
  // 使用 locale 加载对应的翻译
}
```

### `[slug]` - 博客文章

**用途**: 标识具体的博客文章

**示例**: `/blog/my-first-post`, `/portfolio/e-commerce-site`

---

## 布局系统

### 根布局 (`src/app/layout.tsx`)

**职责**:
- 全局 HTML 结构
- 全局样式引入
- 根布局组件

```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

### 语言布局 (`src/app/[locale]/layout.tsx`)

**职责**:
- 语言特定的导航
- 语言切换器
- 主题提供者
- SEO 元数据

**关键组件**:
- `Navigation`
- `LanguageSwitcher`
- `ThemeToggle`
- `Footer`

---

## 错误处理

### 错误页面层次

1. **全局错误** (`global-error.tsx`) - 捕获整个应用的致命错误
2. **根错误** (`error.tsx`) - 捕获根布局的错误
3. **语言错误** (`[locale]/error.tsx`) - 捕获语言段的错误
4. **页面错误** (`[locale]/about/error.tsx`) - 捕获特定页面的错误

### 404 页面 (`not-found.tsx`)

当路由不匹配时显示，提供返回首页的链接。

---

## SEO 配置

### 元数据生成

每个页面都可以通过 `generateMetadata` 动态生成 SEO 元数据：

```typescript
export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  
  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('title'),
      description: t('description'),
      locale: locale === 'zh-CN' ? 'zh_CN' : 'en_US',
      type: 'website',
    },
    alternates: {
      canonical: `https://7zi.studio/${locale}`,
      languages: {
        'zh-CN': 'https://7zi.studio/zh-CN',
        'en-US': 'https://7zi.studio/en-US',
      },
    },
  };
}
```

### 结构化数据

使用 `StructuredData` 组件添加 Schema.org 数据：

```typescript
<StructuredData
  locale={locale}
  schemas={['website', 'organization']}
  customSchemas={[
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: '7zi Studio 首页',
      description: '...',
    },
  ]}
/>
```

---

## 导航组件

### Navigation (`/src/components/Navigation.tsx`)

主导航栏，包含：
- Logo
- 导航链接
- 主题切换
- 语言切换
- 移动端菜单

### MobileMenu (`/src/components/MobileMenu.tsx`)

移动端汉堡菜单，提供与桌面版相同的导航功能。

---

## 外部链接

项目包含以下外部链接：
- **GitHub**: `https://github.com/songzuo/7zi`
- **Visa 服务**: `https://visa.7zi.com`

---

*由 7zi Studio AI 团队维护 🤖*
