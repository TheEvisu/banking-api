import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

import { ListPersonsQueryDto } from './dto/list-persons.dto';
import { PersonResponseDto } from './dto/person-response.dto';
import { PersonsPageDto } from './dto/persons-page.dto';
import { PersonsService } from './persons.service';

@ApiTags('Persons')
@Controller({ path: 'persons', version: '1' })
export class PersonsController {
  constructor(private readonly persons: PersonsService) {}

  @Get()
  @ApiOperation({ summary: 'List persons (cursor-paginated, newest first)' })
  @ApiOkResponse({ type: PersonsPageDto })
  list(@Query() query: ListPersonsQueryDto): Promise<PersonsPageDto> {
    return this.persons.list({ limit: query.limit ?? 20, cursor: query.cursor });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a person by id' })
  @ApiOkResponse({ type: PersonResponseDto })
  async findOne(@Param('id', ParseUuidPipe) id: string): Promise<PersonResponseDto> {
    const person = await this.persons.getById(id);
    return PersonResponseDto.from(person);
  }
}
