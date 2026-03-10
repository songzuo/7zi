# ============================================
# PM2 生产环境配置 (优化版)
# ============================================

module.exports = {
  apps: [
    // 主应用
    {
      name: "7zi",
      script: ".next/standalone/server.js",
      cwd: "/var/www/7zi",
      
      // 实例配置
      instances: "max", // 使用所有 CPU 核心
      exec_mode: "cluster", // 集群模式
      
      // 环境变量
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
        NEXT_TELEMETRY_DISABLED: 1,
      },
      
      // 日志配置
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/var/log/7zi/error.log",
      out_file: "/var/log/7zi/out.log",
      merge_logs: true,
      log_type: "json",
      
      // 进程管理
      watch: false, // 生产环境不监听文件变化
      ignore_watch: ["node_modules", "logs", ".next"],
      watch_delay: 1000,
      
      // 重启策略
      exp_backoff_restart_delay: 100, // 指数退避
      max_restarts: 10, // 最大重启次数
      restart_delay: 1000, // 重启延迟
      autorestart: true,
      
      // 健康检查
      instance_var: "INSTANCE_ID",
      kill_timeout: 5000, // 强制杀死超时
      wait_ready: true, // 等待 ready 信号
      listen_timeout: 10000, // 启动超时
      
      // 内存限制
      max_memory_restart: "500M", // 内存超过 500M 自动重启
      
      // 定时重启 (每周日凌晨 3 点)
      cron_restart: "0 3 * * 0",
      
      // 优雅关闭
      shutdown_with_message: true,
    },
    
    // 监控服务 (可选)
    {
      name: "7zi-monitor",
      script: "scripts/health-check.sh",
      cwd: "/var/www/7zi",
      interpreter: "/bin/bash",
      
      // 定时执行
      cron_restart: "*/5 * * * *", // 每 5 分钟
      
      // 不自动重启 (由 cron 触发)
      autorestart: false,
      
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
  
  // 部署配置
  deploy: {
    production: {
      user: "deploy",
      host: ["7zi.com"],
      ref: "origin/main",
      repo: "git@github.com:7zi-studio/7zi-frontend.git",
      path: "/var/www/7zi",
      "post-deploy": "npm ci --legacy-peer-deps && npm run build && pm2 reload ecosystem.config.js --env production && pm2 save",
      "pre-setup": "apt-get install git -y",
    },
    
    staging: {
      user: "deploy",
      host: ["staging.7zi.com"],
      ref: "origin/develop",
      repo: "git@github.com:7zi-studio/7zi-frontend.git",
      path: "/var/www/7zi-staging",
      "post-deploy": "npm ci --legacy-peer-deps && npm run build && pm2 reload ecosystem.config.js --env staging && pm2 save",
    },
  },
}