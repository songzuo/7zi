# 用户使用指南

**最后更新**: 2026-03-31  
**版本**: v1.5.0  
**目标用户**: 开发者、管理员

---

## 📖 文档概述

本指南帮助您快速上手 7zi Studio 的核心功能，包括：

- ✅ **快速开始** - 5 分钟部署本地开发环境
- ✅ **Zustand 状态管理** - 全局状态管理最佳实践
- ✅ **权限系统** - RBAC 权限控制（已迁移到 Zustand）
- ✅ **lib/ 层工具库** - 日志、数据库、缓存、搜索等工具
- ✅ **Agent Learning System** - AI 智能调度和学习系统
- ✅ **部署指南** - 生产环境部署和配置
- ✅ **常见问题** - 常见问题解答

---

## 🚀 快速导航

- [快速开始](#快速开始)
- [状态管理使用](#1-状态管理-zustand)
- [权限系统使用](#2-权限系统-已迁移到-zustand)
- [lib/ 层工具使用](#3-lib-层工具使用)
- [Agent Learning System](#4-agent-learning-system)
- [部署说明](#5-部署说明)
- [常见问题](#6-常见问题)

---

## 快速开始

### 环境要求

- **Node.js** 22.x LTS 或更高版本
- **pnpm** 8+ 或 **npm** 10+
- **Git**

### 5 分钟快速部署

```bash
# 1. 克隆仓库
git clone https://github.com/songzuo/7zi.git
cd 7zi

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env.local

# 4. 启动开发服务器
pnpm dev

# 5. 访问应用
# 打开浏览器访问 http://localhost:3000
```

### v1.5.0 核心更新

如果你已经熟悉项目,可以直接查看 **[v1.5.0 快速入门指南](./QUICKSTART_V150.md)**,了解最新功能:

- 🤖 **AI Agent 调度 Dashboard UI** - 完整的可视化调度界面
- 🏗️ **lib/ 层重构** - 目录统一、代码清理
- 🔄 **PermissionContext → Zustand** - 状态管理迁移
- 🧪 **Agent Learning 测试系统** - 96% 测试覆盖率
- 🔌 **WebSocket 房间系统 UI** - 房间管理界面

详细部署步骤请参考 **[QUICKSTART.md](./QUICKSTART.md)**。

---

## 1. 状态管理 (Zustand)

### 1.1 核心概念

项目使用 **Zustand** 进行全局状态管理，相比 React Context 具有以下优势：

- ✅ 性能更好（精确订阅，减少重渲染）
- ✅ 无需 Provider 嵌套
- ✅ 内置持久化支持
- ✅ 更简洁的 API

### 1.2 导入方式

```typescript
// 方式 1: 从统一入口导入（推荐）
import { 
  useDashboardStore, 
  usePermissionStore, 
  useUIStore,
  useWalletStore,
  usePreferencesStore,
  useFilterStore 
} from '@/stores';

// 方式 2: 从具体 store 导入
import { useDashboardStore } from '@/stores/dashboardStore';
```

### 1.3 Dashboard Store 使用

```typescript
import { 
  useDashboardStore,
  useMembers,
  useIssues,
  useActivities,
  refreshDashboardData 
} from '@/stores';

function DashboardPage() {
  // 获取数据
  const members = useMembers();
  const issues = useIssues();
  const activities = useActivities();

  // 获取加载状态
  const loading = useDashboardStore(state => state.loading);
  const error = useDashboardStore(state => state.error);

  // 刷新数据
  const handleRefresh = () => {
    refreshDashboardData();
  };

  return (
    <div>
      <h1>Dashboard</h1>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      
      <button onClick={handleRefresh}>Refresh</button>
      
      {members.map(member => (
        <div key={member.id}>{member.name}</div>
      ))}
    </div>
  );
}
```

### 1.4 UI Store 使用

```typescript
import {
  useSidebar,
  useGlobalLoading,
  useToasts,
  toast,
  setGlobalLoading,
  toggleSidebar
} from '@/stores/uiStore';

function MyComponent() {
  // 侧边栏状态
  const sidebarOpen = useSidebar();

  // 全局加载状态
  const isLoading = useGlobalLoading();

  // Toast 消息
  const toasts = useToasts();

  // 操作
  const showToast = () => {
    toast.success('操作成功', '数据已保存');
  };

  const toggleMenu = () => {
    toggleSidebar();
  };

  const startLoading = () => {
    setGlobalLoading(true, '正在处理...');
  };

  return (
    <div>
      <button onClick={toggleMenu}>
        {sidebarOpen ? '收起菜单' : '展开菜单'}
      </button>
      <button onClick={showToast}>显示 Toast</button>
      <button onClick={startLoading}>开始加载</button>

      {toasts.map(t => (
        <div key={t.id}>{t.message}</div>
      ))}
    </div>
  );
}
```

### 1.5 Wallet Store 使用

```typescript
import {
  useWalletStore,
  useWalletBalance,
  useWallets,
  useTransactionHistory
} from '@/stores/walletStore';

function WalletPage() {
  const balance = useWalletBalance();
  const wallets = useWallets();
  const transactions = useTransactionHistory();

  return (
    <div>
      <h2>钱包余额: {balance}</h2>
      {wallets.map(wallet => (
        <div key={wallet.id}>
          <h3>{wallet.name}</h3>
          <p>余额: {wallet.balance}</p>
        </div>
      ))}
      
      <h3>交易记录</h3>
      {transactions.map(tx => (
        <div key={tx.id}>
          <span>{tx.type}</span>
          <span>{tx.amount}</span>
        </div>
      ))}
    </div>
  );
}
```

---

## 2. 权限系统（已迁移到 Zustand）

### 2.1 迁移说明

权限系统已从 React Context 迁移到 Zustand store，提供两种使用方式：

- **推荐方式**: 直接使用 Zustand store（性能更好）
- **兼容方式**: 使用 `usePermissions` hook（向后兼容）

### 2.2 推荐方式 - 直接使用 Zustand

```typescript
import {
  usePermissionStore,
  useIsAdmin,
  useIsManagerOrAdmin,
  usePermissionLoading
} from '@/stores';

function AdminPanel() {
  const isAdmin = useIsAdmin();
  const loading = usePermissionLoading();

  if (loading) return <div>Loading permissions...</div>;
  if (!isAdmin) return <div>Access denied</div>;

  return <div>Admin content</div>;
}

function TaskButton() {
  const hasPermission = usePermissionStore(state => 
    state.hasPermission('task:create')
  );

  if (!hasPermission) return null;

  return <button>Create Task</button>;
}
```

### 2.3 兼容方式 - 使用 usePermissions

```typescript
import { usePermissions } from '@/contexts/PermissionContext';

function MyComponent() {
  const { hasPermission, isAdmin, loading } = usePermissions();

  if (loading) return <div>Loading...</div>;
  
  if (!hasPermission('content:read')) {
    return <div>Access denied</div>;
  }

  return <div>Content</div>;
}
```

### 2.4 Gate 组件

```typescript
import { PermissionGate, RoleGate } from '@/contexts/PermissionContext';

function MyPage() {
  return (
    <div>
      <PermissionGate permission="task:create">
        <button>Create Task</button>
      </PermissionGate>

      <RoleGate role="admin">
        <AdminPanel />
      </RoleGate>
    </div>
  );
}
```

### 2.5 权限检查函数

```typescript
import {
  usePermissionStore,
  usePermissionHelpers
} from '@/stores';

function PermissionCheck() {
  const helpers = usePermissionHelpers();

  // 检查单个权限
  if (helpers.hasPermission('task:create')) {
    console.log('Can create tasks');
  }

  // 检查任意权限
  if (helpers.hasAnyPermission(['task:create', 'task:update'])) {
    console.log('Can create or update tasks');
  }

  // 检查所有权限
  if (helpers.hasAllPermissions(['task:create', 'task:read'])) {
    console.log('Full task access');
  }

  // 检查角色
  if (helpers.hasRole('admin')) {
    console.log('Is admin');
  }

  // 便捷方法
  if (helpers.isAdmin()) {
    console.log('Is admin');
  }

  if (helpers.isManagerOrAdmin()) {
    console.log('Is manager or higher');
  }

  return null;
}
```

---

## 3. lib/ 层工具使用

### 3.1 目录结构

```
src/lib/
├── agents/              # Agent 系统
│   ├── learning/        # 学习系统
│   └── scheduler/       # 调度器
├── api/                # API 工具
├── auth/               # 认证授权
├── cache/              # 缓存层
├── db/                 # 数据库
├── logger/             # 日志系统
├── monitoring/         # 监控系统
├── permissions/        # 权限管理
├── redis/              # Redis 客户端
├── search/             # 搜索功能
├── utils/              # 工具函数
└── websocket/          # WebSocket 通信
```

### 3.2 日志系统使用

```typescript
import { logger } from '@/lib/logger';

// 不同级别的日志
logger.debug('Debug message', { data: 'value' });
logger.info('User logged in', { userId: '123' });
logger.warn('Warning message', { issue: 'low memory' });
logger.error('Error occurred', error);

// 结构化日志
logger.info('Task completed', {
  taskId: '123',
  duration: 5000,
  agentId: 'agent-1',
});
```

### 3.3 数据库使用

```typescript
import { db } from '@/lib/db';

// 查询
const users = db.prepare('SELECT * FROM users').all();

// 单条查询
const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

// 插入
const result = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run(name, email);

// 更新
db.prepare('UPDATE users SET name = ? WHERE id = ?').run(newName, userId);

// 删除
db.prepare('DELETE FROM users WHERE id = ?').run(userId);
```

### 3.4 缓存使用

```typescript
import { apiCache } from '@/lib/cache';

// 设置缓存
apiCache.set('user:123', userData);

// 获取缓存
const cached = apiCache.get('user:123');
if (cached) {
  console.log('From cache:', cached);
}

// 删除缓存
apiCache.delete('user:123');

// 清空缓存
apiCache.clear();
```

### 3.5 搜索功能使用

```typescript
import { searchService } from '@/lib/search';

// 全局搜索
const results = await searchService.search({
  query: 'keyword',
  types: ['agents', 'tasks', 'projects'],
  filters: {
    status: 'active',
  },
  limit: 20,
});

// 搜索建议
const suggestions = await searchService.getSuggestions('keyword');

// 获取搜索历史
const history = await searchService.getSearchHistory();
```

### 3.6 WebSocket 通信

```typescript
import { wsClient } from '@/lib/websocket';

// 连接
wsClient.connect();

// 发送消息
wsClient.send('chat', { text: 'Hello' });

// 监听消息
wsClient.on('message', (data) => {
  console.log('Received:', data);
});

// 监听连接状态
wsClient.on('connected', () => {
  console.log('Connected');
});

wsClient.on('disconnected', () => {
  console.log('Disconnected');
});

// 断开连接
wsClient.disconnect();
```

---

## 4. Agent Learning System

### 4.1 功能概述

Agent Learning System 提供以下功能：

- **任务时间预测** - 预测任务执行时间
- **能力评估** - 自动评估 Agent 能力
- **学习数据持久化** - 保存和恢复学习数据

### 4.2 任务时间预测

```typescript
import { predictCompletionTime } from '@/lib/agents/learning';

// 预测任务完成时间
const features = {
  taskType: 'text-generation',
  inputSize: 1000,
  priority: 'normal',
  timeOfDay: 14,
  dayOfWeek: 3,
  historicalAvgTime: 5000,
  queueDepth: 0,
  agentLoad: 0.5,
};

const prediction = predictCompletionTime(features, 'agent-1');
console.log('Estimated time:', prediction.estimatedTime);
console.log('Confidence:', prediction.confidence);
```

### 4.3 Agent 能力评估

```typescript
import { assessAgentCapability } from '@/lib/agents/learning';

// 评估 Agent 能力
const assessment = assessAgentCapability('agent-1');
console.log('Overall score:', assessment.overallScore);
console.log('Technical score:', assessment.dimensions.technical.score);
console.log('Speed score:', assessment.dimensions.speed.score);
console.log('Recommendations:', assessment.recommendations);

// 获取趋势
const trend = getCapabilityTrend('agent-1', 'text-generation');
console.log('Trend:', trend); // 'improving' | 'stable' | 'declining'
```

### 4.4 学习数据持久化

```typescript
import {
  initializeLearningPersistence,
  saveLearningData,
  addTaskRecord
} from '@/lib/agents/learning';

// 初始化学习系统
const { persistence, timePredictor, capabilityAssessor } = 
  await initializeLearningPersistence();

// 添加任务记录
await addTaskRecord({
  taskId: '123',
  taskType: 'text-generation',
  agentId: 'agent-1',
  createdAt: Date.now(),
  startedAt: Date.now(),
  completedAt: Date.now() + 5000,
  executionTime: 5000,
  status: 'completed',
  inputSize: 1000,
  priority: 'normal',
  agentLoadAtStart: 0.5,
});

// 保存学习数据
await saveLearningData();

// 查询历史
const history = persistence.getTaskHistory('agent-1', 'text-generation', 100);
```

### 4.5 与调度器集成

```typescript
import { AgentScheduler } from '@/lib/agents/scheduler';
import { initializeLearningPersistence } from '@/lib/agents/learning';

async function createSchedulerWithLearning() {
  // 初始化学习系统
  const { persistence, timePredictor, capabilityAssessor } = 
    await initializeLearningPersistence();

  // 创建调度器
  const scheduler = new AgentScheduler({
    enableLearning: true,
    timePredictor,
    capabilityAssessor,
  });

  // 启动
  await scheduler.start();

  return scheduler;
}
```

---

## 5. 部署说明

### 5.1 部署选项

项目支持多种部署方式：

| 部署方式 | 适用场景 | 文档链接 |
|---------|---------|---------|
| **Docker** | 容器化部署、生产环境 | [DEPLOYMENT.md](../DEPLOYMENT.md) |
| **Vercel** | Next.js 原生部署、快速部署 | [vercel.json 配置](../vercel.json) |
| **GitHub Actions** | CI/CD 自动化部署 | [CI/CD 配置](../.github/workflows/) |

### 5.2 Docker 部署

```bash
# 构建镜像
docker build -t 7zi-studio .

# 运行容器
docker run -p 3000:3000 7zi-studio

# 使用 docker-compose
docker-compose up -d

# 生产环境
docker-compose -f docker-compose.prod.yml up -d
```

**docker-compose.prod.yml 示例：**

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_GITHUB_OWNER=songzuo
      - NEXT_PUBLIC_GITHUB_REPO=7zi
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 5.3 Vercel 部署

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录 Vercel
vercel login

# 部署到预览环境
vercel

# 部署到生产环境
vercel --prod
```

**vercel.json 配置：**

```json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["hnd1", "sfo1"],
  "env": {
    "NEXT_PUBLIC_GITHUB_OWNER": "songzuo",
    "NEXT_PUBLIC_GITHUB_REPO": "7zi"
  }
}
```

### 5.4 环境变量配置

**必需的环境变量：**

```bash
# GitHub API 配置
NEXT_PUBLIC_GITHUB_OWNER=songzuo
NEXT_PUBLIC_GITHUB_REPO=7zi
NEXT_PUBLIC_GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx  # 可选

# 应用配置
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com/api
```

**可选的环境变量：**

```bash
# 认证配置
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/7zi

# AI 模型配置
MINIMAX_API_KEY=your-minimax-key
VOLCENGINE_API_KEY=your-volcengine-key
BAILIAN_API_KEY=your-bailian-key

# 监控配置
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
```

### 5.5 蓝绿部署

项目支持零停机的蓝绿部署策略：

```
┌─────────────────┐     ┌─────────────────┐
│  Blue (Active)  │     │ Green (Standby) │
│  Port 3000      │◄───►│ Port 3001       │
│  Current Ver    │     │ New Version     │
└─────────────────┘     └─────────────────┘
```

**部署流程：**

1. 部署新版本到 Green 环境
2. 运行健康检查
3. 切换流量到 Green
4. Blue 变为备份

详细部署流程请参考 **[DEPLOYMENT.md](../DEPLOYMENT.md)**。

### 5.6 性能优化建议

#### 构建优化

```bash
# 使用 Turbopack 加速构建
pnpm build --turbopack

# 启用 React Compiler（实验性）
ENABLE_REACT_COMPILER=true pnpm build
```

#### 缓存配置

```typescript
// 使用 ISR 缓存
export const revalidate = 3600; // 1小时

// 使用 Server Actions 缓存 API
import { updateTag } from '@/lib/cache/server-actions';

await updateTag('dashboard-data');
```

#### 监控配置

```typescript
// 启用性能监控
import { performanceMonitor } from '@/lib/performance/monitor';

performanceMonitor.recordMetric({
  operation: 'api-request',
  duration: 150,
  status: 'success',
  timestamp: Date.now()
});
```

---

## 6. 常见问题

### 6.1 状态管理

**Q: 如何避免不必要的重渲染？**

A: 使用选择器只订阅需要的字段：

```typescript
// ✅ 好 - 只订阅需要的字段
const user = useAuthStore(state => state.user);

// ❌ 不好 - 订阅整个 store
const { user, token, permissions } = useAuthStore();
```

**Q: 如何在组件外部更新状态？**

A: 使用 store 的 getState 方法：

```typescript
import { useAuthStore } from '@/stores';

// 在组件外部
const authStore = useAuthStore.getState();
authStore.setUser(userData);
```

### 6.2 权限系统

**Q: 从 Context 迁移到 Zustand 需要修改代码吗？**

A: 可以逐步迁移。旧的 `usePermissions()` hook 仍然可用，内部已切换到 Zustand。新代码建议直接使用 Zustand store。

**Q: 如何测试权限逻辑？**

A: 使用 Zustand store 的测试工具：

```typescript
import { usePermissionStore } from '@/stores';

describe('Permission Check', () => {
  it('should check admin permission', () => {
    // 设置测试状态
    usePermissionStore.getState().initializeFromAuthData({
      user: { id: '1', roles: ['admin'] },
      permissions: ['all'],
    });

    // 测试
    const isAdmin = usePermissionStore.getState().isAdmin();
    expect(isAdmin).toBe(true);
  });
});
```

### 6.3 lib/ 工具

**Q: 如何选择使用哪个工具？**

A: 根据用途选择：

- 数据库操作 → `@/lib/db`
- 日志记录 → `@/lib/logger`
- 缓存 → `@/lib/cache`
- 搜索 → `@/lib/search`
- WebSocket → `@/lib/websocket`

### 6.4 Agent Learning

**Q: 学习系统会自动运行吗？**

A: 需要在任务完成时调用 `addTaskRecord()` 记录数据。调度器会自动记录，但如果是手动执行任务，需要手动记录。

**Q: 如何提高预测准确性？**

A: 提供更多历史数据。系统使用加权移动平均和贝叶斯估计，数据越多越准确。

### 6.5 部署相关

**Q: Docker 部署时端口冲突怎么办？**

A: 修改 docker-compose.yml 中的端口映射：

```yaml
services:
  app:
    ports:
      - "3001:3000"  # 修改为其他端口
```

**Q: Vercel 部署时环境变量不生效？**

A: 确保环境变量在 Vercel Dashboard 中正确配置，或者使用 `vercel env pull .env.local` 同步。

**Q: 生产环境如何启用 React Compiler？**

A: 在环境变量中设置：

```bash
ENABLE_REACT_COMPILER=true
REACT_COMPILER_MODE=opt-out
```

**Q: 如何监控生产环境性能？**

A: 集成性能监控系统：

```typescript
import { performanceMonitor } from '@/lib/performance/monitor';

// 配置 Sentry（可选）
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV
});
```

### 6.6 开发调试

**Q: 如何在开发环境中使用 Turbopack？**

A: 使用以下命令：

```bash
pnpm dev:turbo
```

Turbopack 比标准 Webpack 快 40-60%。

**Q: 如何查看详细的构建分析？**

A: 运行构建分析：

```bash
pnpm build --analyze
```

这会生成构建产物的可视化分析报告。

**Q: TypeScript 类型错误如何解决？**

A: 运行类型检查：

```bash
pnpm type-check
```

使用 VS Code 的 TypeScript 支持可以获得实时的类型错误提示。

---

## 📚 相关文档

### 核心文档

- **[README.md](../README.md)** - 项目介绍和快速开始 ⭐
- **[QUICKSTART.md](./QUICKSTART.md)** - 5 分钟快速部署
- **[QUICKSTART_V150.md](./QUICKSTART_V150.md)** - v1.5.0 快速入门指南 ⭐
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - 贡献指南
- **[DEPLOYMENT.md](../DEPLOYMENT.md)** - 部署指南

### 技术文档

- **[Zustand Stores 使用示例](./zustand-stores-usage.md)** - Zustand 详细使用示例
- **[PermissionContext 迁移报告](./permission-context-migration-report.md)** - 权限系统迁移文档
- **[lib/ 层重构报告](./LIB_REFACTOR_REPORT_20260329.md)** - lib/ 层架构重构
- **[Agent Learning System 实现报告](./AGENT_LEARNING_IMPLEMENTATION_REPORT.md)** - AI 学习系统实现
- **[开发指南](./DEVELOPMENT.md)** - 开发环境配置
- **[API 文档](./API.md)** - 完整 API 参考

### 架构文档

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 系统架构总览
- **[ADR 索引](./adr/README.md)** - 架构决策记录
- **[API 完整文档](./API.md)** - 所有 API 端点

### 文档索引

完整文档列表请查看 **[INDEX.md](./INDEX.md)**。

---

**需要帮助？** 
- 📧 邮件: support@7zi.com
- 🐛 提交 Issue: https://github.com/songzuo/7zi/issues
- 💬 GitHub Discussions: https://github.com/songzuo/7zi/discussions
