# 快速开始 - Quick Start

## 🚀 5 分钟快速部署

### 第一次设置

```bash
# 1. SSH 到服务器
ssh root@7zi.com

# 2. 创建必要的目录
mkdir -p /root/7zi-frontend/scripts/deploy

# 3. 确保脚本有执行权限
chmod +x /root/7zi-frontend/scripts/deploy/*.sh

# 4. 创建 Docker 网络（如果不存在）
docker network create nginx-network
```

### 日常部署

```bash
# 自动部署（通过 Git Push）
git push origin main

# 或手动部署
ssh root@7zi.com
cd /root/7zi-frontend
./scripts/deploy/blue-green-deploy.sh auto ghcr.io/[owner]/7zi-frontend:latest
```

### 监控和验证

```bash
# 实时监控
./scripts/deploy/monitor.sh

# 验证部署
./scripts/deploy/verify-deploy.sh production

# 性能测试
./scripts/deploy/benchmark.sh
```

### 回滚

```bash
# 一键回滚
./scripts/deploy/rollback.sh

# 强制回滚
./scripts/deploy/rollback.sh --force
```

---

## 📋 脚本速查

| 脚本     | 功能         | 命令                                  |
| -------- | ------------ | ------------------------------------- |
| 蓝绿部署 | 零停机部署   | `./blue-green-deploy.sh auto [image]` |
| 部署验证 | 10项健康检查 | `./verify-deploy.sh production`       |
| 回滚     | 一键回滚     | `./rollback.sh`                       |
| 快速部署 | 跳过部分验证 | `./quick-deploy.sh prod [image]`      |
| 监控     | 实时仪表板   | `./monitor.sh`                        |
| 基准测试 | 性能测试     | `./benchmark.sh`                      |

---

## 🔍 常见问题

### Q: 如何查看当前哪个环境是活跃的？

```bash
docker ps | grep 7zi-frontend
# 查看哪个容器在运行
```

### Q: 健康检查失败怎么办？

```bash
# 查看容器日志
docker logs 7zi-frontend-blue

# 检查端口
netstat -tlnp | grep 3000

# 手动健康检查
curl http://localhost:3000/api/health
```

### Q: 如何切换 Nginx 配置？

```bash
# 编辑配置
vim /etc/nginx/sites-available/7zi.com

# 修改 proxy_pass 端口（3000 = Blue, 3001 = Green）

# 验证配置
nginx -t

# 重载 Nginx
systemctl reload nginx
```

---

## 📞 需要帮助？

查看完整文档：

```bash
cat /root/.openclaw/workspace/DEPLOYMENT.md
```

或查看优化总结：

```bash
cat /root/.openclaw/workspace/DEPLOYMENT_OPTIMIZATION_SUMMARY.md
```
