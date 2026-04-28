import http from 'k6/http';
import { check } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
  vus: 200,
  duration: '30s',
  thresholds: {
    'http_req_failed{expected_response:true}': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const ACCOUNT_ID = __ENV.ACCOUNT_ID;

if (!ACCOUNT_ID) {
  throw new Error('ACCOUNT_ID env var is required (single UUID)');
}

export default function () {
  const res = http.post(
    `${BASE_URL}/accounts/${ACCOUNT_ID}/withdraw`,
    JSON.stringify({ amount: 1 }),
    {
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': uuidv4() },
    },
  );

  check(res, {
    'success or insufficient funds': (r) =>
      r.status === 201 || (r.status === 409 && r.body.includes('INSUFFICIENT_FUNDS')),
    'never negative': (r) => {
      if (r.status !== 201) return true;
      const body = r.json();
      return parseFloat(body.balanceAfter) >= 0;
    },
  });
}
