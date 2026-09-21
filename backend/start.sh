#!/bin/bash

echo "🚀 Starting EATWMS Backend on Render..."

# Run migrations
echo "🗃️ Running database migrations..."
NODE_ENV=production npx knex migrate:latest --knexfile knexfile.ts

# Check if migrations succeeded
if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully"
    
    # Run seeds
    echo "🌱 Running database seeds..."
    NODE_ENV=production npx knex seed:run --knexfile knexfile.ts
    
    if [ $? -eq 0 ]; then
        echo "✅ Seeds completed successfully"
    else
        echo "⚠️ Seeds failed, but continuing with server start"
    fi
else
    echo "❌ Migrations failed!"
    exit 1
fi

# Start the server
echo "🌟 Starting server..."
node dist/src/server.js