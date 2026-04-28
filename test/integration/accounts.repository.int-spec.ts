import { TestHandle, createTestApp, resetState } from '../helpers/app-factory';
import { buildPerson } from '../fixtures/builders';

import { AccountsRepository } from '../../src/modules/accounts/accounts.repository';

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
      accountNumber: '0000123',
      dailyWithdrawalLimit: '500',
    });

    const found = await repo.findById(created.id);
    expect(found?.id).toBe(created.id);
    expect(found?.accountNumber).toBe('0000123');
    expect(found?.balance).toBe('0.0000');
  });

  it('rejects negative balance via CHECK constraint', async () => {
    const person = await buildPerson(handle.dataSource);
    const created = await repo.create({
      personId: person.id,
      accountNumber: '0000124',
      dailyWithdrawalLimit: '500',
    });

    await expect(
      handle.dataSource.query('UPDATE accounts SET balance = -1 WHERE id = $1', [created.id]),
    ).rejects.toThrow(/chk_accounts_balance_nonneg/);
  });

  it('account_number is unique', async () => {
    const person = await buildPerson(handle.dataSource);
    await repo.create({
      personId: person.id,
      accountNumber: '0000999',
      dailyWithdrawalLimit: '500',
    });
    await expect(
      repo.create({ personId: person.id, accountNumber: '0000999', dailyWithdrawalLimit: '500' }),
    ).rejects.toThrow(/duplicate key/);
  });
});
