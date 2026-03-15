# 架构说明文档

本文档详细描述 7zi Frontend 项目的技术架构、设计决策和实现细节。

## 目录

- [技术栈概览](#技术栈概览)
- [架构设计](#架构设计)
- [目录结构](#目录结构)
- [核心模块](#核心模块)
- [API 系统](#api-系统)
- [数据流](#数据流)
- [状态管理](#状态管理)
- [国际化](#国际化)
- [主题系统](#主题系统)
- [性能优化](#性能优化)
- [安全策略](#安全策略)
- [部署架构](#部署架构)
- [技术决策记录](#技术决策记录)

## 技术栈概览

### 核心框架

| 技术 | 版本 | 用途 | 选择理由 |
|------|------|------|----------|
| Next.js | 15.5.12 | React 全栈框架 | SSG/SSR 支持、文件系统路由、内置优化 |
| React | 18.3.1 | UI 库 | 组件化开发、生态系统丰富 |
| TypeScript | 5.x | 类型系统 | 类型安全、更好的 IDE 支持 |

### 样式方案

| 技术 | 版本 | 用途 | 选择理由 |
|------|------|------|----------|
| Tailwind CSS | 4.x | 原子化 CSS | 快速开发、一致性设计、小包体积 |

### 状态管理

| 技术 | 版本 | 用途 | 选择理由 |
|------|------|------|----------|
| Zustand | 5.0.11 | 全局状态管理 | 轻量、简洁 API、无 Provider 包裹 |

### 测试工具

| 技术 | 版本 | 用途 | 选择理由 |
|------|------|------|----------|
| Vitest | 4.0.18 | 单元测试 | Vite 生态、快速、兼容 Jest API |
| Testing Library | 16.x | 组件测试 | 最佳实践、关注用户行为 |
| Playwright | 1.58.2 | E2E 测试 | 跨浏览器支持、现代化 API |

### 国际化

| 技术 | 版本 | 用途 | 选择理由 |
|------|------|------|----------|
| next-intl | 4.8.3 | 国际化方案 | Next.js App Router 原生支持、服务端渲染友好 |

### 其他依赖

| 技术 | 版本 | 用途 |
|------|------|------|
| Three.js | 0.183.2 | 3D 渲染 (Hero 区域) |
| Chart.js | 4.5.1 | 数据可视化 |
| Resend | 6.9.3 | 邮件发送服务 |
| EmailJS | 4.4.1 | 联系表单邮件 |
| Fuse.js | 7.1.0 | 模糊搜索 |
| jose | 6.2.0 | JWT 处理 |

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                         用户界面                             │
├─────────────────────────────────────────────────────────────┤
│  Pages (App Router)  │  Components  │  Layouts            │
├─────────────────────────────────────────────────────────────┤
│                      Hooks & Contexts                       │
├─────────────────────────────────────────────────────────────┤
│                      Utilities & Libs                        │
├─────────────────────────────────────────────────────────────┤
│                      API Layer                               │
├─────────────────────────────────────────────────────────────┤
│                      External Services                       │
│  GitHub API │ Analytics │ Email Service                      │
└─────────────────────────────────────────────────────────────┘
```

### 渲染策略

项目采用 **混合渲染策略**：

1. **静态生成 (SSG)**：大多数页面在构建时生成
2. **客户端渲染 (CSR)**：交互式组件使用客户端状态
3. **增量静态再生 (ISR)**：需要定期更新的内容

```typescript
// 默认采用 SSG
// next.config.ts
const nextConfig: NextConfig = {
  output: 'standalone',  // 支持 Docker 部署
};
```

### 组件分层

```
┌─────────────────────────────────────────┐
│            Page Components              │  页面级组件
├─────────────────────────────────────────┤
│            Feature Components           │  功能组件
│  AIChat │ GitHubActivity │ Dashboard    │
├─────────────────────────────────────────┤
│            UI Components                │  基础 UI 组件
│  Button │ Card │ Input │ Modal          │
├─────────────────────────────────────────┤
│            Hooks & Contexts             │  状态与逻辑
└─────────────────────────────────────────┘
```

## 目录结构

```
7zi-frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── [locale]/           # 国际化路由
│   │   │   ├── page.tsx        # 首页（多语言）
│   │   │   └── layout.tsx      # 布局（多语言）
│   │   ├── api/                # API 路由
│   │   │   └── health/         # 健康检查端点
│   │   ├── about/              # 关于页面
│   │   ├── blog/               # 博客页面
│   │   ├── contact/            # 联系页面
│   │   ├── dashboard/          # 数据看板
│   │   ├── team/               # 团队页面
│   │   ├── layout.tsx          # 根布局
│   │   ├── page.tsx            # 首页
│   │   ├── globals.css         # 全局样式
│   │   ├── error.tsx           # 错误边界
│   │   └── not-found.tsx       # 404 页面
│   │
│   ├── components/             # React 组件
│   │   ├── AIChat/             # AI 聊天组件集
│   │   ├── chat/               # 聊天基础组件
│   │   ├── NotificationCenter/ # 通知中心
│   │   ├── UserSettings/       # 用户设置
│   │   ├── optimized/          # 优化版组件
│   │   ├── shared/             # 共享组件
│   │   ├── AIChat.tsx          # AI 聊天主组件
│   │   ├── GitHubActivity.tsx  # GitHub 活动展示
│   │   ├── ProjectDashboard.tsx # 项目看板
│   │   ├── ThemeProvider.tsx   # 主题提供者
│   │   ├── ThemeToggle.tsx     # 主题切换
│   │   ├── Navigation.tsx      # 导航栏
│   │   ├── Footer.tsx          # 页脚
│   │   ├── Hero3D.tsx          # 3D Hero 区域
│   │   └── ...                 # 其他组件
│   │
│   ├── hooks/                  # 自定义 Hooks
│   │   ├── useFetch.ts         # 数据获取 Hook
│   │   ├── useGitHubData.ts    # GitHub 数据 Hook
│   │   ├── useDashboardData.ts # 看板数据 Hook
│   │   ├── useLocalStorage.ts  # 本地存储 Hook
│   │   ├── useIntersectionObserver.ts # 可视检测 Hook
│   │   └── index.ts            # 导出
│   │
│   ├── lib/                    # 工具库
│   │   ├── utils.ts            # 通用工具函数
│   │   ├── seo.ts              # SEO 工具
│   │   ├── emailjs.ts          # 邮件服务
│   │   ├── date.ts             # 日期处理
│   │   └── errors.ts           # 错误处理
│   │
│   ├── types/                  # TypeScript 类型定义
│   │   ├── index.ts            # 主要类型
│   │   └── common.ts           # 通用类型
│   │
│   ├── i18n/                   # 国际化配置
│   │   ├── config.ts           # 语言配置
│   │   ├── routing.ts          # 路由配置
│   │   ├── request.ts          # 服务端配置
│   │   ├── client.ts           # 客户端配置
│   │   ├── utils.ts            # 工具函数
│   │   └── messages/           # 翻译文件
│   │
│   ├── contexts/               # React Context
│   │   └── SettingsContext.tsx # 设置上下文
│   │
│   ├── styles/                 # 样式配置
│   │   └── classes.ts          # Tailwind 类名常量
│   │
│   └── test/                   # 测试文件
│       ├── setup.tsx           # 测试设置
│       ├── components/         # 组件测试
│       └── lib/                # 工具测试
│
├── public/                     # 静态资源
│   ├── manifest.json           # PWA 配置
│   ├── robots.txt              # 爬虫规则
│   ├── sitemap.xml             # 站点地图
│   └── sw.js                   # Service Worker
│
├── .github/                    # GitHub 配置
│   └── workflows/              # CI/CD 工作流
│       ├── ci.yml              # 持续集成
│       └── deploy.yml          # 部署
│
├── docs/                       # 文档目录
│
├── nginx/                      # Nginx 配置
│
├── next.config.ts              # Next.js 配置
├── tailwind.config.ts          # Tailwind 配置
├── tsconfig.json               # TypeScript 配置
├── vitest.config.ts            # Vitest 配置
├── eslint.config.mjs           # ESLint 配置
└── package.json                # 项目依赖
```

## API 系统

### API 架构概览

7zi 提供完整的 RESTful API 系统，支持任务管理、项目管理、知识图谱、认证等核心功能。

```
┌────────────────────────────────────────────────────────────────┐
│                       API Gateway                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │   Auth      │ │   CSRF      │ │   Rate      │               │
│  │   中间件     │ │   保护       │ │   Limit     │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
├────────────────────────────────────────────────────────────────┤
│                       API Routes                                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │  Tasks  │ │Projects │ │Knowledge│ │  Auth   │ │  Logs   │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ Health  │ │ Status  │ │Notifs   │ │Comments │ │Examples │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
├────────────────────────────────────────────────────────────────┤
│                       Data Layer                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │  In-Memory  │ │  LocalStorage│ │  External   │              │
│  │    Store    │ │   (Client)   │ │  Services   │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
└────────────────────────────────────────────────────────────────┘
```

### API 端点总览

| 模块 | 基础路径 | 功能 | 认证 |
|------|----------|------|------|
| **Tasks** | `/api/tasks` | 任务 CRUD、AI 分配 | 可选/必需 |
| **Projects** | `/api/projects` | 项目管理 | 可选/必需 |
| **Knowledge** | `/api/knowledge/*` | 知识图谱（节点/边/查询/推理/晶格） | 无 |
| **Auth** | `/api/auth/*` | 登录/登出/刷新/用户信息 | 部分必需 |
| **Health** | `/api/health/*` | 健康检查（基础/就绪/存活/详细） | 无 |
| **Logs** | `/api/logs` | 日志查询/导出/清理 | 部分必需 |
| **Notifications** | `/api/notifications` | 通知管理 | 可选 |
| **Comments** | `/api/comments` | 博客评论 | 无 |
| **Status** | `/api/status` | 系统状态页面 | 无 |
| **Log-Error** | `/api/log-error` | 前端错误上报 | 无 |
| **Examples** | `/api/examples/protected` | 认证示例 | 必需 |

### 认证机制

```typescript
// 双重认证：JWT + CSRF Token
// 1. 登录获取 JWT
POST /api/auth/login
{ "email": "user@example.com", "password": "xxx" }
→ Set-Cookie: access_token=...; refresh_token=...
→ { "csrfToken": "xxx" }

// 2. 访问受保护 API
DELETE /api/tasks?id=xxx
Headers: 
  Authorization: Bearer <access_token>
  X-CSRF-Token: <csrf_token>

// 3. 刷新令牌
POST /api/auth/refresh
Cookie: refresh_token=...
→ { "accessToken": "..." }
```

### API 目录结构

```
src/app/api/
├── auth/                    # 认证 API
│   ├── route.ts            # 主入口 (info/csrf/check-secret)
│   ├── login/route.ts      # 登录
│   ├── logout/route.ts     # 登出
│   ├── refresh/route.ts    # 刷新令牌
│   └── me/route.ts         # 当前用户
│
├── tasks/                   # 任务 API
│   ├── route.ts            # GET/POST 任务列表
│   ├── [id]/               # 单个任务
│   │   └── assign/route.ts # AI 智能分配
│   └── import/route.ts     # 批量导入
│
├── projects/                # 项目 API
│   ├── route.ts            # GET/POST 项目
│   └── [id]/
│       ├── route.ts        # GET/PUT/DELETE 单个项目
│       └── tasks/route.ts  # 项目任务列表
│
├── knowledge/               # 知识图谱 API
│   ├── nodes/
│   │   ├── route.ts        # GET/POST 节点
│   │   └── [id]/route.ts   # GET/PUT/DELETE 节点
│   ├── edges/route.ts      # GET/POST 边
│   ├── query/route.ts      # 知识查询
│   ├── inference/route.ts  # 知识推理
│   └── lattice/route.ts    # 知识晶格
│
├── health/                  # 健康检查 API
│   ├── route.ts            # 基础检查
│   ├── ready/route.ts      # Kubernetes 就绪探针
│   ├── live/route.ts       # Kubernetes 存活探针
│   └── detailed/route.ts   # 详细报告
│
├── logs/                    # 日志 API
│   ├── route.ts            # GET/DELETE 日志
│   └── export/route.ts     # 导出 (JSON/CSV)
│
├── notifications/           # 通知 API
│   ├── route.ts            # GET/POST/PUT/DELETE
│   └── preferences/route.ts # 通知偏好
│
├── comments/                # 评论 API
│   ├── route.ts            # GET/POST 评论
│   └── [id]/route.ts       # GET/PUT/DELETE
│
├── status/route.ts         # 公开状态页面
├── log-error/route.ts      # 前端错误上报
└── examples/protected/     # 认证示例
    └── route.ts
```

## 核心模块

### 1. 路由系统

使用 Next.js App Router 的文件系统路由：

```typescript
// 路由结构
app/
├── page.tsx              → /
├── about/page.tsx       → /about
├── blog/
│   ├── page.tsx         → /blog
│   └── [slug]/page.tsx  → /blog/:slug
├── contact/page.tsx     → /contact
├── dashboard/page.tsx   → /dashboard
├── portfolio/page.tsx   → /portfolio  ✅ 新增
├── tasks/page.tsx       → /tasks      ✅ 新增
├── knowledge-lattice/   → /knowledge-lattice ✅ 新增
├── settings/page.tsx    → /settings   ✅ 新增
└── team/page.tsx        → /team
```

#### 国际化路由

```typescript
// src/i18n/routing.ts
export const routing = defineRouting({
  locales: ['en', 'zh'],
  defaultLocale: 'zh',
});
```

### 2. 组件系统

#### 组件分类

| 类型 | 描述 | 示例 |
|------|------|------|
| Page | 页面组件 | `page.tsx` |
| Layout | 布局组件 | `layout.tsx` |
| Feature | 功能组件 | `AIChat.tsx`, `GitHubActivity.tsx` |
| UI | 基础组件 | `Button`, `Card`, `Input` |
| Error | 错误边界 | `error.tsx`, `ErrorBoundary.tsx` |

#### 组件导出规范

```typescript
// src/components/index.ts
// 统一导出所有组件
export { AIChat } from './AIChat';
export { ThemeProvider } from './ThemeProvider';
export { ThemeToggle } from './ThemeToggle';
// ...
```

### 3. Hooks 系统

#### 数据获取 Hooks

```typescript
// src/hooks/useFetch.ts
export function useFetch<T>(url: string, options?: FetchOptions) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // 带缓存的数据获取
  // 支持自动重试
  // 支持 TTL 缓存
}

// src/hooks/useGitHubData.ts
export function useGitHubData(repo: string) {
  // GitHub API 专用 Hook
  // 处理速率限制
  // 提供降级数据
}
```

#### UI Hooks

```typescript
// src/hooks/useLocalStorage.ts
export function useLocalStorage<T>(key: string, initialValue: T) {
  // 本地存储同步
  // 支持类型安全
}

// src/hooks/useIntersectionObserver.ts
export function useIntersectionObserver(options?: IntersectionObserverInit) {
  // 元素可见性检测
  // 用于懒加载和动画触发
}
```

### 4. 工具库

```typescript
// src/lib/utils.ts

// 缓存系统
class Cache<T> {
  set(key: string, value: T, ttl: number): void;
  get(key: string): T | null;
  delete(key: string): void;
  clear(): void;
}

// 导出工具函数
export function debounce<T>(func: T, wait: number): (...args) => void;
export function throttle<T>(func: T, limit: number): (...args) => void;
export function memoize<T>(func: T, resolver?: (...args) => string): (...args) => ReturnType<T>;
export function formatFileSize(bytes: number): string;
export function formatTimeAgo(date: Date | string): string;
```

## 数据流

### 客户端数据流

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   用户交互    │───▶│    Hooks     │───▶│   State      │
└──────────────┘    └──────────────┘    └──────────────┘
                           │                    │
                           ▼                    ▼
                    ┌──────────────┐    ┌──────────────┐
                    │  API/Cache   │    │   UI 更新     │
                    └──────────────┘    └──────────────┘
```

### 缓存策略

```typescript
// 三层缓存架构
// 1. 组件级状态 (useState)
// 2. 内存缓存 (Cache class with TTL)
// 3. 本地存储 (localStorage)

const cache = createCache<T>(5 * 60 * 1000); // 5分钟 TTL

// 使用示例
const cachedData = cache.get(key);
if (!cachedData) {
  const data = await fetchData();
  cache.set(key, data);
}
```

### API 调用流程

```typescript
// 组件中的数据获取
function GitHubActivity() {
  const { data, loading, error } = useGitHubData('7zi/7zi-frontend');
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;
  
  return <ActivityList data={data} />;
}
```

## 状态管理

### Context 结构

```typescript
// src/contexts/SettingsContext.tsx
interface SettingsContextType {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'zh';
  notifications: boolean;
  setTheme: (theme: Theme) => void;
  setLanguage: (lang: Language) => void;
  toggleNotifications: () => void;
}
```

### 主题状态流

```
系统偏好 ──┐
            ├──▶ ThemeProvider ──▶ CSS 变量 ──▶ UI 渲染
用户选择 ──┘
```

### 本地存储键

| 键名 | 用途 | 类型 |
|------|------|------|
| `theme` | 主题偏好 | `'light' \| 'dark' \| 'system'` |
| `language` | 语言偏好 | `'en' \| 'zh'` |
| `settings` | 用户设置 | `Settings` |

## 国际化

### 架构

```typescript
// src/i18n/config.ts
export const locales = ['en', 'zh'] as const;
export const defaultLocale = 'zh';

// 消息文件结构
// src/i18n/messages/
// ├── en.json
// └── zh.json
```

### 使用方式

```tsx
// 服务端组件
import { getTranslations } from 'next-intl/server';

export default async function Page() {
  const t = await getTranslations('page');
  return <h1>{t('title')}</h1>;
}

// 客户端组件
import { useTranslations } from 'next-intl';

export function Component() {
  const t = useTranslations('component');
  return <button>{t('button.submit')}</button>;
}
```

## 主题系统

### 实现方式

使用 CSS 变量 + Tailwind CSS 实现主题切换：

```css
/* globals.css */
:root {
  --background: #ffffff;
  --foreground: #171717;
}

.dark {
  --background: #0a0a0a;
  --foreground: #ededed;
}
```

### ThemeProvider 架构

```tsx
// src/components/ThemeProvider.tsx
export function ThemeProvider({ children, defaultTheme = 'system' }) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  
  useEffect(() => {
    // 读取本地存储
    const saved = localStorage.getItem('theme');
    if (saved) setTheme(saved as Theme);
  }, []);
  
  useEffect(() => {
    // 应用主题
    const root = document.documentElement;
    if (theme === 'system') {
      root.classList.toggle('dark', prefersDark());
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

## 性能优化

### 1. 代码分割

```typescript
// 动态导入大型组件
import dynamic from 'next/dynamic';

const AIChat = dynamic(() => import('./AIChat'), {
  loading: () => <LoadingSpinner />,
  ssr: false, // 仅客户端渲染
});
```

### 2. 图片优化

```tsx
// 使用 Next.js Image 组件
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero"
  width={800}
  height={600}
  loading="lazy"
  placeholder="blur"
/>
```

### 3. 懒加载

```tsx
// 使用 Intersection Observer 实现懒加载
const { ref, isIntersecting } = useIntersectionObserver({
  threshold: 0.1,
  rootMargin: '100px',
});

return (
  <div ref={ref}>
    {isIntersecting && <HeavyComponent />}
  </div>
);
```

### 4. 缓存策略

```typescript
// API 响应缓存
const cache = createCache<GitHubData>(5 * 60 * 1000); // 5 分钟

// 静态资源缓存（next.config.ts）
headers: [
  {
    source: '/_next/static/:path*',
    headers: [
      { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
    ],
  },
]
```

### 5. 字体优化

```typescript
// 使用 next/font 自动优化
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });
```

## 安全策略

### HTTP 安全头

```typescript
// next.config.ts
headers: [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]
```

### 内容安全策略

```typescript
// CSP 配置（生产环境推荐）
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://api.github.com;
`;
```

### 输入验证

```typescript
// 表单验证示例
const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  message: z.string().min(10).max(1000),
});
```

## 部署架构

### Docker 部署

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

### CI/CD 流程

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test:run
      - run: npm run build
      - name: Deploy to server
        run: ./deploy-remote.sh
```

## 技术决策记录

### ADR-001: 选择 Next.js 而非纯 React

**背景**: 需要一个支持 SEO、静态生成和动态路由的前端框架。

**决策**: 使用 Next.js 16。

**理由**:
- 内置 SSG/SSR 支持，适合营销网站
- 文件系统路由简化开发
- 内置图片优化
- 良好的 TypeScript 支持
- 丰富的生态系统

**后果**:
- 需要学习 Next.js 特有概念
- 部署需要考虑兼容性

### ADR-002: 使用 Tailwind CSS

**背景**: 需要快速开发响应式 UI，同时保持一致性。

**决策**: 使用 Tailwind CSS 4.x。

**理由**:
- 原子化 CSS 加速开发
- 无需维护单独的 CSS 文件
- 内置响应式设计
- 暗色模式支持
- 生产环境自动清除未使用的样式

**后果**:
- HTML 中会有较长的类名
- 需要团队熟悉 Tailwind 语法

### ADR-003: 使用 Vitest 而非 Jest

**背景**: 需要一个快速的单元测试框架。

**决策**: 使用 Vitest。

**理由**:
- Vite 生态，启动更快
- API 兼容 Jest，迁移成本低
- 原生支持 ESM
- 内置代码覆盖率

**后果**:
- 部分 Jest 特定功能可能需要适配

### ADR-004: 国际化方案选择

**背景**: 需要支持中英文切换。

**决策**: 使用 next-intl。

**理由**:
- Next.js App Router 原生支持
- 服务端渲染友好
- 支持路由级国际化
- 类型安全

**后果**:
- 需要维护多语言消息文件
- 路由结构稍复杂

### ADR-005: 使用内存缓存而非 Redis

**背景**: 需要缓存 GitHub API 响应。

**决策**: 使用内存缓存（带 TTL）。

**理由**:
- 项目为静态站点，无需持久化缓存
- 减少外部依赖
- 简化部署
- 缓存数据量小

**后果**:
- 每次部署后缓存重置
- 不适合多实例共享缓存

### ADR-006: Docker standalone 输出模式

**背景**: 需要 Docker 部署支持。

**决策**: 使用 `output: 'standalone'` 模式。

**理由**:
- 最小化 Docker 镜像大小
- 不依赖外部文件服务
- 适合单机部署

**后果**:
- 静态资源需要单独处理
- 图片优化功能受限

### ADR-007: 知识图谱系统设计

**背景**: 需要支持 AI 团队的知识管理和推理能力。

**决策**: 实现知识图谱 API (Knowledge Graph API)。

**理由**:
- 支持知识节点和边的关联存储
- 提供知识查询和推理能力
- 知识晶格 (Lattice) 支持复杂知识结构
- 为 AI 自主决策提供知识基础

**后果**:
- 需要维护知识数据一致性
- 推理性能需持续优化

### ADR-008: 认证与授权架构

**背景**: 需要安全的 API 访问控制。

**决策**: 使用 JWT + CSRF Token 双重验证机制。

**理由**:
- JWT 提供无状态认证
- CSRF Token 防止跨站请求伪造
- 角色权限控制 (RBAC)
- 支持令牌刷新机制

**后果**:
- 需要管理令牌生命周期
- CSRF Token 需要在每次请求时携带

---

## API 端点实现状态

| API 模块 | 实现状态 | 端点 |
|----------|----------|------|
| Tasks API | ✅ 完整 | GET/POST/PUT/DELETE `/api/tasks`, POST `/api/tasks/:id/assign` |
| Projects API | ✅ 完整 | GET/POST `/api/projects`, GET/PUT/DELETE `/api/projects/:id` |
| Health API | ✅ 完整 | `/api/health`, `/api/health/ready`, `/api/health/live`, `/api/health/detailed` |
| Knowledge API | ✅ 完整 | `/api/knowledge/nodes`, `/api/knowledge/edges`, `/api/knowledge/query`, `/api/knowledge/inference`, `/api/knowledge/lattice` |
| Logs API | ✅ 完整 | GET/POST/DELETE `/api/logs`, GET `/api/logs/export` |
| Auth API | ✅ 完整 | `/api/auth` (login, logout, refresh, me, csrf, check-secret) |
| Status API | ✅ 完整 | GET `/api/status` |

---

*本文档会随着项目演进持续更新。如有疑问，请联系维护团队。*  
*最后更新: 2026-03-13*