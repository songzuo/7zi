# 部署优化指南

## 部署架构

本项目的生产部署架构为：

```
用户 → Nginx (443) → PM2 Cluster (3000) → Next.js SSR
```

## 1. PM2 配置优化

### 当前问题

- PM2 使用 `npm start`，但服务器构建缺少 `standalone` 输出
- 重启次数过多（2862次）说明启动配置有问题

### 解决方案

#### 选项 A: 使用 Standalone 模式 (推荐)

在 `next.config.ts` 中已配置 `output: 'standalone'`。

**PM2 ecosystem.config.production.js:**

```javascript
{
  script: '.next/standalone/server.js',
  instances: 'max',
  exec_mode: 'cluster',
}
```

**构建后需要复制文件：**

```bash
# 在服务器上执行
cd /var/www/7zi
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/
```

#### 选项 B: 使用 npm start (兼容模式)

如果 standalone 有问题，可以继续使用 npm start：

```javascript
{
  script: 'npm',
  args: 'start',
  instances: 'max',
  exec_mode: 'cluster',
}
```

## 2. 日志轮转配置

### 安装 logrotate

```bash
# 复制配置到系统
sudo cp logrotate.conf /etc/logrotate.d/7zi-frontend

# 测试配置
sudo logrotate -d /etc/logrotate.d/7zi-frontend

# 手动执行轮转
sudo logrotate -f /etc/logrotate.d/7zi-frontend
```

### 创建日志目录

```bash
sudo mkdir -p /var/log/7zi-frontend
sudo chmod 755 /var/log/7zi-frontend
```

## 3. Nginx 配置

### 使用 SSR 优化版配置

```bash
# 复制配置
sudo cp nginx/7zi-ssr.conf /etc/nginx/sites-available/7zi.conf
sudo ln -sf /etc/nginx/sites-available/7zi.conf /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载配置
sudo nginx -s reload
```

## 4. 部署流程

### 完整部署命令

```bash
# 在本地项目目录执行
./deploy-production.sh deploy
```

### 手动部署步骤

```bash
# 1. 本地构建
npm run build

# 2. 同步到服务器
rsync -avz --exclude 'node_modules' --exclude '.next/cache' ./ root@7zi.com:/var/www/7zi/

# 3. 在服务器上安装依赖
ssh root@7zi.com "cd /var/www/7zi && npm ci --production"

# 4. 在服务器上构建（如果需要）
ssh root@7zi.com "cd /var/www/7zi && npm run build"

# 5. 复制 standalone 静态文件（如果使用 standalone）
ssh root@7zi.com "cd /var/www/7zi && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/"

# 6. 启动/重载 PM2
ssh root@7zi.com "cd /var/www/7zi && pm2 reload ecosystem.config.production.js --env production"

# 7. 保存 PM2 配置
ssh root@7zi.com "pm2 save"

# 8. 健康检查
curl -sf https://7zi.com/health
```

## 5. 监控与维护

### PM2 监控

```bash
# 查看状态
pm2 list

# 查看详情
pm2 show 7zi-frontend

# 查看日志
pm2 logs 7zi-frontend

# 监控面板
pm2 monit
```

### 日志管理

```bash
# 清理日志
pm2 flush

# 重载日志（轮转后）
pm2 reloadLogs
```

### 性能调优

1. **实例数量**: 根据 CPU 核心数调整 `instances`
2. **内存限制**: 调整 `max_memory_restart`
3. **超时时间**: 根据应用启动时间调整 `listen_timeout`

## 6. 故障排查

### 常见问题

1. **MODULE_NOT_FOUND 错误**
   - 原因: standalone 输出文件不完整
   - 解决: 重新构建并复制静态文件

2. **频繁重启**
   - 原因: `min_uptime` 设置太短或应用启动失败
   - 解决: 检查启动日志，调整超时配置

3. **内存泄漏**
   - 原因: 代码问题或依赖问题
   - 解决: 使用 `pm2 monit` 监控，设置合理的 `max_memory_restart`

### 紧急回滚

```bash
# 回滚到上一版本
./deploy-production.sh rollback
```
