# ============================================
# 构建分析脚本
# 分析 Docker 构建上下文大小
# ============================================
import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const workspace = process.cwd();

// 获取构建上下文大小（排除 .dockerignore 中的文件）
function getBuildContextSize() {
  try {
    const result = execSync('docker build --progress=plain -f Dockerfile.optimized --target deps . 2>&1 | grep "build context" || echo "0"', {
      cwd: workspace,
      encoding: 'utf8'
    });
    return result.trim();
  } catch (error) {
    return 'N/A';
  }
}

// 获取源代码大小
function getSourceSize() {
  const dirs = ['src', 'app', 'components', 'lib', 'public'];
  let totalSize = 0;

  for (const dir of dirs) {
    try {
      const cmd = `du -sh ${dir} 2>/dev/null || echo "0"`;
      const result = execSync(cmd, { cwd: workspace, encoding: 'utf8' });
      console.log(`${dir}: ${result.trim()}`);
    } catch (error) {
      // Directory doesn't exist
    }
  }
}

console.log('=== Docker Build Context Analysis ===\n');
console.log('Build Context Size:', getBuildContextSize());
console.log('\nSource Directory Sizes:');
getSourceSize();

console.log('\n=== Largest Files ===');
try {
  const result = execSync('find . -type f -not -path "./node_modules/*" -not -path "./.next/*" -not -path "./.git/*" -exec du -h {} + 2>/dev/null | sort -rh | head -20', {
    cwd: workspace,
    encoding: 'utf8'
  });
  console.log(result);
} catch (error) {
  console.log('N/A');
}
