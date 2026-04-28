# Load tests

Run with [k6](https://k6.io). Each script reads target accounts from env vars.

```bash
# Setup: create a few accounts via the API and grab their UUIDs
export BASE_URL=http://localhost:3000/api/v1
export ACCOUNT_IDS="uuid1,uuid2,uuid3"

# Burst of deposits
k6 run deposit-burst.js

# Withdrawal contention against one account (start with a generous balance)
ACCOUNT_ID="<single uuid>" k6 run withdraw-contention.js

# Mixed traffic
k6 run mixed-traffic.js
```

The thresholds in each script will fail the run if p95 latency exceeds 200ms or the
error rate exceeds 1%.
