import { Injectable } from '@nestjs/common';
import pino from 'pino';

@Injectable()
export class LoggerService {
  private readonly logger: pino.Logger;

  constructor() {
    const isProd = process.env.NODE_ENV === 'production';
    this.logger = pino({
      level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
      ...(isProd
        ? {}
        : {
            transport: {
              target: 'pino-pretty',
              options: { colorize: true },
            },
          }),
      base: { service: 'api' },
      formatters: {
        level: (label) => ({ level: label }),
      },
    });
  }

  child(bindings: Record<string, string | undefined>) {
    return this.logger.child(bindings);
  }

  info(msg: string, obj?: Record<string, unknown>) {
    this.logger.info(obj ?? {}, msg);
  }

  warn(msg: string, obj?: Record<string, unknown>) {
    this.logger.warn(obj ?? {}, msg);
  }

  error(msg: string, obj?: Record<string, unknown>) {
    this.logger.error(obj ?? {}, msg);
  }

  debug(msg: string, obj?: Record<string, unknown>) {
    this.logger.debug(obj ?? {}, msg);
  }

  /** Log with request/booking/payment context */
  logRequest(req: { id?: string; method: string; url: string; userId?: string }) {
    this.logger.info(
      {
        requestId: req.id,
        method: req.method,
        url: req.url,
        userId: req.userId,
      },
      'request',
    );
  }

  logBooking(event: string, bookingId: string, extra?: Record<string, unknown>) {
    this.logger.info({ bookingId, ...extra }, `booking:${event}`);
  }

  logPayment(event: string, paymentId: string, extra?: Record<string, unknown>) {
    this.logger.info({ paymentId, ...extra }, `payment:${event}`);
  }
}
