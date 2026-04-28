import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { DataSource, QueryFailedError } from 'typeorm';

import {
  AccountBlockedError,
  AccountNotFoundError,
  DailyLimitExceededError,
  InsufficientFundsError,
} from '../../common/errors';
import { formatMoney, toMoney } from '../../common/money/money';
import { AccountsRepository } from '../accounts/accounts.repository';
import { Account } from '../accounts/entities/account.entity';
import { MetricsService } from '../metrics/metrics.service';

import { decodeCursor, encodeCursor } from './cursor';
import { StatementEntryDto, StatementResponseDto } from './dto/transaction-response.dto';
import { Transaction } from './entities/transaction.entity';
import { TransactionsRepository } from './transactions.repository';

interface MutateInput {
  accountId: string;
  amount: number;
  description?: string;
  idempotencyKey?: string;
}

interface StatementInput {
  accountId: string;
  from?: string;
  to?: string;
  limit: number;
  cursor?: string;
}

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly txRepo: TransactionsRepository,
    private readonly accountsRepo: AccountsRepository,
    private readonly metrics: MetricsService,
  ) {}

  async deposit(input: MutateInput): Promise<Transaction> {
    return this.runMutation('deposit', input);
  }

  async withdraw(input: MutateInput): Promise<Transaction> {
    return this.runMutation('withdrawal', input);
  }

  private async runMutation(
    type: 'deposit' | 'withdrawal',
    input: MutateInput,
  ): Promise<Transaction> {
    if (input.idempotencyKey) {
      const existing = await this.txRepo.findExistingByIdempotencyKey(
        input.accountId,
        input.idempotencyKey,
      );
      if (existing && existing.type === type) {
        return existing;
      }
    }

    const amount = toMoney(input.amount);

    try {
      const tx = await this.dataSource.transaction(async (manager) => {
        const account = await this.accountsRepo.lockForUpdate(manager, input.accountId);
        if (!account) throw new AccountNotFoundError(input.accountId);
        if (account.isBlocked) throw new AccountBlockedError(account.id);

        const currentBalance = toMoney(account.balance);
        let newBalance: Decimal;

        if (type === 'deposit') {
          newBalance = currentBalance.plus(amount);
        } else {
          newBalance = currentBalance.minus(amount);
          if (newBalance.lessThan(0)) {
            throw new InsufficientFundsError(account.id);
          }
          await this.assertWithinDailyLimit(manager, account, amount);
        }

        const tx = await this.txRepo.insertWithManager(manager, {
          accountId: account.id,
          type,
          amount: formatMoney(amount),
          balanceAfter: formatMoney(newBalance),
          idempotencyKey: input.idempotencyKey ?? null,
          description: input.description ?? null,
        });

        await manager
          .createQueryBuilder()
          .update(Account)
          .set({ balance: formatMoney(newBalance) })
          .where('id = :id', { id: account.id })
          .execute();

        return tx;
      });
      this.metrics.recordTransaction(type, 'success');
      return tx;
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        /idempotency_key/i.test(err.message) &&
        input.idempotencyKey
      ) {
        const existing = await this.txRepo.findExistingByIdempotencyKey(
          input.accountId,
          input.idempotencyKey,
        );
        if (existing) {
          this.metrics.recordTransaction(type, 'success');
          return existing;
        }
      }
      this.metrics.recordTransaction(type, 'failure');
      throw err;
    }
  }

  private async assertWithinDailyLimit(
    manager: import('typeorm').EntityManager,
    account: Account,
    amount: Decimal,
  ): Promise<void> {
    const limit = toMoney(account.dailyWithdrawalLimit);
    if (limit.lessThanOrEqualTo(0)) return;

    const now = new Date();
    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const totalRaw = await this.txRepo.sumWithdrawalsBetween(
      manager,
      account.id,
      startOfDay,
      endOfDay,
    );
    const projected = toMoney(totalRaw).plus(amount);
    if (projected.greaterThan(limit)) {
      throw new DailyLimitExceededError(account.id, formatMoney(limit));
    }
  }

  async statement(input: StatementInput): Promise<StatementResponseDto> {
    const account = await this.accountsRepo.findById(input.accountId);
    if (!account) throw new AccountNotFoundError(input.accountId);

    const from = input.from ? this.parseDate('from', input.from) : undefined;
    const to = input.to ? this.parseDate('to', input.to) : undefined;

    if (from && to) {
      if (from.getTime() >= to.getTime()) {
        throw new BadRequestException({
          message: 'from must be before to',
          code: 'VALIDATION_ERROR',
        });
      }
      if (to.getTime() - from.getTime() > ONE_YEAR_MS) {
        throw new BadRequestException({
          message: 'statement window cannot exceed 1 year; paginate via cursor',
          code: 'VALIDATION_ERROR',
        });
      }
    }

    let cursor: { ts: Date; id: string } | undefined;
    if (input.cursor) {
      const decoded = decodeCursor(input.cursor);
      if (!decoded) {
        throw new BadRequestException({ message: 'invalid cursor', code: 'VALIDATION_ERROR' });
      }
      cursor = { ts: new Date(decoded.ts), id: decoded.id };
    }

    const rows = await this.txRepo.list({
      accountId: input.accountId,
      from,
      to,
      limit: input.limit,
      cursor,
    });

    const hasMore = rows.length > input.limit;
    const page = hasMore ? rows.slice(0, input.limit) : rows;
    const last = page[page.length - 1];

    return {
      accountId: input.accountId,
      transactions: page.map(StatementEntryDto.from),
      nextCursor:
        hasMore && last ? encodeCursor({ ts: last.createdAt.toISOString(), id: last.id }) : null,
      hasMore,
    };
  }

  private parseDate(field: 'from' | 'to', raw: string): Date {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException({
        message: `${field} must be a valid ISO-8601 date`,
        code: 'VALIDATION_ERROR',
      });
    }
    return date;
  }
}
