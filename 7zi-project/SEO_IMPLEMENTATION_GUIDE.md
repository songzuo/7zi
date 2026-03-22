# 7zi-Frontend SEO 优化实施指南

**文档版本:** 1.0
**创建日期:** 2026-03-22
**负责人:** 📣 推广专员

---

## 📋 目录

1. [已完成的工作](#已完成的工作)
2. [项目结构](#项目结构)
3. [如何使用 SEO 组件](#如何使用-seo-组件)
4. [页面类型示例](#页面类型示例)
5. [验证与测试](#验证与测试)
6. [最佳实践](#最佳实践)
7. [常见问题](#常见问题)

---

## ✅ 已完成的工作

### 1. 核心文件创建

| 文件 | 状态 | 描述 |
|------|------|------|
| `public/robots.txt` | ✅ | 搜索引擎爬取规则 |
| `public/sitemap.xml` | ✅ | 站点地图 |
| `src/app/opengraph-image.tsx` | ✅ | Open Graph 图片生成器 |
| `src/app/twitter-image.tsx` | ✅ | Twitter Card 图片生成器 |

### 2. SEO 组件库

| 组件 | 路径 | 用途 |
|------|------|------|
| `generateBaseMetadata` | `src/components/SEO/utils.ts` | 生成基础 metadata |
| `OrganizationSchema` | `src/components/SEO/OrganizationSchema.tsx` | 组织信息结构化数据 |
| `WebsiteSchema` | `src/components/SEO/WebsiteSchema.tsx` | 网站信息结构化数据 |
| `ArticleSchema` | `src/components/SEO/ArticleSchema.tsx` | 文章信息结构化数据 |
| `BreadcrumbSchema` | `src/components/SEO/BreadcrumbSchema.tsx` | 面包屑导航结构化数据 |
| `StructuredData` | `src/components/SEO/StructuredData.tsx` | 通用结构化数据 |

### 3. 示例代码

| 示例 | 路径 | 说明 |
|------|------|------|
| 首页示例 | `src/components/SEO/examples/HomePageExample.tsx` | 展示首页的完整 SEO 配置 |
| 博客文章示例 | `src/components/SEO/examples/BlogPostPageExample.tsx` | 展示博客文章的 SEO 配置 |
| 关于页面示例 | `src/components/SEO/examples/AboutPageExample.tsx` | 展示关于页面的 SEO 配置 |

---

## 📂 项目结构

```
7zi-project/
├── public/
│   ├── robots.txt                    # ✅ 搜索引擎爬取规则
│   ├── sitemap.xml                   # ✅ 站点地图
│   ├── favicon.ico
│   ├── icon-512.png
│   └── ...
├── src/
│   ├── app/
│   │   ├── opengraph-image.tsx       # ✅ OG 图片生成器 (1200x630)
│   │   ├── twitter-image.tsx         # ✅ Twitter 图片生成器 (1200x600)
│   │   └── ...
│   ├── components/
│   │   └── SEO/
│   │       ├── index.ts              # 导出所有 SEO 组件
│   │       ├── utils.ts              # metadata 生成工具
│   │       ├── OrganizationSchema.tsx
│   │       ├── WebsiteSchema.tsx
│   │       ├── ArticleSchema.tsx
│   │       ├── BreadcrumbSchema.tsx
│   │       ├── StructuredData.tsx
│   │       └── examples/             # 使用示例
│   │           ├── HomePageExample.tsx
│   │           ├── BlogPostPageExample.tsx
│   │           └── AboutPageExample.tsx
│   └── ...
```

---

## 🚀 如何使用 SEO 组件

### 步骤 1: 在页面中导入组件

```tsx
import { Metadata } from 'next'
import {
  generateBaseMetadata,
  WebsiteSchema,
  OrganizationSchema,
  ArticleSchema,
  BreadcrumbSchema
} from '@/components/SEO'
```

### 步骤 2: 生成页面 Metadata

```tsx
export async function generateMetadata(): Promise<Metadata> {
  const config = {
    title: '页面标题',
    description: '页面描述',
    keywords: ['关键词1', '关键词2'],
    locale: 'zh' as const,
  }

  return generateBaseMetadata(config)
}
```

### 步骤 3: 添加结构化数据

```tsx
export default async function Page() {
  return (
    <>
      {/* 结构化数据 */}
      <WebsiteSchema
        name="网站名称"
        url="https://7zi.com"
        description="网站描述"
      />

      {/* 页面内容 */}
      <main>...</main>
    </>
  )
}
```

---

## 📄 页面类型示例

### 1. 首页 (Home)

```tsx
import { generateBaseMetadata, WebsiteSchema, OrganizationSchema } from '@/components/SEO'

export async function generateMetadata() {
  return generateBaseMetadata({
    title: '7zi-Frontend - 现代化任务管理平台',
    description: '基于 Next.js 16、React 19 和 TypeScript 构建',
    keywords: ['任务管理', '协作平台', 'Next.js'],
    locale: 'zh',
  })
}

export default function Home() {
  return (
    <>
      <WebsiteSchema
        name="7zi-Frontend"
        url="https://7zi.com"
        description="现代化任务管理与协作平台"
        search={{
          target: 'https://7zi.com/search?q={search_term_string}',
          'query-input': 'required name=search_term_string',
        }}
      />
      <OrganizationSchema
        name="7zi Studio"
        url="https://7zi.com"
        logo="https://7zi.com/icon-512.png"
      />
      <main>...</main>
    </>
  )
}
```

### 2. 博客文章页 (Blog Post)

```tsx
import { ArticleSchema, BreadcrumbSchema } from '@/components/SEO'

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const { slug } = params
  const post = await getBlogPost(slug)

  const breadcrumbs = [
    { name: '首页', path: '/' },
    { name: '博客', path: '/blog' },
    { name: post.title, path: `/blog/${slug}` },
  ]

  return (
    <>
      <BreadcrumbSchema breadcrumbs={breadcrumbs} />
      <ArticleSchema
        headline={post.title}
        description={post.excerpt}
        url={`https://7zi.com/blog/${slug}`}
        datePublished={post.date}
        author={post.author}
        tags={post.tags}
        category={post.category}
      />
      <main>...</main>
    </>
  )
}
```

### 3. 关于页面 (About)

```tsx
import { OrganizationSchema, BreadcrumbSchema } from '@/components/SEO'

export default async function About() {
  const breadcrumbs = [
    { name: '首页', path: '/' },
    { name: '关于我们', path: '/about' },
  ]

  return (
    <>
      <BreadcrumbSchema breadcrumbs={breadcrumbs} />
      <OrganizationSchema
        name="7zi Studio"
        url="https://7zi.com"
        description="现代化任务管理与协作平台"
        contactPoint={{
          email: 'contact@7zi.com',
          contactType: 'customer service',
        }}
      />
      <main>...</main>
    </>
  )
}
```

---

## ✅ 验证与测试

### 1. 验证 robots.txt

```bash
# 本地验证
cat public/robots.txt

# 在线访问
curl -I https://7zi.com/robots.txt

# Google 搜索中心验证
# https://www.google.com/search?q=site:7zi.com/robots.txt
```

### 2. 验证 sitemap.xml

```bash
# 本地验证格式
xmllint --noout public/sitemap.xml

# 在线访问
curl https://7zi.com/sitemap.xml

# XML 验证工具
# https://www.xml-sitemaps.com/validate-xml-sitemap.html
```

### 3. 验证结构化数据

#### Google Rich Results Test
访问: https://search.google.com/test/rich-results

输入 URL: https://7zi.com

检查项目:
- ✅ Organization
- ✅ WebSite
- ✅ Article
- ✅ Breadcrumb

#### Schema.org Validator
访问: https://validator.schema.org/

输入 URL 或粘贴 JSON-LD

### 4. 验证 Open Graph 和 Twitter Cards

#### Facebook Sharing Debugger
访问: https://developers.facebook.com/tools/debug/

输入 URL: https://7zi.com

检查项目:
- ✅ og:title
- ✅ og:description
- ✅ og:image
- ✅ og:url

#### Twitter Card Validator
访问: https://cards-dev.twitter.com/validator

输入 URL: https://7zi.com

检查项目:
- ✅ twitter:card
- ✅ twitter:title
- ✅ twitter:description
- ✅ twitter:image

### 5. 验证 Meta Tags

使用浏览器开发者工具:

```javascript
// 在控制台执行
console.log(document.title)
console.log(document.querySelector('meta[name="description"]')?.content)
console.log(document.querySelector('meta[property="og:title"]')?.content)
```

---

## 🎯 最佳实践

### 1. Title 最佳实践

- ✅ 长度: 50-60 字符
- ✅ 包含主要关键词
- ✅ 独特且描述性强
- ✅ 品牌名称在末尾

```tsx
// ✅ 好的例子
title: '任务管理工具 - 7zi-Frontend'

// ❌ 不好
title: '7zi-Frontend'
title: '这是一个非常长的标题，它超过了推荐的长度，可能会在搜索结果中被截断...'
```

### 2. Description 最佳实践

- ✅ 长度: 150-160 字符
- ✅ 包含关键词
- ✅ 有行动召唤 (CTA)
- ✅ 独特且有价值

```tsx
// ✅ 好的例子
description: '7zi-Frontend 是一款现代化的任务管理与协作平台，提供实时协作、智能搜索等功能。立即免费试用！'

// ❌ 不好
description: '这是一个任务管理工具'
```

### 3. Keywords 最佳实践

- ✅ 5-8 个相关关键词
- ✅ 长尾关键词优先
- ✅ 符合页面内容
- ✅ 不同页面使用不同关键词

```tsx
// ✅ 好的例子
keywords: ['任务管理', '团队协作', '项目管理工具', '实时同步', 'Next.js应用']

// ❌ 不好
keywords: ['任务', '管理', '团队', '协作', '工具', '平台', '应用', '软件', '系统', '免费']
```

### 4. OG Image 最佳实践

- ✅ 尺寸: 1200x630 px (Open Graph)
- ✅ 尺寸: 1200x600 px (Twitter Card)
- ✅ 格式: PNG 或 JPG
- ✅ 文件大小: < 5MB
- ✅ 包含品牌元素
- ✅ 文字清晰可读

### 5. 结构化数据最佳实践

- ✅ 使用 Schema.org 标准格式
- ✅ 填写所有必填字段
- ✅ 使用具体类型 (Article > CreativeWork > Thing)
- ✅ 定期验证和更新

### 6. Canonical URL 最佳实践

- ✅ 每个页面都有唯一的 canonical URL
- ✅ 使用绝对 URL (包含域名)
- ✅ 指向规范版本 (不是重定向)
- ✅ 避免 self-referencing (除非必要)

```tsx
// ✅ 好的例子
alternates: {
  canonical: 'https://7zi.com/zh/about',
  languages: {
    'zh-CN': 'https://7zi.com/zh/about',
    'en-US': 'https://7zi.com/en/about',
  }
}

// ❌ 不好
alternates: {
  canonical: '/about',  // ❌ 相对 URL
}
```

---

## ❓ 常见问题

### Q1: 为什么我的 Open Graph 图片没有显示？

**A:** 检查以下内容:
1. 图片是否可公开访问
2. 图片尺寸是否正确 (1200x630)
3. 图片大小是否 < 5MB
4. 使用 Facebook Sharing Debugger 清除缓存

### Q2: 结构化数据验证通过了，但 Google 没有显示富媒体结果？

**A:** 可能的原因:
1. Google 还未重新爬取页面 (等待几天)
2. 页面不在搜索结果中
3. 内容不符合 Google 的显示规则
4. 使用 Google Rich Results Test 检查具体原因

### Q3: robots.txt 是否必需？

**A:** 强烈建议使用 robots.txt:
- 控制哪些页面被爬取
- 减少服务器负载
- 避免敏感内容被索引
- 提高爬取效率

### Q4: sitemap.xml 必须包含所有页面吗？

**A:** 不一定:
- 只包含重要页面 (首页、产品、博客等)
- 不包含重复内容
- 不包含低价值页面 (如确认页)
- 不包含已禁用的页面

### Q5: 如何优化多语言 SEO？

**A:** 遵循以下规则:
1. 为每个语言版本创建独立的 URL
2. 使用 hreflang 标签关联语言版本
3. 每个页面设置正确的 canonical URL
4. sitemap.xml 包含所有语言版本

```tsx
// ✅ 多语言配置示例
alternates: {
  canonical: 'https://7zi.com/zh/about',
  languages: {
    'zh-CN': 'https://7zi.com/zh/about',
    'en-US': 'https://7zi.com/en/about',
    'x-default': 'https://7zi.com/zh/about',
  }
}
```

### Q6: 如何监控 SEO 效果？

**A:** 使用以下工具:
- Google Search Console: 监控索引和搜索性能
- Google Analytics: 监控流量和用户行为
- Screaming Frog: 定期爬取网站检查问题
- Ahrefs / SEMrush: 监控关键词排名和反向链接

---

## 📚 参考资源

- [Google 搜索中心](https://developers.google.com/search/docs?hl=zh-cn)
- [Schema.org](https://schema.org/)
- [Next.js Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Open Graph 协议](http://ogp.me/)
- [Twitter Cards](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Google Rich Results Test](https://search.google.com/test/rich-results)

---

## 📞 支持

如有疑问，请联系:
- 📣 推广专员 - SEO 专家
- 🏗️ 架构师 - 技术支持

---

**最后更新:** 2026-03-22
