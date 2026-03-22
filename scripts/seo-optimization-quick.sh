#!/bin/bash
# SEO 优化快速实施脚本
# 用途: 应用 robots.txt 优化并验证 SEO 配置

set -e

PROJECT_DIR="/root/.openclaw/workspace/7zi-project"
ROBOTS_TXT="$PROJECT_DIR/public/robots.txt"
SITEMAP_XML="$PROJECT_DIR/public/sitemap.xml"

echo "🔍 SEO 优化实施脚本"
echo "======================"
echo ""

# 检查项目目录
if [ ! -d "$PROJECT_DIR" ]; then
  echo "❌ 错误: 项目目录不存在: $PROJECT_DIR"
  exit 1
fi

echo "✅ 项目目录: $PROJECT_DIR"
echo ""

# 1. 备份现有文件
echo "📦 1. 备份现有 SEO 文件..."
if [ -f "$ROBOTS_TXT" ]; then
  cp "$ROBOTS_TXT" "${ROBOTS_TXT}.backup.$(date +%Y%m%d_%H%M%S)"
  echo "   ✅ 已备份: robots.txt"
fi
if [ -f "$SITEMAP_XML" ]; then
  cp "$SITEMAP_XML" "${SITEMAP_XML}.backup.$(date +%Y%m%d_%H%M%S)"
  echo "   ✅ 已备份: sitemap.xml"
fi
echo ""

# 2. 更新 robots.txt
echo "🤖 2. 更新 robots.txt..."
cat > "$ROBOTS_TXT" << 'EOF'
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
EOF

echo "   ✅ robots.txt 已更新"
echo ""

# 3. 验证文件可访问性（如果项目正在运行）
echo "🔗 3. 验证 SEO 文件可访问性..."
echo "   提示: 请确保项目在本地或服务器上运行"
echo ""
echo "   测试命令："
echo "   curl -I http://localhost:3000/robots.txt"
echo "   curl -I http://localhost:3000/sitemap.xml"
echo ""

# 4. 检查结构化数据组件
echo "📊 4. 检查结构化数据组件..."
SEO_COMPONENT="$PROJECT_DIR/src/components/SEO.tsx"
if [ -f "$SEO_COMPONENT" ]; then
  echo "   ✅ SEO 组件存在: $SEO_COMPONENT"

  # 检查是否导出了必要的组件
  if grep -q "ArticleSchema" "$SEO_COMPONENT"; then
    echo "   ✅ ArticleSchema 组件可用"
  fi
  if grep -q "ServiceSchema" "$SEO_COMPONENT"; then
    echo "   ✅ ServiceSchema 组件可用"
  fi
  if grep -q "StructuredData" "$SEO_COMPONENT"; then
    echo "   ✅ StructuredData 组件可用"
  fi
else
  echo "   ⚠️  警告: SEO 组件不存在: $SEO_COMPONENT"
fi
echo ""

# 5. 生成结构化数据使用示例
echo "📝 5. 生成结构化数据使用示例..."
EXAMPLE_DIR="$PROJECT_DIR/docs/seo-examples"
mkdir -p "$EXAMPLE_DIR"

cat > "$EXAMPLE_DIR/blog-article-schema.txt" << 'EOF'
# 博客文章页面添加 ArticleSchema 示例

位置: src/app/[locale]/blog/[slug]/page.tsx

在文件顶部添加导入:
import { ArticleSchema } from '@/components/SEO';

在 generateMetadata 函数中:
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getBlogPost(slug, locale);

  return {
    // ... 现有 metadata
    openGraph: {
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.date,
      authors: [post.author],
      tags: post.tags,
    },
  };
}

在页面组件返回中添加:
return (
  <>
    <ArticleSchema
      title={post.title}
      description={post.excerpt}
      url={`${baseUrl}/${locale}/blog/${slug}`}
      datePublished={post.date}
      author={post.author}
      tags={post.tags}
      category={post.category}
    />
    {/* 页面内容 */}
  </>
);
EOF

cat > "$EXAMPLE_DIR/blog-breadcrumb-schema.txt" << 'EOF'
# 博客列表页添加 BreadcrumbSchema 示例

位置: src/app/[locale]/blog/page.tsx

在文件顶部添加导入:
import { StructuredData } from '@/components/SEO';

在页面组件中:
const breadcrumbs = [
  { name: '首页', nameEn: 'Home', path: '/' },
  { name: '博客', nameEn: 'Blog', path: '/blog' },
];

return (
  <>
    <StructuredData
      locale={locale as 'zh' | 'en'}
      schemas={['website', 'organization', 'breadcrumb']}
      breadcrumbs={breadcrumbs}
    />
    {/* 页面内容 */}
  </>
);
EOF

echo "   ✅ 已生成结构化数据使用示例: $EXAMPLE_DIR"
echo ""

# 6. 生成 Google Search Console 集成指南
cat > "$EXAMPLE_DIR/google-search-console-setup.txt" << 'EOF'
# Google Search Console 集成指南

## 方法 1: HTML 标记验证（推荐）

1. 访问 https://search.google.com/search-console/
2. 点击"添加资源"
3. 输入域名: 7zi.studio
4. 选择"HTML 标记"验证方法
5. 将提供的 <meta> 标签添加到以下位置:

文件: src/app/[locale]/layout.tsx
位置: <head> 标签内

示例:
<head>
  <meta name="google-site-verification" content="YOUR_VERIFICATION_CODE" />

  {/* ... 其他 head 标签 */}
</head>

## 方法 2: DNS 验证

在域名 DNS 设置中添加 TXT 记录:

类型: TXT
主机记录: @
记录值: google-site-verification=YOUR_VERIFICATION_CODE

## 验证后配置

1. 提交站点地图: https://7zi.studio/sitemap.xml
2. 设置国际化目标: Settings > International targeting
3. 监控索引覆盖和核心网页指标

## 定期检查清单

- [ ] 每周查看索引覆盖
- [ ] 每周查看核心网页指标
- [ ] 每月查看移动设备可用性
- [ ] 每月查看手动操作
EOF

echo "   ✅ 已生成 Search Console 集成指南"
echo ""

# 7. 显示后续步骤
echo "🚀 6. 后续实施步骤"
echo "======================"
echo ""
echo "📋 高优先级任务（立即完成）："
echo "   1. ✅ robots.txt 已更新（完成）"
echo "   2. ⏳ 博客文章添加 ArticleSchema (需要开发)"
echo "   3. ⏳ 博客列表添加 BreadcrumbSchema (需要开发)"
echo ""
echo "📋 中优先级任务（本周完成）："
echo "   4. ⏳ 各页面添加特定结构化数据 (需要开发)"
echo "   5. ⏳ Google Search Console 集成 (需要 SEO 专员)"
echo ""
echo "📋 低优先级任务（下月完成）："
echo "   6. ⏳ 自动生成 sitemap (需要开发)"
echo "   7. ⏳ 设置 SEO 监控和报警 (需要运维)"
echo ""

# 8. 生成验证命令
echo "🔧 7. 验证命令"
echo "======================"
echo ""
echo "本地测试（需要先启动开发服务器）："
echo "  cd $PROJECT_DIR"
echo "  npm run dev"
echo ""
echo "在另一个终端运行："
echo "  # 验证 robots.txt"
echo "  curl -I http://localhost:3000/robots.txt"
echo ""
echo "  # 验证 sitemap.xml"
echo "  curl -I http://localhost:3000/sitemap.xml"
echo ""
echo "  # 验证结构化数据"
echo "  curl http://localhost:3000/zh | grep -o 'application/ld+json'"
echo ""
echo "线上测试（部署后）："
echo "  # 验证 robots.txt"
echo "  curl -I https://7zi.studio/robots.txt"
echo ""
echo "  # 验证 sitemap.xml"
echo "  curl -I https://7zi.studio/sitemap.xml"
echo ""
echo "  # Google 富媒体结果测试"
echo "  # 访问: https://search.google.com/test/rich-results"
echo ""

echo "✅ SEO 优化脚本执行完成！"
echo ""
echo "📄 详细优化建议请查看:"
echo "   $PROJECT_DIR/SEO_OPTIMIZATION_RECOMMENDATIONS.md"
echo ""
echo "📁 结构化数据使用示例:"
echo "   $EXAMPLE_DIR/"
echo ""
