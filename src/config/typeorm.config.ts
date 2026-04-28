import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

import { AppConfig } from './configuration';

export const buildTypeOrmOptions = (config: ConfigService<AppConfig, true>): TypeOrmModuleOptions => {
  const db = config.get('db', { infer: true });
  return {
    type: 'postgres',
    host: db.host,
    port: db.port,
    username: db.user,
    password: db.password,
    database: db.name,
    entities: [__dirname + '/../**/*.entity.{js,ts}'],
    migrations: [__dirname + '/../database/migrations/*.{js,ts}'],
    migrationsRun: false,
    synchronize: false,
    logging: ['error', 'warn'],
  };
};
