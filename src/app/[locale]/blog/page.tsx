import { setRequestLocale, getTranslations } from "next-intl/server";
import { Locale, locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import type { Metadata } from "next";

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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-8">
          {locale === "zh" ? "博客" : "Blog"}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8">
          {locale === "zh" 
            ? "这里将展示我们的最新文章和更新..." 
            : "Our latest articles and updates will appear here..."}
        </p>
        <Link href="/" className="text-cyan-500 hover:text-cyan-600">
          {locale === "zh" ? "← 返回首页" : "← Back to Home"}
        </Link>
      </div>
    </div>
  );
}
