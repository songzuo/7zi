# 🚀 7zi-frontend 生产部署检查清单

**服务器**: 7zi.com (165.99.43.61)
**部署路径**: /opt/7zi-frontend
**更新日期**: 2026-03-06

---

## 📋 部署前检查

### 1. 本地环境

- [ ] 代码已提交到 Git
- [ ] 所有测试通过 (`npm run test:run`)
- [ ] 类型检查通过 (`npm run type-check`)
- [ ] ESLint 检查通过 (`npm run lint`)
- [ ] 本地构建成功 (`npm run build`)

### 2. 服务器环境

- [ ] SSH 连接正常
- [ ] Docker 已安装并运行
- [ ] Docker Compose 已安装
- [ ] 磁盘空间充足 (至少 5GB)
- [ ] 端口 80/443 可用

### 3. 配置文件

- [ ] `.env.production` 已配置
  - [ ] NEXT_PUBLIC_GA_ID (Google Analytics)
  - [ ] NEXT_PUBLIC_UMAMI_ID (Umami Analytics)
  - [ ] RESEND_API_KEY (邮件服务)
  - [ ] CONTACT_EMAIL
  - [ ] FROM_EMAIL

### 4. SSL 证书

- [ ] Let's Encrypt 证书已安装
- [ ] 证书路径: `/etc/letsencrypt/live/7zi.com/`
- [ ] 自动续期已配置

---

## 🔧 部署步骤

### 快速部署（推荐）

```bash
./deploy-zero-downtime.sh deploy
```

### 手动部署步骤

1. **同步代码**

   ```bash
   rsync -avz --delete \
     --exclude '.git' --exclude 'node_modules' --exclude '.next' \
     -e "sshpass -p 'PASSWORD' ssh -o StrictHostKeyChecking=no" \
     ./ root@7zi.com:/opt/7zi-frontend/
   ```

2. **构建镜像**

   ```bash
   ssh root@7zi.com "cd /opt/7zi-frontend && docker-compose -f docker-compose.zero-downtime.yml build"
   ```

3. **启动服务**

   ```bash
   ssh root@7zi.com "cd /opt/7zi-frontend && docker-compose -f docker-compose.zero-downtime.yml up -d"
   ```

4. **健康检查**
   ```bash
   curl -f https://7zi.com/api/health
   ```

---

## ✅ 部署后验证

### 1. 服务状态

```bash
./deploy-zero-downtime.sh status
```

### 2. 健康检查

- [ ] https://7zi.com/api/health 返回 200
- [ ] https://7zi.com 正常访问
- [ ] https://7zi.com/zh 中文页面正常
- [ ] https://7zi.com/en 英文页面正常

### 3. 功能测试

- [ ] 首页加载正常
- [ ] 关于页面正常
- [ ] 联系表单可提交
- [ ] 博客页面正常
- [ ] 静态资源加载正常 (JS/CSS/图片)

### 4. 性能检查

- [ ] 页面加载时间 < 3秒
- [ ] Lighthouse 评分 > 80
- [ ] 无控制台错误

### 5. 安全检查

- [ ] HTTPS 正常
- [ ] 安全头已设置 (HSTS, X-Frame-Options 等)
- [ ] 隐藏文件不可访问
- [ ] API 错误不暴露敏感信息

---

## 🔄 回滚步骤

如果部署失败或发现问题：

```bash
./deploy-zero-downtime.sh rollback
```

或手动回滚：

```bash
# 1. 停止当前容器
docker stop 7zi-frontend-blue  # 或 green

# 2. 启动旧容器
docker start 7zi-frontend-green  # 或 blue

# 3. 更新 nginx upstream
docker exec 7zi-nginx nginx -s reload
```

---

## 📊 监控命令

```bash
# 查看状态
./deploy-zero-downtime.sh status

# 查看日志
./deploy-zero-downtime.sh logs

# 查看 nginx 日志
./deploy-zero-downtime.sh logs 7zi-nginx

# 健康检查
curl -s https://7zi.com/api/health | jq .

# 资源使用
ssh root@7zi.com "docker stats --no-stream"
```

---

## 🧹 清理命令

```bash
# 清理旧 Docker 资源
./deploy-zero-downtime.sh cleanup

# 手动清理
ssh root@7zi.com "docker system prune -f && docker image prune -f"
```

---

## 📞 联系信息

- **服务器**: 7zi.com (165.99.43.61)
- **用户**: root
- **部署路径**: /opt/7zi-frontend
- **备份路径**: /opt/backups/7zi-frontend

---

## ⚠️ 注意事项

1. **不要**在高峰期部署（建议在凌晨进行）
2. **必须**先在测试环境验证
3. **保留**最近 5 个备份
4. **监控**部署后 30 分钟内的错误日志
5. **通知**团队部署完成
