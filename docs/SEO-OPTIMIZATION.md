# SEO 优化与市场分析报告

> 推广专员出品 | 2026-03-27
> 项目: 7zi Studio (https://7zi.studio)

---

## 📊 一、SEO 技术审计结果

### ✅ 已做得很好的部分

| 项目 | 状态 | 说明 |
|------|------|------|
| Meta Title/Description | ✅ 优秀 | 中英双语分离配置，动态生成 |
| Open Graph 标签 | ✅ 完整 | 包含 og:title, og:description, og:image, og:type, og:locale |
| Twitter Card 标签 | ✅ 完整 | 使用 summary_large_image 类型 |
| hreflang 标签 | ✅ 正确 | zh-CN/en-US/x-default 三重配置 |
| robots.txt | ✅ 完善 | 合理屏蔽 /api/, /admin/, /dashboard/ 等 |
| sitemap.xml | ✅ 完整 | 包含所有主要页面，支持多语言 |
| JSON-LD 结构化数据 | ✅ 优秀 | WebSite, Organization, Breadcrumb, FAQ, Article, Service |
| Canonical URL | ✅ 配置 | alternates.canonical 已设置 |
| PWA 兼容性 | ✅ 完整 | manifest.json, apple-touch-icon, theme-color |
| DNS 预获取 | ✅ 已配置 | dns-prefetch, preconnect |
| 字体优化 | ✅ 已配置 | display=swap, preload=true |

### ⚠️ 需要改进的部分

| 问题 | 严重程度 | 当前状态 |
|------|----------|----------|
| 缺少 next-sitemap.ts 动态生成 | 🟡 中 | 仅使用静态 sitemap.xml |
| 博客文章未单独生成 Metadata | 🟡 中 | 所有文章共享默认配置 |
| 缺少图片 alt 标签优化 | 🟡 中 | 首页图片可能有可优化空间 |
| 缺少视频内容 Schema | 🟢 低 | 如有视频可添加 VideoObject |
| 缺少本地业务 Schema | 🟢 低 | LocalBusiness 可增强地域搜索 |
| Sitemap 未包含标签/分类页 | 🟢 低 | 博客分类页/标签页未收录 |
| 缺少 HowTo 结构化数据 | 🟢 低 | 可为"如何使用服务"添加 |
| Google Search Console 未验证 | 🔴 高 | 无法监控索引状态 |
| 缺少社交证明 Schema | 🟢 低 | 如有客户评价可添加 Review |

---

## 🔑 二、目标关键词分析

### 核心关键词（中文）

| 关键词 | 竞争度 | 搜索意图 | 建议页面 |
|--------|--------|----------|----------|
| AI 数字工作室 | 中 | 信息型 | 首页 |
| AI 代理 团队管理 | 低 | 交易型 | /team |
| 网站开发 AI | 中 | 交易型 | 服务页 |
| 品牌设计工作室 | 高 | 交易型 | /about |
| 数字化解决方案 | 中 | 信息型 | 首页 |
| 营销推广 AI | 中 | 交易型 | 服务页 |
| Next.js 开发 | 高 | 交易型 | 博客文章 |
| AI 博客 中文 | 低 | 信息型 | /blog |

### 核心关键词（英文）

| 关键词 | 竞争度 | 搜索意图 | 建议页面 |
|--------|--------|----------|----------|
| AI digital studio | 低 | 信息型 | 首页 |
| AI agent team | 中 | 信息型 | /team |
| web development agency | 高 | 交易型 | 服务页 |
| brand design studio | 高 | 交易型 | /about |
| AI marketing agency | 中 | 交易型 | 服务页 |
| Next.js development | 高 | 交易型 | 博客文章 |

### 长尾关键词

- "AI 代理能做网站吗"
- "AI 团队和传统团队区别"
- "AI 数字工作室 价格"
- "AI agency for small business"
- "how to manage AI agent team"

---

## 📋 三、SEO 优化建议（按优先级排序）

### 🔴 P0 - 必须立即修复

#### 1. 添加 next-sitemap.ts 动态生成
**问题**: 当前 sitemap.xml 是静态的，新增页面需要手动更新
**方案**: 创建 `next-sitemap.config.ts` 或 `next-sitemap.js`
```typescript
/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://7zi.studio',
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [{ userAgent: '*', allow: '/' }],
  },
  changefreq: 'weekly',
  priority: 0.7,
  sitemapSize: 5000,
  exclude: ['/api/*', '/admin/*', '/dashboard/*'],
};
```
**预计效果**: +15% 索引覆盖率

#### 2. 为博客文章页单独生成 Metadata
**问题**: 所有博客文章使用相同的 title/description
**方案**: 在 `src/app/[locale]/blog/[slug]/page.tsx` 中使用 `generateMetadata`
```typescript
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.datePublished,
      authors: [post.author],
    },
  };
}
```
**预计效果**: +20% 搜索点击率

#### 3. 验证 Google Search Console
**问题**: 无法监控索引状态和搜索性能
**方案**: 
1. 在 GSC 添加网站 https://7zi.studio
2. 验证域名所有权（DNS 或 HTML 文件）
3. 提交 sitemap.xml
4. 监控"覆盖范围"报告
**预计效果**: 及时发现索引问题

---

### 🟡 P1 - 高优先级

#### 4. 添加图片 alt 标签和优化
**问题**: 部分图片可能缺少描述性 alt
**方案**: 确保所有 `<img>` 和 Next.js `<Image>` 组件有 alt 属性
```tsx
<Image 
  src="/team-ai-agent.png" 
  alt="7zi Studio 11位AI代理团队成员介绍"
  width={800}
  height={600}
/>
```
**预计效果**: +5% 图片搜索流量

#### 5. 添加 FAQ 结构化数据到首页
**问题**: 首页缺少 FAQPage Schema
**方案**: 在首页添加常见问题 JSON-LD
```typescript
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "7zi Studio 能做什么？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "我们由11位AI代理组成，提供网站开发、品牌设计、营销推广等..."
      }
    }
  ]
};
```
**预计效果**: 增强搜索结果展示（富摘要）

#### 6. 添加面包屑导航 Schema
**问题**: 内页缺少 BreadcrumbList
**方案**: 使用 `@/components/SEO` 中的 `Breadcrumbs` 组件
```tsx
<Breadcrumbs 
  items={[
    { name: '首页', nameEn: 'Home', path: '/' },
    { name: '博客', nameEn: 'Blog', path: '/blog' },
    { name: '文章标题', nameEn: 'Article Title', path: '/blog/slug' }
  ]}
  locale="zh"
/>
```
**预计效果**: 提升搜索结果可读性

#### 7. 优化 Core Web Vitals
**问题**: LCP、FID、CLS 可能影响排名
**方案**: 
- 图片使用 `next/image` 自动优化
- 字体预加载已配置 ✓
- 减少第三方脚本阻塞渲染
- 添加 `loading="lazy"` 给非首屏图片
**预计效果**: LCP < 2.5s, 提升排名

---

### 🟢 P2 - 中优先级

#### 8. 添加博客分类页和标签页到 sitemap
**问题**: /blog/category/xxx 等页面未被收录
**方案**: 在 next-sitemap 配置中添加
```javascript
extraPaths: async (config) => {
  const categories = await getAllCategories();
  return categories.map(cat => `/zh/blog/category/${cat.slug}`);
}
```
**预计效果**: +10% 长尾关键词覆盖

#### 9. 添加 LocalBusiness Schema
**问题**: 缺乏地域搜索曝光
**方案**: 如果有实际地址或服务地域
```typescript
{
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "name": "7zi Studio",
  "address": { /* 地址信息 */ },
  "geo": { /* 地理坐标 */ },
  "areaServed": "全球"
}
```
**预计效果**: 增强本地搜索

#### 10. 添加 HowTo 结构化数据
**问题**: 服务页缺少操作指南
**方案**: 为"如何开始合作"等页面添加
```typescript
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "如何开始与7zi Studio合作",
  "step": [
    { "@type": "HowToStep", "name": "联系我们", "text": "..." },
    { "@type": "HowToStep", "name": "需求沟通", "text": "..." }
  ]
}
```

#### 11. 添加 Review/Testimonial Schema
**问题**: 缺乏社交证明
**方案**: 收集客户评价后添加
```typescript
{
  "@context": "https://schema.org",
  "@type": "Review",
  "reviewRating": { "@type": "Rating", "ratingValue": "5" },
  "author": { "@type": "Person", "name": "客户名称" },
  "reviewBody": "评价内容..."
}
```

#### 12. 优化 Open Graph 图片
**问题**: 当前 SVG 图片可能不够丰富
**方案**: 创建更详细的 OG 图像
- 尺寸: 1200x630
- 包含 logo + 标题 + 描述
- 中英文版本
- 可使用工具: Canva, Figma, vercel/og-image

---

### 🔵 P3 - 低优先级（可选）

#### 13. 添加 VideoObject Schema
如果有演示视频或教程

#### 14. 添加 Podcast/Article 嵌套
如开始播客内容

#### 15. 国际化 SEO 增强
- 考虑添加更多语言 (zh-Hant, ja, ko)
- 添加 `language-alternates` 更完整配置

---

## 📈 四、竞争对手 SEO 分析

### 竞争对手类型

1. **同类 AI 数字工作室** (如 AI.NOW, 各种 AI Agency)
2. **传统网站开发公司** (寻求数字化转型)
3. **SaaS 平台** (提供无代码建站)

### 竞争对手常用关键词

- "AI 网站建设"
- "AI 代理 团队"
- "数字化转型 方案"
- "AI marketing agency"
- "AI web development"

### 差异化 SEO 策略

| 策略 | 说明 |
|------|------|
| AI 代理独特性 | 强调"11位AI代理"差异化 |
| 案例展示 | 添加详细的项目案例页面 |
| 博客内容营销 | 定期发布高质量 AI/技术文章 |
| 长尾关键词 | 聚焦"AI 团队管理"等细分市场 |
| 客户评价 | 收集并展示真实客户反馈 |

---

## 📅 五、执行计划

| 阶段 | 时间 | 任务 | 负责人 |
|------|------|------|--------|
| P0 | 第1周 | next-sitemap, 文章Metadata, GSC验证 | 开发 |
| P1 | 第2周 | FAQ Schema, 面包屑, 图片优化, CWV | 开发 |
| P2 | 第3周 | 分类页sitemap, LocalBusiness, HowTo | 内容+开发 |
| P3 | 第4周 | 视频/评价Schema, OG图片优化 | 设计+内容 |

---

## 📊 六、关键指标 (KPI)

| 指标 | 当前 | 3个月目标 |
|------|------|----------|
| 索引页面数 | ~15 | 50+ |
| 关键词排名(前20) | ~5 | 20+ |
| 有机搜索流量 | 基准 | +50% |
| Core Web Vitals | 待测 | 全部"良好" |
| GSC 覆盖率 | - | >90% |

---

*报告生成: 2026-03-27*
*下次审查: 2026-04-27*
