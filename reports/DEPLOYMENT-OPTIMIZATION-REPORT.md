# 7zi-frontend 部署优化报告

## 执行时间

2026-03-07 07:50 UTC

## 一、当前部署状态

### 1. 服务器状态

- **服务器**: 7zi.com (165.99.43.61)
- **网站状态**: ✅ 正常运行 (HTTP 200)
- **端口**: 3000 (Next.js), 3010 (Next.js - 主服务)
- **Nginx**: ✅ 正常代理到 3010 端口

### 2. PM2 状态

- **应用名**: 7zi
- **状态**: ❌ errored (重启次数: 2862)
- **问题**: 配置指向 `.next/standalone/server.js`，但文件不存在
- **实际服务**: 通过其他方式在 3010 端口运行

### 3. 文件状态

- **项目路径**: `/var/www/7zi`
- **.next 目录**: ✅ 存在
- **standalone 目录**: ❌ 不存在（需要重新构建）
- **日志目录**: ❌ 未配置专用日志目录

---

## 二、发现的问题

### 🔴 严重问题

1. **PM2 配置与构建不匹配**
   - PM2 配置使用 standalone 模式
   - 服务器上没有构建 standalone 输出
   - 导致应用频繁重启（2862 次）

2. **缺少日志轮转配置**
   - 没有配置 logrotate
   - 日志文件可能无限增长

### 🟡 中等问题

3. **端口配置不一致**
   - Nginx 代理到 3010
   - PM2 配置 3000
   - 当前服务在 3010 运行

4. **缺少 ecosystem.config.js**
   - 服务器上没有 ecosystem 配置文件
   - PM2 使用临时配置

---

## 三、已创建的优化文件

### 1. ecosystem.config.production.js

- ✅ 优化了 PM2 配置
- ✅ 支持 standalone 和 npm start 两种模式
- ✅ 添加了日志路径配置
- ✅ 添加了健康检查和优雅关闭

### 2. logrotate.conf

- ✅ 日志轮转配置
- ✅ 每日轮转，保留 14 天
- ✅ 自动压缩旧日志
- ✅ PM2 日志重新加载

### 3. nginx/7zi-ssr.conf

- ✅ Next.js SSR 优化配置
- ✅ 静态资源缓存策略
- ✅ 安全头配置
- ✅ Gzip 压缩优化

### 4. DEPLOYMENT-OPTIMIZATION.md

- ✅ 完整部署指南
- ✅ 故障排查指南
- ✅ 维护命令参考

---

## 四、推荐操作

### 立即执行

```bash
# 1. 停止错误的 PM2 进程
ssh root@7zi.com "pm2 stop 7zi && pm2 delete 7zi"

# 2. 安装日志轮转配置
ssh root@7zi.com "cat > /etc/logrotate.d/7zi-frontend" < logrotate.conf

# 3. 确保当前服务继续运行
ssh root@7zi.com "cd /var/www/7zi && PORT=3010 npm start &"
```

### 完整修复（推荐）

```bash
# 方案 A: 使用 npm start 模式（简单）
ssh root@7zi.com "
cd /var/www/7zi
pm2 delete 7zi 2>/dev/null || true
pm2 start npm --name '7zi-frontend' -- start -- -p 3010
pm2 save
"

# 方案 B: 使用 standalone 模式（推荐，更高效）
# 1. 先在本地或服务器重新构建
cd ~/7zi-project/7zi-frontend
npm run build

# 2. 同步到服务器
rsync -avz --exclude 'node_modules' ./ root@7zi.com:/var/www/7zi/

# 3. 复制静态文件
ssh root@7zi.com "
cd /var/www/7zi
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/
PORT=3010 pm2 start .next/standalone/server.js --name 7zi-frontend
pm2 save
"
```

---

## 五、配置对比

### PM2 配置优化

| 项目               | 优化前  | 优化后                 |
| ------------------ | ------- | ---------------------- |
| instances          | max     | max（保持）            |
| exec_mode          | fork    | cluster                |
| max_memory_restart | 500M    | 500M（保持）           |
| listen_timeout     | 3000ms  | 10000ms                |
| kill_timeout       | 5000ms  | 10000ms                |
| wait_ready         | 无      | true                   |
| min_uptime         | 无      | 10s                    |
| log_dir            | PM2默认 | /var/log/7zi-frontend/ |

### Nginx 优化

| 项目         | 优化前 | 优化后     |
| ------------ | ------ | ---------- |
| 缓存策略     | 基础   | 分类型优化 |
| 安全头       | 部分   | 完整       |
| Gzip         | 基础   | 完整类型   |
| HTTP/2       | ✅     | ✅         |
| 静态资源缓存 | 无     | 1年        |

---

## 六、维护建议

### 定期检查

```bash
# 查看服务状态
pm2 list
pm2 monit

# 查看日志
pm2 logs 7zi-frontend --lines 100

# 查看内存使用
pm2 show 7zi-frontend
```

### 日志管理

```bash
# 手动清理日志
pm2 flush

# 测试日志轮转
logrotate -d /etc/logrotate.d/7zi-frontend
```

---

## 七、文件位置

- **本地项目**: `~/7zi-project/7zi-frontend/`
- **服务器项目**: `/var/www/7zi/`
- **服务器日志**: `/var/log/7zi-frontend/`
- **Nginx 配置**: `/etc/nginx/sites-available/7zi.com.conf`

---

## 八、后续建议

1. **监控**: 考虑添加 PM2 Plus 或类似监控服务
2. **备份**: 配置自动备份策略
3. **CI/CD**: 使用 GitHub Actions 自动部署
4. **SSL**: 考虑使用 Let's Encrypt 自动续期

---

_报告生成: 2026-03-07_
_系统管理员: AI Sub-agent_
