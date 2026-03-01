import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MonitorService } from '../services/monitor.service';

/** Structured error response - no stack traces in production */
export interface ErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
  requestId?: string;
  timestamp: string;
  stack?: string;
}

type RequestWithId = Request & { id?: string };
type HttpExceptionBody = {
  message?: string | string[];
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly monitor: MonitorService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<RequestWithId>();
    const requestId = req.id;

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody =
      exception instanceof HttpException ? (exception.getResponse() as HttpExceptionBody | string) : undefined;
    const message =
      exception instanceof HttpException
        ? typeof responseBody === 'string'
          ? responseBody
          : responseBody?.message ?? exception.message
        : 'Internal server error';

    const isProd = process.env.NODE_ENV === 'production';

    const body: ErrorResponse = {
      statusCode: status,
      message: Array.isArray(message) ? message[0] : message,
      error: exception instanceof HttpException ? exception.name : undefined,
      requestId,
      timestamp: new Date().toISOString(),
    };

    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.url} ${status} - ${message}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      this.monitor.captureException(exception, { requestId, path: req.url });
    } else if (status >= 400) {
      this.logger.warn(`${req.method} ${req.url} ${status} - ${message}`);
    }

    if (!isProd && exception instanceof Error && exception.stack) {
      body.stack = exception.stack;
    }

    res.status(status).json(body);
  }
}
