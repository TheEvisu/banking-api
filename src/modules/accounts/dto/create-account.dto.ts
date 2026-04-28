import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CreateAccountDto {
  @ApiProperty({ format: 'uuid', description: 'Owning person id' })
  @IsUUID()
  personId!: string;

  @ApiProperty({
    required: false,
    minimum: 0,
    maximum: 1000000,
    default: 2000,
    description: 'Daily withdrawal limit',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1000000)
  dailyWithdrawalLimit?: number;
}
