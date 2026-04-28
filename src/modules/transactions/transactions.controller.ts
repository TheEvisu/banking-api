import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import {
  IDEMPOTENCY_HEADER,
  IdempotencyKey,
} from '../../common/decorators/idempotency-key.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { AccountThrottlerGuard } from '../../common/throttling/account-throttler.guard';

import { StatementQueryDto } from './dto/statement-query.dto';
import { TransactionAmountDto } from './dto/transaction-amount.dto';
import { StatementResponseDto, TransactionResponseDto } from './dto/transaction-response.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@Controller({ path: 'accounts', version: '1' })
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Post(':id/deposit')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccountThrottlerGuard)
  @ApiOperation({ summary: 'Credit an account' })
  @ApiHeader({ name: IDEMPOTENCY_HEADER, required: false })
  @ApiCreatedResponse({ type: TransactionResponseDto })
  async deposit(
    @Param('id', ParseUuidPipe) accountId: string,
    @Body() body: TransactionAmountDto,
    @IdempotencyKey() idempotencyKey?: string,
  ): Promise<TransactionResponseDto> {
    const tx = await this.transactions.deposit({
      accountId,
      amount: body.amount,
      description: body.description,
      idempotencyKey,
    });
    return TransactionResponseDto.from(tx);
  }

  @Post(':id/withdraw')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccountThrottlerGuard)
  @ApiOperation({ summary: 'Debit an account' })
  @ApiHeader({ name: IDEMPOTENCY_HEADER, required: false })
  @ApiCreatedResponse({ type: TransactionResponseDto })
  async withdraw(
    @Param('id', ParseUuidPipe) accountId: string,
    @Body() body: TransactionAmountDto,
    @IdempotencyKey() idempotencyKey?: string,
  ): Promise<TransactionResponseDto> {
    const tx = await this.transactions.withdraw({
      accountId,
      amount: body.amount,
      description: body.description,
      idempotencyKey,
    });
    return TransactionResponseDto.from(tx);
  }

  @Get(':id/statement')
  @ApiOperation({ summary: 'Account statement (with optional period and pagination)' })
  @ApiOkResponse({ type: StatementResponseDto })
  async statement(
    @Param('id', ParseUuidPipe) accountId: string,
    @Query() query: StatementQueryDto,
  ): Promise<StatementResponseDto> {
    return this.transactions.statement({
      accountId,
      from: query.from,
      to: query.to,
      limit: query.limit ?? 20,
      cursor: query.cursor,
    });
  }
}
