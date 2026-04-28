import { AccountsRepository } from '../../src/modules/accounts/accounts.repository';
import { buildPerson } from '../fixtures/builders';
import { TestHandle, createTestApp, resetState } from '../helpers/app-factory';

describe('AccountsRepository (integration)', () => {
  let handle: TestHandle;
  let repo: AccountsRepository;

  beforeAll(async () => {
    handle = await createTestApp();
    repo = handle.app.get(AccountsRepository);
  });

  afterAll(async () => {
    await handle.close();
  });

  beforeEach(async () => {
    await resetState(handle);
  });

  it('creates a row and finds it back', async () => {
    const person = await buildPerson(handle.dataSource);
    const created = await repo.create({
      personId: person.id,
      dailyWithdrawalLimit: '500',
    });

    const found = await repo.findById(created.id);
    expect(found?.id).toBe(created.id);
    expect(found?.accountNumber).toMatch(/^\d{7}$/);
    expect(found?.balance).toBe('0.0000');
  });

  it('assigns sequential numbers under concurrency without collisions', async () => {
    const person = await buildPerson(handle.dataSource);
    const created = await Promise.all(
      Array.from({ length: 20 }, () =>
        repo.create({ personId: person.id, dailyWithdrawalLimit: '100' }),
      ),
    );
    const numbers = created.map((a) => a.accountNumber);
    expect(new Set(numbers).size).toBe(20);
  });

  it('rejects negative balance via CHECK constraint', async () => {
    const person = await buildPerson(handle.dataSource);
    const created = await repo.create({
      personId: person.id,
      dailyWithdrawalLimit: '500',
    });

    await expect(
      handle.dataSource.query('UPDATE accounts SET balance = -1 WHERE id = $1', [created.id]),
    ).rejects.toThrow(/chk_accounts_balance_nonneg/);
  });
});
