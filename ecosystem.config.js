// PM2 Ecosystem Configuration — Requests v1.0
// CURA Medical Specialists Imaging Request System
//
// Usage:
//   pm2 start ecosystem.config.js
//   pm2 restart all
//   pm2 logs
//
// Ensure log directory exists before starting:
//   sudo mkdir -p /var/log/requests && sudo chown $USER:$USER /var/log/requests

module.exports = {
  apps: [
    // -------------------------------------------------------
    // Next.js Application Server
    // -------------------------------------------------------
    {
      name: 'requests-app',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/requests',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // Process management
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',

      // Logging — off-box log shipping picks up from these paths
      output: '/var/log/requests/app.log',
      error: '/var/log/requests/app-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Graceful restart
      kill_timeout: 5000,
      listen_timeout: 10000,

      // Restart backoff for crash loops
      exp_backoff_restart_delay: 100,
    },

    // -------------------------------------------------------
    // BullMQ Delivery Worker
    // Processes email and fax delivery jobs asynchronously
    // -------------------------------------------------------
    {
      name: 'requests-worker',
      script: 'npx',
      args: 'tsx worker/delivery-worker.ts',
      cwd: '/var/www/requests',
      env: {
        NODE_ENV: 'production',
      },

      // Process management
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',

      // Logging
      output: '/var/log/requests/worker.log',
      error: '/var/log/requests/worker-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Graceful restart
      kill_timeout: 10000,

      // Restart backoff for crash loops
      exp_backoff_restart_delay: 100,
    },
  ],
};
