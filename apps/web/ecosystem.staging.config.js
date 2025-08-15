module.exports = {
  apps: [
    {
      name: 'monad-synapse-staging',
      script: 'server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_ENV: 'staging',
        PORT: 3000,
        HOSTNAME: '0.0.0.0'
      },
      env_staging: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_ENV: 'staging',
        PORT: 3000,
        HOSTNAME: '0.0.0.0'
      },
      // Logging configuration
      log_file: '/app/logs/combined.log',
      out_file: '/app/logs/out.log',
      error_file: '/app/logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Process management
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Monitoring
      monitoring: false,
      
      // Health checks
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Auto-restart on file changes (disabled for staging)
      watch: false,
      
      // Performance optimizations
      node_args: [
        '--max-old-space-size=1024',
        '--optimize-for-size'
      ]
    }
  ]
};