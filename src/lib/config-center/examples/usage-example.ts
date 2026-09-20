/**
 * 配置中心使用示例
 * @module config-center/examples/usage-example
 */

import {
  createMemoryConfigCenter,
  ConfigManager,
  ConfigCenterUtils,
} from '../index';

/**
 * 示例 1: 基础配置管理
 */
async function example1_BasicUsage() {
  console.log('=== 示例 1: 基础配置管理 ===\n');

  // 创建配置中心
  const configCenter = createMemoryConfigCenter({
    defaultEnvironment: 'development',
    enableCache: true,
    enableVersioning: true,
    enableAuditLog: true,
  });

  await configCenter.initialize();

  // 设置配置
  await configCenter.set('app.name', 'My Application', {
    userId: 'admin',
    description: '应用程序名称',
    group: 'app',
  });

  await configCenter.set('app.version', '1.0.0', {
    userId: 'admin',
    group: 'app',
  });

  await configCenter.set('app.port', 3000, {
    userId: 'admin',
    group: 'app',
    validation: {
      required: true,
      min: 1,
      max: 65535,
    },
  });

  // 获取配置
  const appName = await configCenter.get<string>('app.name');
  const appPort = await configCenter.get<number>('app.port');

  console.log(`应用名称: ${appName}`);
  console.log(`应用端口: ${appPort}`);

  // 批量获取配置
  const appConfigs = await configCenter.getMultiple(['app.name', 'app.version', 'app.port']);
  console.log('应用配置:', appConfigs);

  await configCenter.close();
}

/**
 * 示例 2: 多环境配置
 */
async function example2_MultiEnvironment() {
  console.log('\n=== 示例 2: 多环境配置 ===\n');

  const configCenter = createMemoryConfigCenter();
  await configCenter.initialize();

  // 开发环境配置
  await configCenter.set('database.host', 'localhost', {
    userId: 'admin',
    environment: 'development',
    group: 'database',
  });

  await configCenter.set('database.port', 5432, {
    userId: 'admin',
    environment: 'development',
    group: 'database',
  });

  // 生产环境配置
  await configCenter.set('database.host', 'prod-db.example.com', {
    userId: 'admin',
    environment: 'production',
    group: 'database',
  });

  await configCenter.set('database.port', 5432, {
    userId: 'admin',
    environment: 'production',
    group: 'database',
  });

  // 获取不同环境的配置
  const devHost = await configCenter.get<string>('database.host', 'development');
  const prodHost = await configCenter.get<string>('database.host', 'production');

  console.log(`开发环境数据库: ${devHost}`);
  console.log(`生产环境数据库: ${prodHost}`);

  await configCenter.close();
}

/**
 * 示例 3: 配置模板
 */
async function example3_ConfigTemplates() {
  console.log('\n=== 示例 3: 配置模板 ===\n');

  const configCenter = createMemoryConfigCenter();
  await configCenter.initialize();

  const envManager = configCenter.getEnvironmentManager();

  // 创建配置分组
  const databaseGroup = envManager.createGroup({
    name: 'Database',
    key: 'database',
    description: '数据库配置',
    order: 1,
  });

  const apiGroup = envManager.createGroup({
    name: 'API',
    key: 'api',
    description: 'API 配置',
    order: 2,
  });

  console.log('创建的分组:', [databaseGroup, apiGroup]);

  // 创建配置模板
  const webAppTemplate = envManager.createTemplate({
    name: 'Web 应用模板',
    key: 'web-app',
    description: '标准 Web 应用配置模板',
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
      },
      {
        key: 'app.port',
        value: 3000,
        valueType: 'number',
        environment: 'development',
        group: 'app',
        status: 'active',
        sensitive: false,
        dynamic: true,
        validation: {
          min: 1,
          max: 65535,
        },
      },
    ],
    createdBy: 'admin',
  });

  console.log('创建的模板:', webAppTemplate);

  // 应用模板
  const configs = await envManager.applyTemplate(webAppTemplate.id, 'development', {
    'app.name': 'My Web App',
  });

  console.log('应用的配置:', configs);

  await configCenter.close();
}

/**
 * 示例 4: 版本管理
 */
async function example4_VersionManagement() {
  console.log('\n=== 示例 4: 版本管理 ===\n');

  const configCenter = createMemoryConfigCenter({
    enableVersioning: true,
  });
  await configCenter.initialize();

  // 创建配置并多次更新
  await configCenter.set('version.test', 'v1', {
    userId: 'admin',
    description: '初始版本',
  });

  await configCenter.set('version.test', 'v2', {
    userId: 'admin',
    description: '更新到 v2',
  });

  await configCenter.set('version.test', 'v3', {
    userId: 'admin',
    description: '更新到 v3',
  });

  // 获取版本历史
  const versionManager = configCenter.getVersionManager();
  const configs = await configCenter.query({ keyPattern: 'version.test' });
  
  if (configs.length > 0) {
    const configId = configs[0].id;
    const history = await versionManager.getVersionHistory(configId);
    
    console.log('版本历史:');
    history.forEach((version, index) => {
      console.log(`  ${index + 1}. 版本 ${version.version}: ${version.value} (${version.changeAction})`);
    });

    // 获取版本统计
    const stats = await versionManager.getVersionStats(configId);
    console.log('\n版本统计:');
    console.log(`  总版本数: ${stats.totalVersions}`);
    console.log(`  更新次数: ${stats.updateCount}`);
    console.log(`  创建次数: ${stats.createCount}`);
  }

  await configCenter.close();
}

/**
 * 示例 5: 访问控制
 */
async function example5_AccessControl() {
  console.log('\n=== 示例 5: 访问控制 ===\n');

  const configCenter = createMemoryConfigCenter({
    enableAccessControl: true,
  });
  await configCenter.initialize();

  const accessController = configCenter.getAccessController();

  if (!accessController) {
    console.error('Access controller not available');
    return;
  }

  // 创建用户权限
  await accessController.createPermission({
    principalId: 'user-123',
    principalType: 'user',
    resourceType: 'config',
    resourceId: 'app.*',
    actions: ['read'],
    allow: true,
  });

  await accessController.createPermission({
    principalId: 'admin-456',
    principalType: 'user',
    resourceType: 'config',
    resourceId: '*',
    actions: ['read', 'write', 'delete', 'admin'],
    allow: true,
  });

  // 检查权限
  const canRead = await accessController.checkPermission(
    'user-123',
    'config',
    'app.name',
    'read'
  );

  const canWrite = await accessController.checkPermission(
    'user-123',
    'config',
    'app.name',
    'write'
  );

  console.log(`用户 user-123 可以读取 app.name: ${canRead}`);
  console.log(`用户 user-123 可以写入 app.name: ${canWrite}`);

  // 生成 API 密钥
  const { apiKey, key } = await accessController.generateApiKey({
    name: 'Production API Key',
    userId: 'user-123',
    scopes: ['config:read'],
    environments: ['production'],
    rateLimit: {
      enabled: true,
      windowMs: 60,
      maxRequests: 100,
    },
  });

  console.log('\n生成的 API 密钥:');
  console.log(`  名称: ${apiKey.name}`);
  console.log(`  前缀: ${apiKey.keyPrefix}`);
  console.log(`  完整密钥: ${key}`);

  // 验证 API 密钥
  const validation = await accessController.validateApiKey(key, {
    requiredScope: 'config:read',
    environment: 'production',
  });

  console.log(`\nAPI 密钥验证: ${validation.valid}`);

  await configCenter.close();
}

/**
 * 示例 6: 审计日志
 */
async function example6_AuditLog() {
  console.log('\n=== 示例 6: 审计日志 ===\n');

  const configCenter = createMemoryConfigCenter({
    enableAuditLog: true,
  });
  await configCenter.initialize();

  // 执行一些操作
  await configCenter.set('audit.test1', 'value1', { userId: 'user1' });
  await configCenter.set('audit.test2', 'value2', { userId: 'user2' });
  await configCenter.set('audit.test3', 'value3', { userId: 'user1' });

  // 查询审计日志
  const auditLogger = configCenter.getAuditLogger();

  if (!auditLogger) {
    console.error('Audit logger not available');
    return;
  }

  const logs = await auditLogger.query({
    pagination: {
      offset: 0,
      limit: 10,
    },
  });

  console.log('审计日志:');
  logs.forEach((log, index) => {
    console.log(`  ${index + 1}. ${log.action} ${log.resourceName} by ${log.operatorId}`);
  });

  // 获取统计信息
  const stats = await auditLogger.getStats();
  console.log('\n审计统计:');
  console.log(`  总日志数: ${stats.totalLogs}`);
  console.log(`  成功率: ${(stats.successRate * 100).toFixed(2)}%`);
  console.log(`  按操作类型:`, stats.byAction);

  await configCenter.close();
}

/**
 * 示例 7: 配置变更监听
 */
async function example7_ConfigChangeListeners() {
  console.log('\n=== 示例 7: 配置变更监听 ===\n');

  const configCenter = createMemoryConfigCenter();
  await configCenter.initialize();

  // 监听特定配置的变更
  const unsubscribe1 = configCenter.onChange('listener.test', async (event) => {
    console.log(`配置 ${event.config.key} 变更:`, {
      oldValue: event.oldValue,
      newValue: event.newValue,
      changedBy: event.changedBy,
    });
  });

  // 监听所有配置的变更
  const unsubscribe2 = configCenter.onChange('*', async (event) => {
    console.log(`[全局] 配置 ${event.config.key} ${event.type}`);
  });

  // 触发变更
  await configCenter.set('listener.test', 'value1', { userId: 'user1' });
  await configCenter.set('listener.test', 'value2', { userId: 'user2' });

  // 取消监听
  unsubscribe1();
  unsubscribe2();

  await configCenter.close();
}

/**
 * 示例 8: 热加载
 */
async function example8_HotReload() {
  console.log('\n=== 示例 8: 热加载 ===\n');

  const configCenter = createMemoryConfigCenter();
  await configCenter.initialize();

  // 设置一些动态配置
  await configCenter.set('hot.reload1', 'value1', {
    userId: 'admin',
    dynamic: true,
  });

  await configCenter.set('hot.reload2', 'value2', {
    userId: 'admin',
    dynamic: true,
  });

  await configCenter.set('hot.static', 'value3', {
    userId: 'admin',
    dynamic: false,
  });

  // 热加载所有动态配置
  const result = await configCenter.hotReload();

  console.log('热加载结果:');
  console.log(`  成功: ${result.success}`);
  console.log(`  重新加载数量: ${result.reloadedCount}`);
  console.log(`  耗时: ${result.duration}ms`);

  await configCenter.close();
}

/**
 * 示例 9: 配置查询
 */
async function example9_ConfigQuery() {
  console.log('\n=== 示例 9: 配置查询 ===\n');

  const configCenter = createMemoryConfigCenter();
  await configCenter.initialize();

  // 创建一些测试配置
  await configCenter.set('query.app.name', 'MyApp', {
    userId: 'user1',
    group: 'app',
  });

  await configCenter.set('query.app.version', '1.0.0', {
    userId: 'user1',
    group: 'app',
  });

  await configCenter.set('query.db.host', 'localhost', {
    userId: 'user2',
    group: 'database',
  });

  await configCenter.set('query.db.port', 5432, {
    userId: 'user2',
    group: 'database',
  });

  // 按分组查询
  const appConfigs = await configCenter.query({ group: 'app' });
  console.log('应用分组配置:', appConfigs.map(c => c.key));

  // 按创建者查询
  const user1Configs = await configCenter.query({ createdBy: 'user1' });
  console.log('user1 创建的配置:', user1Configs.map(c => c.key));

  // 按键名模式查询
  const dbConfigs = await configCenter.query({ keyPattern: 'query.db.*' });
  console.log('数据库配置:', dbConfigs.map(c => c.key));

  // 分页查询
  const pagedConfigs = await configCenter.query({
    pagination: {
      offset: 0,
      limit: 2,
    },
  });
  console.log('分页查询结果:', pagedConfigs.map(c => c.key));

  await configCenter.close();
}

/**
 * 示例 10: 工具函数
 */
async function example10_Utils() {
  console.log('\n=== 示例 10: 工具函数 ===\n');

  // 验证配置键
  console.log('配置键验证:');
  console.log(`  app.name: ${ConfigCenterUtils.validateConfigKey('app.name')}`);
  console.log(`  123key: ${ConfigCenterUtils.validateConfigKey('123key')}`);

  // 规范化配置键
  console.log('\n配置键规范化:');
  console.log(`  App.Name -> ${ConfigCenterUtils.normalizeConfigKey('App.Name')}`);

  // 解析配置路径
  console.log('\n配置路径解析:');
  console.log(`  app.name:`, ConfigCenterUtils.parseConfigPath('app.name'));
  console.log(`  production/app.name:`, ConfigCenterUtils.parseConfigPath('production/app.name'));
  console.log(`  production/database/host:`, ConfigCenterUtils.parseConfigPath('production/database/host'));

  // 构建配置路径
  console.log('\n配置路径构建:');
  console.log(
    ConfigCenterUtils.buildConfigPath({
      environment: 'production',
      group: 'database',
      key: 'host',
    })
  );

  // 深度合并
  console.log('\n深度合并:');
  const merged = ConfigCenterUtils.deepMerge(
    { a: 1, b: { c: 2, d: 3 } },
    { b: { d: 4 }, f: 6 } as Record<string, unknown>
  );
  console.log(merged);
}

/**
 * 运行所有示例
 */
async function runAllExamples() {
  try {
    await example1_BasicUsage();
    await example2_MultiEnvironment();
    await example3_ConfigTemplates();
    await example4_VersionManagement();
    await example5_AccessControl();
    await example6_AuditLog();
    await example7_ConfigChangeListeners();
    await example8_HotReload();
    await example9_ConfigQuery();
    await example10_Utils();

    console.log('\n=== 所有示例运行完成 ===');
  } catch (error) {
    console.error('示例运行失败:', error);
  }
}

// 如果直接运行此文件，执行所有示例
if (require.main === module) {
  runAllExamples();
}

export {
  example1_BasicUsage,
  example2_MultiEnvironment,
  example3_ConfigTemplates,
  example4_VersionManagement,
  example5_AccessControl,
  example6_AuditLog,
  example7_ConfigChangeListeners,
  example8_HotReload,
  example9_ConfigQuery,
  example10_Utils,
  runAllExamples,
};