# Plugin System v1.10.0

一个灵活、安全、可扩展的插件架构，为 OpenClaw 提供强大的插件能力。

## 📋 目录

- [特性](#特性)
- [架构设计](#架构设计)
- [快速开始](#快速开始)
- [核心概念](#核心概念)
- [API 文档](#api-文档)
- [内置插件](#内置插件)
- [开发插件](#开发插件)
- [插件市场](#插件市场)
- [安全机制](#安全机制)
- [最佳实践](#最佳实践)

## ✨ 特性

### 🎯 核心功能

- **插件接口规范** - 统一的 init/hook/execute 接口
- **生命周期管理** - 完整的加载、初始化、启动、停止、卸载流程
- **依赖管理** - 自动依赖解析和版本检查
- **插件注册与发现** - 快速查找和注册插件
- **沙箱隔离运行** - 安全的插件执行环境
- **热加载/卸载** - 运行时插件管理
- **版本管理** - 版本检查和兼容性验证

### 🔒 安全特性

- **权限控制** - 细粒度的权限管理
- **资源限制** - 内存、CPU、执行时间限制
- **代码验证** - 危险代码检测
- **签名验证** - 插件完整性校验
- **安全扫描** - 漏洞和敏感数据检测

### 📦 内置插件

- **日志插件** - 多传输、多格式的日志系统
- **缓存插件** - 高性能缓存，支持多种后端
- **认证插件** - 多提供商认证和授权
- **Webhook 插件** - 事件驱动的 webhook 系统

## 🏗️ 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      Plugin System                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐│
│  │ Plugin Manager │  │Plugin Registry │  │ Plugin Loader  ││
│  │                │  │                │  │                ││
│  │ - Load/Unload  │  │ - Register     │  │ - Scan         ││
│  │ - Start/Stop   │  │ - Unregister   │  │ - Load         ││
│  │ - Execute      │  │ - Search       │  │ - Hot Reload   ││
│  └────────────────┘  └────────────────┘  └────────────────┘│
│                                                             │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐│
│  │ Plugin Sandbox │  │  Plugin Hooks  │  │  Plugin SDK    ││
│  │                │  │                │  │                ││
│  │ - Isolation    │  │ - Register     │  │ - Logger       ││
│  │ - Security     │  │ - Execute      │  │ - Storage      ││
│  │ - Permissions  │  │ - Events       │  │ - HTTP/DB      ││
│  └────────────────┘  └────────────────┘  └────────────────┘│
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                      Marketplace                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐│
│  │ Plugin Market  │  │Plugin Installer│  │Plugin Validator││
│  │                │  │                │  │                ││
│  │ - Search       │  │ - Install      │  │ - Validate     ││
│  │ - Discovery    │  │ - Update       │  │ - Security     ││
│  │ - Ratings      │  │ - Uninstall    │  │ - Scan         ││
│  └────────────────┘  └────────────────┘  └────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 快速开始

### 安装

```bash
npm install @openclaw/plugin-system
```

### 基本使用

```typescript
import { PluginManager, PluginRegistry, PluginLoader, PluginSandbox, PluginHooks } from '@openclaw/plugin-system';

// 初始化插件系统
const registry = new PluginRegistry();
const loader = new PluginLoader({ pluginDir: './plugins' });
const sandbox = new PluginSandbox();
const hooks = new PluginHooks();
const manager = new PluginManager(registry, loader, sandbox, hooks);

// 加载插件
const plugin = await manager.loadPlugin('my-plugin', {
  enabled: true,
  config: { apiKey: 'your-api-key' }
});

// 初始化并启动
await manager.initPlugin('my-plugin');
await manager.startPlugin('my-plugin');

// 执行插件操作
const result = await manager.execute('my-plugin', 'action', { data: 'test' });

// 停止并卸载
await manager.stopPlugin('my-plugin');
await manager.unloadPlugin('my-plugin');
```

## 📖 核心概念

### 插件接口

```typescript
interface Plugin {
  metadata: PluginMetadata;
  config: PluginConfig;
  
  // 生命周期方法
  init(context: PluginContext): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  destroy(): Promise<void>;
  
  // 可选方法
  registerHooks?(registry: HookRegistry): void;
  execute?<TInput, TOutput>(action: string, input?: TInput): Promise<TOutput>;
  healthCheck?(): Promise<PluginHealthStatus>;
  getMetrics?(): Promise<PluginMetrics>;
}
```

### 插件生命周期

```
unloaded → loading → loaded → initializing → initialized 
    → starting → running → stopping → stopped → unloaded
```

### 钩子系统

```typescript
// 注册钩子
hooks.register('beforeExecute', async (context, input) => {
  console.log('Before execute:', input);
  return input;
}, { priority: 100 });

// 执行钩子
await hooks.execute('beforeExecute', { action: 'test' });
```

## 📚 API 文档

### PluginManager

主要插件管理器，负责插件的加载、卸载、启动、停止和执行。

```typescript
class PluginManager {
  // 加载插件
  async loadPlugin(id: string, config?: Partial<PluginConfig>): Promise<Plugin>;
  
  // 卸载插件
  async unloadPlugin(id: string): Promise<void>;
  
  // 重载插件
  async reloadPlugin(id: string): Promise<Plugin>;
  
  // 启用/禁用插件
  async enablePlugin(id: string): Promise<void>;
  async disablePlugin(id: string): Promise<void>;
  
  // 执行插件操作
  async execute<TInput, TOutput>(
    pluginId: string,
    action: string,
    input?: TInput
  ): Promise<TOutput>;
  
  // 执行钩子
  async executeHook<TInput, TOutput>(
    hook: HookName,
    input?: TInput
  ): Promise<TOutput[]>;
  
  // 获取健康状态
  async getHealthStatus(pluginId: string): Promise<PluginHealthStatus>;
  
  // 获取指标
  async getMetrics(pluginId: string): Promise<PluginMetrics>;
}
```

### PluginRegistry

插件注册表，用于插件的注册和查找。

```typescript
class PluginRegistry {
  // 注册插件
  register(plugin: Plugin): void;
  
  // 注销插件
  unregister(pluginId: string): void;
  
  // 获取插件
  get(pluginId: string): Plugin | undefined;
  
  // 获取所有插件
  getAll(): Plugin[];
  
  // 搜索插件
  search(query: PluginSearchQuery): Plugin[];
}
```

### PluginLoader

插件加载器，负责从不同来源加载插件。

```typescript
class PluginLoader {
  // 加载插件
  async load(id: string, source?: PluginSource): Promise<Plugin>;
  
  // 扫描可用插件
  async scan(): Promise<Array<{ id: string; path: string; metadata?: PluginMetadata }>>;
  
  // 监听变化（热加载）
  watch(callback: (event: string, id: string) => void): void;
}
```

### PluginSandbox

插件沙箱，提供安全的执行环境。

```typescript
class PluginSandbox {
  // 创建沙箱
  async create(pluginId: string, permissions: PluginPermission[]): Promise<SandboxContext>;
  
  // 销毁沙箱
  async destroy(pluginId: string): Promise<void>;
  
  // 在沙箱中执行代码
  async execute<T>(pluginId: string, code: string | Function, context?: any): Promise<T>;
  
  // 验证插件代码
  async validate(code: string): Promise<ValidationResult>;
}
```

## 🎨 内置插件

### 1. 日志插件 (@openclaw/plugin-logging)

高级日志系统，支持多种传输和格式。

```typescript
import { LoggingPlugin } from '@openclaw/plugin-system/builtin';

const logger = new LoggingPlugin();

// 配置
await manager.execute('@openclaw/plugin-logging', 'log', {
  level: 'info',
  message: 'Hello, World!',
  meta: { userId: 123 }
});

// 查询日志
const logs = await manager.execute('@openclaw/plugin-logging', 'getLogs', {
  level: 'error',
  limit: 100
});
```

**特性：**
- 多传输支持（console、file、http、syslog）
- 多格式支持（json、text、pretty）
- 自动刷新和缓冲
- 级别过滤
- 性能指标

### 2. 缓存插件 (@openclaw/plugin-cache)

高性能缓存系统，支持多种后端和淘汰策略。

```typescript
import { CachePlugin } from '@openclaw/plugin-system/builtin';

const cache = new CachePlugin();

// 设置缓存
await manager.execute('@openclaw/plugin-cache', 'set', {
  key: 'user:123',
  value: { name: 'John', email: 'john@example.com' },
  ttl: 3600
});

// 获取缓存
const user = await manager.execute('@openclaw/plugin-cache', 'get', {
  key: 'user:123'
});

// 失效模式匹配
await manager.execute('@openclaw/plugin-cache', 'invalidate', {
  pattern: 'user:*'
});
```

**特性：**
- 多后端支持（memory、redis、memcached）
- 淘汰策略（LRU、LFU、FIFO）
- TTL 支持
- 自动清理过期条目
- 统计和监控

### 3. 认证插件 (@openclaw/plugin-auth)

多提供商认证和授权系统。

```typescript
import { AuthPlugin } from '@openclaw/plugin-system/builtin';

const auth = new AuthPlugin();

// 注册用户
await manager.execute('@openclaw/plugin-auth', 'register', {
  username: 'john',
  email: 'john@example.com',
  password: 'secure-password',
  roles: ['user', 'admin']
});

// 登录
const result = await manager.execute('@openclaw/plugin-auth', 'login', {
  username: 'john',
  password: 'secure-password'
});

// 验证 token
const verification = await manager.execute('@openclaw/plugin-auth', 'verify', {
  token: result.token
});

// 检查权限
const hasPermission = await manager.execute('@openclaw/plugin-auth', 'checkPermission', {
  userId: verification.userId,
  permission: 'admin:write'
});
```

**特性：**
- 多提供商（local、oauth、jwt、ldap、saml）
- 密码策略验证
- 会话管理
- 锁定机制
- 权限和角色管理

### 4. Webhook 插件 (@openclaw/plugin-webhook)

事件驱动的 webhook 系统。

```typescript
import { WebhookPlugin } from '@openclaw/plugin-system/builtin';

const webhook = new WebhookPlugin();

// 创建端点
await manager.execute('@openclaw/plugin-webhook', 'createEndpoint', {
  url: 'https://example.com/webhook',
  events: ['user.created', 'user.deleted'],
  headers: { 'Authorization': 'Bearer token' }
});

// 触发 webhook
await manager.execute('@openclaw/plugin-webhook', 'trigger', {
  event: 'user.created',
  payload: { userId: 123, name: 'John' }
});

// 查看投递状态
const delivery = await manager.execute('@openclaw/plugin-webhook', 'getDelivery', {
  id: 'delivery-id'
});
```

**特性：**
- 事件订阅
- 重试机制
- 投递跟踪
- 签名验证
- 并发控制

## 🛠️ 开发插件

### 插件目录结构

```
my-plugin/
├── plugin.json          # 插件清单
├── index.js             # 入口文件
├── package.json         # NPM 包信息
├── README.md            # 文档
├── src/
│   ├── index.ts
│   └── utils.ts
└── tests/
    └── index.test.ts
```

### plugin.json 示例

```json
{
  "id": "@my-org/my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "A custom plugin for OpenClaw",
  "category": "utility",
  "tags": ["custom", "utility"],
  "author": {
    "name": "Your Name",
    "email": "you@example.com"
  },
  "license": "MIT",
  "keywords": ["plugin", "custom"],
  "minCoreVersion": "1.10.0",
  "dependencies": [
    {
      "id": "@openclaw/plugin-logging",
      "version": "^1.0.0"
    }
  ]
}
```

### 插件实现示例

```typescript
import { Plugin, PluginContext, PluginHealthStatus } from '@openclaw/plugin-system';

export class MyPlugin implements Plugin {
  metadata = {
    id: '@my-org/my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    description: 'A custom plugin',
  };

  config = {
    id: this.metadata.id,
    enabled: true,
    config: {
      apiKey: '',
    },
  };

  private context?: PluginContext;

  async init(context: PluginContext): Promise<void> {
    this.context = context;
    context.logger.info('My plugin initialized');
  }

  async start(): Promise<void> {
    this.context?.logger.info('My plugin started');
  }

  async stop(): Promise<void> {
    this.context?.logger.info('My plugin stopped');
  }

  async destroy(): Promise<void> {
    this.context?.logger.info('My plugin destroyed');
  }

  async execute<TInput = any, TOutput = any>(
    action: string,
    input?: TInput
  ): Promise<TOutput> {
    switch (action) {
      case 'greet':
        return { message: `Hello, ${input?.name || 'World'}!` } as TOutput;

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async healthCheck(): Promise<PluginHealthStatus> {
    return {
      status: 'healthy',
      message: 'My plugin is running',
      timestamp: new Date(),
    };
  }
}

export default MyPlugin;
```

## 🏪 插件市场

### 搜索插件

```typescript
import { PluginMarket } from '@openclaw/plugin-system/marketplace';

const market = new PluginMarket();

// 搜索
const plugins = market.search({
  query: 'logging',
  category: 'logging',
  verified: true,
  limit: 10
});

// 获取特色插件
const featured = market.getFeaturedPlugins();

// 获取统计
const stats = market.getStats();
```

### 安装插件

```typescript
import { PluginInstaller } from '@openclaw/plugin-system/marketplace';

const installer = new PluginInstaller('./plugins', loader, validator, security);

// 安装
const result = await installer.install(plugin, {
  version: '1.0.0',
  securityCheck: true
});

// 更新
const update = await installer.update(pluginId, newPlugin);

// 卸载
await installer.uninstall(pluginId);
```

### 安全扫描

```typescript
import { PluginSecurity } from '@openclaw/plugin-system/marketplace';

const security = new PluginSecurity();

// 扫描插件
const scan = await security.scan('./plugins/my-plugin');

// 验证签名
const verified = security.verifySignature(
  pluginPath,
  signature,
  publicKey
);

// 生成安全报告
const report = await security.generateSecurityReport(pluginPath);
```

## 🔒 安全机制

### 权限控制

```typescript
const permissions: PluginPermission[] = [
  { name: 'fs:read', scope: 'read' },
  { name: 'fs:write', scope: 'write' },
  { name: 'http', scope: 'execute' },
];

const sandbox = await pluginSandbox.create('my-plugin', permissions);
```

### 资源限制

```typescript
const limits: PluginResourceLimits = {
  maxMemory: 512,           // 512 MB
  maxCpuTime: 5000,         // 5 seconds
  maxExecutionTime: 30000,  // 30 seconds
  maxConnections: 10,       // 10 connections
};
```

### 沙箱隔离

```typescript
// 验证代码
const validation = await sandbox.validate(code);

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

// 在沙箱中执行
const result = await sandbox.execute('my-plugin', code, { context });
```

## 📋 最佳实践

### 1. 插件开发

- ✅ 使用 TypeScript 开发插件
- ✅ 提供完整的类型定义
- ✅ 实现健康检查接口
- ✅ 提供详细的文档
- ✅ 编写单元测试
- ✅ 遵循语义化版本控制

### 2. 安全

- ✅ 永远不要在代码中硬编码密钥
- ✅ 使用参数化查询防止 SQL 注入
- ✅ 验证所有用户输入
- ✅ 使用最小权限原则
- ✅ 实现资源限制
- ✅ 定期更新依赖

### 3. 性能

- ✅ 使用异步操作
- ✅ 实现缓存机制
- ✅ 避免阻塞操作
- ✅ 监控内存使用
- ✅ 优化数据库查询
- ✅ 使用连接池

### 4. 日志

- ✅ 使用插件日志器
- ✅ 记录错误和警告
- ✅ 包含上下文信息
- ✅ 使用适当的日志级别
- ✅ 不要记录敏感信息
- ✅ 使用结构化日志

## 📄 许可证

MIT © OpenClaw Team