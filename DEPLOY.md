# Vercel 部署配置

## 已完成的配置

### 1. vercel.json 配置文件
- ✅ 已创建 `vercel.json`
- 配置静态站点部署
- 输出目录：`public/`

### 2. 项目结构
- ✅ 已创建 `public/index.html`
- ✅ 已创建 `.vercel/project.json`

## 需要手动完成的步骤

### 步骤 1: 登录 Vercel
```bash
vercel login
```

### 步骤 2: 创建/链接项目
```bash
# 创建新项目
vercel

# 或链接到现有项目
vercel link --project <project-id>
```

### 步骤 3: 部署
```bash
# 生产环境部署
vercel --prod

# 或预览部署
vercel
```

## 使用 Token 部署 (CI/CD)

如果需要在 CI/CD 中部署，设置环境变量：
```bash
export VERCEL_TOKEN=<your-token>
vercel --prod
```

获取 Token: https://vercel.com/account/tokens

## 项目设置

在 Vercel Dashboard 中配置：
- Build Command: (留空，使用静态部署)
- Output Directory: `public`
- Node Version: 18.x

## 文件结构
```
workspace/
├── vercel.json          # Vercel 配置
├── .vercel/
│   └── project.json     # 项目元数据
├── public/
│   └── index.html       # 静态页面
└── DEPLOY.md            # 本文件
```
