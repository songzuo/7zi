#!/usr/bin/env node

/**
 * 依赖清理分析器
 * 扫描 src/ 目录，识别未使用的依赖和代码
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_DIR = '/root/.openclaw/workspace/7zi-project';
const SRC_DIR = path.join(PROJECT_DIR, 'src');

// 读取 package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(PROJECT_DIR, 'package.json'), 'utf8'));

console.log('📦 依赖清理分析器');
console.log('='.repeat(60));

// 收集所有源文件
function collectSourceFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      // 跳过 node_modules 和 __tests__ 目录
      if (item.name !== 'node_modules' && item.name !== '.next') {
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

      // 忽略相对路径导入和 node_modules 内部导入
      if (source.startsWith('.') || source.startsWith('/')) {
        continue;
      }

      // 提取包名（去掉可能的子路径）
      const packageName = source.split('/')[0].replace(/^@[^/]+\/[^/]+/, source.match(/^@[^/]+\/[^/]+/) ? source.match(/^@[^/]+\/[^/]+/)[0] : source.split('/')[0]);

      // 判断导入类型
      if (match[0].includes('type ')) {
        if (match[0].includes('{')) {
          // type { x, y }
          const namedImports = imported.split(',').map(s => s.trim().split(' as ')[0].trim());
          if (!imports.typeNamed.has(packageName)) {
            imports.typeNamed.set(packageName, new Set());
          }
          namedImports.forEach(imp => imports.typeNamed.get(packageName).add(imp));
        } else {
          // type x
          imports.typeDefault.add(packageName);
        }
      } else if (match[0].includes('* as')) {
        imports.namespace.set(packageName, imported);
      } else if (match[0].includes('{')) {
        // { x, y as z }
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

// 分析导出语句
function extractExports(content, filePath) {
  const exports = {
    default: null,
    named: new Set(),
    typeDefault: null,
    typeNamed: new Set()
  };

  // export default ...
  const defaultExportMatch = content.match(/export\s+default\s+(?:async\s+)?(?:function|class|const|let|var)?\s*(\w+)?/);
  if (defaultExportMatch) {
    exports.default = defaultExportMatch[1] || 'default';
  }

  // export { x, y } 或 export { x as y }
  const namedExportMatches = content.matchAll(/export\s+{([^}]+)}/g);
  for (const match of namedExportMatches) {
    const exported = match[1].split(',').map(s => s.trim().split(' as ')[0].trim());
    exported.forEach(e => exports.named.add(e));
  }

  // export function/class/const/let/var x
  const declarationMatches = content.matchAll(/export\s+(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)/g);
  for (const match of declarationMatches) {
    exports.named.add(match[1]);
  }

  // export type { x }
  const typeNamedMatches = content.matchAll(/export\s+type\s+{([^}]+)}/g);
  for (const match of typeNamedMatches) {
    const exported = match[1].split(',').map(s => s.trim());
    exported.forEach(e => exports.typeNamed.add(e));
  }

  // export type x = ...
  const typeDeclarationMatches = content.matchAll(/export\s+type\s+(\w+)\s*=/g);
  for (const match of typeDeclarationMatches) {
    exports.typeNamed.add(match[1]);
  }

  return exports;
}

// 分析使用情况
function analyzeUsage(content, exports) {
  const used = {
    default: false,
    named: new Set(),
    typeDefault: false,
    typeNamed: new Set()
  };

  if (exports.default) {
    // 检查是否使用了默认导出（通过变量名或直接引用）
    if (exports.default !== 'default') {
      const pattern = new RegExp(`\\b${exports.default}\\b`, 'g');
      if (pattern.test(content)) {
        used.default = true;
      }
    }
  }

  for (const named of exports.named) {
    const pattern = new RegExp(`\\b${named}\\b`, 'g');
    if (pattern.test(content)) {
      used.named.add(named);
    }
  }

  for (const typeNamed of exports.typeNamed) {
    const pattern = new RegExp(`\\b${typeNamed}\\b`, 'g');
    if (pattern.test(content)) {
      used.typeNamed.add(typeNamed);
    }
  }

  return used;
}

console.log('\n2️⃣ 分析导入和导出...');

const packageImports = {
  default: new Set(),
  named: new Map(),
  namespace: new Map(),
  typeDefault: new Set(),
  typeNamed: new Map()
};

const fileExports = new Map();
const fileContents = new Map();

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  fileContents.set(file, content);

  // 收集导入
  const imports = extractImports(content);
  imports.default.forEach(pkg => packageImports.default.add(pkg));
  imports.named.forEach((names, pkg) => {
    if (!packageImports.named.has(pkg)) {
      packageImports.named.set(pkg, new Set());
    }
    names.forEach(name => packageImports.named.get(pkg).add(name));
  });
  imports.namespace.forEach((alias, pkg) => packageImports.namespace.set(pkg, alias));
  imports.typeDefault.forEach(pkg => packageImports.typeDefault.add(pkg));
  imports.typeNamed.forEach((names, pkg) => {
    if (!packageImports.typeNamed.has(pkg)) {
      packageImports.typeNamed.set(pkg, new Set());
    }
    names.forEach(name => packageImports.typeNamed.get(pkg).add(name));
  });

  // 收集导出
  const exports = extractExports(content, file);
  fileExports.set(file, exports);
}

console.log(`   找到 ${packageImports.default.size} 个默认导入`);
console.log(`   找到 ${packageImports.named.size} 个命名导入的包`);
console.log(`   找到 ${packageImports.namespace.size} 个命名空间导入`);
console.log(`   找到 ${packageImports.typeDefault.size} 个类型默认导入`);
console.log(`   找到 ${packageImports.typeNamed.size} 个类型命名导入的包`);

console.log('\n3️⃣ 分析 package.json 依赖...');

const allDependencies = {
  ...packageJson.dependencies || {},
  ...packageJson.devDependencies || {}
};

const usedPackages = new Set();

// 从 package 名中提取包名
function getPackageNameFromImport(importName) {
  // 处理 @scope/package 格式
  const scopedMatch = importName.match(/^@[^/]+\/[^/]+/);
  if (scopedMatch) {
    return scopedMatch[0];
  }
  // 处理普通包名
  return importName.split('/')[0];
}

// 添加到已使用的包集合
packageImports.default.forEach(pkg => {
  usedPackages.add(getPackageNameFromImport(pkg));
});

packageImports.named.forEach((names, pkg) => {
  usedPackages.add(getPackageNameFromImport(pkg));
});

packageImports.namespace.forEach((alias, pkg) => {
  usedPackages.add(getPackageNameFromImport(pkg));
});

packageImports.typeDefault.forEach(pkg => {
  usedPackages.add(getPackageNameFromImport(pkg));
});

packageImports.typeNamed.forEach((names, pkg) => {
  usedPackages.add(getPackageNameFromImport(pkg));
});

console.log(`   使用了 ${usedPackages.size} 个包`);

// 找出未使用的依赖
const unusedDependencies = [];
const unusedDevDependencies = [];

for (const [name, version] of Object.entries(packageJson.dependencies || {})) {
  if (!usedPackages.has(name)) {
    unusedDependencies.push({ name, version });
  }
}

for (const [name, version] of Object.entries(packageJson.devDependencies || {})) {
  if (!usedPackages.has(name)) {
    unusedDevDependencies.push({ name, version });
  }
}

console.log(`   发现 ${unusedDependencies.length} 个未使用的生产依赖`);
console.log(`   发现 ${unusedDevDependencies.length} 个未使用的开发依赖`);

console.log('\n4️⃣ 分析未使用的导出...');

const unusedExports = [];

for (const [file, exports] of fileExports) {
  const unused = {
    file: path.relative(PROJECT_DIR, file),
    default: [],
    named: [],
    typeNamed: []
  };

  // 合并所有文件内容，检查导出是否在其他文件中被使用
  let allOtherContent = '';
  for (const [otherFile, content] of fileContents) {
    if (otherFile !== file) {
      allOtherContent += content + '\n';
    }
  }

  // 检查默认导出
  if (exports.default) {
    const pattern = new RegExp(`\\b${exports.default}\\b`, 'g');
    if (!pattern.test(allOtherContent)) {
      unused.default.push(exports.default);
    }
  }

  // 检查命名导出
  for (const named of exports.named) {
    const pattern = new RegExp(`\\b${named}\\b`, 'g');
    if (!pattern.test(allOtherContent)) {
      unused.named.push(named);
    }
  }

  // 检查类型导出
  for (const typeNamed of exports.typeNamed) {
    const pattern = new RegExp(`\\b${typeNamed}\\b`, 'g');
    if (!pattern.test(allOtherContent)) {
      unused.typeNamed.push(typeNamed);
    }
  }

  if (unused.default.length > 0 || unused.named.length > 0 || unused.typeNamed.length > 0) {
    unusedExports.push(unused);
  }
}

console.log(`   发现 ${unusedExports.length} 个文件包含未使用的导出`);

console.log('\n5️⃣ 分析未使用的导入...');

const unusedImports = [];

for (const file of sourceFiles) {
  const content = fileContents.get(file);
  const imports = extractImports(content);
  const unused = {
    file: path.relative(PROJECT_DIR, file),
    default: [],
    named: new Map(),
    namespace: [],
    typeDefault: [],
    typeNamed: new Map()
  };

  // 检查默认导入是否被使用
  for (const pkg of imports.default) {
    const packageName = getPackageNameFromImport(pkg);
    const importMatch = content.match(new RegExp(`import\\s+([a-zA-Z_$][\\w$]*)\\s+from\\s+['"]${pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`));
    if (importMatch) {
      const varName = importMatch[1];
      const pattern = new RegExp(`\\b${varName}\\b`, 'g');
      if (!pattern.test(content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''))) {
        unused.default.push({ pkg, varName });
      }
    }
  }

  // 检查命名导入是否被使用
  imports.named.forEach((names, pkg) => {
    const unusedNames = [];
    for (const name of names) {
      const pattern = new RegExp(`\\b${name}\\b`, 'g');
      const cleanContent = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      if (!pattern.test(cleanContent)) {
        unusedNames.push(name);
      }
    }
    if (unusedNames.length > 0) {
      unused.named.set(pkg, unusedNames);
    }
  });

  // 检查命名空间导入是否被使用
  imports.namespace.forEach((alias, pkg) => {
    const pattern = new RegExp(`\\b${alias}\\.`, 'g');
    if (!pattern.test(content)) {
      unused.namespace.push({ pkg, alias });
    }
  });

  if (unused.default.length > 0 || unused.named.size > 0 || unused.namespace.length > 0) {
    unusedImports.push(unused);
  }
}

console.log(`   发现 ${unusedImports.length} 个文件包含未使用的导入`);

console.log('\n6️⃣ 分析未使用的变量...');

const unusedVariables = [];

for (const file of sourceFiles) {
  const content = fileContents.get(file);
  const unused = {
    file: path.relative(PROJECT_DIR, file),
    variables: []
  };

  // 简单的变量使用检测（不包括函数参数和全局变量）
  const varPatterns = [
    /(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=/g,
    /function\s+([a-zA-Z_$][\w$]*)\s*\(/g
  ];

  const declaredVars = new Set();
  for (const pattern of varPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const varName = match[1];
      // 跳过一些常见的情况
      if (
        !['require', 'module', 'exports', 'console', 'process', 'global', 'window', 'document', 'navigator'].includes(varName) &&
        !varName.startsWith('_') &&
        !varName.toUpperCase() === varName
      ) {
        declaredVars.add(varName);
      }
    }
  }

  // 检查每个声明的变量是否被使用
  for (const varName of declaredVars) {
    const pattern = new RegExp(`\\b${varName}\\b`, 'g');
    const matches = content.match(pattern);
    if (matches && matches.length <= 1) {
      unused.variables.push(varName);
    }
  }

  if (unused.variables.length > 0) {
    unusedVariables.push(unused);
  }
}

console.log(`   发现 ${unusedVariables.length} 个文件可能包含未使用的变量`);

// 生成报告
console.log('\n' + '='.repeat(60));
console.log('📊 分析报告');
console.log('='.repeat(60));

const report = {
  timestamp: new Date().toISOString(),
  summary: {
    totalFiles: sourceFiles.length,
    totalDependencies: Object.keys(allDependencies).length,
    usedDependencies: usedPackages.size,
    unusedDependencies: unusedDependencies.length,
    unusedDevDependencies: unusedDevDependencies.length,
    filesWithUnusedExports: unusedExports.length,
    filesWithUnusedImports: unusedImports.length,
    filesWithUnusedVariables: unusedVariables.length
  },
  unusedDependencies,
  unusedDevDependencies,
  unusedExports,
  unusedImports,
  unusedVariables
};

console.log(`\n📈 摘要:`);
console.log(`   总文件数: ${report.summary.totalFiles}`);
console.log(`   总依赖数: ${report.summary.totalDependencies}`);
console.log(`   已使用依赖: ${report.summary.usedDependencies}`);
console.log(`   未使用生产依赖: ${report.summary.unusedDependencies}`);
console.log(`   未使用开发依赖: ${report.summary.unusedDevDependencies}`);
console.log(`   包含未使用导出的文件: ${report.summary.filesWithUnusedExports}`);
console.log(`   包含未使用导入的文件: ${report.summary.filesWithUnusedImports}`);
console.log(`   包含未使用变量的文件: ${report.summary.filesWithUnusedVariables}`);

if (unusedDependencies.length > 0) {
  console.log(`\n🗑️  未使用的生产依赖:`);
  unusedDependencies.forEach(({ name, version }) => {
    console.log(`   - ${name}@${version}`);
  });
}

if (unusedDevDependencies.length > 0) {
  console.log(`\n🗑️  未使用的开发依赖:`);
  unusedDevDependencies.forEach(({ name, version }) => {
    console.log(`   - ${name}@${version}`);
  });
}

if (unusedExports.length > 0) {
  console.log(`\n📤 未使用的导出 (前10个文件):`);
  unusedExports.slice(0, 10).forEach(({ file, default: dflt, named, typeNamed }) => {
    console.log(`   ${file}`);
    if (dflt.length > 0) console.log(`     - 默认: ${dflt.join(', ')}`);
    if (named.length > 0) console.log(`     - 命名: ${named.slice(0, 5).join(', ')}${named.length > 5 ? '...' : ''}`);
    if (typeNamed.length > 0) console.log(`     - 类型: ${typeNamed.slice(0, 5).join(', ')}${typeNamed.length > 5 ? '...' : ''}`);
  });
}

if (unusedImports.length > 0) {
  console.log(`\n📥 未使用的导入 (前10个文件):`);
  unusedImports.slice(0, 10).forEach(({ file, default: dflt, named, namespace }) => {
    console.log(`   ${file}`);
    if (dflt.length > 0) dflt.forEach(({ pkg, varName }) => console.log(`     - import ${varName} from '${pkg}'`));
    named.forEach((names, pkg) => {
      console.log(`     - import { ${names.join(', ')} } from '${pkg}'`);
    });
    if (namespace.length > 0) namespace.forEach(({ pkg, alias }) => console.log(`     - import * as ${alias} from '${pkg}'`));
  });
}

// 保存完整报告
const reportPath = path.join(PROJECT_DIR, 'dependency-cleanup-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n💾 完整报告已保存到: ${reportPath}`);

// 生成可读的 Markdown 报告
const markdownReport = generateMarkdownReport(report);
const markdownReportPath = path.join(PROJECT_DIR, 'dependency-cleanup-report.md');
fs.writeFileSync(markdownReportPath, markdownReport);
console.log(`📄 Markdown 报告已保存到: ${markdownReportPath}`);

function generateMarkdownReport(report) {
  let md = '# 依赖清理报告\n\n';
  md += `生成时间: ${new Date(report.timestamp).toLocaleString('zh-CN')}\n\n`;

  md += '## 📊 摘要\n\n';
  md += `| 指标 | 数量 |\n`;
  md += `|------|------|\n`;
  md += `| 总文件数 | ${report.summary.totalFiles} |\n`;
  md += `| 总依赖数 | ${report.summary.totalDependencies} |\n`;
  md += `| 已使用依赖 | ${report.summary.usedDependencies} |\n`;
  md += `| 未使用生产依赖 | ${report.summary.unusedDependencies} |\n`;
  md += `| 未使用开发依赖 | ${report.summary.unusedDevDependencies} |\n`;
  md += `| 包含未使用导出的文件 | ${report.summary.filesWithUnusedExports} |\n`;
  md += `| 包含未使用导入的文件 | ${report.summary.filesWithUnusedImports} |\n`;
  md += `| 包含未使用变量的文件 | ${report.summary.filesWithUnusedVariables} |\n`;

  if (report.unusedDependencies.length > 0) {
    md += '\n## 🗑️ 未使用的生产依赖\n\n';
    md += '| 包名 | 版本 |\n';
    md += '|------|------|\n';
    report.unusedDependencies.forEach(({ name, version }) => {
      md += `| ${name} | ${version} |\n`;
    });
    md += '\n### 清理命令\n\n';
    md += '```bash\n';
    md += report.unusedDependencies.map(({ name }) => `npm uninstall ${name}`).join('\n');
    md += '\n```\n';
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
  }

  if (report.unusedExports.length > 0) {
    md += '\n## 📤 未使用的导出\n\n';
    report.unusedExports.slice(0, 20).forEach(({ file, default: dflt, named, typeNamed }) => {
      md += `### ${file}\n\n`;
      if (dflt.length > 0) md += `- 默认导出: \`${dflt.join('`, `')}\`\n`;
      if (named.length > 0) md += `- 命名导出: \`${named.slice(0, 10).join('`, `')}\`${named.length > 10 ? '...' : ''}\n`;
      if (typeNamed.length > 0) md += `- 类型导出: \`${typeNamed.slice(0, 10).join('`, `')}\`${typeNamed.length > 10 ? '...' : ''}\n`;
      md += '\n';
    });
    if (report.unusedExports.length > 20) {
      md += `*... 还有 ${report.unusedExports.length - 20} 个文件 *\n\n`;
    }
  }

  if (report.unusedImports.length > 0) {
    md += '\n## 📥 未使用的导入\n\n';
    report.unusedImports.slice(0, 20).forEach(({ file, default: dflt, named, namespace }) => {
      md += `### ${file}\n\n`;
      dflt.forEach(({ pkg, varName }) => {
        md += `- \`import ${varName} from '${pkg}'\`\n`;
      });
      named.forEach((names, pkg) => {
        md += `- \`import { ${names.slice(0, 5).join(', ')}${names.length > 5 ? '...' : ''} } from '${pkg}'\`\n`;
      });
      namespace.forEach(({ pkg, alias }) => {
        md += `- \`import * as ${alias} from '${pkg}'\`\n`;
      });
      md += '\n';
    });
    if (report.unusedImports.length > 20) {
      md += `*... 还有 ${report.unusedImports.length - 20} 个文件 *\n\n`;
    }
  }

  md += '\n## ⚠️ 注意事项\n\n';
  md += '1. 此报告基于静态分析，可能存在误报\n';
  md += '2. 某些依赖可能仅在运行时或构建时使用\n';
  md += '3. 类型导入 (import type) 被编译后会移除，不影响运行时\n';
  md += '4. 建议在清理前运行完整测试套件\n';
  md += '5. 清理后请验证应用功能正常\n\n';

  md += '## 🔧 建议步骤\n\n';
  md += '1. 仔细审查此报告\n';
  md += '2. 运行测试: `npm test`\n';
  md += '3. 清理未使用的依赖\n';
  md += '4. 手动清理未使用的导入/导出\n';
  md += '5. 再次运行测试确保一切正常\n';
  md += '6. 提交更改\n\n';

  return md;
}

console.log('\n✅ 分析完成!');
