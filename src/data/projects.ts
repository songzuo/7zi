export interface Project {
  id: string
  slug: string
  title: string
  description: string
  category: 'website' | 'app' | 'ai' | 'design'
  thumbnail: string
  images: string[]
  techStack: string[]
  client?: string
  duration: string
  highlights: string[]
  testimonial?: {
    author: string
    role?: string
    content: string
  }
  links: {
    live?: string
    github?: string
  }
}

export const projects: Project[] = [
  {
    id: '1',
    slug: 'ai-ecommerce-platform',
    title: 'AI 智能电商平台',
    description:
      '为某知名品牌打造的 AI 驱动电商平台，集成智能推荐、智能客服、智能搜索等功能，大幅提升用户转化率和购物体验。',
    category: 'ai',
    thumbnail: 'https://images.unsplash.com/photo-1661956602116-aa6865609028?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1661956602116-aa6865609028?w=1200&q=80',
      'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80',
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
    ],
    techStack: ['Next.js', 'OpenAI', 'PostgreSQL', 'Redis', 'Tailwind CSS', 'Vercel'],
    client: '某知名零售品牌',
    duration: '3 个月',
    highlights: [
      'AI 推荐系统提升转化率 35%',
      '智能客服减少人工成本 60%',
      '日均处理 10万+ 用户请求',
      '支持多语言多币种',
    ],
    testimonial: {
      author: '张总',
      role: '电商运营总监',
      content:
        '7zi Studio 的 AI 解决方案彻底改变了我们的电商运营模式，转化率大幅提升，客户满意度也创历史新高。',
    },
    links: {
      live: 'https://example.com',
    },
  },
  {
    id: '2',
    slug: 'fintech-mobile-app',
    title: '金融科技移动应用',
    description:
      '为金融科技公司开发的移动端应用，支持资产管理、投资分析、智能投顾等功能，安全可靠，用户体验优秀。',
    category: 'app',
    thumbnail: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&q=80',
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80',
      'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1200&q=80',
    ],
    techStack: ['React Native', 'TypeScript', 'Node.js', 'MongoDB', 'AWS', 'Firebase'],
    client: '某金融科技公司',
    duration: '4 个月',
    highlights: ['银行级安全加密', '实时数据同步', '支持 iOS 和 Android', 'App Store 评分 4.8'],
    testimonial: {
      author: '李总',
      role: '产品负责人',
      content:
        '专业、高效、安全，7zi Studio 团队完美理解金融行业的特殊需求，交付的产品超出了我们的预期。',
    },
    links: {
      live: 'https://apps.apple.com',
    },
  },
  {
    id: '3',
    slug: 'saas-dashboard',
    title: '企业级 SaaS 仪表盘',
    description:
      '为 SaaS 企业打造的数据可视化仪表盘，支持多维度数据分析、实时监控、自定义报表等功能。',
    category: 'website',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80',
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
      'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=1200&q=80',
    ],
    techStack: ['Next.js', 'TypeScript', 'Prisma', 'PostgreSQL', 'Chart.js', 'Vercel'],
    client: '某 SaaS 企业',
    duration: '2 个月',
    highlights: ['响应式设计，支持移动端', '实时数据更新', '自定义图表和报表', '多租户架构'],
    links: {
      live: 'https://example-saas.com',
      github: 'https://github.com/example/saas-dashboard',
    },
  },
  {
    id: '4',
    slug: 'brand-identity-design',
    title: '品牌视觉识别系统',
    description:
      '为创业公司打造的全新品牌视觉识别系统，包括 Logo 设计、品牌色彩、字体规范、应用物料等完整方案。',
    category: 'design',
    thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&q=80',
      'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=1200&q=80',
      'https://images.unsplash.com/photo-1572044162444-ad60e1282e98?w=1200&q=80',
    ],
    techStack: ['Figma', 'Adobe Illustrator', 'Adobe Photoshop', 'After Effects'],
    client: '某科技创业公司',
    duration: '1.5 个月',
    highlights: ['完整品牌 VI 系统', 'Logo 及应用规范', '社交媒体模板', '品牌使用指南'],
    testimonial: {
      author: '王总',
      role: '创始人',
      content: '7zi Studio 帮我们建立了专业且有辨识度的品牌形象，这对我们后续的市场推广帮助很大。',
    },
    links: {},
  },
  {
    id: '5',
    slug: 'ai-content-platform',
    title: 'AI 内容创作平台',
    description:
      '基于大语言模型的 AI 内容创作平台，支持文章生成、图片生成、视频脚本创作等多种内容形式。',
    category: 'ai',
    thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80',
      'https://images.unsplash.com/photo-1676299081847-824916de030a?w=1200&q=80',
      'https://images.unsplash.com/photo-1675557009995-ac5cf5bc2c70?w=1200&q=80',
    ],
    techStack: ['Next.js', 'OpenAI API', 'Stable Diffusion', 'Redis', 'PostgreSQL', 'AWS'],
    client: '某媒体集团',
    duration: '5 个月',
    highlights: ['支持多模态内容生成', '自定义模型微调', '团队协作功能', '日活用户 5000+'],
    testimonial: {
      author: '陈总',
      role: '内容总监',
      content: '这个平台大大提升了我们的内容生产效率，AI 的创意输出质量令人惊喜。',
    },
    links: {
      live: 'https://ai-content.example.com',
    },
  },
  {
    id: '6',
    slug: 'health-fitness-app',
    title: '健康健身应用',
    description:
      '集运动追踪、饮食记录、健康数据分析于一体的健康管理应用，帮助用户养成健康生活习惯。',
    category: 'app',
    thumbnail: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=1200&q=80',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80',
      'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=1200&q=80',
    ],
    techStack: ['React Native', 'Expo', 'Node.js', 'MongoDB', 'HealthKit', 'Google Fit API'],
    client: '某健康科技公司',
    duration: '3 个月',
    highlights: ['智能运动推荐', 'AI 饮食分析', '健康数据可视化', '社交挑战功能'],
    links: {
      live: 'https://apps.apple.com',
    },
  },
  {
    id: '7',
    slug: 'corporate-website',
    title: '企业官网重设计',
    description:
      '为传统企业打造的现代化官网，融合品牌调性与数字体验，提升企业在互联网时代的品牌形象。',
    category: 'website',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80',
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&q=80',
    ],
    techStack: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'Vercel'],
    client: '某制造业企业',
    duration: '1 个月',
    highlights: ['响应式设计', 'SEO 优化', '性能优化（Lighthouse 95+）', '多语言支持'],
    testimonial: {
      author: '刘总',
      role: '市场总监',
      content: '新官网上线后，我们的品牌形象得到了显著提升，线上询盘数量增加了 200%。',
    },
    links: {
      live: 'https://corporate.example.com',
    },
  },
  {
    id: '8',
    slug: 'ui-kit-design',
    title: '企业级 UI 组件库',
    description:
      '为开发团队打造的企业级 UI 组件库，包含 50+ 组件，支持主题定制、暗黑模式、无障碍访问。',
    category: 'design',
    thumbnail: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=1200&q=80',
      'https://images.unsplash.com/photo-1545235617-9465d2a55698?w=1200&q=80',
      'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1200&q=80',
    ],
    techStack: ['Figma', 'React', 'TypeScript', 'Storybook', 'Tailwind CSS'],
    client: '某互联网公司',
    duration: '2 个月',
    highlights: ['50+ 组件', '完整设计规范', '暗黑模式支持', 'WCAG 2.1 无障碍'],
    links: {
      github: 'https://github.com/example/ui-kit',
    },
  },
]

export const categories = [
  { key: 'all', label: '全部', labelEn: 'All' },
  { key: 'website', label: '网站', labelEn: 'Website' },
  { key: 'app', label: '应用', labelEn: 'App' },
  { key: 'ai', label: 'AI', labelEn: 'AI' },
  { key: 'design', label: '设计', labelEn: 'Design' },
] as const

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find(p => p.slug === slug)
}

export function getProjectsByCategory(category: string): Project[] {
  if (category === 'all') return projects
  return projects.filter(p => p.category === category)
}
