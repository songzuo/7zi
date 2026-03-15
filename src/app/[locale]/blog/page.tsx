import { setRequestLocale } from "next-intl/server";
import { Locale, locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import type { Metadata } from "next";
import CommentsSection from "@/components/blog/CommentsSection";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "zh" ? "博客 - 7zi Studio" : "Blog - 7zi Studio",
  };
}

export default async function BlogPage({ params }: { params: Params }) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) return null;
  
  setRequestLocale(locale);

  // Sample blog posts (in real app, this would come from a data source)
  const blogPosts = [
    {
      id: "post-001",
      title: locale === "zh" ? "7zi 平台发布公告" : "7zi Platform Launch Announcement",
      excerpt: locale === "zh" 
        ? "我们很高兴宣布 7zi AI 驱动团队管理平台正式发布！"
        : "We are excited to announce the official launch of 7zi AI-powered team management platform!",
      date: "2026-03-14",
    },
    {
      id: "post-002", 
      title: locale === "zh" ? "知识图谱功能介绍" : "Knowledge Graph Feature Introduction",
      excerpt: locale === "zh"
        ? "了解如何使用知识图谱功能来组织和关联您的团队知识"
        : "Learn how to use the knowledge graph feature to organize and connect your team knowledge",
      date: "2026-03-10",
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-8">
          {locale === "zh" ? "博客" : "Blog"}
        </h1>
        
        {/* Blog Posts List */}
        <div className="space-y-8 mb-12">
          {blogPosts.map((post) => (
            <article 
              key={post.id}
              className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg"
            >
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-2">
                {post.title}
              </h2>
              <p className="text-zinc-500 text-sm mb-4">{post.date}</p>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                {post.excerpt}
              </p>
              <Link 
                href={`/blog/${post.id}`}
                className="text-cyan-500 hover:text-cyan-600 font-medium"
              >
                {locale === "zh" ? "阅读全文 →" : "Read more →"}
              </Link>
            </article>
          ))}
        </div>

        {/* Demo Comments Section (for post-001) */}
        <CommentsSection postId="post-001" locale={locale} />
        
        <div className="mt-8">
          <Link href="/" className="text-cyan-500 hover:text-cyan-600">
            {locale === "zh" ? "← 返回首页" : "← Back to Home"}
          </Link>
        </div>
      </div>
    </div>
  );
}
