#!/usr/bin/env node

/**
 * React Compiler 兼容性检测工具
 * 用于检测项目中不兼容 React Compiler 的组件和代码模式
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 颜色定义
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

// 统计数据
const stats = {
  totalFiles: 0,
  totalComponents: 0,
  issues: {
    errors: 0,
    warnings: 0,
    info: 0,
  },
  manualOptimizations: {
    reactMemo: 0,
    useMemo: 0,
    useCallback: 0,
  },
  incompatiblePatterns: [],
};

// 扫描目录
const SRC_DIR = path.join(__dirname, '..', 'src');

/**
 * 扫描文件查找特定模式
 */
function scanFile(filePath, patterns) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const results = [];

  patterns.forEach(({ pattern, message, severity }) => {
    const matches = content.match(pattern);
    if (matches) {
      results.push({
        file: filePath,
        message,
        severity,
        count: matches.length,
      });
    }
  });

  return results;
}

/**
 * 检测 React Hooks 规则违规
 */
function checkHookRules(filePath) {
  const patterns = [
    {
      pattern: /if\s*\([^)]*\)\s*{[^}]*use(State|Effect|Callback|Memo|Ref|Context)/g,
      message: '条件语句中的 Hook 调用（违反 Rules of Hooks）',
      severity: 'error',
    },
    {
      pattern: /for\s*\([^)]*\)\s*{[^}]*use(State|Effect|Callback|Memo)/g,
      message: '循环中的 Hook 调用（违反 Rules of Hooks）',
      severity: 'error',
    },
    {
      pattern: /while\s*\([^)]*\)\s*{[^}]*use(State|Effect)/g,
      message: 'while 循环中的 Hook 调用（违反 Rules of Hooks）',
      severity: 'error',
    },
  ];

  return scanFile(filePath, patterns);
}

/**
 * 检测手动优化代码
 */
function checkManualMemoization(filePath) {
  const patterns = [
    {
      pattern: /React\.memo\s*\(/g,
      message: 'React.memo 使用',
      severity: 'info',
    },
    {
      pattern: /useMemo\s*\(/g,
      message: 'useMemo 使用',
      severity: 'info',
    },
    {
      pattern: /useCallback\s*\(/g,
      message: 'useCallback 使用',
      severity: 'info',
    },
  ];

  const results = scanFile(filePath, patterns);

  // 更新统计
  results.forEach(result => {
    if (result.message.includes('React.memo')) {
      stats.manualOptimizations.reactMemo += result.count;
    } else if (result.message.includes('useMemo')) {
      stats.manualOptimizations.useMemo += result.count;
    } else if (result.message.includes('useCallback')) {
      stats.manualOptimizations.useCallback += result.count;
    }
  });

  return results;
}

/**
 * 检测潜在问题模式
 */
function checkProblematicPatterns(filePath) {
  const patterns = [
    {
      pattern: /props\.\w+\s*=/g,
      message: 'Props mutation（props 不应该被修改）',
      severity: 'error',
    },
    {
      pattern: /dependencies\s*=\s*\[[^\]]{50,}\]/g,
      message: '过长的依赖数组（可能导致性能问题）',
      severity: 'warning',
    },
    {
      pattern: /useEffect\s*\([^,]+,\s*\[\]\)\s*{\s*\/\/\s*eslint-disable/g,
      message: '空依赖数组且禁用 ESLint（可能导致 bug）',
      severity: 'warning',
    },
    {
      pattern: /useEffect\s*\(\s*\(\)\s*=>\s*{[\s\S]{500,}}\s*,\s*\[/g,
      message: '大型 useEffect（考虑拆分）',
      severity: 'warning',
    },
  ];

  return scanFile(filePath, patterns);
}

/**
 * 检测组件复杂度
 */
function checkComponentComplexity(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').length;

  const results = [];

  if (lines > 300) {
    results.push({
      file: filePath,
      message: `大型组件 (${lines} 行，建议 < 300 行)`,
      severity: 'warning',
      count: 1,
    });
  }

  // 检测嵌套层级
  const nestingLevel = (content.match(/{/g) || []).length - (content.match(/}/g) || []).length;
  if (nestingLevel > 5) {
    results.push({
      file: filePath,
      message: `深层嵌套 (嵌套层级: ${nestingLevel})`,
      severity: 'warning',
      count: 1,
    });
  }

  return results;
}

/**
 * 递归扫描目录
 */
function scanDirectory(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // 跳过特定目录
      if (!['node_modules', '.next', 'build', 'dist'].includes(file)) {
        scanDirectory(filePath);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      stats.totalFiles++;

      // 检测组件
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content.includes('export') && (content.includes('function') || content.includes('const'))) {
        stats.totalComponents++;
      }

      // 执行所有检测
      const allResults = [
        ...checkHookRules(filePath),
        ...checkManualMemoization(filePath),
        ...checkProblematicPatterns(filePath),
        ...checkComponentComplexity(filePath),
      ];

      // 更新统计
      allResults.forEach(result => {
        if (result.severity === 'error') {
          stats.issues.errors++;
        } else if (result.severity === 'warning') {
          stats.issues.warnings++;
        } else {
          stats.issues.info++;
        }

        stats.incompatiblePatterns.push(result);
      });
    }
  });
}

/**
 * 生成报告
 */
function generateReport() {
  const reportFile = path.join(
    __dirname,
    '..',
    'reports',
    `react-compiler-compatibility-${Date.now()}.json`
  );

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: stats.totalFiles,
      totalComponents: stats.totalComponents,
      issues: stats.issues,
      manualOptimizations: stats.manualOptimizations,
    },
    details: stats.incompatiblePatterns,
    recommendations: generateRecommendations(),
  };

  // 确保报告目录存在
  const reportsDir = path.dirname(reportFile);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

  return reportFile;
}

/**
 * 生成建议
 */
function generateRecommendations() {
  const recommendations = [];

  if (stats.issues.errors > 0) {
    recommendations.push({
      priority: 'high',
      message: '发现 Rules of Hooks 违规，必须修复后才能启用 React Compiler',
    });
  }

  if (stats.issues.warnings > 5) {
    recommendations.push({
      priority: 'medium',
      message: '多个组件存在潜在问题，建议先优化再启用编译器',
    });
  }

  if (stats.manualOptimizations.reactMemo > 10) {
    recommendations.push({
      priority: 'low',
      message: `${stats.manualOptimizations.reactMemo} 处 React.memo 可以在启用编译器后逐步移除`,
    });
  }

  if (stats.manualOptimizations.useMemo > 20) {
    recommendations.push({
      priority: 'low',
      message: `${stats.manualOptimizations.useMemo} 处 useMemo 可以在启用编译器后逐步移除`,
    });
  }

  return recommendations;
}

/**
 * 打印摘要
 */
function printSummary() {
  console.log('\n========================================');
  console.log('React Compiler 兼容性检测报告');
  console.log('========================================\n');

  console.log(`${colors.blue}📊 项目统计:${colors.reset}`);
  console.log(`  扫描文件: ${stats.totalFiles}`);
  console.log(`  检测组件: ${stats.totalComponents}\n`);

  console.log(`${colors.blue}🔍 问题统计:${colors.reset}`);
  console.log(`  ${colors.red}错误: ${stats.issues.errors}${colors.reset}`);
  console.log(`  ${colors.yellow}警告: ${stats.issues.warnings}${colors.reset}`);
  console.log(`  ${colors.blue}信息: ${stats.issues.info}${colors.reset}\n`);

  console.log(`${colors.blue}📝 手动优化代码:${colors.reset}`);
  console.log(`  React.memo: ${stats.manualOptimizations.reactMemo}`);
  console.log(`  useMemo: ${stats.manualOptimizations.useMemo}`);
  console.log(`  useCallback: ${stats.manualOptimizations.useCallback}\n`);

  if (stats.issues.errors > 0) {
    console.log(`${colors.red}❌ 发现严重问题，请修复后再启用 React Compiler${colors.reset}\n`);
    process.exit(1);
  } else if (stats.issues.warnings > 5) {
    console.log(`${colors.yellow}⚠️  发现多个警告，建议先优化再启用编译器${colors.reset}\n`);
  } else {
    console.log(`${colors.green}✅ 未发现严重问题，可以安全启用 React Compiler${colors.reset}\n`);
  }
}

/**
 * 主函数
 */
function main() {
  console.log(`${colors.blue}🔍 开始扫描...${colors.reset}\n`);

  // 检查源目录是否存在
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`${colors.red}❌ 源目录不存在: ${SRC_DIR}${colors.reset}`);
    process.exit(1);
  }

  // 执行扫描
  scanDirectory(SRC_DIR);

  // 打印摘要
  printSummary();

  // 生成报告
  const reportFile = generateReport();
  console.log(`${colors.blue}📄 详细报告已生成: ${reportFile}${colors.reset}\n`);
}

// 执行主函数
main();
