Quick load test guide and sizing notes

Goal: Validate and size the backend to handle 1500 RPS for simple API endpoints.

1) Local smoke test (use `load_test.py`)
- Example: test a simple authenticated GET endpoint locally

  python load_test.py --url http://localhost:8000/api/health/ --concurrency 200 --duration 30

- Increase `--concurrency` until you saturate the server. Use `--header 'Authorization: Bearer <token>'` for auth.

2) Interpreting results
- RPS is computed as successful requests / duration.
- Use p50/p95/p99 latencies to find bottlenecks.

3) Sizing guidance to reach 1500 RPS (simple endpoints)
- Assumes PostgreSQL, no expensive CPU work per request, and efficient queries.
- Workers sizing (Gunicorn sync): workers ≈ 2 * CPU + 1
  - If avg latency per request = 10ms, required workers = 1500 * 0.01 = 15 workers -> needs ~7 CPUs (2*7+1=15)
  - If avg latency = 20ms, required workers = 1500 * 0.02 = 30 workers -> needs ~15 CPUs

- Memory: each worker roughly consumes memory; measure with `ps`/task manager. If workers are ~200MB each, 15 workers need 3GB.

4) Recommendations to achieve 1500 RPS reliably
- Move to PostgreSQL for production (no SQLite)
- Offload heavy CPU tasks (Excel parsing) to background workers
- Add Redis for caching and task broker
- Use multiple application instances behind a load balancer rather than a single huge instance
- Use a connection pool for DB and tune conn_max_age
- Optimize DB (indexes, avoid N+1, bulk_create for bulk inserts)

5) Next steps I can do for you
- Run a local load test against a chosen endpoint and report numbers
- Add a wrapper script to run multiple instances locally with Docker compose to simulate multi-instance
- Add a sample Gunicorn systemd service config and a recommended instance size

