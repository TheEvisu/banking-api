import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Redis } from 'ioredis';
import { Logger } from 'nestjs-pino';
import { DataSource } from 'typeorm';

import { AppModule } from '../../src/app.module';
import { GlobalExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { REDIS_CLIENT } from '../../src/infrastructure/redis/redis.service';

export interface TestHandle {
  app: INestApplication;
  dataSource: DataSource;
  redis: Redis;
  close: () => Promise<void>;
}

export async function createTestApp(): Promise<TestHandle> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleRef.createNestApplication({ bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.init();

  const dataSource = app.get(DataSource);
  const redis = app.get<Redis>(REDIS_CLIENT);

  return {
    app,
    dataSource,
    redis,
    close: async () => {
      await app.close();
    },
  };
}

export async function resetState(handle: TestHandle): Promise<void> {
  await handle.dataSource.query('TRUNCATE transactions, accounts, persons RESTART IDENTITY CASCADE');
  await handle.redis.flushdb();
}
