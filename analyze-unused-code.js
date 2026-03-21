#!/usr/bin/env node

/**
 * 未使用代码清理分析器
 * 专注于识别未使用的导入和导出
 * 识别 Next.js 特殊路由文件
 */

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = '/root/.openclaw/workspace/7zi-project';
const SRC_DIR = path.join(PROJECT_DIR, 'src');

console.log('🔍 未使用代码分析器');
console.log('='.repeat(60));

// 收集所有源文件
function collectSourceFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
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

// 判断是否是 Next.js 路由文件
function isNextJsRouteFile(filePath) {
  const relativePath = path.relative(SRC_DIR, filePath);
  // 匹配 app/ 下的 page.tsx, layout.tsx, loading.tsx, error.tsx, not-found.tsx 等
  return relativePath.startsWith('app/') &&
         (filePath.includes('page.tsx') ||
          filePath.includes('page.ts') ||
          filePath.includes('layout.tsx') ||
          filePath.includes('layout.ts') ||
          filePath.includes('loading.tsx') ||
          filePath.includes('error.tsx') ||
          filePath.includes('not-found.tsx') ||
          filePath.includes('global-error.tsx'));
}

// 判断是否是测试文件
function isTestFile(filePath) {
  return filePath.includes('.test.') ||
         filePath.includes('.spec.') ||
         filePath.includes('/__tests__/');
}

// 判断是否是组件文件
function isComponentFile(filePath) {
  const relativePath = path.relative(SRC_DIR, filePath);
  return relativePath.startsWith('components/');
}

// 提取导入
function extractImports(content) {
  const imports = {
    default: [],
    named: new Map(),
    namespace: [],
    typeDefault: [],
    typeNamed: new Map()
  };

  // import x from '...'
  const defaultPattern = /import\s+([a-zA-Z_$][\w$]*)\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = defaultPattern.exec(content)) !== null) {
    imports.default.push({
      varName: match[1],
      source: match[2]
    });
  }

  // import { x, y as z } from '...'
  const namedPattern = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = namedPattern.exec(content)) !== null) {
    const importedNames = match[1].split(',').map(s => s.trim().split(' as ')[0].trim());
    const source = match[2];
    if (!imports.named.has(source)) {
      imports.named.set(source, []);
    }
    imports.named.get(source).push(...importedNames);
  }

  // import * as x from '...'
  const namespacePattern = /import\s+\*\s+as\s+([a-zA-Z_$][\w$]*)\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = namespacePattern.exec(content)) !== null) {
    imports.namespace.push({
      varName: match[1],
      source: match[2]
    });
  }

  // import type { x } from '...'
  const typeNamedPattern = /import\s+type\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = typeNamedPattern.exec(content)) !== null) {
    const importedNames = match[1].split(',').map(s => s.trim());
    const source = match[2];
    if (!imports.typeNamed.has(source)) {
      imports.typeNamed.set(source, []);
    }
    imports.typeNamed.get(source).push(...importedNames);
  }

  return imports;
}

// 提取导出
function extractExports(content) {
  const exports = {
    default: null,
    named: [],
    typeNamed: []
  };

  // export default ...
  const defaultExportMatch = content.match(/export\s+default\s+(?:async\s+)?(?:function|class|const|let|var)?\s*(\w+)?/);
  if (defaultExportMatch) {
    exports.default = defaultExportMatch[1] || 'default';
  }

  // export { x, y }
  const namedExportMatches = content.matchAll(/export\s+{([^}]+)}/g);
  for (const match of namedExportMatches) {
    const exported = match[1].split(',').map(s => s.trim().split(' as ')[0].trim());
    exports.named.push(...exported);
  }

  // export function/class/const x
  const declarationMatches = content.matchAll(/export\s+(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)/g);
  for (const match of declarationMatches) {
    exports.named.push(match[1]);
  }

  // export type { x }
  const typeNamedMatches = content.matchAll(/export\s+type\s+{([^}]+)}/g);
  for (const match of typeNamedMatches) {
    const exported = match[1].split(',').map(s => s.trim());
    exports.typeNamed.push(...exported);
  }

  return exports;
}

// 检查标识符是否在代码中被使用（排除注释和字符串）
function isIdentifierUsed(content, identifier) {
  // 移除注释
  const contentWithoutComments = content
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/`[^`]*`/g, '') // 移除模板字符串
    .replace(/'[^']*'/g, '') // 移除单引号字符串
    .replace(/"[^"]*"/g, ''); // 移除双引号字符串

  // 检查标识符是否被使用
  const pattern = new RegExp(`\\b${identifier}\\b`, 'g');
  const matches = contentWithoutComments.match(pattern);

  // 如果标识符只出现一次（在声明中），则认为未被使用
  return matches && matches.length > 1;
}

console.log('\n2️⃣ 分析未使用的导入...');

const unusedImportsByFile = [];

for (const file of sourceFiles) {
  if (isTestFile(file)) {
    continue; // 跳过测试文件
  }

  const content = fs.readFileSync(file, 'utf8');
  const imports = extractImports(content);

  const unusedInFile = {
    file: path.relative(PROJECT_DIR, file),
    default: [],
    named: [],
    namespace: [],
    typeNamed: []
  };

  // 检查默认导入
  for (const { varName, source } of imports.default) {
    // 跳过相对路径的导入
    if (source.startsWith('.') || source.startsWith('/')) {
      continue;
    }
    if (!isIdentifierUsed(content, varName)) {
      unusedInFile.default.push({ varName, source });
    }
  }

  // 检查命名导入
  for (const [source, names] of imports.named) {
    // 跳过相对路径的导入
    if (source.startsWith('.') || source.startsWith('/')) {
      continue;
    }
    const unusedNames = names.filter(name => !isIdentifierUsed(content, name));
    if (unusedNames.length > 0) {
      unusedInFile.named.push({ source, names: unusedNames });
    }
  }

  // 检查命名空间导入
  for (const { varName, source } of imports.namespace) {
    // 跳过相对路径的导入
    if (source.startsWith('.') || source.startsWith('/')) {
      continue;
    }
    // 检查命名空间是否被使用
    const pattern = new RegExp(`\\b${varName}\\.`, 'g');
    if (!pattern.test(content)) {
      unusedInFile.namespace.push({ varName, source });
    }
  }

  // 检查类型导入
  for (const [source, names] of imports.typeNamed) {
    // 跳过相对路径的导入
    if (source.startsWith('.') || source.startsWith('/')) {
      continue;
    }
    // 类型导入的检查比较宽松，因为可能在运行时不使用
    // 这里只检查明显的未使用情况
  }

  if (unusedInFile.default.length > 0 || unusedInFile.named.length > 0 || unusedInFile.namespace.length > 0) {
    unusedImportsByFile.push(unusedInFile);
  }
}

console.log(`   发现 ${unusedImportsByFile.length} 个文件包含未使用的导入`);

console.log('\n3️⃣ 分析未使用的导出...');

const unusedExportsByFile = [];

// 收集所有文件的内容，用于交叉检查
const allOtherContent = new Map();
for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  allOtherContent.set(file, content);
}

for (const file of sourceFiles) {
  if (isNextJsRouteFile(file) || isTestFile(file)) {
    continue; // 跳过 Next.js 路由文件和测试文件
  }

  const content = fs.readFileSync(file, 'utf8');
  const exports = extractExports(content);

  const unusedInFile = {
    file: path.relative(PROJECT_DIR, file),
    default: null,
    named: [],
    typeNamed: []
  };

  // 合并所有其他文件的内容，用于检查导出是否被引用
  let combinedOtherContent = '';
  for (const [otherFile, otherContent] of allOtherContent) {
    if (otherFile !== file && !isTestFile(otherFile)) {
      combinedOtherContent += otherContent + '\n';
    }
  }

  // 检查默认导出
  if (exports.default && exports.default !== 'default') {
    if (!isIdentifierUsed(combinedOtherContent, exports.default)) {
      unusedInFile.default = exports.default;
    }
  }

  // 检查命名导出
  for (const namedExport of exports.named) {
    if (!isIdentifierUsed(combinedOtherContent, namedExport)) {
      unusedInFile.named.push(namedExport);
    }
  }

  // 检查类型导出
  for (const typeExport of exports.typeNamed) {
    if (!isIdentifierUsed(combinedOtherContent, typeExport)) {
      unusedInFile.typeNamed.push(typeExport);
    }
  }

  if (unusedInFile.default || unusedInFile.named.length > 0 || unusedInFile.typeNamed.length > 0) {
    unusedExportsByFile.push(unusedInFile);
  }
}

console.log(`   发现 ${unusedExportsByFile.length} 个非路由文件包含未使用的导出`);

console.log('\n4️⃣ 分析潜在的死代码...');

const deadCodeByFile = [];

for (const file of sourceFiles) {
  if (isTestFile(file) || isNextJsRouteFile(file)) {
    continue;
  }

  const content = fs.readFileSync(file, 'utf8');
  const deadCodeInFile = {
    file: path.relative(PROJECT_DIR, file),
    functions: [],
    constants: [],
    variables: []
  };

  // 检查未使用的函数
  const functionPattern = /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>))/g;
  let match;
  const declaredFunctions = new Set();
  while ((match = functionPattern.exec(content)) !== null) {
    const funcName = match[1] || match[2];
    if (funcName && !funcName.startsWith('_') && !['constructor', 'render', 'componentDidMount', 'componentDidUpdate', 'componentWillUnmount'].includes(funcName)) {
      declaredFunctions.add(funcName);
    }
  }

  for (const funcName of declaredFunctions) {
    if (!isIdentifierUsed(content, funcName)) {
      deadCodeInFile.functions.push(funcName);
    }
  }

  // 检查未使用的常量
  const constPattern = /(?:const|let|var)\s+([A-Z_][A-Z0-9_]*)\s*=/g;
  while ((match = constPattern.exec(content)) !== null) {
    const constName = match[1];
    if (!isIdentifierUsed(content, constName)) {
      deadCodeInFile.constants.push(constName);
    }
  }

  if (deadCodeInFile.functions.length > 0 || deadCodeInFile.constants.length > 0) {
    deadCodeByFile.push(deadCodeInFile);
  }
}

console.log(`   发现 ${deadCodeByFile.length} 个文件可能包含死代码`);

// 生成报告
console.log('\n' + '='.repeat(60));
console.log('📊 未使用代码分析报告');
console.log('='.repeat(60));

const report = {
  timestamp: new Date().toISOString(),
  summary: {
    totalFiles: sourceFiles.length,
    filesWithUnusedImports: unusedImportsByFile.length,
    filesWithUnusedExports: unusedExportsByFile.length,
    filesWithDeadCode: deadCodeByFile.length
  },
  unusedImports: unusedImportsByFile,
  unusedExports: unusedExportsByFile,
  deadCode: deadCodeByFile
};

console.log(`\n📈 摘要:`);
console.log(`   总文件数: ${report.summary.totalFiles}`);
console.log(`   包含未使用导入的文件: ${report.summary.filesWithUnusedImports}`);
console.log(`   包含未使用导出的文件: ${report.summary.filesWithUnusedExports}`);
console.log(`   可能包含死代码的文件: ${report.summary.filesWithDeadCode}`);

if (unusedImportsByFile.length > 0) {
  console.log(`\n📥 未使用的导入:`);
  unusedImportsByFile.slice(0, 20).forEach(({ file, default: dflt, named, namespace }) => {
    console.log(`\n   ${file}`);
    dflt.forEach(({ varName, source }) => {
      console.log(`     - import ${varName} from '${source}'`);
    });
    named.forEach(({ source, names }) => {
      console.log(`     - import { ${names.join(', ')} } from '${source}'`);
    });
    namespace.forEach(({ varName, source }) => {
      console.log(`     - import * as ${varName} from '${source}'`);
    });
  });
  if (unusedImportsByFile.length > 20) {
    console.log(`\n   ... 还有 ${unusedImportsByFile.length - 20} 个文件`);
  }
}

if (unusedExportsByFile.length > 0) {
  console.log(`\n📤 未使用的导出:`);
  unusedExportsByFile.slice(0, 20).forEach(({ file, default: dflt, named, typeNamed }) => {
    console.log(`\n   ${file}`);
    if (dflt) console.log(`     - 默认导出: ${dflt}`);
    if (named.length > 0) console.log(`     - 命名导出: ${named.slice(0, 5).join(', ')}${named.length > 5 ? '...' : ''}`);
    if (typeNamed.length > 0) console.log(`     - 类型导出: ${typeNamed.slice(0, 5).join(', ')}${typeNamed.length > 5 ? '...' : ''}`);
  });
  if (unusedExportsByFile.length > 20) {
    console.log(`\n   ... 还有 ${unusedExportsByFile.length - 20} 个文件`);
  }
}

if (deadCodeByFile.length > 0) {
  console.log(`\n💀 死代码（可能可以删除）:`);
  deadCodeByFile.slice(0, 10).forEach(({ file, functions, constants }) => {
    console.log(`\n   ${file}`);
    if (functions.length > 0) console.log(`     - 函数: ${functions.slice(0, 3).join(', ')}${functions.length > 3 ? '...' : ''}`);
    if (constants.length > 0) console.log(`     - 常量: ${constants.slice(0, 3).join(', ')}${constants.length > 3 ? '...' : ''}`);
  });
  if (deadCodeByFile.length > 10) {
    console.log(`\n   ... 还有 ${deadCodeByFile.length - 10} 个文件`);
  }
}

// 保存完整报告
const reportPath = path.join(PROJECT_DIR, 'unused-code-analysis-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n💾 完整报告已保存到: ${reportPath}`);

// 生成 Markdown 报告
const markdownReport = generateMarkdownReport(report);
const markdownReportPath = path.join(PROJECT_DIR, 'unused-code-analysis-report.md');
fs.writeFileSync(markdownReportPath, markdownReport);
console.log(`📄 Markdown 报告已保存到: ${markdownReportPath}`);

function generateMarkdownReport(report) {
  let md = '# 未使用代码分析报告\n\n';
  md += `生成时间: ${new Date(report.timestamp).toLocaleString('zh-CN')}\n\n`;

  md += '## 📊 摘要\n\n';
  md += `| 指标 | 数量 |\n`;
  md += `|------|------|\n`;
  md += `| 总文件数 | ${report.summary.totalFiles} |\n`;
  md += `| 包含未使用导入的文件 | ${report.summary.filesWithUnusedImports} |\n`;
  md += `| 包含未使用导出的文件 | ${report.summary.filesWithUnusedExports} |\n`;
  md += `| 可能包含死代码的文件 | ${report.summary.filesWithDeadCode} |\n`;

  if (report.unusedImports.length > 0) {
    md += '\n## 📥 未使用的导入\n\n';
    md += '以下文件包含未使用的导入语句：\n\n';
    report.unusedImports.slice(0, 50).forEach(({ file, default: dflt, named, namespace }) => {
      md += `### ${file}\n\n`;
      if (dflt.length > 0) {
        dflt.forEach(({ varName, source }) => {
          md += `- \`import ${varName} from '${source}'\`\n`;
        });
      }
      if (named.length > 0) {
        named.forEach(({ source, names }) => {
          md += `- \`import { ${names.join(', ')} } from '${source}'\`\n`;
        });
      }
      if (namespace.length > 0) {
        namespace.forEach(({ varName, source }) => {
          md += `- \`import * as ${varName} from '${source}'\`\n`;
        });
      }
      md += '\n';
    });
    if (report.unusedImports.length > 50) {
      md += `*... 还有 ${report.unusedImports.length - 50} 个文件 *\n\n`;
    }
  }

  if (report.unusedExports.length > 0) {
    md += '\n## 📤 未使用的导出\n\n';
    md += '以下文件包含导出但未被其他文件引用：\n\n';
    md += '*注意：已排除 Next.js 路由文件（page.tsx, layout.tsx 等）*\n\n';
    report.unusedExports.slice(0, 50).forEach(({ file, default: dflt, named, typeNamed }) => {
      md += `### ${file}\n\n`;
      if (dflt) md += `- 默认导出: \`${dflt}\`\n`;
      if (named.length > 0) md += `- 命名导出: \`${named.join('\`, `')}\`\n`;
      if (typeNamed.length > 0) md += `- 类型导出: \`${typeNamed.join('\`, `')}\`\n`;
      md += '\n';
    });
    if (report.unusedExports.length > 50) {
      md += `*... 还有 ${report.unusedExports.length - 50} 个文件 *\n\n`;
    }
  }

  if (report.deadCode.length > 0) {
    md += '\n## 💀 潜在的死代码\n\n';
    md += '以下文件可能包含未使用的函数或常量：\n\n';
    report.deadCode.slice(0, 30).forEach(({ file, functions, constants }) => {
      md += `### ${file}\n\n`;
      if (functions.length > 0) md += `- 未使用的函数: \`${functions.join('\`, `')}\`\n`;
      if (constants.length > 0) md += `- 未使用的常量: \`${constants.join('\`, `')}\`\n`;
      md += '\n';
    });
    if (report.deadCode.length > 30) {
      md += `*... 还有 ${report.deadCode.length - 30} 个文件 *\n\n`;
    }
  }

  md += '\n## ⚠️ 注意事项\n\n';
  md += '1. 此报告基于静态分析，可能存在误报\n';
  md += '2. 某些导出可能仅用于类型检查\n';
  md += '3. 某些函数可能通过字符串引用（如事件处理器）\n';
  md += '4. 建议在删除代码前运行完整测试套件\n';
  md += '5. 清理后请验证应用功能正常\n\n';

  md += '## 🔧 建议步骤\n\n';
  md += '1. 仔细审查此报告\n';
  md += '2. 运行测试: `npm test`\n';
  md += '3. 清理未使用的导入\n';
  md += '4. 评估未使用的导出是否可以删除\n';
  md += '5. 清理死代码\n';
  md += '6. 再次运行测试确保一切正常\n';
  md += '7. 提交更改\n\n';

  return md;
}

console.log('\n✅ 分析完成!');
