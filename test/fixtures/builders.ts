import { randomUUID } from 'node:crypto';

import { DataSource } from 'typeorm';

import { Account } from '../../src/modules/accounts/entities/account.entity';
import { Person } from '../../src/modules/persons/entities/person.entity';

let counter = 1;

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
  const repo = ds.getRepository(Account);
  const number = (counter++).toString().padStart(7, '0');
  const entity = repo.create({
    personId,
    accountNumber: overrides.accountNumber ?? number,
    balance: overrides.balance ?? '0',
    dailyWithdrawalLimit: overrides.dailyWithdrawalLimit ?? '2000',
    isBlocked: overrides.isBlocked ?? false,
    blockedAt: overrides.blockedAt ?? null,
    blockedReason: overrides.blockedReason ?? null,
  });
  return repo.save(entity);
}
