#!/usr/bin/env python
"""
Startup script for Render - Runs Django Q worker and Gunicorn together.
More reliable than bash script for process management.
"""
import os
import sys
import subprocess
import signal
import time

def main():
    print("🚀 Starting Primepre Backend (Web + Worker)")
    
    # Start Django Q worker in background
    print("📦 Starting background task worker...")
    worker = subprocess.Popen(
        [sys.executable, "manage.py", "qcluster"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        bufsize=1,
        universal_newlines=True
    )
    print(f"✅ Worker started (PID: {worker.pid})")
    
    # Start Gunicorn web server
    print("🌐 Starting Gunicorn web server...")
    gunicorn = subprocess.Popen([
        "gunicorn",
        "primepre.wsgi:application",
        "--config", "gunicorn_config.py",
        "--workers=1",
        "--timeout=600",
        "--max-requests=150",
        "--worker-class=sync",
        "--backlog=1024"
    ])
    print(f"✅ Gunicorn started (PID: {gunicorn.pid})")
    
    # Handle signals
    def shutdown(signum, frame):
        print("\n⚠️ Shutting down...")
        worker.terminate()
        gunicorn.terminate()
        worker.wait(timeout=5)
        gunicorn.wait(timeout=5)
        sys.exit(0)
    
    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)
    
    # Monitor both processes
    try:
        while True:
            # Check if either process died
            worker_status = worker.poll()
            gunicorn_status = gunicorn.poll()
            
            if worker_status is not None:
                print(f"❌ Worker died with code {worker_status}")
                gunicorn.terminate()
                sys.exit(1)
            
            if gunicorn_status is not None:
                print(f"❌ Gunicorn died with code {gunicorn_status}")
                worker.terminate()
                sys.exit(1)
            
            time.sleep(1)
    except KeyboardInterrupt:
        shutdown(None, None)

if __name__ == "__main__":
    main()
