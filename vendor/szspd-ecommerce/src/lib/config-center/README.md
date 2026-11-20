# 配置中心 (Config Center)

企业级配置中心系统，支持配置管理、版本控制、动态更新、访问控制和高可用。

## 版本

v1.10.0

## 特性

### 1. 配置管理

- **集中化配置存储** - 统一管理所有配置项
- **配置版本管理** - 完整的版本历史和回滚功能
- **配置分组和环境** - 支持 dev/staging/prod 等多环境
- **配置模板和继承** - 可复用的配置模板和继承机制

### 2. 动态配置

- **运行时配置更新** - 无需重启即可更新配置
- **配置变更推送** - 实时通知配置变更
- **配置热加载** - 自动重新加载动态配置
- **配置回滚** - 快速回滚到任意历史版本

### 3. 访问控制

- **配置权限管理** - 细粒度的权限控制
- **操作审计** - 完整的操作日志记录
- **API 密钥认证** - 安全的 API 访问机制

### 4. 高可用

- **配置同步** - 多节点配置同步
- **故障转移** - 自动故障检测和转移
- **配置缓存** - 高性能缓存机制

## 安装

```bash
npm install @7zi/config-center
```

## 快速开始

### 基础使用

```typescript
import { createMemoryConfigCenter } from '@/lib/config-center';

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
  description: 'Application name',
  group: 'app',
});

// 获取配置
const appName = await configCenter.get<string>('app.name');
console.log(appName); // 'MyApp'

// 批量获取配置
const configs = await configCenter.getMultiple(['app.name', 'app.version']);
console.log(configs);
```

### 环境管理

```typescript
const envManager = configCenter.getEnvironmentManager();

// 获取所有环境
const environments = envManager.getEnvironments();
console.log(environments);

// 创建配置分组
const group = envManager.createGroup({
  name: 'Database',
  key: 'database',
  description: 'Database configuration',
  order: 1,
});

// 创建配置模板
const template = envManager.createTemplate({
  name: 'Web App Template',
  key: 'web-app',
  description: 'Standard web application configuration',
  configs: [
    {
      key: 'app.name',
      value: '',
      valueType: 'string',
      environment: 'development',
      group: 'app',
      status: 'active',
      sensitive: false,
      dynamic: true,
      createdBy: 'admin',
    },
  ],
});

// 应用模板
const configs = await envManager.applyTemplate(template.id, 'development');
```

### 版本管理

```typescript
const versionManager = configCenter.getVersionManager();

// 获取版本历史
const history = await versionManager.getVersionHistory(configId);

// 回滚到指定版本
await versionManager.rollback(configId, targetVersion, userId);

// 比较版本
const diff = await versionManager.compareVersions(configId, version1, version2);

// 获取版本统计
const stats = await versionManager.getVersionStats(configId);
```

### 访问控制

```typescript
const accessController = configCenter.getAccessController();

// 创建权限
await accessController.createPermission({
  principalId: 'user123',
  principalType: 'user',
  resourceType: 'config',
  resourceId: 'app.*',
  actions: ['read', 'write'],
  allow: true,
});

// 生成 API 密钥
const { apiKey, key } = await accessController.generateApiKey({
  name: 'Production API Key',
  userId: 'user123',
  scopes: ['config:read', 'config:write'],
  environments: ['production'],
  rateLimit: {
    enabled: true,
    windowMs: 60,
    maxRequests: 100,
  },
});

// 验证 API 密钥
const result = await accessController.validateApiKey(key, {
  requiredScope: 'config:read',
  environment: 'production',
});
```

### 审计日志

```typescript
const auditLogger = configCenter.getAuditLogger();

// 查询审计日志
const logs = await auditLogger.query({
  action: 'update',
  resourceType: 'config',
  timeRange: {
    start: new Date('2024-01-01'),
    end: new Date(),
  },
});

// 获取统计信息
const stats = await auditLogger.getStats();

// 导出日志
const csv = await auditLogger.exportLogs(query, 'csv');
```

### 高可用

```typescript
import { HighAvailabilityManager } from '@/lib/config-center';

const haManager = new HighAvailabilityManager(
  storage,
  'node-1',
  {
    syncInterval: 30000,
    batchSize: 100,
  }
);

// 添加节点
await haManager.addNode({
  nodeId: 'node-2',
  address: 'http://node-2:8080',
  role: 'slave',
  online: true,
  version: '1.10.0',
});

// 同步配置
const syncStatus = await haManager.syncToNode('node-2');

// 健康检查
const health = await haManager.healthCheck();

// 故障转移
const newMaster = await haManager.failover();
```

## 配置验证

```typescript
await configCenter.set('app.port', 8080, {
  userId: 'admin',
  validation: {
    required: true,
    min: 1,
    max: 65535,
    type: 'number',
  },
});

await configCenter.set('app.email', 'user@example.com', {
  userId: 'admin',
  validation: {
    required: true,
    pattern: '^[^@]+@[^@]+\\.[^@]+$',
    errorMessage: 'Invalid email format',
  },
});
```

## 配置变更监听

```typescript
// 监听特定配置的变更
const unsubscribe = configCenter.onChange('app.name', async (event) => {
  console.log(`Config ${event.config.key} changed:`, event.newValue);
});

// 监听所有配置的变更
configCenter.onChange('*', async (event) => {
  console.log('Config changed:', event);
});

// 取消监听
unsubscribe();
```

## 热加载

```typescript
// 热加载所有动态配置
const result = await configCenter.hotReload();

console.log(`Reloaded ${result.reloadedCount} configs`);

// 热加载特定配置
const result = await configCenter.hotReload(['app.name', 'app.version']);
```

## 配置导出和导入

```typescript
// 导出配置
const exportOptions = {
  format: 'json' as const,
  includeHistory: true,
  environments: ['production'],
};

// 导入配置
const importOptions = {
  conflictStrategy: 'merge' as const,
  validate: true,
  importedBy: 'admin',
};
```

## 存储适配器

### 内存存储

```typescript
import { MemoryStorageAdapter } from '@/lib/config-center';

const storage = new MemoryStorageAdapter();
const configCenter = createConfigCenter({ storageAdapter: storage });
```

### Redis 存储

```typescript
import { RedisStorageAdapter } from '@/lib/config-center';

const storage = new RedisStorageAdapter({
  host: 'localhost',
  port: 6379,
  password: 'your-password',
  db: 0,
  keyPrefix: 'config:',
});

const configCenter = createConfigCenter({ storageAdapter: storage });
```

### 数据库存储

```typescript
import { DatabaseStorageAdapter } from '@/lib/config-center';

const storage = new DatabaseStorageAdapter({
  type: 'postgres',
  connection: 'postgresql://user:pass@localhost:5432/configdb',
  tableName: 'configs',
});

const configCenter = createConfigCenter({ storageAdapter: storage });
```

## API 参考

### ConfigManager

主要配置管理类。

#### 方法

- `initialize()` - 初始化配置管理器
- `get<T>(key, environment?, options?)` - 获取配置值
- `getMultiple<T>(keys, environment?)` - 批量获取配置
- `set(key, value, options)` - 设置配置
- `delete(key, environment, options)` - 删除配置
- `query(query)` - 查询配置
- `getAll(environment?)` - 获取所有配置
- `hotReload(keys?, environment?)` - 热加载配置
- `onChange(key, listener)` - 监听配置变更
- `clearCache(key?, environment?)` - 清除缓存
- `close()` - 关闭配置管理器

### VersionManager

版本管理类。

#### 方法

- `createVersion(config, action, userId)` - 创建新版本
- `getVersionHistory(configId, options?)` - 获取版本历史
- `getVersion(configId, version)` - 获取特定版本
- `rollback(configId, targetVersion, userId)` - 回滚版本
- `compareVersions(configId, version1, version2)` - 比较版本

### EnvironmentManager

环境管理类。

#### 方法

- `getEnvironments()` - 获取环境列表
- `addEnvironment(config)` - 添加环境
- `createGroup(group)` - 创建配置分组
- `createTemplate(template)` - 创建配置模板
- `applyTemplate(templateId, environment, overrides?)` - 应用模板

### AccessController

访问控制类。

#### 方法

- `checkPermission(principalId, resourceType, resourceId, action)` - 检查权限
- `createPermission(permission)` - 创建权限
- `generateApiKey(options)` - 生成 API 密钥
- `validateApiKey(key, options?)` - 验证 API 密钥

### AuditLogger

审计日志类。

#### 方法

- `log(entry)` - 记录审计日志
- `query(query)` - 查询审计日志
- `getStats(options?)` - 获取统计信息
- `exportLogs(query, format)` - 导出日志

### HighAvailabilityManager

高可用管理类。

#### 方法

- `addNode(node)` - 添加节点
- `syncToNode(targetNodeId, environment?)` - 同步配置到节点
- `healthCheck()` - 健康检查
- `failover()` - 故障转移

## 类型定义

所有类型定义都在 `types.ts` 文件中，包括：

- `ConfigItem` - 配置项
- `ConfigVersion` - 配置版本
- `ConfigGroup` - 配置分组
- `ConfigTemplate` - 配置模板
- `ConfigPermission` - 配置权限
- `ApiKey` - API 密钥
- `ConfigAuditLog` - 审计日志
- `ConfigChangeEvent` - 配置变更事件

## 最佳实践

### 1. 配置命名规范

- 使用点分隔的层级结构：`app.name`, `database.host`
- 使用小写字母和下划线：`api_endpoint_url`
- 避免特殊字符和空格

### 2. 环境隔离

- 为不同环境使用独立的配置
- 使用继承机制减少重复配置
- 生产环境配置应该有严格的访问控制

### 3. 版本管理

- 重要配置变更前创建备份
- 定期清理旧版本
- 使用有意义的变更描述

### 4. 安全性

- 敏感配置标记为 `sensitive: true`
- 使用 API 密钥进行程序访问
- 定期审计访问日志

### 5. 性能优化

- 启用缓存减少存储访问
- 批量操作代替单个操作
- 合理设置缓存 TTL

## 故障排查

### 配置未生效

1. 检查配置是否标记为 `dynamic: true`
2. 检查缓存是否已清除
3. 查看审计日志确认操作是否成功

### 权限被拒绝

1. 检查用户是否有相应的权限
2. 检查权限是否已过期
3. 查看审计日志了解详细信息

### 性能问题

1. 检查缓存命中率
2. 考虑增加缓存大小
3. 使用批量操作减少请求次数

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.10.0 (2024-04-03)

- ✨ 新增企业级配置中心系统
- ✨ 支持配置版本管理和回滚
- ✨ 支持多环境配置管理
- ✨ 支持配置模板和继承
- ✨ 支持访问控制和 API 密钥
- ✨ 支持审计日志
- ✨ 支持高可用和配置同步
- ✨ 支持配置热加载
- ✨ 支持多种存储适配器