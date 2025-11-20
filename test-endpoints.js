const http = require('http');

function testEndpoint(path, description) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 1080,
      path: path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`\n${description}:`);
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${data}`);
        resolve();
      });
    });

    req.on('error', (err) => {
      console.log(`\n${description}:`);
      console.log(`Error: ${err.message}`);
      resolve();
    });

    req.setTimeout(5000, () => {
      console.log(`\n${description}:`);
      console.log('Error: Request timeout');
      req.destroy();
      resolve();
    });

    req.end();
  });
}

async function runTests() {
  console.log('Testing SmartMed API endpoints...\n');
  
  await testEndpoint('/health', 'Health Check');
  await testEndpoint('/api/timeline/patient/123', 'Timeline Endpoint (was returning 500)');
  await testEndpoint('/api/notifications/patient/123', 'Notifications Endpoint (was returning 500)');
  
  console.log('\nTest completed!');
  process.exit(0);
}

runTests();