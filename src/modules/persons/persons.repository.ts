import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Person } from './entities/person.entity';

@Injectable()
export class PersonsRepository {
  constructor(@InjectRepository(Person) private readonly repo: Repository<Person>) {}

  findById(id: string): Promise<Person | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByDocument(document: string): Promise<Person | null> {
    return this.repo.findOne({ where: { document } });
  }
}
