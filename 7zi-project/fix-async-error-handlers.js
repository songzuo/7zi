#!/usr/bin/env node

/**
 * 批量修复 API 文件中缺少 await 的错误处理函数调用
 */

const fs = require('fs');
const path = require('path');

// 需要添加 await 的函数列表
const asyncFunctions = [
  'createValidationError',
  'createUnauthorizedError',
  'createForbiddenError',
  'createNotFoundError',
  'createBadRequestError',
  'createRateLimitError',
  'createServiceUnavailableError',
  'createRegistrationFailedError',
  'createWeakPasswordError',
  'createMissingTokenError',
  'createSuccessResponse',
  'createErrorResponse',
];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // 跳过测试文件
  if (filePath.includes('.test.') || filePath.includes('.spec.')) {
    return false;
  }

  // 为每个函数添加 await
  asyncFunctions.forEach(funcName => {
    // 匹配模式: const response = createValidationError( 但不是 const response = await createValidationError(
    const regex = new RegExp(
      `(const\\s+\\w+\\s*=\\s+)(${funcName}\\()`,
      'g'
    );

    const countBefore = (content.match(regex) || []).length;
    content = content.replace(regex, '$1await $2');
    const countAfter = (content.match(regex) || []).length;

    if (countBefore > countAfter) {
      modified = true;
      console.log(`  ✅ Fixed ${funcName} in ${path.basename(filePath)} (${countBefore - countAfter} occurrences)`);
    }
  });

  // 也修复 return 语句中的调用
  asyncFunctions.forEach(funcName => {
    // 匹配模式: return createValidationError( 但不是 return await createValidationError(
    const regex = new RegExp(
      `(return\\s+)(${funcName}\\()`,
      'g'
    );

    content = content.replace(regex, '$1await $2');
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }

  return false;
}

function findApiFiles(dir) {
  let files = [];

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      // 跳过 node_modules, __tests__, .next 等
      if (
!['node_modules', '__tests__', '.next', '.git', 'coverage'].includes(item.name)
) {
        files = files.concat(findApiFiles(fullPath));
      }
    } else if (item.isFile() && item.name === 'route.ts') {
      files.push(fullPath);
    }
  }

  return files;
}

// 主函数
const apiDir = path.join(__dirname, 'src', 'app', 'api');

console.log('🔍 Scanning for API route files...');
const apiFiles = findApiFiles(apiDir);
console.log(`📋 Found ${apiFiles.length} API route files\n`);

let fixedCount = 0;

apiFiles.forEach(filePath => {
  try {
    if (fixFile(filePath)) {
      fixedCount++;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log(`\n✨ Fixed ${fixedCount} files`);
