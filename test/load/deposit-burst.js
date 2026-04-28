import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
  scenarios: {
    burst: {
      executor: 'constant-arrival-rate',
      rate: 1000,
      timeUnit: '1s',
      duration: '60s',
      preAllocatedVUs: 100,
      maxVUs: 400,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<200'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const ACCOUNT_IDS = (__ENV.ACCOUNT_IDS || '').split(',').filter(Boolean);

if (ACCOUNT_IDS.length === 0) {
  throw new Error('ACCOUNT_IDS env var is required (comma-separated UUIDs)');
}

export default function () {
  const accountId = ACCOUNT_IDS[Math.floor(Math.random() * ACCOUNT_IDS.length)];
  const res = http.post(
    `${BASE_URL}/accounts/${accountId}/deposit`,
    JSON.stringify({ amount: 1.5 }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': uuidv4(),
      },
    },
  );
  check(res, {
    'status 201': (r) => r.status === 201,
  });
  sleep(0);
}
