#!/bin/bash
# Single service startup script - Runs both web server and background worker

echo "🚀 Starting Primepre Backend (Web + Worker)"

# Start Django Q worker in background
echo "📦 Starting background task worker..."
python manage.py qcluster &
WORKER_PID=$!
echo "✅ Worker started (PID: $WORKER_PID)"

# Start Gunicorn web server in foreground
echo "🌐 Starting Gunicorn web server..."
gunicorn primepre.wsgi:application \
  --config gunicorn_config.py \
  --workers=1 \
  --timeout=600 \
  --max-requests=150 \
  --worker-class=sync \
  --backlog=1024

# If Gunicorn exits, kill the worker too
echo "⚠️ Gunicorn stopped, shutting down worker..."
kill $WORKER_PID
