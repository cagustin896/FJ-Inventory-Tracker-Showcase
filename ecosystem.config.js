module.exports = {
  apps: [
    {
      name: 'fj-inventory',
      script: 'server/index.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
