module.exports = {
  apps: [
    {
      name: 'nextjs-dev',
      script: 'pnpm',
      args: 'run dev',
      cwd: './',
      env: {
        NODE_ENV: 'development',
      },
      watch: false,
      autorestart: true,
    },
    {
      name: 'export-worker',
      script: 'pnpm',
      args: 'run worker:export',
      cwd: './',
      env: {
        NODE_ENV: 'development',
      },
      watch: false,
      autorestart: true,
    },
  ],
};
