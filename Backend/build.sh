#!/bin/bash
# Render.com build script for Node.js backend

echo "🚀 Starting backend deployment on Render..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run any necessary build steps (if needed)
echo "🔨 Build completed successfully!"

# The start script will be handled by Render using package.json scripts
echo "✅ Backend ready for deployment!"