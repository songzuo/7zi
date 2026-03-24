#!/usr/bin/env node
/**
 * 测试性能基准测试
 * 对比优化前后的性能
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const resultsFile = path.join(process.cwd(), 'test-performance-benchmark.json');
const results = fs.existsSync(resultsFile)
  ? JSON.parse(fs.readFileSync(resultsFile, 'utf-8'))
  : { runs: [] };

function measureRun(name, config, args = []) {
  console.log(`\n🔧 测试: ${name}`);
  console.log(`   配置: ${config}`);
  console.log(`   参数: ${args.join(' ') || '(无)'}`);

  const startTime = Date.now();

  try {
    // 运行测试（限制为5个快速测试文件）
    const cmd = `npx vitest run --config ${config} --reporter=basic ${args.join(' ')} src/lib/utils-core.test.ts src/lib/utils/__tests__/math.test.ts src/types/__tests__/common.test.ts src/components/__tests__/LoadingSpinner.test.tsx src/app/api/stream/health/route.test.ts 2>&1 | head -50`;

    const output = execSync(cmd, {
      stdio: 'pipe',
      timeout: 120000, // 2分钟超时
      encoding: 'utf-8'
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // 秒

    // 解析结果
    const passMatch = output.match(/(\d+) pass/);
    const failMatch = output.match(/(\d+) fail/);
    const passes = passMatch ? parseInt(passMatch[1]) : 0;
    const fails = failMatch ? parseInt(failMatch[1]) : 0;

    const result = {
      name,
      config,
      args: args.join(' ') || 'default',
      duration,
      passes,
      fails,
      timestamp: new Date().toISOString(),
    };

    results.runs.push(result);

    console.log(`\n✅ 完成: ${duration.toFixed(2)}秒`);
    console.log(`   通过: ${passes}, 失败: ${fails}`);

    return result;
  } catch (error) {
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.error(`\n❌ 失败: ${error.message}`);

    const result = {
      name,
      config,
      args: args.join(' ') || 'default',
      duration,
      passes: 0,
      fails: -1, // 标记为失败
      error: error.message,
      timestamp: new Date().toISOString(),
    };

    results.runs.push(result);
    return result;
  }
}

function calculateSpeedup() {
  if (results.runs.length < 2) return null;

  const current = results.runs[results.runs.length - 1];
  const baseline = results.runs[0];

  if (current.duration > 0 && baseline.duration > 0) {
    const speedup = baseline.duration / current.duration;
    return {
      baseline: baseline.duration,
      current: current.duration,
      speedup: speedup,
      improvement: ((1 - current.duration / baseline.duration) * 100).toFixed(2)
    };
  }
  return null;
}

console.log('📊 测试性能基准测试\n');
console.log('='.repeat(50));

// 运行基准测试
console.log('\n1️⃣ 基准测试：当前配置（单进程）');
const baseline = measureRun('当前配置', 'vitest.config.ts');

console.log('\n2️⃣ 优化测试：并行配置');
const optimized = measureRun('并行优化', 'vitest.config.optimized.ts');

console.log('\n3️⃣ 快速配置：fast模式');
const fast = measureRun('快速模式', 'vitest.config.fast.ts');

// 计算性能提升
console.log('\n📈 性能对比\n');
console.log('='.repeat(50));

const comparisons = [
  {
    name: '当前配置 vs 并行优化',
    a: baseline,
    b: optimized,
  },
  {
    name: '当前配置 vs 快速模式',
    a: baseline,
    b: fast,
  },
  {
    name: '并行优化 vs 快速模式',
    a: optimized,
    b: fast,
  },
];

comparisons.forEach(comp => {
  if (comp.a.duration > 0 && comp.b.duration > 0) {
    const speedup = comp.a.duration / comp.b.duration;
    const improvement = ((1 - comp.b.duration / comp.a.duration) * 100).toFixed(2);

    console.log(`\n${comp.name}:`);
    console.log(`  ${comp.a.name}: ${comp.a.duration.toFixed(2)}秒`);
    console.log(`  ${comp.b.name}: ${comp.b.duration.toFixed(2)}秒`);
    console.log(`  提速: ${speedup.toFixed(2)}x (${improvement}% 更快)`);
  }
});

// 保存结果
fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
console.log(`\n✅ 结果已保存到: ${resultsFile}`);

// 总结
console.log('\n' + '='.repeat(50));
console.log('📋 测试文件分析总结:');
console.log('   - 总测试文件: 312个');
console.log('   - 高复杂度: 204个 (65%)');
console.log('   - 中等复杂度: 83个 (27%)');
console.log('   - 低复杂度: 25个 (8%)');
console.log('\n💡 建议:');
console.log('   1. 开发时使用 fast 模式获得快速反馈');
console.log('   2. PR检查使用 normal 模式');
console.log('   3. CI/CD使用 optimized 或 full模式');
console.log('   4. 修复最慢的204个高复杂度测试');
console.log('='.repeat(50));
