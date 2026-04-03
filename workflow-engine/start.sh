#!/bin/bash

# Workflow Engine v1.10.0 - Quick Start Script

echo "🚀 Starting Workflow Engine v1.10.0..."
echo ""

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi

# Function to install dependencies
install_deps() {
    local dir=$1
    echo "📦 Installing dependencies in $dir..."
    cd "$dir" || exit 1
    if [ ! -d "node_modules" ]; then
        npm install
    else
        echo "✅ Dependencies already installed"
    fi
    cd - > /dev/null || exit 1
}

# Install backend dependencies
install_deps "backend"

# Install frontend dependencies
install_deps "frontend"

# Create logs directory
mkdir -p logs

echo ""
echo "✅ Dependencies installed!"
echo ""

# Start backend
echo "🔧 Starting backend server..."
cd backend
npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
cd - > /dev/null || exit 1

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 3

# Check if backend is running
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo "❌ Backend failed to start. Check logs/backend.log"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "✅ Backend started successfully!"
echo ""

# Start frontend
echo "🎨 Starting frontend server..."
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"
cd - > /dev/null || exit 1

echo ""
echo "✅ Workflow Engine is running!"
echo ""
echo "📊 Dashboard: http://localhost:3000"
echo "🔧 API: http://localhost:3001/api"
echo "❤️  Health: http://localhost:3001/health"
echo ""
echo "📝 Logs:"
echo "   Backend: logs/backend.log"
echo "   Frontend: logs/frontend.log"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Save PIDs for cleanup
echo $BACKEND_PID > logs/backend.pid
echo $FRONTEND_PID > logs/frontend.pid

# Wait for interrupt signal
trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; rm -f logs/*.pid; echo ""; echo "🛑 Stopped all services"; exit 0' INT TERM

# Keep script running
wait