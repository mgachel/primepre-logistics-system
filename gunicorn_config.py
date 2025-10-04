"""
Gunicorn configuration for Render deployment.
Optimized for handling large customer Excel uploads (4,000-7,000 records).
"""

import multiprocessing
import os

# Server socket
bind = f"0.0.0.0:{os.environ.get('PORT', '10000')}"
backlog = 2048

# Worker processes
# Use 2-4 workers on Render free tier (512MB RAM)
# Each worker needs ~100-150MB for large uploads
workers = int(os.environ.get('GUNICORN_WORKERS', '2'))
worker_class = 'sync'
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50

# Timeout settings
# Increased timeout for large Excel uploads (4,000-7,000 customers)
# Processing time: ~30-60 seconds for 5,000 customers
timeout = 300  # 5 minutes - allow time for large uploads
graceful_timeout = 30
keepalive = 5

# Memory management
# Restart workers after processing many requests to prevent memory leaks
max_requests = 500
max_requests_jitter = 50

# Logging
accesslog = '-'  # Log to stdout
errorlog = '-'   # Log to stderr
loglevel = os.environ.get('GUNICORN_LOG_LEVEL', 'info')
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = 'primepre-backend'

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# SSL (handled by Render)
# No SSL config needed - Render terminates SSL

def post_fork(server, worker):
    """Called just after a worker has been forked."""
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def pre_fork(server, worker):
    """Called just before forking a worker."""
    pass

def pre_exec(server):
    """Called just before forking off the master process."""
    server.log.info("Forked child, re-executing.")

def when_ready(server):
    """Called just after the server is started."""
    server.log.info("Server is ready. Spawning workers")

def worker_int(worker):
    """Called just after a worker exited on SIGINT or SIGQUIT."""
    worker.log.info("Worker received INT or QUIT signal")

def worker_abort(worker):
    """Called when a worker received the SIGABRT signal."""
    worker.log.info("Worker received SIGABRT signal")
