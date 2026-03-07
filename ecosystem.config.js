module.exports = {
  apps: [{
    name: "7zi",
    script: ".next/standalone/server.js",
    cwd: "/var/www/7zi",
    instances: 1,
    exec_mode: "fork",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    }
  }]
}
