import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { PersonNotFoundError } from '../../common/errors';

import { Person } from './entities/person.entity';
import { PersonsRepository } from './persons.repository';
import { PersonsService } from './persons.service';

describe('PersonsService', () => {
  let service: PersonsService;
  let repo: jest.Mocked<PersonsRepository>;

  beforeEach(async () => {
    repo = {
      findById: jest.fn(),
      findByDocument: jest.fn(),
      list: jest.fn(),
    } as unknown as jest.Mocked<PersonsRepository>;
    const module = await Test.createTestingModule({
      providers: [PersonsService, { provide: PersonsRepository, useValue: repo }],
    }).compile();
    service = module.get(PersonsService);
  });

  it('returns the person when found', async () => {
    repo.findById.mockResolvedValue({ id: 'p1' } as never);
    await expect(service.getById('p1')).resolves.toEqual({ id: 'p1' });
  });

  it('throws PersonNotFoundError when missing', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getById('missing')).rejects.toBeInstanceOf(PersonNotFoundError);
  });

  it('exists returns true/false based on lookup', async () => {
    repo.findById.mockResolvedValueOnce({ id: 'p' } as never).mockResolvedValueOnce(null);
    await expect(service.exists('p')).resolves.toBe(true);
    await expect(service.exists('missing')).resolves.toBe(false);
  });

  describe('list', () => {
    const personRow = (i: number): Person =>
      ({
        id: `p-${i}`,
        document: `doc-${i}`,
        fullName: `Person ${i}`,
        birthDate: '1990-01-01',
        createdAt: new Date(`2026-04-${10 + i}T00:00:00Z`),
        updatedAt: new Date(`2026-04-${10 + i}T00:00:00Z`),
      }) as Person;

    it('returns a page with hasMore=false when fewer rows than limit are returned', async () => {
      repo.list.mockResolvedValue([personRow(1), personRow(2)]);
      const result = await service.list({ limit: 5 });
      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('emits a nextCursor when more rows exist', async () => {
      repo.list.mockResolvedValue([personRow(1), personRow(2), personRow(3)]);
      const result = await service.list({ limit: 2 });
      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toEqual(expect.any(String));
    });

    it('rejects an invalid cursor', async () => {
      await expect(service.list({ limit: 5, cursor: '!garbage!' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
