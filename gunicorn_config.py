"""
Gunicorn configuration for Render FREE TIER deployment (512MB RAM).
Optimized for stability with large Excel uploads (4,000-7,000 customer records).

KEY OPTIMIZATIONS FOR RENDER FREE TIER:
- Single worker to minimize memory footprint (512MB total)
- Extended timeout (600s/10min) for large Excel processing
- Aggressive memory cleanup via max_requests
- Sync worker class for predictable memory usage
"""

import multiprocessing
import os
import sys

# DIAGNOSTIC: Confirm config file is being loaded
print("=" * 80, file=sys.stderr)
print("🔧 LOADING gunicorn_config.py - RENDER FREE TIER OPTIMIZED", file=sys.stderr)
print("=" * 80, file=sys.stderr)

# Server socket
# Render provides PORT via environment variable
bind = f"0.0.0.0:{os.environ.get('PORT', '10000')}"

# RENDER FREE TIER OPTIMIZATION: Moderate backlog
# 1024 is sufficient for typical traffic without consuming excess memory
backlog = 1024

# ═══════════════════════════════════════════════════════════════
# CRITICAL: WORKER CONFIGURATION FOR 512MB RAM LIMIT
# ═══════════════════════════════════════════════════════════════
# 
# WHY ONLY 1 WORKER?
# - Render free tier has 512MB total RAM
# - System overhead: ~100MB
# - Database connections: ~50MB
# - Single worker with large upload: ~150-250MB
# - Multiple workers = guaranteed OOM crashes
# 
# TRADE-OFF:
# - Sequential request processing (acceptable for admin uploads)
# - No parallel processing (fine for low traffic)
# - Maximum memory available for each request (~350MB)
# 
workers = int(os.environ.get('GUNICORN_WORKERS', '1'))  # Force 1 worker for free tier

# SYNC WORKER CLASS:
# - Predictable memory usage (no async overhead)
# - Simple request lifecycle (easier to debug)
# - Works reliably with Django ORM transactions
worker_class = 'sync'

# Connection limit per worker (not critical for 1 worker)
worker_connections = 100

# ═══════════════════════════════════════════════════════════════
# TIMEOUT CONFIGURATION FOR LARGE EXCEL UPLOADS
# ═══════════════════════════════════════════════════════════════
# 
# WHY 600 SECONDS (10 MINUTES)?
# - 7,000 customer upload with chunk processing: ~5-8 minutes
# - Network latency on free tier: +1-2 minutes
# - Database bulk inserts: ~2-3 minutes for 7K records
# - Safety margin: 2 minutes
# 
# RENDER'S REQUEST TIMEOUT:
# - Render has its own 15-minute proxy timeout
# - Our 10-minute timeout ensures graceful worker shutdown
# 
# CRITICAL: Allow environment override but default to 600
timeout = int(os.environ.get('GUNICORN_TIMEOUT', '600'))  # 10 minutes for large Excel processing

# Graceful shutdown timeout (worker cleanup after SIGTERM)
graceful_timeout = 60  # Allow 1 minute for cleanup

# Keep-alive for persistent connections (reduces overhead)
keepalive = 5

# ═══════════════════════════════════════════════════════════════
# MEMORY LEAK PREVENTION
# ═══════════════════════════════════════════════════════════════
# 
# WHY RESTART WORKERS FREQUENTLY?
# - Django/Python can accumulate memory over time
# - Excel processing with openpyxl has minor leaks
# - Free tier can't afford gradual memory growth
# 
# STRATEGY:
# - Restart worker every 100-200 requests
# - Jitter prevents all workers restarting simultaneously
# - Fresh worker = clean memory state
# 
max_requests = 150  # Restart after 150 requests (was 500)
max_requests_jitter = 50  # Random +0-50 requests

# ═══════════════════════════════════════════════════════════════
# LOGGING CONFIGURATION
# ═══════════════════════════════════════════════════════════════
# 
# Stream logs to Render's log aggregation
accesslog = '-'  # stdout (visible in Render dashboard)
errorlog = '-'   # stderr (visible in Render dashboard)

# INFO level is ideal for production monitoring
# Use DEBUG only for troubleshooting (increases log volume)
loglevel = os.environ.get('GUNICORN_LOG_LEVEL', 'info')

# Detailed access log format (includes request duration in microseconds)
# %(D)s is CRITICAL for identifying slow requests
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)sµs'

# Process naming
proc_name = 'primepre-backend'

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None

# ═══════════════════════════════════════════════════════════════
# DIAGNOSTIC OUTPUT - Confirm Configuration is Applied
# ═══════════════════════════════════════════════════════════════
print(f"⚙️  Workers: {workers}", file=sys.stderr)
print(f"⏱️  Timeout: {timeout}s (10 minutes)", file=sys.stderr)
print(f"🔄 Max Requests: {max_requests} (memory cleanup)", file=sys.stderr)
print(f"🔌 Backlog: {backlog}", file=sys.stderr)
print(f"👷 Worker Class: {worker_class}", file=sys.stderr)
print("=" * 80, file=sys.stderr)
tmp_upload_dir = None

# SSL (handled by Render)
# No SSL config needed - Render terminates SSL

# ═══════════════════════════════════════════════════════════════
# LIFECYCLE HOOKS FOR MONITORING
# ═══════════════════════════════════════════════════════════════

def post_fork(server, worker):
    """Called just after a worker has been forked.
    
    MONITORING: Track worker spawns to detect restart loops.
    """
    server.log.info("[WORKER-SPAWN] pid=%s | Free tier: 1 worker max", worker.pid)

def pre_fork(server, worker):
    """Called just before forking a worker.
    
    OPTIMIZATION: Could add memory cleanup here if needed.
    """
    pass

def pre_exec(server):
    """Called just before master process re-executes itself.
    
    MONITORING: Detect master process restarts (rare, indicates issues).
    """
    server.log.info("[MASTER-RESTART] Gunicorn master re-executing")

def when_ready(server):
    """Called when server is fully started and ready.
    
    MONITORING: Confirms successful startup in Render logs.
    """
    server.log.info("=" * 70)
    server.log.info("🚀 PRIMEPRE BACKEND READY - Render Free Tier (512MB)")
    server.log.info("   Workers: %s | Timeout: %ss | Max Requests: %s", 
                    workers, timeout, max_requests)
    server.log.info("   Optimized for: 4K-7K customer Excel uploads")
    server.log.info("=" * 70)

def worker_int(worker):
    """Worker received SIGINT or SIGQUIT (graceful shutdown).
    
    MONITORING: Normal shutdown, no action needed.
    """
    worker.log.info("[WORKER-SHUTDOWN] pid=%s | Graceful stop", worker.pid)

def worker_abort(worker):
    """Worker received SIGABRT (crashed).
    
    CRITICAL: This indicates a serious problem (OOM, segfault, etc).
    Check Render logs immediately if you see this.
    """
    worker.log.error("❌ [WORKER-CRASH] pid=%s | SIGABRT received - Check memory usage!", 
                     worker.pid)
