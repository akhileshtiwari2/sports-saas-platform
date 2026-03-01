import { Injectable, Logger } from '@nestjs/common';

/**
 * Error tracking abstraction - swap for Sentry/Datadog/Bugsnag in production.
 * Extend this or add SENTRY_DSN to enable external reporting.
 */
@Injectable()
export class MonitorService {
  private readonly logger = new Logger(MonitorService.name);

  captureException(exception: unknown, context?: Record<string, unknown>): void {
    const msg = exception instanceof Error ? exception.message : String(exception);
    this.logger.error(`[Monitor] ${msg}`, context);

    // TODO: When SENTRY_DSN is set, call Sentry.captureException(exception, { extra: context })
    const dsn = process.env.SENTRY_DSN;
    if (dsn) {
      // Sentry.init({ dsn }); Sentry.captureException(exception);
      // Placeholder - integrate with @sentry/node when added
    }
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    if (level === 'error') this.logger.error(`[Monitor] ${message}`);
    else if (level === 'warning') this.logger.warn(`[Monitor] ${message}`);
    else this.logger.log(`[Monitor] ${message}`);
  }
}
