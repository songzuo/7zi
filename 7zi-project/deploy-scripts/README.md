# 自建部署方案

**原则**：不依赖 Vercel/Cloudflare 等第三方，完全使用自己的资源

---

## 目录

1. [Nginx 直接部署](./nginx/README.md)
2. [Docker 容器部署](./docker/README.md)
3. [rsync 同步部署](./rsync/README.md)
4. [Git Hook 自动部署](./git-hook/README.md)

---

## 快速选择指南

| 方案 | 适用场景 | 复杂度 | 自动化程度 |
|------|----------|--------|------------|
| Nginx | 静态网站、简单应用 | ⭐ | 手动 |
| Docker | 容器化应用、多环境 | ⭐⭐ | 半自动 |
| rsync | 快速同步、增量更新 | ⭐ | 手动/脚本 |
| Git Hook | CI/CD、自动部署 | ⭐⭐⭐ | 全自动 |

---

## 前置要求

- 自有服务器（VPS 或物理机）
- SSH 访问权限
- 域名（可选，用于 Nginx）
- Git（用于 Git Hook 方案）

---

## 通用环境变量

```bash
# 服务器配置
export DEPLOY_USER="root"
export DEPLOY_HOST="your.server.ip"
export DEPLOY_PORT="22"
export DEPLOY_KEY("~/.ssh/id_ed25519")

# 应用配置
export APP_NAME="myapp"
export APP_DIR="/var/www/${APP_NAME}"
```
