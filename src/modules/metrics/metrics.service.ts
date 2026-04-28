import { Injectable, OnModuleInit } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
  });

  readonly transactionsTotal = new Counter({
    name: 'banking_transactions_total',
    help: 'Count of money-mutating operations attempted',
    labelNames: ['type', 'outcome'],
  });

  onModuleInit(): void {
    this.registry.registerMetric(this.httpRequestDuration);
    this.registry.registerMetric(this.transactionsTotal);
    collectDefaultMetrics({ register: this.registry });
  }

  observeRequest(method: string, route: string, status: number, durationSeconds: number): void {
    this.httpRequestDuration.labels(method, route, String(status)).observe(durationSeconds);
  }

  recordTransaction(type: 'deposit' | 'withdrawal', outcome: 'success' | 'failure'): void {
    this.transactionsTotal.labels(type, outcome).inc();
  }

  async render(): Promise<{ contentType: string; body: string }> {
    return { contentType: this.registry.contentType, body: await this.registry.metrics() };
  }
}
