import { Injectable } from '@nestjs/common';

import { PersonNotFoundError } from '../../common/errors';

import { Person } from './entities/person.entity';
import { PersonsRepository } from './persons.repository';

@Injectable()
export class PersonsService {
  constructor(private readonly repo: PersonsRepository) {}

  async getById(id: string): Promise<Person> {
    const person = await this.repo.findById(id);
    if (!person) {
      throw new PersonNotFoundError(id);
    }
    return person;
  }

  async exists(id: string): Promise<boolean> {
    const person = await this.repo.findById(id);
    return person !== null;
  }
}
