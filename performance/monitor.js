#!/usr/bin/env node
/**
 * 性能监控脚本
 * 定期测量性能指标并记录历史数据
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, 'performance-history.json');

async function measureCoreWebVitals(url = 'http://localhost:3000') {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1350, height: 940 }
  });
  
  const page = await context.newPage();
  
  const startTime = Date.now();
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(5000);
    
    const metrics = await page.evaluate(() => {
      const timing = performance.timing;
      const nav = performance.getEntriesByType('navigation')[0];
      
      const paintEntries = performance.getEntriesByType('paint');
      let fcp = null;
      for (const entry of paintEntries) {
        if (entry.name === 'first-contentful-paint') {
          fcp = entry.startTime;
          break;
        }
      }
      
      let lcp = 0;
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      if (lcpEntries.length > 0) {
        lcp = lcpEntries[lcpEntries.length - 1].startTime;
      }
      
      return {
        ttfb: nav ? nav.responseStart : (timing.responseStart - timing.navigationStart),
        fcp: fcp,
        lcp: lcp,
        domInteractive: timing.domInteractive - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart
      };
    });
    
    const loadTime = Date.now() - startTime;
    
    await browser.close();
    
    return {
      timestamp: new Date().toISOString(),
      url,
      metrics: {
        ...metrics,
        totalLoadTime: loadTime
      }
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('加载历史记录失败:', e.message);
  }
  return { measurements: [] };
}

function saveHistory(history) {
  // 保留最近 100 次测量
  history.measurements = history.measurements.slice(-100);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

function calculateScore(metrics) {
  let score = 100;
  
  // TTFB 评分 (目标 < 200ms)
  if (metrics.ttfb > 200) score -= 10;
  if (metrics.ttfb > 500) score -= 10;
  
  // FCP 评分 (目标 < 1800ms)
  if (metrics.fcp > 1800) score -= 15;
  if (metrics.fcp > 3000) score -= 15;
  
  // LCP 评分 (目标 < 2500ms)
  if (metrics.lcp > 2500) score -= 20;
  if (metrics.lcp > 4000) score -= 20;
  
  // DOM 交互评分 (目标 < 1000ms)
  if (metrics.domInteractive > 1000) score -= 10;
  if (metrics.domInteractive > 2000) score -= 10;
  
  return Math.max(0, Math.min(100, score));
}

async function main() {
  console.log('🔍 性能监控 - 开始测量\n');
  
  const url = process.argv[2] || 'http://localhost:3000';
  
  try {
    const result = await measureCoreWebVitals(url);
    
    // 加载历史记录
    const history = loadHistory();
    history.measurements.push(result);
    saveHistory(history);
    
    // 计算分数
    const score = calculateScore(result.metrics);
    
    // 输出结果
    console.log('📊 测量结果:');
    console.log(`   TTFB: ${result.metrics.ttfb.toFixed(2)} ms`);
    console.log(`   FCP: ${result.metrics.fcp?.toFixed(2) || 'N/A'} ms`);
    console.log(`   LCP: ${result.metrics.lcp?.toFixed(2) || 'N/A'} ms`);
    console.log(`   DOM 交互：${result.metrics.domInteractive.toFixed(2)} ms`);
    console.log(`   总加载：${result.metrics.totalLoadTime} ms`);
    console.log('');
    console.log(`🏆 性能得分：${score}/100`);
    
    // 评级
    let rating = '🟢 优秀';
    if (score < 90) rating = '🟡 良好';
    if (score < 70) rating = '🟠 一般';
    if (score < 50) rating = '🔴 需优化';
    console.log(`📈 评级：${rating}`);
    console.log('');
    console.log(`💾 历史记录已保存：${HISTORY_FILE}`);
    
    // 如果分数低，输出建议
    if (score < 80) {
      console.log('\n⚠️  优化建议:');
      if (result.metrics.ttfb > 200) console.log('   - 优化服务器响应时间');
      if (result.metrics.fcp > 1800) console.log('   - 优化首屏渲染');
      if (result.metrics.lcp > 2500) console.log('   - 优化最大内容元素');
      if (result.metrics.domInteractive > 1000) console.log('   - 减少 JavaScript 执行时间');
    }
    
    process.exit(score >= 70 ? 0 : 1);
  } catch (error) {
    console.error('❌ 测量失败:', error.message);
    process.exit(1);
  }
}

main();
