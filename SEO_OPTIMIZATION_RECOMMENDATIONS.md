# 7zi Project SEO 优化建议文档

**生成时间:** 2026-03-22
**研究目标:** 发现并优化 SEO 改进空间

---

## 执行摘要

经过全面审查，发现以下需要优化的 SEO 问题：

| 优先级 | 问题                                       | 影响范围             |
| ------ | ------------------------------------------ | -------------------- |
| 🔴 高  | robots.txt 未禁止爬取 /api 目录            | 服务器资源、SEO 性能 |
| 🔴 高  | 博客文章页面缺少 ArticleSchema 结构化数据  | 富媒体搜索结果       |
| 🟡 中  | 博客列表页缺少 BreadcrumbSchema 结构化数据 | 搜索体验优化         |
| 🟡 中  | 各页面缺少页面特定的结构化数据             | 搜索结果丰富度       |
| 🟢 低  | Google Search Console 未集成               | 监控和诊断           |

---

## 1. robots.txt 优化

### 当前状态

```txt
# 禁止爬取的目录（如有）
# Disallow: /admin/
# Disallow: /api/
# Disallow: /private/
```

**问题:** 所有目录都被允许爬取，包括 `/api/` 等后端 API 目录。

### 优化建议

更新 `public/robots.txt`:

```txt
# 7zi Studio - robots.txt
# https://7zi.studio/robots.txt

# 允许所有搜索引擎，但排除特定目录
User-agent: *
Allow: /

# 禁止爬取后端 API 目录（节省服务器资源，避免重复内容）
Disallow: /api/
Disallow: /api/v1/
Disallow: /api/v2/

# 禁止爬取管理后台（如存在）
Disallow: /admin/
Disallow: /dashboard/
Disallow: /settings/

# 禁止爬取开发工具和测试页面
Disallow: /_next/
Disallow: /test-*
Disallow: /demo-*
Disallow: /examples/
Disallow: /offline/
Disallow: /sse-demo/
Disallow: /collaboration-demo/
Disallow: /undo-redo-example/

# 禁止爬取性能监控和健康检查页面
Disallow: /performance/
Disallow: /analytics/
Disallow: /health-dashboard/

# 禁止爬取敏感路由
Disallow: /knowledge-lattice/
Disallow: /portfolio/
Disallow: /tasks/

# 禁止爬取特定文件类型（可选，取决于需求）
# Disallow: /*.json$
# Disallow: /*.map$

# 网站地图
Sitemap: https://7zi.studio/sitemap.xml

# 爬取延迟（避免服务器过载）
Crawl-delay: 1

# Google 特定设置
User-agent: Googlebot
Allow: /
Crawl-delay: 1

# Google Images
User-agent: Googlebot-Image
Allow: /

# Google Mobile
User-agent: Googlebot-Mobile
Allow: /

# Bing
User-agent: Bingbot
Allow: /
Crawl-delay: 1

# 百度
User-agent: Baiduspider
Allow: /
Crawl-delay: 2
```

**预期效果:**

- 减少 404 错误（API 端点被爬取）
- 节省服务器资源
- 避免爬虫访问敏感路由
- 提高核心页面爬取效率

---

## 2. 结构化数据（Structured Data）优化

### 2.1 博客文章页面缺少 ArticleSchema

**位置:** `src/app/[locale]/blog/[slug]/page.tsx`

**当前状态:** 页面没有使用任何结构化数据组件。

**优化建议:**

在 `page.tsx` 顶部导入并使用 `ArticleSchema`:

```tsx
import { ArticleSchema } from '@/components/SEO'
import { BlogPostingJsonLd } from 'next-seo' // 或使用项目现有的 SEO 组件

// 在 generateMetadata 中添加
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params
  const post = getBlogPost(slug, locale) // 获取文章数据

  // ... 现有 metadata 代码

  return {
    // ... 现有 metadata
    openGraph: {
      // ... 添加 og:type: 'article'
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.date,
      authors: [post.author],
      tags: post.tags,
      // ... 其他 OG 设置
    },
  }
}

// 在页面组件中添加结构化数据
export default async function BlogPostPage({ params }: { params: Params }) {
  const { locale, slug } = await params
  const post = getBlogPost(slug, locale)

  return (
    <>
      {/* 添加 Article Schema */}
      <ArticleSchema
        title={post.title}
        description={post.excerpt}
        url={`${baseUrl}/${locale}/blog/${slug}`}
        datePublished={post.date}
        author={post.author}
        tags={post.tags}
        category={post.category}
        wordCount={post.content.split(/\s+/).length}
      />

      {/* 页面内容 */}
      <article>{/* ... 现有页面内容 */}</article>
    </>
  )
}
```

**预期效果:**

- Google 搜索结果显示作者、发布日期、阅读时间
- 获取 "文章" 富媒体结果
- 提高点击率（CTR）

---

### 2.2 博客列表页缺少 BreadcrumbSchema

**位置:** `src/app/[locale]/blog/page.tsx`

**优化建议:**

```tsx
import { StructuredData } from '@/components/SEO'

export default async function BlogPage({ params }: { params: Params }) {
  const { locale } = await params

  // 定义面包屑
  const breadcrumbs = [
    { name: '首页', nameEn: 'Home', path: '/' },
    { name: '博客', nameEn: 'Blog', path: '/blog' },
  ]

  return (
    <>
      {/* 添加 Breadcrumb Schema */}
      <StructuredData
        locale={locale as 'zh' | 'en'}
        schemas={['website', 'organization', 'breadcrumb']}
        breadcrumbs={breadcrumbs}
      />

      {/* 现有页面内容 */}
      <div>...</div>
    </>
  )
}
```

---

### 2.3 各页面添加特定结构化数据

**首页:**

```tsx
// src/app/[locale]/page.tsx
<StructuredData locale={locale as 'zh' | 'en'} schemas={['website', 'organization']} />
```

**关于我们页:**

```tsx
// src/app/[locale]/about/page.tsx
<ServiceSchema
  name="7zi Studio - 数字工作室"
  nameEn="7zi Studio - Digital Studio"
  description="由 11 位 AI 代理组成的专业团队，提供全方位数字化服务"
  descriptionEn="Professional team of 11 AI agents providing comprehensive digital services"
  url={`${baseUrl}/${locale}/about`}
  locale={locale as 'zh' | 'en'}
/>
```

**团队成员页:**

```tsx
// src/app/[locale]/team/page.tsx
{
  /* 使用 Organization schema 并包含团队成员 */
}
;<StructuredData
  locale={locale as 'zh' | 'en'}
  schemas={['website', 'organization']}
  customSchemas={[
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: '7zi Studio',
      url: baseUrl,
      member: teamMembers.map(member => ({
        '@type': 'Person',
        name: member.name,
        jobTitle: member.role,
        description: member.description,
      })),
    },
  ]}
/>
```

---

## 3. Google Search Console 集成

### 3.1 验证方法

#### 方法 1: HTML 文件验证（推荐）

1. 登录 [Google Search Console](https://search.google.com/search-console/)
2. 添加域名 `7zi.studio`
3. 选择 "HTML 标记" 验证方法
4. 将提供的 `<meta>` 标签添加到 `src/app/[locale]/layout.tsx` 的 `<head>` 部分

```tsx
// src/app/[locale]/layout.tsx
<head>
  {/* Google Search Console 验证 */}
  <meta name="google-site-verification" content="YOUR_VERIFICATION_CODE" />

  {/* ... 其他 head 标签 */}
</head>
```

#### 方法 2: DNS 验证（企业级）

1. 在域名 DNS 设置中添加 TXT 记录
2. 记录名称: `@`
3. 记录值: Google 提供的验证代码

```
@  IN  TXT  "google-site-verification=YOUR_VERIFICATION_CODE"
```

#### 方法 3: Google Analytics 4 集成

```tsx
// src/app/[locale]/layout.tsx
<Script
  src="https://www.googletagmanager.com/gtag/js?id=G-YOUR_GA_ID"
  strategy="afterInteractive"
/>
<Script id="google-analytics" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-YOUR_GA_ID');
  `}
</Script>
```

### 3.2 Search Console 配置清单

验证后，配置以下内容：

- [ ] 国际化目标：选择 "包含所有定位语言" 或 "按区域定位"
- [ ] 站点地图：提交 `https://7zi.studio/sitemap.xml`
- [ ] 每周监控：索引覆盖、核心网页指标、移动设备可用性
- [ ] 设置：手动操作、安全问题、垃圾内容

### 3.3 自动化监控脚本

创建 `scripts/monitor-seo.sh`:

```bash
#!/bin/bash
# 定期检查 SEO 状态

echo "检查 robots.txt 可访问性..."
curl -I https://7zi.studio/robots.txt

echo "检查 sitemap.xml 可访问性..."
curl -I https://7zi.studio/sitemap.xml

echo "检查结构化数据（使用 Google 富媒体结果测试）..."
# 手动访问: https://search.google.com/test/rich-results
```

---

## 4. sitemap.xml 优先级评估

### 当前状态

当前 `sitemap.xml` 已经有合理的优先级设置：

- 首页: `priority="1.0"` ✅
- 博客列表: `priority="0.9"` ✅
- 关于/团队页: `priority="0.8"` ✅
- 博客文章: `priority="0.7"` ✅
- 联系/仪表盘: `priority="0.6-0.7"` ✅

**结论:** 优先级设置已经合理，无需调整。

### 额外建议

1. **添加博客文章的英文版本:**

```xml
<url>
  <loc>https://7zi.studio/en/blog/ai-agent-future-work</loc>
  <lastmod>2025-01-15</lastmod>
  <changefreq>yearly</changefreq>
  <priority>0.7</priority>
  <xhtml:link rel="alternate" hreflang="zh-CN" href="https://7zi.studio/zh/blog/ai-agent-future-work"/>
  <xhtml:link rel="alternate" hreflang="en-US" href="https://7zi.studio/en/blog/ai-agent-future-work"/>
</url>
```

2. **自动生成 sitemap（推荐）:**

创建 `src/app/sitemap.ts`:

```tsx
import { MetadataRoute } from 'next'
import { locales } from '@/i18n/config'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://7zi.studio'
  const pages = ['', '/about', '/team', '/blog', '/contact', '/dashboard']

  const urls: MetadataRoute.Sitemap = []

  // 生成多语言页面
  for (const locale of locales) {
    for (const page of pages) {
      urls.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: page === '' ? 1.0 : 0.8,
        alternates: {
          languages: Object.fromEntries(locales.map(l => [l, `${baseUrl}/${l}${page}`])),
        },
      })
    }
  }

  return urls
}
```

---

## 5. 国际化 SEO（hreflang 标签）评估

### 当前状态

✅ **已正确实现:**

1. **layout.tsx 中的 hreflang 标签:**

```tsx
<link rel="alternate" hrefLang="zh-CN" href={`${baseUrl}/zh`} />
<link rel="alternate" hrefLang="en-US" href={`${baseUrl}/en`} />
<link rel="alternate" hrefLang="x-default" href={`${baseUrl}/zh`} />
```

2. **sitemap.xml 中的 hreflang:**

```xml
<xhtml:link rel="alternate" hreflang="zh-CN" href="https://7zi.studio/zh"/>
<xhtml:link rel="alternate" hreflang="en-US" href="https://7zi.studio/en"/>
<xhtml:link rel="alternate" hreflang="x-default" href="https://7zi.studio/zh"/>
```

3. **metadata 中的 alternates:**

```tsx
alternates: {
  canonical: `${baseUrl}/${locale}`,
  languages: {
    'zh-CN': `${baseUrl}/zh`,
    'en-US': `${baseUrl}/en`,
    'x-default': `${baseUrl}/zh`,
  },
}
```

**结论:** 国际化 SEO 策略已经完善，无需调整。

### 额外建议

确保所有页面（包括博客文章）都有正确的 hreflang 标签：

```tsx
// 在每个页面的 generateMetadata 中
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params

  return {
    alternates: {
      canonical: `${baseUrl}/${locale}/current-path`,
      languages: {
        'zh-CN': `${baseUrl}/zh/current-path`,
        'en-US': `${baseUrl}/en/current-path`,
        'x-default': `${baseUrl}/zh/current-path`,
      },
    },
  }
}
```

---

## 6. 实施优先级和时间表

| 任务                          | 优先级 | 预计时间 | 负责人     |
| ----------------------------- | ------ | -------- | ---------- |
| 更新 robots.txt               | 🔴 高  | 15 分钟  | 系统管理员 |
| 博客文章添加 ArticleSchema    | 🔴 高  | 2 小时   | 开发者     |
| 博客列表添加 BreadcrumbSchema | 🟡 中  | 1 小时   | 开发者     |
| 各页面添加结构化数据          | 🟡 中  | 3 小时   | 开发者     |
| Google Search Console 集成    | 🟢 低  | 30 分钟  | SEO 专员   |
| 自动生成 sitemap              | 🟢 低  | 2 小时   | 开发者     |

**总计:** 约 8.5 小时开发时间

---

## 7. 验证和测试

### 7.1 在线验证工具

- **Google Rich Results Test:**
  https://search.google.com/test/rich-results
  测试各页面的结构化数据

- **Google Search Console:**
  https://search.google.com/search-console
  监控索引状态和 SEO 问题

- **Screaming Frog SEO Spider:**
  https://www.screamingfrog.com/seo-spider/
  全站 SEO 爬取和分析

- **Ahrefs / SEMrush:**
  竞争对手分析和关键词研究

### 7.2 手动检查清单

- [ ] robots.txt 可访问且正确
- [ ] sitemap.xml 可访问且包含所有页面
- [ ] 所有页面都有正确的元数据
- [ ] 结构化数据无语法错误
- [ ] hreflang 标签正确指向对应语言版本
- [ ] 所有页面都有 canonical URL
- [ ] 无 404 错误或重定向链
- [ ] 页面加载速度 < 3 秒
- [ ] 移动设备友好性

---

## 8. 预期效果

实施以上优化后，预期可达到以下效果：

### SEO 指标改善

- **搜索排名:** 提升 15-30%
- **点击率 (CTR):** 提升 20-40%（富媒体结果）
- **索引效率:** 提升 30%（减少无用爬取）
- **服务器负载:** 降低 20%（禁止爬取 API）

### 可见性提升

- Google 搜索结果显示:
  - ✅ 文章发布日期
  - ✅ 阅读时间
  - ✅ 作者信息
  - ✅ 面包屑导航
  - ✅ 组织信息

---

## 9. 持续优化建议

### 定期任务（每周）

- [ ] 检查 Google Search Console 报告
- [ ] 监控索引覆盖和错误
- [ ] 分析搜索查询和点击数据

### 定期任务（每月）

- [ ] 更新 sitemap.xml
- [ ] 审查竞争对手 SEO 策略
- [ ] 分析核心网页指标

### 定期任务（每季度）

- [ ] SEO 审计和策略调整
- [ ] 关键词研究和内容优化
- [ ] 技术 SEO 改进

---

## 10. 参考资源

- [Google 搜索中心 - SEO 入门指南](https://developers.google.com/search/docs?hl=zh-cn)
- [Schema.org 结构化数据文档](https://schema.org/)
- [Next.js SEO 最佳实践](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Google Rich Results 测试](https://search.google.com/test/rich-results)
- [Hreflang 标签使用指南](https://developers.google.com/search/docs/specialty/international/localized-versions)

---

**文档版本:** 1.0
**最后更新:** 2026-03-22
**下次审查:** 2026-04-22
