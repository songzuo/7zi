# ⚡ v1.5.0 部署快速参考

**最后更新:** 2026-03-30  
**状态:** 待发布（需修复 1 个高优先级问题）

---

## 🚨 关键问题（发布前必须修复）

### 🔴 #1 JWT_SECRET 硬编码后备值

**严重程度:** 🔴 高  
**修复时间:** 30分钟  
**位置:** `src/lib/auth/jwt.ts` 和 `src/features/auth/lib/jwt.ts`

**快速修复:**
```typescript
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET must be set in production');
    }
    return 'development-secret-change-in-production';
  })()
);
```

**详细修复指南:** 查看 `fix-jwt-secret.patch`

---

## ⚙️ 配置优化（推荐）

### 1. Docker 内存限制

**当前:** 512MB  
**推荐:** 1024MB (1GB)

```bash
cp docker-compose.prod.optimized.yml docker-compose.prod.yml
```

### 2. 日志轮转

**文件:** `docker-compose.prod.optimized.yml`
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### 3. Redis Rate Limiting（可选）

```bash
# .env.production
REDIS_URL=redis://localhost:6379
```

---

## 🚀 一键部署

```bash
# 标准部署（推荐）
./deploy.sh 7zi-frontend:v1.5.0

# 跳过健康检查（紧急情况）
./deploy.sh 7zi-frontend:v1.5.0 true
```

**部署脚本功能:**
- ✅ JWT_SECRET 安全检查
- ✅ 环境变量验证
- ✅ 自动构建镜像
- ✅ 蓝绿部署
- ✅ 健康检查
- ✅ 错误处理

---

## 📋 部署前检查

```bash
# 1. 检查环境变量
grep JWT_SECRET /root/.env.production

# 2. 验证 JWT_SECRET 长度
JWT_SECRET=$(grep "^JWT_SECRET=" /root/.env.production | cut -d'=' -f2)
echo "JWT_SECRET length: ${#JWT_SECRET}"
# 应该 >= 64 字符

# 3. 测试 Docker 配置
docker-compose -f docker-compose.prod.yml config

# 4. 检查健康端点
curl https://7zi.com/api/health
```

---

## 🔄 回滚

```bash
# 快速回滚
./scripts/deploy/rollback.sh

# 手动回滚
docker stop 7zi-frontend-blue
docker start 7zi-frontend-green-backup
```

---

## 📊 监控

```bash
# 查看日志
docker logs -f 7zi-frontend-blue

# 查看资源使用
docker stats 7zi-frontend-blue

# 运行监控脚本
./scripts/deploy/monitor.sh
```

---

## 📁 文档清单

| 文档 | 用途 |
|------|------|
| `DEPLOY_CHECKLIST_v150.md` | 完整部署检查清单 |
| `SECURITY_AUDIT_v150.md` | 安全审计报告 |
| `DEPLOYMENT_SECURITY_REPORT_v150.md` | 完成报告 |
| `fix-jwt-secret.patch` | JWT_SECRET 修复指南 |
| `deploy.sh` | 一键部署脚本 |
| `docker-compose.prod.optimized.yml` | 优化的 Docker 配置 |

---

## ✅ 发布检查清单

- [ ] 修复 JWT_SECRET 硬编码（30分钟）
- [ ] 更新 docker-compose.prod.yml（5分钟）
- [ ] 验证所有环境变量（10分钟）
- [ ] 运行 ./deploy.sh 安全检查（5分钟）
- [ ] 执行部署（10分钟）
- [ ] 验证健康检查（5分钟）
- [ ] 监控日志输出（持续）

**总计时间:** 约 1.5 小时

---

## 🆘 应急联系人

- **技术负责人:** [待填写]
- **运维支持:** [待填写]
- **紧急回滚命令:** `./scripts/deploy/rollback.sh`

---

## 📈 发布后指标

### 健康指标
- 健康状态: `healthy`
- 响应时间: < 100ms
- CPU 使用: < 80%
- 内存使用: < 80%

### 功能检查
- [ ] 用户登录/注册
- [ ] API 响应
- [ ] WebSocket 连接
- [ ] 文件上传
- [ ] 搜索功能

### 监控检查
- [ ] Sentry 无错误
- [ ] 日志正常输出
- [ ] 资源使用正常

---

**快速参考版本:** v1.0  
**更新日期:** 2026-03-30
