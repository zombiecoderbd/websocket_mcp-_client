const http = require('http');

console.log('Testing server endpoints...');

// Test basic server status
const options = {
  hostname: 'localhost',
  port: 8000,
  path: '/status',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  res.on('data', (d) => {
    try {
      const data = JSON.parse(d.toString());
      console.log('Server Status Response:', data);
    } catch (e) {
      console.log('Raw response:', d.toString());
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.end();

// Also test the agents endpoint
setTimeout(() => {
  const agentsOptions = {
    hostname: 'localhost',
    port: 8000,
    path: '/agents',
    method: 'GET'
  };

  const agentsReq = http.request(agentsOptions, (res) => {
    console.log(`Agents Status Code: ${res.statusCode}`);
    
    res.on('data', (d) => {
      try {
        const data = JSON.parse(d.toString());
        console.log('Agents Response:', data);
      } catch (e) {
        console.log('Agents raw response:', d.toString());
      }
    });
  });

  agentsReq.on('error', (error) => {
    console.error('Agents Error:', error.message);
  });

  agentsReq.end();
}, 1000);