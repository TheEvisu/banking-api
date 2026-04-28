import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Person } from './entities/person.entity';

interface ListOptions {
  limit: number;
  cursor?: { ts: Date; id: string };
}

@Injectable()
export class PersonsRepository {
  constructor(@InjectRepository(Person) private readonly repo: Repository<Person>) {}

  findById(id: string): Promise<Person | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByDocument(document: string): Promise<Person | null> {
    return this.repo.findOne({ where: { document } });
  }

  list(opts: ListOptions): Promise<Person[]> {
    const qb = this.repo.createQueryBuilder('p');
    if (opts.cursor) {
      qb.where('(p.created_at, p.id) < (:ts, :id)', {
        ts: opts.cursor.ts,
        id: opts.cursor.id,
      });
    }
    return qb
      .orderBy('p.created_at', 'DESC')
      .addOrderBy('p.id', 'DESC')
      .limit(opts.limit + 1)
      .getMany();
  }
}
