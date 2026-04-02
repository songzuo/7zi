# 部署脚本快速参考

## 🚀 快速命令

```bash
# 生产环境部署
./deploy.sh deploy

# Staging 环境部署
ENVIRONMENT=staging ./deploy.sh deploy

# 快速部署（代码小改动）
./deploy-quick.sh deploy

# 快速回滚（蓝绿槽位切换）
./deploy.sh rollback-quick

# 回滚到指定版本
./deploy.sh rollback v20250122-143022
```

## 📋 状态查看

```bash
# 查看服务状态
./deploy.sh status

# 执行健康检查
./deploy.sh health

# 查看日志（默认 100 行）
./deploy.sh logs

# 查看指定服务日志
./deploy.sh logs 7zi-nginx 200
```

## 💾 备份管理

```bash
# 列出所有备份
./deploy.sh backups

# 查看部署历史
./deploy.sh history

# 清理旧资源
./deploy.sh cleanup

# 检查环境配置
./deploy.sh check
```

## 🔍 故障排查

### 1. SSH 连接失败

```bash
sshpass -p 'ge20993344$ZZ' ssh root@7zi.com
```

### 2. 查看容器日志

```bash
./deploy.sh logs 7zi-frontend-blue
```

### 3. 检查容器状态

```bash
./deploy.sh status
```

### 4. 手动健康检查

```bash
curl http://localhost:3000/
curl http://localhost:3000/api/health
```

## 🎯 环境切换

| 环境       | 命令                                     |
| ---------- | ---------------------------------------- |
| dev        | `ENVIRONMENT=dev ./deploy.sh deploy`     |
| staging    | `ENVIRONMENT=staging ./deploy.sh deploy` |
| production | `./deploy.sh deploy`                     |

## 📊 部署流程

```
检查前置条件
  ↓
验证环境配置
  ↓
同步代码到服务器
  ↓
创建备份
  ↓
蓝绿部署（构建 → 启动 → 健康检查）
  ↓
切换流量
  ↓
停止旧容器
  ↓
清理旧资源
  ↓
最终验证
```

## 🔄 回滚流程

```
快速回滚（秒级）
  ↓
蓝绿槽位切换
  ↓
健康检查
  ↓
完成

或

版本回滚（分钟级）
  ↓
停止服务
  ↓
恢复备份
  ↓
重新构建
  ↓
启动服务
  ↓
健康检查
  ↓
完成
```

## ⚠️ 常见错误

| 错误                | 解决方案                   |
| ------------------- | -------------------------- |
| SSH 连接失败        | 检查网络和密码             |
| Docker 镜像构建失败 | 清理缓存，重试构建         |
| 健康检查失败        | 查看日志，检查 API 端点    |
| 端口冲突            | 检查端口占用，停止冲突容器 |
| 容器频繁重启        | 查看日志，检查资源限制     |

## 📚 完整文档

- 部署指南: `DEPLOYMENT_GUIDE.md`
- 改进总结: `/root/.openclaw/workspace/DEPLOY_IMPROVEMENTS.md`
- 帮助信息: `./deploy.sh help`

## 🔑 关键文件

| 文件                  | 用途               |
| --------------------- | ------------------ |
| `deploy.sh`           | 主部署脚本         |
| `deploy-quick.sh`     | 快速部署脚本       |
| `DEPLOYMENT_GUIDE.md` | 完整部署文档       |
| `deploy-history.json` | 部署历史（服务器） |

## 🌐 服务器路径

| 路径                                            | 用途     |
| ----------------------------------------------- | -------- |
| `/opt/7zi-frontend`                             | 部署目录 |
| `/opt/backups/7zi-frontend`                     | 备份目录 |
| `/opt/backups/7zi-frontend/deploy-history.json` | 部署历史 |

---

**提示**: 首次部署前，请阅读 `DEPLOYMENT_GUIDE.md` 了解详细配置。
