# 自建部署方案 - 项目总结

## ✅ 已完成

本项目创建了完整的自建部署方案，不依赖 Vercel/Cloudflare 等第三方服务。

---

## 📁 项目结构

```
deploy-scripts/
├── README.md                      # 主文档
├── QUICKSTART.md                  # 快速开始指南
├── deploy-nginx.sh                # Nginx 部署脚本
├── deploy-docker.sh               # Docker 部署脚本
├── deploy-rsync.sh                # rsync 部署脚本
├── setup-git-hook-server.sh       # Git Hook 服务器设置脚本
├── Dockerfile.templates           # Dockerfile 模板集合
├── nginx.conf.template            # Nginx 配置模板
├── docker-compose.yml.template    # Docker Compose 模板
├── nginx/
│   └── README.md                  # Nginx 方案详细文档
├── docker/
│   └── README.md                  # Docker 方案详细文档
├── rsync/
│   └── README.md                  # rsync 方案详细文档
└── git-hook/
    └── README.md                  # Git Hook 方案详细文档
```

---

## 📋 四种部署方案

### 1. Nginx 直接部署
- **脚本**: `deploy-nginx.sh`
- **适合**: 静态网站、前端项目
- **特点**: 简单直接，手动部署
- **文档**: `nginx/README.md`

### 2. Docker 容器部署
- **脚本**: `deploy-docker.sh`
- **适合**: 容器化应用、多环境
- **特点**: 环境隔离，易于迁移
- **文档**: `docker/README.md`

### 3. rsync 同步部署
- **脚本**: `deploy-rsync.sh`
- **适合**: 快速同步、增量更新
- **特点**: 支持断点续传，自动备份
- **文档**: `rsync/README.md`

### 4. Git Hook 自动部署
- **脚本**: `setup-git-hook-server.sh`
- **适合**: CI/CD、团队协作
- **特点**: 全自动，push 即部署
- **文档**: `git-hook/README.md`

---

## 🚀 快速使用

### 环境变量

```bash
export DEPLOY_HOST="your.server.ip"
export APP_NAME="myapp"
```

### 一键部署

```bash
# Nginx 方案
./deploy-nginx.sh ./dist

# Docker 方案
./deploy-docker.sh

# rsync 方案
./deploy-rsync.sh ./dist

# Git Hook 方案（先在服务器运行 setup-git-hook-server.sh）
git push production main
```

---

## 📄 模板文件

- **Dockerfile.templates**: Node.js/Python/Go/静态网站 Dockerfile 模板
- **nginx.conf.template**: 基础/HTTPS/反向代理/负载均衡配置
- **docker-compose.yml.template**: 应用+数据库+Redis 组合配置

---

## 🔐 安全特性

- SSH 密钥认证支持
- 非 root 用户运行
- 自动备份机制
- 权限自动设置
- 防火墙配置建议

---

## 📊 对比总结

| 方案 | 难度 | 自动化 | 适用场景 |
|------|------|--------|----------|
| Nginx | ⭐ | 手动 | 静态网站 |
| Docker | ⭐⭐ | 半自动 | 容器应用 |
| rsync | ⭐ | 手动 | 快速同步 |
| Git Hook | ⭐⭐⭐ | 全自动 | CI/CD |

---

## 📖 详细文档

每个方案都有详细的 README 文档，包含：
- 架构说明
- 完整脚本
- 配置模板
- 使用步骤
- 故障排查
- 安全建议

---

## 🎯 推荐

- **个人项目/静态网站**: 使用 Nginx 或 rsync 方案
- **生产环境/团队项目**: 使用 Git Hook 自动部署
- **微服务/多环境**: 使用 Docker + Docker Compose

---

**创建时间**: 2026-03-06  
**位置**: `/root/.openclaw/workspace/deploy-scripts/`
