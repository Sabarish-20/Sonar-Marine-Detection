#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " Starting AQUASCAN AI Side-Scan Sonar System (SIH26057)"
echo "=========================================================="

# Activate python virtualenv if present
if [ -d ".venv" ]; then
    echo "[1/2] Activating Python virtual environment..."
    source .venv/bin/activate
fi

# Start backend in background
echo "[2/2] Starting FastAPI Backend Service on http://localhost:8000..."
uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Trap Ctrl+C to terminate background backend
cleanup() {
    echo ""
    echo "Shutting down services..."
    kill $BACKEND_PID 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

echo "Starting Frontend Vite Server on http://localhost:5173..."
cd frontend && npm run dev

