# 部署检查清单

> 每次部署前后需要检查的项目

## 📋 Pre-deployment 检查

### 代码质量

| 检查项 | 命令 | 通过标准 |
|--------|------|----------|
| ESLint | `npm run lint` | 无错误 |
| TypeScript | `npm run type-check` | 无错误 |
| 格式化 | `npm run format:check` | 无差异 |
| 单元测试 | `npm run test:run` | 全部通过 |
| 覆盖率 | `npm run test:coverage` | ≥50% |

### 构建验证

```bash
# 本地构建测试
npm run build

# 检查构建产物
ls -la .next/standalone/
ls -la .next/static/
ls -la public/

# 检查构建大小
du -sh .next/standalone/
```

| 检查项 | 通过标准 |
|--------|----------|
| standalone 目录存在 | ✅ |
| static 目录存在 | ✅ |
| public 目录存在 | ✅ |
| server.js 存在 | ✅ |
| 构建大小 < 500MB | ✅ |

### 安全检查

```bash
# 检查敏感文件
find . -name "*.env*" -not -path "./node_modules/*"
find . -name "*.pem" -not -path "./node_modules/*"
find . -name "*.key" -not -path "./node_modules/*"

# 检查 .gitignore 包含敏感文件
grep -E "\.env|\.pem|\.key" .gitignore
```

| 检查项 | 通过标准 |
|--------|----------|
| 无 .env 文件在构建中 | ✅ |
| 无私钥/证书在构建中 | ✅ |
| .gitignore 配置正确 | ✅ |

### 环境变量检查

```bash
# 检查生产环境变量文件
cat .env.production

# 确保必要变量存在
grep -E "NEXT_PUBLIC_|API_URL|DATABASE" .env.production
```

| 必要变量 | 描述 |
|----------|------|
| `NEXT_PUBLIC_API_URL` | API 地址 |
| `NODE_ENV` | 设为 production |

---

## 🚀 Deployment 检查

### Staging 部署

```bash
# SSH 到 staging 服务器
ssh user@staging.7zi.com

# 进入项目目录
cd /opt/7zi-frontend

# 拉取最新代码
git pull origin main

# 拉取最新镜像
docker-compose -f docker-compose.prod.yml pull

# 滚动更新
docker-compose -f docker-compose.prod.yml up -d --no-deps --build 7zi-frontend

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f --tail=100
```

| 检查项 | 命令 | 通过标准 |
|--------|------|----------|
| 容器运行 | `docker ps` | STATUS: healthy |
| 健康检查 | `curl -sf http://localhost:3000/health` | 返回 `{"status":"ok"}` |
| 页面访问 | `curl -sf http://localhost:3000/` | HTTP 200 |
| 日志检查 | `docker logs 7zi-frontend` | 无错误 |

### Production 部署

```bash
# 1. 创建备份
BACKUP_DIR="/opt/backups/7zi-frontend-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r .next "$BACKUP_DIR/"

# 2. 拉取代码
git pull origin main

# 3. 拉取镜像
docker-compose -f docker-compose.prod.yml pull

# 4. 执行部署
docker-compose -f docker-compose.prod.yml up -d --no-deps --build 7zi-frontend

# 5. 等待启动
sleep 20

# 6. 健康检查
for i in {1..10}; do
  if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Deployment successful!"
    exit 0
  fi
  echo "Attempt $i failed, retrying..."
  sleep 5
done

# 7. 如果失败，回滚
docker-compose -f docker-compose.prod.yml down
cp -r "$BACKUP_DIR/.next" ./
docker-compose -f docker-compose.prod.yml up -d
```

| 检查项 | 命令 | 通过标准 |
|--------|------|----------|
| 备份创建 | `ls /opt/backups/` | 存在最新备份 |
| 容器运行 | `docker ps` | STATUS: healthy |
| 健康检查 | `curl http://localhost:3000/health` | HTTP 200 |
| 外部访问 | `curl https://7zi.com` | HTTP 200 |
| SSL 证书 | `curl -vI https://7zi.com` | 证书有效 |
| 日志检查 | `docker logs 7zi-frontend` | 无错误 |

---

## ✅ Post-deployment 检查

### 功能验证

| 页面 | URL | 检查内容 |
|------|-----|----------|
| 首页 | `/` | 正常渲染 |
| 关于页 | `/about` | 正常渲染 |
| 联系页 | `/contact` | 表单可提交 |
| Dashboard | `/dashboard` | 数据加载正常 |
| 健康检查 | `/api/health` | 返回正常状态 |

### 性能检查

```bash
# 检查响应时间
curl -w "Time: %{time_total}s\n" -o /dev/null -s https://7zi.com/

# 检查页面大小
curl -w "Size: %{size_download} bytes\n" -o /dev/null -s https://7zi.com/
```

| 指标 | 目标值 | 实际值 | 通过 |
|------|--------|--------|------|
| 首页响应时间 | < 1s | | |
| API 响应时间 | < 500ms | | |
| 首页大小 | < 500KB | | |
| 内存使用 | < 512MB | | |

### 监控检查

| 检查项 | 命令/URL | 状态 |
|--------|----------|------|
| 容器状态 | `docker ps` | |
| 容器日志 | `docker logs --tail=50` | |
| 磁盘空间 | `df -h` | |
| 内存使用 | `free -h` | |

---

## 🔄 Rollback 流程

如果部署失败或发现问题：

### 快速回滚

```bash
# 1. 停止当前容器
docker-compose -f docker-compose.prod.yml down

# 2. 恢复备份
LATEST_BACKUP=$(ls -dt /opt/backups/7zi-frontend-* | head -1)
cp -r "$LATEST_BACKUP/.next" ./

# 3. 重启
docker-compose -f docker-compose.prod.yml up -d

# 4. 验证
curl http://localhost:3000/health
```

### Git 回滚

```bash
# 1. 查看历史提交
git log --oneline -10

# 2. 回滚到上一个版本
git reset --hard HEAD~1

# 3. 重新部署
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 📝 部署日志模板

```
### 部署记录: [日期] [时间]

**部署人**: 
**环境**: staging / production
**版本**: commit hash / tag

**变更内容**:
- 

**检查结果**:
- [ ] Pre-deployment 检查通过
- [ ] 部署执行成功
- [ ] Post-deployment 检查通过

**问题记录**:
- 

**回滚**: 是/否
**回滚原因**: 
```

---

## 🔔 告警配置

建议配置以下告警：

1. **容器健康检查失败**: 连续 3 次失败
2. **内存使用过高**: > 80% 持续 5 分钟
3. **响应时间过长**: > 3s 连续 3 次
4. **HTTP 错误率**: 5xx 错误 > 1%

---

## 📞 紧急联系

| 角色 | 姓名 | 联系方式 |
|------|------|----------|
| 开发负责人 | | |
| 运维负责人 | | |
| 值班人员 | | |