#!/usr/bin/env node

/**
 * 批量修复未使用的导入和变量
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 批量修复未使用的导入...\n');

// 需要处理的文件和修复规则
const filesToProcess = [
  // auth/login/route-unified.ts - 删除未使用的 NextResponse 导入
  {
    file: 'src/app/api/auth/login/route-unified.ts',
    removeImports: ['NextResponse'],
  },
  // auth/login/route.ts
  {
    file: 'src/app/api/auth/login/route.ts',
    removeImports: ['NextResponse'],
  },
  // auth/logout/route.ts
  {
    file: 'src/app/api/auth/logout/route.ts',
    removeImports: ['NextResponse'],
  },
  // auth/register/route.ts
  {
    file: 'src/app/api/auth/register/route.ts',
    removeImports: ['NextResponse'],
  },
  // feedback/route.ts
  {
    file: 'src/app/api/feedback/route.ts',
    removeImports: ['NextResponse'],
  },
  // multimodal/audio/route.ts
  {
    file: 'src/app/api/multimodal/audio/route.ts',
    removeImports: ['NextResponse'],
  },
  // multimodal/image/route.ts
  {
    file: 'src/app/api/multimodal/image/route.ts',
    removeImports: ['NextResponse'],
  },
  // ratings/[id]/helpful/route.ts
  {
    file: 'src/app/api/ratings/[id]/helpful/route.ts',
    removeImports: ['NextResponse'],
  },
  // ratings/route.ts
  {
    file: 'src/app/api/ratings/route.ts',
    removeImports: ['NextResponse'],
  },
  // performance/page.tsx - 添加下划线前缀
  {
    file: 'src/app/[locale]/performance/page.tsx',
    replace: [
      { from: 'const config =', to: 'const _config =' },
      { from: 'const t = useTranslations', to: 'const _t = useTranslations' },
    ]
  },
];

let totalFixed = 0;

filesToProcess.forEach(({ file, removeImports, replace }) => {
  const filePath = path.join(process.cwd(), file);

  if (!fs.existsSync(filePath)) {
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 删除未使用的导入
    if (removeImports) {
      removeImports.forEach(imp => {
        // 匹配 import { X, Y, Z } from 'module'
        const patterns = [
          new RegExp(`import\\s*\\{[^}]*\\b${imp}\\b[^}]*\\}\\s*from\\s*['"][^'"]+['"];?\\n`, 'g'),
          new RegExp(`import\\s*${imp}\\s*,?\\s*from\\s*['"][^'"]+['"];?\\n`, 'g'),
        ];

        patterns.forEach(pattern => {
          if (pattern.test(content)) {
            const match = content.match(pattern);
            if (match) {
              // 检查是否是单导入
              const singleImport = new RegExp(`import\\s*\\{\\s*${imp}\\s*\\}\\s*from`);
              if (singleImport.test(match[0])) {
                content = content.replace(pattern, '');
                modified = true;
              } else {
                // 多导入 - 只删除该导入项
                const multiImport = new RegExp(`(import\\s*\\{[^}]*)\\b${imp}\\b,?\\s*([^}]*\\}\\s*from)`);
                content = content.replace(multiImport, '$1$2');
                modified = true;
              }
            }
          }
        });
      });
    }

    // 应用替换
    if (replace) {
      replace.forEach(({ from, to }) => {
        if (content.includes(from)) {
          content = content.replace(from, to);
          modified = true;
        }
      });
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      totalFixed++;
      console.log(`✅ ${file}`);
    }
  } catch (error) {
    console.error(`❌ ${file}: ${error.message}`);
  }
});

console.log(`\n完成! 修复了 ${totalFixed} 个文件`);
