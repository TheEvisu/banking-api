import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { Account } from './entities/account.entity';

@Injectable()
export class AccountsRepository {
  constructor(@InjectRepository(Account) private readonly repo: Repository<Account>) {}

  findById(id: string): Promise<Account | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(input: {
    personId: string;
    accountNumber: string;
    dailyWithdrawalLimit: string;
  }): Promise<Account> {
    const entity = this.repo.create({
      personId: input.personId,
      accountNumber: input.accountNumber,
      dailyWithdrawalLimit: input.dailyWithdrawalLimit,
      balance: '0',
      isBlocked: false,
      blockedAt: null,
      blockedReason: null,
    });
    return this.repo.save(entity);
  }

  /**
   * Take a row-level lock on the account. Must be called inside a transaction.
   */
  lockForUpdate(manager: EntityManager, id: string): Promise<Account | null> {
    return manager
      .createQueryBuilder(Account, 'account')
      .setLock('pessimistic_write')
      .where('account.id = :id', { id })
      .getOne();
  }

  async block(id: string, reason: string | null): Promise<Account | null> {
    await this.repo.update(
      { id, isBlocked: false },
      { isBlocked: true, blockedAt: () => 'now()', blockedReason: reason },
    );
    return this.findById(id);
  }

  async nextAccountNumber(): Promise<string> {
    const result = await this.repo
      .createQueryBuilder('a')
      .select("COALESCE(MAX(CAST(a.account_number AS bigint)), 0)", 'max')
      .getRawOne<{ max: string }>();
    const next = BigInt(result?.max ?? '0') + 1n;
    return next.toString().padStart(7, '0');
  }
}
