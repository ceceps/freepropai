#!/bin/bash

# Kill background processes on exit
trap "kill 0" EXIT

echo "🚀 Starting Freeprop AI Development Environment..."

# Start Backend
echo "📡 Starting Backend..."
(cd backend && bun run dev) &

# Start Frontend
echo "💻 Starting Frontend..."
(cd frontend && bun run dev) &

# Wait for both
wait
