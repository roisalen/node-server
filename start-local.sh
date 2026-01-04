#!/bin/bash

# Local development startup script

echo "🚀 Starting Ro i salen Backend Server..."

# Check if JWT_SECRET is set
if [ -z "$JWT_SECRET" ]; then
    echo "⚠️  WARNING: JWT_SECRET not set. Using default (INSECURE - only for local testing)"
    export JWT_SECRET="local-dev-secret-change-in-production"
fi

# Set development defaults
export NODE_ENV=${NODE_ENV:-development}
export MONGOLAB_URI=${MONGOLAB_URI:-"127.0.0.1:27017/roisalen"}
export ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-"http://localhost:3000,http://localhost:5173,http://localhost:8080"}

echo "📋 Configuration:"
echo "   NODE_ENV: $NODE_ENV"
echo "   MONGOLAB_URI: $MONGOLAB_URI"
echo "   JWT_SECRET: ${JWT_SECRET:0:10}..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start server
echo "🌐 Starting server on http://localhost:8080"
echo "   Press Ctrl+C to stop"
echo ""
node server.js

