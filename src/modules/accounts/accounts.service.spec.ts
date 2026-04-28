import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { AccountNotFoundError } from '../../common/errors';
import { PersonsService } from '../persons/persons.service';

import { AccountsRepository } from './accounts.repository';
import { AccountsService } from './accounts.service';
import { Account } from './entities/account.entity';

const baseAccount = (overrides: Partial<Account> = {}): Account =>
  ({
    id: 'aa',
    personId: 'pp',
    accountNumber: '0000001',
    balance: '0',
    dailyWithdrawalLimit: '2000',
    isBlocked: false,
    blockedAt: null,
    blockedReason: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }) as Account;

describe('AccountsService', () => {
  let service: AccountsService;
  let repo: jest.Mocked<AccountsRepository>;
  let persons: jest.Mocked<PersonsService>;

  beforeEach(async () => {
    repo = {
      findById: jest.fn(),
      create: jest.fn(),
      block: jest.fn(),
      lockForUpdate: jest.fn(),
    } as unknown as jest.Mocked<AccountsRepository>;
    persons = { getById: jest.fn(), exists: jest.fn() } as unknown as jest.Mocked<PersonsService>;

    const module = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: AccountsRepository, useValue: repo },
        { provide: PersonsService, useValue: persons },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();

    service = module.get(AccountsService);
  });

  describe('create', () => {
    it('creates an account with the given daily limit', async () => {
      persons.getById.mockResolvedValue({ id: 'pp' } as never);
      const created = baseAccount({ accountNumber: '0000042', dailyWithdrawalLimit: '500.0000' });
      repo.create.mockResolvedValue(created);

      const result = await service.create({ personId: 'pp', dailyWithdrawalLimit: 500 });

      expect(repo.create).toHaveBeenCalledWith({
        personId: 'pp',
        dailyWithdrawalLimit: '500.0000',
      });
      expect(result).toBe(created);
    });

    it('falls back to default daily limit', async () => {
      persons.getById.mockResolvedValue({ id: 'pp' } as never);
      repo.create.mockResolvedValue(baseAccount());

      await service.create({ personId: 'pp' });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ dailyWithdrawalLimit: '2000' }),
      );
    });
  });

  describe('getById', () => {
    it('throws AccountNotFoundError when missing', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.getById('missing')).rejects.toBeInstanceOf(AccountNotFoundError);
    });
  });

  describe('block', () => {
    it('returns the existing account untouched if already blocked', async () => {
      const blocked = baseAccount({ isBlocked: true });
      repo.findById.mockResolvedValue(blocked);

      const result = await service.block('aa', 'reason');

      expect(repo.block).not.toHaveBeenCalled();
      expect(result).toBe(blocked);
    });

    it('blocks an active account', async () => {
      repo.findById.mockResolvedValue(baseAccount());
      const updated = baseAccount({ isBlocked: true, blockedReason: 'reason' });
      repo.block.mockResolvedValue(updated);

      const result = await service.block('aa', 'reason');

      expect(repo.block).toHaveBeenCalledWith('aa', 'reason');
      expect(result).toBe(updated);
    });
  });
});
