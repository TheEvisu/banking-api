import { BadRequestException, Injectable } from '@nestjs/common';

import { PersonNotFoundError } from '../../common/errors';
import { decodePageCursor, encodePageCursor } from '../../common/pagination/cursor';

import { PersonResponseDto } from './dto/person-response.dto';
import { PersonsPageDto } from './dto/persons-page.dto';
import { Person } from './entities/person.entity';
import { PersonsRepository } from './persons.repository';

@Injectable()
export class PersonsService {
  constructor(private readonly repo: PersonsRepository) {}

  async getById(id: string): Promise<Person> {
    // TODO: revisit when introducing auth — check that the caller can see this person
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

  async list(input: { limit: number; cursor?: string }): Promise<PersonsPageDto> {
    let cursor: { ts: Date; id: string } | undefined;
    if (input.cursor) {
      const decoded = decodePageCursor(input.cursor);
      if (!decoded) {
        throw new BadRequestException({ message: 'invalid cursor', code: 'VALIDATION_ERROR' });
      }
      cursor = { ts: new Date(decoded.ts), id: decoded.id };
    }

    const rows = await this.repo.list({ limit: input.limit, cursor });
    const hasMore = rows.length > input.limit;
    const page = hasMore ? rows.slice(0, input.limit) : rows;
    const last = page[page.length - 1];

    return {
      items: page.map(PersonResponseDto.from),
      nextCursor:
        hasMore && last
          ? encodePageCursor({ ts: last.createdAt.toISOString(), id: last.id })
          : null,
      hasMore,
    };
  }
}
