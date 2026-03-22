import { Metadata } from 'next'
import { ArticleSchema, BreadcrumbSchema } from '@/components/SEO'

/**
 * 博客文章页面 Metadata 配置示例
 */
export async function generateBlogPostMetadata({
  title,
  excerpt,
  slug,
  author = '7zi Studio',
  tags = [],
  category = '技术',
  locale = 'zh' as const,
}: {
  title: string
  excerpt: string
  slug: string
  author?: string
  tags?: string[]
  category?: string
  locale?: 'zh' | 'en'
}): Promise<Metadata> {
  const baseUrl = 'https://7zi.com'
  const date = new Date().toISOString().split('T')[0]

  return {
    title,
    description: excerpt,
    keywords: tags,
    authors: [{ name: author }],
    openGraph: {
      type: 'article',
      title,
      description: excerpt,
      url: `${baseUrl}/${locale}/blog/${slug}`,
      publishedTime: date,
      modifiedTime: date,
      authors: [author],
      tags,
      section: category,
      images: [
        {
          url: '/opengraph-image.png',
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: excerpt,
    },
  }
}

/**
 * 博客文章页面组件示例
 */
export default async function BlogPostPage({
  params,
}: {
  params: { slug: string; locale: string }
}) {
  const { slug, locale } = params
  const baseUrl = 'https://7zi.com'
  const date = new Date().toISOString().split('T')[0]

  // 示例博客数据
  const blogPost = {
    title: 'AI 智能体：未来工作的新范式',
    excerpt: '探索 AI 智能体如何改变我们的工作方式，提升效率与创造力',
    author: '7zi Studio',
    tags: ['AI', '智能体', '未来工作', '生产力'],
    category: '技术趋势',
  }

  // 面包屑导航
  const breadcrumbs = [
    { name: '首页', nameEn: 'Home', path: '/' },
    { name: '博客', nameEn: 'Blog', path: '/blog' },
    { name: blogPost.title, nameEn: blogPost.title, path: `/blog/${slug}` },
  ]

  return (
    <>
      {/* 面包屑 Schema */}
      <BreadcrumbSchema
        breadcrumbs={breadcrumbs}
        baseUrl={baseUrl}
        locale={locale as 'zh' | 'en'}
      />

      {/* 文章 Schema */}
      <ArticleSchema
        headline={blogPost.title}
        description={blogPost.excerpt}
        url={`${baseUrl}/${locale}/blog/${slug}`}
        datePublished={date}
        dateModified={date}
        author={blogPost.author}
        authorUrl={`${baseUrl}/team`}
        tags={blogPost.tags}
        category={blogPost.category}
        wordCount={1500}
      />

      {/* 页面内容 */}
      <main>
        <h1>{blogPost.title}</h1>
        <p>{blogPost.excerpt}</p>
      </main>
    </>
  )
}
