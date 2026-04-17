# 7zi 项目 SEO 推广综合评审报告

**评审日期**: 2026-04-12
**评审人**: 📣 推广专员（子代理）
**工作目录**: /root/.openclaw/workspace
**版本**: v1.0

---

## 📋 执行摘要

7zi 项目已有相当完善的 SEO 基础设施，但存在**域名不一致**这一核心问题，以及多个可优化项。综合评分 **⭐⭐⭐ (3.2/5)**。

| 维度 | 评分 | 核心问题 |
|------|------|----------|
| 技术 SEO | ⭐⭐⭐⭐ | minimumCacheTTL 偏低，图片缓存不足 |
| sitemap/robots | ⭐⭐⭐ | sitemap 路径不完整，缺少主要页面 |
| 结构化数据 | ⭐⭐⭐ | Organization 完善，缺少 WebSite/Service Schema |
| 国际化 SEO | ⭐⭐⭐⭐ | hreflang 正确，alternate languages 完整 |
| GSC/分析集成 | ⭐ | 完全缺失验证和监控 |
| 社交媒体整合 | ⭐⭐⭐ | Twitter Card 完整，OG 标签完善 |
| 推广渠道 | ⭐⭐ | 外链建设未启动，内容营销计划未执行 |

---

## 🔴 严重问题（P0）

### 1. 域名不一致（最高优先级）

**影响**: sitemap 和 robots.txt 可能生成错误 URL，导致搜索引擎索引失败。

| 配置文件 | baseUrl 默认值 | 实际应为 |
|----------|---------------|---------|
| `src/app/sitemap.ts` | `https://7zi.com` | `https://7zi.studio` |
| `src/app/robots.ts` | `https://7zi.com` | `https://7zi.studio` |
| `public/robots.txt` | ✅ 指向 `7zi.studio` | — |
| `public/sitemap.xml` | ✅ 指向 `7zi.studio` | — |
| `layout.tsx` (src) | ✅ 硬编码 `7zi.studio` | — |

**建议修复**: 在 `.env.production` 中确保设置 `NEXT_PUBLIC_SITE_URL=https://7zi.studio`，并审查所有 sitemap.ts / robots.ts 的环境变量 fallback 逻辑。

### 2. 图片缓存 TTL 过低

**当前**: `minimumCacheTTL: 60`（仅 60 秒）
**建议**: 提升至 `2592000`（30 天），与 `7zi-frontend` 保持一致。

---

## 🟡 中等问题（P1）

### 3. sitemap 路径不完整

**根目录 `src/app/sitemap.ts`** 仅包含 demo 页面：
```
/image-optimization-demo
/notification-demo
/notification-demo/enhanced
/design-system
/feedback
/i18n-demo
/dark-mode-demo
/websocket-status-demo
/monitoring-example
```

**缺失主要页面**（已在 `public/sitemap.xml` 中列出）：
- ❌ `/zh`, `/en`（首页）
- ❌ `/zh/about`, `/en/about`
- ❌ `/zh/team`, `/en/team`
- ❌ `/zh/blog`, `/en/blog`
- ❌ `/zh/contact`, `/en/contact`
- ❌ 所有博客文章页面（8 篇）

**建议**: 完善 `src/app/[locale]/sitemap.ts` 生成逻辑，自动扫描 `[locale]` 下的所有路由。

### 4. robots.txt 与 sitemap.ts 规则冲突

`public/robots.txt` 禁止 `/knowledge-lattice/`，但 sitemap 包含该路径。
需统一：要么从 sitemap 移除，要么从 robots.txt 的 disallow 移除。

### 5. Google Search Console 未集成

| 项目 | 状态 |
|------|------|
| `google-site-verification` meta tag | ❌ 缺失 |
| GSC 验证文件 | ❌ 缺失 |
| GSC API 集成 | ❌ 缺失 |
| Bing Webmaster Tools | ❌ 缺失 |

**建议**: 在 `layout.tsx` 的 metadata 中添加验证标签，并在 GSC 中提交 sitemap。

### 6. 结构化数据不完整

| Schema 类型 | 状态 | 说明 |
|-------------|------|------|
| Organization | ✅ 已有 | 需确认完整性 |
| WebSite (searchAction) | ❌ 缺失 | 强烈建议添加 |
| SoftwareApplication | ❌ 缺失 | 核心产品缺少 |
| FAQPage | ❌ 缺失 | 如有 FAQ 页面 |
| Article | 🟡 部分 | 博客文章页面已有，需检查覆盖 |
| BreadcrumbList | 🟡 部分 | 需确认所有页面都有 |

### 7. 首页 H1 优化空间

首页 H1 标签应包含核心关键词 "AI 驱动的数字工作室" 或类似组合，提升搜索权重。

---

## 🟢 轻微问题（P2）

### 8. Viewport maximumScale=1.0

禁止用户缩放，影响可访问性。建议改为允许适当缩放。

### 9. 缺少 `referrer` meta tag

可考虑添加 `referrer` meta tag 控制引用信息传递。

### 10. OG Image 建议

当前 `og-image.svg` 为纯文字设计，建议增加真实产品截图，增强社交分享吸引力。

### 11. Twitter 账号确认

Twitter Card 声明了 `@7zistudio`，需确认账号存在且活跃。

---

## 📊 sitemap.xml 内容统计（public/）

| 页面类型 | 数量 | changefreq | priority |
|----------|------|------------|----------|
| 首页（/zh, /en） | 2 | weekly | 1.0 |
| 关于我们 | 2 | monthly | 0.8 |
| 团队成员 | 2 | monthly | 0.8 |
| 博客首页 | 2 | daily | 0.9 |
| 联系我们 | 2 | monthly | 0.7 |
| 博客文章 | 8 | yearly | 0.7 |
| **总计** | **18** | — | — |

**评估**: 主要页面覆盖较好，但博客文章仅有中文版本，缺少英文翻译版本。

---

## 📈 推广渠道现状

### 已建立
- ✅ 完整的 Open Graph 标签
- ✅ Twitter Card 配置
- ✅ 多语言 hreflang 标签
- ✅ PWA manifest 配置

### 待执行（来自 `promotion/seo-checklist.md`）

| 渠道 | 状态 | 说明 |
|------|------|------|
| GitHub Trending | ⏳ 未执行 | — |
| V2EX 帖子 | ⏳ 未执行 | — |
| Product Hunt | ⏳ 未执行 | — |
| AI Tools Directory | ⏳ 未执行 | — |
| 知乎专栏 | ⏳ 未执行 | — |
| YouTube/B站 教程 | ⏳ 未执行 | — |
| 技术博客（2篇/月） | ⏳ 未执行 | — |
| 友链建设（5+） | ⏳ 未执行 | — |

---

## 🛠 修复建议清单

### P0 — 立即修复
- [ ] 统一域名：确保 `NEXT_PUBLIC_SITE_URL=https://7zi.studio` 在所有环境生效
- [ ] 修复 `src/app/sitemap.ts` 的 baseUrl fallback 为 `7zi.studio`
- [ ] 修复 `src/app/robots.ts` 的 baseUrl fallback 为 `7zi.studio`
- [ ] 解决 `/knowledge-lattice/` 在 robots.txt 和 sitemap 中的冲突

### P1 — 本周内
- [ ] 完善 sitemap.ts，自动包含 `/zh`, `/en`, `/zh/about`, `/zh/team`, `/zh/blog` 等主要路由
- [ ] 添加 Google Search Console 验证 meta tag
- [ ] 提升 `minimumCacheTTL` 至 `2592000`（30 天）
- [ ] 添加 WebSite + searchAction 结构化数据
- [ ] 提交 sitemap.xml 到 Google Search Console

### P2 — 计划内
- [ ] 添加 SoftwareApplication 或 Service 结构化数据
- [ ] 确认 Twitter 账号活跃状态
- [ ] 添加博客文章英文翻译版本到 sitemap
- [ ] 制作真实产品截图替换/增强 og-image.svg
- [ ] 添加 Bing Webmaster Tools 验证
- [ ] 启用 Viewport 缩放（可访问性改进）

### 推广计划
- [ ] 执行 GitHub Trending 提交流程
- [ ] 撰写 2 篇技术博客文章
- [ ] 提交 Product Hunt
- [ ] 开始友链建设（目标 5+）

---

## 📁 相关文件索引

| 文件 | 说明 |
|------|------|
| `src/app/sitemap.ts` | Next.js sitemap 生成器（需修复 baseUrl） |
| `src/app/robots.ts` | Next.js robots 生成器（需修复 baseUrl） |
| `public/robots.txt` | 静态 robots.txt（已正确配置） |
| `public/sitemap.xml` | 静态 sitemap（已正确配置） |
| `public/manifest.json` | PWA manifest（完善） |
| `public/og-image.svg` | OG 图片（建议增强） |
| `next.config.ts` | 图片缓存 TTL 偏低（需提升） |
| `src/app/[locale]/layout.tsx` | Metadata 配置（需添加 verification） |
| `docs/SEO-OPTIMIZATION.md` | 历史 SEO 文档 |
| `promotion/seo-checklist.md` | 推广待办清单 |
| `promotion/seo-backlinks.md` | 外链策略文档 |
| `REPORT_SEO_CHECK_20260407.md` | 上次检查报告 |

---

*报告生成时间: 2026-04-12 23:38 GMT+2*
