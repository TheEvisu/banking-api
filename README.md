# Banking API

Small REST API for an account management system: create accounts, deposit, withdraw,
check balance, block, pull statements. Built with NestJS, PostgreSQL and Redis.

The interesting bits are concurrency-safe debits/credits (`SELECT ... FOR UPDATE` plus a
DB unique constraint as a safety net), an `Idempotency-Key` interceptor backed by Redis
with a 24h replay window, and money math that lives in `numeric(19,4)` end to end so
nothing ever touches a JavaScript `Number` for currency.

## Requirements

- Node.js 20+
- Docker and Docker Compose (recommended)
- Or local Postgres 16 and Redis 7 if you'd rather run the API directly

## Quick start (Docker)

```bash
git clone <this-repo>
cd banking-api
cp .env.example .env

docker compose up -d postgres redis
docker compose run --rm api npm run db:setup
docker compose up -d api
```

The API is at http://localhost:3000/api/v1. Swagger UI at http://localhost:3000/api/docs.

The seed script inserts a few persons and accounts in mixed states (active, blocked,
high-limit) so you have something to demo against. The Postman collection auto-captures
a person id via `GET /persons?limit=1`, so "Run Collection" works without manual setup.

## Local dev (without Docker for the API)

```bash
docker compose up -d postgres redis
npm install
cp .env.example .env
npm run db:setup
npm run start:dev
```

## Environment variables

See `.env.example`. The Joi schema in `src/config/validation.schema.ts` is the source of
truth: the app refuses to start if anything required is missing.

| Var | Default | Notes |
|---|---|---|
| `DB_HOST` | localhost | |
| `DB_PORT` | 5432 | |
| `DB_USER` | banking | |
| `DB_PASSWORD` | — | required |
| `DB_NAME` | banking | |
| `REDIS_HOST` | localhost | |
| `REDIS_PORT` | 6379 | |
| `PORT` | 3000 | |
| `LOG_LEVEL` | info | one of fatal/error/warn/info/debug/trace |
| `THROTTLE_TTL_SECONDS` | 60 | per-IP window |
| `THROTTLE_LIMIT` | 100 | per-IP requests per window |
| `THROTTLE_ACCOUNT_TTL_SECONDS` | 60 | per-account window for deposit/withdraw |
| `THROTTLE_ACCOUNT_LIMIT` | 30 | per-account requests per window |
| `IDEMPOTENCY_TTL_HOURS` | 24 | replay window |
| `CORS_ORIGINS` | (empty) | comma-separated list, empty = deny all |

## npm scripts

```
npm run start:dev         # watch mode
npm run start:prod        # node dist/main.js
npm run build
npm run lint
npm run format
npm test                  # unit
npm run test:integration  # needs docker compose -f docker-compose.test.yml up
npm run test:e2e          # ditto
npm run test:cov
npm run test:load         # k6 must be installed
npm run migration:generate -- src/database/migrations/<name>
npm run migration:run
npm run migration:revert
npm run seed
npm run db:setup          # migration:run && seed
```

## API at a glance

Base path: `/api/v1`. Full spec at `/api/docs`.

- `POST /accounts` — create
- `GET /accounts` — list (paginated, optional `personId` filter)
- `GET /accounts/:id` — fetch
- `GET /accounts/:id/balance` — current balance
- `POST /accounts/:id/deposit` — credit
- `POST /accounts/:id/withdraw` — debit
- `POST /accounts/:id/block` — block
- `GET /accounts/:id/statement?from=&to=&limit=&cursor=` — transaction history
- `GET /persons` — list (paginated)
- `GET /persons/:id` — read a person
- `GET /health` and `GET /health/ready` (also flags migration drift)
- `GET /metrics` — Prometheus exposition (HTTP histogram + transaction counters)

Mutating endpoints set `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
and `Retry-After` (on 429s). The deposit and withdraw endpoints also enforce a
per-account bucket (default 30/min) on top of the per-IP limit.

All mutating endpoints accept an optional `Idempotency-Key` header. Replays return the
original response (status + body) for `IDEMPOTENCY_TTL_HOURS` hours. The same key is
also written to the `transactions` row inside a `UNIQUE (account_id, idempotency_key)`
index, so even if Redis is wiped, duplicates within the retention window are still
rejected at the DB level.

All requests carry an `X-Request-Id`. If the client doesn't send one, the server
generates a UUIDv4 and echoes it in the response and in every log line.

## Postman

Import `postman/banking-api.postman_collection.json` and set `baseUrl` if your local URL
differs. The "Happy path" folder runs an end-to-end scenario.

## Architecture

Short version: NestJS modular monolith. Postgres is the source of truth, Redis is the
cache + idempotency lock + rate limiter. Money math is `numeric(19,4)` end to end and
serialised as a string in JSON. Concurrent debits/credits are serialised on a row-level
`SELECT ... FOR UPDATE` inside a single TX.

Long version: see `ARCHITECTURE.md`.

## Testing

```
npm test                 # unit, no infra
npm run test:integration # repos + services with real Postgres/Redis
npm run test:e2e         # full HTTP stack via Supertest
npm run test:load        # k6 scenarios under load
```

A concurrency stress test (`test/integration/transactions.service.int-spec.ts`) fires
100 parallel withdrawals of $10 against an account with a $500 balance and asserts
exactly 50 succeed, 50 are rejected, and the final balance is 0.

CI runs lint + build + unit + integration + e2e on every PR (see `.github/workflows`).

## Notes and trade-offs

- Authentication is intentionally out of scope for this exam. The codebase is structured
  so a `Guard` or middleware (JWT, API key, etc.) drops cleanly into `src/common/` without
  touching domain logic. There's a TODO in `accounts.service.ts` marking the spot
  where ownership checks would land.
- An "unblock" endpoint isn't included — the spec only specified the block direction.
  Leaving it out keeps the surface honest.
- Money is stored as `numeric(19,4)` and serialised as a string in JSON to dodge
  `Number.MAX_SAFE_INTEGER`. Clients should parse with their own decimal library, not
  `parseFloat`.
- Idempotency has three layers: a Redis-backed lock that also stores a SHA-256 of the
  request body (so a replay with a *different* payload is rejected with 409), a DB
  unique constraint on `(account_id, idempotency_key)` as a safety net, and a 503
  degradation path if Redis is down — better to fail closed on a mutating request with
  a key than risk a non-idempotent retry.
- Account numbers come from a Postgres SEQUENCE (`accounts_number_seq`) — atomic,
  no read-then-write race, and easy to seed/reset.
- The `/health/ready` endpoint compares the latest applied migration name to a
  constant in the binary (`src/database/expected-migration.ts`). Bump it in the same
  commit that introduces a migration so a binary deployed against an older DB fails
  readiness loudly instead of silently corrupting data.

## License

MIT.
