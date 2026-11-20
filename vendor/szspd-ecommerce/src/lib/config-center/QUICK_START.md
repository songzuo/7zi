# 配置中心 - 快速开始指南

## 安装和导入

```typescript
import { createMemoryConfigCenter, ConfigManager } from '@/lib/config-center';
```

## 核心功能

### 1. 基础配置操作

```typescript
// 创建配置中心实例
const configCenter = createMemoryConfigCenter({
  defaultEnvironment: 'development',
  enableCache: true,
  enableVersioning: true,
  enableAuditLog: true,
});

// 初始化
await configCenter.initialize();

// 设置配置
await configCenter.set('app.name', 'MyApp', {
  userId: 'admin',
  description: '应用名称',
  group: 'app',
});

// 获取配置
const appName = await configCenter.get<string>('app.name');

// 批量获取
const configs = await configCenter.getMultiple(['app.name', 'app.version']);

// 删除配置
await configCenter.delete('app.name', 'development', { userId: 'admin' });
```

### 2. 环境管理

```typescript
// 设置不同环境的配置
await configCenter.set('db.host', 'localhost', {
  userId: 'admin',
  environment: 'development',
});

await configCenter.set('db.host', 'prod-db.example.com', {
  userId: 'admin',
  environment: 'production',
});

// 获取特定环境的配置
const devHost = await configCenter.get<string>('db.host', 'development');
const prodHost = await configCenter.get<string>('db.host', 'production');
```

### 3. 配置验证

```typescript
await configCenter.set('app.port', 8080, {
  userId: 'admin',
  validation: {
    required: true,
    min: 1,
    max: 65535,
  },
});

await configCenter.set('app.email', 'user@example.com', {
  userId: 'admin',
  validation: {
    pattern: '^[^@]+@[^@]+\\.[^@]+$',
    errorMessage: 'Invalid email format',
  },
});
```

### 4. 配置变更监听

```typescript
// 监听单个配置
const unsubscribe = configCenter.onChange('app.name', (event) => {
  console.log('配置已更新:', event.newValue);
});

// 监听所有配置
configCenter.onChange('*', (event) => {
  console.log('配置变更:', event);
});

// 取消监听
unsubscribe();
```

### 5. 版本管理

```typescript
// 获取版本管理器
const versionManager = configCenter.getVersionManager();

// 获取版本历史
const history = await versionManager.getVersionHistory(configId);

// 回滚版本
await versionManager.rollback(configId, targetVersion, userId);
```

### 6. 访问控制

```typescript
// 获取访问控制器
const accessController = configCenter.getAccessController();

// 创建权限
await accessController.createPermission({
  principalId: 'user-123',
  principalType: 'user',
  resourceType: 'config',
  resourceId: 'app.*',
  actions: ['read', 'write'],
  allow: true,
});

// 生成 API 密钥
const { apiKey, key } = await accessController.generateApiKey({
  name: 'API Key',
  userId: 'user-123',
  scopes: ['config:read'],
});
```

### 7. 审计日志

```typescript
// 获取审计日志器
const auditLogger = configCenter.getAuditLogger();

// 查询日志
const logs = await auditLogger.query({
  action: 'update',
  timeRange: {
    start: new Date('2024-01-01'),
    end: new Date(),
  },
});

// 获取统计
const stats = await auditLogger.getStats();
```

### 8. 热加载

```typescript
// 热加载所有动态配置
const result = await configCenter.hotReload();

// 热加载特定配置
const result = await configCenter.hotReload(['config.key1', 'config.key2']);
```

## 完整示例

查看 `examples/usage-example.ts` 文件获取完整的使用示例。

## API 文档

详细 API 文档请查看 `README.md` 文件。