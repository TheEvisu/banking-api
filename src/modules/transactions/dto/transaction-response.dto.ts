import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { formatMoney } from '../../../common/money/money';
import { Transaction, TransactionType } from '../entities/transaction.entity';

export class TransactionResponseDto {
  @ApiProperty({ format: 'uuid' })
  transactionId!: string;

  @ApiProperty({ format: 'uuid' })
  accountId!: string;

  @ApiProperty({ enum: ['deposit', 'withdrawal'] })
  type!: TransactionType;

  @ApiProperty({ example: '100.5000' })
  amount!: string;

  @ApiProperty({ example: '1600.5000' })
  balanceAfter!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  static from(tx: Transaction): TransactionResponseDto {
    return {
      transactionId: tx.id,
      accountId: tx.accountId,
      type: tx.type,
      amount: formatMoney(tx.amount),
      balanceAfter: formatMoney(tx.balanceAfter),
      description: tx.description,
      createdAt: tx.createdAt.toISOString(),
    };
  }
}

export class StatementEntryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['deposit', 'withdrawal'] })
  type!: TransactionType;

  @ApiProperty({ example: '100.0000' })
  amount!: string;

  @ApiProperty({ example: '100.0000' })
  balanceAfter!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  static from(tx: Transaction): StatementEntryDto {
    return {
      id: tx.id,
      type: tx.type,
      amount: formatMoney(tx.amount),
      balanceAfter: formatMoney(tx.balanceAfter),
      description: tx.description,
      createdAt: tx.createdAt.toISOString(),
    };
  }
}

export class StatementResponseDto {
  @ApiProperty({ format: 'uuid' })
  accountId!: string;

  @ApiProperty({ type: [StatementEntryDto] })
  transactions!: StatementEntryDto[];

  @ApiPropertyOptional({ nullable: true, type: String })
  nextCursor!: string | null;

  @ApiProperty()
  hasMore!: boolean;
}
