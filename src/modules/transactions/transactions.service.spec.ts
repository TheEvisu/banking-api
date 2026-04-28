import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';

import {
  AccountBlockedError,
  AccountNotFoundError,
  DailyLimitExceededError,
  InsufficientFundsError,
} from '../../common/errors';
import { AccountsRepository } from '../accounts/accounts.repository';
import { Account } from '../accounts/entities/account.entity';

import { Transaction } from './entities/transaction.entity';
import { TransactionsRepository } from './transactions.repository';
import { TransactionsService } from './transactions.service';

const account = (overrides: Partial<Account> = {}): Account =>
  ({
    id: 'acc-1',
    personId: 'p-1',
    accountNumber: '0000001',
    balance: '500.0000',
    dailyWithdrawalLimit: '2000.0000',
    isBlocked: false,
    blockedAt: null,
    blockedReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Account;

const txStub = (overrides: Partial<Transaction> = {}): Transaction =>
  ({
    id: 'tx-1',
    accountId: 'acc-1',
    type: 'deposit',
    amount: '0',
    balanceAfter: '0',
    idempotencyKey: null,
    description: null,
    createdAt: new Date(),
    ...overrides,
  }) as Transaction;

interface Mocks {
  txRepo: jest.Mocked<TransactionsRepository>;
  accountsRepo: jest.Mocked<AccountsRepository>;
  dataSource: { transaction: jest.Mock };
  manager: { createQueryBuilder: jest.Mock };
}

const setup = async (): Promise<{ service: TransactionsService; mocks: Mocks }> => {
  const updateExecute = jest.fn().mockResolvedValue(undefined);
  const updateBuilder = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: updateExecute,
  };
  const manager = {
    createQueryBuilder: jest.fn().mockReturnValue(updateBuilder),
  };
  const dataSource = {
    transaction: jest.fn(async (fn: (m: EntityManager) => Promise<unknown>) =>
      fn(manager as unknown as EntityManager),
    ),
  };

  const txRepo = {
    insertWithManager: jest.fn(),
    sumWithdrawalsBetween: jest.fn(),
    findExistingByIdempotencyKey: jest.fn(),
    list: jest.fn(),
  } as unknown as jest.Mocked<TransactionsRepository>;

  const accountsRepo = {
    lockForUpdate: jest.fn(),
    findById: jest.fn(),
  } as unknown as jest.Mocked<AccountsRepository>;

  const module = await Test.createTestingModule({
    providers: [
      TransactionsService,
      { provide: DataSource, useValue: dataSource },
      { provide: TransactionsRepository, useValue: txRepo },
      { provide: AccountsRepository, useValue: accountsRepo },
    ],
  }).compile();

  return {
    service: module.get(TransactionsService),
    mocks: { txRepo, accountsRepo, dataSource, manager },
  };
};

describe('TransactionsService', () => {
  describe('deposit', () => {
    it('credits the account and writes a transaction row', async () => {
      const { service, mocks } = await setup();
      mocks.accountsRepo.lockForUpdate.mockResolvedValue(account({ balance: '100.0000' }));
      mocks.txRepo.insertWithManager.mockImplementation(async (_, input) =>
        txStub({ type: input.type, amount: input.amount, balanceAfter: input.balanceAfter }),
      );

      const tx = await service.deposit({ accountId: 'acc-1', amount: 50 });

      expect(tx.balanceAfter).toBe('150.0000');
      expect(tx.type).toBe('deposit');
    });

    it('rejects when the account is blocked', async () => {
      const { service, mocks } = await setup();
      mocks.accountsRepo.lockForUpdate.mockResolvedValue(account({ isBlocked: true }));
      await expect(service.deposit({ accountId: 'acc-1', amount: 10 })).rejects.toBeInstanceOf(
        AccountBlockedError,
      );
    });

    it('throws AccountNotFoundError when row is missing', async () => {
      const { service, mocks } = await setup();
      mocks.accountsRepo.lockForUpdate.mockResolvedValue(null);
      await expect(service.deposit({ accountId: 'missing', amount: 10 })).rejects.toBeInstanceOf(
        AccountNotFoundError,
      );
    });

    it('replays an existing idempotency-key match without re-running', async () => {
      const { service, mocks } = await setup();
      const existing = txStub({ type: 'deposit', amount: '10.0000', balanceAfter: '110.0000' });
      mocks.txRepo.findExistingByIdempotencyKey.mockResolvedValue(existing);

      const tx = await service.deposit({ accountId: 'acc-1', amount: 10, idempotencyKey: 'k1' });

      expect(tx).toBe(existing);
      expect(mocks.dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('withdraw', () => {
    it('debits the account', async () => {
      const { service, mocks } = await setup();
      mocks.accountsRepo.lockForUpdate.mockResolvedValue(account({ balance: '100.0000' }));
      mocks.txRepo.sumWithdrawalsBetween.mockResolvedValue('0');
      mocks.txRepo.insertWithManager.mockImplementation(async (_, input) =>
        txStub({ type: input.type, amount: input.amount, balanceAfter: input.balanceAfter }),
      );

      const tx = await service.withdraw({ accountId: 'acc-1', amount: 30 });

      expect(tx.type).toBe('withdrawal');
      expect(tx.balanceAfter).toBe('70.0000');
    });

    it('rejects when the resulting balance would be negative', async () => {
      const { service, mocks } = await setup();
      mocks.accountsRepo.lockForUpdate.mockResolvedValue(account({ balance: '10.0000' }));
      await expect(service.withdraw({ accountId: 'acc-1', amount: 50 })).rejects.toBeInstanceOf(
        InsufficientFundsError,
      );
    });

    it('rejects when daily withdrawal limit would be exceeded', async () => {
      const { service, mocks } = await setup();
      mocks.accountsRepo.lockForUpdate.mockResolvedValue(
        account({ balance: '5000.0000', dailyWithdrawalLimit: '500.0000' }),
      );
      mocks.txRepo.sumWithdrawalsBetween.mockResolvedValue('480.0000');
      await expect(service.withdraw({ accountId: 'acc-1', amount: 50 })).rejects.toBeInstanceOf(
        DailyLimitExceededError,
      );
    });

    it('rejects withdrawals on a blocked account', async () => {
      const { service, mocks } = await setup();
      mocks.accountsRepo.lockForUpdate.mockResolvedValue(account({ isBlocked: true }));
      await expect(service.withdraw({ accountId: 'acc-1', amount: 10 })).rejects.toBeInstanceOf(
        AccountBlockedError,
      );
    });
  });

  describe('statement', () => {
    it('rejects an inverted period', async () => {
      const { service, mocks } = await setup();
      mocks.accountsRepo.findById.mockResolvedValue(account());

      await expect(
        service.statement({
          accountId: 'acc-1',
          from: '2026-04-01',
          to: '2026-03-01',
          limit: 10,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a window larger than 1 year', async () => {
      const { service, mocks } = await setup();
      mocks.accountsRepo.findById.mockResolvedValue(account());

      await expect(
        service.statement({
          accountId: 'acc-1',
          from: '2024-01-01',
          to: '2025-06-01',
          limit: 10,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns transactions and a next cursor when more rows exist', async () => {
      const { service, mocks } = await setup();
      mocks.accountsRepo.findById.mockResolvedValue(account());
      const rows = Array.from({ length: 3 }, (_, i) =>
        txStub({
          id: `tx-${i + 1}`,
          createdAt: new Date(`2026-04-0${i + 1}T00:00:00.000Z`),
        }),
      );
      mocks.txRepo.list.mockResolvedValue(rows);

      const result = await service.statement({ accountId: 'acc-1', limit: 2 });

      expect(result.hasMore).toBe(true);
      expect(result.transactions).toHaveLength(2);
      expect(result.nextCursor).not.toBeNull();
    });
  });
});
