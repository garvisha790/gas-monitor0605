const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy requests to your first backend (port 3000)
  app.use(
    '/api/device',
    createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
    })
  );
  
  // Proxy requests to your second backend (port 5000)
  app.use(
    '/api/other',
    createProxyMiddleware({
      target: 'http://10.178.20.127:3000',
      changeOrigin: true,
    })
  );
};