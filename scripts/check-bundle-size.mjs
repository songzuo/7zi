#!/usr/bin/env node
/**
 * Bundle Size Checker Script
 * 用于检查构建产物的大小，替代 webpack 的 performance 配置
 *
 * 使用方法:
 *   node scripts/check-bundle-size.mjs
 *   或在 package.json 中添加: "build:check": "npm run build && node scripts/check-bundle-size.mjs"
 */

import fs from 'fs';
import path from 'path';

// 配置
const MAX_ENTRYPOINT_SIZE = 300000; // 300 KB
const MAX_ASSET_SIZE = 250000;      // 250 KB
const BUILD_DIR = '.next';
const STATIC_DIR = path.join(BUILD_DIR, 'static');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

/**
 * 格式化文件大小
 */
function formatSize(bytes) {
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(2)} KB`;
  }
  return `${(kb / 1024).toFixed(2)} MB`;
}

/**
 * 检查文件大小
 */
function checkFile(filePath, maxSize, type) {
  try {
    const stats = fs.statSync(filePath);
    const relativePath = path.relative(BUILD_DIR, filePath);

    if (stats.size > maxSize) {
      console.error(`${colors.red}❌ ${type}${colors.reset} ${relativePath}: ${formatSize(stats.size)} ${colors.red}exceeds${colors.reset} ${formatSize(maxSize)}`);
      return false;
    }

    console.log(`${colors.green}✅${colors.reset} ${type} ${relativePath}: ${formatSize(stats.size)}`);
    return true;
  } catch (error) {
    console.warn(`${colors.yellow}⚠️${colors.reset}  Could not read ${filePath}: ${error.message}`);
    return true; // 不阻止构建
  }
}

/**
 * 递归遍历目录
 */
function walkDirectory(dir, callback) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walkDirectory(fullPath, callback);
      } else if (entry.isFile()) {
        callback(fullPath);
      }
    }
  } catch (error) {
    console.warn(`${colors.yellow}⚠️${colors.reset}  Could not read directory ${dir}: ${error.message}`);
  }
}

/**
 * 分析 chunk 大小统计
 */
function analyzeChunkSizes(chunksDir) {
  const chunkSizes = [];
  let totalSize = 0;

  walkDirectory(chunksDir, (filePath) => {
    try {
      const stats = fs.statSync(filePath);
      chunkSizes.push(stats.size);
      totalSize += stats.size;
    } catch (error) {
      // 忽略读取错误
    }
  });

  if (chunkSizes.length === 0) {
    return null;
  }

  chunkSizes.sort((a, b) => b - a);

  return {
    count: chunkSizes.length,
    totalSize,
    averageSize: totalSize / chunkSizes.length,
    maxSize: chunkSizes[0],
    medianSize: chunkSizes[Math.floor(chunkSizes.length / 2)],
  };
}

/**
 * 主函数
 */
function main() {
  console.log(`${colors.blue}📊 Checking bundle sizes...${colors.reset}\n`);

  let allPassed = true;
  let hasChunks = false;

  // 检查 static chunks
  const chunksDir = path.join(STATIC_DIR, 'chunks');
  if (fs.existsSync(chunksDir)) {
    hasChunks = true;
    console.log(`${colors.blue}📦 Checking chunks:${colors.reset}`);
    walkDirectory(chunksDir, (filePath) => {
      if (!checkFile(filePath, MAX_ASSET_SIZE, 'chunk')) {
        allPassed = false;
      }
    });
    console.log();

    // 输出统计信息
    const stats = analyzeChunkSizes(chunksDir);
    if (stats) {
      console.log(`${colors.blue}📊 Chunk Statistics:${colors.reset}`);
      console.log(`   Total chunks: ${stats.count}`);
      console.log(`   Total size: ${formatSize(stats.totalSize)}`);
      console.log(`   Average size: ${formatSize(stats.averageSize)}`);
      console.log(`   Largest chunk: ${formatSize(stats.maxSize)}`);
      console.log(`   Median size: ${formatSize(stats.medianSize)}`);
      console.log();
    }
  }

  // 检查 server app 目录（用于 SSR）
  const serverAppDir = path.join(BUILD_DIR, 'server', 'app');
  if (fs.existsSync(serverAppDir)) {
    console.log(`${colors.blue}🖥️  Checking server app:${colors.reset}`);
    walkDirectory(serverAppDir, (filePath) => {
      if (filePath.endsWith('.js')) {
        if (!checkFile(filePath, MAX_ENTRYPOINT_SIZE, 'server')) {
          allPassed = false;
        }
      }
    });
    console.log();
  }

  // 总结
  if (!hasChunks) {
    console.warn(`${colors.yellow}⚠️${colors.reset}  No chunks found in .next/static/chunks/`);
    console.warn(`${colors.yellow}⚠️${colors.reset}  Make sure you have run the build first: \`npm run build\`\n`);
    process.exit(0);
  }

  if (allPassed) {
    console.log(`${colors.green}✅ All bundle size checks passed!${colors.reset}`);
    process.exit(0);
  } else {
    console.error(`${colors.red}❌ Some bundles exceed size limits!${colors.reset}`);
    console.error(`${colors.yellow}💡 Tip: Use \`npm run build:analyze\` to analyze and optimize your bundles.${colors.reset}`);
    process.exit(1);
  }
}

// 运行
main();
