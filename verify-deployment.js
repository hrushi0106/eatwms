#!/usr/bin/env node

/**
 * EATWMS Deployment Verification Script
 * 
 * Run this script after deployment to verify everything is working:
 * node verify-deployment.js <frontend-url> <backend-url>
 * 
 * Example:
 * node verify-deployment.js https://eatwms-frontend.onrender.com https://eatwms-backend.onrender.com
 */

const https = require('https');
const http = require('http');

const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: node verify-deployment.js <frontend-url> <backend-url>');
  console.error('Example: node verify-deployment.js https://your-frontend.onrender.com https://your-backend.onrender.com');
  process.exit(1);
}

const [FRONTEND_URL, BACKEND_URL] = args;

console.log('🚀 EATWMS Deployment Verification\n');
console.log(`Frontend: ${FRONTEND_URL}`);
console.log(`Backend:  ${BACKEND_URL}\n`);

async function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const startTime = Date.now();
    
    client.get(url, (res) => {
      const duration = Date.now() - startTime;
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data,
          duration: duration
        });
      });
    }).on('error', reject);
  });
}

async function testEndpoint(name, url, expectedStatus = 200) {
  try {
    console.log(`Testing ${name}...`);
    const result = await makeRequest(url);
    
    if (result.status === expectedStatus) {
      console.log(`✅ ${name}: OK (${result.duration}ms)`);
      return true;
    } else {
      console.log(`❌ ${name}: Status ${result.status} (expected ${expectedStatus})`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    return false;
  }
}

async function testLogin() {
  try {
    console.log('Testing login API...');
    
    const postData = JSON.stringify({
      email: 'admin@company.com',
      password: 'Admin@123'
    });
    
    return new Promise((resolve) => {
      const url = new URL('/api/auth/login', BACKEND_URL);
      const client = url.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (res.statusCode === 200 && response.success) {
              console.log('✅ Login API: OK - Authentication working');
              resolve(true);
            } else {
              console.log(`❌ Login API: Failed - ${response.message || 'Unknown error'}`);
              resolve(false);
            }
          } catch (e) {
            console.log('❌ Login API: Invalid response format');
            resolve(false);
          }
        });
      });
      
      req.on('error', (error) => {
        console.log(`❌ Login API: ${error.message}`);
        resolve(false);
      });
      
      req.write(postData);
      req.end();
    });
  } catch (error) {
    console.log(`❌ Login API: ${error.message}`);
    return false;
  }
}

async function runVerification() {
  console.log('Starting verification...\n');
  
  const tests = [
    // Frontend tests
    { name: 'Frontend (Root)', url: FRONTEND_URL },
    
    // Backend health tests
    { name: 'Backend Health', url: `${BACKEND_URL}/health` },
    { name: 'Database Health', url: `${BACKEND_URL}/health/db` },
    
    // API tests
    { name: 'API Root', url: `${BACKEND_URL}/api` },
  ];
  
  let passed = 0;
  let total = tests.length + 1; // +1 for login test
  
  // Run endpoint tests
  for (const test of tests) {
    const success = await testEndpoint(test.name, test.url, test.expectedStatus);
    if (success) passed++;
  }
  
  // Test login functionality
  const loginSuccess = await testLogin();
  if (loginSuccess) passed++;
  
  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Your deployment is ready for production.');
    console.log('\nNext steps:');
    console.log('1. Test the full login flow in your browser');
    console.log('2. Change default passwords');
    console.log('3. Set up monitoring and alerts');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please check the issues above.');
    console.log('\nTroubleshooting:');
    console.log('1. Check Render service logs');
    console.log('2. Verify all environment variables are set');
    console.log('3. Ensure services are fully deployed and running');
    process.exit(1);
  }
}

runVerification().catch(console.error);