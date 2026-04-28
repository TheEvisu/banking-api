import compression from 'compression';
import helmet from 'helmet';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const config = app.get<ConfigService<AppConfig, true>>(ConfigService);

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.use(helmet());
  app.use(compression());
  app.use((await import('express')).json({ limit: '100kb' }));

  const corsOrigins = config.get('corsOrigins', { infer: true });
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: false,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      stopAtFirstError: false,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  const swaggerCfg = new DocumentBuilder()
    .setTitle('Banking API')
    .setDescription('Account management, deposits, withdrawals, statements.')
    .setVersion(process.env.npm_package_version ?? '0.1.0')
    .addTag('Accounts')
    .addTag('Transactions')
    .addTag('Persons')
    .addTag('Health')
    .build();
  const swaggerDoc = SwaggerModule.createDocument(app, swaggerCfg);
  SwaggerModule.setup('api/docs', app, swaggerDoc);

  app.enableShutdownHooks();

  const port = config.get('port', { infer: true });
  await app.listen(port);
}

bootstrap().catch((err) => {
  // bootstrap failures cannot use Pino, fall back to writing to stderr
  process.stderr.write(`fatal: bootstrap failed: ${(err as Error).stack ?? err}\n`);
  process.exit(1);
});
