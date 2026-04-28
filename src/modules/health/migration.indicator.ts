import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { DataSource } from 'typeorm';

import { EXPECTED_LATEST_MIGRATION } from '../../database/expected-migration';

@Injectable()
export class MigrationHealthIndicator extends HealthIndicator {
  constructor(private readonly dataSource: DataSource) {
    super();
  }

  async check(key = 'migrations'): Promise<HealthIndicatorResult> {
    let applied: string | null = null;
    let errorMessage: string | undefined;

    try {
      const rows = await this.dataSource.query<{ name: string }[]>(
        'SELECT name FROM migrations ORDER BY id DESC LIMIT 1',
      );
      applied = rows[0]?.name ?? null;
    } catch (err) {
      errorMessage = (err as Error).message;
    }

    const isHealthy = !errorMessage && applied === EXPECTED_LATEST_MIGRATION;
    const data = {
      expected: EXPECTED_LATEST_MIGRATION,
      applied,
      ...(errorMessage ? { message: errorMessage } : {}),
    };

    if (isHealthy) {
      return this.getStatus(key, true, data);
    }
    throw new HealthCheckError('migration drift', this.getStatus(key, false, data));
  }
}
