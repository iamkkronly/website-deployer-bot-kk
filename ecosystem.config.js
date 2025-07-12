module.exports = {
  apps: [
    {
      name: 'telegram-deployer',
      script: 'server.js',
      max_memory_restart: '400M',
      watch: false
    }
  ]
};
