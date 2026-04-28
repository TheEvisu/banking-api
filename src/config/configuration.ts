export interface AppConfig {
  nodeEnv: string;
  port: number;
  logLevel: string;
  db: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
  };
  redis: {
    host: string;
    port: number;
  };
  throttle: {
    ttlSeconds: number;
    limit: number;
    accountTtlSeconds: number;
    accountLimit: number;
  };
  idempotency: {
    ttlHours: number;
  };
  corsOrigins: string[];
}

export const loadConfiguration = (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    user: process.env.DB_USER ?? 'banking',
    password: process.env.DB_PASSWORD ?? '',
    name: process.env.DB_NAME ?? 'banking',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  throttle: {
    ttlSeconds: parseInt(process.env.THROTTLE_TTL_SECONDS ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
    accountTtlSeconds: parseInt(process.env.THROTTLE_ACCOUNT_TTL_SECONDS ?? '60', 10),
    accountLimit: parseInt(process.env.THROTTLE_ACCOUNT_LIMIT ?? '30', 10),
  },
  idempotency: {
    ttlHours: parseInt(process.env.IDEMPOTENCY_TTL_HOURS ?? '24', 10),
  },
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
});
