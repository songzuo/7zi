/**
 * Health API 诊断测试脚本
 * 
 * 目的：诊断 Health API 返回 503 错误的根本原因
 * 
 * 检查项目：
 * 1. 数据库连接状态
 * 2. Redis/缓存连接状态
 * 3. 环境变量配置
 * 4. 内存使用情况
 * 5. 测试与实现的一致性
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface DiagnosticResult {
  category: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: Record<string, unknown>;
}

const results: DiagnosticResult[] = [];

function log(category: string, status: DiagnosticResult['status'], message: string, details?: Record<string, unknown>) {
  results.push({ category, status, message, details });
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  console.log(`${icon} [${category}] ${message}`);
  if (details) {
    console.log('   Details:', JSON.stringify(details, null, 2));
  }
}

// ============================================
// 1. 检查环境变量配置
// ============================================
console.log('\n📦 1. 检查环境变量配置\n');

const envPath = join(process.cwd(), '.env');
const envExamplePath = join(process.cwd(), '.env.example');

if (existsSync(envPath)) {
  log('ENV', 'pass', '.env 文件存在');
} else {
  log('ENV', 'warning', '.env 文件不存在');
}

if (existsSync(envExamplePath)) {
  const envExample = readFileSync(envExamplePath, 'utf-8');
  const requiredVars = envExample.match(/^[A-Z_]+(?==)/gm) || [];
  log('ENV', 'pass', '.env.example 定义了变量', { count: requiredVars.length, vars: requiredVars.slice(0, 10) });
}

// 检查关键环境变量
const criticalEnvVars = [
  'DATABASE_URL',
  'NEXT_PUBLIC_APP_URL',
  'NODE_ENV',
];

for (const varName of criticalEnvVars) {
  if (process.env[varName]) {
    log('ENV', 'pass', `${varName} 已设置`);
  } else {
    log('ENV', 'warning', `${varName} 未设置`);
  }
}

// ============================================
// 2. 检查数据库连接
// ============================================
console.log('\n📦 2. 检查数据库连接\n');

try {
  const dbIndexPath = join(process.cwd(), 'src/lib/db/index.ts');
  if (existsSync(dbIndexPath)) {
    log('DB', 'pass', '数据库模块文件存在', { path: dbIndexPath });
  } else {
    log('DB', 'fail', '数据库模块文件不存在');
  }

  // 检查数据库配置
  const dbUnifiedPath = join(process.cwd(), 'src/lib/db/index-unified.ts');
  if (existsSync(dbUnifiedPath)) {
    const dbUnified = readFileSync(dbUnifiedPath, 'utf-8');
    const hasBetterSqlite = dbUnified.includes('better-sqlite3');
    const hasPostgres = dbUnified.includes('postgres') || dbUnified.includes('pg');
    log('DB', 'pass', '数据库统一接口存在', { 
      betterSqlite: hasBetterSqlite,
      postgres: hasPostgres 
    });
  }
} catch (error) {
  log('DB', 'fail', '数据库检查失败', { error: String(error) });
}

// ============================================
// 3. 检查缓存/Redis配置
// ============================================
console.log('\n📦 3. 检查缓存/Redis配置\n');

try {
  const cacheManagerPath = join(process.cwd(), 'src/lib/cache/CacheManager.ts');
  if (existsSync(cacheManagerPath)) {
    log('CACHE', 'pass', 'CacheManager 存在', { path: cacheManagerPath });
  } else {
    log('CACHE', 'warning', 'CacheManager 不存在');
  }

  // 检查是否有 Redis 配置
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    log('CACHE', 'pass', 'REDIS_URL 已配置');
  } else {
    log('CACHE', 'warning', 'REDIS_URL 未配置 (可能使用内存缓存)');
  }
} catch (error) {
  log('CACHE', 'fail', '缓存检查失败', { error: String(error) });
}

// ============================================
// 4. 检查 Health API 实现
// ============================================
console.log('\n📦 4. 检查 Health API 实现\n');

try {
  const healthRoutePath = join(process.cwd(), 'src/app/api/health/route.ts');
  const healthTestPath = join(process.cwd(), 'src/app/api/health/route.test.ts');

  if (existsSync(healthRoutePath)) {
    const routeContent = readFileSync(healthRoutePath, 'utf-8');
    
    // 检查实现细节
    const usesCacheManager = routeContent.includes('getCacheManager') || routeContent.includes('CacheManager');
    const usesCreateErrorResponse = routeContent.includes('createErrorResponse');
    const checksMemory = routeContent.includes('memoryUsage') || routeContent.includes('memory');
    const checksDb = routeContent.includes('database') || routeContent.includes('db') || routeContent.includes('getDatabase');
    
    log('HEALTH-API', 'pass', 'Health API 路由文件存在');
    
    if (!usesCacheManager) {
      log('HEALTH-API', 'warning', 'Health API 未使用 CacheManager', { 
        note: '测试期望使用缓存，但实现未使用' 
      });
    } else {
      log('HEALTH-API', 'pass', 'Health API 使用了 CacheManager');
    }

    if (!usesCreateErrorResponse) {
      log('HEALTH-API', 'warning', 'Health API 未使用 createErrorResponse', {
        note: '测试期望使用标准化错误响应，但实现未使用'
      });
    } else {
      log('HEALTH-API', 'pass', 'Health API 使用了 createErrorResponse');
    }

    if (checksMemory) {
      log('HEALTH-API', 'pass', 'Health API 检查内存状态');
    } else {
      log('HEALTH-API', 'warning', 'Health API 未检查内存状态');
    }

    if (checksDb) {
      log('HEALTH-API', 'pass', 'Health API 检查数据库状态');
    } else {
      log('HEALTH-API', 'warning', 'Health API 未检查数据库状态', {
        note: '基础健康检查可能不需要数据库检查'
      });
    }
  } else {
    log('HEALTH-API', 'fail', 'Health API 路由文件不存在');
  }

  // 检查测试文件
  if (existsSync(healthTestPath)) {
    const testContent = readFileSync(healthTestPath, 'utf-8');
    
    const expectsSuccessField = testContent.includes("toHaveProperty('success'");
    const expectsDataField = testContent.includes("data.checks");
    const mocksCacheManager = testContent.includes("vi.mock('@/lib/cache/CacheManager')");
    
    log('HEALTH-TEST', 'pass', 'Health API 测试文件存在');
    
    if (expectsSuccessField) {
      log('HEALTH-TEST', 'info', '测试期望响应包含 success 字段');
    }
    
    if (mocksCacheManager) {
      log('HEALTH-TEST', 'info', '测试模拟了 CacheManager');
    }
  }
} catch (error) {
  log('HEALTH-API', 'fail', 'Health API 检查失败', { error: String(error) });
}

// ============================================
// 5. 分析测试与实现的差异
// ============================================
console.log('\n📦 5. 分析测试与实现的差异\n');

try {
  const routeContent = readFileSync(join(process.cwd(), 'src/app/api/health/route.ts'), 'utf-8');
  const testContent = readFileSync(join(process.cwd(), 'src/app/api/health/route.test.ts'), 'utf-8');

  // 检查响应格式差异
  const routeReturnsDirect = /return NextResponse\.json\(\s*\{[^}]*status:/s.test(routeContent);
  const testExpectsWrapped = testContent.includes("data.data.status") || testContent.includes("data.checks");

  if (routeReturnsDirect && testExpectsWrapped) {
    log('MISMATCH', 'fail', '响应格式不匹配', {
      implementation: '直接返回对象 { status, checks, ... }',
      test_expectation: '期望包装格式 { success: true, data: { status, checks, ... } }',
      fix: '修改实现或修改测试，使格式一致'
    });
  }

  // 检查缓存使用差异
  const routeUsesCache = routeContent.includes('getCacheManager') || routeContent.includes('getOrSet');
  const testExpectsCache = testContent.includes('getOrSet') || testContent.includes('CacheManager');

  if (!routeUsesCache && testExpectsCache) {
    log('MISMATCH', 'fail', '缓存使用不匹配', {
      implementation: '未使用缓存',
      test_expectation: '期望使用缓存 (getCacheManager.getOrSet)',
      fix: '在实现中添加缓存逻辑，或移除测试中的缓存期望'
    });
  }

  // 检查错误处理差异
  const routeUsesCreateErrorResponse = routeContent.includes('createErrorResponse');
  const testExpectsCreateErrorResponse = testContent.includes("createErrorResponse");

  if (!routeUsesCreateErrorResponse && testExpectsCreateErrorResponse) {
    log('MISMATCH', 'fail', '错误处理不匹配', {
      implementation: '使用 console.error 和简单 JSON 响应',
      test_expectation: '期望使用 createErrorResponse 标准化错误响应',
      fix: '在实现中使用 createErrorResponse，或简化测试的期望'
    });
  }

} catch (error) {
  log('MISMATCH', 'fail', '差异分析失败', { error: String(error) });
}

// ============================================
// 6. 运行实际测试查看失败详情
// ============================================
console.log('\n📦 6. 运行 Health API 测试\n');

try {
  const testOutput = execSync(
    'npm test -- --reporter=verbose src/app/api/health/route.test.ts 2>&1',
    { encoding: 'utf-8', timeout: 120000, cwd: process.cwd() }
  );
  
  const failedTests = (testOutput.match(/FAIL.*health\/route\.test\.ts/g) || []).length;
  const passedTests = (testOutput.match(/✓.*health\/route\.test\.ts/g) || []).length;
  
  if (failedTests > 0) {
    log('TEST-RUN', 'fail', `${failedTests} 个测试失败`, { 
      summary: `通过: ${passedTests}, 失败: ${failedTests}` 
    });
  } else {
    log('TEST-RUN', 'pass', '所有测试通过');
  }
} catch (error) {
  const output = String(error);
  const failedCount = (output.match(/FAIL/g) || []).length;
  log('TEST-RUN', 'fail', `${failedCount} 个测试失败`);
}

// ============================================
// 生成诊断报告
// ============================================
console.log('\n' + '='.repeat(60));
console.log('📊 诊断报告摘要');
console.log('='.repeat(60));

const passed = results.filter(r => r.status === 'pass').length;
const failed = results.filter(r => r.status === 'fail').length;
const warnings = results.filter(r => r.status === 'warning').length;

console.log(`\n总计: ${results.length} 项检查`);
console.log(`✅ 通过: ${passed}`);
console.log(`❌ 失败: ${failed}`);
console.log(`⚠️  警告: ${warnings}`);

// 输出失败项详情
const failures = results.filter(r => r.status === 'fail');
if (failures.length > 0) {
  console.log('\n❌ 失败项目详情:');
  failures.forEach(f => {
    console.log(`   - [${f.category}] ${f.message}`);
    if (f.details) {
      console.log(`     ${JSON.stringify(f.details)}`);
    }
  });
}

// 输出建议
console.log('\n🔧 修复建议:');
console.log('─'.repeat(40));

// 根据诊断结果生成建议
const mismatchFailures = results.filter(r => r.category === 'MISMATCH' && r.status === 'fail');

if (mismatchFailures.length > 0) {
  console.log('\n1. 主要问题: 测试与实现不匹配');
  console.log('   原因: 测试文件期望的响应格式和缓存机制与实际实现不同');
  console.log('   解决方案:');
  console.log('   A) 修改实现以匹配测试期望:');
  console.log('      - 使用 CacheManager 缓存健康检查结果');
  console.log('      - 使用 { success: true, data: {...} } 格式返回响应');
  console.log('      - 使用 createErrorResponse 处理错误');
  console.log('   B) 修改测试以匹配实现:');
  console.log('      - 移除对 CacheManager 的期望');
  console.log('      - 使用直接响应格式 { status, checks, ... }');
}

console.log('\n' + '='.repeat(60));

// 导出结果
export { results };
