import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

import { REQUEST_ID_HEADER } from '../../common/middleware/request-id.middleware';
import { AppConfig } from '../../config/configuration';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const level = config.get('logLevel', { infer: true });
        const env = config.get('nodeEnv', { infer: true });
        return {
          pinoHttp: {
            level,
            transport:
              env === 'production'
                ? undefined
                : { target: 'pino-pretty', options: { singleLine: true, colorize: true } },
            customProps: (req) => ({
              requestId: (req.headers[REQUEST_ID_HEADER] as string) ?? '',
            }),
            redact: {
              paths: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password'],
              remove: true,
            },
            serializers: {
              req: (req) => ({ method: req.method, url: req.url, id: req.id }),
              res: (res) => ({ statusCode: res.statusCode }),
            },
          },
        };
      },
    }),
  ],
})
export class AppLoggerModule {}
