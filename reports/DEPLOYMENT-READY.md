# 生产环境部署准备报告

## 执行时间

2026-03-06 23:59 GMT+1

## 目标服务器

- **主机**: 7zi.com (165.99.43.61)
- **用户**: root
- **SSH 连接**: ✅ 成功

## 服务器环境

| 组件    | 版本     | 状态                  |
| ------- | -------- | --------------------- |
| Node.js | v22.22.0 | ✅                    |
| PM2     | 6.0.14   | ✅                    |
| Docker  | 29.1.1   | ✅                    |
| Nginx   | -        | ✅ 已配置代理到 :3000 |

## 资源状态

- **磁盘**: 88G 总计, 37G 可用 (59% 使用)
- **内存**: 7.8Gi 总计, 4.2Gi 可用

## 项目构建

- **构建命令**: `npm run build`
- **状态**: ✅ 成功
- **构建时间**: ~65 秒
- **输出**:
  - 静态页面: 25 个
  - API 路由: 5 个健康检查端点
  - SSG 页面: 多语言路由 (zh/en)

## 已创建文件

### 1. deploy-production.sh

完整的部署脚本，支持多种命令：

```bash
./deploy-production.sh test      # 测试 SSH 连接
./deploy-production.sh build     # 本地构建
./deploy-production.sh sync      # 同步文件
./deploy-production.sh deploy    # 完整部署
./deploy-production.sh quick     # 快速部署
./deploy-production.sh logs      # 查看日志
./deploy-production.sh status    # 查看状态
```

### 2. check-env.sh

环境变量检查脚本

### 3. .env.production

生产环境配置模板

### 4. ecosystem.config.production.js

PM2 集群配置（支持多核心）

## 部署方式

### 方式一：PM2 部署（推荐）

```bash
./deploy-production.sh deploy
```

### 方式二：Docker 部署

```bash
./deploy-production.sh docker
```

## 服务器项目目录

- **路径**: `/var/www/7zi`
- **当前状态**: PM2 应用 `7zi` 已停止 (上次重启 2 次)
- **Nginx**: 已配置 HTTPS，代理到 localhost:3000

## SSL 证书

- **证书路径**: `/web/ssl_unified/7zi.com.crt`
- **私钥路径**: `/web/ssl_unified/7zi.com.key`
- **协议**: TLSv1.2, TLSv1.3

## 下一步操作

### 立即部署

```bash
cd ~/7zi-project/7zi-frontend
./deploy-production.sh deploy
```

### 配置生产环境变量（如需邮件服务）

```bash
# 在服务器上编辑
ssh root@7zi.com
nano /var/www/7zi/.env.production
# 添加：
# RESEND_API_KEY=re_xxx
# CONTACT_EMAIL=business@7zi.studio
# FROM_EMAIL=noreply@7zi.studio
```

### 配置 PM2 开机自启

```bash
ssh root@7zi.com "pm2 startup && pm2 save"
```

## 注意事项

1. 密码含 `$`，SSH 命令必须用单引号
2. 端口 3000 已配置 Nginx 代理
3. 首次部署建议使用 `./deploy-production.sh deploy` 完整流程
4. 健康检查端点：`/api/health`
