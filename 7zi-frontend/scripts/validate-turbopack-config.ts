#!/usr/bin/env node

/**
 * 生产环境配置验证脚本
 * 
 * 验证 Turbopack 生产环境配置的有效性：
 * - 检查 next.config.ts 配置
 * - 验证构建脚本
 * - 检查健康检查端点
 * - 验证日志配置
 * - 测试错误处理
 * 
 * @version 1.0.0
 * @date 2026-03-28
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// ============================================
// 工具函数
// ============================================
function log(message: string, color: keyof typeof colors = 'reset'): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message: string): void {
  log(`✓ ${message}`, 'green');
}

function error(message: string): void {
  log(`✗ ${message}`, 'red');
}

function warning(message: string): void {
  log(`⚠ ${message}`, 'yellow');
}

function info(message: string): void {
  log(`ℹ ${message}`, 'blue');
}

// ============================================
// 验证结果收集
// ============================================
interface ValidationResult {
  passed: string[];
  failed: string[];
  warnings: string[];
}

const results: ValidationResult = {
  passed: [],
  failed: [],
  warnings: [],
};

// ============================================
// 验证函数
// ============================================

/**
 * 1. 检查 next.config.ts 文件
 */
function checkNextConfig(): void {
  info('检查 next.config.ts...');

  const configPath = join(process.cwd(), 'next.config.ts');
  const legacyConfigPath = join(process.cwd(), 'next.config.js');

  if (!existsSync(configPath) && !existsSync(legacyConfigPath)) {
    error('next.config.ts 或 next.config.js 不存在');
    results.failed.push('next.config.ts 不存在');
    return;
  }

  if (existsSync(legacyConfigPath) && !existsSync(configPath)) {
    warning('使用旧的 next.config.js，建议迁移到 next.config.ts');
    results.warnings.push('建议迁移到 next.config.ts');
  }

  if (existsSync(configPath)) {
    const configContent = readFileSync(configPath, 'utf-8');
    
    // 检查关键配置项
    const checks = [
      { name: 'output: standalone', pattern: /output:\s*['"]standalone['"]/ },
      { name: 'reactStrictMode: true', pattern: /reactStrictMode:\s*true/ },
      { name: 'turbopack 配置', pattern: /turbopack:\s*\{/ },
      { name: 'experimental.optimizePackageImports', pattern: /optimizePackageImports:\s*\[/ },
      { name: 'compiler.removeConsole', pattern: /removeConsole:/ },
    ];

    checks.forEach(({ name, pattern }) => {
      if (pattern.test(configContent)) {
        success(`${name} 已配置`);
        results.passed.push(name);
      } else {
        warning(`${name} 未找到`);
        results.warnings.push(name);
      }
    });

    results.passed.push('next.config.ts 存在且格式正确');
  }
}

/**
 * 2. 检查 package.json 构建脚本
 */
function checkPackageScripts(): void {
  info('检查 package.json 构建脚本...');

  const packageJsonPath = join(process.cwd(), 'package.json');
  
  if (!existsSync(packageJsonPath)) {
    error('package.json 不存在');
    results.failed.push('package.json 不存在');
    return;
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  const scripts = packageJson.scripts || {};

  const requiredScripts = [
    { name: 'dev', value: 'next dev --turbopack' },
    { name: 'build', value: 'NODE_ENV=production next build --turbopack' },
    { name: 'start', value: 'next start' },
    { name: 'build:analyze', pattern: /ANALYZE=true.*next build.*--turbopack/ },
  ];

  requiredScripts.forEach(({ name, value, pattern }) => {
    const script = scripts[name];
    
    if (!script) {
      error(`脚本 ${name} 不存在`);
      results.failed.push(`脚本 ${name} 不存在`);
      return;
    }

    const matches = value 
      ? script === value 
      : pattern && pattern.test(script);

    if (matches) {
      success(`脚本 ${name} 配置正确: ${script}`);
      results.passed.push(`脚本 ${name}`);
    } else {
      warning(`脚本 ${name} 配置可能不正确: ${script}`);
      results.warnings.push(`脚本 ${name} 配置: ${script}`);
    }
  });

  // 检查可选的 webpack 回滚脚本
  const optionalScripts = ['build:webpack', 'build:analyze:webpack'];
  optionalScripts.forEach(name => {
    if (scripts[name]) {
      success(`可选脚本 ${name} 存在: ${scripts[name]}`);
      results.passed.push(`可选脚本 ${name}`);
    }
  });
}

/**
 * 3. 检查健康检查端点
 */
function checkHealthEndpoint(): void {
  info('检查健康检查端点...');

  const healthRoutePath = join(process.cwd(), 'src/app/api/health/route.ts');

  if (!existsSync(healthRoutePath)) {
    error('健康检查端点不存在: src/app/api/health/route.ts');
    results.failed.push('健康检查端点不存在');
    return;
  }

  const healthRouteContent = readFileSync(healthRoutePath, 'utf-8');
  
  const checks = [
    { name: 'GET 请求处理器', pattern: /export\s+async\s+function\s+GET/ },
    { name: 'HEAD 请求处理器', pattern: /export\s+async\s+function\s+HEAD/ },
    { name: '系统信息获取', pattern: /getSystemInfo/ },
    { name: '健康状态评估', pattern: /evaluateHealth/ },
    { name: '内存检查', pattern: /memoryUsage/ },
  ];

  checks.forEach(({ name, pattern }) => {
    if (pattern.test(healthRouteContent)) {
      success(`健康检查 ${name} 已实现`);
      results.passed.push(`健康检查 ${name}`);
    } else {
      warning(`健康检查 ${name} 未找到`);
      results.warnings.push(`健康检查 ${name}`);
    }
  });

  results.passed.push('健康检查端点存在');
}

/**
 * 4. 检查日志配置
 */
function checkLoggerConfig(): void {
  info('检查日志配置...');

  const loggerPath = join(process.cwd(), 'src/lib/logger.ts');

  if (!existsSync(loggerPath)) {
    warning('日志配置不存在: src/lib/logger.ts');
    results.warnings.push('日志配置不存在');
    return;
  }

  const loggerContent = readFileSync(loggerPath, 'utf-8');
  
  const checks = [
    { name: 'Logger 类', pattern: /class\s+Logger/ },
    { name: '日志级别', pattern: /LogLevel.*debug.*info.*warn.*error.*fatal/ },
    { name: '敏感数据过滤', pattern: /sanitizeData/ },
    { name: 'JSON 格式输出', pattern: /format.*json/ },
    { name: '远程日志', pattern: /enableRemoteLogging/ },
  ];

  checks.forEach(({ name, pattern }) => {
    if (pattern.test(loggerContent)) {
      success(`日志 ${name} 已配置`);
      results.passed.push(`日志 ${name}`);
    } else {
      warning(`日志 ${name} 未找到`);
      results.warnings.push(`日志 ${name}`);
    }
  });

  results.passed.push('日志配置存在');
}

/**
 * 5. 检查错误处理
 */
function checkErrorHandler(): void {
  info('检查错误处理...');

  const errorsPath = join(process.cwd(), 'src/lib/errors.ts');

  if (!existsSync(errorsPath)) {
    warning('错误处理不存在: src/lib/errors.ts');
    results.warnings.push('错误处理不存在');
    return;
  }

  const errorsContent = readFileSync(errorsPath, 'utf-8');
  
  const checks = [
    { name: 'AppError 类', pattern: /class\s+AppError/ },
    { name: 'ErrorCode 枚举', pattern: /enum\s+ErrorCode/ },
    { name: '错误工厂函数', pattern: /createBadRequestError|createNotFoundError/ },
    { name: 'handleError 函数', pattern: /function\s+handleError/ },
    { name: '错误聚合器', pattern: /class\s+ErrorAggregator/ },
  ];

  checks.forEach(({ name, pattern }) => {
    if (pattern.test(errorsContent)) {
      success(`错误处理 ${name} 已配置`);
      results.passed.push(`错误处理 ${name}`);
    } else {
      warning(`错误处理 ${name} 未找到`);
      results.warnings.push(`错误处理 ${name}`);
    }
  });

  results.passed.push('错误处理存在');
}

/**
 * 6. 检查环境变量
 */
function checkEnvironmentVariables(): void {
  info('检查环境变量...');

  const envPath = join(process.cwd(), '.env.example');
  
  if (!existsSync(envPath)) {
    warning('.env.example 不存在');
    results.warnings.push('.env.example 不存在');
    return;
  }

  const envContent = readFileSync(envPath, 'utf-8');
  
  const requiredVars = [
    { name: 'NODE_ENV', description: '节点环境' },
    { name: 'LOG_LEVEL', description: '日志级别' },
  ];

  const optionalVars = [
    { name: 'LOG_ENDPOINT', description: '远程日志端点' },
    { name: 'ANALYZE', description: '启用 Bundle Analyzer' },
    { name: 'USE_WEBPACK', description: '使用 Webpack 而非 Turbopack' },
  ];

  requiredVars.forEach(({ name, description }) => {
    if (envContent.includes(name)) {
      success(`环境变量 ${name} 已定义 (${description})`);
      results.passed.push(`环境变量 ${name}`);
    } else {
      warning(`环境变量 ${name} 未定义 (${description})`);
      results.warnings.push(`环境变量 ${name}`);
    }
  });

  optionalVars.forEach(({ name, description }) => {
    if (envContent.includes(name)) {
      info(`可选环境变量 ${name} 已定义 (${description})`);
      results.passed.push(`可选环境变量 ${name}`);
    }
  });
}

/**
 * 7. 验证构建
 */
function verifyBuild(): void {
  info('验证构建配置...');

  try {
    // 检查 TypeScript 配置
    const tsConfigPath = join(process.cwd(), 'tsconfig.json');
    if (existsSync(tsConfigPath)) {
      success('tsconfig.json 存在');
      results.passed.push('tsconfig.json');
    }

    // 检查 package.json 依赖
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    
    const requiredDeps = ['next', 'react', 'react-dom'];
    requiredDeps.forEach(dep => {
      if (packageJson.dependencies[dep]) {
        success(`依赖 ${dep} 已安装: ${packageJson.dependencies[dep]}`);
        results.passed.push(`依赖 ${dep}`);
      } else {
        error(`依赖 ${dep} 未安装`);
        results.failed.push(`依赖 ${dep}`);
      }
    });

    // 检查 Next.js 版本
    const nextVersion = packageJson.dependencies.next;
    if (nextVersion) {
      const versionMatch = nextVersion.match(/\d+/);
      if (versionMatch) {
        const majorVersion = parseInt(versionMatch[0]);
        if (majorVersion >= 16) {
          success(`Next.js 版本 >= 16: ${nextVersion}`);
          results.passed.push('Next.js 版本');
        } else if (majorVersion >= 15) {
          warning(`Next.js 版本 ${nextVersion}，建议升级到 16+`);
          results.warnings.push('Next.js 版本');
        } else {
          error(`Next.js 版本 ${nextVersion}，需要升级到 16+`);
          results.failed.push('Next.js 版本');
        }
      }
    }
  } catch (err) {
    error(`验证构建时出错: ${err}`);
    results.failed.push('构建验证失败');
  }
}

// ============================================
// 主函数
// ============================================
function main(): void {
  log('\n=====================================================', 'cyan');
  log('Turbopack 生产环境配置验证', 'cyan');
  log('=====================================================\n', 'cyan');

  // 运行所有验证
  checkNextConfig();
  console.log('');
  
  checkPackageScripts();
  console.log('');
  
  checkHealthEndpoint();
  console.log('');
  
  checkLoggerConfig();
  console.log('');
  
  checkErrorHandler();
  console.log('');
  
  checkEnvironmentVariables();
  console.log('');
  
  verifyBuild();
  console.log('');

  // 输出总结
  log('=====================================================', 'cyan');
  log('验证总结', 'cyan');
  log('=====================================================\n', 'cyan');

  const totalPassed = results.passed.length;
  const totalWarnings = results.warnings.length;
  const totalFailed = results.failed.length;
  const total = totalPassed + totalWarnings + totalFailed;

  log(`总计: ${total} 项检查`, 'blue');
  success(`通过: ${totalPassed} 项`);
  warning(`警告: ${totalWarnings} 项`);
  error(`失败: ${totalFailed} 项`);
  console.log('');

  // 详细结果
  if (results.failed.length > 0) {
    log('失败的检查:', 'red');
    results.failed.forEach(f => error(`  - ${f}`));
    console.log('');
  }

  if (results.warnings.length > 0) {
    log('警告的检查:', 'yellow');
    results.warnings.forEach(w => warning(`  - ${w}`));
    console.log('');
  }

  // 退出代码
  const exitCode = totalFailed > 0 ? 1 : 0;
  
  if (exitCode === 0) {
    log('\n✓ 所有必需的检查都通过了！\n', 'green');
  } else {
    log('\n✗ 存在失败的检查，请修复后再继续。\n', 'red');
  }

  process.exit(exitCode);
}

// 运行验证
main();
