import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AccountNotFoundError } from '../../common/errors';
import { formatMoney } from '../../common/money/money';
import { decodePageCursor, encodePageCursor } from '../../common/pagination/cursor';
import { PersonsService } from '../persons/persons.service';

import { AccountsRepository } from './accounts.repository';
import { AccountResponseDto } from './dto/account-response.dto';
import { AccountsPageDto } from './dto/list-accounts.dto';
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

  async list(input: {
    personId?: string;
    limit: number;
    cursor?: string;
  }): Promise<AccountsPageDto> {
    let cursor: { ts: Date; id: string } | undefined;
    if (input.cursor) {
      const decoded = decodePageCursor(input.cursor);
      if (!decoded) {
        throw new BadRequestException({ message: 'invalid cursor', code: 'VALIDATION_ERROR' });
      }
      cursor = { ts: new Date(decoded.ts), id: decoded.id };
    }
    const rows = await this.repo.list({
      personId: input.personId,
      limit: input.limit,
      cursor,
    });
    const hasMore = rows.length > input.limit;
    const page = hasMore ? rows.slice(0, input.limit) : rows;
    const last = page[page.length - 1];

    return {
      items: page.map(AccountResponseDto.from),
      nextCursor:
        hasMore && last
          ? encodePageCursor({ ts: last.createdAt.toISOString(), id: last.id })
          : null,
      hasMore,
    };
  }
}
