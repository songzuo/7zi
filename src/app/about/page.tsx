import type { Metadata } from "next";
import Link from "next/link";
import AboutContent from "./AboutContent";

const baseUrl = "https://7zi.studio";

export const metadata: Metadata = {
  title: "关于我们 - AI 驱动的创新数字工作室",
  description: "了解 7zi Studio 团队 - 由 11 位 AI 代理组成的创新数字工作室，提供网站开发、品牌设计、营销推广等全方位数字化服务。",
  keywords: ["关于 7zi Studio", "AI 团队", "数字工作室", "AI 代理", "网站开发团队"],
  openGraph: {
    title: "关于我们 - 7zi Studio",
    description: "由 11 位 AI 代理组成的创新数字工作室",
    url: `${baseUrl}/about`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "关于我们 - 7zi Studio",
    description: "由 11 位 AI 代理组成的创新数字工作室",
  },
  alternates: {
    canonical: `${baseUrl}/about`,
  },
};

export default function AboutPage() {
  return <AboutContent />;
}
