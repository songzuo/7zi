# 开发者快速启动指南

**最后更新**: 2026-03-20  
**难度**: ⭐⭐ 中等  
**时间**: 15-20 分钟

---

## 🎯 目标

帮助新开发者快速搭建开发环境，理解项目架构，并开始贡献代码。

---

## 📋 环境要求

### 必需软件

| 软件 | 最低版本 | 推荐版本 | 用途 |
|------|----------|----------|------|
| Node.js | 22.x | 22.22.0 | 运行时环境 |
| pnpm | 8.x | 9.x | 包管理器 |
| Git | 2.30+ | 2.40+ | 版本控制 |
| VS Code | Latest | Latest | 代码编辑器 |

### 推荐软件

| 软件 | 用途 |
|------|------|
| Docker Desktop | 容器化开发 |
| Postman | API 测试 |
| TablePlus/DB Browser | 数据库管理 |
| Chrome DevTools | 调试工具 |

---

## 🚀 快速开始

### 1. 安装依赖

```bash
# 克隆仓库
git clone https://github.com/songzuo/7zi.git 7zi-project
cd 7zi-project

# 安装依赖（推荐使用 pnpm）
pnpm install

# 或使用 npm
npm install
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑环境变量
nano .env.local
```

**核心环境变量**:
```bash
# 应用配置
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# GitHub API（可选，用于获取仓库数据）
NEXT_PUBLIC_GITHUB_OWNER=songzuo
NEXT_PUBLIC_GITHUB_REPO=7zi
# NEXT_PUBLIC_GITHUB_TOKEN=ghp_xxx  # 可选

# 数据库（如使用 SQLite）
DATABASE_PATH=./data/7zi.db

# 监控（可选）
NEXT_PUBLIC_SENTRY_DSN=  # Sentry DSN
```

### 3. 启动开发服务器

```bash
# 启动开发服务器（热重载）
pnpm dev

# 或指定端口
pnpm dev -p 3001
```

访问: http://localhost:3000

---

## 🏗️ 项目架构

### 目录结构

```
7zi-project/
├── src/                      # 源代码
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API 路由
│   │   ├── dashboard/      # Dashboard 页面
│   │   ├── layout.tsx      # 根布局
│   │   └── page.tsx        # 首页
│   ├── components/         # React 组件
│   │   ├── ui/            # UI 基础组件
│   │   ├── dashboard/     # Dashboard 组件
│   │   ├── members/       # 成员卡片
│   │   └── forms/         # 表单组件
│   ├── hooks/             # 自定义 Hooks
│   ├── lib/               # 工具库
│   │   ├── db.ts         # 数据库操作
│   │   ├── permissions.ts # 权限管理
│   │   ├── tools.ts      # 工具函数
│   │   └── logger.ts     # 日志系统
│   ├── stores/            # 状态管理
│   └── types/             # TypeScript 类型定义
├── docs/                  # 项目文档
├── scripts/               # 构建脚本
├── test/                  # 测试文件
├── e2e/                   # E2E 测试
└── public/                # 静态资源
```

### 技术栈

- **框架**: Next.js 16.2.1 (App Router)
- **UI**: React 19.2.4
- **语言**: TypeScript 5.x
- **样式**: Tailwind CSS 4
- **数据库**: better-sqlite3
- **测试**: Vitest 4.0.18 + Playwright
- **监控**: Sentry
- **实时通信**: Socket.IO + WebRTC

---

## 🛠️ 开发工作流

### 代码规范

项目使用 ESLint 和 Prettier 进行代码质量控制。

```bash
# 代码检查
pnpm lint

# 自动修复
pnpm lint:fix

# 类型检查
pnpm type-check

# 格式化代码
pnpm format
```

### Git 工作流

```bash
# 创建功能分支
git checkout -b feature/your-feature-name

# 提交代码
git add .
git commit -m "feat: add voice meeting system

- Implement WebRTC integration
- Add Socket.IO signaling server
- Support peer-to-peer audio connections"

# 推送到远程
git push origin feature/your-feature-name

# 创建 Pull Request
```

**提交信息规范**:
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具

### 测试

```bash
# 运行所有测试
pnpm test

# 监听模式（开发时推荐）
pnpm test:watch

# 生成覆盖率报告
pnpm test:coverage

# 运行 E2E 测试
pnpm test:e2e
```

---

## 🎨 核心功能开发

### 1. 添加新页面

```bash
# 创建新页面目录
mkdir -p src/app/new-page

# 创建页面文件
touch src/app/new-page/page.tsx
```

```typescript
// src/app/new-page/page.tsx
export default function NewPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">New Page</h1>
      <p>This is a new page.</p>
    </div>
  );
}
```

### 2. 添加新组件

```bash
# 创建组件
touch src/components/ui/MyComponent.tsx
```

```typescript
// src/components/ui/MyComponent.tsx
import React from 'react';

interface MyComponentProps {
  title: string;
  description?: string;
}

export function MyComponent({ title, description }: MyComponentProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {description && <p className="text-gray-600 mt-2">{description}</p>}
    </div>
  );
}
```

### 3. 添加 API 路由

```bash
# 创建 API 路由
touch src/app/api/health/route.ts
```

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
}
```

访问: http://localhost:3000/api/health

---

## 🔌 新功能开发（v1.0.5）

### 语音会议系统

项目集成了 WebRTC + Socket.IO 实现实时语音会议。

**使用示例**:

```typescript
// src/hooks/useVoiceMeeting.ts
import { useEffect, useState } from 'react';

export function useVoiceMeeting(roomId: string) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Socket.IO 连接
    const socket = io('http://localhost:3000');

    socket.emit('join-room', roomId);

    socket.on('user-joined', (userId: string) => {
      console.log('User joined:', userId);
      // 建立 WebRTC 连接
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId]);

  return { isConnected };
}
```

### 移动端响应式设计

项目使用 Tailwind CSS 实现移动优先的响应式设计。

**最佳实践**:

```typescript
// 使用响应式类
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 内容 */}
</div>

// 移动端优化
<button className="p-4 md:p-6 touch-manipulation">
  Click me
</button>

// 视口优化
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

### 日志系统

使用统一的日志系统替代 `console.log`。

```typescript
// src/lib/logger.ts
export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    console.info(`[INFO] ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
};

// 使用
import { logger } from '@/lib/logger';

logger.info('User logged in', { userId: '123' });
logger.error('Failed to fetch data', error);
```

### LRUCache

使用 LRU Cache 缓存频繁访问的数据。

```typescript
// src/lib/cache.ts
import { LRUCache } from 'lru-cache';

export const apiCache = new LRUCache<string, any>({
  max: 100, // 最大缓存项
  ttl: 1000 * 60 * 5, // 5分钟过期
});

// 使用
import { apiCache } from '@/lib/cache';

const fetchData = async (key: string) => {
  // 检查缓存
  const cached = apiCache.get(key);
  if (cached) return cached;

  // 获取数据
  const data = await fetchFromAPI(key);

  // 存入缓存
  apiCache.set(key, data);

  return data;
};
```

---

## 🧪 测试指南

### 单元测试

```typescript
// src/components/__tests__/MyComponent.test.tsx
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('renders title correctly', () => {
    render(<MyComponent title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });
});
```

### API 路由测试

```typescript
// src/app/api/health/__tests__/route.test.ts
import { GET } from '../route';
import { NextRequest } from 'next/server';

describe('Health API', () => {
  it('returns healthy status', async () => {
    const request = new NextRequest('http://localhost:3000/api/health');
    const response = await GET(request);
    const data = await response.json();

    expect(data.status).toBe('healthy');
  });
});
```

---

## 📊 性能优化

### React.memo 优化

```typescript
import { memo } from 'react';

// 使用 memo 避免不必要的重渲染
export const ExpensiveComponent = memo(function ExpensiveComponent({
  data,
}: {
  data: any[];
}) {
  return <div>{/* 复杂渲染逻辑 */}</div>;
});
```

### useMemo 优化

```typescript
import { useMemo } from 'react';

export function Dashboard({ data }: { data: any[] }) {
  // 缓存计算结果
  const summary = useMemo(() => {
    return data.reduce((acc, item) => ({
      total: acc.total + item.value,
      count: acc.count + 1,
    }), { total: 0, count: 0 });
  }, [data]);

  return <div>Total: {summary.total}</div>;
}
```

### useCallback 优化

```typescript
import { useCallback } from 'react';

export function FormComponent() {
  // 缓存回调函数
  const handleSubmit = useCallback((data: FormData) => {
    // 提交逻辑
  }, []);

  return <form onSubmit={handleSubmit}>{/* 表单 */}</form>;
}
```

---

## 🔒 安全最佳实践

### 1. 环境变量安全

```bash
# ✅ 正确：敏感信息放在 .env.local（不提交到 Git）
JWT_SECRET=super-secret-key
DATABASE_PASSWORD=secure-password

# ❌ 错误：不要硬编码在代码中
const JWT_SECRET = "super-secret-key";
```

### 2. 输入验证

```typescript
import { z } from 'zod';

// 定义 schema
const UserSchema = z.object({
  email: z.string().email(),
  age: z.number().min(18),
});

// 验证输入
function createUser(input: unknown) {
  const validated = UserSchema.parse(input);
  // 使用验证后的数据
}
```

### 3. SQL 注入防护

```typescript
// ✅ 正确：使用参数化查询
db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

// ❌ 错误：字符串拼接
db.prepare(`SELECT * FROM users WHERE id = '${userId}'`).get();
```

---

## 🚀 部署

### Docker 构建

```bash
# 构建镜像
docker build -t 7zi-project .

# 运行容器
docker run -p 3000:3000 7zi-project
```

### 生产环境部署

```bash
# 构建
pnpm build

# 启动生产服务器
pnpm start

# 或使用 PM2
pm2 start npm --name "7zi" -- start
```

---

## 📚 相关文档

- [完整开发指南](./DEVELOPMENT.md)
- [架构文档](./ARCHITECTURE.md)
- [API 文档](./API-REFERENCE.md)
- [测试指南](../../TESTING_GUIDE.md)
- [性能优化报告](./PERFORMANCE-OPTIMIZATION-REPORT.md)
- [React 19 兼容性报告](../../REACT19_COMPAT_REPORT.md)
- [TypeScript 健康报告](../../TYPESCRIPT_HEALTH_REPORT.md)

---

## 🐛 常见问题

### 问题: `pnpm install` 失败

**解决方案**:
```bash
# 清理缓存
pnpm store prune

# 删除 node_modules
rm -rf node_modules

# 重新安装
pnpm install
```

### 问题: TypeScript 编译错误

**解决方案**:
```bash
# 重新生成类型定义
pnpm type-check

# 检查 tsconfig.json 配置
cat tsconfig.json
```

### 问题: 端口 3000 被占用

**解决方案**:
```bash
# 使用其他端口
pnpm dev -p 3001

# 或关闭占用进程
lsof -ti:3000 | xargs kill -9  # macOS/Linux
```

---

## 📞 获取帮助

- **查看文档**: [docs/INDEX.md](./INDEX.md)
- **提交 Issue**: https://github.com/songzuo/7zi/issues
- **讨论区**: https://github.com/songzuo/7zi/discussions

---

**开始编码吧！🚀**

记住：先测试，再提交。保持代码简洁，注释清晰。
