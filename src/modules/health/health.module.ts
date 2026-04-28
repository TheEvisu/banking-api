import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './health.controller';
import { MigrationHealthIndicator } from './migration.indicator';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [MigrationHealthIndicator],
})
export class HealthModule {}
