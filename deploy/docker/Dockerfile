# ============================================
# OpenClaw v1.11.0 Dockerfile
# 多阶段构建 + 多架构支持 (amd64/arm64)
# 优化镜像大小和安全性
# ============================================

# ============================================
# Stage 1: Dependencies (依赖安装阶段)
# ============================================
FROM --platform=$BUILDPLATFORM node:22-alpine AS deps

WORKDIR /app

# 安装构建依赖（Alpine 兼容性）
# 包含 sharp, better-sqlite3, vips 所需的构建工具
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    vips-dev \
    sqlite-dev \
    curl

# 先复制依赖描述文件（利用 Docker 缓存层）
COPY package.json package-lock.json* ./

# 仅安装生产依赖
RUN npm ci --only=production --legacy-peer-deps && \
    npm cache clean --force

# ============================================
# Stage 2: Builder (构建阶段)
# ============================================
FROM --platform=$BUILDPLATFORM node:22-alpine AS builder

WORKDIR /app

# 构建参数：目标平台和架构
ARG TARGETARCH
ARG TARGETOS
ARG BUILDPLATFORM

# 安装构建工具
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    vips-dev \
    sqlite-dev \
    git

# 从 deps 阶段复制生产依赖
COPY --from=deps /app/node_modules ./node_modules

# 复制依赖描述文件
COPY package.json package-lock.json* ./

# 安装 devDependencies（构建需要）
RUN npm ci --legacy-peer-deps && \
    npm cache clean --force

# 复制源代码
COPY . .

# 环境变量
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV CI=true

# 构建 Next.js 应用
# Next.js 16+ 支持 Turbopack 生产构建
RUN npm run build

# ============================================
# Stage 3: Runner (运行阶段 - 最小化镜像)
# ============================================
FROM node:22-alpine AS runner

WORKDIR /app

# 构建参数：版本标签
ARG VERSION=v1.11.0
ARG BUILD_DATE
ARG GIT_COMMIT

# 标签
LABEL org.opencontainers.image.title="OpenClaw"
LABEL org.opencontainers.image.description="OpenClaw - Personal AI Assistant Platform"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.revision="${GIT_COMMIT}"
LABEL org.opencontainers.image.vendor="OpenClaw"
LABEL org.opencontainers.image.licenses="MIT"

# 环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV VERSION=${VERSION}

# 安全：创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 安装运行时依赖
RUN apk add --no-cache \
    sqlite \
    vips \
    curl \
    tini

# 复制构建产物（standalone 模式）
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 创建必要的目录
RUN mkdir -p /app/data /app/logs /app/uploads && \
    chown -R nextjs:nodejs /app/data /app/logs /app/uploads

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# 使用 tini 作为 init 进程
ENTRYPOINT ["/sbin/tini", "--"]

# 启动应用
CMD ["node", "server.js"]
