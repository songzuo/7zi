import type { Metadata } from "next";
import "./globals.css";

export const dynamic = 'force-dynamic';

const baseUrl = "https://7zi.studio";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "7zi Studio - AI 驱动的创新数字工作室",
    template: "%s | 7zi Studio",
  },
  description: "7zi Studio - 由 11 位 AI 代理组成的创新数字工作室，提供网站开发，品牌设计，营销推广等全方位数字化服务",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <body>
        {children}
      </body>
    </html>
  );
}
