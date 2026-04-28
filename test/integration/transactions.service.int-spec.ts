import { InsufficientFundsError } from '../../src/common/errors';
import { TransactionsService } from '../../src/modules/transactions/transactions.service';
import { TestHandle, createTestApp, resetState } from '../helpers/app-factory';
import { buildAccount, buildPerson } from '../fixtures/builders';

describe('TransactionsService (integration)', () => {
  let handle: TestHandle;
  let service: TransactionsService;

  beforeAll(async () => {
    handle = await createTestApp();
    service = handle.app.get(TransactionsService);
  });

  afterAll(async () => {
    await handle.close();
  });

  beforeEach(async () => {
    await resetState(handle);
  });

  it('serializes 100 concurrent withdrawals against a $500 balance', async () => {
    const person = await buildPerson(handle.dataSource);
    const account = await buildAccount(handle.dataSource, person.id, {
      balance: '500',
      dailyWithdrawalLimit: '0',
    });

    const attempts = Array.from({ length: 100 }, () =>
      service
        .withdraw({ accountId: account.id, amount: 10 })
        .then(() => 'ok')
        .catch((err: Error) =>
          err instanceof InsufficientFundsError ? 'insufficient' : 'unexpected',
        ),
    );
    const results = await Promise.all(attempts);

    const successes = results.filter((r) => r === 'ok').length;
    const failures = results.filter((r) => r === 'insufficient').length;
    const unexpected = results.filter((r) => r === 'unexpected').length;

    expect(unexpected).toBe(0);
    expect(successes).toBe(50);
    expect(failures).toBe(50);

    const updated = await handle.dataSource.query(
      'SELECT balance FROM accounts WHERE id = $1',
      [account.id],
    );
    expect(updated[0].balance).toBe('0.0000');
  }, 30000);

  it('replays an idempotent deposit instead of double-crediting', async () => {
    const person = await buildPerson(handle.dataSource);
    const account = await buildAccount(handle.dataSource, person.id, { balance: '0' });

    const first = await service.deposit({
      accountId: account.id,
      amount: 25,
      idempotencyKey: 'replay-1',
    });
    const second = await service.deposit({
      accountId: account.id,
      amount: 25,
      idempotencyKey: 'replay-1',
    });

    expect(second.id).toBe(first.id);

    const row = await handle.dataSource.query('SELECT balance FROM accounts WHERE id = $1', [
      account.id,
    ]);
    expect(row[0].balance).toBe('25.0000');
  });
});
