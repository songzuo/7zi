FROM node:18-alpine

WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install --omit=dev

# 复制应用代码
COPY health-service.js .

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 8085

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:8085/health || exit 1

# 启动应用
CMD ["node", "health-service.js"]