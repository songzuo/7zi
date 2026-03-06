/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://7zi.com',
  generateRobotsTxt: true,
  outDir: './public',
  
  // 排除特定路径
  exclude: [
    '/api/*',
    '/api-docs',
    '/performance',
  ],
  
  // 包含的页面及其优先级
  include: [
    '/',
    '/dashboard',
    '/tasks',
    '/settings',
    '/profile',
    '/charts',
  ],
  
  // 页面优先级和更新频率配置
  priority: 1.0,
  changefreq: 'daily',
  
  // 额外的 sitemap 配置
  additionalSitemaps: [],
  
  // 生成站点地图索引
  generateIndexSitemap: false,
  
  // robots.txt 配置
  robotsTxtOptions: {
    // 允许所有爬虫
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/api-docs'],
      },
      // 允许 AI 相关爬虫
      {
        userAgent: ['GPTBot', 'ChatGPT-User', 'Google-Extended', 'Claude-Web', 'Anthropic-AI'],
        allow: '/',
      },
    ],
    // 额外的 robots.txt 内容
    additionalSitemaps: [
      'https://7zi.com/sitemap.xml',
    ],
  },
  
  // 变换函数 - 为每个 URL 设置特定属性
  transform: async (config, path) => {
    // 根据页面设置不同的优先级和更新频率
    const pageConfig = {
      '/': {
        priority: 1.0,
        changefreq: 'daily',
        lastmod: new Date().toISOString().split('T')[0],
      },
      '/dashboard': {
        priority: 0.9,
        changefreq: 'always', // 实时更新
        lastmod: new Date().toISOString().split('T')[0],
      },
      '/tasks': {
        priority: 0.9,
        changefreq: 'hourly',
        lastmod: new Date().toISOString().split('T')[0],
      },
      '/profile': {
        priority: 0.6,
        changefreq: 'weekly',
        lastmod: new Date().toISOString().split('T')[0],
      },
      '/settings': {
        priority: 0.5,
        changefreq: 'monthly',
        lastmod: new Date().toISOString().split('T')[0],
      },
      '/charts': {
        priority: 0.7,
        changefreq: 'weekly',
        lastmod: new Date().toISOString().split('T')[0],
      },
    };

    const pageSettings = pageConfig[path] || {
      priority: 0.5,
      changefreq: 'weekly',
      lastmod: new Date().toISOString().split('T')[0],
    };

    return {
      loc: path,
      ...pageSettings,
      alternateRefs: [
        {
          href: `https://7zi.com${path}`,
          hreflang: 'zh-CN',
        },
        {
          href: `https://7zi.com/en${path}`,
          hreflang: 'en',
        },
      ],
    };
  },
};