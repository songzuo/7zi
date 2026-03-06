# ============================================
# Stage 1: Dependencies (依赖安装阶段)
# ============================================
FROM node:22-alpine AS deps
WORKDIR /app

# 安装 libc6-compat 用于 Alpine 兼容性
RUN apk add --no-cache libc6-compat

# 复制依赖文件
COPY package.json package-lock.json* ./

# 安装生产依赖（使用 ci 确保一致性）
RUN npm ci --only=production && npm cache clean --force

# ============================================
# Stage 2: Builder (构建阶段)
# ============================================
FROM node:22-alpine AS builder
WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置环境变量
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 构建应用
RUN npm run build

# ============================================
# Stage 3: Runner (运行阶段 - 最小化镜像)
# ============================================
FROM node:22-alpine AS runner
WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 创建非 root 用户（安全）
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建产物（standalone 模式的文件结构）
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# 启动应用
CMD ["node", "server.js"]