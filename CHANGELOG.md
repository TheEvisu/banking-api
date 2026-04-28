# Changelog

All notable changes are tracked here. The format follows [Keep a Changelog](https://keepachangelog.com/),
versions follow [SemVer](https://semver.org/).

## [Unreleased]

### Added
- Postgres sequence backing `accounts.account_number`, removing the `MAX+1` race that
  could surface as a 500 to a parallel "create account" caller.
- Body-hash check on the `Idempotency-Key` flow: replaying a key with a *different*
  payload now returns `409 IDEMPOTENCY_CONFLICT` instead of silently replaying the
  first response.
- `GET /api/v1/metrics` Prometheus endpoint exposing `http_request_duration_seconds`
  histogram and `banking_transactions_total{type,outcome}` counter, plus default
  process metrics.
- Composite index `(account_id, created_at DESC, id DESC)` on transactions so the
  cursor-based statement query is a range scan even at high row counts.
- Per-account rate limiting (default 30 req/min, configurable via
  `THROTTLE_ACCOUNT_LIMIT`) on `POST /deposit` and `POST /withdraw`. Responses now
  carry `X-RateLimit-*` and `Retry-After` headers.
- `/api/v1/health/ready` now also checks migration drift: if the most recent applied
  migration name doesn't match the binary's expected version, readiness returns 503.
- `GET /api/v1/persons` and `GET /api/v1/accounts` list endpoints with cursor
  pagination; the latter accepts a `personId` filter.
- A dev-only seed (`002-dev-fixtures.seed.ts`) that creates active, blocked and
  high-limit account fixtures so a fresh checkout can demo the full surface.
- The Postman collection's first request now lists persons and auto-captures a
  `personId` into the collection variable, so "Run Collection" works end-to-end.
- `npm run db:setup` shortcut that runs migrations and seeds in one go.

### Changed
- Idempotency layer now returns `503 IDEMPOTENCY_UNAVAILABLE` for mutating requests
  that carry an `Idempotency-Key` while Redis is unreachable, instead of risking a
  non-idempotent retry. Requests without a key proceed as normal.
- The `withdraw-contention.js` k6 scenario now runs a 1-VU replenisher in parallel so
  contention is measured against a healthy account, and asserts a `no_negative_balance`
  rate of 1.0 across the run.

## [0.1.0] - 2026-04-28

First cut. Functional surface complete and tested.

### Added
- Persons, Accounts, Transactions, Idempotency and Health modules.
- TypeORM migrations for `persons`, `accounts`, `transactions`, plus `pgcrypto`.
- Seed script for an initial person row.
- Redis-backed `Idempotency-Key` interceptor with a DB unique-constraint safety net.
- Row-level `SELECT ... FOR UPDATE` on every balance mutation.
- Daily withdrawal limit enforcement (UTC day window).
- Cursor-paginated statement endpoint with optional `from`/`to` period filter.
- Global Pino logger, request-id middleware, throttler guard, helmet, compression.
- Swagger UI at `/api/docs`.
- Multi-stage Dockerfile, docker-compose for dev and test, GitHub Actions CI.
- Unit, integration (incl. 100-vu concurrency stress) and e2e test suites.
- k6 load scripts: `deposit-burst`, `withdraw-contention`, `mixed-traffic`.
