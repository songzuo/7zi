# 7zi-frontend 一键部署指南

## 快速部署

### 默认部署（使用默认构建目录）

```bash
cd /root/.openclaw/workspace/deploy-scripts
./deploy-7zi-bot5.sh
```

### 自定义构建目录

```bash
./deploy-7zi-bot5.sh /path/to/your/build/out
```

### 使用环境变量

```bash
export DEPLOY_USER="root"
export DEPLOY_PORT="22"
export SSH_KEY="~/.ssh/id_ed25519"
./deploy-7zi-bot5.sh
```

## 部署前准备

### 1. 确保本地构建已完成

```bash
cd ~/7zi-project/7zi-frontend
npm run build
# 构建输出应该在：/root/7zi-project/7zi-frontend/out
```

### 2. 确保 SSH 密钥已配置

```bash
# 检查 SSH 密钥是否存在
ls -la ~/.ssh/id_ed25519

# 如果没有，生成新的密钥
ssh-keygen -t ed25519 -C "deploy@7zi-frontend"

# 复制公钥到服务器
ssh-copy-id -p 22 root@bot5.szspd.cn
```

### 3. 测试 SSH 连接

```bash
ssh -p 22 root@bot5.szspd.cn "echo 连接成功"
```

## 部署流程

脚本会自动执行以下步骤：

1. ✅ 检查本地构建目录
2. ✅ 验证 SSH 连接
3. ✅ 创建远程备份（如果已有部署）
4. ✅ 同步文件到服务器
5. ✅ 设置文件权限
6. ✅ 配置 Nginx
7. ✅ 重载 Nginx 服务
8. ✅ 验证部署

## 部署后验证

```bash
# 检查 HTTP 响应
curl -I http://bot5.szspd.cn

# 查看 Nginx 日志
ssh root@bot5.szspd.cn "tail -f /var/log/nginx/7zi-frontend-error.log"

# 查看部署文件
ssh root@bot5.szspd.cn "ls -la /var/www/7zi-frontend/"
```

## 回滚部署

如果需要回滚到之前的版本：

```bash
# 1. 查看可用备份
ssh root@bot5.szspd.cn "ls -lt /var/backups/7zi-frontend/"

# 2. 回滚到指定备份
ssh root@bot5.szspd.cn "cp -r /var/backups/7zi-frontend/backup_20260306_010000 /var/www/7zi-frontend"

# 3. 验证回滚
curl -I http://bot5.szspd.cn
```

## 故障排查

### SSH 连接失败

```bash
# 检查服务器是否可达
ping bot5.szspd.cn

# 检查 SSH 端口
nc -zv bot5.szspd.cn 22

# 详细 SSH 调试
ssh -v -p 22 root@bot5.szspd.cn
```

### 部署后网站无法访问

```bash
# 检查 Nginx 状态
ssh root@bot5.szspd.cn "systemctl status nginx"

# 检查 Nginx 配置
ssh root@bot5.szspd.cn "nginx -t"

# 检查防火墙
ssh root@bot5.szspd.cn "ufw status"

# 检查端口监听
ssh root@bot5.szspd.cn "netstat -tlnp | grep :80"
```

### 权限问题

```bash
# 修复权限
ssh root@bot5.szspd.cn "chown -R www-data:www-data /var/www/7zi-frontend"
ssh root@bot5.szspd.cn "chmod -R 755 /var/www/7zi-frontend"
```

## 自动化部署（可选）

可以将部署脚本添加到 crontab 或 CI/CD 流程：

```bash
# 示例：每天凌晨 2 点自动部署
0 2 * * * /root/.openclaw/workspace/deploy-scripts/deploy-7zi-bot5.sh >> /var/log/deploy-7zi.log 2>&1
```

## 安全建议

1. 使用 SSH 密钥认证，禁用密码登录
2. 定期更新 SSH 密钥
3. 配置防火墙只开放必要端口
4. 启用 HTTPS（Let's Encrypt）
5. 定期备份重要数据

---

**脚本版本:** 2026-03-06  
**维护者:** AI 主管团队  
**目标服务器:** bot5.szspd.cn
