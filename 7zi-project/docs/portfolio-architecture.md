# Portfolio 模块架构设计

## 概述

Portfolio 模块用于展示项目案例，支持 SSG/ISR 部署，每个项目页面独立可被搜索引擎索引。

## 目录结构

```
src/
├── app/
│   ├── [locale]/
│   │   └── portfolio/
│   │       ├── page.tsx              # 项目列表页 (SSG)
│   │       ├── layout.tsx            # Portfolio 布局
│   │       └── [slug]/
│   │           └── page.tsx          # 项目详情页 (ISR)
│   └── api/
│       └── portfolio/
│           ├── route.ts              # GET: 获取项目列表
│           └── [slug]/
│               └── route.ts          # GET: 获取单个项目
│
├── components/
│   └── portfolio/
│       ├── index.ts                  # 导出索引
│       ├── ProjectCard.tsx           # 项目卡片组件
│       ├── ProjectGrid.tsx           # 项目网格布局
│       ├── ProjectFilter.tsx         # 筛选组件
│       ├── ProjectDetail.tsx         # 项目详情组件
│       ├── ProjectGallery.tsx        # 图片画廊
│       ├── TechStackBadge.tsx        # 技术栈标签
│       └── __tests__/
│           └── ProjectCard.test.tsx
│
├── hooks/
│   └── usePortfolio.ts               # Portfolio 数据 Hook
│
├── types/
│   └── portfolio.ts                  # Portfolio 类型定义
│
├── lib/
│   └── portfolio/
│       ├── index.ts                  # 导出
│       ├── utils.ts                  # 工具函数
│       └── constants.ts              # 常量配置
│
└── i18n/
    └── messages/
        ├── en.json                   # 添加 portfolio 翻译
        └── zh.json

data/
└── portfolio-projects.json           # 项目数据源 (也可用 CMS)

public/
└── images/
    └── portfolio/                    # 项目图片
        └── [project-slug]/
            ├── cover.jpg
            ├── screenshot-1.jpg
            └── screenshot-2.jpg
```

## 数据模型

### Project Interface

```typescript
// src/types/portfolio.ts

/** 项目状态 */
export type ProjectStatus = 'active' | 'completed' | 'archived';

/** 项目类型 */
export type ProjectType = 
  | 'web-app' 
  | 'mobile-app' 
  | 'desktop-app' 
  | 'library' 
  | 'tool' 
  | 'design';

/** 项目可见性 */
export type ProjectVisibility = 'public' | 'private' | 'featured';

/** 技术栈 */
export interface TechStack {
  name: string;           // 技术名称
  category: TechCategory; // 分类
  icon?: string;          // 图标路径或 URL
  url?: string;           // 官网链接
}

export type TechCategory = 
  | 'frontend' 
  | 'backend' 
  | 'database' 
  | 'devops' 
  | 'design' 
  | 'other';

/** 项目链接 */
export interface ProjectLink {
  type: 'github' | 'demo' | 'website' | 'docs' | 'other';
  url: string;
  label?: string;
}

/** 项目图片 */
export interface ProjectImage {
  src: string;
  alt: string;
  type: 'cover' | 'screenshot' | 'diagram';
  width?: number;
  height?: number;
}

/** 团队成员 */
export interface ProjectMember {
  name: string;
  role: string;
  avatar?: string;
  url?: string;
}

/** 项目元数据 (SEO) */
export interface ProjectSEO {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
}

/** 多语言内容 */
export interface ProjectContent {
  en: ProjectLocalizedContent;
  zh: ProjectLocalizedContent;
}

export interface ProjectLocalizedContent {
  title: string;
  subtitle?: string;
  description: string;
  challenge?: string;
  solution?: string;
  results?: string[];
  highlights?: string[];
}

/** 项目实体 */
export interface Project {
  id: string;
  slug: string;
  visibility: ProjectVisibility;
  status: ProjectStatus;
  type: ProjectType;
  
  // 多语言内容
  content: ProjectContent;
  
  // 媒体
  images: ProjectImage[];
  
  // 技术
  techStack: TechStack[];
  
  // 链接
  links: ProjectLink[];
  
  // 团队
  team?: ProjectMember[];
  
  // 时间
  startDate: string;
  endDate?: string;
  
  // 统计
  stats?: ProjectStats;
  
  // SEO
  seo: ProjectSEO;
  
  // 分类/标签
  categories: string[];
  tags: string[];
  
  // 排序权重
  featured: boolean;
  order: number;
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
}

/** 项目统计 */
export interface ProjectStats {
  users?: number;
  downloads?: number;
  stars?: number;
  forks?: number;
  views?: number;
}

/** 项目列表项 (简化版) */
export interface ProjectListItem {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  coverImage: string;
  type: ProjectType;
  status: ProjectStatus;
  techStack: string[];
  links: ProjectLink[];
  featured: boolean;
  createdAt: string;
}

/** 筛选参数 */
export interface ProjectFilterParams {
  type?: ProjectType;
  status?: ProjectStatus;
  category?: string;
  tag?: string;
  search?: string;
  featured?: boolean;
}

/** 分页参数 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
```

## 组件架构

### 组件层次

```
PortfolioPage
├── PortfolioLayout
│   ├── ProjectFilter
│   │   ├── TypeFilter
│   │   ├── StatusFilter
│   │   └── SearchInput
│   └── ProjectGrid
│       └── ProjectCard[]
│           ├── CoverImage
│           ├── ProjectTypeBadge
│           ├── StatusBadge
│           ├── TechStackBadges
│           └── ProjectLinks
│
ProjectDetailPage
├── ProjectDetailLayout
│   ├── ProjectHeader
│   │   ├── Title
│   │   ├── Subtitle
│   │   └── StatusBadge
│   ├── ProjectGallery
│   │   └── ImageCarousel
│   ├── ProjectContent
│   │   ├── Description
│   │   ├── Challenge
│   │   ├── Solution
│   │   └── Results
│   ├── TechStackSection
│   │   └── TechStackBadge[]
│   ├── ProjectLinks
│   ├── TeamSection
│   │   └── TeamMember[]
│   └── RelatedProjects
│       └── ProjectCard[]
```

### 组件 Props

```typescript
// ProjectCard
interface ProjectCardProps {
  project: ProjectListItem;
  locale: Locale;
  className?: string;
}

// ProjectGrid
interface ProjectGridProps {
  projects: ProjectListItem[];
  locale: Locale;
  loading?: boolean;
  columns?: 2 | 3 | 4;
  className?: string;
}

// ProjectFilter
interface ProjectFilterProps {
  onFilterChange: (params: ProjectFilterParams) => void;
  initialParams?: ProjectFilterParams;
  className?: string;
}

// ProjectDetail
interface ProjectDetailProps {
  project: Project;
  locale: Locale;
  className?: string;
}

// ProjectGallery
interface ProjectGalleryProps {
  images: ProjectImage[];
  projectTitle: string;
  className?: string;
}

// TechStackBadge
interface TechStackBadgeProps {
  tech: TechStack;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}
```

## 状态管理

### 客户端状态 (Zustand)

```typescript
// src/stores/portfolioStore.ts
import { create } from 'zustand';

interface PortfolioState {
  // 筛选状态
  filters: ProjectFilterParams;
  setFilter: (key: keyof ProjectFilterParams, value: any) => void;
  resetFilters: () => void;
  
  // 视图状态
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  
  // 缓存
  cachedProjects: Map<string, Project>;
  setCachedProject: (slug: string, project: Project) => void;
  getCachedProject: (slug: string) => Project | undefined;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  filters: {},
  setFilter: (key, value) => set((state) => ({
    filters: { ...state.filters, [key]: value }
  })),
  resetFilters: () => set({ filters: {} }),
  
  viewMode: 'grid',
  setViewMode: (mode) => set({ viewMode: mode }),
  
  cachedProjects: new Map(),
  setCachedProject: (slug, project) => {
    const map = new Map(get().cachedProjects);
    map.set(slug, project);
    set({ cachedProjects: map });
  },
  getCachedProject: (slug) => get().cachedProjects.get(slug),
}));
```

### 数据获取 Hook

```typescript
// src/hooks/usePortfolio.ts
export function useProjects(params?: ProjectFilterParams) {
  return useFetch<PaginatedResponse<ProjectListItem>>('/api/portfolio', {
    params,
    cache: { enabled: true, ttl: 5 * 60 * 1000 } // 5分钟缓存
  });
}

export function useProject(slug: string) {
  return useFetch<Project>(`/api/portfolio/${slug}`, {
    cache: { enabled: true, ttl: 10 * 60 * 1000 } // 10分钟缓存
  });
}
```

## API 路由设计

### GET /api/portfolio

获取项目列表，支持筛选和分页。

**Query Parameters:**
- `type` - 项目类型筛选
- `status` - 项目状态筛选
- `category` - 分类筛选
- `tag` - 标签筛选
- `search` - 搜索关键词
- `featured` - 仅精选项目
- `page` - 页码 (默认 1)
- `limit` - 每页数量 (默认 12)

**Response:**
```json
{
  "data": [...],
  "total": 50,
  "page": 1,
  "limit": 12,
  "hasMore": true
}
```

### GET /api/portfolio/[slug]

获取单个项目详情。

**Response:**
```json
{
  "id": "project-1",
  "slug": "awesome-project",
  "content": { ... },
  ...
}
```

## 渲染策略

### 项目列表页 (SSG)

```typescript
// src/app/[locale]/portfolio/page.tsx
import { getTranslations } from 'next-intl/server';
import { getProjects } from '@/lib/portfolio';
import { ProjectGrid } from '@/components/portfolio';

// 静态生成
export async function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'zh' }];
}

export default async function PortfolioPage({ params }) {
  const { locale } = await params;
  const projects = await getProjects(locale);
  const t = await getTranslations('portfolio');
  
  return (
    <main>
      <h1>{t('title')}</h1>
      <ProjectGrid projects={projects} locale={locale} />
    </main>
  );
}
```

### 项目详情页 (ISR)

```typescript
// src/app/[locale]/portfolio/[slug]/page.tsx
import { getProject, getAllProjectSlugs } from '@/lib/portfolio';
import { ProjectDetail } from '@/components/portfolio';

// 生成所有静态路径
export async function generateStaticParams() {
  const slugs = await getAllProjectSlugs();
  return slugs.flatMap(slug => [
    { locale: 'en', slug },
    { locale: 'zh', slug }
  ]);
}

// ISR: 每小时重新验证
export const revalidate = 3600;

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  const project = await getProject(slug, locale);
  
  return {
    title: project.seo.title,
    description: project.seo.description,
    keywords: project.seo.keywords,
    openGraph: {
      images: [project.seo.ogImage || project.images[0]?.src],
    },
  };
}

export default async function ProjectPage({ params }) {
  const { locale, slug } = await params;
  const project = await getProject(slug, locale);
  
  return <ProjectDetail project={project} locale={locale} />;
}
```

## SEO 优化

### 元数据生成

```typescript
// 每个项目页面独立 SEO
export async function generateMetadata({ params }): Promise<Metadata> {
  const project = await getProject(params.slug, params.locale);
  
  return {
    title: project.seo.title,
    description: project.seo.description,
    keywords: project.seo.keywords.join(', '),
    authors: project.team?.map(m => m.name),
    openGraph: {
      type: 'article',
      title: project.seo.title,
      description: project.seo.description,
      images: [project.seo.ogImage || project.images[0]?.src],
      publishedTime: project.createdAt,
      modifiedTime: project.updatedAt,
    },
    twitter: {
      card: 'summary_large_image',
      title: project.seo.title,
      description: project.seo.description,
      images: [project.seo.ogImage],
    },
    alternates: {
      canonical: `https://7zi.com/portfolio/${project.slug}`,
      languages: {
        'en': `https://7zi.com/en/portfolio/${project.slug}`,
        'zh': `https://7zi.com/zh/portfolio/${project.slug}`,
      },
    },
  };
}
```

### 结构化数据 (JSON-LD)

```typescript
// 项目详情页添加结构化数据
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": project.content.en.title,
  "description": project.content.en.description,
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "author": {
    "@type": "Organization",
    "name": "7zi"
  },
  "datePublished": project.createdAt,
  "dateModified": project.updatedAt,
};
```

## 性能优化

### 1. 图片优化

```typescript
// 使用 Next.js Image 组件
<Image
  src={project.images[0].src}
  alt={project.images[0].alt}
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL={project.images[0].blurDataURL}
  loading="lazy"
/>
```

### 2. 代码分割

```typescript
// 动态导入大型组件
const ProjectGallery = dynamic(
  () => import('@/components/portfolio/ProjectGallery'),
  { 
    loading: () => <GallerySkeleton />,
    ssr: false 
  }
);
```

### 3. 缓存策略

```typescript
// API 响应缓存
export async function getProjects(locale: Locale) {
  const cacheKey = `portfolio:${locale}`;
  const cached = await cache.get(cacheKey);
  
  if (cached) return cached;
  
  const projects = await fetchProjectsFromSource(locale);
  await cache.set(cacheKey, projects, 5 * 60 * 1000); // 5分钟
  
  return projects;
}
```

### 4. 预加载

```typescript
// 预加载下一页数据
<Link 
  href={`/portfolio/${project.slug}`}
  onMouseEnter={() => prefetchProject(project.slug)}
>
```

## 国际化

### 翻译键

```json
// src/i18n/messages/en.json
{
  "portfolio": {
    "title": "Our Projects",
    "subtitle": "Explore our work",
    "viewProject": "View Project",
    "viewDemo": "Live Demo",
    "viewSource": "Source Code",
    "techStack": "Tech Stack",
    "team": "Team",
    "challenge": "The Challenge",
    "solution": "Our Solution",
    "results": "Results",
    "filter": {
      "all": "All",
      "type": "Type",
      "status": "Status",
      "search": "Search projects..."
    },
    "type": {
      "web-app": "Web Application",
      "mobile-app": "Mobile App",
      "library": "Library",
      "tool": "Tool"
    },
    "status": {
      "active": "Active",
      "completed": "Completed",
      "archived": "Archived"
    }
  }
}
```

## 扩展性设计

### 1. 支持多种数据源

```typescript
// 数据源适配器模式
interface PortfolioDataSource {
  getProjects(locale: Locale): Promise<ProjectListItem[]>;
  getProject(slug: string, locale: Locale): Promise<Project | null>;
  getAllSlugs(): Promise<string[]>;
}

// JSON 文件数据源
class JsonDataSource implements PortfolioDataSource { ... }

// CMS 数据源 (未来扩展)
class CmsDataSource implements PortfolioDataSource { ... }

// GitHub 数据源 (未来扩展)
class GitHubDataSource implements PortfolioDataSource { ... }
```

### 2. 插件式功能扩展

```typescript
// 可选功能模块
interface PortfolioFeature {
  name: string;
  enabled: boolean;
  component?: React.ComponentType;
}

const features: PortfolioFeature[] = [
  { name: 'gallery', enabled: true },
  { name: 'comments', enabled: false },
  { name: 'analytics', enabled: true },
  { name: 'sharing', enabled: true },
];
```

### 3. 主题定制

```typescript
// 支持自定义主题
interface PortfolioTheme {
  cardStyle: 'default' | 'minimal' | 'featured';
  gridColumns: number;
  showTechStack: boolean;
  showTeam: boolean;
  animationEnabled: boolean;
}
```

## 实施计划

### 阶段 1: 基础架构 (Day 1)
- [x] 创建类型定义 `src/types/portfolio.ts`
- [x] 创建示例数据 `data/portfolio-projects.json`
- [x] 创建工具函数 `src/lib/portfolio/`
- [x] 创建 API 路由

### 阶段 2: 核心组件 (Day 2)
- [ ] 实现 ProjectCard 组件
- [ ] 实现 ProjectGrid 组件
- [ ] 实现 ProjectFilter 组件
- [ ] 实现 ProjectDetail 组件
- [ ] 实现 TechStackBadge 组件
- [ ] 实现 ProjectGallery 组件

### 阶段 3: 页面实现 (Day 3)
- [ ] 创建项目列表页 `/portfolio`
- [ ] 创建项目详情页 `/portfolio/[slug]`
- [ ] 配置 SSG/ISR
- [ ] 添加 SEO 元数据

### 阶段 4: 测试与优化 (Day 4)
- [ ] 编写组件单元测试
- [ ] 编写 API 集成测试
- [ ] 性能优化
- [ ] 可访问性检查

### 阶段 5: 文档与部署 (Day 5)
- [ ] 更新用户文档
- [ ] 添加示例数据
- [ ] 部署测试
- [ ] 监控配置

## 检查清单

- [ ] 所有类型定义完整
- [ ] 组件支持暗色模式
- [ ] 图片使用 Next.js Image 优化
- [ ] 支持 SSG/ISR 渲染
- [ ] SEO 元数据完整
- [ ] 添加结构化数据
- [ ] 国际化支持
- [ ] 响应式设计
- [ ] 单元测试覆盖
- [ ] 性能指标达标

---

*文档版本: 1.0*
*最后更新: 2026-03-06*
