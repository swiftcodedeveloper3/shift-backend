module.exports = {
  apps: [{
    name: "ride-backend",
    script: "src/server.mjs",            // or your entry file
    instances: "max",                   // cluster mode = 1 per CPU
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
      PORT: 8000
    }
  }]
}
