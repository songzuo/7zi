# 故障排查指南

**版本:** 1.0.0  
**更新日期:** 2026-05-09  
**适用版本:** 7zi-frontend v1.14.2+ / Next.js 16.2 / React 19.2

---

## 📋 目录

1. [快速诊断流程](#一快速诊断流程)
2. [常见部署错误及解决方案](#二常见部署错误及解决方案)
3. [常见运行时错误及解决方案](#三常见运行时错误及解决方案)
4. [日志查看方法](#四日志查看方法)
5. [回滚步骤](#五回滚步骤)
6. [联系支持信息](#六联系支持信息)

---

## 一、快速诊断流程

### 1.1 系统状态检查清单

发现问题时，按以下顺序快速检查：

```
□ 1. 检查服务可访问性
  └─ curl -I https://7zi.com  (预期: HTTP 200)

□ 2. 检查 PM2 进程状态
  └─ pm2 status
  └─ pm2 list

□ 3. 检查端口占用
  └─ lsof -i :3000   (Next.js)
  └─ lsof -i :8080   (Evomap Gateway)
  └─ lsof -i :2000   (API Gateway)

□ 4. 检查系统资源
  └─ df -h /opt      (磁盘空间)
  └─ free -h          (内存)
  └─ node --version  (Node.js 版本)

□ 5. 检查日志
  └─ pm2 logs 7zi-frontend --lines 50
  └─ pm2 logs evomap-gateway --lines 50
```

### 1.2 当前系统已知问题 (2026-05-09)

| 问题 | 状态 | 说明 |
|------|------|------|
| API token 阻塞 | 🔴 严重 | 188+小时阻塞，需主人处理 |
| PM2 Next.js 未运行 | ⚠️ 注意 | 网站通过 Nginx/Docker 正常访问 |
| Git 未提交文件 | ⚠️ 注意 | 27 个文件待提交 |

---

## 二、常见部署错误及解决方案

### 2.1 PM2 重启次数过多

**症状:** `pm2 restarts` 显示次数持续增加，进程不稳定

**排查命令:**
```bash
# 查看详细错误日志
pm2 logs 7zi-frontend --lines 100 --err

# 查看进程状态
pm2 status
pm2 show 7zi-frontend
```

**常见原因及解决方案:**

| 原因 | 解决方案 |
|------|----------|
| **内存不足** | 增加 `max_memory_restart` 配置，或增加服务器内存 |
| **端口被占用** | `lsof -i :3000` 检查端口，杀掉占用进程 |
| **代码错误** | 检查错误日志，定位问题代码 |
| **环境变量缺失** | 确认 `.env.production` 文件存在且配置正确 |
| **依赖缺失** | `pnpm install` 重新安装依赖 |

**修复步骤:**
```bash
# 1. 停止问题进程
pm2 stop 7zi-frontend

# 2. 清理缓存
rm -rf /opt/7zi-frontend/.next
rm -rf /opt/7zi-frontend/node_modules/.cache

# 3. 重新安装依赖
cd /opt/7zi-frontend
pnpm install

# 4. 重新构建
pnpm build

# 5. 重启
pm2 start ecosystem.config.js
```

### 2.2 构建失败 (Build Failed)

**症状:** `pnpm build` 命令失败

**排查命令:**
```bash
# 完整构建日志
cd /opt/7zi-frontend
pnpm build 2>&1 | head -100
```

**常见原因及解决方案:**

| 原因 | 解决方案 |
|------|----------|
| **TypeScript 编译错误** | `pnpm tsc --noEmit` 检查类型错误 |
| **依赖冲突** | 删除 `node_modules` 和 `pnpm-lock.yaml`，重新 `pnpm install` |
| **Turbopack 问题** | `rm -rf .next`，使用 SWC 构建 |
| **React Compiler 错误** | 设置 `ENABLE_REACT_COMPILER=false` 禁用 |
| **磁盘空间不足** | `df -h` 检查，至少需要 2GB 空间 |

**修复步骤:**
```bash
# 1. 清理构建缓存
cd /opt/7zi-frontend
rm -rf .next
rm -rf node_modules/.cache

# 2. 检查 TypeScript
pnpm tsc --noEmit

# 3. 重新构建 (禁用 Turbopack)
NEXT_DISABLE_TURBOPACK=1 pnpm build

# 或使用传统构建
rm -rf .next
pnpm build
```

### 2.3 依赖安装失败

**症状:** `pnpm install` 报错

**排查命令:**
```bash
# 查看详细错误
pnpm install 2>&1

# 检查 Node.js 版本
node --version  # 需 >= 22.x

# 检查 pnpm 版本
pnpm --version  # 需 >= 9.x
```

**解决方案:**
```bash
# 1. 清理缓存
pnpm store prune

# 2. 删除 lock 文件后重试
rm pnpm-lock.yaml
pnpm install

# 3. 如仍失败，使用 --force
pnpm install --force
```

### 2.4 环境变量配置错误

**症状:** 服务启动但功能异常（如 AI 模型不工作）

**排查命令:**
```bash
# 检查环境变量
grep -E "API_KEY|JWT_SECRET|EVOMAP" /opt/7zi-frontend/.env.production

# 验证关键变量
echo $NODE_ENV
echo $NEXT_PUBLIC_API_URL
```

**必需的环境变量:**
```bash
# .env.production
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://7zi.com/api
NEXT_PUBLIC_WS_URL=wss://7zi.com/ws

# AI 模型配置 (至少需要一个)
OPENAI_API_KEY=your-key
# ANTHROPIC_API_KEY=your-key
# GOOGLE_API_KEY=your-key
# DEEPSEEK_API_KEY=your-key

# JWT 配置
JWT_SECRET=your-secret-key-min-32-chars

# Evomap Gateway
EVOMAP_GATEWAY_URL=http://localhost:8080
EVOMAP_NODE_ID=7zi-frontend-node
```

---

## 三、常见运行时错误及解决方案

### 3.1 API 错误类型

基于 `ERROR_HANDLING_GUIDE.md` 的标准化错误类型：

| 错误类型 | HTTP 状态码 | 说明 | 常见原因 |
|----------|-------------|------|----------|
| `VALIDATION_ERROR` | 400 | 输入验证失败 | 字段缺失、格式错误 |
| `NOT_FOUND` | 404 | 资源不存在 | 错误的 ID、已删除 |
| `UNAUTHORIZED` | 401 | 未认证 | token 缺失、过期 |
| `FORBIDDEN` | 403 | 无权限 | 权限不足 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求过于频繁 | 限流触发 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 | 代码 bug |
| `SERVICE_UNAVAILABLE` | 503 | 服务不可用 | 维护、宕机 |
| `WEAK_PASSWORD` | 400 | 密码强度不足 | 密码不符合要求 |
| `REGISTRATION_FAILED` | 400 | 注册失败 | 邮箱已存在 |

### 3.2 前端组件错误

**症状:** 页面加载白屏或显示错误组件

**排查步骤:**
```bash
# 1. 打开浏览器开发者工具 (F12)
# 2. 查看 Console 标签页的错误
# 3. 查看 Network 标签页的 API 响应
```

**ErrorBoundaryWrapper 错误提示:**

| 错误类型 | 原因 | 解决方案 |
|----------|------|----------|
| `network` | 网络连接问题 | 检查网络、刷新页面 |
| `not-found` | 404 错误 | 检查 URL 是否正确 |
| `unauthorized` | 未登录 | 重新登录 |
| `server` | 500 错误 | 查看服务端日志 |
| `generic` | 通用错误 | 刷新页面或联系支持 |

**错误恢复操作:**
```tsx
// 用户可执行的恢复操作
<ErrorBoundaryWrapper 
  showReset={true}          // 显示重试按钮
  onReset={() => refetch()} // 自定义重试逻辑
  showHomeButton={true}     // 显示返回首页按钮
>
  <YourComponent />
</ErrorBoundaryWrapper>
```

### 3.3 WebSocket 连接错误

**症状:** 实时功能不工作（聊天、通知等）

**排查步骤:**
```bash
# 1. 检查 WebSocket 服务
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  https://7zi.com/ws

# 2. 检查连接状态
# 浏览器 Console: 
#   window.ws?.readyState

# 3. 查看相关日志
pm2 logs 7zi-frontend --lines 50 | grep -i websocket
```

**常见问题及解决:**

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 连接被拒绝 | 服务未启动 | `pm2 restart 7zi-frontend` |
| 连接超时 | 网络问题 | 检查防火墙、负载均衡配置 |
| 401 Unauthorized | token 过期 | 重新获取 token |
| 间歇性断开 | 空闲超时 | 配置心跳保活 |

### 3.4 数据库/存储错误

**症状:** 数据无法读取或保存

**排查步骤:**
```bash
# 检查数据库连接
curl http://localhost:3000/api/health

# 查看数据库日志
cat /opt/7zi-frontend/logs/error.log | grep -i database

# 检查数据库文件权限
ls -la /opt/7zi-frontend/*.db 2>/dev/null || echo "No local DB"
```

### 3.5 Evomap Gateway 连接问题

**症状:** Evomap 相关功能不可用

**排查步骤:**
```bash
# 1. 检查 Gateway 健康状态
curl http://localhost:8080/health

# 2. 检查节点注册状态
curl http://localhost:8080/api/node/status

# 3. 查看 Gateway 日志
pm2 logs evomap-gateway --lines 50

# 4. 检查环境变量
grep EVOMAP /opt/7zi-frontend/.env
```

**常见问题:**

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 连接被拒绝 | Gateway 未启动 | `pm2 start ecosystem.config.js --only evomap-gateway` |
| 注册失败 | Hub URL 配置错误 | 检查 `EVOMAP_HUB_URL` |
| 心跳失败 | 网络不通 | 检查防火墙、代理设置 |
| Token 过期 | Token 失效 | 更新 Evomap Hub Token |

---

## 四、日志查看方法

### 4.1 PM2 日志

```bash
# 查看所有日志 (stdout + stderr)
pm2 logs

# 查看特定应用日志
pm2 logs 7zi-frontend
pm2 logs evomap-gateway

# 查看错误日志
pm2 logs 7zi-frontend --err

# 查看最近日志
pm2 logs 7zi-frontend --lines 100
pm2 logs 7zi-frontend --lines 100 --nostream

# 实时跟踪日志
pm2 logs 7zi-frontend --f

# 日志轮转配置 (在 ecosystem.config.js 中)
error_file: '/opt/7zi-frontend/logs/error.log',
out_file: '/opt/7zi-frontend/logs/out.log',
```

### 4.2 日志文件位置

| 类型 | 路径 | 说明 |
|------|------|------|
| PM2 stdout | `/opt/7zi-frontend/logs/out.log` | 应用输出 |
| PM2 stderr | `/opt/7zi-frontend/logs/error.log` | 错误输出 |
| Evomap Gateway | `/opt/7zi-frontend/logs/evomap-out.log` | Gateway 输出 |
| Evomap Error | `/opt/7zi-frontend/logs/evomap-error.log` | Gateway 错误 |
| Next.js | `.next/trace` | 构建追踪 |
| System | `/var/log/syslog` | 系统日志 |

### 4.3 日志分析技巧

```bash
# 搜索错误关键词
grep -i "error\|exception\|failed" /opt/7zi-frontend/logs/error.log

# 查看最近 1 小时的错误
journalctl --since "1 hour ago" | grep 7zi

# 统计错误类型
cat /opt/7zi-frontend/logs/error.log | \
  grep -oE '\[ERROR\]|\[WARN\]|\[INFO\]' | \
  sort | uniq -c

# 实时监控错误
tail -f /opt/7zi-frontend/logs/error.log | grep ERROR
```

### 4.4 生产环境日志安全

**⚠️ 重要:** 生产环境日志必须脱敏

```bash
# 生产环境禁止记录的内容
# - 密码、API Keys、Tokens
# - 个人身份信息 (PII)
# - 完整的错误堆栈 (仅调试模式)
# - 数据库查询语句中的敏感数据

# 检查日志中是否有敏感信息
grep -iE "password|token|key|secret" /opt/7zi-frontend/logs/*.log
```

---

## 五、回滚步骤

### 5.1 自动回滚 (推荐)

当部署出现问题时，按以下步骤回滚：

```bash
# 1. 查看 Git 历史，找到上一个稳定版本
cd /opt/7zi-frontend
git log --oneline -10

# 2. 切换到上一个版本
git checkout <previous-version-tag>
# 例如: git checkout v1.14.1

# 3. 重新构建
pnpm build

# 4. 重启所有服务
pm2 restart all

# 5. 验证服务状态
pm2 status
curl -I http://localhost:3000/health
```

### 5.2 手动回滚 (使用备份)

当自动回滚不可用时，使用备份恢复：

```bash
# 1. 停止所有服务
pm2 stop all

# 2. 查找最近的备份
ls -la /opt/ | grep 7zi-frontend.backup

# 3. 恢复备份
rm -rf /opt/7zi-frontend
mv /opt/7zi-frontend.backup-YYYYMMDD-HHMMSS /opt/7zi-frontend

# 4. 恢复环境变量
cp /opt/7zi-frontend.backup-YYYYMMDD-HHMMSS/.env.production \
   /opt/7zi-frontend/.env.production 2>/dev/null || true

# 5. 重启服务
cd /opt/7zi-frontend
pm2 start ecosystem.config.js

# 6. 验证
pm2 status
curl http://localhost:3000/health
```

### 5.3 数据库回滚

```bash
# 1. 备份当前数据库
cp /opt/7zi-frontend/api-gateway.db \
   /opt/7zi-frontend/backups/api-gateway.db.$(date +%Y%m%d-%H%M%S)

# 2. 查看迁移历史
pnpm db:migrate:status
# 或
alembic history

# 3. 回滚到指定版本
pnpm db:rollback
# 或
alembic downgrade -1

# 4. 验证回滚
pnpm db:migrate:status
```

### 5.4 部分回滚 (仅前端/仅 Gateway)

```bash
# 仅回滚前端 (Next.js)
pm2 stop 7zi-frontend
git checkout <version>
pnpm build
pm2 start ecosystem.config.js --only 7zi-frontend

# 仅回滚 Evomap Gateway
pm2 stop evomap-gateway
git checkout <version>
pm2 start ecosystem.config.js --only evomap-gateway
```

### 5.5 回滚后验证清单

- [ ] `pm2 status` 显示进程运行中
- [ ] `curl http://localhost:3000/health` 返回 200
- [ ] `curl http://localhost:8080/health` 返回 200 (Gateway)
- [ ] 网站首页可正常访问
- [ ] 核心功能 (登录、AI 模型) 正常工作
- [ ] 无新增错误日志

---

## 六、联系支持信息

### 6.1 内部支持

| 团队 | 邮箱 | 职责 |
|------|------|------|
| **运维团队** | ops@7zi.com | 部署、服务器、基础设施 |
| **开发团队** | dev@7zi.com | 代码问题、功能实现 |
| **安全团队** | security@7zi.com | 安全事件、漏洞报告 |

### 6.2 外部支持

| 服务 | 联系渠道 | 用途 |
|------|----------|------|
| **Vercel (Next.js)** | Vercel Dashboard | Next.js 托管支持 |
| **Cloudflare** | Cloudflare Dashboard | CDN、DNS、SSL 问题 |
| **PM2** | GitHub Issues | 进程管理问题 |

### 6.3 紧急联系流程

```
紧急问题 (网站完全不可用):
  1. 检查 PM2 状态: pm2 status
  2. 查看错误日志: pm2 logs --lines 100 --err
  3. 联系运维团队: ops@7zi.com
  4. 如需回滚，执行 5.2 手动回滚步骤

安全问题 (数据泄露、攻击):
  1. 立即隔离受影响服务
  2. 联系安全团队: security@7zi.com
  3. 不要自行修复，等待安全团队指示
```

### 6.4 反馈问题模板

报告问题时，请提供以下信息：

```markdown
## 问题报告

### 环境信息
- 服务器: 7zi.com
- 应用版本: v1.14.2
- Node.js: v22.x
- PM2 状态: [运行/停止]

### 问题描述
[清晰描述问题]

### 复现步骤
1. 
2. 
3. 

### 错误日志
```
[粘贴相关日志]
```

### 已尝试的解决步骤
1. 
2. 

### 影响范围
- 受影响功能:
- 受影响用户:
```

---

## 附录 A：错误代码速查表

| 错误代码 | HTTP | 说明 | 快速解决 |
|----------|------|------|----------|
| EADDRINUSE | - | 端口被占用 | `lsof -i :PORT` 杀掉进程 |
| ECONNREFUSED | - | 连接被拒绝 | 检查目标服务是否启动 |
| ENOENT | - | 文件不存在 | 检查文件路径、权限 |
| ETIMEDOUT | - | 连接超时 | 检查网络、防火墙 |
| 401 | 401 | 未认证 | 重新登录获取 token |
| 403 | 403 | 无权限 | 联系管理员授权 |
| 404 | 404 | 资源不存在 | 检查 API URL |
| 429 | 429 | 请求限流 | 等待后重试 |
| 500 | 500 | 服务器错误 | 查看服务端日志 |
| 502 | 502 | 网关错误 | 检查后端服务状态 |
| 503 | 503 | 服务不可用 | 服务可能维护中 |

---

## 附录 B：健康检查端点

```bash
# Next.js 健康检查
curl http://localhost:3000/health

# API 健康检查
curl http://localhost:3000/api/health

# Evomap Gateway 健康检查
curl http://localhost:8080/health

# Evomap 节点状态
curl http://localhost:8080/api/node/status

# PM2 状态 (服务器上)
pm2 status
pm2 list
```

---

**文档版本:** 1.0.0  
**维护者:** AI 系统管理员  
**最后更新:** 2026-05-09