#!/usr/bin/env node
/**
 * 分析测试文件复杂度和大小
 * 用于按复杂度分组测试
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// 找到所有测试文件
const testFiles = glob.sync('src/**/*.{test,spec}.{ts,tsx}', { cwd: process.cwd() });

const fileStats = testFiles.map(file => {
  const fullPath = path.resolve(file);
  const stats = fs.statSync(fullPath);
  const content = fs.readFileSync(fullPath, 'utf-8');

  // 分析复杂度指标
  const lines = content.split('\n').length;
  const testCount = (content.match(/(describe|test|it)\s*\(/g) || []).length;
  const asyncCount = (content.match(/async\s+(function|=>)/g) || []).length;
  const importCount = (content.match(/^import/gm) || []).length;

  return {
    file,
    size: stats.size,
    lines,
    testCount,
    asyncCount,
    importCount,
    complexity: testCount * 2 + asyncCount * 3 + lines / 100
  };
});

// 按复杂度排序
fileStats.sort((a, b) => b.complexity - a.complexity);

// 分组
const groups = {
  high: [],    // 复杂度 > 50
  medium: [],  // 复杂度 20-50
  low: []      // 复杂度 < 20
};

fileStats.forEach(stat => {
  if (stat.complexity > 50) groups.high.push(stat);
  else if (stat.complexity > 20) groups.medium.push(stat);
  else groups.low.push(stat);
});

console.log('📊 测试文件复杂度分析\n');
console.log(`总计: ${testFiles.length} 个测试文件\n`);

console.log('🔴 高复杂度 (>50):', groups.high.length);
groups.high.slice(0, 10).forEach(s => console.log(`  - ${s.file} (${s.complexity.toFixed(1)})`));

console.log('\n🟡 中等复杂度 (20-50):', groups.medium.length);
groups.medium.slice(0, 10).forEach(s => console.log(`  - ${s.file} (${s.complexity.toFixed(1)})`));

console.log('\n🟢 低复杂度 (<20):', groups.low.length);
groups.low.slice(0, 10).forEach(s => console.log(`  - ${s.file} (${s.complexity.toFixed(1)})`));

// 保存到文件
const outputPath = path.join(process.cwd(), 'test-complexity-analysis.json');
fs.writeFileSync(outputPath, JSON.stringify({
  total: testFiles.length,
  groups,
  allFiles: fileStats
}, null, 2));

console.log(`\n✅ 详细分析已保存到: ${outputPath}`);
