import { TestHandle, createTestApp, resetState } from '../helpers/app-factory';
import { buildAccount, buildPerson } from '../fixtures/builders';

import { TransactionsRepository } from '../../src/modules/transactions/transactions.repository';

describe('TransactionsRepository (integration)', () => {
  let handle: TestHandle;
  let repo: TransactionsRepository;

  beforeAll(async () => {
    handle = await createTestApp();
    repo = handle.app.get(TransactionsRepository);
  });

  afterAll(async () => {
    await handle.close();
  });

  beforeEach(async () => {
    await resetState(handle);
  });

  it('rejects amount <= 0 via CHECK constraint', async () => {
    const person = await buildPerson(handle.dataSource);
    const account = await buildAccount(handle.dataSource, person.id);

    await expect(
      handle.dataSource.query(
        'INSERT INTO transactions (account_id, type, amount, balance_after) VALUES ($1, $2, $3, $4)',
        [account.id, 'deposit', 0, 0],
      ),
    ).rejects.toThrow(/chk_tx_amount_positive/);
  });

  it('UNIQUE (account_id, idempotency_key) prevents duplicates', async () => {
    const person = await buildPerson(handle.dataSource);
    const account = await buildAccount(handle.dataSource, person.id);

    await handle.dataSource.transaction(async (m) => {
      await repo.insertWithManager(m, {
        accountId: account.id,
        type: 'deposit',
        amount: '10',
        balanceAfter: '10',
        idempotencyKey: 'k1',
        description: null,
      });
    });

    await expect(
      handle.dataSource.transaction(async (m) => {
        await repo.insertWithManager(m, {
          accountId: account.id,
          type: 'deposit',
          amount: '10',
          balanceAfter: '20',
          idempotencyKey: 'k1',
          description: null,
        });
      }),
    ).rejects.toThrow(/UQ_transactions_account_idempotency|duplicate key/);
  });

  it('NULL idempotency_key does not collide', async () => {
    const person = await buildPerson(handle.dataSource);
    const account = await buildAccount(handle.dataSource, person.id);

    await handle.dataSource.transaction(async (m) => {
      await repo.insertWithManager(m, {
        accountId: account.id,
        type: 'deposit',
        amount: '5',
        balanceAfter: '5',
        idempotencyKey: null,
        description: null,
      });
      await repo.insertWithManager(m, {
        accountId: account.id,
        type: 'deposit',
        amount: '5',
        balanceAfter: '10',
        idempotencyKey: null,
        description: null,
      });
    });
  });
});
