"""
Simple, Windows-friendly load test tool for HTTP endpoints.
- Usage: python load_test.py --url http://localhost:8000/api/ --concurrency 100 --duration 30
- Produces: total requests, successful, failed, RPS, latency percentiles (p50/p95/p99)

This is intentionally simple and suitable for smoke/per-endpoint testing. For heavy production testing use wrk, vegeta, or k6.
"""

import argparse
import requests
import time
import threading
import statistics
from concurrent.futures import ThreadPoolExecutor

def worker_loop(session, method, url, data, headers, results, stop_event):
    """Worker loop: runs until stop_event is set. Records tuples of
    (status_code, elapsed_seconds, error_message_or_empty).
    """
    while not stop_event.is_set():
        start = time.perf_counter()
        try:
            if method == 'GET':
                r = session.get(url, headers=headers, timeout=10)
            else:
                r = session.post(url, json=data, headers=headers, timeout=30)
            elapsed = time.perf_counter() - start
            results.append((r.status_code, elapsed, ''))
        except Exception as e:
            elapsed = time.perf_counter() - start
            results.append((0, elapsed, str(e)))


def run_load_test(url, concurrency, duration, method='GET', data=None, headers=None):
    manager = []  # shared list of tuples (status_code, elapsed, error)
    headers = headers or {}

    # Use a fresh stop event for each run so we can run multiple tests in one process
    stop_event = threading.Event()

    # Pre-create sessions so each thread reuses a connection pool
    sessions = [requests.Session() for _ in range(concurrency)]

    with ThreadPoolExecutor(max_workers=concurrency) as ex:
        futures = []
        for i in range(concurrency):
            futures.append(ex.submit(worker_loop, sessions[i], method, url, data, headers, manager, stop_event))

        # Run for specified duration
        print(f"Running {method} load test to {url} with concurrency={concurrency} for {duration}s")
        try:
            time.sleep(duration)
        except KeyboardInterrupt:
            print("Interrupted by user")
        finally:
            stop_event.set()

        # give threads a moment to finish
        time.sleep(0.5)

    # Analyze results
    total = len(manager)
    successes = sum(1 for s, _, _ in manager if 200 <= s < 400)
    failures = total - successes
    latencies = [t for s, t, _ in manager if t is not None and s != 0]
    errors = [err for s, _, err in manager if s == 0 and err]

    rps = successes / duration if duration > 0 else 0

    def percentile(ns, p):
        if not ns:
            return None
        k = (len(ns) - 1) * (p / 100.0)
        f = int(k)
        c = min(f + 1, len(ns) - 1)
        if f == c:
            return ns[int(k)]
        d0 = ns[f] * (c - k)
        d1 = ns[c] * (k - f)
        return d0 + d1

    latencies_sorted = sorted(latencies)
    p50 = percentile(latencies_sorted, 50)
    p95 = percentile(latencies_sorted, 95)
    p99 = percentile(latencies_sorted, 99)

    print("\nTest Summary")
    print("-----------")
    print(f"Total samples: {total}")
    print(f"Successful (2xx-3xx): {successes}")
    print(f"Failed: {failures}")
    print(f"RPS (successful / duration): {rps:.2f}")
    if p50 is not None:
        print(f"Latency p50: {p50*1000:.2f} ms")
        print(f"Latency p95: {p95*1000:.2f} ms")
        print(f"Latency p99: {p99*1000:.2f} ms")
    else:
        print("No latency samples collected")

    if errors:
        print("\nSample error messages (first 10):")
        for e in errors[:10]:
            print(" -", e)

    return {
        'total': total,
        'successes': successes,
        'failures': failures,
        'rps': rps,
        'p50': p50,
        'p95': p95,
        'p99': p99,
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Simple HTTP load tester')
    parser.add_argument('--url', required=True, help='Target URL (include path)')
    parser.add_argument('--concurrency', '-c', type=int, default=50, help='Number of concurrent threads')
    parser.add_argument('--duration', '-d', type=int, default=15, help='Test duration in seconds')
    parser.add_argument('--method', '-m', choices=['GET', 'POST'], default='GET')
    parser.add_argument('--data', help='JSON payload (for POST)')
    parser.add_argument('--header', '-H', action='append', help='Headers as Key:Value (repeatable)')

    args = parser.parse_args()
    hdrs = {}
    if args.header:
        for h in args.header:
            if ':' in h:
                k, v = h.split(':', 1)
                hdrs[k.strip()] = v.strip()

    payload = None
    if args.data:
        import json
        payload = json.loads(args.data)

    run_load_test(args.url, args.concurrency, args.duration, method=args.method, data=payload, headers=hdrs)
