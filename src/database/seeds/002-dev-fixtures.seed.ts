import { DataSource } from 'typeorm';

import { Account } from '../../modules/accounts/entities/account.entity';
import { Person } from '../../modules/persons/entities/person.entity';

interface DevPerson {
  document: string;
  fullName: string;
  birthDate: string;
  accounts: Array<{ balance: string; dailyWithdrawalLimit: string; isBlocked?: boolean }>;
}

const FIXTURES: DevPerson[] = [
  {
    document: '22233344455',
    fullName: 'Alice Active',
    birthDate: '1988-03-04',
    accounts: [
      { balance: '5000', dailyWithdrawalLimit: '2000' },
      { balance: '0', dailyWithdrawalLimit: '500' },
    ],
  },
  {
    document: '33344455566',
    fullName: 'Bob Blocked',
    birthDate: '1975-11-22',
    accounts: [{ balance: '120.5', dailyWithdrawalLimit: '2000', isBlocked: true }],
  },
  {
    document: '44455566677',
    fullName: 'Carol HighLimit',
    birthDate: '1992-07-09',
    accounts: [{ balance: '12000', dailyWithdrawalLimit: '10000' }],
  },
];

export async function seedDevFixtures(dataSource: DataSource): Promise<void> {
  if (process.env.NODE_ENV === 'production') return;

  const personRepo = dataSource.getRepository(Person);
  const accountRepo = dataSource.getRepository(Account);

  for (const fixture of FIXTURES) {
    let person = await personRepo.findOne({ where: { document: fixture.document } });
    if (!person) {
      person = await personRepo.save(
        personRepo.create({
          document: fixture.document,
          fullName: fixture.fullName,
          birthDate: fixture.birthDate,
        }),
      );
    }

    const existingAccounts = await accountRepo.count({ where: { personId: person.id } });
    if (existingAccounts > 0) continue;

    for (const cfg of fixture.accounts) {
      const result = await accountRepo
        .createQueryBuilder()
        .insert()
        .into(Account)
        .values({
          personId: person.id,
          balance: cfg.balance,
          dailyWithdrawalLimit: cfg.dailyWithdrawalLimit,
          isBlocked: cfg.isBlocked ?? false,
          blockedAt: cfg.isBlocked ? new Date() : null,
          blockedReason: cfg.isBlocked ? 'seed: pre-blocked fixture' : null,
        })
        .returning('*')
        .execute();
      void result;
    }
  }
}
