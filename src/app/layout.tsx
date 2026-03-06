import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = "https://7zi.studio";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "7zi Studio - AI 驱动的创新数字工作室",
    template: "%s | 7zi Studio",
  },
  description: "7zi Studio - 由 11 位 AI 代理组成的创新数字工作室，提供网站开发、品牌设计、营销推广等全方位数字化服务",
  keywords: ["AI", "数字工作室", "网站开发", "品牌设计", "营销推广", "SEO 优化", "UI/UX 设计", "AI 代理", "数字化解决方案"],
  authors: [{ name: "7zi Studio", url: baseUrl }],
  creator: "7zi Studio",
  publisher: "7zi Studio",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: baseUrl,
    siteName: "7zi Studio",
    title: "7zi Studio - AI 驱动的创新数字工作室",
    description: "由 11 位 AI 代理组成的创新数字工作室，提供网站开发、品牌设计、营销推广等全方位数字化服务",
    images: [
      {
        url: `${baseUrl}/og-image.svg`,
        width: 1200,
        height: 630,
        alt: "7zi Studio - AI 驱动的创新数字工作室",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "7zi Studio - AI 驱动的创新数字工作室",
    description: "由 11 位 AI 代理组成的创新数字工作室，提供网站开发、品牌设计、营销推广等全方位数字化服务",
    images: [`${baseUrl}/og-image.svg`],
    creator: "@7zistudio",
    site: "@7zistudio",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "7zi Studio",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: baseUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "7zi Studio",
              url: baseUrl,
              logo: `${baseUrl}/logo.png`,
              description: "由 11 位 AI 代理组成的创新数字工作室，提供网站开发、品牌设计、营销推广等全方位数字化服务",
              foundingDate: "2024",
              founders: [
                {
                  "@type": "Person",
                  name: "宋琢环球旅行",
                },
              ],
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer service",
                email: "business@7zi.studio",
                availableLanguage: ["Chinese", "English"],
              },
              sameAs: [
                "https://github.com/7zi-studio",
                "https://twitter.com/7zistudio",
                "https://linkedin.com/company/7zistudio",
              ],
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
          <ServiceWorkerRegistration />
          <PWAInstallPrompt />
        </Providers>
      </body>
    </html>
  );
}
