#!/bin/bash

echo "🚀 Starting EATWMS Backend Build for Render..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Type check
echo "🔍 Running TypeScript checks..."
npm run typecheck

# Build TypeScript
echo "🏗️ Building TypeScript..."
npm run build

# Verify build output
echo "✅ Build completed!"
ls -la dist/

echo "🎯 Ready for deployment!"