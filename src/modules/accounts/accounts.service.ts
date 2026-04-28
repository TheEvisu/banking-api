import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AccountNotFoundError } from '../../common/errors';
import { formatMoney } from '../../common/money/money';
import { PersonsService } from '../persons/persons.service';

import { AccountsRepository } from './accounts.repository';
import { Account } from './entities/account.entity';

const DEFAULT_DAILY_LIMIT = '2000';

@Injectable()
export class AccountsService {
  constructor(
    private readonly repo: AccountsRepository,
    private readonly persons: PersonsService,
    private readonly dataSource: DataSource,
  ) {}

  async create(input: { personId: string; dailyWithdrawalLimit?: number }): Promise<Account> {
    await this.persons.getById(input.personId);

    const limit =
      input.dailyWithdrawalLimit !== undefined
        ? formatMoney(input.dailyWithdrawalLimit)
        : DEFAULT_DAILY_LIMIT;
    return this.repo.create({
      personId: input.personId,
      dailyWithdrawalLimit: limit,
    });
  }

  async getById(id: string): Promise<Account> {
    // TODO: revisit when introducing auth — check that the caller owns this account
    const account = await this.repo.findById(id);
    if (!account) {
      throw new AccountNotFoundError(id);
    }
    return account;
  }

  async block(id: string, reason: string | null): Promise<Account> {
    const existing = await this.getById(id);
    if (existing.isBlocked) {
      return existing;
    }
    const updated = await this.repo.block(id, reason);
    return updated ?? existing;
  }
}
