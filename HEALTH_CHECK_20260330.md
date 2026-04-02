# 7zi.com 健康检查报告

**检查时间**: 2026-03-30 01:07 GMT+2
**服务器**: 165.99.43.61 (7zi.com)
**检查员**: 🛡️ 系统管理员

---

## 📊 总体状态

| 检查项   | 状态    | 说明                      |
| -------- | ------- | ------------------------- |
| Docker   | ✅ 正常 | 运行中 (5天运行时间)      |
| Nginx    | ✅ 正常 | 运行中 (今日 05:49 重启)  |
| 应用服务 | ✅ 正常 | Next.js 运行在端口 3000   |
| 网站访问 | ✅ 正常 | HTTPS 可访问 (307 重定向) |
| SSL 证书 | ✅ 有效 | 有效期至 2026-05-14       |
| 磁盘空间 | ⚠️ 警告 | 使用率 82% (72G/88G)      |
| 内存使用 | ✅ 正常 | 2.5GB/7.8GB (32%)         |
| CPU 负载 | ✅ 正常 | 平均负载 0.16             |

---

## 🔍 详细检查结果

### 1. 服务状态

#### Docker

- **状态**: Active (running)
- **运行时间**: 5 days (自 2026-03-24 08:47:41)
- **内存占用**: 958.2M
- **容器数量**: 0 (无 Docker 容器运行)

#### Nginx

- **状态**: Active (running)
- **运行时间**: 1 day 17h (自 2026-03-28 13:58:01)
- **最后重启**: 2026-03-30 05:49:53
- **内存占用**: 25.5M
- **工作进程**: 8 个 worker 进程

#### 应用服务 (Next.js)

- **状态**: 运行中
- **运行方式**: `npm exec next start /var/www/7zi -p 3000`
- **端口**: 3000
- **进程 ID**: 3638734
- **版本**: Next.js v16.2.1
- **启动时间**: 2026-03-30 05:49

---

### 2. 网络与访问性

#### 网站测试

```
HTTPS 访问: ✅ 正常
HTTP 状态码: 307 (临时重定向到 /zh)
响应时间: 0.86 秒
SSL 证书: 有效 (至 2026-05-14)
```

#### Nginx 配置

- **监听端口**: 80 (HTTP), 443 (HTTPS)
- **SSL 配置**: 正确 (TLSv1.2, TLSv1.3)
- **代理配置**: `proxy_pass http://127.0.0.1:3000` ✅
- **安全头配置**: HSTS, X-Frame-Options, CSP 等 ✅

---

### 3. 系统资源

#### 磁盘使用

```
Filesystem: /dev/vda1
总容量: 88G
已使用: 72G (82%)
可用: 16G
```

**⚠️ 建议**: 磁盘使用率较高，建议清理日志文件或扩容

#### 内存使用

```
总内存: 7.8GB
已使用: 2.5GB
可用: 4.9GB
缓冲/缓存: 4.9GB
Swap: 未使用
```

#### CPU 负载

```
当前负载: 0.16, 0.16, 0.14
系统运行时间: 5 days, 22:19
```

---

### 4. 日志检查

#### Nginx 错误日志

**主要问题**:

1. **IPv6 上游连接失败** (非关键)
   - 连接到 `[2001:67c:4e8:f004::9]:443` 失败
   - 影响: 端口 8080 的代理服务
   - 建议: 检查 IPv6 配置或禁用 IPv6 上游

2. **配置警告** (非关键)
   - `conflicting server name` 警告
   - 影响: 多个配置文件使用相同 server_name
   - 建议: 清理重复的 server 配置

#### 应用日志

- **PM2 管理**: ❌ 未使用 PM2 管理应用
- **运行方式**: 直接使用 npm exec
- **建议**: 考虑使用 PM2 或 systemd 管理应用

---

### 5. 文件系统

#### 项目目录

```
/var/www/7zi/ - 主项目目录
  ├── .next/ (Next.js 构建输出)
  ├── .next.broken/ (构建备份)
  ├── .env.production (生产环境配置)
  └── package.json
```

#### Nginx 站点配置

- **主配置**: `/etc/nginx/sites-available/7zi.com`
- **SSL 证书**: `/web/ssl_unified/7zi.com.crt`
- **SSL 密钥**: `/web/ssl_unified/7zi.com.key`

---

## 🎯 建议

### 🔴 紧急

无

### 🟡 重要

1. **磁盘空间清理**
   - 清理 Docker 镜像和容器缓存 (即使当前无容器运行)
   - 清理旧的日志文件
   - 清理 Next.js 构建备份 (.next.broken)

2. **Nginx 配置优化**
   - 修复 IPv6 上游连接问题
   - 清理重复的 server_name 配置

3. **进程管理**
   - 考虑使用 PM2 或 systemd 管理 Next.js 应用
   - 配置自动重启策略

### 🟢 可选

1. 监控设置 - 配置磁盘使用率告警 (>90%)
2. 日志轮转 - 设置 Nginx 和应用日志自动清理
3. 性能优化 - 考虑使用 Docker 容器化应用

---

## 📝 检查命令记录

```bash
# Docker 状态
ssh root@7zi.com "systemctl status docker --no-pager"

# Nginx 状态
ssh root@7zi.com "systemctl status nginx --no-pager"

# Docker 容器
ssh root@7zi.com "docker ps -a"

# 磁盘空间
ssh root@7zi.com "df -h"

# 内存和负载
ssh root@7zi.com "free -h && uptime"

# Nginx 错误日志
ssh root@7zi.com "tail -50 /var/log/nginx/error.log"

# SSL 证书有效期
ssh root@7zi.com "openssl x509 -in /web/ssl_unified/7zi.com.crt -noout -dates"

# 网站访问测试
curl -sI https://7zi.com
```

---

**报告完成时间**: 2026-03-30 01:07 GMT+2
**下次检查建议**: 2026-04-06 (一周后)
