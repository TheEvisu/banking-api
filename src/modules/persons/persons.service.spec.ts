import { Test } from '@nestjs/testing';

import { PersonNotFoundError } from '../../common/errors';

import { PersonsRepository } from './persons.repository';
import { PersonsService } from './persons.service';

describe('PersonsService', () => {
  let service: PersonsService;
  let repo: jest.Mocked<PersonsRepository>;

  beforeEach(async () => {
    repo = {
      findById: jest.fn(),
      findByDocument: jest.fn(),
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
});
