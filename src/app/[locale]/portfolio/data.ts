export type ProjectCategory = 'website' | 'app' | 'ai' | 'design'

export interface Project {
  id: string
  slug: string
  title: string
  titleZh: string
  description: string
  descriptionZh: string
  category: ProjectCategory
  thumbnail: string
  images: string[]
  techStack: string[]
  client?: string
  duration: string
  year: string
  highlights: string[]
  highlightsZh: string[]
  links: {
    live?: string
    github?: string
  }
}

// 示例项目数据
export const projects: Project[] = [
  {
    id: '1',
    slug: 'ai-customer-service-platform',
    title: 'AI Customer Service Platform',
    titleZh: 'AI 智能客服平台',
    description:
      'An intelligent customer service system based on LLM, supporting multi-turn conversations, intent recognition, and knowledge base retrieval, helping enterprises improve customer service efficiency by 300%.',
    descriptionZh:
      '基于大语言模型的智能客服系统，支持多轮对话、意图识别、知识库检索，帮助企业提升客服效率 300%。',
    category: 'ai',
    thumbnail: '/images/portfolio/ai-customer-service.jpg',
    images: [
      '/images/portfolio/ai-customer-service-1.jpg',
      '/images/portfolio/ai-customer-service-2.jpg',
      '/images/portfolio/ai-customer-service-3.jpg',
    ],
    techStack: ['Next.js', 'OpenAI', 'PostgreSQL', 'Redis', 'Tailwind CSS'],
    client: 'TechCorp Inc.',
    duration: '3 months',
    year: '2024',
    highlights: [
      'Real-time translation in 50+ languages',
      '99.9% system availability',
      'Average response time < 500ms',
      'Customer satisfaction increased by 45%',
    ],
    highlightsZh: [
      '支持 50+ 种语言的实时翻译',
      '99.9% 系统可用性',
      '平均响应时间 < 500ms',
      '客户满意度提升 45%',
    ],
    links: {
      live: 'https://example.com/ai-cs',
    },
  },
  {
    id: '2',
    slug: 'ecommerce-fashion-store',
    title: 'Fashion E-commerce Website',
    titleZh: '时尚电商网站',
    description:
      'High-end fashion brand e-commerce website with modern design, multi-language and multi-currency support, integrated intelligent recommendation system, conversion rate increased by 60%.',
    descriptionZh:
      '高端时尚品牌电商网站，采用现代化设计，支持多语言、多货币，集成智能推荐系统，转化率提升 60%。',
    category: 'website',
    thumbnail: '/images/portfolio/fashion-ecommerce.jpg',
    images: [
      '/images/portfolio/fashion-ecommerce-1.jpg',
      '/images/portfolio/fashion-ecommerce-2.jpg',
      '/images/portfolio/fashion-ecommerce-3.jpg',
    ],
    techStack: ['Next.js', 'Stripe', 'Prisma', 'PostgreSQL', 'Tailwind CSS'],
    client: 'LUXE Fashion',
    duration: '4 months',
    year: '2024',
    highlights: [
      'Responsive design, perfect for all devices',
      'Integrated smart size recommendation',
      'Support for 10+ payment methods',
      'Page load time < 1.5s',
    ],
    highlightsZh: [
      '响应式设计，完美适配所有设备',
      '集成智能尺码推荐',
      '支持 10+ 种支付方式',
      '页面加载速度 < 1.5s',
    ],
    links: {
      live: 'https://example.com/fashion',
      github: 'https://github.com/example/fashion-store',
    },
  },
  {
    id: '3',
    slug: 'fitness-tracking-app',
    title: 'Fitness Tracking App',
    titleZh: '健身追踪应用',
    description:
      'Cross-platform fitness tracking app with workout logging, diet management, and social sharing, with 100K+ active users.',
    descriptionZh: '跨平台健身追踪应用，支持运动记录、饮食管理、社交分享，拥有 10 万+ 活跃用户。',
    category: 'app',
    thumbnail: '/images/portfolio/fitness-app.jpg',
    images: [
      '/images/portfolio/fitness-app-1.jpg',
      '/images/portfolio/fitness-app-2.jpg',
      '/images/portfolio/fitness-app-3.jpg',
    ],
    techStack: ['React Native', 'Node.js', 'MongoDB', 'Firebase', 'GraphQL'],
    client: 'FitLife Co.',
    duration: '6 months',
    year: '2024',
    highlights: [
      'Support for 100+ workout types',
      'AI workout plan recommendations',
      'Offline data sync',
      'Social challenge features',
    ],
    highlightsZh: ['支持 100+ 种运动类型', 'AI 运动计划推荐', '离线数据同步', '社交挑战功能'],
    links: {
      live: 'https://example.com/fitness',
    },
  },
  {
    id: '4',
    slug: 'brand-identity-tech-startup',
    title: 'Tech Startup Brand Identity',
    titleZh: '科技公司品牌设计',
    description:
      'Complete brand identity for a tech startup, including logo design, visual identity system, and marketing materials.',
    descriptionZh: '为科技创业公司打造全新品牌形象，包括 Logo 设计、视觉识别系统、营销物料设计。',
    category: 'design',
    thumbnail: '/images/portfolio/brand-design.jpg',
    images: [
      '/images/portfolio/brand-design-1.jpg',
      '/images/portfolio/brand-design-2.jpg',
      '/images/portfolio/brand-design-3.jpg',
    ],
    techStack: ['Figma', 'Adobe Illustrator', 'After Effects'],
    client: 'NovaTech Startup',
    duration: '2 months',
    year: '2024',
    highlights: [
      'Complete visual identity system',
      '30+ marketing material designs',
      'Brand guideline manual',
      'Animated logo presentation',
    ],
    highlightsZh: ['完整的品牌视觉识别系统', '30+ 营销物料设计', '品牌指南手册', '动态 Logo 展示'],
    links: {
      live: 'https://example.com/novatech',
    },
  },
  {
    id: '5',
    slug: 'real-estate-platform',
    title: 'Real Estate Platform',
    titleZh: '房地产交易平台',
    description:
      'Comprehensive real estate platform with property listings, VR tours, and online contract signing, 500K+ monthly active users.',
    descriptionZh: '综合性房地产交易平台，支持房源发布、VR 看房、在线签约，月活跃用户 50 万+。',
    category: 'website',
    thumbnail: '/images/portfolio/real-estate.jpg',
    images: [
      '/images/portfolio/real-estate-1.jpg',
      '/images/portfolio/real-estate-2.jpg',
      '/images/portfolio/real-estate-3.jpg',
    ],
    techStack: ['Next.js', 'Three.js', 'PostgreSQL', 'Elasticsearch', 'AWS'],
    client: 'HomeFind Inc.',
    duration: '8 months',
    year: '2023',
    highlights: [
      '360° VR property tours',
      'Smart property recommendation algorithm',
      'Online e-signature',
      'Map visualization search',
    ],
    highlightsZh: ['360° VR 房源展示', '智能房源推荐算法', '在线电子签约', '地图可视化搜索'],
    links: {
      live: 'https://example.com/homefind',
    },
  },
  {
    id: '6',
    slug: 'ai-content-generator',
    title: 'AI Content Generator',
    titleZh: 'AI 内容生成平台',
    description:
      'AI-powered content creation platform supporting article, image, and video generation, helping marketing teams increase efficiency by 5x.',
    descriptionZh: 'AI 驱动的内容创作平台，支持文章、图片、视频生成，帮助营销团队效率提升 5 倍。',
    category: 'ai',
    thumbnail: '/images/portfolio/ai-content.jpg',
    images: [
      '/images/portfolio/ai-content-1.jpg',
      '/images/portfolio/ai-content-2.jpg',
      '/images/portfolio/ai-content-3.jpg',
    ],
    techStack: ['Python', 'FastAPI', 'PyTorch', 'React', 'Redis'],
    client: 'ContentPro Ltd.',
    duration: '5 months',
    year: '2024',
    highlights: [
      'Support for 20+ content templates',
      'Batch content generation',
      'SEO optimization suggestions',
      'One-click multi-platform publishing',
    ],
    highlightsZh: ['支持 20+ 内容模板', '批量内容生成', 'SEO 优化建议', '多平台一键发布'],
    links: {
      live: 'https://example.com/contentpro',
      github: 'https://github.com/example/ai-content',
    },
  },
]

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find(p => p.slug === slug)
}

export function getRelatedProjects(
  currentSlug: string,
  category: ProjectCategory,
  limit: number = 3
): Project[] {
  return projects.filter(p => p.slug !== currentSlug && p.category === category).slice(0, limit)
}

export function getProjectsByCategory(category: ProjectCategory | 'all'): Project[] {
  if (category === 'all') return projects
  return projects.filter(p => p.category === category)
}
