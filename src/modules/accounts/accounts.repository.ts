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

  async create(input: { personId: string; dailyWithdrawalLimit: string }): Promise<Account> {
    const result = await this.repo
      .createQueryBuilder()
      .insert()
      .into(Account)
      .values({
        personId: input.personId,
        dailyWithdrawalLimit: input.dailyWithdrawalLimit,
        balance: '0',
        isBlocked: false,
        blockedAt: null,
        blockedReason: null,
      })
      .returning('*')
      .execute();
    const row = result.raw[0];
    return this.repo.create({
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

  list(opts: { personId?: string; limit: number; cursor?: { ts: Date; id: string } }): Promise<Account[]> {
    const qb = this.repo.createQueryBuilder('a');
    if (opts.personId) qb.andWhere('a.person_id = :personId', { personId: opts.personId });
    if (opts.cursor) {
      qb.andWhere('(a.created_at, a.id) < (:ts, :id)', {
        ts: opts.cursor.ts,
        id: opts.cursor.id,
      });
    }
    return qb
      .orderBy('a.created_at', 'DESC')
      .addOrderBy('a.id', 'DESC')
      .limit(opts.limit + 1)
      .getMany();
  }
}
