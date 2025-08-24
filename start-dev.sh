#!/bin/bash

# Start development servers for ArcTecFox Mono

echo "Starting ArcTecFox development servers..."

# Kill any existing servers on ports 3000 and 8000
echo "Checking for existing servers..."
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Killing existing backend server on port 8000..."
    fuser -k 8000/tcp 2>/dev/null || sudo fuser -k 8000/tcp 2>/dev/null
    sleep 1
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Killing existing frontend server on port 3000..."
    fuser -k 3000/tcp 2>/dev/null || sudo fuser -k 3000/tcp 2>/dev/null
    sleep 1
fi

# Also kill any npm or uvicorn processes that might be hanging
pkill -f "npm run dev" 2>/dev/null
pkill -f "uvicorn main:app" 2>/dev/null

echo "Servers cleared. Starting fresh..."

# Make port 8000 public if we're in GitHub Codespaces
if [ -n "$CODESPACE_NAME" ]; then
    echo "Detected GitHub Codespaces environment. Setting port 8000 to public..."
    gh codespace ports visibility 8000:public -c $CODESPACE_NAME 2>/dev/null || echo "Note: Could not set port visibility (this is normal if already set)"
fi

# Start backend server in background
echo "Starting backend server..."
cd /workspaces/ArcTecFox_Mono/apps/welcome/backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend to start..."
sleep 5

# Start frontend server
echo "Starting frontend server..."
cd /workspaces/ArcTecFox_Mono/apps/welcome/frontend
npm run dev

# When frontend exits, kill backend
kill $BACKEND_PID 2>/dev/null