import { randomUUID } from 'node:crypto';

import { DataSource } from 'typeorm';

import { Account } from '../../src/modules/accounts/entities/account.entity';
import { Person } from '../../src/modules/persons/entities/person.entity';

export async function buildPerson(
  ds: DataSource,
  overrides: Partial<Person> = {},
): Promise<Person> {
  const repo = ds.getRepository(Person);
  const entity = repo.create({
    document: overrides.document ?? `DOC${randomUUID().replace(/-/g, '').slice(0, 12)}`,
    fullName: overrides.fullName ?? 'Jane Roe',
    birthDate: overrides.birthDate ?? '1985-06-12',
    ...overrides,
  });
  return repo.save(entity);
}

export async function buildAccount(
  ds: DataSource,
  personId: string,
  overrides: Partial<Account> = {},
): Promise<Account> {
  const result = await ds
    .createQueryBuilder()
    .insert()
    .into(Account)
    .values({
      personId,
      ...(overrides.accountNumber ? { accountNumber: overrides.accountNumber } : {}),
      balance: overrides.balance ?? '0',
      dailyWithdrawalLimit: overrides.dailyWithdrawalLimit ?? '2000',
      isBlocked: overrides.isBlocked ?? false,
      blockedAt: overrides.blockedAt ?? null,
      blockedReason: overrides.blockedReason ?? null,
    })
    .returning('*')
    .execute();
  const row = result.raw[0];
  return ds.getRepository(Account).create({
    id: row.id,
    personId: row.person_id,
    accountNumber: row.account_number,
    balance: row.balance,
    dailyWithdrawalLimit: row.daily_withdrawal_limit,
    isBlocked: row.is_blocked,
    blockedAt: row.blocked_at,
    blockedReason: row.blocked_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
