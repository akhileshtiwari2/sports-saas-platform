import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { LoggerService } from '../logger.service';

type RequestWithId = Request & { id?: string };

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<RequestWithId>();
    const { method, url } = req;
    const requestId = req.id;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          this.logger.info('request completed', {
            requestId,
            method,
            url,
            durationMs: duration,
            statusCode: context.switchToHttp().getResponse().statusCode,
          });
        },
        error: (err) => {
          const duration = Date.now() - start;
          this.logger.error('request failed', {
            requestId,
            method,
            url,
            durationMs: duration,
            error: err?.message,
          });
        },
      }),
    );
  }
}
