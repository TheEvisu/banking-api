import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { DomainError } from '../errors/domain.error';
import { REQUEST_ID_HEADER } from '../middleware/request-id.middleware';

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  code: string;
  requestId: string;
  timestamp: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request.headers[REQUEST_ID_HEADER] as string) ?? '';

    if (this.isTerminusReport(exception)) {
      const status = (exception as HttpException).getStatus();
      const body = (exception as HttpException).getResponse() as Record<string, unknown>;
      response.status(status).json({ ...body, requestId });
      return;
    }

    const body = this.buildBody(exception, requestId);

    if (body.statusCode >= 500) {
      this.logger.error({ err: exception, requestId, path: request.url }, body.message.toString());
    } else {
      this.logger.warn({ requestId, path: request.url, code: body.code }, body.message.toString());
    }

    response.status(body.statusCode).json(body);
  }

  private isTerminusReport(exception: unknown): boolean {
    if (!(exception instanceof HttpException)) return false;
    const res = exception.getResponse();
    if (typeof res !== 'object' || res === null) return false;
    const record = res as Record<string, unknown>;
    return 'details' in record && 'info' in record && 'error' in record && 'status' in record;
  }

  private buildBody(exception: unknown, requestId: string): ErrorBody {
    const timestamp = new Date().toISOString();

    if (exception instanceof DomainError) {
      return {
        statusCode: exception.httpStatus,
        error: this.errorName(exception.httpStatus),
        message: exception.message,
        code: exception.code,
        requestId,
        timestamp,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'string'
          ? res
          : (((res as Record<string, unknown>).message as string | string[]) ?? exception.message);
      const code = (res as { code?: string }).code ?? this.codeFromStatus(status);
      return {
        statusCode: status,
        error: this.errorName(status),
        message,
        code,
        requestId,
        timestamp,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'InternalServerError',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      requestId,
      timestamp,
    };
  }

  private errorName(status: number): string {
    switch (status) {
      case 400:
        return 'BadRequest';
      case 401:
        return 'Unauthorized';
      case 403:
        return 'Forbidden';
      case 404:
        return 'NotFound';
      case 409:
        return 'Conflict';
      case 422:
        return 'UnprocessableEntity';
      case 429:
        return 'TooManyRequests';
      case 503:
        return 'ServiceUnavailable';
      default:
        return status >= 500 ? 'InternalServerError' : 'Error';
    }
  }

  private codeFromStatus(status: number): string {
    switch (status) {
      case 400:
        return 'VALIDATION_ERROR';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 429:
        return 'RATE_LIMITED';
      case 503:
        return 'SERVICE_UNAVAILABLE';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}
