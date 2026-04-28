import { Controller, Get, Header, Res } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Response } from 'express';

import { MetricsService } from './metrics.service';

@Controller({ path: 'metrics', version: '1' })
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiExcludeEndpoint()
  async scrape(@Res() res: Response): Promise<void> {
    const { contentType, body } = await this.metrics.render();
    res.setHeader('Content-Type', contentType);
    res.send(body);
  }
}
