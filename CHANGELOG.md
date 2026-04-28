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
- `npm run db:setup` shortcut that runs migrations and seeds in one go.

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
