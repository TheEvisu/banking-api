import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class BlockAccountDto {
  @ApiProperty({ required: false, maxLength: 500, example: 'Suspicious activity' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
