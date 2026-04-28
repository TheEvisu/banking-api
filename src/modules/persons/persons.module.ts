import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Person } from './entities/person.entity';
import { PersonsController } from './persons.controller';
import { PersonsRepository } from './persons.repository';
import { PersonsService } from './persons.service';

@Module({
  imports: [TypeOrmModule.forFeature([Person])],
  controllers: [PersonsController],
  providers: [PersonsRepository, PersonsService],
  exports: [PersonsService],
})
export class PersonsModule {}
