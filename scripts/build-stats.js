#!/usr/bin/env node
/**
 * 构建统计和优化工具
 * 分析构建大小、性能指标和提供优化建议
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');

const BUILD_DIR = path.join(process.cwd(), '.next');
const REPORT_FILE = path.join(process.cwd(), 'build-report.json');

// 文件大小单位转换
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 计算目录大小
function getDirSize(dir) {
  let size = 0;
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        size += getDirSize(filePath);
      } else {
        size += stat.size;
      }
    }
  } catch (e) {
    // 忽略错误
  }
  return size;
}

// 分析构建产物
function analyzeBuild() {
  const report = {
    timestamp: new Date().toISOString(),
    buildSize: {},
    chunks: [],
    recommendations: [],
    metrics: {}
  };

  // 检查构建目录
  if (!fs.existsSync(BUILD_DIR)) {
    console.error('❌ 构建目录不存在，请先运行 npm run build');
    process.exit(1);
  }

  // 分析主要目录
  const directories = [
    { name: 'static/chunks', path: 'static/chunks', description: 'JavaScript 代码块' },
    { name: 'static/css', path: 'static/css', description: 'CSS 样式文件' },
    { name: 'server', path: 'server', description: '服务端代码' },
    { name: 'standalone', path: 'standalone', description: '独立部署包' },
  ];

  let totalSize = 0;
  for (const dir of directories) {
    const dirPath = path.join(BUILD_DIR, dir.path);
    if (fs.existsSync(dirPath)) {
      const size = getDirSize(dirPath);
      report.buildSize[dir.name] = {
        size: size,
        formatted: formatBytes(size),
        description: dir.description
      };
      totalSize += size;
    }
  }

  report.buildSize.total = {
    size: totalSize,
    formatted: formatBytes(totalSize)
  };

  // 分析 JavaScript 文件
  const chunksDir = path.join(BUILD_DIR, 'static/chunks');
  if (fs.existsSync(chunksDir)) {
    const files = fs.readdirSync(chunksDir);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    
    jsFiles.forEach(file => {
      const filePath = path.join(chunksDir, file);
      const stat = fs.statSync(filePath);
      const content = fs.readFileSync(filePath);
      const gzipSize = gzipSync(content).length;
      
      report.chunks.push({
        file: file,
        size: stat.size,
        formatted: formatBytes(stat.size),
        gzipSize: gzipSize,
        gzipFormatted: formatBytes(gzipSize),
        ratio: ((gzipSize / stat.size) * 100).toFixed(1) + '%'
      });
    });

    // 按大小排序
    report.chunks.sort((a, b) => b.size - a.size);
  }

  // 生成优化建议
  generateRecommendations(report);

  // 计算指标
  const largeChunks = report.chunks.filter(c => c.size > 500 * 1024); // > 500KB
  report.metrics = {
    totalChunks: report.chunks.length,
    largeChunks: largeChunks.length,
    avgChunkSize: report.chunks.length > 0 
      ? formatBytes(report.chunks.reduce((sum, c) => sum + c.size, 0) / report.chunks.length)
      : '0 B',
    avgCompressionRatio: report.chunks.length > 0
      ? (report.chunks.reduce((sum, c) => sum + parseFloat(c.ratio), 0) / report.chunks.length).toFixed(1) + '%'
      : '0%'
  };

  // 保存报告
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  
  // 输出摘要
  console.log('\n📊 构建优化报告\n');
  console.log('='.repeat(60));
  console.log(`构建时间：${report.timestamp}`);
  console.log('\n📦 构建大小:');
  for (const [key, value] of Object.entries(report.buildSize)) {
    if (typeof value === 'object' && value.formatted) {
      console.log(`  ${key.padEnd(20)} ${value.formatted.padStart(10)}`);
    }
  }
  
  console.log('\n📄 最大的代码块 (Top 10):');
  report.chunks.slice(0, 10).forEach((chunk, i) => {
    console.log(`  ${i + 1}. ${chunk.file.padEnd(40)} ${chunk.formatted.padStart(10)} (gzip: ${chunk.gzipFormatted}, ${chunk.ratio})`);
  });
  
  console.log('\n📈 构建指标:');
  console.log(`  总代码块数：${report.metrics.totalChunks}`);
  console.log(`  大型代码块：${report.metrics.largeChunks} (>500KB)`);
  console.log(`  平均大小：${report.metrics.avgChunkSize}`);
  console.log(`  平均压缩率：${report.metrics.avgCompressionRatio}`);
  
  if (report.recommendations.length > 0) {
    console.log('\n💡 优化建议:');
    report.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`完整报告已保存至：${REPORT_FILE}`);
  console.log('');
}

// 生成优化建议
function generateRecommendations(report) {
  const recommendations = [];
  
  // 检查大型代码块
  const largeChunks = report.chunks.filter(c => c.size > 500 * 1024);
  if (largeChunks.length > 0) {
    recommendations.push(`发现 ${largeChunks.length} 个大型代码块 (>500KB)，考虑代码分割或懒加载`);
    
    const threeChunk = largeChunks.find(c => c.file.includes('three'));
    if (threeChunk) {
      recommendations.push('Three.js 库体积较大，考虑按需导入或使用 @react-three/drei 的轻量组件');
    }
  }
  
  // 检查压缩率
  const poorCompression = report.chunks.filter(c => parseFloat(c.ratio) > 35);
  if (poorCompression.length > 0) {
    recommendations.push(`${poorCompression.length} 个文件压缩率较低，检查是否包含未压缩的资源`);
  }
  
  // 检查 standalone 大小
  const standaloneSize = report.buildSize.standalone?.size || 0;
  if (standaloneSize > 200 * 1024 * 1024) { // > 200MB
    recommendations.push('独立部署包体积过大，检查是否包含不必要的依赖');
  }
  
  // 通用建议
  if (report.chunks.length > 50) {
    recommendations.push('代码块数量较多，考虑合并小型代码块以减少 HTTP 请求');
  }
  
  report.recommendations = recommendations;
}

// 运行分析
analyzeBuild();
