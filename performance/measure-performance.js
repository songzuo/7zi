/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
const fs = require('fs');

async function measurePerformance() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1350, height: 940 }
  });
  
  const page = await context.newPage();
  
  const results = {
    timestamp: new Date().toISOString(),
    url: 'http://localhost:3000',
    metrics: {}
  };
  
  console.log('测量首屏加载时间...');
  
  // 导航并等待加载
  const navigationStart = Date.now();
  
  try {
    await page.goto('http://localhost:3000', { 
      waitUntil: 'domcontentloaded',
      timeout: 90000
    });
  } catch (e) {
    console.log('导航超时，继续测量可用指标...');
  }
  
  const loadTime = Date.now() - navigationStart;
  
  // 等待页面稳定
  await page.waitForTimeout(5000);
  
  // 获取性能指标
  const performanceMetrics = await page.evaluate(() => {
    const timing = performance.timing;
    const nav = performance.getEntriesByType('navigation')[0];
    
    // 获取绘制指标
    const paintEntries = performance.getEntriesByType('paint');
    let fcp = null;
    for (const entry of paintEntries) {
      if (entry.name === 'first-contentful-paint') {
        fcp = entry.startTime;
        break;
      }
    }
    
    // 获取 LCP
    let lcp = 0;
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    if (lcpEntries.length > 0) {
      lcp = lcpEntries[lcpEntries.length - 1].startTime;
    }
    
    return {
      ttfb: nav ? nav.responseStart : (timing.responseStart - timing.navigationStart),
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      domInteractive: timing.domInteractive - timing.navigationStart,
      fcp: fcp,
      lcp: lcp,
      loadTime: timing.loadEventEnd - timing.navigationStart
    };
  }).catch(() => ({
    ttfb: 0,
    domContentLoaded: 0,
    domInteractive: 0,
    fcp: 0,
    lcp: 0,
    loadTime: 0
  }));
  
  results.metrics = {
    ...performanceMetrics,
    totalLoadTime: loadTime
  };
  
  // 测量资源加载
  const resources = await page.evaluate(() => {
    const entries = performance.getEntriesByType('resource');
    return {
      total: entries.length,
      js: entries.filter(e => e.name.endsWith('.js')).length,
      css: entries.filter(e => e.name.endsWith('.css')).length,
      images: entries.filter(e => e.initiatorType === 'img' || e.name.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)).length,
      totalTransferSize: entries.reduce((sum, e) => sum + (e.transferSize || 0), 0),
      totalEncodedSize: entries.reduce((sum, e) => sum + (e.encodedBodySize || 0), 0)
    };
  }).catch(() => ({
    total: 0,
    js: 0,
    css: 0,
    images: 0,
    totalTransferSize: 0,
    totalEncodedSize: 0
  }));
  
  results.resources = resources;
  
  // 截图
  try {
    await page.screenshot({ path: './performance/screenshot-home.png', fullPage: true });
  } catch (e) {
    console.log('截图失败:', e.message);
  }
  
  await browser.close();
  
  return results;
}

async function measureAPIResponse() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const apiEndpoints = [
    '/api/tasks',
    '/api/projects',
    '/api/logs'
  ];
  
  const results = {};
  
  for (const endpoint of apiEndpoints) {
    try {
      const startTime = Date.now();
      const response = await page.request.get(`http://localhost:3000${endpoint}`);
      const responseTime = Date.now() - startTime;
      
      results[endpoint] = {
        status: response.status(),
        responseTime: responseTime,
        size: parseInt(response.headers()['content-length'] || '0')
      };
    } catch (error) {
      results[endpoint] = {
        error: error.message,
        status: 'error'
      };
    }
  }
  
  await browser.close();
  return results;
}

async function main() {
  console.log('开始性能基准测试...\n');
  
  // 页面性能测试
  console.log('1. 测量页面加载性能...');
  const pageMetrics = await measurePerformance();
  console.log('✓ 页面性能测量完成');
  
  // API 响应测试
  console.log('\n2. 测量 API 响应时间...');
  const apiMetrics = await measureAPIResponse();
  console.log('✓ API 性能测量完成');
  
  // 保存结果
  const report = {
    timestamp: new Date().toISOString(),
    pagePerformance: pageMetrics,
    apiPerformance: apiMetrics
  };
  
  fs.writeFileSync(
    './performance/baseline-report.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n✓ 性能基准报告已保存到 ./performance/baseline-report.json');
  
  // 生成简要摘要
  console.log('\n========================================');
  console.log('       性能基准摘要');
  console.log('========================================');
  console.log(`测试时间：${report.timestamp}`);
  console.log(`测试 URL: ${pageMetrics.url}`);
  console.log('');
  console.log('📊 核心 Web 指标:');
  console.log(`   TTFB (首字节时间):     ${pageMetrics.metrics.ttfb?.toFixed(2) || 'N/A'} ms`);
  console.log(`   FCP (首次内容绘制):    ${pageMetrics.metrics.fcp?.toFixed(2) || 'N/A'} ms`);
  console.log(`   LCP (最大内容绘制):    ${pageMetrics.metrics.lcp?.toFixed(2) || 'N/A'} ms`);
  console.log(`   DOM 交互时间：${pageMetrics.metrics.domInteractive?.toFixed(2) || 'N/A'} ms`);
  console.log(`   DOM 加载完成：${pageMetrics.metrics.domContentLoaded?.toFixed(2) || 'N/A'} ms`);
  console.log(`   总加载时间：${pageMetrics.metrics.totalLoadTime} ms`);
  console.log('');
  console.log('📦 资源统计:');
  console.log(`   总资源数：${pageMetrics.resources.total}`);
  console.log(`   JavaScript 文件：${pageMetrics.resources.js}`);
  console.log(`   CSS 文件：${pageMetrics.resources.css}`);
  console.log(`   图片资源：${pageMetrics.resources.images}`);
  console.log(`   传输总大小：${(pageMetrics.resources.totalTransferSize / 1024).toFixed(2)} KB`);
  console.log('');
  console.log('🔌 API 响应时间:');
  for (const [endpoint, data] of Object.entries(apiMetrics)) {
    if (data.status === 'error') {
      console.log(`   ${endpoint}: ❌ ${data.error}`);
    } else {
      console.log(`   ${endpoint}: ${data.responseTime} ms (${data.size} bytes)`);
    }
  }
  console.log('========================================\n');
  
  return report;
}

main().catch(console.error);
