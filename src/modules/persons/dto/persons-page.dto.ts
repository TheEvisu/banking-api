import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PersonResponseDto } from './person-response.dto';

export class PersonsPageDto {
  @ApiProperty({ type: [PersonResponseDto] })
  items!: PersonResponseDto[];

  @ApiPropertyOptional({ nullable: true, type: String })
  nextCursor!: string | null;

  @ApiProperty()
  hasMore!: boolean;
}
