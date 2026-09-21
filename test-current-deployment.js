#!/usr/bin/env node

/**
 * Test Current Render Deployment
 * Tests the current eatwms-1 service on Render
 */

const https = require('https');

const BACKEND_URL = 'https://eatwms-1.onrender.com';

async function testEndpoint(name, path) {
  return new Promise((resolve) => {
    const url = `${BACKEND_URL}${path}`;
    console.log(`Testing ${name}: ${url}`);
    
    const startTime = Date.now();
    
    https.get(url, (res) => {
      const duration = Date.now() - startTime;
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ ${name}: OK (${res.statusCode}) - ${duration}ms`);
          try {
            const parsed = JSON.parse(data);
            if (parsed.success) {
              console.log(`   Response: ${parsed.message || 'Success'}`);
            }
          } catch (e) {
            console.log(`   Response: ${data.substring(0, 100)}...`);
          }
        } else {
          console.log(`❌ ${name}: Status ${res.statusCode} - ${duration}ms`);
          console.log(`   Error: ${data}`);
        }
        resolve();
      });
    }).on('error', (err) => {
      console.log(`❌ ${name}: ${err.message}`);
      resolve();
    });
  });
}

async function runTests() {
  console.log('🚀 Testing EATWMS Deployment on Render\n');
  console.log(`Backend URL: ${BACKEND_URL}\n`);
  
  const tests = [
    { name: 'Health Check', path: '/health' },
    { name: 'Database Health', path: '/health/db' },
    { name: 'API Root', path: '/api' },
  ];
  
  for (const test of tests) {
    await testEndpoint(test.name, test.path);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('Test completed!');
  console.log('\nIf health checks pass, your backend is working.');
  console.log('Next step: Deploy frontend and test full application.');
}

runTests().catch(console.error);