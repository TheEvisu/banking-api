import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { Transaction, TransactionType } from './entities/transaction.entity';

interface InsertInput {
  accountId: string;
  type: TransactionType;
  amount: string;
  balanceAfter: string;
  idempotencyKey: string | null;
  description: string | null;
}

interface ListOptions {
  accountId: string;
  from?: Date;
  to?: Date;
  limit: number;
  cursor?: { ts: Date; id: string };
}

@Injectable()
export class TransactionsRepository {
  constructor(@InjectRepository(Transaction) private readonly repo: Repository<Transaction>) {}

  async insertWithManager(manager: EntityManager, input: InsertInput): Promise<Transaction> {
    const entity = manager.create(Transaction, {
      accountId: input.accountId,
      type: input.type,
      amount: input.amount,
      balanceAfter: input.balanceAfter,
      idempotencyKey: input.idempotencyKey,
      description: input.description,
    });
    return manager.save(entity);
  }

  async sumWithdrawalsBetween(
    manager: EntityManager,
    accountId: string,
    from: Date,
    to: Date,
  ): Promise<string> {
    const result = await manager
      .createQueryBuilder(Transaction, 't')
      .select('COALESCE(SUM(t.amount), 0)', 'total')
      .where('t.account_id = :accountId', { accountId })
      .andWhere("t.type = 'withdrawal'")
      .andWhere('t.created_at >= :from', { from })
      .andWhere('t.created_at < :to', { to })
      .getRawOne<{ total: string }>();
    return result?.total ?? '0';
  }

  async findExistingByIdempotencyKey(
    accountId: string,
    idempotencyKey: string,
  ): Promise<Transaction | null> {
    return this.repo.findOne({ where: { accountId, idempotencyKey } });
  }

  async list(opts: ListOptions): Promise<Transaction[]> {
    const qb = this.repo
      .createQueryBuilder('t')
      .where('t.account_id = :accountId', { accountId: opts.accountId });

    if (opts.from) qb.andWhere('t.created_at >= :from', { from: opts.from });
    if (opts.to) qb.andWhere('t.created_at < :to', { to: opts.to });

    if (opts.cursor) {
      qb.andWhere('(t.created_at, t.id) < (:cursorTs, :cursorId)', {
        cursorTs: opts.cursor.ts,
        cursorId: opts.cursor.id,
      });
    }

    return qb
      .orderBy('t.created_at', 'DESC')
      .addOrderBy('t.id', 'DESC')
      .limit(opts.limit + 1)
      .getMany();
  }
}
