# ============================================
# 7zi-frontend Dockerfile (Optimized)
# 多阶段构建 + Alpine + 生产优化
# ============================================

# ============================================
# Stage 1: Dependencies (依赖安装阶段)
# 优化：分离 package.json 和 package-lock.json 以利用缓存
# ============================================
FROM node:22-alpine AS deps

WORKDIR /app

# 安装构建依赖（Alpine 兼容性）
RUN apk add --no-cache libc6-compat

# 先复制依赖描述文件（利用 Docker 缓存层）
COPY package.json package-lock.json* ./

# 安装所有依赖（包括 devDependencies，构建需要）
RUN npm ci --legacy-peer-deps && npm cache clean --force

# ============================================
# Stage 2: Builder (构建阶段)
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# 从 deps 阶段复制 node_modules
COPY --from=deps /app/node_modules ./node_modules

# 复制源代码
COPY . .

# 环境变量
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 构建应用（standalone 模式）
RUN npm run build

# ============================================
# Stage 3: Runner (运行阶段 - 最小化镜像)
# 使用 node:22-alpine 或 distroless
# ============================================
FROM node:22-alpine AS runner

WORKDIR /app

# 环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 安全：创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制构建产物（standalone 模式）
# standalone 模式会生成自包含的服务器
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查（使用 node 而非 wget，更轻量）
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用
CMD ["node", "server.js"]
