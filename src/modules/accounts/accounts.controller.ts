import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

import { AccountsService } from './accounts.service';
import { AccountResponseDto, BalanceResponseDto } from './dto/account-response.dto';
import { BlockAccountDto } from './dto/block-account.dto';
import { CreateAccountDto } from './dto/create-account.dto';

@ApiTags('Accounts')
@Controller({ path: 'accounts', version: '1' })
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an account for an existing person' })
  @ApiCreatedResponse({ type: AccountResponseDto })
  async create(@Body() dto: CreateAccountDto): Promise<AccountResponseDto> {
    const account = await this.accounts.create(dto);
    return AccountResponseDto.from(account);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch an account by id' })
  @ApiOkResponse({ type: AccountResponseDto })
  async findOne(@Param('id', ParseUuidPipe) id: string): Promise<AccountResponseDto> {
    const account = await this.accounts.getById(id);
    return AccountResponseDto.from(account);
  }

  @Get(':id/balance')
  @ApiOperation({ summary: 'Get the current balance of an account' })
  @ApiOkResponse({ type: BalanceResponseDto })
  async balance(@Param('id', ParseUuidPipe) id: string): Promise<BalanceResponseDto> {
    const account = await this.accounts.getById(id);
    return BalanceResponseDto.from(account);
  }

  @Post(':id/block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Block an account (irreversible)' })
  @ApiOkResponse({ type: AccountResponseDto })
  async block(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: BlockAccountDto,
  ): Promise<AccountResponseDto> {
    const account = await this.accounts.block(id, dto.reason ?? null);
    return AccountResponseDto.from(account);
  }
}
