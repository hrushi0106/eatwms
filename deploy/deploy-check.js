#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

console.log('🚀 EATWMS Deployment Checker\n');

// Check if GitHub repo is accessible
function checkGitHub() {
  return new Promise((resolve) => {
    const req = https.get('https://api.github.com/repos/hrushi0106/eatwms', (res) => {
      if (res.statusCode === 200) {
        console.log('✅ GitHub repository: READY');
        resolve(true);
      } else {
        console.log('❌ GitHub repository: NOT ACCESSIBLE');
        resolve(false);
      }
    });
    req.on('error', () => {
      console.log('❌ GitHub repository: CONNECTION ERROR');
      resolve(false);
    });
  });
}

// Check if files are ready for deployment
function checkFiles() {
  const requiredFiles = [
    './backend/package.json',
    './frontend/package.json', 
    './backend/Dockerfile',
    './frontend/Dockerfile',
    './docker-compose.yml'
  ];
  
  let allFound = true;
  console.log('\n📁 Checking deployment files:');
  
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - MISSING`);
      allFound = false;
    }
  });
  
  return allFound;
}

async function main() {
  const githubOk = await checkGitHub();
  const filesOk = checkFiles();
  
  console.log('\n' + '='.repeat(50));
  
  if (githubOk && filesOk) {
    console.log('🎉 READY FOR DEPLOYMENT!');
    console.log('\n📋 Next steps:');
    console.log('1. Follow instructions in ./deploy/QUICK-DEPLOY.md');
    console.log('2. Total time needed: ~10 minutes');
    console.log('3. Result: Public URL for your attendance system');
  } else {
    console.log('⚠️  DEPLOYMENT NOT READY');
    if (!githubOk) console.log('- Fix GitHub repository access');
    if (!filesOk) console.log('- Fix missing files');
  }
  
  console.log('\n🔗 Useful links:');
  console.log('- GitHub: https://github.com/hrushi0106/eatwms');
  console.log('- Neon: https://neon.tech');
  console.log('- Render: https://render.com');
}

main();