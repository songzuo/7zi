# Docker 部署快速参考

## 🚀 快速命令

### 开发环境

```bash
# 启动开发环境（热重载）
docker-compose -f docker-compose.dev.yml up -d

# 查看日志
docker-compose -f docker-compose.dev.yml logs -f

# 停止
docker-compose -f docker-compose.dev.yml down
```

### 生产环境

```bash
# 使用部署脚本（推荐）
./docker-deploy.sh

# 或手动部署
docker-compose -f docker-compose.prod.yml up -d
```

### 单次构建测试

```bash
# 构建生产镜像
docker build -f Dockerfile.production -t 7zi-frontend:test .

# 运行测试容器
docker run -p 3000:3000 -e NODE_ENV=production 7zi-frontend:test
```

---

## 📊 镜像大小对比

| 配置     | 大小   | 说明                |
| -------- | ------ | ------------------- |
| 传统方案 | ~800MB | 包含所有依赖        |
| 优化方案 | ~250MB | 多阶段 + standalone |
| 压缩后   | ~80MB  | Docker Registry     |

---

## 🔍 健康检查

```bash
# 检查容器状态
docker ps

# 检查健康状态
docker inspect 7zi-frontend | grep -A 10 "Health"

# 手动健康检查
curl http://localhost:3000/health
```

---

## 🐛 故障排查

```bash
# 查看日志
docker-compose -f docker-compose.prod.yml logs -f 7zi-frontend

# 进入容器
docker exec -it 7zi-frontend sh

# 查看资源使用
docker stats 7zi-frontend

# 重新构建
docker-compose -f docker-compose.prod.yml build --no-cache
```

---

## 📝 环境变量

必须设置的变量：

- `JWT_SECRET` - JWT 密钥
- `RESEND_API_KEY` - 邮件服务密钥

可选变量：

- `NEXT_PUBLIC_GA_ID` - Google Analytics
- `NEXT_PUBLIC_UMAMI_ID` - Umami Analytics

---

## 🔧 常见问题

### 1. 内存不足

```bash
# 增加内存限制
# 在 docker-compose.prod.yml 中修改：
memory: 1G
```

### 2. 构建失败

```bash
# 清理缓存重新构建
docker-compose -f docker-compose.prod.yml build --no-cache
```

### 3. 端口冲突

```bash
# 修改端口
# 在 docker-compose.prod.yml 中修改：
ports:
  - "8080:3000"
```

---

## 📚 详细文档

完整文档请参考：[docs/DOCKER_DEPLOYMENT.md](./docs/DOCKER_DEPLOYMENT.md)
