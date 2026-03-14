import { setRequestLocale } from "next-intl/server";
import { Locale, locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CommentsSection from "@/components/blog/CommentsSection";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, id } = await params;
  const post = getBlogPost(id, locale);
  return {
    title: post ? `${post.title} - 7zi Studio` : "Blog Post - 7zi Studio",
  };
}

function getBlogPost(id: string, locale: string) {
  const posts: Record<string, { title: string; content: string; date: string }> = {
    "post-001": {
      title: locale === "zh" ? "7zi 平台发布公告" : "7zi Platform Launch Announcement",
      date: "2026-03-14",
      content: locale === "zh"
        ? `我们很高兴宣布 7zi AI 驱动团队管理平台正式发布！

7zi 是一个创新的团队管理平台，利用人工智能技术帮助团队更高效地协作和管理任务。

主要功能包括：
• AI 驱动的任务分配
• 知识图谱系统
• 实时通知系统
• 项目管理工具

欢迎体验并提供反馈！`
        : `We are excited to announce the official launch of 7zi AI-powered team management platform!

7zi is an innovative team management platform that uses AI technology to help teams collaborate and manage tasks more efficiently.

Key features include:
• AI-powered task assignment
• Knowledge graph system
• Real-time notifications
• Project management tools

Welcome to try it out and provide feedback!`,
    },
    "post-002": {
      title: locale === "zh" ? "知识图谱功能介绍" : "Knowledge Graph Feature Introduction",
      date: "2026-03-10",
      content: locale === "zh"
        ? `知识图谱是 7zi 平台的核心功能之一，它帮助团队组织和关联知识。

通过知识图谱，您可以：
• 创建概念和知识点
• 建立概念之间的关联
• 进行知识推理
• 发现隐藏的知识联系

这使得团队能够更好地利用集体智慧，提高工作效率。`
        : `The knowledge graph is one of the core features of the 7zi platform, helping teams organize and connect knowledge.

With the knowledge graph, you can:
• Create concepts and knowledge points
• Establish relationships between concepts
• Perform knowledge inference
• Discover hidden knowledge connections

This enables teams to better leverage collective wisdom and improve work efficiency.`,
    },
  };
  return posts[id];
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { locale, id } = await params;
  if (!locales.includes(locale as Locale)) return notFound();
  
  setRequestLocale(locale);

  const post = getBlogPost(id, locale);
  if (!post) return notFound();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <article className="mb-12">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {post.title}
          </h1>
          <p className="text-zinc-500 mb-8">{post.date}</p>
          <div className="prose prose-zinc dark:prose-invert max-w-none">
            {post.content.split("\n").map((line, i) => (
              <p key={i} className={line === "" ? "h-4" : "mb-4"}>
                {line}
              </p>
            ))}
          </div>
        </article>

        {/* Comments Section */}
        <CommentsSection postId={id} locale={locale} />

        {/* Back Link */}
        <div className="mt-8">
          <a 
            href={`/${locale}/blog`}
            className="text-cyan-500 hover:text-cyan-600"
          >
            {locale === "zh" ? "← 返回博客" : "← Back to Blog"}
          </a>
        </div>
      </div>
    </div>
  );
}
