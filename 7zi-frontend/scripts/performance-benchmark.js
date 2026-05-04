/**
 * Performance Benchmark for 7zi-frontend
 * Run with: node scripts/performance-benchmark.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const START = Date.now();

function run(cmd, label) {
  const t0 = Date.now();
  console.log(`\n⏱️  ${label}...`);
  try {
    const out = execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
    console.log(`✅ ${label} 完成: ${elapsed}s`);
    return { success: true, elapsed, output: out };
  } catch (e) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
    console.log(`❌ ${label} 失败: ${elapsed}s`);
    return { success: false, elapsed, output: e.stdout || e.message };
  }
}

console.log('🚀 7zi-frontend 性能基准测试');
console.log(`📁 项目目录: ${ROOT}`);
console.log(`🕐 开始时间: ${new Date().toISOString()}`);

// Check for test-complexity-analysis.json
const complexityFile = path.join(ROOT, 'test-complexity-analysis.json');
if (fs.existsSync(complexityFile)) {
  console.log('📊 发现 test-complexity-analysis.json');
  try {
    const data = JSON.parse(fs.readFileSync(complexityFile, 'utf8'));
    console.log('   模块数量:', data.modules?.length || 'N/A');
    console.log('   总复杂度:', data.totalComplexity || 'N/A');
  } catch (e) {
    console.log('   无法解析:', e.message);
  }
}

// 1. Type check
const typecheck = run('pnpm typecheck', 'TypeScript 类型检查');

// 2. Build
const build = run('pnpm build', '生产构建');

// 3. Build artifact size
if (build.success) {
  const nextDir = path.join(ROOT, '.next');
  if (fs.existsSync(nextDir)) {
    const size = execSync('du -sh .next/ 2>/dev/null', { cwd: ROOT, encoding: 'utf8' }).trim();
    console.log(`\n📦 构建产物大小: ${size}`);
    
    // More details
    try {
      const cacheSize = execSync('du -sh .next/cache 2>/dev/null || echo "N/A"', { cwd: ROOT, encoding: 'utf8' }).trim();
      const staticSize = execSync('du -sh .next/static 2>/dev/null || echo "N/A"', { cwd: ROOT, encoding: 'utf8' }).trim();
      console.log(`   缓存: ${cacheSize}`);
      console.log(`   静态资源: ${staticSize}`);
    } catch (e) {}
  }
}

// Extract build time from output
if (build.success && build.output) {
  const timeMatch = build.output.match(/Build\s+time[:\s]+(\d+\.?\d*)\s*(s|seconds?|ms)?/i) ||
                    build.output.match(/(\d+\.?\d*)\s*(s|seconds?|ms)/i);
  if (timeMatch) {
    console.log(`\n⏱️  构建时间提取: ${timeMatch[0]}`);
  }
}

// Report
console.log('\n========== 基准测试结果 ==========');
console.log(`Type check: ${typecheck.success ? '✅ 通过' : '❌ 失败'} (${typecheck.elapsed}s)`);
console.log(`Build:      ${build.success ? '✅ 成功' : '❌ 失败'} (${build.elapsed}s)`);
console.log(`总耗时: ${((Date.now() - START) / 1000).toFixed(2)}s`);
console.log('===================================\n');

// Performance warnings
if (typecheck.elapsed > 60) {
  console.log('⚠️  类型检查超过 60s，考虑使用 swc 或增加缓存');
}
if (build.elapsed > 300) {
  console.log('⚠️  构建时间超过 5 分钟，建议优化');
}