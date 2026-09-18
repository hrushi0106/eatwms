#!/usr/bin/env node

/**
 * EATWMS Development Startup Script
 * 
 * Checks dependencies and starts both frontend and backend in development mode.
 * Run: node start-dev.js
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 EATWMS Development Environment Setup\n');

// Check if required files exist
const requiredFiles = [
  'backend/package.json',
  'backend/.env',
  'frontend/package.json',
  'backend/src/server.ts',
  'frontend/src/main.tsx'
];

console.log('Checking required files...');
let allFilesExist = true;

for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - Missing!`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing. Please check your project structure.');
  process.exit(1);
}

// Check if node_modules exist
const backendNodeModules = fs.existsSync('backend/node_modules');
const frontendNodeModules = fs.existsSync('frontend/node_modules');

if (!backendNodeModules || !frontendNodeModules) {
  console.log('\n📦 Installing dependencies...');
  
  if (!backendNodeModules) {
    console.log('Installing backend dependencies...');
    const backendInstall = spawn('npm', ['install'], { 
      cwd: 'backend', 
      stdio: 'inherit',
      shell: true 
    });
    
    backendInstall.on('close', (code) => {
      if (code !== 0) {
        console.log('❌ Backend dependency installation failed');
        process.exit(1);
      }
      installFrontendDeps();
    });
  } else {
    installFrontendDeps();
  }
} else {
  startServices();
}

function installFrontendDeps() {
  if (!frontendNodeModules) {
    console.log('Installing frontend dependencies...');
    const frontendInstall = spawn('npm', ['install'], { 
      cwd: 'frontend', 
      stdio: 'inherit',
      shell: true 
    });
    
    frontendInstall.on('close', (code) => {
      if (code !== 0) {
        console.log('❌ Frontend dependency installation failed');
        process.exit(1);
      }
      startServices();
    });
  } else {
    startServices();
  }
}

function startServices() {
  console.log('\n🎯 Starting development servers...\n');
  
  // Start backend
  console.log('Starting backend server on http://localhost:4000...');
  const backend = spawn('npm', ['run', 'dev'], { 
    cwd: 'backend',
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true
  });
  
  backend.stdout.on('data', (data) => {
    console.log(`[Backend] ${data.toString().trim()}`);
  });
  
  backend.stderr.on('data', (data) => {
    console.log(`[Backend Error] ${data.toString().trim()}`);
  });
  
  // Wait a moment for backend to start, then start frontend
  setTimeout(() => {
    console.log('Starting frontend server on http://localhost:3000...');
    const frontend = spawn('npm', ['run', 'dev'], { 
      cwd: 'frontend',
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });
    
    frontend.stdout.on('data', (data) => {
      console.log(`[Frontend] ${data.toString().trim()}`);
    });
    
    frontend.stderr.on('data', (data) => {
      console.log(`[Frontend Error] ${data.toString().trim()}`);
    });
    
    frontend.on('close', (code) => {
      console.log(`Frontend process exited with code ${code}`);
      backend.kill();
      process.exit(code);
    });
  }, 3000);
  
  backend.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
    process.exit(code);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down development servers...');
    backend.kill('SIGINT');
    // frontend will be killed when backend exits
  });
  
  console.log('\n📝 Development servers starting...');
  console.log('   Backend:  http://localhost:4000');
  console.log('   Frontend: http://localhost:3000');
  console.log('   API:      http://localhost:4000/api');
  console.log('   Health:   http://localhost:4000/health');
  console.log('\n⭐ Press Ctrl+C to stop both servers\n');
}