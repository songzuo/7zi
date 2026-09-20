import { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://7zi.com"

  const mainPages = [
    { route: "", priority: 1 },
    { route: "/about", priority: 0.9 },
    { route: "/shop", priority: 0.9 },
    { route: "/image-optimization-demo", priority: 0.5 },
    { route: "/notification-demo", priority: 0.5 },
    { route: "/notification-demo/enhanced", priority: 0.5 },
    { route: "/design-system", priority: 0.5 },
    { route: "/feedback", priority: 0.5 },
    { route: "/i18n-demo", priority: 0.5 },
    { route: "/dark-mode-demo", priority: 0.5 },
    { route: "/websocket-status-demo", priority: 0.5 },
    { route: "/monitoring-example", priority: 0.5 },
  ]

  const erhuPages = [
    { route: "/erhu/brand", title: "为尔虎品牌" },
    { route: "/erhu/company", title: "尔虎公司" },
    { route: "/erhu/shanghai", title: "上海尔虎" },
    { route: "/erhu/hunan", title: "湖南尔虎" },
    { route: "/erhu/changsha", title: "长沙尔虎" },
    { route: "/erhu/uk", title: "英国尔虎" },
  ]

  const locales = ["zh-CN", "en"]
  const localePages = ["/knowledge-lattice"]

  const routes: MetadataRoute.Sitemap = [
    ...mainPages.map((p) => ({
      url: `${baseUrl}${p.route}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: p.priority,
    })),
    ...erhuPages.map((p) => ({
      url: `${baseUrl}${p.route}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...locales.flatMap((locale) =>
      localePages.map((route) => ({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
        alternates: {
          languages: {
            "zh-CN": `${baseUrl}/zh-CN${route}`,
            en: `${baseUrl}/en${route}`,
          },
        },
      }))
    ),
  ]

  return routes
}
