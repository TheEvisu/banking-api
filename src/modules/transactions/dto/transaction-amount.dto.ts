import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class TransactionAmountDto {
  @ApiProperty({ example: 100.5, description: 'Positive amount, max 4 decimal places' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Max(1000000)
  amount!: number;

  @ApiProperty({ required: false, maxLength: 500, example: 'Salary deposit' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
