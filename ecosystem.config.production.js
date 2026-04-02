// PM2 Ecosystem 配置文件
// 生产环境部署配置

module.exports = {
  apps: [
    {
      name: '7zi-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/7zi',

      // 环境变量
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },

      // 集群配置
      instances: 'max', // 使用所有 CPU 核心
      exec_mode: 'cluster',

      // 自动重启
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      restart_delay: 3000,
      kill_timeout: 5000,
      listen_timeout: 3000,

      // 日志配置
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/7zi-frontend/error.log',
      out_file: '/var/log/7zi-frontend/out.log',

      // 健康检查
      instance_var: 'INSTANCE_ID',

      // 优雅关闭
      shutdown_with_message: true,
    },
  ],

  // 部署配置
  deploy: {
    production: {
      user: 'root',
      host: '7zi.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/7zi-frontend.git',
      path: '/var/www/7zi',
      'pre-deploy-local': 'echo "开始部署..."',
      'post-deploy': 'npm ci --production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt-get install git -y',
    },
  },
}
