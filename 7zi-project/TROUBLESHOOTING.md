# 故障排除

> 常见问题和解决方案

**最后更新**: 2026-03-22
**版本**: v1.0.6

---

## 📋 目录

- [安装问题](#安装问题)
- [运行时问题](#运行时问题)
- [性能问题](#性能问题)
- [部署问题](#部署问题)
- [WebSocket 问题](#websocket-问题)
- [数据库问题](#数据库问题)
- [权限问题](#权限问题)
- [获取帮助](#获取帮助)

---

## 🔧 安装问题

### 问题 1: Node.js 版本不符合要求

**症状**:
```
ERROR: Node.js version must be 22 or higher
```

**解决方案**:

**方法 1: 使用 nvm (推荐)**
```bash
# 安装 Node.js 22
nvm install 22

# 使用 Node.js 22
nvm use 22

# 验证版本
node --version
# 应该输出 v22.x.x
```

**方法 2: 使用 apt (Ubuntu/Debian)**
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**方法 3: 使用 Homebrew (macOS)**
```bash
brew install node@22
```

---

### 问题 2: pnpm 安装失败

**症状**:
```
ERROR: pnpm command not found
```

**解决方案**:

```bash
# 安装 pnpm
npm install -g pnpm

# 验证安装
pnpm --version
# 应该输出 8.x.x 或更高
```

---

### 问题 3: 依赖安装失败

**症状**:
```
ERROR: npm ERR! code ERESOLVE
或
ERROR: Could not resolve dependency
```

**解决方案**:

**方法 1: 清理缓存**
```bash
# 清理 npm 缓存
npm cache clean --force

# 清理 pnpm 缓存
pnpm store prune
```

**方法 2: 删除 node_modules**
```bash
# 删除依赖和锁文件
rm -rf node_modules
rm -f package-lock.json
rm -f pnpm-lock.yaml

# 重新安装
pnpm install
```

**方法 3: 使用 legacy-peer-deps**
```bash
# 使用 npm 时
npm install --legacy-peer-deps
```

---

### 问题 4: 端口 3000 被占用

**症状**:
```
ERROR: Port 3000 is already in use
```

**解决方案**:

**方法 1: 使用其他端口**
```bash
# 启动在 3001 端口
pnpm dev -p 3001

# 或使用 npm
npm run dev -- -p 3001
```

**方法 2: 查找并关闭占用进程**

**Linux/macOS**:
```bash
# 查找占用 3000 端口的进程
lsof -ti:3000

# 关闭进程
lsof -ti:3000 | xargs kill -9
```

**Windows**:
```cmd
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## 🚀 运行时问题

### 问题 5: GitHub API 速率限制

**症状**:
```
控制台显示 403 Forbidden 或 "rate limit exceeded"
```

**原因**: GitHub API 未认证，每小时限制 60 次请求

**解决方案**:

**方法 1: 配置 GitHub Token (推荐)**

1. 创建 GitHub Token:
   - 访问 https://github.com/settings/tokens
   - 点击 "Generate new token (classic)"
   - 勾选 `repo` 和 `read:user` 权限
   - 生成并复制 token

2. 配置环境变量:
   ```bash
   # .env.local
   NEXT_PUBLIC_GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
   ```

3. 重启开发服务器:
   ```bash
   pnpm dev
   ```

**方法 2: 减少请求频率**
- 减少 Dashboard 自动刷新频率
- 缓存 API 响应

**说明**:
- 未认证: 60 次/小时
- 已认证: 5,000 次/小时

---

### 问题 6: 环境变量未生效

**症状**:
```
process.env.GITHUB_TOKEN is undefined
```

**解决方案**:

1. **检查环境变量文件**
   ```bash
   # 检查文件是否存在
   ls -la .env.local

   # 查看内容
   cat .env.local
   ```

2. **确认变量格式**
   ```bash
   # ✅ 正确
   NEXT_PUBLIC_GITHUB_TOKEN=ghp_xxx

   # ❌ 错误 - 不要加引号
   NEXT_PUBLIC_GITHUB_TOKEN="ghp_xxx"
   ```

3. **重启开发服务器**
   ```bash
   # 停止服务器
   Ctrl+C

   # 重新启动
   pnpm dev
   ```

4. **验证**
   ```typescript
   // 在浏览器控制台中
   console.log(process.env.NEXT_PUBLIC_GITHUB_TOKEN);
   ```

---

### 问题 7: 数据库连接失败

**症状**:
```
ERROR: Database connection failed
或
ERROR: SQLite database is locked
```

**解决方案**:

**方法 1: 检查数据库文件**
```bash
# 检查数据库文件是否存在
ls -la data/database.db

# 检查权限
ls -la data/
```

**方法 2: 解锁数据库**
```bash
# 删除锁文件
rm -f data/database.db-wal
rm -f data/database.db-shm
```

**方法 3: 重新初始化数据库**
```bash
# 备份现有数据（如果需要）
cp data/database.db data/database.backup.db

# 重新初始化
pnpm run db:init
```

---

## ⚡ 性能问题

### 问题 8: 页面加载缓慢

**症状**:
- 首次加载超过 5 秒
- 页面切换延迟明显

**解决方案**:

**方法 1: 启用生产构建**
```bash
# 构建生产版本
pnpm build

# 运行生产版本
pnpm start
```

**方法 2: 检查网络延迟**
```bash
# 使用浏览器 DevTools
# Network → 查看 waterfall 图
```

**方法 3: 启用 CDN**
```javascript
// next.config.ts
module.exports = {
  images: {
    domains: ['cdn.example.com'],
  },
};
```

**方法 4: 优化图片**
```bash
# 使用 next/image 组件
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={200}
  priority // 首屏图片
/>
```

---

### 问题 9: 内存占用过高

**症状**:
```
JavaScript heap out of memory
或
Node.js 进程内存超过 2GB
```

**解决方案**:

**方法 1: 增加 Node.js 内存限制**
```bash
# 增加到 4GB
NODE_OPTIONS='--max-old-space-size=4096' pnpm dev

# 或增加到 8GB
NODE_OPTIONS='--max-old-space-size=8192' pnpm dev
```

**方法 2: 优化数据库查询**
```typescript
// ❌ 不好 - 查询所有数据
const allTasks = await db.all('SELECT * FROM tasks');

// ✅ 好的 - 分页查询
const tasks = await db.all(
  'SELECT * FROM tasks LIMIT ? OFFSET ?',
  [limit, offset]
);
```

**方法 3: 使用 React.memo**
```typescript
// 减少不必要的重新渲染
const TaskCard = React.memo(({ task }) => {
  // ...
});
```

---

### 问题 10: 数据库查询缓慢

**症状**:
- API 响应时间超过 2 秒
- 页面加载等待数据库

**解决方案**:

**方法 1: 添加索引**
```sql
-- 为常用查询字段添加索引
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assignee ON tasks(assignee);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
```

**方法 2: 使用查询构建器**
```typescript
// 使用预编译语句
const stmt = db.prepare(
  'SELECT * FROM tasks WHERE status = ? AND assignee = ?'
);

const tasks = stmt.all(status, assignee);
```

**方法 3: 启用缓存**
```typescript
// 使用 LRU 缓存
import LRU from 'lru-cache';

const cache = new LRU({ max: 100 });

function getTasks() {
  const cached = cache.get('tasks');
  if (cached) return cached;

  const tasks = await db.all('SELECT * FROM tasks');
  cache.set('tasks', tasks);
  return tasks;
}
```

---

## 🚢 部署问题

### 问题 11: Vercel 部署失败

**症状**:
```
Error: Build failed
或
Error: Deploy failed
```

**解决方案**:

**方法 1: 检查构建日志**
```bash
# 查看 Vercel Dashboard
# Deployments → 选择失败部署 → View Build Logs
```

**方法 2: 本地测试构建**
```bash
# 本地构建
pnpm build

# 检查错误
```

**方法 3: 检查环境变量**
```bash
# 在 Vercel Dashboard 中
# Settings → Environment Variables
# 确保所有变量都已配置
```

**方法 4: 更新 Node.js 版本**
```json
// package.json
{
  "engines": {
    "node": ">=22.0.0",
    "pnpm": ">=8.0.0"
  }
}

// .nvmrc
22
```

---

### 问题 12: Docker 构建失败

**症状**:
```
Error: Failed to build Docker image
```

**解决方案**:

**方法 1: 清理 Docker 缓存**
```bash
# 清理构建缓存
docker builder prune

# 清理所有缓存
docker system prune -a
```

**方法 2: 检查 Dockerfile**
```dockerfile
# 确保多阶段构建正确
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

**方法 3: 检查端口映射**
```bash
# 确保端口映射正确
docker run -p 3000:3000 7zi:latest
```

---

### 问题 13: 服务器部署失败

**症状**:
```
Error: SSH connection failed
或
Error: Deployment script failed
```

**解决方案**:

**方法 1: 检查 SSH 连接**
```bash
# 测试 SSH 连接
ssh root@7zi.com

# 检查 SSH 密钥
ssh -i ~/.ssh/id_rsa root@7zi.com
```

**方法 2: 检查部署脚本**
```bash
# 给脚本执行权限
chmod +x deploy-remote.sh

# 查看部署日志
./deploy-remote.sh logs
```

**方法 3: 检查服务器环境**
```bash
# 登录服务器
ssh root@7zi.com

# 检查 Node.js 版本
node --version

# 检查磁盘空间
df -h

# 检查内存
free -h
```

---

## 🔗 WebSocket 问题

### 问题 14: WebSocket 连接失败

**症状**:
```
WebSocket connection failed
或
Error: Connection refused
```

**解决方案**:

**方法 1: 检查服务器状态**
```bash
# 检查 Socket.IO 服务器是否运行
netstat -an | grep 3000

# 或使用 lsof
lsof -i :3000
```

**方法 2: 检查客户端配置**
```typescript
// 确保使用正确的 URL
const socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling'], // 支持 fallback
  reconnection: true,                    // 自动重连
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
```

**方法 3: 检查防火墙**
```bash
# 检查防火墙规则
sudo iptables -L -n

# 开放 WebSocket 端口（通常与 HTTP 相同）
sudo ufw allow 3000
```

---

### 问题 15: WebSocket 连接频繁断开

**症状**:
```
Socket.IO reconnecting...
或
WebSocket connection lost
```

**解决方案**:

**方法 1: 增加重连超时**
```typescript
const socket = io('http://localhost:3000', {
  reconnectionDelay: 2000,       // 重连延迟
  reconnectionDelayMax: 10000,    // 最大重连延迟
  reconnectionAttempts: 10,       // 重连次数
});
```

**方法 2: 检查网络稳定性**
```bash
# 测试网络连接
ping 7zi.com

# 测试端口连接
telnet 7zi.com 3000
```

**方法 3: 使用 ping-pong 保持连接**
```typescript
// 客户端
socket.on('connect', () => {
  // 每 30 秒发送 ping
  setInterval(() => {
    socket.emit('ping');
  }, 30000);
});

// 服务器
socket.on('ping', () => {
  socket.emit('pong');
});
```

---

## 🗄️ 数据库问题

### 问题 16: 数据库损坏

**症状**:
```
Error: Database disk image is malformed
```

**解决方案**:

**方法 1: 从备份恢复**
```bash
# 恢复备份
cp backups/backup-1711234567890-abc123.json data/database.db
```

**方法 2: 导出并重新导入**
```bash
# 导出数据
npm run db:export

# 重新导入
npm run db:import
```

**方法 3: 运行数据库修复**
```bash
# SQLite 内置修复命令
sqlite3 data/database.db "PRAGMA integrity_check;"
sqlite3 data/database.db "PRAGMA integrity_check;"
```

---

### 问题 17: 数据库查询错误

**症状**:
```
Error: no such table: tasks
或
Error: no such column: status
```

**解决方案**:

**方法 1: 运行数据库迁移**
```bash
# 运行所有迁移
pnpm run db:migrate

# 或手动执行迁移
pnpm run db:migrate:up
```

**方法 2: 检查数据库结构**
```bash
# 查看所有表
sqlite3 data/database.db ".tables"

# 查看表结构
sqlite3 data/database.db ".schema tasks"
```

**方法 3: 重新初始化数据库**
```bash
# 备份
cp data/database.db data/database.backup.db

# 删除旧数据库
rm data/database.db

# 重新初始化
pnpm run db:init
```

---

## 🔐 权限问题

### 问题 18: 403 Forbidden 错误

**症状**:
```
Error: 403 Forbidden
或
Error: Access denied
```

**解决方案**:

**方法 1: 检查用户角色**
```bash
# 使用 API 查询当前角色
curl http://localhost:3000/api/rbac/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**方法 2: 检查权限**
```bash
# 检查特定权限
curl -X POST http://localhost:3000/api/rbac/users/me/permissions/check \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"permissions": ["task:create", "user:update"]}'
```

**方法 3: 请求权限**
- 联系管理员
- 或使用 ADMIN 账户

---

### 问题 19: Token 过期

**症状**:
```
Error: 401 Unauthorized
或
Error: Invalid token
```

**解决方案**:

**方法 1: 重新登录**
```typescript
// 前端自动刷新 token
const refresh = async () => {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  });

  const { token } = await response.json();
  localStorage.setItem('token', token);
};
```

**方法 2: 检查 Token 过期时间**
```typescript
// 解码 JWT token
const token = localStorage.getItem('token');
const decoded = jwt.decode(token);
console.log(decoded.exp); // 过期时间戳

// 检查是否过期
if (Date.now() >= decoded.exp * 1000) {
  // Token 已过期
  await refresh();
}
```

---

## 📞 获取帮助

### 文档资源

- **用户指南**: [USER_GUIDE.md](./USER_GUIDE.md)
- **API 文档**: [API.md](./API.md)
- **架构文档**: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- **开发指南**: [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)
- **测试文档**: [TESTING.md](./TESTING.md)

### 获取支持

**GitHub Issues**:
- 报告 Bug: https://github.com/songzuo/7zi/issues/new?template=bug_report.md
- 功能请求: https://github.com/songzuo/7zi/issues/new?template=feature_request.md
- 问题求助: https://github.com/songzuo/7zi/issues

**邮件支持**:
- support@7zi.com

**社区讨论**:
- GitHub Discussions: https://github.com/songzuo/7zi/discussions

### 调试技巧

#### 查看控制台错误
```typescript
// 浏览器控制台
// F12 → Console

// 查看错误堆栈
console.error(error);
```

#### 查看网络请求
```typescript
// 浏览器 DevTools
// F12 → Network

// 查看 API 请求
// 检查状态码、响应时间、响应内容
```

#### 启用详细日志
```bash
# 开发环境
NODE_ENV=development pnpm dev

# 启用详细日志
DEBUG=* pnpm dev
```

---

## 📝 反馈

如果你在本文档中发现了错误或有改进建议，欢迎：

1. 提交 Issue
2. 创建 Pull Request
3. 发送邮件

---

**最后更新**: 2026-03-22
**维护者**: 7zi 团队
