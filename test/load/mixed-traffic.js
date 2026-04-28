import http from 'k6/http';
import { check } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
  scenarios: {
    mixed: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '20s', target: 50 },
        { duration: '30s', target: 50 },
        { duration: '10s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const ACCOUNT_IDS = (__ENV.ACCOUNT_IDS || '').split(',').filter(Boolean);

if (ACCOUNT_IDS.length === 0) {
  throw new Error('ACCOUNT_IDS env var is required (comma-separated UUIDs)');
}

const pickAccount = () => ACCOUNT_IDS[Math.floor(Math.random() * ACCOUNT_IDS.length)];

export default function () {
  const r = Math.random();
  const accountId = pickAccount();

  if (r < 0.6) {
    const res = http.get(`${BASE_URL}/accounts/${accountId}/balance`);
    check(res, { 'balance 200': (resp) => resp.status === 200 });
  } else if (r < 0.9) {
    const res = http.post(
      `${BASE_URL}/accounts/${accountId}/deposit`,
      JSON.stringify({ amount: 0.5 }),
      { headers: { 'Content-Type': 'application/json', 'Idempotency-Key': uuidv4() } },
    );
    check(res, { 'deposit 201': (resp) => resp.status === 201 });
  } else {
    const res = http.post(
      `${BASE_URL}/accounts/${accountId}/withdraw`,
      JSON.stringify({ amount: 0.25 }),
      { headers: { 'Content-Type': 'application/json', 'Idempotency-Key': uuidv4() } },
    );
    check(res, {
      'withdraw 201 or 409': (resp) => resp.status === 201 || resp.status === 409,
    });
  }
}
