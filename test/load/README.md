# Load tests

Run with [k6](https://k6.io). Each script reads target accounts from env vars.

```bash
# Set up: create a few accounts via the API and grab their UUIDs.
# (The dev seed in src/database/seeds/002-dev-fixtures.seed.ts also creates a handful.)
export BASE_URL=http://localhost:3000/api/v1
export ACCOUNT_IDS="uuid1,uuid2,uuid3"

# Burst of deposits across multiple accounts.
k6 run deposit-burst.js

# Withdrawal contention against one account. A periodic deposit keeps the balance
# above zero so the test exercises the contention path rather than just bouncing
# off INSUFFICIENT_FUNDS.
ACCOUNT_ID="<single uuid>" k6 run withdraw-contention.js

# Mixed traffic.
k6 run mixed-traffic.js
```

## What each script asserts

- `deposit-burst.js`: p95 < 200ms across 1000 req/s for 60s, error rate < 1%.
- `withdraw-contention.js`: the `no_negative_balance` rate must be 1.0 for the run.
  Successful withdrawals return a non-negative `balanceAfter`. INSUFFICIENT_FUNDS
  responses count as "no negative balance observed" and don't fail the run.
- `mixed-traffic.js`: p95 < 200ms with 60% reads / 30% deposits / 10% withdrawals.

## When you'll see 429s

Per-account rate limiting kicks in at 30 mutating requests per minute (default —
see `THROTTLE_ACCOUNT_LIMIT`). Bump it for load tests:

```bash
THROTTLE_ACCOUNT_LIMIT=10000 docker compose up -d api
```
