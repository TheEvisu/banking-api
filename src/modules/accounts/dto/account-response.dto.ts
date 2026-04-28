import { ApiProperty } from '@nestjs/swagger';

import { formatMoney } from '../../../common/money/money';
import { Account } from '../entities/account.entity';

export class AccountResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  personId!: string;

  @ApiProperty({ example: '0000001' })
  accountNumber!: string;

  @ApiProperty({ example: '0.0000', description: 'Decimal string with 4 fractional digits' })
  balance!: string;

  @ApiProperty({ example: '2000.0000' })
  dailyWithdrawalLimit!: string;

  @ApiProperty()
  isBlocked!: boolean;

  @ApiProperty({ required: false, nullable: true, type: String, format: 'date-time' })
  blockedAt!: string | null;

  @ApiProperty({ required: false, nullable: true, type: String })
  blockedReason!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  static from(account: Account): AccountResponseDto {
    return {
      id: account.id,
      personId: account.personId,
      accountNumber: account.accountNumber,
      balance: formatMoney(account.balance),
      dailyWithdrawalLimit: formatMoney(account.dailyWithdrawalLimit),
      isBlocked: account.isBlocked,
      blockedAt: account.blockedAt ? account.blockedAt.toISOString() : null,
      blockedReason: account.blockedReason,
      createdAt: account.createdAt.toISOString(),
    };
  }
}

export class BalanceResponseDto {
  @ApiProperty({ format: 'uuid' })
  accountId!: string;

  @ApiProperty({ example: '1500.0000' })
  balance!: string;

  @ApiProperty({ format: 'date-time' })
  asOf!: string;

  static from(account: Account): BalanceResponseDto {
    return {
      accountId: account.id,
      balance: formatMoney(account.balance),
      asOf: new Date().toISOString(),
    };
  }
}
