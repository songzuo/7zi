# 7zi-frontend 部署准备报告

**日期**: 2026-04-28  
**状态**: ✅ 构建成功  
**目标**: bot5.szspd.cn

---

## 1. Git 状态

- **分支**: main
- **当前 Commit**: `e684ef574610bd625e295d484803c240f73a7ad6`
- **最近 5 次提交**:
  ```
  e684ef574 docs: 更新记忆文件
  32a2f21dc docs: 更新记忆文件
  9f8292399 docs: 更新记忆文件
  08fef15ea docs: 更新记忆文件
  671639a62 docs: 更新工作区文件
  ```

**工作区状态**:
- 修改文件 (未提交): `public/sw.js` 等
- 有未跟踪文件

---

## 2. 构建状态

- **构建**: ✅ 成功
- **输出目录**: `.next/standalone/`
- **总大小**: ~567 MB

---

## 3. 部署文件清单

### 核心部署文件 (`.next/standalone/`)

```
.next/standalone/
├── package.json          # 依赖配置
├── 7zi-frontend/
│   ├── server.js         # Node.js 启动脚本
│   ├── .env.production   # 生产环境配置
│   └── .next/            # 编译后的 Next.js 应用
└── node_modules/         # 生产依赖
```

### 额外需复制文件

| 文件/目录 | 来源 | 说明 |
|-----------|------|------|
| `public/` | 7zi-frontend/public/ | 静态资源 (favicon, icons, sw.js) |

---

## 4. 部署到 bot5.szspd.cn 步骤

### 第一步：打包本地构建

```bash
cd /root/.openclaw/workspace/7zi-frontend

# 清理旧部署目录 (可选)
# sshpass -p 'ge20993344$ZZ' ssh root@bot5.szspd.cn "rm -rf /opt/7zi-frontend"

# 创建部署包
tar -czvf /tmp/7zi-frontend-deploy.tar.gz \
  --exclude='.next/standalone/node_modules/.cache' \
  --exclude='.next/cache' \
  .next/standalone/ \
  public/
```

### 第二步：传输到目标服务器

```bash
sshpass -p 'ge20993344$ZZ' scp /tmp/7zi-frontend-deploy.tar.gz root@bot5.szspd.cn:/opt/
```

### 第三步：在目标服务器解压

```bash
sshpass -p 'ge20993344$ZZ' ssh root@bot5.szspd.cn "
  cd /opt
  tar -xzvf 7zi-frontend-deploy.tar.gz
  cd 7zi-frontend
  npm install --production
"
```

### 第四步：配置环境变量 (如需要)

```bash
sshpass -p 'ge20993344$ZZ' ssh root@bot5.szspd.cn "
  # 检查 .env.production 是否需要修改
  cat /opt/7zi-frontend/.env.production
"
```

### 第五步：启动服务

```bash
sshpass -p 'ge20993344$ZZ' ssh root@bot5.szspd.cn "
  cd /opt/7zi-frontend
  PORT=3000 node server.js
"
```

### 第六步：验证部署

```bash
curl -I http://bot5.szspd.cn:3000
```

---

## 5. 注意事项

1. **密码含 `$`** - SSH 连接时使用单引号避免 shell 解析
2. **端口 3000** - 默认 Next.js 端口，可在 `.env.production` 或启动时修改
3. **node_modules** - standalone 模式已包含生产依赖，但建议确认 `npm install --production`
4. **下次部署** - 重复上述步骤即可 (先执行 `pnpm build` 确保最新代码)

---

## 6. 快速部署脚本 (deploy.sh)

```bash
#!/bin/bash
set -e

HOST="bot5.szspd.cn"
USER="root"
PASS="ge20993344\$ZZ"
PORT=3000

cd /root/.openclaw/workspace/7zi-frontend

echo "==> 打包构建..."
tar -czvf /tmp/7zi-frontend-deploy.tar.gz \
  --exclude='.next/standalone/node_modules/.cache' \
  --exclude='.next/cache' \
  .next/standalone/ \
  public/

echo "==> 传输到 $HOST..."
sshpass -p '$PASS' scp /tmp/7zi-frontend-deploy.tar.gz $USER@$HOST:/opt/

echo "==> 解压并部署..."
sshpass -p '$PASS' ssh $USER@$HOST "
  cd /opt
  tar -xzvf 7zi-frontend-deploy.tar.gz
  echo '==> 完成! 请手动启动: cd /opt/7zi-frontend && PORT=$PORT node server.js'
"
```

---

**生成时间**: 2026-04-29 01:10 GMT+2