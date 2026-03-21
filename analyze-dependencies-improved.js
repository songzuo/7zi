#!/usr/bin/env node

/**
 * 改进的依赖清理分析器
 * 扫描 src/ 目录，识别未使用的依赖和代码
 * 改进：支持动态 import 检测，React 自动依赖检测
 */

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = '/root/.openclaw/workspace/7zi-project';
const SRC_DIR = path.join(PROJECT_DIR, 'src');

// 读取 package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(PROJECT_DIR, 'package.json'), 'utf8'));

console.log('📦 改进的依赖清理分析器');
console.log('='.repeat(60));

// 永远不应该删除的核心依赖
const CORE_DEPENDENCIES = [
  'react',
  'react-dom',
  'next',
  'typescript',
  '@types/react',
  '@types/react-dom',
  '@types/node'
];

// 动态 import 的包
function extractDynamicImports(content) {
  const imports = new Set();

  // 匹配 await import('...') 或 import('...')
  const patterns = [
    /await\s+import\(['"`]([^'"`]+)['"`]\)/g,
    /import\(['"`]([^'"`]+)['"`]\)/g,
    /require\(['"`]([^'"`]+)['"`]\)/g
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const packageName = match[1].split('/')[0].replace(/^@[^/]+\/[^/]+/, match[1].match(/^@[^/]+\/[^/]+/) ? match[1].match(/^@[^/]+\/[^/]+/)[0] : match[1].split('/')[0]);
      if (!packageName.startsWith('.') && !packageName.startsWith('/')) {
        imports.add(packageName);
      }
    }
  }

  return imports;
}

// 收集所有源文件
function collectSourceFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      // 跳过 node_modules 和 .next
      if (item.name !== 'node_modules' && item.name !== '.next' && item.name !== '.git') {
        files.push(...collectSourceFiles(fullPath));
      }
    } else if (item.isFile() && /\.(ts|tsx|js|jsx)$/.test(item.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

console.log('\n1️⃣ 收集源文件...');
const sourceFiles = collectSourceFiles(SRC_DIR);
console.log(`   找到 ${sourceFiles.length} 个源文件`);

// 分析 import 语句
function extractImports(content) {
  const imports = {
    default: new Set(),
    named: new Map(),
    namespace: new Map(),
    typeDefault: new Set(),
    typeNamed: new Map()
  };

  // 匹配 import 语句的正则表达式
  const patterns = [
    // import x from 'package'
    /import\s+([a-zA-Z_$][\w$]*)\s+from\s+['"]([^'"]+)['"]/g,
    // import { x, y as z } from 'package'
    /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g,
    // import * as x from 'package'
    /import\s+\*\s+as\s+([a-zA-Z_$][\w$]*)\s+from\s+['"]([^'"]+)['"]/g,
    // import type { x } from 'package'
    /import\s+type\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g,
    // import type x from 'package'
    /import\s+type\s+([a-zA-Z_$][\w$]*)\s+from\s+['"]([^'"]+)['"]/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const imported = match[1];
      const source = match[2];

      // 忽略相对路径导入
      if (source.startsWith('.') || source.startsWith('/')) {
        continue;
      }

      // 提取包名
      const packageName = extractPackageName(source);

      // 判断导入类型
      if (match[0].includes('type ')) {
        if (match[0].includes('{')) {
          const namedImports = imported.split(',').map(s => s.trim().split(' as ')[0].trim());
          if (!imports.typeNamed.has(packageName)) {
            imports.typeNamed.set(packageName, new Set());
          }
          namedImports.forEach(imp => imports.typeNamed.get(packageName).add(imp));
        } else {
          imports.typeDefault.add(packageName);
        }
      } else if (match[0].includes('* as')) {
        imports.namespace.set(packageName, imported);
      } else if (match[0].includes('{')) {
        const namedImports = imported.split(',').map(s => s.trim().split(' as ')[0].trim());
        if (!imports.named.has(packageName)) {
          imports.named.set(packageName, new Set());
        }
        namedImports.forEach(imp => imports.named.get(packageName).add(imp));
      } else {
        imports.default.add(packageName);
      }
    }
  }

  return imports;
}

// 从导入路径中提取包名
function extractPackageName(importPath) {
  // 处理 @scope/package 格式
  const scopedMatch = importPath.match(/^@[^/]+\/[^/]+/);
  if (scopedMatch) {
    return scopedMatch[0];
  }
  // 处理普通包名
  return importPath.split('/')[0];
}

console.log('\n2️⃣ 分析导入（静态和动态）...');

const packageImports = {
  default: new Set(),
  named: new Map(),
  namespace: new Map(),
  typeDefault: new Set(),
  typeNamed: new Map(),
  dynamic: new Set()
};

const fileContents = new Map();

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  fileContents.set(file, content);

  // 收集静态导入
  const imports = extractImports(content);
  imports.default.forEach(pkg => packageImports.default.add(extractPackageName(pkg)));
  imports.named.forEach((names, pkg) => packageImports.named.set(extractPackageName(pkg), names));
  imports.namespace.forEach((alias, pkg) => packageImports.namespace.set(extractPackageName(pkg), alias));
  imports.typeDefault.forEach(pkg => packageImports.typeDefault.add(extractPackageName(pkg)));
  imports.typeNamed.forEach((names, pkg) => packageImports.typeNamed.set(extractPackageName(pkg), names));

  // 收集动态导入
  const dynamicImports = extractDynamicImports(content);
  dynamicImports.forEach(pkg => packageImports.dynamic.add(pkg));
}

console.log(`   静态导入: ${packageImports.default.size} 默认, ${packageImports.named.size} 命名包, ${packageImports.namespace.size} 命名空间`);
console.log(`   类型导入: ${packageImports.typeDefault.size} 默认, ${packageImports.typeNamed.size} 命名包`);
console.log(`   动态导入: ${packageImports.dynamic.size} 个包`);

// 收集所有使用的包
const usedPackages = new Set();

packageImports.default.forEach(pkg => usedPackages.add(pkg));
packageImports.named.forEach((_, pkg) => usedPackages.add(pkg));
packageImports.namespace.forEach((_, pkg) => usedPackages.add(pkg));
packageImports.typeDefault.forEach(pkg => usedPackages.add(pkg));
packageImports.typeNamed.forEach((_, pkg) => usedPackages.add(pkg));
packageImports.dynamic.forEach(pkg => usedPackages.add(pkg));

console.log(`   总共使用了 ${usedPackages.size} 个不同的包`);

console.log('\n3️⃣ 分析 package.json 依赖...');

const allDependencies = {
  ...packageJson.dependencies || {},
  ...packageJson.devDependencies || {}
};

console.log(`   总依赖数: ${Object.keys(allDependencies).length}`);

// 找出未使用的依赖
const unusedDependencies = [];
const unusedDevDependencies = [];
const safelyRemovable = [];
const cautionRemovable = [];

for (const [name, version] of Object.entries(packageJson.dependencies || {})) {
  if (!usedPackages.has(name)) {
    // 检查是否是核心依赖
    if (CORE_DEPENDENCIES.includes(name)) {
      safelyRemovable.push({ name, version, reason: '核心依赖（不应删除）' });
    } else {
      unusedDependencies.push({ name, version });
    }
  }
}

for (const [name, version] of Object.entries(packageJson.devDependencies || {})) {
  if (!usedPackages.has(name)) {
    // 检查是否是核心依赖
    if (CORE_DEPENDENCIES.includes(name)) {
      safelyRemovable.push({ name, version, reason: '核心依赖（不应删除）' });
    } else {
      // 检查是否是配置相关的依赖
      if (name.startsWith('eslint') || name.startsWith('@types/') || name.includes('tailwind') || name.includes('vitest') || name.includes('vite')) {
        cautionRemovable.push({ name, version, reason: '配置相关' });
      } else {
        unusedDevDependencies.push({ name, version });
      }
    }
  }
}

console.log(`   未使用的生产依赖: ${unusedDependencies.length}`);
console.log(`   未使用的开发依赖: ${unusedDevDependencies.length}`);
console.log(`   需要谨慎删除的依赖: ${cautionRemovable.length}`);

console.log('\n4️⃣ 检查配置文件中的依赖引用...');

// 检查配置文件是否使用了某些包
const configFiles = [
  'next.config.ts',
  'tailwind.config.ts',
  'vitest.config.ts',
  'playwright.config.ts',
  'tsconfig.json',
  'eslint.config.mjs'
];

const configUsedPackages = new Set();

for (const configFile of configFiles) {
  const configPath = path.join(PROJECT_DIR, configFile);
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf8');

    // 检查某些包是否在配置中被引用
    if (content.includes('tailwind') || content.includes('@tailwindcss')) {
      configUsedPackages.add('tailwindcss');
      configUsedPackages.add('@tailwindcss/postcss');
    }
    if (content.includes('vitest') || content.includes('@vitest')) {
      configUsedPackages.add('vitest');
      configUsedPackages.add('@vitest/coverage-v8');
    }
    if (content.includes('eslint')) {
      configUsedPackages.add('eslint');
      configUsedPackages.add('eslint-config-next');
    }
    if (content.includes('typescript') || content.includes('tsconfig')) {
      configUsedPackages.add('typescript');
    }
    if (content.includes('playwright')) {
      configUsedPackages.add('playwright');
      configUsedPackages.add('@playwright/test');
    }
    if (content.includes('analyze') || content.includes('bundle-analyzer')) {
      configUsedPackages.add('@next/bundle-analyzer');
    }
  }
}

console.log(`   配置文件中使用的包: ${configUsedPackages.size}`);

// 从需要谨慎删除的列表中移除在配置文件中使用的包
const filteredCautionRemovable = cautionRemovable.filter(dep => !configUsedPackages.has(dep.name));
console.log(`   过滤后需要谨慎删除的依赖: ${filteredCautionRemovable.length}`);

console.log('\n5️⃣ 检查 package.json scripts 中的依赖引用...');

const scripts = packageJson.scripts || {};
const scriptUsedPackages = new Set();

for (const [scriptName, scriptCommand] of Object.entries(scripts)) {
  if (scriptCommand.includes('eslint')) {
    scriptUsedPackages.add('eslint');
    scriptUsedPackages.add('eslint-config-next');
  }
  if (scriptCommand.includes('playwright')) {
    scriptUsedPackages.add('playwright');
    scriptUsedPackages.add('@playwright/test');
  }
  if (scriptCommand.includes('vitest')) {
    scriptUsedPackages.add('vitest');
    scriptUsedPackages.add('@vitest/coverage-v8');
  }
  if (scriptCommand.includes('tsc') || scriptCommand.includes('type-check')) {
    scriptUsedPackages.add('typescript');
  }
}

console.log(`   脚本中使用的包: ${scriptUsedPackages.size}`);

// 再次过滤
const finalUnusedDevDependencies = [];
const finalCautionRemovable = [];

for (const dep of unusedDevDependencies) {
  if (scriptUsedPackages.has(dep.name) || configUsedPackages.has(dep.name)) {
    // 这个包在脚本或配置中使用
    continue;
  }
  finalUnusedDevDependencies.push(dep);
}

for (const dep of filteredCautionRemovable) {
  if (scriptUsedPackages.has(dep.name) || configUsedPackages.has(dep.name)) {
    // 这个包在脚本或配置中使用
    continue;
  }
  finalCautionRemovable.push(dep);
}

console.log(`   最终未使用的开发依赖: ${finalUnusedDevDependencies.length}`);
console.log(`   最终需要谨慎删除的依赖: ${finalCautionRemovable.length}`);

// 生成报告
console.log('\n' + '='.repeat(60));
console.log('📊 依赖清理分析报告');
console.log('='.repeat(60));

const report = {
  timestamp: new Date().toISOString(),
  summary: {
    totalFiles: sourceFiles.length,
    totalDependencies: Object.keys(allDependencies).length,
    usedDependencies: usedPackages.size,
    unusedProductionDependencies: unusedDependencies.length,
    unusedDevDependencies: finalUnusedDevDependencies.length,
    cautionRemovableDependencies: finalCautionRemovable.length
  },
  unusedProductionDependencies: unusedDependencies,
  unusedDevDependencies: finalUnusedDevDependencies,
  cautionRemovableDependencies: finalCautionRemovable,
  configUsedPackages: Array.from(configUsedPackages),
  scriptUsedPackages: Array.from(scriptUsedPackages),
  dynamicImports: Array.from(packageImports.dynamic)
};

console.log(`\n📈 摘要:`);
console.log(`   总文件数: ${report.summary.totalFiles}`);
console.log(`   总依赖数: ${report.summary.totalDependencies}`);
console.log(`   已使用依赖: ${report.summary.usedDependencies}`);
console.log(`   未使用生产依赖: ${report.summary.unusedProductionDependencies}`);
console.log(`   未使用开发依赖: ${report.summary.unusedDevDependencies}`);
console.log(`   需谨慎删除的依赖: ${report.summary.cautionRemovableDependencies}`);

if (report.dynamicImports.length > 0) {
  console.log(`\n🔄 动态导入的包:`);
  report.dynamicImports.slice(0, 10).forEach(pkg => console.log(`   - ${pkg}`));
  if (report.dynamicImports.length > 10) {
    console.log(`   ... 还有 ${report.dynamicImports.length - 10} 个`);
  }
}

if (unusedDependencies.length > 0) {
  console.log(`\n🗑️  未使用的生产依赖:`);
  unusedDependencies.forEach(({ name, version }) => {
    console.log(`   - ${name}@${version}`);
  });
}

if (finalUnusedDevDependencies.length > 0) {
  console.log(`\n🗑️  未使用的开发依赖:`);
  finalUnusedDevDependencies.forEach(({ name, version }) => {
    console.log(`   - ${name}@${version}`);
  });
}

if (finalCautionRemovable.length > 0) {
  console.log(`\n⚠️  可能可以删除但需要谨慎的依赖:`);
  finalCautionRemovable.forEach(({ name, version, reason }) => {
    console.log(`   - ${name}@${version} (${reason})`);
  });
}

// 保存完整报告
const reportPath = path.join(PROJECT_DIR, 'dependency-cleanup-improved-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n💾 完整报告已保存到: ${reportPath}`);

// 生成可读的 Markdown 报告
const markdownReport = generateMarkdownReport(report);
const markdownReportPath = path.join(PROJECT_DIR, 'dependency-cleanup-improved-report.md');
fs.writeFileSync(markdownReportPath, markdownReport);
console.log(`📄 Markdown 报告已保存到: ${markdownReportPath}`);

function generateMarkdownReport(report) {
  let md = '# 依赖清理报告（改进版）\n\n';
  md += `生成时间: ${new Date(report.timestamp).toLocaleString('zh-CN')}\n\n`;

  md += '## 📊 摘要\n\n';
  md += `| 指标 | 数量 |\n`;
  md += `|------|------|\n`;
  md += `| 总文件数 | ${report.summary.totalFiles} |\n`;
  md += `| 总依赖数 | ${report.summary.totalDependencies} |\n`;
  md += `| 已使用依赖 | ${report.summary.usedDependencies} |\n`;
  md += `| 未使用生产依赖 | ${report.summary.unusedProductionDependencies} |\n`;
  md += `| 未使用开发依赖 | ${report.summary.unusedDevDependencies} |\n`;
  md += `| 需谨慎删除的依赖 | ${report.summary.cautionRemovableDependencies} |\n`;

  if (report.dynamicImports.length > 0) {
    md += '\n## 🔄 动态导入的包\n\n';
    md += '这些包通过动态 import 使用，静态分析可能会漏掉：\n\n';
    report.dynamicImports.forEach(pkg => {
      md += `- ${pkg}\n`;
    });
  }

  if (report.configUsedPackages.length > 0) {
    md += '\n## ⚙️ 配置文件中使用的包\n\n';
    md += '这些包在配置文件中被引用：\n\n';
    report.configUsedPackages.forEach(pkg => {
      md += `- ${pkg}\n`;
    });
  }

  if (report.scriptUsedPackages.length > 0) {
    md += '\n## 📜 脚本中使用的包\n\n';
    md += '这些包在 package.json 的 scripts 中被引用：\n\n';
    report.scriptUsedPackages.forEach(pkg => {
      md += `- ${pkg}\n`;
    });
  }

  if (report.unusedProductionDependencies.length > 0) {
    md += '\n## 🗑️ 未使用的生产依赖\n\n';
    md += '| 包名 | 版本 |\n';
    md += '|------|------|\n';
    report.unusedProductionDependencies.forEach(({ name, version }) => {
      md += `| ${name} | ${version} |\n`;
    });
    md += '\n### 清理命令\n\n';
    md += '```bash\n';
    md += report.unusedProductionDependencies.map(({ name }) => `npm uninstall ${name}`).join('\n');
    md += '\n```\n';
  } else {
    md += '\n## ✅ 没有发现未使用的生产依赖\n\n';
  }

  if (report.unusedDevDependencies.length > 0) {
    md += '\n## 🗑️ 未使用的开发依赖\n\n';
    md += '| 包名 | 版本 |\n';
    md += '|------|------|\n';
    report.unusedDevDependencies.forEach(({ name, version }) => {
      md += `| ${name} | ${version} |\n`;
    });
    md += '\n### 清理命令\n\n';
    md += '```bash\n';
    md += report.unusedDevDependencies.map(({ name }) => `npm uninstall -D ${name}`).join('\n');
    md += '\n```\n';
  } else {
    md += '\n## ✅ 没有发现未使用的开发依赖\n\n';
  }

  if (report.cautionRemovableDependencies.length > 0) {
    md += '\n## ⚠️ 可能可以删除但需要谨慎的依赖\n\n';
    md += '| 包名 | 版本 | 原因 |\n';
    md += '|------|------|------|\n';
    report.cautionRemovableDependencies.forEach(({ name, version, reason }) => {
      md += `| ${name} | ${version} | ${reason} |\n`;
    });
    md += '\n这些依赖与配置、构建或测试相关，删除前请确保：\n';
    md += '1. 不再需要相应的功能（如 Tailwind CSS、ESLint 等）\n';
    md += '2. 已迁移到替代方案\n';
    md += '3. 相关配置文件已更新\n\n';
  }

  md += '\n## 🔒 核心依赖（不应删除）\n\n';
  md += '以下依赖是项目核心必需的，不应删除：\n\n';
  CORE_DEPENDENCIES.forEach(dep => {
    md += `- ${dep}\n`;
  });

  md += '\n## ⚠️ 注意事项\n\n';
  md += '1. 此报告基于静态分析，可能存在误报\n';
  md += '2. 某些依赖可能仅在运行时或构建时使用\n';
  md += '3. 类型导入 (import type) 被编译后会移除，不影响运行时\n';
  md += '4. 某些包可能在环境变量或配置中引用\n';
  md += '5. 建议在清理前运行完整测试套件\n';
  md += '6. 清理后请验证应用功能正常\n\n';

  md += '## 🔧 建议步骤\n\n';
  md += '1. 仔细审查此报告\n';
  md += '2. 运行测试: `npm test`\n';
  md += '3. 清理未使用的生产依赖\n';
  md += '4. 评估并清理未使用的开发依赖\n';
  md += '5. 再次运行测试确保一切正常\n';
  md += '6. 提交更改\n\n';

  return md;
}

console.log('\n✅ 分析完成!');
