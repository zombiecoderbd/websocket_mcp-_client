// Pre-compile important API routes to reduce initial 404s
const { execSync } = require('child_process');

console.log('Pre-compiling API routes...');

const routes = [
  '/api/dashboard/stats',
  '/api/connections',
  '/api/proxy/health',
  '/api/proxy/status'
];

routes.forEach(route => {
  try {
    console.log(`Compiling: ${route}`);
    execSync(`curl -s http://localhost:3001${route} > /dev/null 2>&1`, { timeout: 5000 });
    console.log(`✓ Compiled ${route}`);
  } catch (error) {
    console.log(`⚠ Route not ready yet: ${route}`);
  }
});

console.log('Pre-compilation complete!');