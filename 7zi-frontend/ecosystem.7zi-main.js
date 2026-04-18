module.exports = {
  apps: [{
    name: '7zi-main',
    cwd: '/var/www/7zi/7zi-frontend/.next/standalone/7zi-frontend',
    script: 'server.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
