# Architecture

## High level

A NestJS HTTP service in front of Postgres (system of record) and Redis (cache + lock +
rate limit). One process, no message broker, no background workers — everything happens
on the request path inside a single DB transaction.

```mermaid
flowchart LR
  Client[Client] -->|HTTP/JSON| API[NestJS API]
  API --> Throttle[Throttler guard]
  API --> Idem[Idempotency interceptor]
  API --> Filter[Validation pipe + filter]
  API --> SVC[Domain services]
  SVC --> PG[(Postgres 16)]
  SVC --> RD[(Redis 7)]
  Health[/api/v1/health/ready/] --> PG
  Health --> RD
```

## Modules

The codebase is split into thin domain modules. Each module owns its controller,
service, repository, DTOs, and entity definitions. Modules talk through the public
service exports; repositories don't cross module boundaries.

```
src/modules/
  persons/        read-only, only exists so Account can have a relation
  accounts/       create, fetch, balance, block
  transactions/   deposit, withdraw, statement (the only place that mutates balance)
  idempotency/    Redis-backed replay layer, applied via APP_INTERCEPTOR
  health/         /health and /health/ready
```

`AccountsModule` exports `AccountsRepository` so `TransactionsService` can take a
row-level lock without going through another service layer. That coupling is deliberate:
balance mutations live in one place (`TransactionsService`) and need direct access to
the locking primitive.

## Request lifecycle

1. `RequestIdMiddleware` reads `X-Request-Id` (validates as UUID) or generates a UUIDv4.
   The id is attached to every Pino log line.
2. `helmet`, `compression`, JSON body limit (`100kb`), CORS.
3. `ThrottlerGuard` (per-IP bucket).
4. `IdempotencyInterceptor` (only on mutating methods with an `Idempotency-Key` header).
5. `ValidationPipe` (whitelisted DTOs, `forbidNonWhitelisted: true`).
6. Controller → service → repository.
7. `GlobalExceptionFilter` maps domain errors and `HttpException` to a single envelope.

## Money math

All amounts are `numeric(19,4)` in Postgres and pass through `decimal.js` in the
service layer (`src/common/money/money.ts`). The `formatMoney` helper rounds half-up to
4 decimal places on every write. JSON responses always serialize money as a string —
the OpenAPI spec advertises this so clients don't get burned.

The cents-as-integer alternative was considered and rejected because reports run raw
SQL math and `numeric(19,4)` keeps that ergonomic. The trade-off is that the service
layer has to be careful never to feed amounts through a JS `Number`.

## Concurrency

```mermaid
sequenceDiagram
    participant C as Client
    participant API as NestJS
    participant Redis
    participant DB as Postgres
    C->>API: POST /accounts/:id/deposit (Idempotency-Key)
    API->>Redis: SET idempotency:<...> NX EX 30
    Redis-->>API: OK (lock acquired)
    API->>DB: BEGIN
    API->>DB: SELECT * FROM accounts WHERE id=:id FOR UPDATE
    API->>DB: INSERT transaction
    API->>DB: UPDATE account SET balance = balance + amount
    API->>DB: COMMIT
    API->>Redis: SET idempotency:<...> {status, body} EX 24h
    API-->>C: 201 Created
```

The lock is held by Postgres for the duration of the transaction. The next concurrent
request on the same row blocks at the `SELECT ... FOR UPDATE` step and runs after the
first commit. The 100-vu stress test in `test/integration/transactions.service.int-spec.ts`
verifies that 100 concurrent $10 withdrawals against a $500 balance produce exactly
50 successes, 50 `INSUFFICIENT_FUNDS`, and a final balance of 0.

## Idempotency

Three layers:

1. **Redis lock + replay cache + body hash.** On a mutating request with `Idempotency-Key`:
   - Compute `hash = sha256(canonical_json(body))`.
   - `SET idempotency:<path>:<key> {phase: 'pending', hash} NX EX 30` to acquire a lock.
   - If a stored entry exists and its hash matches:
     - `phase === 'done'`: replay the cached `{status, body}`.
     - `phase === 'pending'`: return 409 (still in flight).
   - If the stored hash differs from the request's, return 409 — the caller reused a key
     with a different payload, which is almost always a bug.
   - On success, store `{phase: 'done', hash, status, body}` with the configured TTL.
   - On failure, release the lock so the client can retry.
2. **DB unique constraint.** `transactions.idempotency_key` is recorded with a partial
   `UNIQUE (account_id, idempotency_key)` index. If Redis is wiped, a duplicate request
   gets caught at the DB layer; the service catches the violation and returns the
   existing row.
3. **503 fail-closed on Redis outage.** Any error from Redis during `start()` degrades
   to `IDEMPOTENCY_UNAVAILABLE` (503) for mutating requests that carry a key — better
   than a non-idempotent retry. Requests without a key fall through to the normal
   handler. The per-account rate limit guard fails *open* on Redis errors instead, on
   the principle that legitimate users shouldn't be locked out by infra they can't see.

## Error envelope

A single `GlobalExceptionFilter` produces:

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Account aaa has insufficient funds",
  "code": "INSUFFICIENT_FUNDS",
  "requestId": "8f3b...",
  "timestamp": "2026-04-27T10:00:00.000Z"
}
```

Domain errors live in `src/common/errors` and each one declares its `httpStatus` and
`code`. Validation errors go through `BadRequestException` and use the same envelope.
500s log the underlying error with `requestId`; the response itself carries no internals.

## Configuration

`@nestjs/config` loads `.env`, `src/config/validation.schema.ts` validates with Joi.
The app refuses to start if anything required is missing or malformed. `ConfigModule`
is global so any module can `inject: [ConfigService]`.

## Logging

`nestjs-pino`. JSON in production, pretty-printed in dev. Every line carries
`requestId`. Sensitive headers (`authorization`, `cookie`) are redacted. Bodies are
not logged on purpose.

## Rate limiting

Two layers:

- **Per-IP**, via `@nestjs/throttler` as the global `APP_GUARD`. Default 100 req per
  60s, configurable via `THROTTLE_LIMIT` / `THROTTLE_TTL_SECONDS`.
- **Per-account**, via `AccountThrottlerGuard` attached to deposit and withdraw. Default
  30 req per 60s per account UUID, configurable via `THROTTLE_ACCOUNT_LIMIT` /
  `THROTTLE_ACCOUNT_TTL_SECONDS`. Implemented as a Redis `INCR + EXPIRE` so it works
  across process replicas. On Redis errors the guard fails open with a warn-level log.

Both surface `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`. The
per-account guard also sets `Retry-After` on 429 responses.

## Observability

- **Logs.** `nestjs-pino`, JSON in production, pretty in dev. Every line carries
  `requestId`. Sensitive headers (`authorization`, `cookie`) are redacted. Bodies are
  not logged.
- **Metrics.** `GET /api/v1/metrics` exposes Prometheus text:
  - `http_request_duration_seconds` histogram labelled by method/route/status.
  - `banking_transactions_total{type="deposit"|"withdrawal", outcome="success"|"failure"}`
    counter recorded after every mutation.
  - Default Node process metrics (`process_cpu_*`, `nodejs_eventloop_lag_*`, etc.).
- **Readiness.** `GET /api/v1/health/ready` checks Postgres, Redis and migration drift
  (latest applied vs `EXPECTED_LATEST_MIGRATION` constant in the binary). Drift returns
  503 — your orchestrator should refuse to roll a binary forward against an older DB.

## Testing pyramid

```
unit (50 tests, src/**/*.spec.ts)
  └── pure logic with mocked deps
integration (14 tests, test/integration/*.int-spec.ts)
  └── real Postgres + Redis via docker-compose.test.yml
  └── includes 100-vu concurrency stress and a Redis-outage degradation case
e2e (30 tests, test/e2e/*.e2e-spec.ts)
  └── full Nest app + Supertest, all endpoints
load (k6, test/load/*.js)
  └── deposit burst, withdraw contention (with replenisher), mixed traffic — opt-in
```

## What I would change if this were going to production

- Add an authn/z layer (JWT or API key). The DI seam is already there in
  `src/common/`.
- Promote `daily_withdrawal_limit` to an `account_products` table.
- Run statement reads against a read replica and use `repeatable read` for them.
- Add OpenTelemetry tracing — `requestId` is great for single-service triage but
  doesn't survive a hop to another service.
- Convert the `transactions` table into a strict event log and derive `accounts.balance`
  from a materialised view. The current model is fine at this scale but a real ledger
  shouldn't keep two sources of truth.
