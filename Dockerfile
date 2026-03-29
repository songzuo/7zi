# ============================================
# 7zi-frontend Dockerfile (优化版)
# 多阶段构建 + Alpine + 生产优化
# ============================================

# ============================================
# Stage 1: Dependencies (依赖安装阶段)
# 优化：分离 package.json 和 package-lock.json 以利用缓存
# ============================================
FROM node:22-alpine AS deps

WORKDIR /app

# 安装构建依赖（Alpine 兼容性）
# 包含 sharp 和 better-sqlite3 所需的构建工具
RUN apk add --no-cache libc6-compat python3 make g++ vips-dev sqlite-dev

# 先复制依赖描述文件（利用 Docker 缓存层）
COPY package.json package-lock.json* ./

# 仅安装生产依赖（构建阶段再安装 devDependencies）
# --legacy-peer-deps: 忽略 peer dependency 警告
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force

# ============================================
# Stage 2: Builder (构建阶段)
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# 安装构建工具和依赖
RUN apk add --no-cache libc6-compat python3 make g++ vips-dev sqlite-dev

# 从 deps 阶段复制生产依赖
COPY --from=deps /app/node_modules ./node_modules

# 复制依赖描述文件（用于安装 devDependencies）
COPY package.json package-lock.json* ./

# 安装 devDependencies（构建需要）
RUN npm ci --legacy-peer-deps && npm cache clean --force

# 复制源代码
COPY . .

# 环境变量
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Turbopack 生产构建配置
# Next.js 16+ 支持 Turbopack 生产构建
# 如需回退到 webpack，设置环境变量: TURBOPACK=0
RUN npm run build

# ============================================
# Stage 3: Runner (运行阶段 - 最小化镜像)
# 使用 node:22-alpine + 非 root 用户
# ============================================
FROM node:22-alpine AS runner

WORKDIR /app

# 环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 安全：创建非 root 用户
# GID 和 UID 应与构建阶段一致
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 安装运行时依赖（SQLite 和 sharp 需要的库）
RUN apk add --no-cache sqlite vips

# 复制构建产物（standalone 模式）
# standalone 模式会生成自包含的服务器，包含所有必需的 node_modules
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 创建数据目录（SQLite 数据库）
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查（使用 /api/health 端点而不是根路径）
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用
CMD ["node", "server.js"]
