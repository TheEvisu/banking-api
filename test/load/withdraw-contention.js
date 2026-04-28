import http from 'k6/http';
import { check } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// What this measures: hammer one account with concurrent withdrawals while a single VU
// keeps topping it up via deposits. The interesting invariant is "balance never goes
// negative", which is the production guarantee. INSUFFICIENT_FUNDS responses are
// expected and not failures.
export const options = {
  scenarios: {
    withdrawals: {
      executor: 'constant-vus',
      vus: 200,
      duration: '30s',
      exec: 'withdraw',
    },
    replenisher: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      exec: 'replenish',
    },
  },
  thresholds: {
    no_negative_balance: ['rate==1'],
  },
};

import { Rate } from 'k6/metrics';
const noNegativeBalance = new Rate('no_negative_balance');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const ACCOUNT_ID = __ENV.ACCOUNT_ID;
const REPLENISH_AMOUNT = __ENV.REPLENISH_AMOUNT || '50';

if (!ACCOUNT_ID) {
  throw new Error('ACCOUNT_ID env var is required (single UUID)');
}

export function withdraw() {
  const res = http.post(
    `${BASE_URL}/accounts/${ACCOUNT_ID}/withdraw`,
    JSON.stringify({ amount: 1 }),
    { headers: { 'Content-Type': 'application/json', 'Idempotency-Key': uuidv4() } },
  );

  const ok = res.status === 201 || (res.status === 409 && res.body.includes('INSUFFICIENT_FUNDS'));
  check(res, { 'success or insufficient funds': () => ok });

  if (res.status === 201) {
    const balanceAfter = parseFloat(res.json('balanceAfter'));
    noNegativeBalance.add(balanceAfter >= 0);
  } else {
    noNegativeBalance.add(true);
  }
}

export function replenish() {
  http.post(
    `${BASE_URL}/accounts/${ACCOUNT_ID}/deposit`,
    JSON.stringify({ amount: parseFloat(REPLENISH_AMOUNT) }),
    { headers: { 'Content-Type': 'application/json', 'Idempotency-Key': uuidv4() } },
  );
}
