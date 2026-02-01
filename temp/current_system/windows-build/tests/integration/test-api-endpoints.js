const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testEndpoints() {
  const baseUrl = 'http://localhost:3001';
  
  const endpoints = [
    '/api/dashboard/stats',
    '/api/connections?limit=10',
    '/api/proxy/health',
    '/api/proxy/status'
  ];
  
  console.log('Testing API Endpoints...\n');
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint}`);
      const response = await fetch(`${baseUrl}${endpoint}`);
      const status = response.status;
      const data = await response.json();
      
      console.log(`  Status: ${status} ${response.ok ? '✅' : '❌'}`);
      console.log(`  Data:`, JSON.stringify(data, null, 2));
      console.log('---');
    } catch (error) {
      console.log(`  Error: ${error.message} ❌`);
      console.log('---');
    }
  }
}

testEndpoints();