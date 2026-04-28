import { ApiProperty } from '@nestjs/swagger';

import { Person } from '../entities/person.entity';

export class PersonResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '12345678900' })
  document!: string;

  @ApiProperty({ example: 'John Doe' })
  fullName!: string;

  @ApiProperty({ example: '1990-01-15' })
  birthDate!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  static from(person: Person): PersonResponseDto {
    return {
      id: person.id,
      document: person.document,
      fullName: person.fullName,
      birthDate: person.birthDate,
      createdAt: person.createdAt.toISOString(),
    };
  }
}
